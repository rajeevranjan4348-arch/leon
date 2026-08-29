/**
 * SkillEngine - Open Jarvis Dynamic Skill & Workflow Engine
 * Ported from com.openjarvis.skills.SkillEngine
 */

import { OpenJarvisAction, SkillDefinition } from './types';

export class SkillEngine {
  private static instance: SkillEngine;
  private skills = new Map<string, SkillDefinition>();

  private constructor() {
    this.registerBuiltinSkills();
  }

  public static getInstance(): SkillEngine {
    if (!SkillEngine.instance) {
      SkillEngine.instance = new SkillEngine();
    }
    return SkillEngine.instance;
  }

  private registerBuiltinSkills() {
    this.registerSkill({
      id: 'quick_search',
      name: 'Quick Web Search',
      triggerPhrases: ['search for', 'google', 'look up', 'find online'],
      description: 'Opens browser and performs search query',
      actions: [
        { action: 'open_app', packageName: 'com.android.chrome', label: 'Chrome' },
        { action: 'wait_for', text: 'Search', timeoutMs: 2000 },
        { action: 'type', value: '{query}' },
      ],
    });

    this.registerSkill({
      id: 'send_quick_note',
      name: 'Quick Note',
      triggerPhrases: ['take a note', 'note down', 'save note'],
      description: 'Creates quick entry in notes application',
      actions: [
        { action: 'open_app', packageName: 'com.google.android.keep', label: 'Keep Notes' },
        { action: 'wait_for', text: 'New note', timeoutMs: 2000 },
        { action: 'type', value: '{note}' },
      ],
    });
  }

  public registerSkill(skill: SkillDefinition) {
    this.skills.set(skill.id, skill);
  }

  public getSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  public matchSkill(inputCommand: string): SkillDefinition | null {
    const lower = inputCommand.toLowerCase();
    for (const skill of this.skills.values()) {
      if (skill.triggerPhrases.some((phrase) => lower.includes(phrase.toLowerCase()))) {
        return skill;
      }
    }
    return null;
  }
}

export const skillEngine = SkillEngine.getInstance();
