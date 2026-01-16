import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import { mutation, query } from "./_generated/server";

const requireAuthenticatedUser = async (ctx: any) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return { userId };
};

export const listThreadsForUser = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthenticatedUser(ctx);
    const threads = await ctx.db
      .query("chatThreads")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(30);

    return threads.map((thread) => ({
      id: thread._id,
      title: thread.title,
      updatedAt: thread.updatedAt,
      lastPreview: thread.lastPreview,
    }));
  },
});

export const getThreadMessages = query({
  args: { threadId: v.id("chatThreads") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Not found");
    }
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread_createdAt", (q) =>
        q.eq("threadId", args.threadId),
      )
      .order("asc")
      .collect();

    return messages.map((message) => ({
      id: message._id,
      role: message.role,
      contentText: message.contentText,
      createdAt: message.createdAt,
      attachments: message.attachments ?? [],
    }));
  },
});

export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
    guestChatId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    const title = args.title?.trim() || "New repair chat";
    if (!userId && !args.guestChatId) {
      throw new Error("Unauthorized");
    }

    const threadId = await ctx.db.insert("chatThreads", {
      userId: userId ?? undefined,
      guestChatId: userId ? undefined : args.guestChatId,
      title,
      createdAt: now,
      updatedAt: now,
      lastPreview: "",
      planAtCreation: undefined,
    });

    return threadId;
  },
});

export const appendMessages = mutation({
  args: {
    threadId: v.id("chatThreads"),
    guestChatId: v.optional(v.string()),
    messages: v.array(
      v.object({
        role: v.union(
          v.literal("user"),
          v.literal("assistant"),
          v.literal("system"),
        ),
        contentText: v.string(),
        createdAt: v.optional(v.number()),
        attachments: v.optional(v.array(v.any())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Not found");
    }
    const hasUserAccess = userId && thread.userId === userId;
    const hasGuestAccess =
      args.guestChatId && thread.guestChatId === args.guestChatId;
    if (!hasUserAccess && !hasGuestAccess) {
      throw new Error("Not found");
    }

    const now = Date.now();
    let lastPreview = thread.lastPreview;
    for (const message of args.messages) {
      await ctx.db.insert("chatMessages", {
        threadId: args.threadId,
        userId: userId ?? undefined,
        guestChatId: userId ? undefined : args.guestChatId,
        role: message.role,
        contentText: message.contentText,
        attachments: message.attachments ?? [],
        createdAt: message.createdAt ?? now,
      });
      if (message.role === "user") {
        lastPreview = message.contentText.slice(0, 80);
      }
    }

    await ctx.db.patch(args.threadId, {
      updatedAt: now,
      lastPreview,
    });
  },
});

export const mergeGuestThreads = mutation({
  args: { guestChatId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx);
    const threads = await ctx.db
      .query("chatThreads")
      .withIndex("by_guestChatId", (q) => q.eq("guestChatId", args.guestChatId))
      .collect();

    let merged = 0;
    for (const thread of threads) {
      if (thread.userId === userId) {
        await ctx.db.patch(thread._id, { guestChatId: undefined });
        continue;
      }
      await ctx.db.patch(thread._id, {
        userId,
        guestChatId: undefined,
      });
      const messages = await ctx.db
        .query("chatMessages")
        .withIndex("by_thread_createdAt", (q) => q.eq("threadId", thread._id))
        .collect();
      for (const message of messages) {
        await ctx.db.patch(message._id, {
          userId,
          guestChatId: undefined,
        });
      }
      merged += 1;
    }

    return { merged };
  },
});

export const renameThread = mutation({
  args: {
    threadId: v.id("chatThreads"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(args.threadId, { title: args.title });
  },
});

export const deleteThread = mutation({
  args: {
    threadId: v.id("chatThreads"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(args.threadId);
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread_createdAt", (q) => q.eq("threadId", args.threadId))
      .collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
  },
});
