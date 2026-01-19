import { v } from "convex/values";

export const PLAN_VALUES = ["none", "starter", "plus", "pro"] as const;
export type Plan = (typeof PLAN_VALUES)[number];

export const planSchema = v.union(
  v.literal("none"),
  v.literal("starter"),
  v.literal("plus"),
  v.literal("pro"),
);

export const PLAN_CREDITS: Record<Plan, number> = {
  none: 0,
  starter: 300,
  plus: 800,
  pro: 1600,
};

export const PLAN_RANK: Record<Plan, number> = {
  none: 0,
  starter: 1,
  plus: 2,
  pro: 3,
};

export const CREDIT_COSTS = {
  userMessage: 2,
  imageSurcharge: 15,
  assistantReply: 2,
} as const;

export const getMonthlyCreditsForPlan = (plan: Plan) =>
  PLAN_CREDITS[plan] ?? 0;

export const getPlanRank = (plan: Plan) => PLAN_RANK[plan] ?? 0;
