import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";

const DEFAULT_ANON_CREDITS = 9;
const DEFAULT_USER_CREDITS = 15;

const ensureUserCredits = async (ctx: MutationCtx, userId: Id<"users">) => {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }
  if (typeof user.credits === "number") {
    return { doc: user, credits: user.credits };
  }
  await ctx.db.patch(userId, {
    credits: DEFAULT_USER_CREDITS,
    updatedAt: Date.now(),
  });
  return { doc: user, credits: DEFAULT_USER_CREDITS };
};

const ensureAnonymousUser = async (ctx: MutationCtx, anonymousId: string) => {
  const existing = await ctx.db
    .query("anonymousUsers")
    .withIndex("by_anonymousId", (q) => q.eq("anonymousId", anonymousId))
    .unique();
  if (existing) {
    return { doc: existing, credits: existing.credits };
  }
  const now = Date.now();
  const id = await ctx.db.insert("anonymousUsers", {
    anonymousId,
    credits: DEFAULT_ANON_CREDITS,
    createdAt: now,
    updatedAt: now,
  });
  const doc = await ctx.db.get(id);
  if (!doc) {
    throw new Error("Anonymous user not found");
  }
  return { doc, credits: DEFAULT_ANON_CREDITS };
};

const findCharge = async (
  ctx: MutationCtx,
  actor: { userId?: Id<"users">; anonymousId?: string },
  turnId: string,
  stage: "user" | "assistant",
) => {
  if (actor.userId) {
    return ctx.db
      .query("creditCharges")
      .withIndex("by_user_turn_stage", (q) =>
        q.eq("userId", actor.userId).eq("turnId", turnId).eq("stage", stage),
      )
      .unique();
  }
  if (actor.anonymousId) {
    return ctx.db
      .query("creditCharges")
      .withIndex("by_anonymous_turn_stage", (q) =>
        q
          .eq("anonymousId", actor.anonymousId)
          .eq("turnId", turnId)
          .eq("stage", stage),
      )
      .unique();
  }
  return null;
};

export const getCreditsForActor = query({
  args: { anonymousId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId) {
      const user = await ctx.db.get(userId);
      return { credits: typeof user?.credits === "number" ? user.credits : 0 };
    }
    const anonymousId = args.anonymousId;
    if (!anonymousId) {
      return { credits: 0 };
    }
    const anonymousUser = await ctx.db
      .query("anonymousUsers")
      .withIndex("by_anonymousId", (q) => q.eq("anonymousId", anonymousId))
      .unique();
    return { credits: anonymousUser?.credits ?? 0 };
  },
});

export const reserveCredits = mutation({
  args: {
    anonymousId: v.optional(v.string()),
    turnId: v.string(),
    cost: v.number(),
    minimumCredits: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const actor = userId
      ? { userId }
      : args.anonymousId
        ? { anonymousId: args.anonymousId }
        : null;

    if (!actor) {
      throw new Error("Missing anonymousId for anonymous usage.");
    }

    const existingCharge = await findCharge(ctx, actor, args.turnId, "user");
    if (existingCharge) {
      if (actor.userId) {
        const { credits } = await ensureUserCredits(ctx, actor.userId);
        return { credits };
      }
      const { credits } = await ensureAnonymousUser(
        ctx,
        actor.anonymousId as string,
      );
      return { credits };
    }

    const now = Date.now();
    if (actor.userId) {
      const { credits } = await ensureUserCredits(ctx, actor.userId);
      const minimum =
        typeof args.minimumCredits === "number"
          ? args.minimumCredits
          : args.cost;
      if (credits < minimum) {
        throw new Error("INSUFFICIENT_CREDITS");
      }
      const nextCredits = credits - args.cost;
      await ctx.db.patch(actor.userId, {
        credits: nextCredits,
        updatedAt: now,
      });
      await ctx.db.insert("creditCharges", {
        actorType: "user",
        userId: actor.userId,
        turnId: args.turnId,
        stage: "user",
        amount: args.cost,
        createdAt: now,
      });
      return { credits: nextCredits };
    }

    const { doc, credits } = await ensureAnonymousUser(
      ctx,
      actor.anonymousId as string,
    );
    const minimum =
      typeof args.minimumCredits === "number" ? args.minimumCredits : args.cost;
    if (credits < minimum) {
      throw new Error("INSUFFICIENT_CREDITS");
    }
    const nextCredits = credits - args.cost;
    await ctx.db.patch(doc._id, {
      credits: nextCredits,
      updatedAt: now,
    });
    await ctx.db.insert("creditCharges", {
      actorType: "anonymous",
      anonymousId: actor.anonymousId,
      turnId: args.turnId,
      stage: "user",
      amount: args.cost,
      createdAt: now,
    });
    return { credits: nextCredits };
  },
});

