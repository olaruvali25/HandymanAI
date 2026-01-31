import type {
  Capabilities,
  ClientEntitlements,
  GatingFlags,
} from "@/lib/schemas/entitlements";
export type { Capabilities, ClientEntitlements, GatingFlags };

export const THREAD_COOKIE = "fixly_thread";
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

export const getConvexAuthToken = (cookieHeader: string | null) => {
  const cookies = parseCookies(cookieHeader);
  return (
    cookies[CONVEX_AUTH_COOKIE] ??
    cookies[CONVEX_AUTH_HOST_COOKIE] ??
    cookies[CONVEX_REFRESH_COOKIE] ??
    cookies[CONVEX_REFRESH_HOST_COOKIE] ??
    null
  );
};

export const buildClientEntitlements = (input: {
  userHasAccount: boolean;
  credits: number;
}): ClientEntitlements => ({
  userHasAccount: input.userHasAccount,
  userPlan: "credits",
  remainingReplies: Number.isFinite(input.credits) ? input.credits : null,
  remainingSource: "server",
  credits: input.credits,
  capabilities: {
    voice: true,
    photos: true,
    linksVisuals: true,
    history: true,
    favorites: true,
    premiumVisuals: "full",
    photoLimit: null,
  },
  gating: {
    must_prompt_signup_after_this: false,
    must_prompt_payment_after_this: false,
  },
});
