import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  type MutationCtx,
} from "./_generated/server";
import {
  getMonthlyCreditsForPlan,
  planSchema,
  type Plan,
} from "./billingConfig";
import {
  findLedgerEntryByStripeEventId,
  insertLedgerEntry,
} from "./creditLedger";

const FREE_CREDITS_AMOUNT = 15;
const FREE_CREDITS_INTERVAL_MS = 1000 * 60 * 60 * 48;

const ensureStripeEventAvailable = async (
  ctx: MutationCtx,
  stripeEventId: string,
) => {
  const existing = await findLedgerEntryByStripeEventId(ctx, stripeEventId);
  return !existing;
};

const applyCreditDelta = async (
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    delta: number;
    kind:
      | "plan_upgrade_add"
      | "topup_add"
      | "free_48h_15"
      | "login_bonus_10"
      | "anon_initial_20";
    stripeEventId?: string;
  },
) => {
  const user = await ctx.db.get(args.userId);
  if (!user) {
    throw new Error("User not found");
  }
  const now = Date.now();
  const nextCredits = (user.credits ?? 0) + args.delta;
  await ctx.db.patch(args.userId, {
    credits: nextCredits,
    updatedAt: now,
  });
  await insertLedgerEntry(ctx, {
    actorType: "user",
    userId: args.userId,
    kind: args.kind,
    amount: args.delta,
    balanceAfter: nextCredits,
    stripeEventId: args.stripeEventId,
    createdAt: now,
  });
  return { credits: nextCredits };
};

const applyCreditReset = async (
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    newBalance: number;
    kind: "plan_reset" | "plan_renewal_reset";
    stripeEventId?: string;
  },
) => {
  const user = await ctx.db.get(args.userId);
  if (!user) {
    throw new Error("User not found");
  }
  const now = Date.now();
  const current = user.credits ?? 0;
  const delta = args.newBalance - current;
  await ctx.db.patch(args.userId, {
    credits: args.newBalance,
    updatedAt: now,
  });
  await insertLedgerEntry(ctx, {
    actorType: "user",
    userId: args.userId,
    kind: args.kind,
    amount: delta,
    balanceAfter: args.newBalance,
    stripeEventId: args.stripeEventId,
    createdAt: now,
  });
  return { credits: args.newBalance };
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

export const applyTopupFromStripe = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    stripeEventId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await ensureStripeEventAvailable(ctx, args.stripeEventId))) {
      return { applied: false };
    }
    await applyCreditDelta(ctx, {
      userId: args.userId,
      delta: args.amount,
      kind: "topup_add",
      stripeEventId: args.stripeEventId,
    });
    return { applied: true };
  },
});

export const applyPlanStartFromStripe = internalMutation({
  args: {
    userId: v.id("users"),
    plan: planSchema,
    stripeEventId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeSubscriptionStatus: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripeCurrentPeriodEnd: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    billingAnchor: v.optional(v.number()),
    nextRenewalAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!(await ensureStripeEventAvailable(ctx, args.stripeEventId))) {
      return { applied: false };
    }
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    const planCredits = getMonthlyCreditsForPlan(args.plan);
    await applyCreditReset(ctx, {
      userId: args.userId,
      newBalance: planCredits,
      kind: "plan_reset",
      stripeEventId: args.stripeEventId,
    });
    await ctx.db.patch(args.userId, {
      plan: args.plan,
      pendingDowngradePlan: undefined,
      stripeCustomerId: args.stripeCustomerId ?? user.stripeCustomerId,
      stripeSubscriptionId:
        args.stripeSubscriptionId ?? user.stripeSubscriptionId,
      stripeSubscriptionStatus:
        args.stripeSubscriptionStatus ?? user.stripeSubscriptionStatus,
      stripePriceId: args.stripePriceId ?? user.stripePriceId,
      stripeCurrentPeriodEnd:
        args.stripeCurrentPeriodEnd ?? user.stripeCurrentPeriodEnd,
      currentPeriodStart: args.currentPeriodStart ?? user.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd ?? user.currentPeriodEnd,
      billingAnchor: args.billingAnchor ?? user.billingAnchor,
      nextRenewalAt: args.nextRenewalAt ?? user.nextRenewalAt,
      lastPlanCreditGrantAt: Date.now(),
      lastPlanCreditGrantPeriodKey: undefined,
      updatedAt: Date.now(),
    });
    return { applied: true };
  },
});

