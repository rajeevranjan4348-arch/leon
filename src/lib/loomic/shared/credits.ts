import { z } from "zod";

export const planTierSchema = z.enum(["free", "pro", "enterprise"]);

export const creditBalanceSchema = z.object({
  workspaceId: z.string(),
  tier: planTierSchema,
  totalCredits: z.number().int().nonnegative(),
  usedCredits: z.number().int().nonnegative(),
  remainingCredits: z.number().int().nonnegative(),
});

export type PlanTier = z.infer<typeof planTierSchema>;
export type CreditBalance = z.infer<typeof creditBalanceSchema>;
