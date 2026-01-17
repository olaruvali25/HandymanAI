import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query, type MutationCtx } from "./_generated/server";
import { PLAN_VALUES, type Plan, planSchema } from "./plans";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      ...user,
      isAdmin: user.isAdmin ?? false,
      plan: (user.plan ?? "none") as Plan,
      credits: typeof user.credits === "number" ? user.credits : 0,
    };
  },
});

const normalizePlanValue = (value: unknown): Plan | null => {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  return PLAN_VALUES.includes(lower as Plan) ? (lower as Plan) : null;
};

const requireAdminOrDev = async (ctx: MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }
  const isDev = process.env.NODE_ENV !== "production";
  if (!user.isAdmin && !isDev) {
    throw new Error("Unauthorized");
  }
  return { userId, user };
};

export const adminSetUserPlan = mutation({
  args: {
    userId: v.id("users"),
    plan: planSchema,
  },
  handler: async (ctx, args) => {
    await requireAdminOrDev(ctx);
    await ctx.db.patch(args.userId, {
      plan: args.plan,
      updatedAt: Date.now(),
    });
  },
});

export const normalizeUserPlans = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdminOrDev(ctx);
    const users = await ctx.db.query("users").collect();
    let updated = 0;

    for (const user of users) {
      const rawPlan = user.plan;
      if (rawPlan === undefined || rawPlan === null) {
        await ctx.db.patch(user._id, {
          plan: "none",
          updatedAt: Date.now(),
        });
        updated += 1;
        continue;
      }

      const normalized = normalizePlanValue(rawPlan);
      if (!normalized) {
        await ctx.db.patch(user._id, {
          plan: "none",
          updatedAt: Date.now(),
        });
        updated += 1;
        continue;
      }

      if (rawPlan !== normalized) {
        await ctx.db.patch(user._id, {
          plan: normalized,
          updatedAt: Date.now(),
        });
        updated += 1;
      }
    }

    return { updated };
  },
});
