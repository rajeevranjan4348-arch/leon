import { z } from "zod";

export const skillFileSchema = z.object({
  path: z.string(),
  content: z.string(),
});

export const workspaceSkillSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  content: z.string(),
  files: z.array(skillFileSchema).default([]),
  enabled: z.boolean().default(true),
});

export type SkillFile = z.infer<typeof skillFileSchema>;
export type WorkspaceSkill = z.infer<typeof workspaceSkillSchema>;
