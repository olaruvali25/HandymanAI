"use node";

import { v } from "convex/values";
import Stripe from "stripe";

import type { Doc, Id } from "./_generated/dataModel";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { planSchema, type Plan, getPlanRank } from "./billingConfig";

const parsePlanPriceMap = () => {
  const raw = process.env.STRIPE_PLAN_PRICE_IDS ?? "";
  if (!raw) return {} as Record<Plan, string>;
  try {
    return JSON.parse(raw) as Record<Plan, string>;
  } catch {
    const trimmed = raw.trim().replace(/^\{|\}$/g, "");
    if (!trimmed) return {} as Record<Plan, string>;
    const entries = trimmed.split(",").map((segment) => segment.trim());
    const pairs = entries
      .map((segment) => segment.split(":").map((part) => part.trim()))
      .filter((parts) => parts.length === 2)
      .map(([plan, priceId]) => [
        plan.replace(/(^\"|\"$)/g, "") as Plan,
        priceId.replace(/(^\"|\"$)/g, ""),
      ]);
    return Object.fromEntries(pairs) as Record<Plan, string>;
  }
};

const getPlanFromPriceId = (priceId?: string | null) => {
  if (!priceId) return null;
  const planMap = parsePlanPriceMap();
  const priceToPlan = Object.fromEntries(
    Object.entries(planMap)
      .filter(([, price]) => typeof price === "string" && price.length > 0)
      .map(([planKey, price]) => [price, planKey]),
  ) as Record<string, Plan>;
  return priceToPlan[priceId] ?? null;
};

const resolveUserId = async (
  ctx: ActionCtx,
  metadataUserId?: string | null,
  customerId?: string | null,
) => {
  if (metadataUserId) return metadataUserId as Id<"users">;
  if (!customerId) return null;
  const user = (await ctx.runQuery(internal.users.getByStripeCustomerId, {
    stripeCustomerId: customerId,
  })) as Doc<"users"> | null;
  return user?._id ?? null;
};

const stripeClient = () => {
  const stripeKey = process.env.STRIPE_KEY;
  if (!stripeKey) {
    throw new Error("Missing STRIPE_KEY");
  }
  return new Stripe(stripeKey, {
    apiVersion: "2025-12-15.clover",
  });
};

type SubscriptionWithPeriods = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
  billing_cycle_anchor?: number;
};

type InvoiceWithExtras = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  lines?: { data?: Array<{ price?: { id?: string | null } | null }> };
  subscription_details?: { metadata?: { userId?: string } };
};

export const createTopupCheckoutSession = action({
  args: { credits: v.number() },
  handler: async (ctx, args): Promise<string | null> => {
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity) {
      throw new Error("User must be logged in");
    }
    const user = (await ctx.runQuery(api.users.me, {})) as Doc<"users"> | null;
    if (!user) {
      throw new Error("User profile not found");
    }

    const hostUrl = process.env.HOST_URL;
    if (!hostUrl) {
      throw new Error("Missing HOST_URL");
    }

    const priceId = process.env.STRIPE_TOPUP_PRICE_ID ?? "";
    if (!priceId) {
      throw new Error("Missing Stripe top-up price ID");
    }
    if (!Number.isFinite(args.credits) || args.credits < 100) {
      throw new Error("Invalid top-up credits amount");
    }
    if (args.credits % 100 !== 0) {
      throw new Error("Top-up credits must be in 100 credit increments");
    }
    const quantity = Math.round(args.credits / 100);
    if (quantity < 1 || quantity > 15) {
      throw new Error("Top-up quantity out of range");
    }

    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      mode: "payment",
      success_url: `${hostUrl}/pricing?success=true`,
      cancel_url: `${hostUrl}/pricing?canceled=true`,
      metadata: {
        userId: user._id,
        type: "topup",
        credits: String(args.credits),
      },
    });

    return session.url;
  },
});

