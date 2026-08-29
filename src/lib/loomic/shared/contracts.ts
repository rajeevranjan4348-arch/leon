import { z } from "zod";
import { toolArtifactSchema } from "./artifacts.js";

export const identifierSchema = z.string().min(1);

export const imageAttachmentSchema = z.object({
  assetId: z.string().min(1),
  url: z.string().min(1),
  mimeType: z.string().min(1).optional(),
});

export const textBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const thinkingBlockSchema = z.object({
  type: z.literal("thinking"),
  thinking: z.string(),
});

export const toolBlockSchema = z.object({
  type: z.literal("tool"),
  toolCallId: z.string().min(1),
  toolName: z.string().min(1),
  status: z.enum(["running", "completed"]),
  input: z.record(z.string(), z.unknown()).optional(),
  output: z.record(z.string(), z.unknown()).optional(),
  outputSummary: z.string().optional(),
  artifacts: z.array(toolArtifactSchema).optional(),
});

export const contentBlockSchema = z.union([
  textBlockSchema,
  thinkingBlockSchema,
  toolBlockSchema,
]);

export const chatMessageSchema = z.object({
  id: identifierSchema,
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  contentBlocks: z.array(contentBlockSchema).optional(),
  createdAt: z.string(),
});

export type TextBlock = z.infer<typeof textBlockSchema>;
export type ThinkingBlock = z.infer<typeof thinkingBlockSchema>;
export type ToolBlock = z.infer<typeof toolBlockSchema>;
export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
