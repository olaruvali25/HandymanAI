import { fetchAction } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";

const CANONICAL_HOST = "fixlyapp.dev";
const JSON_HEADERS = { "Content-Type": "application/json" };

const isLocalHost = (host: string | null) =>
  /(localhost|127\.0\.0\.1)/i.test(host ?? "");

const isVercelHost = (host: string | null) =>
  !!host && /\.vercel\.app$/i.test(host);

const getCookieNames = (host: string | null) => {
  const prefix = isLocalHost(host) ? "" : "__Host-";
  return {
    token: `${prefix}__convexAuthJWT`,
    refreshToken: `${prefix}__convexAuthRefreshToken`,
    verifier: `${prefix}__convexAuthOAuthVerifier`,
  };
};

const cookieOptions = (host: string | null) => ({
  secure: isLocalHost(host) ? false : true,
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
});

const setCookie = (
  response: NextResponse,
  name: string,
  value: string | null,
  host: string | null,
) => {
  if (value === null) {
    response.cookies.set(name, "", {
      ...cookieOptions(host),
      maxAge: undefined,
      expires: 0,
    });
    return;
  }
  response.cookies.set(name, value, cookieOptions(host));
};

const normalizeRedirect = (redirect: string, request: Request) => {
  if (process.env.NODE_ENV !== "production") return redirect;
  try {
    const forwardedHost =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto =
      request.headers.get("x-forwarded-proto") ??
      request.headers.get("protocol") ??
      "https";
    const canonical = new URL(
      `${proto === "http" ? "https" : proto}://${
        !forwardedHost ||
        isLocalHost(forwardedHost) ||
        isVercelHost(forwardedHost)
          ? CANONICAL_HOST
          : forwardedHost
      }`,
    );

    const url = new URL(redirect);
    if (isLocalHost(url.hostname) || isVercelHost(url.hostname)) {
      url.protocol = canonical.protocol;
      url.hostname = canonical.hostname;
      url.port = "";
    }

    const redirectUri = url.searchParams.get("redirect_uri");
    if (redirectUri) {
      const nested = new URL(redirectUri);
      if (isLocalHost(nested.hostname) || isVercelHost(nested.hostname)) {
        nested.protocol = canonical.protocol;
        nested.hostname = canonical.hostname;
        nested.port = "";
        url.searchParams.set("redirect_uri", nested.toString());
      }
    }

    return url.toString();
  } catch {
    return redirect;
  }
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const params = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const redirectTo =
    searchParams.get("redirectTo") &&
    searchParams.get("redirectTo")?.startsWith("/")
      ? searchParams.get("redirectTo")!
      : "/";
  const code = searchParams.get("code");

  const host = request.headers.get("host");
  const names = getCookieNames(host);

  try {
    const args: Record<string, unknown> = {
      provider: params.provider,
    };
    if (redirectTo) {
      args.redirectTo = redirectTo;
    }
    if (code) {
      args.params = { code };
    }

    const result = await fetchAction(api.auth.signIn, args);

    if (result?.redirect) {
      const location = normalizeRedirect(result.redirect, request);
      const response = NextResponse.redirect(location, {
        status: 302,
        headers: { ...JSON_HEADERS },
      });
      setCookie(response, names.verifier, result.verifier ?? null, host);
      return response;
    }

    if (result?.tokens !== undefined) {
      const response = NextResponse.redirect(redirectTo, {
        status: 302,
        headers: { ...JSON_HEADERS },
      });
      if (result.tokens === null) {
        setCookie(response, names.token, null, host);
        setCookie(response, names.refreshToken, null, host);
      } else {
        setCookie(response, names.token, result.tokens.token, host);
        setCookie(
          response,
          names.refreshToken,
          result.tokens.refreshToken,
          host,
        );
      }
      setCookie(response, names.verifier, null, host);
      return response;
    }

    return NextResponse.redirect(redirectTo, { status: 302 });
  } catch (error) {
    console.error("[auth] oauth start failed", error);
    return NextResponse.redirect(redirectTo, { status: 302 });
  }
}
