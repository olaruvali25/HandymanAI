import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const CREDIT_LEDGER_KINDS = [
  "anon_initial_20",
  "login_bonus_10",
  "free_48h_15",
  "plan_reset",
  "plan_upgrade_add",
  "plan_renewal_reset",
  "topup_add",
  "chat_user_send",
  "chat_assistant_reply",
  "chat_text_turn",
  "chat_image_turn",
  "out_of_credits_block",
] as const;

export type CreditLedgerKind = (typeof CREDIT_LEDGER_KINDS)[number];

export const creditLedgerKindSchema = v.union(
  v.literal("anon_initial_20"),
  v.literal("login_bonus_10"),
  v.literal("free_48h_15"),
  v.literal("plan_reset"),
  v.literal("plan_upgrade_add"),
  v.literal("plan_renewal_reset"),
  v.literal("topup_add"),
  v.literal("chat_user_send"),
  v.literal("chat_assistant_reply"),
  v.literal("chat_text_turn"),
  v.literal("chat_image_turn"),
  v.literal("out_of_credits_block"),
);

export const findLedgerEntryByStripeEventId = async (
  ctx: MutationCtx,
  stripeEventId: string,
) => {
  return ctx.db
    .query("creditLedger")
    .withIndex("by_stripeEventId", (q) => q.eq("stripeEventId", stripeEventId))
    .unique();
};

export const findLedgerEntryByTurnKind = async (
  ctx: MutationCtx,
  actor: { userId?: Id<"users">; anonymousId?: string },
  turnId: string,
  kind: CreditLedgerKind,
) => {
  if (actor.userId) {
    return ctx.db
      .query("creditLedger")
      .withIndex("by_user_turn_kind", (q) =>
        q.eq("userId", actor.userId).eq("turnId", turnId).eq("kind", kind),
      )
      .unique();
  }
  if (actor.anonymousId) {
    return ctx.db
      .query("creditLedger")
      .withIndex("by_anonymous_turn_kind", (q) =>
        q
          .eq("anonymousId", actor.anonymousId)
          .eq("turnId", turnId)
          .eq("kind", kind),
      )
      .unique();
  }
  return null;
};

export const insertLedgerEntry = async (
  ctx: MutationCtx,
  entry: {
    actorType: "user" | "anonymous";
    userId?: Id<"users">;
    anonymousId?: string;
    kind: CreditLedgerKind;
    amount: number;
    balanceAfter: number;
    stripeEventId?: string;
    threadId?: Id<"chatThreads">;
    turnId?: string;
    createdAt?: number;
  },
) => {
  const createdAt = entry.createdAt ?? Date.now();
  return ctx.db.insert("creditLedger", {
    actorType: entry.actorType,
    userId: entry.userId,
    anonymousId: entry.anonymousId,
    kind: entry.kind,
    amount: entry.amount,
    balanceAfter: entry.balanceAfter,
    stripeEventId: entry.stripeEventId,
    threadId: entry.threadId,
    turnId: entry.turnId,
    createdAt,
  });
};
