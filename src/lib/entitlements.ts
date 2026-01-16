import { randomUUID } from "crypto";

export type UserPlan =
  | "none"
  | "free"
  | "small_fix"
  | "medium_fix"
  | "big_fix"
  | "pro";

export type StoredPlan = "none" | "small" | "medium" | "big" | "pro";

export type Capabilities = {
  voice: boolean;
  photos: boolean;
  linksVisuals: boolean;
  history: boolean;
  favorites: boolean;
  premiumVisuals: "none" | "limited" | "full";
  photoLimit: number | null;
};

export type GatingFlags = {
  must_prompt_signup_after_this: boolean;
  must_prompt_payment_after_this: boolean;
};

export type ClientEntitlements = {
  userHasAccount: boolean;
  userPlan: UserPlan;
  remainingReplies: number | null;
  remainingSource?: "memory" | "cookie" | "init" | "unlimited" | "server";
  capabilities: Capabilities;
  gating: GatingFlags;
};

export type ServerEntitlements = ClientEntitlements & {
  threadId: string;
  sessionId: string | null;
  cookies: Record<string, string>;
  remainingKey: string;
};

export const THREAD_COOKIE = "fixly_thread";
export const REMAINING_COOKIE = "fixly_remaining";
export const PHOTO_COOKIE = "fixly_photos";
export const SESSION_COOKIE = "fixly_session";
export const PLAN_COOKIE = "fixly_plan";
const CONVEX_AUTH_COOKIE = "__convexAuthJWT";
const CONVEX_AUTH_HOST_COOKIE = "__Host-__convexAuthJWT";
const CONVEX_REFRESH_COOKIE = "__convexAuthRefreshToken";
const CONVEX_REFRESH_HOST_COOKIE = "__Host-__convexAuthRefreshToken";

export const parseCookies = (cookieHeader: string | null) => {
  if (!cookieHeader) return {} as Record<string, string>;
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return acc;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (key) acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
};

export const getCapabilitiesForPlan = (userPlan: UserPlan): Capabilities => {
  if (userPlan === "pro") {
    return {
      voice: true,
      photos: true,
      linksVisuals: true,
      history: true,
      favorites: true,
      premiumVisuals: "full",
      photoLimit: null,
    };
  }
  if (userPlan === "big_fix") {
    return {
      voice: true,
      photos: true,
      linksVisuals: true,
      history: false,
      favorites: true,
      premiumVisuals: "limited",
      photoLimit: null,
    };
  }
  if (userPlan === "medium_fix") {
    return {
      voice: true,
      photos: true,
      linksVisuals: false,
      history: false,
      favorites: false,
      premiumVisuals: "none",
      photoLimit: null,
    };
  }
  if (userPlan === "small_fix") {
    return {
      voice: false,
      photos: true,
      linksVisuals: false,
      history: false,
      favorites: false,
      premiumVisuals: "none",
      photoLimit: 12,
    };
  }
  if (userPlan === "free") {
    return {
      voice: false,
      photos: true,
      linksVisuals: false,
      history: false,
      favorites: false,
      premiumVisuals: "none",
      photoLimit: 3,
    };
  }
  return {
    voice: false,
    photos: true,
    linksVisuals: false,
    history: false,
    favorites: false,
    premiumVisuals: "none",
    photoLimit: 3,
  };
};

export const getMaxRepliesForPlan = (userPlan: UserPlan) => {
  if (userPlan === "none") return 3;
  if (userPlan === "free") return 5;
  return null;
};

