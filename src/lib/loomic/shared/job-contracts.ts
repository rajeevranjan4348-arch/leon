import { z } from "zod";

export const jobStatusSchema = z.enum(["queued", "processing", "succeeded", "failed"]);

export const generationJobSchema = z.object({
  id: z.string(),
  type: z.enum(["image_generation", "video_generation"]),
  status: jobStatusSchema,
  prompt: z.string(),
  model: z.string(),
  resultUrl: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type GenerationJob = z.infer<typeof generationJobSchema>;
