/**
 * BerriAI Self-Improving Agent Lesson Store
 * Maintains persistent memory of lessons learned from previous failures & improvements.
 */

import { LearnedLesson } from './types';

const LOCAL_STORAGE_KEY_LESSONS = 'berri_ai_learned_lessons';

export class LessonStore {
  private static instance: LessonStore;

  private constructor() {
    this.seedDefaultLessonsIfEmpty();
  }

  public static getInstance(): LessonStore {
    if (!LessonStore.instance) {
      LessonStore.instance = new LessonStore();
    }
    return LessonStore.instance;
  }

  /**
   * Get all learned lessons
   */
  public getAllLessons(): LearnedLesson[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_LESSONS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('[LessonStore] Failed to read lessons:', err);
      return [];
    }
  }

  /**
   * Save lessons array
   */
  private saveAll(lessons: LearnedLesson[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_LESSONS, JSON.stringify(lessons));
    } catch (err) {
      console.warn('[LessonStore] Failed to write lessons:', err);
    }
  }

  /**
   * Add a new learned lesson
   */
  public addLesson(lesson: LearnedLesson): LearnedLesson {
    const all = this.getAllLessons();
    const existingIndex = all.findIndex(l => l.id === lesson.id || (l.problem === lesson.problem && l.affectedFeature === lesson.affectedFeature));
    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...lesson };
    } else {
      all.unshift(lesson);
    }
    this.saveAll(all);
    return lesson;
  }

  /**
   * Retrieve relevant lessons for a given user query and feature
   */
  public retrieveRelevantLessons(query: string, feature?: string): LearnedLesson[] {
    const all = this.getAllLessons();
    if (all.length === 0) return [];

    const raw = (query || '').toLowerCase().trim();
    if (!raw) return all.slice(0, 5);

    const tokens = raw.split(/[\s,.;:!?\-+*/\\_"'`~()[\]{}<>]+/).filter(t => t.length > 2);

    const scored = all.map(lesson => {
      let score = 0;
      const probLower = lesson.problem.toLowerCase();
      const solLower = lesson.solution.toLowerCase();
      const featLower = lesson.affectedFeature.toLowerCase();
      const toolLower = lesson.toolInvolved.toLowerCase();

      if (feature && featLower.includes(feature.toLowerCase())) {
        score += 3;
      }

      if (probLower.includes(raw) || solLower.includes(raw)) {
        score += 5;
      }

      for (const kw of lesson.keywords) {
        if (raw.includes(kw.toLowerCase())) {
          score += 2;
        }
      }

      for (const token of tokens) {
        if (probLower.includes(token)) score += 1;
        if (solLower.includes(token)) score += 1;
        if (featLower.includes(token)) score += 1.5;
        if (toolLower.includes(token)) score += 1.5;
      }

      return { lesson, score };
    });

    return scored
      .filter(item => item.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .map(item => item.lesson);
  }

  /**
   * Seed default baseline lessons for key tools (e.g. App Launcher, WhatsApp, Search)
   */
  private seedDefaultLessonsIfEmpty(): void {
    const existing = this.getAllLessons();
    if (existing.length > 0) return;

    const defaults: LearnedLesson[] = [
      {
        id: 'lesson_app_launcher_direct_package',
        problem: 'WhatsApp commands sometimes resolution opened Google Play Store or web link instead of installed app.',
        solution: 'Use AppResolver and UniversalAppLauncher direct startActivity with FLAG_ACTIVITY_NEW_TASK and fallback to market URI only when installed status is false.',
        date: new Date().toISOString(),
        affectedFeature: 'app_launching',
        toolInvolved: 'open_app',
        resultStatus: 'SUCCESS',
        proposalId: 'prop_seed_001',
        keywords: ['whatsapp', 'open_app', 'app_launching', 'play_store', 'launcher', 'package'],
      },
      {
        id: 'lesson_search_agent_direct_citations',
        problem: 'Search agent response contained markdown formatting without grounding sources.',
        solution: 'Always append primary source web citations immediately after facts.',
        date: new Date().toISOString(),
        affectedFeature: 'web_search',
        toolInvolved: 'search_web',
        resultStatus: 'SUCCESS',
        proposalId: 'prop_seed_002',
        keywords: ['search', 'citations', 'grounding', 'facts', 'web_search'],
      },
    ];

    this.saveAll(defaults);
  }

  /**
   * Clear lessons
   */
  public clearLessons(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY_LESSONS);
    }
  }
}

export const lessonStore = LessonStore.getInstance();
