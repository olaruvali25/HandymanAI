import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const buildSubject = (userId: string | null, sessionId?: string) => {
  if (userId) return `user:${userId}`;
  if (sessionId) return `anon:${sessionId}`;
  return null;
};

export const getMessageCount = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const subject = buildSubject(userId, args.sessionId);
    if (!subject) return 0;

    const existing = await ctx.db
      .query("messageCounters")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    return existing?.count ?? 0;
  },
});

export const incrementMessageCount = mutation({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const subject = buildSubject(userId, args.sessionId);
    if (!subject) {
      throw new Error("Missing session id for anonymous usage.");
    }

    const existing = await ctx.db
      .query("messageCounters")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();

    const nextCount = (existing?.count ?? 0) + 1;
    if (existing) {
      await ctx.db.patch(existing._id, {
        count: nextCount,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("messageCounters", {
        subject,
        count: nextCount,
        updatedAt: Date.now(),
      });
    }

    return nextCount;
  },
});
