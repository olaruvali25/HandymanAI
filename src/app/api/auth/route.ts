import { fetchAction } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

type AuthActionBody = {
  action: "auth:signIn" | "auth:signOut";
  args?: Record<string, unknown>;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

function json(body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isLocalHost(host: string | null) {
  return /(localhost|127\.0\.0\.1):\d+/.test(host ?? "");
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

function isCorsRequest(request: Request) {
  const origin = request.headers.get("Origin");
  const originUrl = origin ? new URL(origin) : null;
  return (
    originUrl !== null &&
    (originUrl.host !== request.headers.get("Host") ||
      originUrl.protocol !== new URL(request.url).protocol)
  );
}

const decodeJwtPayload = (rawToken: string) => {
  const parts = rawToken.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const jsonPayload = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(jsonPayload) as { iss?: string; aud?: string | string[] };
  } catch {
    return null;
  }
};

export async function POST(request: Request) {
  if (isCorsRequest(request)) {
    return json({ error: "Invalid origin." }, 403);
  }

  let body: AuthActionBody;
  try {
    body = (await request.json()) as AuthActionBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  if (!body || (body.action !== "auth:signIn" && body.action !== "auth:signOut")) {
    return json({ error: "Invalid action." }, 400);
  }

  const host = request.headers.get("host");
  const cookieJar = await cookies();
  const names = getCookieNames(host);
  const args = body.args ? { ...body.args } : {};

  let token = cookieJar.get(names.token)?.value;
  if (body.action === "auth:signIn" && "refreshToken" in args) {
    const refreshToken = cookieJar.get(names.refreshToken)?.value ?? null;
    if (!refreshToken) {
      return json({ tokens: null });
    }
    (args as Record<string, unknown>).refreshToken = refreshToken;
    token = undefined;
  }
  if (
    body.action === "auth:signIn" &&
    typeof (args as { params?: { code?: unknown } }).params?.code === "string"
  ) {
    token = undefined;
  }

  try {
    if (body.action === "auth:signIn") {
      const result = await fetchAction(
        api.auth.signIn,
        args,
        token ? { token } : {},
      );

      if (result?.redirect) {
        const response = json({ redirect: result.redirect });
        setCookie(response, names.verifier, result.verifier ?? null, host);
        return response;
      }

      if (result?.tokens !== undefined) {
        const response = json({
          tokens:
            result.tokens !== null
              ? { token: result.tokens.token, refreshToken: "dummy" }
              : null,
        });
        if (result.tokens === null) {
          setCookie(response, names.token, null, host);
          setCookie(response, names.refreshToken, null, host);
        } else {
          setCookie(response, names.token, result.tokens.token, host);
          setCookie(response, names.refreshToken, result.tokens.refreshToken, host);
        }
        setCookie(response, names.verifier, null, host);
        return response;
      }

      return json(result ?? {});
    }

    await fetchAction(api.auth.signOut, {}, token ? { token } : {});
    const response = json(null);
    setCookie(response, names.token, null, host);
    setCookie(response, names.refreshToken, null, host);
    setCookie(response, names.verifier, null, host);
    return response;
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && token) {
      const payload = decodeJwtPayload(token);
      if (payload) {
        console.warn("[auth] token issuer/audience", {
          iss: payload.iss,
          aud: payload.aud,
        });
      }
    }
    const message = error instanceof Error ? error.message : "Auth failed.";
    return json({ error: message }, 400);
  }
}