export const applyPlanRenewalFromStripe = internalMutation({
  args: {
    userId: v.id("users"),
    plan: planSchema,
    stripeEventId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeSubscriptionStatus: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripeCurrentPeriodEnd: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    billingAnchor: v.optional(v.number()),
    nextRenewalAt: v.optional(v.number()),
    periodKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await ensureStripeEventAvailable(ctx, args.stripeEventId))) {
      return { applied: false };
    }
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    const targetPlan = user.pendingDowngradePlan ?? args.plan;
    const planCredits = getMonthlyCreditsForPlan(targetPlan);
    await applyCreditReset(ctx, {
      userId: args.userId,
      newBalance: planCredits,
      kind: "plan_renewal_reset",
      stripeEventId: args.stripeEventId,
    });
    await ctx.db.patch(args.userId, {
      plan: targetPlan,
      pendingDowngradePlan: undefined,
      stripeCustomerId: args.stripeCustomerId ?? user.stripeCustomerId,
      stripeSubscriptionId:
        args.stripeSubscriptionId ?? user.stripeSubscriptionId,
      stripeSubscriptionStatus:
        args.stripeSubscriptionStatus ?? user.stripeSubscriptionStatus,
      stripePriceId: args.stripePriceId ?? user.stripePriceId,
      stripeCurrentPeriodEnd:
        args.stripeCurrentPeriodEnd ?? user.stripeCurrentPeriodEnd,
      currentPeriodStart: args.currentPeriodStart ?? user.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd ?? user.currentPeriodEnd,
      billingAnchor: args.billingAnchor ?? user.billingAnchor,
      nextRenewalAt: args.nextRenewalAt ?? user.nextRenewalAt,
      lastPlanCreditGrantAt: Date.now(),
      lastPlanCreditGrantPeriodKey:
        args.periodKey ?? user.lastPlanCreditGrantPeriodKey,
      updatedAt: Date.now(),
    });
    return { applied: true };
  },
});

export const applyPlanUpgradeFromStripe = internalMutation({
  args: {
    userId: v.id("users"),
    newPlan: planSchema,
    stripeEventId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeSubscriptionStatus: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripeCurrentPeriodEnd: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    billingAnchor: v.optional(v.number()),
    nextRenewalAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!(await ensureStripeEventAvailable(ctx, args.stripeEventId))) {
      return { applied: false };
    }
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    const planCredits = getMonthlyCreditsForPlan(args.newPlan);
    await applyCreditDelta(ctx, {
      userId: args.userId,
      delta: planCredits,
      kind: "plan_upgrade_add",
      stripeEventId: args.stripeEventId,
    });
    await ctx.db.patch(args.userId, {
      plan: args.newPlan,
      pendingDowngradePlan: undefined,
      stripeCustomerId: args.stripeCustomerId ?? user.stripeCustomerId,
      stripeSubscriptionId:
        args.stripeSubscriptionId ?? user.stripeSubscriptionId,
      stripeSubscriptionStatus:
        args.stripeSubscriptionStatus ?? user.stripeSubscriptionStatus,
      stripePriceId: args.stripePriceId ?? user.stripePriceId,
      stripeCurrentPeriodEnd:
        args.stripeCurrentPeriodEnd ?? user.stripeCurrentPeriodEnd,
      currentPeriodStart: args.currentPeriodStart ?? user.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd ?? user.currentPeriodEnd,
      billingAnchor: args.billingAnchor ?? Date.now(),
      nextRenewalAt: args.nextRenewalAt ?? user.nextRenewalAt,
      updatedAt: Date.now(),
    });
    return { applied: true };
  },
});

