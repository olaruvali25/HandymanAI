import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { getOpenAIClient } from "@/lib/openai";
import { env } from "@/env";
import {
  buildCookieHeader,
  getEntitlements,
  getMaxRepliesForPlan,
  REMAINING_COOKIE,
  THREAD_COOKIE,
  toClientEntitlements,
  setRemainingForKey,
} from "@/lib/entitlements";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

type AiRequestBody = {
  messages: IncomingMessage[];
  userCountry?: string;
  userLanguage?: string;
  threadContext?: string;
  threadId?: string;
};

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOTAL_CHARS = 12000;
const SCOPE_CACHE = new Map<string, { text: string; updatedAt: number }>();
const BLOCKED_NOTICE = new Map<string, { limit?: boolean; mismatch?: boolean }>();

const serializeMessages = (messages: IncomingMessage[]) => {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
};

const validatePayload = (body: AiRequestBody) => {
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

const getPrompt = (filename: string) => {
  return readFile(
    path.join(process.cwd(), "src", "ai", "prompts", filename),
    "utf8",
  );
};

const hasScopeCues = (text: string) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  const scopeCues = [
    "also",
    "another",
    "while i'm at it",
    "whole",
    "all",
    "kitchen",
    "room",
  ];
  const safetyCues = ["gas", "sparks", "breaker", "flood", "smell"];

  return [...scopeCues, ...safetyCues].some((cue) => lower.includes(cue));
};

const buildGatingResponse = (
  userPlan: string,
  reason: "limit" | "plan_mismatch",
  scope?: "small" | "medium" | "big" | null,
  isRepeat?: boolean,
) => {
  if (reason === "plan_mismatch" && scope) {
    const upgradeButtons = [
      {
        type: "link",
        label: "Upgrade to Medium Fix",
        href: "/pricing?highlight=medium_fix",
        variant: "secondary",
      },
      {
        type: "link",
        label: "Upgrade to Big Fix",
        href: "/pricing?highlight=big_fix",
        variant: "primary",
      },
    ];
    return {
      text: isRepeat
        ? "Still happy to help — we just need the right Fix pack to keep going.\nPick Medium or Big and I will continue."
        : scope === "medium"
          ? "This looks bigger than a Small Fix.\nI can still guide you to the finish — you will need a Medium Fix to continue."
          : "This looks bigger than your current Fix.\nI can still guide you to the finish — you will need a Medium or Big Fix to continue.",
      gating: { blocked: true, reason: "plan_mismatch" },
      actions: upgradeButtons,
    };
  }

  if (userPlan === "none") {
    return {
      text: isRepeat
        ? "I am ready when you are.\nPlease sign up or log in so I can keep guiding you."
        : "Got you — we can fix this.\nQuick thing: create an account so I can keep guiding you step-by-step.",
      gating: { blocked: true, reason: "signup" },
      actions: [
        {
          type: "link",
          label: "Sign up",
          href: "/signup",
          variant: "primary",
        },
        {
          type: "link",
          label: "Log in",
          href: "/login",
          variant: "secondary",
        },
      ],
    };
  }

  return {
    text: isRepeat
      ? "I can keep going as soon as you pick a Fix pack."
      : "We are close.\nTo keep going and finish this properly, grab a Fix pack.",
    gating: { blocked: true, reason: "payment" },
    actions: [
      {
        type: "link",
        label: "Choose a Fix",
        href: "/pricing",
        variant: "primary",
      },
    ],
  };
};

