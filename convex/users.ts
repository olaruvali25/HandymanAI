import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { PLAN_VALUES, type Plan, planSchema } from "./billingConfig";

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

export const addCredits = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    const nextCredits = (user.credits ?? 0) + args.amount;
    await ctx.db.patch(args.userId, {
      credits: nextCredits,
      updatedAt: Date.now(),
    });
    return { credits: nextCredits };
  },
});

export const updateStripeSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    plan: planSchema,
    stripeCustomerId: v.union(v.string(), v.null()),
    stripeSubscriptionId: v.union(v.string(), v.null()),
    stripeSubscriptionStatus: v.union(v.string(), v.null()),
    stripeCurrentPeriodEnd: v.union(v.number(), v.null()),
    stripePriceId: v.union(v.string(), v.null()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    billingAnchor: v.optional(v.number()),
    nextRenewalAt: v.optional(v.number()),
    pendingDowngradePlan: v.optional(planSchema),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(args.userId, {
      plan: args.plan,
      pendingDowngradePlan:
        args.pendingDowngradePlan ?? user.pendingDowngradePlan,
      stripeCustomerId: args.stripeCustomerId ?? undefined,
      stripeSubscriptionId: args.stripeSubscriptionId ?? undefined,
      stripeSubscriptionStatus: args.stripeSubscriptionStatus ?? undefined,
      stripeCurrentPeriodEnd: args.stripeCurrentPeriodEnd ?? undefined,
      stripePriceId: args.stripePriceId ?? undefined,
      currentPeriodStart: args.currentPeriodStart ?? user.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd ?? user.currentPeriodEnd,
      billingAnchor: args.billingAnchor ?? user.billingAnchor,
      nextRenewalAt: args.nextRenewalAt ?? user.nextRenewalAt,
      updatedAt: Date.now(),
    });
  },
});

export const getById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.userId);
  },
});

export const getByStripeCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId),
      )
      .unique();
  },
});
