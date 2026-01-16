import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
    plan: v.optional(
      v.union(
        v.literal("none"),
        v.literal("small"),
        v.literal("medium"),
        v.literal("big"),
        v.literal("pro"),
      ),
    ),
    isAdmin: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
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
    guestChatId: v.optional(v.string()),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastPreview: v.string(),
    planAtCreation: v.optional(
      v.union(v.literal("medium"), v.literal("big"), v.literal("pro")),
    ),
  })
    .index("by_user_updatedAt", ["userId", "updatedAt"])
    .index("by_guestChatId", ["guestChatId"]),
  chatMessages: defineTable({
    threadId: v.id("chatThreads"),
    userId: v.optional(v.id("users")),
    guestChatId: v.optional(v.string()),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
    ),
    contentText: v.string(),
    attachments: v.optional(v.array(v.any())),
    createdAt: v.number(),
  }).index("by_thread_createdAt", ["threadId", "createdAt"]),
  messageCounters: defineTable({
    subject: v.string(),
    count: v.number(),
    updatedAt: v.number(),
  }).index("by_subject", ["subject"]),
});

export default schema;