export const createPlanCheckoutSession = action({
  args: { plan: planSchema },
  handler: async (ctx, args): Promise<string | null> => {
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity) {
      throw new Error("User must be logged in");
    }
    const user = (await ctx.runQuery(api.users.me, {})) as Doc<"users"> | null;
    if (!user) {
      throw new Error("User profile not found");
    }

    const hostUrl = process.env.HOST_URL;
    if (!hostUrl) {
      throw new Error("Missing HOST_URL");
    }

    const planMap = parsePlanPriceMap();
    const priceId = planMap[args.plan];
    if (!priceId) {
      throw new Error(`Missing Stripe price ID for plan ${args.plan}`);
    }

    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${hostUrl}/pricing?success=true`,
      cancel_url: `${hostUrl}/pricing?canceled=true`,
      client_reference_id: user._id,
      subscription_data: {
        metadata: {
          userId: user._id,
          plan: args.plan,
        },
      },
      metadata: {
        userId: user._id,
        type: "plan",
        plan: args.plan,
      },
    });

    return session.url;
  },
});

export const createCustomerPortalSession = action({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity) {
      throw new Error("User must be logged in");
    }
    const user = (await ctx.runQuery(api.users.me, {})) as Doc<"users"> | null;
    if (!user) {
      throw new Error("User profile not found");
    }
    if (!user.stripeCustomerId) {
      throw new Error("Missing Stripe customer record");
    }

    const hostUrl = process.env.HOST_URL;
    if (!hostUrl) {
      throw new Error("Missing HOST_URL");
    }

    const stripe = stripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${hostUrl}/profile`,
    });

    return session.url ?? null;
  },
});

