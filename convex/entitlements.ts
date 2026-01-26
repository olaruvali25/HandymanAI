import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { findLedgerEntryByTurnKind, insertLedgerEntry } from "./creditLedger";

const DEFAULT_ANON_CREDITS = 20;
const DEFAULT_USER_CREDITS = 0;

const CHAT_TEXT_TURN_COST = 4;
const CHAT_IMAGE_TURN_COST_PER_IMAGE = 13;

const assertValidChatTurnCost = (cost: number) => {
  const isTextTurn = cost === CHAT_TEXT_TURN_COST;
  const isImageTurn =
    cost >= CHAT_IMAGE_TURN_COST_PER_IMAGE &&
    cost % CHAT_IMAGE_TURN_COST_PER_IMAGE === 0;
  if (!isTextTurn && !isImageTurn) {
    throw new Error("Invalid user credit cost.");
  }
};

const chatTurnKindForCost = (cost: number) =>
  cost === CHAT_TEXT_TURN_COST ? "chat_text_turn" : "chat_image_turn";

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
    plan: (user.plan ?? "none") as "none" | "starter" | "plus" | "pro",
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
  await insertLedgerEntry(ctx, {
    actorType: "anonymous",
    anonymousId,
    kind: "anon_initial_20",
    amount: DEFAULT_ANON_CREDITS,
    balanceAfter: DEFAULT_ANON_CREDITS,
    createdAt: now,
  });
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
    threadId: v.optional(v.id("chatThreads")),
  },
  handler: async (ctx, args) => {
    assertValidChatTurnCost(args.cost);
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
    const kind = chatTurnKindForCost(args.cost);
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
      await insertLedgerEntry(ctx, {
        actorType: "user",
        userId: actor.userId,
        kind,
        amount: -args.cost,
        balanceAfter: nextCredits,
        threadId: args.threadId ?? undefined,
        turnId: args.turnId,
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
    await insertLedgerEntry(ctx, {
      actorType: "anonymous",
      anonymousId: actor.anonymousId,
      kind,
      amount: -args.cost,
      balanceAfter: nextCredits,
      threadId: args.threadId ?? undefined,
      turnId: args.turnId,
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
    threadId: v.optional(v.id("chatThreads")),
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
    if (actor.userId) {
      const { credits } = await ensureUserCredits(ctx, actor.userId);
      return { credits };
    }

    const { credits } = await ensureAnonymousUser(
      ctx,
      actor.anonymousId as string,
    );
    return { credits };
  },
});

export const recordOutOfCredits = mutation({
  args: {
    anonymousId: v.optional(v.string()),
    turnId: v.string(),
    threadId: v.optional(v.id("chatThreads")),
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

    const existing = await findLedgerEntryByTurnKind(
      ctx,
      actor,
      args.turnId,
      "out_of_credits_block",
    );
    if (existing) {
      return { recorded: false };
    }

    const now = Date.now();
    if (actor.userId) {
      const { credits } = await ensureUserCredits(ctx, actor.userId);
      await insertLedgerEntry(ctx, {
        actorType: "user",
        userId: actor.userId,
        kind: "out_of_credits_block",
        amount: 0,
        balanceAfter: credits,
        threadId: args.threadId ?? undefined,
        turnId: args.turnId,
        createdAt: now,
      });
      return { recorded: true };
    }

    const { credits } = await ensureAnonymousUser(
      ctx,
      actor.anonymousId as string,
    );
    await insertLedgerEntry(ctx, {
      actorType: "anonymous",
      anonymousId: actor.anonymousId,
      kind: "out_of_credits_block",
      amount: 0,
      balanceAfter: credits,
      threadId: args.threadId ?? undefined,
      turnId: args.turnId,
      createdAt: now,
    });
    return { recorded: true };
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

    const user = await ctx.db.get(userId);
    const currentCredits = typeof user?.credits === "number" ? user.credits : 0;
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
      creditsTransferred: anonCredits,
    };
  },
});
