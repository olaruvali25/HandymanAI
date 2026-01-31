import type { NextRequest } from "next/server";

const getTargetUrl = (request: NextRequest, provider: string) => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;

  const url = convexUrl.replace(".cloud", ".site");
  const deployment = new URL(url);
  const original = new URL(request.url);

  const target = new URL(`/api/auth/callback/${provider}`, deployment);
  target.search = original.search;
  return target;
};

const proxyAuthRequest = async (request: NextRequest, provider: string) => {
  const target = getTargetUrl(request, provider);
  if (!target) {
    return new Response(
      "Missing NEXT_PUBLIC_CONVEX_URL. Run `npm run dev:convex` and set it in .env.local.",
      { status: 500 },
    );
  }

  const init: RequestInit = {
    method: request.method,
    headers: request.headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    (init as RequestInit & { duplex: "half" }).duplex = "half";
  }

  return fetch(target, init);
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  return proxyAuthRequest(request, provider);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  return proxyAuthRequest(request, provider);
}