export const handleWebhook = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Missing Stripe webhook secret");
    }

    const stripe = stripeClient();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        args.body,
        args.signature,
        webhookSecret,
      );
    } catch {
      throw new Error("Webhook signature verification failed");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId =
        typeof session.customer === "string" ? session.customer : null;
      const userId = await resolveUserId(
        ctx,
        session.metadata?.userId ?? session.client_reference_id ?? null,
        customerId,
      );

      if (session.mode === "payment" && userId) {
        const credits = Number(session.metadata?.credits ?? 0);
        if (Number.isFinite(credits) && credits > 0) {
          await ctx.runMutation(internal.credits.applyTopupFromStripe, {
            userId,
            amount: credits,
            stripeEventId: event.id,
          });
        }
      }

      if (session.mode === "subscription" && userId) {
        await ctx.runMutation(internal.credits.updateSubscriptionStatus, {
          userId,
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId:
            typeof session.subscription === "string"
              ? session.subscription
              : undefined,
          stripeSubscriptionStatus:
            typeof session.status === "string" ? session.status : undefined,
          stripeCurrentPeriodEnd: undefined,
        });
      }
    }

    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as SubscriptionWithPeriods;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : null;
      const userId = await resolveUserId(
        ctx,
        subscription.metadata?.userId ?? null,
        customerId,
      );
      if (userId) {
        const priceId = subscription.items.data[0]?.price?.id ?? null;
        const currentPeriodStart = subscription.current_period_start
          ? subscription.current_period_start * 1000
          : undefined;
        const currentPeriodEnd = subscription.current_period_end
          ? subscription.current_period_end * 1000
          : undefined;
        const billingAnchor = subscription.billing_cycle_anchor
          ? subscription.billing_cycle_anchor * 1000
          : undefined;
        const nextRenewalAt = currentPeriodEnd;

        await ctx.runMutation(internal.credits.updateSubscriptionStatus, {
          userId,
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: subscription.status ?? undefined,
          stripePriceId: priceId ?? undefined,
          stripeCurrentPeriodEnd: currentPeriodEnd,
          currentPeriodStart,
          currentPeriodEnd,
          billingAnchor,
          nextRenewalAt,
        });
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as SubscriptionWithPeriods;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : null;
      const userId = await resolveUserId(
        ctx,
        subscription.metadata?.userId ?? null,
        customerId,
      );
      if (userId) {
        const priceId = subscription.items.data[0]?.price?.id ?? null;
        const newPlan = getPlanFromPriceId(priceId);
        const previousAttributes = (event as Stripe.Event & {
          data: { previous_attributes?: { items?: { data?: Array<{ price?: { id?: string | null } }> } } };
        }).data.previous_attributes;
        const previousPriceId =
          previousAttributes?.items?.data?.[0]?.price?.id ?? null;
        const previousPlan = getPlanFromPriceId(previousPriceId);
        const user = (await ctx.runQuery(internal.users.getById, {
          userId,
        })) as Doc<"users"> | null;
        const currentPlan = (user?.plan ?? "none") as Plan;
        const effectivePreviousPlan = previousPlan ?? currentPlan;

        const currentPeriodStart = subscription.current_period_start
          ? subscription.current_period_start * 1000
          : undefined;
        const currentPeriodEnd = subscription.current_period_end
          ? subscription.current_period_end * 1000
          : undefined;
        const billingAnchor = subscription.billing_cycle_anchor
          ? subscription.billing_cycle_anchor * 1000
          : undefined;
        const nextRenewalAt = currentPeriodEnd;

        if (newPlan && getPlanRank(newPlan) > getPlanRank(effectivePreviousPlan)) {
          await ctx.runMutation(internal.credits.applyPlanUpgradeFromStripe, {
            userId,
            newPlan,
            stripeEventId: event.id,
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscription.id,
            stripeSubscriptionStatus: subscription.status ?? undefined,
            stripePriceId: priceId ?? undefined,
            stripeCurrentPeriodEnd: currentPeriodEnd,
            currentPeriodStart,
            currentPeriodEnd,
            billingAnchor: Date.now(),
            nextRenewalAt,
          });
        } else if (
          newPlan &&
          getPlanRank(newPlan) < getPlanRank(effectivePreviousPlan)
        ) {
          await ctx.runMutation(internal.credits.setPendingDowngradePlan, {
            userId,
            pendingPlan: newPlan,
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscription.id,
            stripeSubscriptionStatus: subscription.status ?? undefined,
            stripePriceId: priceId ?? undefined,
            stripeCurrentPeriodEnd: currentPeriodEnd,
            currentPeriodStart,
            currentPeriodEnd,
            billingAnchor,
            nextRenewalAt,
          });
        } else {
          await ctx.runMutation(internal.credits.updateSubscriptionStatus, {
            userId,
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscription.id,
            stripeSubscriptionStatus: subscription.status ?? undefined,
            stripePriceId: priceId ?? undefined,
            stripeCurrentPeriodEnd: currentPeriodEnd,
            currentPeriodStart,
            currentPeriodEnd,
            billingAnchor,
            nextRenewalAt,
          });
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as SubscriptionWithPeriods;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : null;
      const userId = await resolveUserId(
        ctx,
        subscription.metadata?.userId ?? null,
        customerId,
      );
      if (userId) {
        await ctx.runMutation(internal.credits.updateSubscriptionStatus, {
          userId,
          plan: "none",
          pendingDowngradePlan: null,
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: subscription.status ?? "canceled",
          stripePriceId: undefined,
          stripeCurrentPeriodEnd: undefined,
          currentPeriodStart: undefined,
          currentPeriodEnd: undefined,
          billingAnchor: undefined,
          nextRenewalAt: undefined,
        });
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as InvoiceWithExtras;
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : null;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : null;
      const priceId = invoice.lines?.data?.[0]?.price?.id ?? null;
      const plan = getPlanFromPriceId(priceId);
      const userId = await resolveUserId(
        ctx,
        invoice.metadata?.userId ??
          invoice.subscription_details?.metadata?.userId ??
          null,
        customerId,
      );

      if (userId && plan && subscriptionId) {
        const currentPeriodStart = invoice.period_start
          ? invoice.period_start * 1000
          : undefined;
        const currentPeriodEnd = invoice.period_end
          ? invoice.period_end * 1000
          : undefined;
        const billingAnchor = currentPeriodStart;
        const nextRenewalAt = currentPeriodEnd;
        const periodKey =
          typeof invoice.period_end === "number"
            ? String(invoice.period_end)
            : undefined;

        if (invoice.billing_reason === "subscription_update") {
          await ctx.runMutation(internal.credits.updateSubscriptionStatus, {
            userId,
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscriptionId,
            stripeSubscriptionStatus: invoice.status ?? undefined,
            stripePriceId: priceId ?? undefined,
            stripeCurrentPeriodEnd: currentPeriodEnd,
            currentPeriodStart,
            currentPeriodEnd,
            billingAnchor,
            nextRenewalAt,
          });
        } else if (invoice.billing_reason === "subscription_create") {
          await ctx.runMutation(internal.credits.applyPlanStartFromStripe, {
            userId,
            plan,
            stripeEventId: event.id,
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscriptionId,
            stripeSubscriptionStatus: invoice.status ?? undefined,
            stripePriceId: priceId ?? undefined,
            stripeCurrentPeriodEnd: currentPeriodEnd,
            currentPeriodStart,
            currentPeriodEnd,
            billingAnchor,
            nextRenewalAt,
          });
        } else {
          await ctx.runMutation(internal.credits.applyPlanRenewalFromStripe, {
            userId,
            plan,
            stripeEventId: event.id,
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscriptionId,
            stripeSubscriptionStatus: invoice.status ?? undefined,
            stripePriceId: priceId ?? undefined,
            stripeCurrentPeriodEnd: currentPeriodEnd,
            currentPeriodStart,
            currentPeriodEnd,
            billingAnchor,
            nextRenewalAt,
            periodKey,
          });
        }
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as InvoiceWithExtras;
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : null;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : null;
      const userId = await resolveUserId(
        ctx,
        invoice.metadata?.userId ?? null,
        customerId,
      );
      if (userId) {
        await ctx.runMutation(internal.credits.updateSubscriptionStatus, {
          userId,
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId: subscriptionId ?? undefined,
          stripeSubscriptionStatus: invoice.status ?? "past_due",
          stripeCurrentPeriodEnd: undefined,
        });
      }
    }
  },
});
