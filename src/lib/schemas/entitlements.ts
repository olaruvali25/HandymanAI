import { z } from "zod";

export const PremiumVisualsSchema = z.enum(["none", "limited", "full"]);

export const CapabilitiesSchema = z.object({
  voice: z.boolean(),
  photos: z.boolean(),
  linksVisuals: z.boolean(),
  history: z.boolean(),
  favorites: z.boolean(),
  premiumVisuals: PremiumVisualsSchema,
  photoLimit: z.number().int().nonnegative().nullable(),
});
export type Capabilities = z.infer<typeof CapabilitiesSchema>;

export const GatingFlagsSchema = z.object({
  must_prompt_signup_after_this: z.boolean(),
  must_prompt_payment_after_this: z.boolean(),
});
export type GatingFlags = z.infer<typeof GatingFlagsSchema>;

export const ClientEntitlementsSchema = z.object({
  userHasAccount: z.boolean(),
  userPlan: z.string(),
  remainingReplies: z.number().int().nullable(),
  remainingSource: z.string().optional(),
  capabilities: CapabilitiesSchema,
  gating: GatingFlagsSchema,
  credits: z.number().int().optional(),
});
export type ClientEntitlements = z.infer<typeof ClientEntitlementsSchema>;
