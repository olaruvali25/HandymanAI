import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_MODEL: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    CONTACT_FROM: z.string().min(1).optional(),
    CONTACT_TO: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.string().url().optional(),
    NEXT_PUBLIC_SHOW_ENTITLEMENTS_DEBUG: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  },
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CONTACT_FROM: process.env.CONTACT_FROM,
    CONTACT_TO: process.env.CONTACT_TO,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_SHOW_ENTITLEMENTS_DEBUG:
      process.env.NEXT_PUBLIC_SHOW_ENTITLEMENTS_DEBUG,
  },
  emptyStringAsUndefined: true,
});
