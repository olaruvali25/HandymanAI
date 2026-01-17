import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { planSchema, type Plan } from "./plans";

export const getMonthlyCreditsForPlan = (plan: Plan) => {
  if (plan === "starter") return 300;
  if (plan === "plus") return 800;
  if (plan === "pro") return 1600;
  return 20;
};

const applyGrant = async (
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    type: "plan_monthly" | "plan_start" | "topup";
    provider?: string;
    eventId: string;
    periodKey?: string;
    plan?: Plan;
    amount: number;
  },
) => {
  const existingEvent = await ctx.db
    .query("creditGrants")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .unique();
  if (existingEvent) {
    return { granted: false, reason: "event_exists" } as const;
  }

  if (args.type === "plan_monthly" && args.periodKey) {
    const existingPeriod = await ctx.db
      .query("creditGrants")
      .withIndex("by_user_type_period", (q) =>
        q
          .eq("userId", args.userId)
          .eq("type", args.type)
          .eq("periodKey", args.periodKey),
      )
      .unique();
    if (existingPeriod) {
      return { granted: false, reason: "period_exists" } as const;
    }
  }

  const user = await ctx.db.get(args.userId);
  if (!user) {
    throw new Error("User not found");
  }

  const now = Date.now();
  const nextCredits = (user.credits ?? 0) + args.amount;

  await ctx.db.patch(args.userId, {
    credits: nextCredits,
    updatedAt: now,
    lastPlanCreditGrantAt: args.type === "topup" ? user.lastPlanCreditGrantAt : now,
    lastPlanCreditGrantPeriodKey:
      args.type === "plan_monthly"
        ? args.periodKey ?? user.lastPlanCreditGrantPeriodKey
        : user.lastPlanCreditGrantPeriodKey,
  });

  await ctx.db.insert("creditGrants", {
    userId: args.userId,
    type: args.type,
    provider: args.provider,
    eventId: args.eventId,
    periodKey: args.periodKey,
    plan: args.plan,
    amount: args.amount,
    createdAt: now,
  });

  return { granted: true, credits: nextCredits } as const;
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

export const grantCreditsFromBillingEvent = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("plan_monthly"),
      v.literal("plan_start"),
      v.literal("topup"),
    ),
    provider: v.optional(v.string()),
    eventId: v.string(),
    periodKey: v.optional(v.string()),
    plan: v.optional(planSchema),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    return applyGrant(ctx, {
      userId: args.userId,
      type: args.type,
      provider: args.provider,
      eventId: args.eventId,
      periodKey: args.periodKey ?? undefined,
      plan: args.plan ?? undefined,
      amount: args.amount,
    });
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
    const eventId = `dev:${Date.now()}:${args.userId}`;
    return applyGrant(ctx, {
      userId: args.userId,
      type: "plan_start",
      provider: "dev",
      eventId,
      plan,
      amount,
    });
  },
});
