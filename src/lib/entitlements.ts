import { randomUUID } from "crypto";

export type UserPlan =
  | "none"
  | "free"
  | "small_fix"
  | "medium_fix"
  | "big_fix"
  | "pro";

export type Capabilities = {
  voice: boolean;
  photos: boolean;
  linksVisuals: boolean;
};

export type GatingFlags = {
  must_prompt_signup_after_this: boolean;
  must_prompt_payment_after_this: boolean;
};

export type ClientEntitlements = {
  userHasAccount: boolean;
  userPlan: UserPlan;
  remainingReplies: number | null;
  remainingSource?: "memory" | "cookie" | "init" | "unlimited";
  capabilities: Capabilities;
  gating: GatingFlags;
};

export type ServerEntitlements = ClientEntitlements & {
  threadId: string;
  cookies: Record<string, string>;
  remainingKey: string;
};

export const THREAD_COOKIE = "fixly_thread";
export const REMAINING_COOKIE = "fixly_remaining";
export const SESSION_COOKIE = "fixly_session";
export const PLAN_COOKIE = "fixly_plan";

const remainingStore = new Map<string, number>();

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
    return { voice: true, photos: true, linksVisuals: true };
  }
  if (userPlan === "big_fix") {
    return { voice: true, photos: true, linksVisuals: true };
  }
  if (userPlan === "medium_fix") {
    return { voice: true, photos: true, linksVisuals: false };
  }
  if (userPlan === "small_fix") {
    return { voice: false, photos: true, linksVisuals: false };
  }
  if (userPlan === "free") {
    return { voice: false, photos: false, linksVisuals: false };
  }
  return { voice: false, photos: false, linksVisuals: false };
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

const getPlanFromCookie = (planCookie?: string): UserPlan => {
  if (!planCookie) return "free";
  if (planCookie === "paid") return "pro";
  if (planCookie === "pro") return "pro";
  if (planCookie === "big_fix") return "big_fix";
  if (planCookie === "medium_fix") return "medium_fix";
  if (planCookie === "small_fix") return "small_fix";
  if (planCookie === "free") return "free";
  return "free";
};

const getRemainingKey = (cookies: Record<string, string>, threadId: string) => {
  const session = cookies[SESSION_COOKIE];
  if (session) return `session:${session}`;
  return `thread:${threadId}`;
};

export const setRemainingForKey = (key: string, remaining: number) => {
  remainingStore.set(key, remaining);
};

export const getEntitlements = (req: Request): ServerEntitlements => {
  const cookies = parseCookies(req.headers.get("cookie"));
  const hasSession = Boolean(cookies[SESSION_COOKIE]);
  const userPlan: UserPlan = hasSession
    ? getPlanFromCookie(cookies[PLAN_COOKIE])
    : "none";
  const userHasAccount = hasSession;
  const maxReplies = getMaxRepliesForPlan(userPlan);
  const threadId = cookies[THREAD_COOKIE] || randomUUID();
  const remainingKey = getRemainingKey(cookies, threadId);
  const storedRemaining = remainingStore.get(remainingKey);
  const cookieRemaining = Number.parseInt(cookies[REMAINING_COOKIE] ?? "", 10);

  let remainingReplies: number | null = null;
  let remainingSource: ClientEntitlements["remainingSource"] = "unlimited";
  const isNewAnonSession = !hasSession && !cookies[THREAD_COOKIE];

  if (maxReplies === null) {
    remainingReplies = null;
    remainingSource = "unlimited";
  } else if (isNewAnonSession) {
    remainingReplies = maxReplies;
    remainingSource = "init";
  } else if (Number.isFinite(storedRemaining)) {
    remainingReplies = storedRemaining as number;
    remainingSource = "memory";
  } else if (Number.isFinite(cookieRemaining)) {
    remainingReplies = cookieRemaining;
    remainingSource = "cookie";
  } else {
    remainingReplies = maxReplies;
    remainingSource = "init";
  }

  if (remainingReplies !== null) {
    remainingStore.set(remainingKey, remainingReplies);
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
