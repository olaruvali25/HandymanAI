import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import type { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  chatAttachmentValidator,
  chatMessageRoleValidator,
} from "./validators/chat";
import { insertLedgerEntry } from "./creditLedger";

type ConvexCtx = QueryCtx | MutationCtx;

const hydrateAttachments = async (
  ctx: QueryCtx,
  attachments: {
    name: string;
    type: string;
    size: number;
    storageId?: Id<"_storage">;
    url?: string;
    dataUrl?: string;
  }[],
) => {
  return Promise.all(
    attachments.map(async (attachment) => {
      if (attachment.url || attachment.dataUrl || !attachment.storageId) {
        return attachment;
      }
      const url = await ctx.storage.getUrl(attachment.storageId);
      return {
        ...attachment,
        url: url ?? undefined,
      };
    }),
  );
};

const requireAuthenticatedUser = async (ctx: ConvexCtx) => {
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

export const listThreadsForActor = query({
  args: { anonymousId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId) {
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
    }
    if (!args.anonymousId) {
      return [];
    }
    const threads = await ctx.db
      .query("chatThreads")
      .withIndex("by_anonymousId", (q) => q.eq("anonymousId", args.anonymousId))
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
      .withIndex("by_thread_createdAt", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    return Promise.all(
      messages.map(async (message) => ({
        id: message._id,
        role: message.role,
        contentText: message.contentText,
        createdAt: message.createdAt,
        attachments: await hydrateAttachments(
          ctx,
          (message.attachments ?? []) as {
            name: string;
            type: string;
            size: number;
            storageId?: Id<"_storage">;
            url?: string;
            dataUrl?: string;
          }[],
        ),
      })),
    );
  },
});

export const getThreadMessagesForActor = query({
  args: { threadId: v.id("chatThreads"), anonymousId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Not found");
    }
    const hasUserAccess = userId && thread.userId === userId;
    const hasGuestAccess =
      args.anonymousId &&
      (thread.anonymousId === args.anonymousId ||
        thread.guestChatId === args.anonymousId);
    if (!hasUserAccess && !hasGuestAccess) {
      throw new Error("Not found");
    }
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread_createdAt", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    return Promise.all(
      messages.map(async (message) => ({
        id: message._id,
        role: message.role,
        contentText: message.contentText,
        createdAt: message.createdAt,
        attachments: await hydrateAttachments(
          ctx,
          (message.attachments ?? []) as {
            name: string;
            type: string;
            size: number;
            storageId?: Id<"_storage">;
            url?: string;
            dataUrl?: string;
          }[],
        ),
      })),
    );
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
    const anonymousId = args.guestChatId ?? undefined;

    const threadId = await ctx.db.insert("chatThreads", {
      userId: userId ?? undefined,
      anonymousId: userId ? undefined : anonymousId,
      guestChatId: userId ? undefined : anonymousId,
      title,
      createdAt: now,
      updatedAt: now,
      lastPreview: "",
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
        role: chatMessageRoleValidator,
        contentText: v.string(),
        createdAt: v.optional(v.number()),
        attachments: v.optional(v.array(chatAttachmentValidator)),
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
      args.guestChatId &&
      (thread.anonymousId === args.guestChatId ||
        thread.guestChatId === args.guestChatId);
    if (!hasUserAccess && !hasGuestAccess) {
      throw new Error("Not found");
    }

    const now = Date.now();
    let lastPreview = thread.lastPreview;
    for (const message of args.messages) {
      await ctx.db.insert("chatMessages", {
        threadId: args.threadId,
        userId: userId ?? undefined,
        anonymousId: userId ? undefined : (args.guestChatId ?? undefined),
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
      .withIndex("by_anonymousId", (q) => q.eq("anonymousId", args.guestChatId))
      .collect();
    if (threads.length === 0) {
      const legacyThreads = await ctx.db
        .query("chatThreads")
        .withIndex("by_guestChatId", (q) =>
          q.eq("guestChatId", args.guestChatId),
        )
        .collect();
      threads.push(...legacyThreads);
    }

    let merged = 0;
    for (const thread of threads) {
      if (thread.userId === userId) {
        await ctx.db.patch(thread._id, {
          guestChatId: undefined,
          anonymousId: undefined,
        });
        continue;
      }
      await ctx.db.patch(thread._id, {
        userId,
        guestChatId: undefined,
        anonymousId: undefined,
      });
      const messages = await ctx.db
        .query("chatMessages")
        .withIndex("by_thread_createdAt", (q) => q.eq("threadId", thread._id))
        .collect();
      for (const message of messages) {
        await ctx.db.patch(message._id, {
          userId,
          guestChatId: undefined,
          anonymousId: undefined,
        });
      }
      merged += 1;
    }

    const anonymousUser = await ctx.db
      .query("anonymousUsers")
      .withIndex("by_anonymousId", (q) => q.eq("anonymousId", args.guestChatId))
      .unique();
    if (anonymousUser && !anonymousUser.mergedToUserId) {
      const user = await ctx.db.get(userId);
      const currentCredits =
        typeof user?.credits === "number" ? user.credits : 0;
      const anonCredits = anonymousUser.credits ?? 0;
      const now = Date.now();
      let nextCredits = currentCredits;

      if (anonCredits > 0) {
        nextCredits += anonCredits;
        await ctx.db.patch(userId, {
          credits: nextCredits,
          updatedAt: now,
        });
        await insertLedgerEntry(ctx, {
          actorType: "user",
          userId,
          kind: "anon_initial_20",
          amount: anonCredits,
          balanceAfter: nextCredits,
          createdAt: now,
        });
      }

      if (!user?.loginBonusGrantedAt) {
        nextCredits += 10;
        await ctx.db.patch(userId, {
          credits: nextCredits,
          loginBonusGrantedAt: now,
          updatedAt: now,
        });
        await insertLedgerEntry(ctx, {
          actorType: "user",
          userId,
          kind: "login_bonus_10",
          amount: 10,
          balanceAfter: nextCredits,
          createdAt: now,
        });
      }

      await ctx.db.patch(anonymousUser._id, {
        credits: 0,
        mergedToUserId: userId,
        updatedAt: now,
      });
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

const assertThreadAccess = async (
  ctx: MutationCtx,
  threadId: Id<"chatThreads">,
  anonymousId?: string,
) => {
  const userId = await getAuthUserId(ctx);
  const thread = await ctx.db.get(threadId);
  if (!thread) {
    throw new Error("Not found");
  }
  if (userId && thread.userId === userId) {
    return { userId, thread };
  }
  if (
    anonymousId &&
    (thread.anonymousId === anonymousId || thread.guestChatId === anonymousId)
  ) {
    return { userId: null, thread };
  }
  throw new Error("Not found");
};

export const appendUserMessage = mutation({
  args: {
    threadId: v.id("chatThreads"),
    anonymousId: v.optional(v.string()),
    contentText: v.string(),
    attachments: v.optional(v.array(chatAttachmentValidator)),
  },
  handler: async (ctx, args) => {
    const { userId, thread } = await assertThreadAccess(
      ctx,
      args.threadId,
      args.anonymousId,
    );
    const now = Date.now();
    await ctx.db.insert("chatMessages", {
      threadId: args.threadId,
      userId: userId ?? undefined,
      anonymousId: userId ? undefined : args.anonymousId,
      guestChatId: userId ? undefined : args.anonymousId,
      role: "user",
      contentText: args.contentText,
      attachments: args.attachments ?? [],
      createdAt: now,
    });
    await ctx.db.patch(thread._id, {
      updatedAt: now,
      lastPreview: args.contentText.slice(0, 80),
    });
  },
});

export const appendAssistantMessage = mutation({
  args: {
    threadId: v.id("chatThreads"),
    anonymousId: v.optional(v.string()),
    contentText: v.string(),
    attachments: v.optional(v.array(chatAttachmentValidator)),
  },
  handler: async (ctx, args) => {
    const { userId, thread } = await assertThreadAccess(
      ctx,
      args.threadId,
      args.anonymousId,
    );
    const now = Date.now();
    await ctx.db.insert("chatMessages", {
      threadId: args.threadId,
      userId: userId ?? undefined,
      anonymousId: userId ? undefined : args.anonymousId,
      guestChatId: userId ? undefined : args.anonymousId,
      role: "assistant",
      contentText: args.contentText,
      attachments: args.attachments ?? [],
      createdAt: now,
    });
    await ctx.db.patch(thread._id, {
      updatedAt: now,
    });
  },
});