const parseScopeFromText = (scopeText: string) => {
  if (!scopeText) return null;
  try {
    const parsed = JSON.parse(scopeText) as {
      task?: { scope?: "small" | "medium" | "big" };
    };
    return parsed?.task?.scope ?? null;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getResponseOutputText = (response: unknown) => {
  if (!isRecord(response)) return "";

  const outputText =
    typeof response.output_text === "string" ? response.output_text.trim() : "";
  if (outputText) return outputText;

  const output = response.output;
  if (!Array.isArray(output)) return "";

  const message = output.find(
    (item): item is Record<string, unknown> =>
      isRecord(item) && item.type === "message",
  );
  if (!message) return "";

  const content = message.content;
  if (!Array.isArray(content)) return "";

  const part = content.find(
    (p): p is Record<string, unknown> =>
      isRecord(p) && (p.type === "output_text" || p.type === "text"),
  );

  return typeof part?.text === "string" ? part.text.trim() : "";
};

const applyGatingIfNeeded = (
  entitlements: ReturnType<typeof toClientEntitlements>,
) => {
  if (entitlements.remainingReplies === null) return entitlements;
  if (entitlements.remainingReplies > 0) return entitlements;

  if (entitlements.userPlan === "none") {
    entitlements.gating.must_prompt_signup_after_this = true;
  }

  if (entitlements.userPlan === "free") {
    entitlements.gating.must_prompt_payment_after_this = true;
  }

  entitlements.capabilities = {
    voice: false,
    photos: false,
    linksVisuals: false,
  };

  return entitlements;
};

export async function GET(req: Request) {
  const entitlements = getEntitlements(req);
  const clientEntitlements = applyGatingIfNeeded(
    toClientEntitlements(entitlements),
  );
  const res = NextResponse.json({ entitlements: clientEntitlements });

  if (!entitlements.cookies[THREAD_COOKIE] && entitlements.threadId) {
    res.headers.append(
      "Set-Cookie",
      buildCookieHeader(THREAD_COOKIE, entitlements.threadId),
    );
  }

  if (
    !entitlements.cookies[REMAINING_COOKIE] &&
    entitlements.remainingReplies !== null
  ) {
    res.headers.append(
      "Set-Cookie",
      buildCookieHeader(REMAINING_COOKIE, String(entitlements.remainingReplies)),
    );
  }

  return res;
}

export async function POST(req: Request) {
  let body: AiRequestBody | null = null;

  try {
    body = (await req.json()) as AiRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const validationError = body ? validatePayload(body) : "Invalid payload.";
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY." },
      { status: 500 },
    );
  }

  const entitlements = getEntitlements(req);
  const maxReplies = getMaxRepliesForPlan(entitlements.userPlan);
  const clientEntitlements = toClientEntitlements(entitlements);

  if (entitlements.remainingReplies !== null && entitlements.remainingReplies <= 0) {
    const limitKey = `limit:${entitlements.remainingKey}`;
    const isRepeat = Boolean(BLOCKED_NOTICE.get(limitKey)?.limit);
    const gated = applyGatingIfNeeded(clientEntitlements);
    const { text, actions, gating } = buildGatingResponse(
      gated.userPlan,
      "limit",
      null,
      isRepeat,
    );
    BLOCKED_NOTICE.set(limitKey, { limit: true });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (event: string, data: object) => {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`,
            ),
          );
        };
        sendEvent("meta", { entitlements: gated });
        sendEvent("actions", { actions, gating });
        sendEvent("delta", { text });
        sendEvent("done", {});
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const planLabel = entitlements.userPlan;
  const remainingLabel =
    entitlements.remainingReplies === null
      ? "unlimited"
      : String(entitlements.remainingReplies);
  console.log(`Plan: ${planLabel} | Remaining: ${remainingLabel}`);

  const [scopePrompt, primaryPrompt] = await Promise.all([
    getPrompt("scope-control.txt"),
    getPrompt("primary.txt"),
  ]);

  const model = env.OPENAI_MODEL ?? "gpt-5.2";
  const openai = getOpenAIClient();
  const encoder = new TextEncoder();

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  if (maxReplies !== null && entitlements.remainingReplies !== null) {
    headers.set("X-Remaining", String(entitlements.remainingReplies));
  }

  if (!entitlements.cookies[THREAD_COOKIE] && entitlements.threadId) {
    headers.append(
      "Set-Cookie",
      buildCookieHeader(THREAD_COOKIE, entitlements.threadId),
    );
  }

  if (
    !entitlements.cookies[REMAINING_COOKIE] &&
    entitlements.remainingReplies !== null
  ) {
    headers.append(
      "Set-Cookie",
      buildCookieHeader(REMAINING_COOKIE, String(entitlements.remainingReplies)),
    );
  }

  headers.set("X-Plan", planLabel);
  headers.set("X-Can-Voice", entitlements.capabilities.voice ? "1" : "0");
  headers.set("X-Can-Photos", entitlements.capabilities.photos ? "1" : "0");
  headers.set(
    "X-Can-Links",
    entitlements.capabilities.linksVisuals ? "1" : "0",
  );

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: object) => {
        controller.enqueue(
          encoder.encode(
            `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`,
          ),
        );
      };

      sendEvent("meta", { entitlements: clientEntitlements });

      try {
        const lastUserMessage =
          [...body!.messages].reverse().find((m) => m.role === "user")?.content ??
          "";
        const shouldRecomputeScope =
          !entitlements.threadId ||
          hasScopeCues(lastUserMessage) ||
          !SCOPE_CACHE.has(entitlements.threadId);
        let scopeText = "";

        const scopeStart = Date.now();
        if (shouldRecomputeScope) {
          console.log("RUN scope-control");
          const scopeInput = [
            `USER_PLAN: ${entitlements.userPlan}`,
            `USER_HAS_ACCOUNT: ${entitlements.userHasAccount ? "yes" : "no"}`,
            `USER_COUNTRY: ${body!.userCountry ?? "unknown"}`,
            `USER_LANGUAGE: ${body!.userLanguage ?? "unknown"}`,
            `THREAD_CONTEXT: ${body!.threadContext ?? "unknown"}`,
            `CAPABILITIES: voice=${entitlements.capabilities.voice ? "yes" : "no"}, photos=${entitlements.capabilities.photos ? "yes" : "no"}, linksVisuals=${entitlements.capabilities.linksVisuals ? "yes" : "no"}`,
            "MESSAGES:",
            serializeMessages(body!.messages),
          ].join("\n");

          const scopeResponse = await openai.responses.create({
            model,
            input: [
              { role: "system", content: scopePrompt.trim() },
              { role: "user", content: scopeInput },
            ],
          });

          scopeText = getResponseOutputText(scopeResponse);

          if (entitlements.threadId) {
            SCOPE_CACHE.set(entitlements.threadId, {
              text: scopeText,
              updatedAt: Date.now(),
            });
          }
        } else if (entitlements.threadId) {
          console.log("RUN scope-control (cached)");
          scopeText = SCOPE_CACHE.get(entitlements.threadId)?.text ?? "";
        }
        console.log(`scope-control time ${Date.now() - scopeStart}ms`);

        const scopeClassification = parseScopeFromText(scopeText);
        if (
          (entitlements.userPlan === "small_fix" &&
            (scopeClassification === "medium" || scopeClassification === "big")) ||
          (entitlements.userPlan === "medium_fix" &&
            scopeClassification === "big")
        ) {
          const mismatchKey = `mismatch:${entitlements.remainingKey}`;
          const isRepeat = Boolean(BLOCKED_NOTICE.get(mismatchKey)?.mismatch);
          const { text, actions, gating } = buildGatingResponse(
            entitlements.userPlan,
            "plan_mismatch",
            scopeClassification,
            isRepeat,
          );
          BLOCKED_NOTICE.set(mismatchKey, { mismatch: true });
          sendEvent("actions", { actions, gating });
          sendEvent("delta", { text });
          sendEvent("done", {});
          controller.close();
          return;
        }

        console.log("RUN primary");
        const primaryStart = Date.now();
        const primaryInput = [
          "SCOPE_CONTROL:",
          scopeText,
          "CAPABILITIES:",
          `voice=${entitlements.capabilities.voice ? "yes" : "no"}`,
          `photos=${entitlements.capabilities.photos ? "yes" : "no"}`,
          `linksVisuals=${entitlements.capabilities.linksVisuals ? "yes" : "no"}`,
          "MESSAGES:",
          serializeMessages(body!.messages),
        ].join("\n");

        const primaryStream = await openai.responses.create({
          model,
          stream: true,
          input: [
            { role: "system", content: primaryPrompt.trim() },
            { role: "user", content: primaryInput },
          ],
        });

        for await (const event of primaryStream) {
          if (event.type === "response.output_text.delta") {
            const textDelta = event.delta ?? "";
            if (textDelta) {
              sendEvent("delta", { text: textDelta });
            }
          }

          if (
            event.type === "response.completed" ||
            event.type === "response.output_text.done"
          ) {
            console.log(`primary time ${Date.now() - primaryStart}ms`);
            const nextRemaining =
              entitlements.remainingReplies === null
                ? null
                : Math.max(entitlements.remainingReplies - 1, 0);
            if (nextRemaining !== null) {
              setRemainingForKey(entitlements.remainingKey, nextRemaining);
              console.log(`decrement remaining to ${nextRemaining}`);
              clientEntitlements.remainingReplies = nextRemaining;
              clientEntitlements.remainingSource = "memory";
              applyGatingIfNeeded(clientEntitlements);
              sendEvent("meta", { entitlements: clientEntitlements });
            }
            sendEvent("done", {});
            controller.close();
            return;
          }
        }

        sendEvent("done", {});
        controller.close();
      } catch (error) {
        console.error("AI route error:", error);
        sendEvent("error", { message: "Failed to generate response." });
        controller.close();
      }
    },
  });

  return new Response(stream, { headers });
}