export const chargeAssistantCredits = mutation({
  args: {
    anonymousId: v.optional(v.string()),
    turnId: v.string(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const actor = userId
      ? { userId }
      : args.anonymousId
        ? { anonymousId: args.anonymousId }
        : null;

    if (!actor) {
      throw new Error("Missing anonymousId for anonymous usage.");
    }

    const existingCharge = await findCharge(
      ctx,
      actor,
      args.turnId,
      "assistant",
    );
    if (existingCharge) {
      if (actor.userId) {
        const { credits } = await ensureUserCredits(ctx, actor.userId);
        return { credits };
      }
      const { credits } = await ensureAnonymousUser(
        ctx,
        actor.anonymousId as string,
      );
      return { credits };
    }

    const now = Date.now();
    if (actor.userId) {
      const { credits } = await ensureUserCredits(ctx, actor.userId);
      if (credits < args.cost) {
        throw new Error("INSUFFICIENT_CREDITS");
      }
      const nextCredits = credits - args.cost;
      await ctx.db.patch(actor.userId, {
        credits: nextCredits,
        updatedAt: now,
      });
      await ctx.db.insert("creditCharges", {
        actorType: "user",
        userId: actor.userId,
        turnId: args.turnId,
        stage: "assistant",
        amount: args.cost,
        createdAt: now,
      });
      return { credits: nextCredits };
    }

    const { doc, credits } = await ensureAnonymousUser(
      ctx,
      actor.anonymousId as string,
    );
    if (credits < args.cost) {
      throw new Error("INSUFFICIENT_CREDITS");
    }
    const nextCredits = credits - args.cost;
    await ctx.db.patch(doc._id, {
      credits: nextCredits,
      updatedAt: now,
    });
    await ctx.db.insert("creditCharges", {
      actorType: "anonymous",
      anonymousId: actor.anonymousId,
      turnId: args.turnId,
      stage: "assistant",
      amount: args.cost,
      createdAt: now,
    });
    return { credits: nextCredits };
  },
});

export const syncAnonymousToUser = mutation({
  args: { anonymousId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const anonymousUser = await ctx.db
      .query("anonymousUsers")
      .withIndex("by_anonymousId", (q) => q.eq("anonymousId", args.anonymousId))
      .unique();
    if (!anonymousUser || anonymousUser.mergedToUserId) {
      return { mergedThreads: 0, creditsTransferred: 0 };
    }

    const { credits: userCredits } = await ensureUserCredits(ctx, userId);
    const nextCredits = userCredits + (anonymousUser.credits ?? 0);
    await ctx.db.patch(userId, {
      credits: nextCredits,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(anonymousUser._id, {
      credits: 0,
      mergedToUserId: userId,
      updatedAt: Date.now(),
    });

    const threads = await ctx.db
      .query("chatThreads")
      .withIndex("by_anonymousId", (q) => q.eq("anonymousId", args.anonymousId))
      .collect();
    if (threads.length === 0) {
      const legacyThreads = await ctx.db
        .query("chatThreads")
        .withIndex("by_guestChatId", (q) =>
          q.eq("guestChatId", args.anonymousId),
        )
        .collect();
      threads.push(...legacyThreads);
    }
    let mergedThreads = 0;
    for (const thread of threads) {
      await ctx.db.patch(thread._id, {
        userId,
        anonymousId: undefined,
        guestChatId: undefined,
      });
      const messages = await ctx.db
        .query("chatMessages")
        .withIndex("by_thread_createdAt", (q) => q.eq("threadId", thread._id))
        .collect();
      for (const message of messages) {
        await ctx.db.patch(message._id, {
          userId,
          anonymousId: undefined,
          guestChatId: undefined,
        });
      }
      mergedThreads += 1;
    }

    return {
      mergedThreads,
      creditsTransferred: anonymousUser.credits ?? 0,
    };
  },
});