export const buildCookieHeader = (name: string, value: string) => {
  const maxAge = 60 * 60 * 24;
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

export const buildCounterCookieValue = (
  count: number,
  scope: "daily" | "thread",
  threadId?: string,
  mode?: string,
) =>
  scope === "daily"
    ? `day:${getTodayKey()}:${count}${mode ? `:${mode}` : ""}`
    : `thread:${threadId ?? "unknown"}:${count}${mode ? `:${mode}` : ""}`;

export const buildRemainingCookieValue = (
  remaining: number,
  scope: "daily" | "thread",
  threadId?: string,
  mode?: string,
) => buildCounterCookieValue(remaining, scope, threadId, mode);

export const parseCounterCookieValue = (
  raw: string | undefined,
  scope: "daily" | "thread",
  threadId: string | null,
  mode?: string,
) => {
  if (!raw) return Number.NaN;
  const parts = raw.split(":");
  if (scope === "daily") {
    const [prefix, date, value] =
      parts.length >= 3 ? parts : ["day", parts[0], parts[1]];
    if (prefix !== "day") return Number.NaN;
    if (date !== getTodayKey()) return Number.NaN;
    if (mode && parts.length >= 4 && parts[3] !== mode) return Number.NaN;
    if (mode && parts.length < 4) return Number.NaN;
    return Number.parseInt(value ?? "", 10);
  }
  const [prefix, id, value] =
    parts.length >= 3 ? parts : ["thread", parts[0], parts[1]];
  if (prefix !== "thread") return Number.NaN;
  if (!threadId || id !== threadId) return Number.NaN;
  if (mode && parts.length >= 4 && parts[3] !== mode) return Number.NaN;
  if (mode && parts.length < 4) return Number.NaN;
  return Number.parseInt(value ?? "", 10);
};

const normalizePlanValue = (plan?: string | null): UserPlan => {
  if (plan === "paid" || plan === "pro") return "pro";
  if (plan === "big" || plan === "big_fix") return "big_fix";
  if (plan === "medium" || plan === "medium_fix") return "medium_fix";
  if (plan === "small" || plan === "small_fix") return "small_fix";
  if (plan === "none") return "none";
  if (plan === "free") return "free";
  return "free";
};

export const normalizeStoredPlan = (
  plan?: StoredPlan | null,
): UserPlan => {
  if (!plan) return "none";
  return normalizePlanValue(plan);
};

const getPlanFromCookie = (planCookie?: string): UserPlan => {
  if (!planCookie) return "free";
  return normalizePlanValue(planCookie);
};

export const getConvexAuthToken = (cookieHeader: string | null) => {
  const cookies = parseCookies(cookieHeader);
  return (
    cookies[CONVEX_AUTH_COOKIE] ??
    cookies[CONVEX_AUTH_HOST_COOKIE] ??
    null
  );
};

const getRemainingKey = (threadId: string) => `thread:${threadId}`;

export const getEntitlements = (
  req: Request,
  options?: { planOverride?: UserPlan },
): ServerEntitlements => {
  const cookies = parseCookies(req.headers.get("cookie"));
  const hasConvexAuth =
    Boolean(cookies[CONVEX_AUTH_COOKIE]) ||
    Boolean(cookies[CONVEX_AUTH_HOST_COOKIE]) ||
    Boolean(cookies[CONVEX_REFRESH_COOKIE]) ||
    Boolean(cookies[CONVEX_REFRESH_HOST_COOKIE]);
  const userHasAccount = hasConvexAuth;
  const userPlan: UserPlan = userHasAccount
    ? options?.planOverride ?? getPlanFromCookie(cookies[PLAN_COOKIE])
    : "none";
  const maxReplies = getMaxRepliesForPlan(userPlan);
  const threadId = cookies[THREAD_COOKIE] || randomUUID();
  const sessionId = cookies[SESSION_COOKIE] || null;
  const remainingKey = getRemainingKey(threadId);
  const remainingScope = "thread";
  const remainingMode = userHasAccount ? "account" : "anon";
  const cookieRemaining = parseCounterCookieValue(
    cookies[REMAINING_COOKIE],
    remainingScope,
    threadId,
    remainingMode,
  );
  if (!Number.isFinite(cookieRemaining)) {
    delete cookies[REMAINING_COOKIE];
  }

  let remainingReplies: number | null = null;
  let remainingSource: ClientEntitlements["remainingSource"] = "unlimited";
  const isNewSession = !cookies[THREAD_COOKIE];

  if (maxReplies === null) {
    remainingReplies = null;
    remainingSource = "unlimited";
  } else if (isNewSession) {
    remainingReplies = maxReplies;
    remainingSource = "init";
  } else if (Number.isFinite(cookieRemaining)) {
    remainingReplies = cookieRemaining;
    remainingSource = "cookie";
  } else {
    remainingReplies = maxReplies;
    remainingSource = "init";
  }

  const capabilities = getCapabilitiesForPlan(userPlan);

  return {
    userHasAccount,
    userPlan,
    remainingReplies,
    remainingSource,
    capabilities,
    gating: {
      must_prompt_signup_after_this: false,
      must_prompt_payment_after_this: false,
    },
    threadId,
    sessionId,
    cookies,
    remainingKey,
  };
};

export const toClientEntitlements = (
  entitlements: ServerEntitlements,
): ClientEntitlements => ({
  userHasAccount: entitlements.userHasAccount,
  userPlan: entitlements.userPlan,
  remainingReplies: entitlements.remainingReplies,
  remainingSource: entitlements.remainingSource,
  capabilities: entitlements.capabilities,
  gating: entitlements.gating,
});

export const resolveEntitlements = (input: {
  isAnonymous: boolean;
  plan: UserPlan;
  messageCount: number;
  photoCount?: number | null;
}): {
  canChat: boolean;
  remainingMessages: number | null;
  canTTS: boolean;
  canImages: boolean;
  imagesRemaining: number | null;
  canFavorites: boolean;
  canHistory: boolean;
  canPremiumVisuals: boolean;
  capabilities: Capabilities;
  userPlan: UserPlan;
} => {
  const effectivePlan =
    input.isAnonymous ? "none" : input.plan === "none" ? "free" : input.plan;
  const maxMessages =
    effectivePlan === "none"
      ? 3
      : effectivePlan === "free"
        ? 5
        : null;
  const remainingMessages =
    maxMessages === null ? null : Math.max(maxMessages - input.messageCount, 0);
  const canChat = maxMessages === null ? true : input.messageCount <= maxMessages;
  const capabilities = getCapabilitiesForPlan(effectivePlan);
  const imagesRemaining =
    capabilities.photoLimit === null || input.photoCount == null
      ? null
      : Math.max(capabilities.photoLimit - input.photoCount, 0);

  return {
    canChat,
    remainingMessages,
    canTTS: capabilities.voice,
    canImages: capabilities.photos,
    imagesRemaining,
    canFavorites: capabilities.favorites,
    canHistory: capabilities.history,
    canPremiumVisuals: capabilities.premiumVisuals !== "none",
    capabilities,
    userPlan: effectivePlan,
  };
};
