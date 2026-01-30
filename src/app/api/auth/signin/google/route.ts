import { fetchAction } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "@convex/_generated/api";

const CANONICAL_HOST = "fixlyapp.dev";

const JSON_HEADERS = { "Content-Type": "application/json" };

function isLocalHost(host: string | null) {
  return /(localhost|127\.0\.0\.1):?\d*$/.test(host ?? "");
}

function getCookieNames(host: string | null) {
  const prefix = isLocalHost(host) ? "" : "__Host-";
  return {
    token: `${prefix}__convexAuthJWT`,
    refreshToken: `${prefix}__convexAuthRefreshToken`,
    verifier: `${prefix}__convexAuthOAuthVerifier`,
  };
}

function cookieOptions(host: string | null) {
  return {
    secure: isLocalHost(host) ? false : true,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
  };
}

function setCookie(
  response: NextResponse,
  name: string,
  value: string | null,
  host: string | null,
) {
  if (value === null) {
    response.cookies.set(name, "", {
      ...cookieOptions(host),
      maxAge: undefined,
      expires: 0,
    });
    return;
  }
  response.cookies.set(name, value, cookieOptions(host));
}

const isBadHost = (host: string | null) =>
  !host ||
  /(localhost|127\.0\.0\.1)/i.test(host) ||
  /\.vercel\.app$/i.test(host) ||
  host !== CANONICAL_HOST;

function normalizeRedirect(redirect: string) {
  if (process.env.NODE_ENV !== "production") return redirect;
  try {
    const url = new URL(redirect);
    const targetHost = isBadHost(url.hostname) ? CANONICAL_HOST : url.hostname;
    url.protocol = "https:";
    url.hostname = targetHost;
    url.port = "";
    const redirectUri = url.searchParams.get("redirect_uri");
    if (redirectUri) {
      const nested = new URL(redirectUri);
      if (isBadHost(nested.hostname)) {
        nested.protocol = "https:";
        nested.hostname = CANONICAL_HOST;
        nested.port = "";
        url.searchParams.set("redirect_uri", nested.toString());
      }
    }
    return url.toString();
  } catch {
    return redirect;
  }
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const redirectTo =
    searchParams.get("redirectTo") &&
    searchParams.get("redirectTo")?.startsWith("/")
      ? searchParams.get("redirectTo")!
      : "/";

  const host = request.headers.get("host");
  const names = getCookieNames(host);

  try {
    const result = await fetchAction(api.auth.signIn, {
      provider: "google",
      redirectTo,
    } as unknown as Record<string, unknown>);

    if (result?.redirect) {
      const location = normalizeRedirect(result.redirect);
      const response = NextResponse.redirect(location, {
        status: 302,
        headers: { ...JSON_HEADERS },
      });
      setCookie(response, names.verifier, result.verifier ?? null, host);
      return response;
    }

    return NextResponse.redirect("/", { status: 302 });
  } catch (error) {
    console.error("[auth] google sign-in start failed", error);
    return NextResponse.redirect("/", { status: 302 });
  }
}
