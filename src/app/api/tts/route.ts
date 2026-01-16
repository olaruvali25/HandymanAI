import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getOpenAIClient } from "@/lib/openai";
import {
  getConvexAuthToken,
  getEntitlements,
  normalizeStoredPlan,
  resolveEntitlements,
  toClientEntitlements,
  type StoredPlan,
} from "@/lib/entitlements";
import type { FunctionReference } from "convex/server";

type TtsRequestBody = {
  text: string;
  voice?: "nova" | "echo";
};

const MAX_TTS_CHARS = 3000;

const getPlanOverride = async (req: Request) => {
  const token = getConvexAuthToken(req.headers.get("cookie"));
  if (!token) return null;
  try {
    const user = await fetchQuery(api.users.me, {}, { token });
    const plan =
      (user as { plan?: StoredPlan | null } | null)?.plan ?? null;
    return normalizeStoredPlan(plan);
  } catch {
    return null;
  }
};

type MessageCountQuery = FunctionReference<
  "query",
  "public",
  { sessionId?: string },
  number
>;

const entitlementsApi = api as unknown as {
  entitlements: {
    getMessageCount: MessageCountQuery;
  };
};

const CONVEX_TIMEOUT_MS = 5000;

const withTimeout = async <T>(
  promise: Promise<T>,
  ms = CONVEX_TIMEOUT_MS,
) => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Convex timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export async function POST(req: Request) {
  const planOverride = await getPlanOverride(req);
  const entitlements = getEntitlements(req, {
    planOverride: planOverride ?? undefined,
  });
  const token = getConvexAuthToken(req.headers.get("cookie"));
  try {
    const messageCount = await withTimeout(
      fetchQuery(
        entitlementsApi.entitlements.getMessageCount,
        { sessionId: entitlements.sessionId ?? undefined },
        token ? { token } : {},
      ),
    );
    const resolved = resolveEntitlements({
      isAnonymous: !entitlements.userHasAccount,
      plan: entitlements.userPlan,
      messageCount,
    });
    entitlements.userPlan = resolved.userPlan;
    entitlements.capabilities = resolved.capabilities;
    entitlements.remainingReplies = resolved.remainingMessages;
    entitlements.remainingSource = "server";
  } catch (error) {
    console.error("[tts] entitlements error:", error);
    return NextResponse.json(
      { error: "Unable to reach usage service. Please try again." },
      { status: 503 },
    );
  }

  if (!entitlements.capabilities.voice) {
    return NextResponse.json(
      {
        error: "Voice is not available on this plan.",
        entitlements: toClientEntitlements(entitlements),
      },
      { status: 403 },
    );
  }

  let body: TtsRequestBody | null = null;

  try {
    body = (await req.json()) as TtsRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body || typeof body.text !== "string") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const text = body.text.trim();
  if (text.length === 0 || text.length > MAX_TTS_CHARS) {
    return NextResponse.json({ error: "Invalid text length." }, { status: 400 });
  }

  const voice = body.voice === "echo" ? "echo" : "nova";

  try {
    const openai = getOpenAIClient();
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: text,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("OpenAI TTS error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech." },
      { status: 500 },
    );
  }
}
