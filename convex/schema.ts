import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { planSchema } from "./billingConfig";
import {
  chatAttachmentValidator,
  chatMessageActionValidator,
  chatMessageRoleValidator,
} from "./validators/chat";

const schema = defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    isAdmin: v.optional(v.boolean()),
    plan: v.optional(planSchema),
    credits: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    lastPlanCreditGrantAt: v.optional(v.number()),
    lastPlanCreditGrantPeriodKey: v.optional(v.string()),
    lastFreeGrantAt: v.optional(v.number()),
    loginBonusGrantedAt: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    billingAnchor: v.optional(v.number()),
    nextRenewalAt: v.optional(v.number()),
    pendingDowngradePlan: v.optional(planSchema),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeSubscriptionStatus: v.optional(v.string()),
    stripeCurrentPeriodEnd: v.optional(v.number()),
    stripePriceId: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_plan", ["plan"])
    .index("by_stripeCustomerId", ["stripeCustomerId"]),
  anonymousUsers: defineTable({
    anonymousId: v.string(),
    credits: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    mergedToUserId: v.optional(v.id("users")),
  }).index("by_anonymousId", ["anonymousId"]),
  guestCredits: defineTable({
    guestId: v.string(),
    remaining: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    consumedByUserId: v.optional(v.id("users")),
  }).index("by_guestId", ["guestId"]),
  tasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    completed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_createdAt", ["userId", "createdAt"]),
  chatThreads: defineTable({
    userId: v.optional(v.id("users")),
    anonymousId: v.optional(v.string()),
    guestChatId: v.optional(v.string()),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastPreview: v.string(),
  })
    .index("by_user_updatedAt", ["userId", "updatedAt"])
    .index("by_anonymousId", ["anonymousId"])
    .index("by_guestChatId", ["guestChatId"]),
  chatMessages: defineTable({
    threadId: v.id("chatThreads"),
    userId: v.optional(v.id("users")),
    anonymousId: v.optional(v.string()),
    guestChatId: v.optional(v.string()),
    role: chatMessageRoleValidator,
    contentText: v.string(),
    attachments: v.optional(v.array(chatAttachmentValidator)),
    actions: v.optional(v.array(chatMessageActionValidator)),
    createdAt: v.number(),
  }).index("by_thread_createdAt", ["threadId", "createdAt"]),
  creditCharges: defineTable({
    actorType: v.union(v.literal("user"), v.literal("anonymous")),
    userId: v.optional(v.id("users")),
    anonymousId: v.optional(v.string()),
    turnId: v.string(),
    stage: v.union(v.literal("user"), v.literal("assistant")),
    amount: v.number(),
    createdAt: v.number(),
  })
    .index("by_user_turn_stage", ["userId", "turnId", "stage"])
    .index("by_anonymous_turn_stage", ["anonymousId", "turnId", "stage"]),
  creditGrants: defineTable({
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
    createdAt: v.number(),
  })
    .index("by_user_type_period", ["userId", "type", "periodKey"])
    .index("by_event", ["eventId"]),
  creditLedger: defineTable({
    actorType: v.union(v.literal("user"), v.literal("anonymous")),
    userId: v.optional(v.id("users")),
    anonymousId: v.optional(v.string()),
    kind: v.union(
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
    ),
    amount: v.number(),
    balanceAfter: v.number(),
    stripeEventId: v.optional(v.string()),
    threadId: v.optional(v.id("chatThreads")),
    turnId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_createdAt", ["userId", "createdAt"])
    .index("by_anonymous_createdAt", ["anonymousId", "createdAt"])
    .index("by_stripeEventId", ["stripeEventId"])
    .index("by_user_turn_kind", ["userId", "turnId", "kind"])
    .index("by_anonymous_turn_kind", ["anonymousId", "turnId", "kind"]),
});

export default schema;
