import { v } from "convex/values";

export const PLAN_VALUES = ["none", "starter", "plus", "pro"] as const;
export type Plan = (typeof PLAN_VALUES)[number];

export const planSchema = v.union(
  v.literal("none"),
  v.literal("starter"),
  v.literal("plus"),
  v.literal("pro"),
);