export const setPendingDowngradePlan = internalMutation({
  args: {
    userId: v.id("users"),
    pendingPlan: planSchema,
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeSubscriptionStatus: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripeCurrentPeriodEnd: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    billingAnchor: v.optional(v.number()),
    nextRenewalAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(args.userId, {
      pendingDowngradePlan: args.pendingPlan,
      stripeCustomerId: args.stripeCustomerId ?? user.stripeCustomerId,
      stripeSubscriptionId:
        args.stripeSubscriptionId ?? user.stripeSubscriptionId,
      stripeSubscriptionStatus:
        args.stripeSubscriptionStatus ?? user.stripeSubscriptionStatus,
      stripePriceId: args.stripePriceId ?? user.stripePriceId,
      stripeCurrentPeriodEnd:
        args.stripeCurrentPeriodEnd ?? user.stripeCurrentPeriodEnd,
      currentPeriodStart: args.currentPeriodStart ?? user.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd ?? user.currentPeriodEnd,
      billingAnchor: args.billingAnchor ?? user.billingAnchor,
      nextRenewalAt: args.nextRenewalAt ?? user.nextRenewalAt,
      updatedAt: Date.now(),
    });
    return { applied: true };
  },
});

export const updateSubscriptionStatus = internalMutation({
  args: {
    userId: v.id("users"),
    plan: v.optional(planSchema),
    pendingDowngradePlan: v.optional(v.union(planSchema, v.null())),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeSubscriptionStatus: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripeCurrentPeriodEnd: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    billingAnchor: v.optional(v.number()),
    nextRenewalAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(args.userId, {
      plan: args.plan ?? user.plan,
      pendingDowngradePlan:
        args.pendingDowngradePlan === null
          ? undefined
          : (args.pendingDowngradePlan ?? user.pendingDowngradePlan),
      stripeCustomerId: args.stripeCustomerId ?? user.stripeCustomerId,
      stripeSubscriptionId:
        args.stripeSubscriptionId ?? user.stripeSubscriptionId,
      stripeSubscriptionStatus:
        args.stripeSubscriptionStatus ?? user.stripeSubscriptionStatus,
      stripePriceId: args.stripePriceId ?? user.stripePriceId,
      stripeCurrentPeriodEnd:
        args.stripeCurrentPeriodEnd ?? user.stripeCurrentPeriodEnd,
      currentPeriodStart: args.currentPeriodStart ?? user.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd ?? user.currentPeriodEnd,
      billingAnchor: args.billingAnchor ?? user.billingAnchor,
      nextRenewalAt: args.nextRenewalAt ?? user.nextRenewalAt,
      updatedAt: Date.now(),
    });
    return { applied: true };
  },
});

export const grantFreeCreditsForNoPlan = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - FREE_CREDITS_INTERVAL_MS;
    const users = await ctx.db.query("users").collect();
    let granted = 0;

    for (const user of users) {
      const plan = (user.plan ?? "none") as Plan;
      if (plan !== "none") continue;
      const lastGrant = user.lastFreeGrantAt ?? 0;
      if (lastGrant && lastGrant > cutoff) continue;
      const nextCredits = (user.credits ?? 0) + FREE_CREDITS_AMOUNT;
      await ctx.db.patch(user._id, {
        credits: nextCredits,
        lastFreeGrantAt: now,
        updatedAt: now,
      });
      await insertLedgerEntry(ctx, {
        actorType: "user",
        userId: user._id,
        kind: "free_48h_15",
        amount: FREE_CREDITS_AMOUNT,
        balanceAfter: nextCredits,
        createdAt: now,
      });
      granted += 1;
    }

    return { granted };
  },
});

export const devGrantPlanCreditsNow = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdminOrDev(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    const plan = (user.plan ?? "none") as Plan;
    const amount = getMonthlyCreditsForPlan(plan);
    await applyCreditReset(ctx, {
      userId: args.userId,
      newBalance: amount,
      kind: "plan_reset",
    });
    await ctx.db.patch(args.userId, {
      plan,
      updatedAt: Date.now(),
    });
    return { credits: amount };
  },
});
