import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import Facebook from "@auth/core/providers/facebook";
import type { Value } from "convex/values";
import { insertLedgerEntry } from "./creditLedger";

const googleProvider = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in Convex env. Google OAuth is disabled.",
      );
    }
    return null;
  }
  return Google({ clientId, clientSecret });
};

const facebookProvider = () => {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Missing FACEBOOK_CLIENT_ID/FACEBOOK_CLIENT_SECRET in Convex env. Facebook OAuth is disabled.",
      );
    }
    return null;
  }
  return Facebook({ clientId, clientSecret });
};

const oauthProviders = [googleProvider(), facebookProvider()].filter(
  (provider): provider is NonNullable<typeof provider> => Boolean(provider),
);

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile: (params) => {
        const email =
          typeof params.email === "string"
            ? params.email.trim().toLowerCase()
            : "";
        const name =
          typeof params.name === "string" ? params.name.trim() : undefined;
        return { email, name } as { email: string; name?: string } & Record<
          string,
          Value
        >;
      },
    }),
    ...oauthProviders,
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId }) {
      const user = await ctx.db.get(userId);
      if (!user) return;
      const now = Date.now();
      const hasCredits = typeof user.credits === "number";
      const currentCredits = hasCredits ? user.credits : 0;

      if (user.loginBonusGrantedAt) {
        if (!hasCredits || !user.plan) {
          await ctx.db.patch(userId, {
            credits: currentCredits,
            plan: user.plan ?? "none",
            updatedAt: now,
          });
        }
        return;
      }

      const nextCredits = currentCredits + 10;
      await ctx.db.patch(userId, {
        credits: nextCredits,
        loginBonusGrantedAt: now,
        plan: user.plan ?? "none",
        updatedAt: now,
      });
      await insertLedgerEntry(ctx, {
        actorType: "user",
        userId,
        kind: "login_bonus_10",
        amount: 10,
        balanceAfter: nextCredits,
        createdAt: now,
      });
    },
  },
});
