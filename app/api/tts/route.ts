import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/src/lib/openai";
import { getEntitlements, toClientEntitlements } from "@/src/lib/entitlements";

type TtsRequestBody = {
  text: string;
  voice?: "nova" | "echo";
};

const MAX_TTS_CHARS = 3000;

export async function POST(req: Request) {
  const entitlements = getEntitlements(req);
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
      format: "mp3",
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
