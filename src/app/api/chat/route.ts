import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { getOpenAIClient } from "@/lib/openai";
import { env } from "@/env";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  messages: IncomingMessage[];
  locale?: string;
};

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOTAL_CHARS = 12000;

const createSanitizer = () => {
  let atLineStart = true;
  let pendingAsterisk = false;
  let newlineCount = 0;

  const sanitizeChunk = (chunk: string) => {
    let input = chunk;
    if (pendingAsterisk) {
      input = `*${input}`;
      pendingAsterisk = false;
    }

    let output = "";

    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      const next = input[i + 1];

      if (char === "\r") {
        continue;
      }

      if (char === "\n") {
        newlineCount += 1;
        if (newlineCount > 2) {
          continue;
        }
        atLineStart = true;
        output += char;
        continue;
      }

      newlineCount = 0;

      if (atLineStart) {
        if (char === "#") {
          let j = i;
          while (input[j] === "#") j += 1;
          while (input[j] === " " || input[j] === "\t") j += 1;
          i = j - 1;
          continue;
        }

        if ((char === "-" || char === "*" || char === "•") && next === " ") {
          i += 1;
          continue;
        }
      }

      atLineStart = false;

      if (char === "*" && next === "*") {
        i += 1;
        continue;
      }

      if (char === "`") {
        continue;
      }

      if (char === "*" && i === input.length - 1) {
        pendingAsterisk = true;
        continue;
      }

      if (char === "*") {
        continue;
      }

      output += char;
    }

    return output;
  };

  return { sanitizeChunk };
};

const validatePayload = (body: ChatRequestBody) => {
  if (!body || !Array.isArray(body.messages)) {
    return "Invalid payload.";
  }

  if (body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return "Invalid message count.";
  }

  let totalChars = 0;

  for (const message of body.messages) {
    if (message.role !== "user" && message.role !== "assistant") {
      return "Invalid message role.";
    }

    if (typeof message.content !== "string") {
      return "Invalid message content.";
    }

    const trimmed = message.content.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) {
      return "Invalid message length.";
    }

    totalChars += trimmed.length;
    if (totalChars > MAX_TOTAL_CHARS) {
      return "Message payload too large.";
    }
  }

  return null;
};

export async function POST(req: Request) {
  if (!env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY." },
      { status: 500 },
    );
  }

  let body: ChatRequestBody | null = null;

  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const validationError = body ? validatePayload(body) : "Invalid payload.";
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const promptPath = path.join(
    process.cwd(),
    "src",
    "ai",
    "prompts",
    "primary.txt",
  );
  const systemPrompt = await readFile(promptPath, "utf8");
  const verifierPath = path.join(
    process.cwd(),
    "src",
    "ai",
    "prompts",
    "verifier.txt",
  );
  const verifierPrompt = await readFile(verifierPath, "utf8");

  const model = env.OPENAI_MODEL ?? "gpt-5.2";

  const encoder = new TextEncoder();
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: object) => {
        controller.enqueue(
          encoder.encode(
            `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`,
          ),
        );
      };

      try {
        const openai = getOpenAIClient();
        const draftResponse = await openai.responses.create({
          model,
          input: [
            {
              role: "system",
              content: systemPrompt.trim(),
            },
            ...body!.messages,
          ],
        });

        const draft = draftResponse.output_text?.trim() || "";

        const verifierInput = [
          "USER_MESSAGES:",
          ...body!.messages.map(
            (message) => `${message.role.toUpperCase()}: ${message.content}`,
          ),
          "USER_PLAN: credits",
          `USER_LOCALE: ${body!.locale ?? "unknown"}`,
          "DRAFT_RESPONSE:",
          draft,
        ].join("\n");

        const verifierStream = await openai.responses.create({
          model,
          stream: true,
          input: [
            {
              role: "system",
              content: verifierPrompt.trim(),
            },
            {
              role: "user",
              content: verifierInput,
            },
          ],
        });

        const sanitizer = createSanitizer();

        for await (const event of verifierStream) {
          if (event.type === "response.output_text.delta") {
            const textDelta = sanitizer.sanitizeChunk(event.delta ?? "");
            if (textDelta) {
              sendEvent("delta", { text: textDelta });
            }
          }

          if (
            event.type === "response.completed" ||
            event.type === "response.output_text.done"
          ) {
            sendEvent("done", {});
            controller.close();
            return;
          }
        }

        sendEvent("done", {});
        controller.close();
      } catch (error) {
        console.error("OpenAI error:", error);
        sendEvent("error", { message: "Failed to generate response." });
        controller.close();
      }
    },
  });

  return new Response(stream, { headers });
}
