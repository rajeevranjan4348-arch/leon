import type { WorkspaceSkill } from "../shared/skill-contracts.js";

export interface SkillMatchResult {
  matchedSkill: WorkspaceSkill | null;
  enrichedSystemPrompt: string;
}

export class WorkspaceSkillEngine {
  private skills: WorkspaceSkill[] = [];

  public registerSkills(skills: WorkspaceSkill[]) {
    this.skills = skills;
  }

  public matchSkill(command: string): WorkspaceSkill | null {
    const lower = command.toLowerCase();
    return (
      this.skills.find(
        (s) =>
          lower.includes(s.slug.toLowerCase()) ||
          lower.includes(s.name.toLowerCase()) ||
          s.description.toLowerCase().split(" ").some((w) => w.length > 3 && lower.includes(w))
      ) || null
    );
  }

  public buildPromptContext(basePrompt: string, activeSkills: WorkspaceSkill[] = this.skills): string {
    if (!activeSkills.length) return basePrompt;

    const skillsList = activeSkills
      .map(
        (s) => `- **${s.name}** (${s.slug}): ${s.description}\n  Instructions path: /skills/${s.slug}/SKILL.md`
      )
      .join("\n");

    return `${basePrompt}\n\n## Enabled Workspace Skills\n${skillsList}`;
  }
}

export const workspaceSkillEngine = new WorkspaceSkillEngine();
