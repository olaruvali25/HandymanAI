import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getOpenAIClient } from "@/lib/openai";
import { env } from "@/env";
import {
  ANON_COOKIE,
  buildClientEntitlements,
  buildCookieHeader,
  getConvexAuthToken,
  parseCookies,
} from "@/lib/entitlements";
import { createHash, randomUUID } from "crypto";
import type { FunctionReference } from "convex/server";
import {
  CHAT_MAX_IMAGE_ATTACHMENT_BYTES,
  type ChatAttachment,
} from "@/lib/schemas/chat";

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
  anonymousId?: string;
  guestChatId?: string;
  attachments?: ChatAttachment[];
};

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOTAL_CHARS = 12000;
const IS_DEV = process.env.NODE_ENV === "development";
const STREAMING_DISABLED = process.env.FIXLY_DISABLE_STREAMING === "1";
const USER_MESSAGE_COST = 2;
const IMAGE_SURCHARGE_COST = 15;
const ASSISTANT_REPLY_COST = 2;
const SCOPE_MODEL = "gpt-4.1-mini";
const PRIMARY_MODEL = "gpt-4.1";

const CACHE_MAX_ENTRIES = 1000;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

class BoundedMap<K, V> {
  private map = new Map<K, { value: V; expiresAt: number }>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) {}

  private prune(now = Date.now()) {
    for (const [key, entry] of this.map) {
      if (entry.expiresAt <= now) {
        this.map.delete(key);
      }
    }
    if (this.map.size <= this.maxEntries) return;
    const overflow = this.map.size - this.maxEntries;
    let removed = 0;
    for (const key of this.map.keys()) {
      this.map.delete(key);
      removed += 1;
      if (removed >= overflow) break;
    }
  }

  get(key: K): V | undefined {
    this.prune();
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  has(key: K): boolean {
    this.prune();
    const entry = this.map.get(key);
    if (!entry) return false;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return false;
    }
    return true;
  }

  set(key: K, value: V) {
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    this.prune();
    return this;
  }
}

const SCOPE_CACHE = new BoundedMap<string, { text: string; updatedAt: number }>(
  CACHE_MAX_ENTRIES,
  CACHE_TTL_MS,
);

const serializeMessages = (messages: IncomingMessage[]) => {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
};

const validatePayload = (body: AiRequestBody, hasAttachments: boolean) => {
  if (!body || !Array.isArray(body.messages)) {
    return "Invalid payload.";
  }

  if (body.messages.length === 0 && !hasAttachments) {
    return "Invalid message count.";
  }

  if (body.messages.length > MAX_MESSAGES) {
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
    if (trimmed.length === 0) {
      if (hasAttachments) continue;
      return "Invalid message length.";
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return "Invalid message length.";
    }

    totalChars += trimmed.length;
    if (totalChars > MAX_TOTAL_CHARS) {
      return "Message payload too large.";
    }
  }

  return null;
};

type SanitizedAttachment = {
  name: string;
  type: string;
  size: number;
  storageId?: string;
  url?: string;
  dataUrl?: string;
};

const sanitizeAttachments = (
  attachments?: AiRequestBody["attachments"],
): SanitizedAttachment[] => {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];

  const getDataUrlSizeBytes = (dataUrl: string) => {
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex === -1) return null;
    const meta = dataUrl.slice(0, commaIndex);
    if (!/;base64$/i.test(meta)) return null;
    const base64 = dataUrl.slice(commaIndex + 1);
    if (base64.length === 0) return null;
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    const size = Math.floor((base64.length * 3) / 4) - padding;
    return Number.isFinite(size) && size >= 0 ? size : null;
  };

  return attachments.flatMap<SanitizedAttachment>((attachment) => {
    if (!attachment || typeof attachment !== "object") return [];
    const name = attachment.name ?? "upload";
    const type = attachment.type ?? "";
    const size =
      typeof attachment.size === "number" && attachment.size > 0
        ? attachment.size
        : null;
    const url = typeof attachment.url === "string" ? attachment.url : null;
    const storageId =
      typeof attachment.storageId === "string" ? attachment.storageId : null;
    const dataUrl =
      typeof attachment.dataUrl === "string" ? attachment.dataUrl : null;

    if (url) {
      return [
        {
          name,
          type,
          url,
          storageId: storageId ?? undefined,
          size: size ?? 0,
        },
      ];
    }

    if (dataUrl && dataUrl.startsWith("data:image/")) {
      const dataSize = getDataUrlSizeBytes(dataUrl);
      const resolvedSize = size ?? dataSize;
      if (typeof resolvedSize !== "number" || resolvedSize <= 0) return [];
      if (resolvedSize > CHAT_MAX_IMAGE_ATTACHMENT_BYTES) return [];
      return [
        {
          name,
          type,
          dataUrl,
          storageId: storageId ?? undefined,
          size: resolvedSize,
        },
      ];
    }

    if (storageId) {
      return [
        {
          name,
          type,
          storageId,
          size: size ?? 0,
        },
      ];
    }

    return [];
  });
};

const resolveAttachmentUrls = async (
  attachments: SanitizedAttachment[],
  token: string | null,
): Promise<SanitizedAttachment[]> => {
  if (attachments.length === 0) return attachments;
  const resolved = await Promise.all(
    attachments.map(async (attachment) => {
      if (attachment.url || !attachment.storageId) return attachment;
      try {
        const result = await fetchQuery(
          creditsApi.attachments.getAttachmentUrl,
          { storageId: attachment.storageId },
          token ? { token } : {},
        );
        if (result?.url) {
          return { ...attachment, url: result.url };
        }
      } catch {
        return attachment;
      }
      return attachment;
    }),
  );
  return resolved.filter((attachment) => attachment.url || attachment.dataUrl);
};

const filesToAttachments = async (files: File[]) => {
  const attachments = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size <= 0 || file.size > CHAT_MAX_IMAGE_ATTACHMENT_BYTES) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    attachments.push({
      name: file.name,
      type: file.type,
      dataUrl: `data:${file.type};base64,${base64}`,
      size: file.size,
    });
  }
  return attachments;
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

const getAnonymousId = (req: Request, body: AiRequestBody | null) => {
  const cookies = parseCookies(req.headers.get("cookie"));
  const fromBody = body?.anonymousId ?? body?.guestChatId ?? null;
  const fromCookie = cookies[ANON_COOKIE] ?? null;
  return { fromBody, fromCookie };
};

const buildTurnId = (
  messages: IncomingMessage[],
  attachments: SanitizedAttachment[],
) => {
  const payload = JSON.stringify({
    messages,
    attachments: attachments.map((attachment) => ({
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
      digest: (
        attachment.url ??
        attachment.dataUrl ??
        attachment.storageId ??
        ""
      ).slice(0, 80),
    })),
  });
  return createHash("sha256").update(payload).digest("hex");
};

const logEvent = (message: string, data?: Record<string, unknown>) => {
  if (!IS_DEV) return;
  if (data) {
    console.debug(message, data);
  } else {
    console.debug(message);
  }
};

const CONVEX_TIMEOUT_MS = 5000;

const withTimeout = async <T>(promise: Promise<T>, ms = CONVEX_TIMEOUT_MS) => {
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

type GetCreditsQuery = FunctionReference<
  "query",
  "public",
  { anonymousId?: string },
  { credits: number }
>;
type ReserveCreditsMutation = FunctionReference<
  "mutation",
  "public",
  {
    anonymousId?: string;
    turnId: string;
    cost: number;
    minimumCredits?: number;
    threadId?: string;
  },
  { credits: number }
>;
type ChargeCreditsMutation = FunctionReference<
  "mutation",
  "public",
  {
    anonymousId?: string;
    turnId: string;
    cost: number;
    threadId?: string;
  },
  { credits: number }
>;

const creditsApi = api as unknown as {
  entitlements: {
    getCreditsForActor: GetCreditsQuery;
    reserveCredits: ReserveCreditsMutation;
    chargeAssistantCredits: ChargeCreditsMutation;
    recordOutOfCredits: FunctionReference<
      "mutation",
      "public",
      { anonymousId?: string; turnId: string; threadId?: string },
      { recorded: boolean }
    >;
  };
  attachments: {
    getAttachmentUrl: FunctionReference<
      "query",
      "public",
      { storageId: string },
      { url: string | null }
    >;
  };
};

export async function GET(req: Request) {
  logEvent("[ai] GET /api/ai start");
  const cookieHeader = req.headers.get("cookie");
  const token = getConvexAuthToken(cookieHeader);
  const userHasAccount = Boolean(token);
  const { fromCookie } = getAnonymousId(req, null);
  let anonymousId = userHasAccount ? null : fromCookie;
  let shouldSetAnonCookie = false;
  if (!userHasAccount && !anonymousId) {
    anonymousId = randomUUID();
    shouldSetAnonCookie = true;
  }

  let credits = 0;
  try {
    const creditsResponse = await withTimeout(
      fetchQuery(
        creditsApi.entitlements.getCreditsForActor,
        { anonymousId: anonymousId ?? undefined },
        token ? { token } : {},
      ),
    );
    credits = creditsResponse?.credits ?? 0;
  } catch (error) {
    console.error("[ai] credits init error:", error);
  }

  const clientEntitlements = buildClientEntitlements({
    userHasAccount,
    credits,
  });
  const res = NextResponse.json({ entitlements: clientEntitlements });
  res.headers.set("X-User-Has-Account", userHasAccount ? "1" : "0");
  res.headers.set("X-Credits", String(credits));
  if (shouldSetAnonCookie && anonymousId) {
    res.headers.append(
      "Set-Cookie",
      buildCookieHeader(ANON_COOKIE, anonymousId),
    );
  }

  return res;
}

export async function POST(req: Request) {
  logEvent("[ai] POST /api/ai start", {
    streamingDisabled: STREAMING_DISABLED,
  });
  let body: AiRequestBody | null = null;
  let attachmentsFromForm: AiRequestBody["attachments"] = [];
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      const rawPayload = form.get("payload") ?? form.get("messages");
      if (typeof rawPayload === "string") {
        try {
          const parsed = JSON.parse(rawPayload) as
            | AiRequestBody
            | IncomingMessage[];
          if (Array.isArray(parsed)) {
            body = { messages: parsed };
          } else {
            body = parsed;
          }
        } catch {
          body = null;
        }
      }
      if (!body) {
        const message = form.get("message");
        body = {
          messages:
            typeof message === "string"
              ? [{ role: "user", content: message }]
              : [],
          userCountry:
            typeof form.get("userCountry") === "string"
              ? (form.get("userCountry") as string)
              : undefined,
          userLanguage:
            typeof form.get("userLanguage") === "string"
              ? (form.get("userLanguage") as string)
              : undefined,
          threadContext:
            typeof form.get("threadContext") === "string"
              ? (form.get("threadContext") as string)
              : undefined,
        };
      }
      const files = form
        .getAll("files")
        .concat(form.getAll("attachments"))
        .filter((item): item is File => item instanceof File);
      if (files.length > 0) {
        attachmentsFromForm = await filesToAttachments(files);
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid form data." },
        { status: 400 },
      );
    }
  } else {
    try {
      body = (await req.json()) as AiRequestBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
  }

  if (attachmentsFromForm.length > 0) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const rawAttachments = sanitizeAttachments(body?.attachments);

  const validationError = body
    ? validatePayload(body, rawAttachments.length > 0)
    : "Invalid payload.";
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const cookieHeader = req.headers.get("cookie");
  const token = getConvexAuthToken(cookieHeader);
  const userHasAccount = Boolean(token);
  const { fromBody, fromCookie } = getAnonymousId(req, body);
  let anonymousId = userHasAccount ? null : (fromBody ?? fromCookie);
  let shouldSetAnonCookie = false;
  if (!userHasAccount && !anonymousId) {
    anonymousId = randomUUID();
    shouldSetAnonCookie = true;
  }

  if (!env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY." },
      { status: 500 },
    );
  }

  const attachments: SanitizedAttachment[] = await resolveAttachmentUrls(
    rawAttachments,
    token,
  );
  const hasImageAttachments = attachments.length > 0;
  const userCost =
    USER_MESSAGE_COST + (hasImageAttachments ? IMAGE_SURCHARGE_COST : 0);
  const assistantCost = ASSISTANT_REPLY_COST;
  const turnId = buildTurnId(body.messages, attachments);

  let creditsRemaining = 0;
  try {
    const reserve = await withTimeout(
      fetchMutation(
        creditsApi.entitlements.reserveCredits,
        {
          anonymousId: anonymousId ?? undefined,
          turnId,
          cost: userCost,
          minimumCredits: userCost + assistantCost,
          threadId: body.threadId,
        },
        token ? { token } : {},
      ),
    );
    creditsRemaining = reserve?.credits ?? 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INSUFFICIENT_CREDITS") {
      try {
        await fetchMutation(
          creditsApi.entitlements.recordOutOfCredits,
          {
            anonymousId: anonymousId ?? undefined,
            turnId,
            threadId: body.threadId,
          },
          token ? { token } : {},
        );
      } catch {}

      let plan: string | null = null;
      if (token) {
        try {
          const me = await fetchQuery(api.users.me, {}, token ? { token } : {});
          plan = typeof me?.plan === "string" ? me.plan : null;
        } catch {
          plan = null;
        }
      }

      const assistantMessage = !userHasAccount
        ? "You need to log in or create an account to continue."
        : plan === "none"
          ? "Grab some credits and lets finish this."
          : "Add extra credits or upgrade to finish.";

      const actions = !userHasAccount
        ? {
            actions: [
              { type: "link", label: "Login", href: "/login" },
              { type: "link", label: "Signup", href: "/signup" },
            ],
          }
        : {
            actions: [
              {
                type: "link",
                label: "Go to Pricing",
                href: "/pricing",
              },
            ],
          };

      const creditsResponse = await fetchQuery(
        creditsApi.entitlements.getCreditsForActor,
        { anonymousId: anonymousId ?? undefined },
        token ? { token } : {},
      );
      const entitlements = buildClientEntitlements({
        userHasAccount,
        credits: creditsResponse?.credits ?? 0,
      });

      const res = NextResponse.json(
        {
          error: "INSUFFICIENT_CREDITS",
          entitlements,
          actions,
          assistantMessage,
        },
        { status: 402 },
      );
      if (anonymousId && (!fromCookie || shouldSetAnonCookie)) {
        res.headers.append(
          "Set-Cookie",
          buildCookieHeader(ANON_COOKIE, anonymousId),
        );
      }
      return res;
    }
    console.error("[ai] credits reserve error:", error);
    const res = NextResponse.json(
      { error: "Unable to reserve credits. Please try again." },
      { status: 503 },
    );
    if (anonymousId && (!fromCookie || shouldSetAnonCookie)) {
      res.headers.append(
        "Set-Cookie",
        buildCookieHeader(ANON_COOKIE, anonymousId),
      );
    }
    return res;
  }

  const clientEntitlements = buildClientEntitlements({
    userHasAccount,
    credits: creditsRemaining,
  });
  const threadId = body.threadId ?? null;
  const basePrimaryModel = PRIMARY_MODEL;
  const primaryModel =
    attachments.length > 0 && !/gpt-4|4o/i.test(basePrimaryModel)
      ? "gpt-4o-mini"
      : basePrimaryModel;
  if (process.env.NODE_ENV === "development") {
    console.debug("[ai] attachments", {
      count: attachments.length,
      types: attachments.map((attachment) => attachment.type),
      sizes: attachments.map((attachment) => attachment.size),
    });
    console.debug("[ai] vision model", {
      model: primaryModel,
      hasAttachments: attachments.length > 0,
    });
  }
  if (process.env.NODE_ENV === "development") {
    console.debug("[ai] credits", {
      userHasAccount,
      creditsRemaining,
      attachments: attachments.length,
    });
  }

  const [scopePrompt, primaryPrompt] = await Promise.all([
    getPrompt("scope-control.txt"),
    getPrompt("primary.txt"),
  ]);

  const openai = getOpenAIClient();
  const encoder = new TextEncoder();

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  headers.set("X-User-Has-Account", userHasAccount ? "1" : "0");
  headers.set("X-Credits", String(creditsRemaining));
  if (anonymousId && (!fromCookie || shouldSetAnonCookie)) {
    headers.append("Set-Cookie", buildCookieHeader(ANON_COOKIE, anonymousId));
  }

  const applyHeaders = (res: NextResponse) => {
    headers.forEach((value, key) => {
      res.headers.append(key, value);
    });
    return res;
  };

  if (STREAMING_DISABLED) {
    try {
      const lastUserMessage =
        [...body!.messages].reverse().find((m) => m.role === "user")?.content ??
        "";
      const shouldRecomputeScope =
        !threadId ||
        hasScopeCues(lastUserMessage) ||
        !SCOPE_CACHE.has(threadId);
      let scopeText = "";

      const scopeStart = Date.now();
      logEvent("[ai] scope-control start");
      if (shouldRecomputeScope) {
        const scopeInput = [
          `USER_PLAN: ${clientEntitlements.userPlan}`,
          `USER_HAS_ACCOUNT: ${userHasAccount ? "yes" : "no"}`,
          `USER_COUNTRY: ${body!.userCountry ?? "unknown"}`,
          `USER_LANGUAGE: ${body!.userLanguage ?? "unknown"}`,
          `THREAD_CONTEXT: ${body!.threadContext ?? "unknown"}`,
          `CAPABILITIES: voice=${clientEntitlements.capabilities.voice ? "yes" : "no"}, photos=${clientEntitlements.capabilities.photos ? "yes" : "no"}, linksVisuals=${clientEntitlements.capabilities.linksVisuals ? "yes" : "no"}`,
          "MESSAGES:",
          serializeMessages(body!.messages),
        ].join("\n");

        const scopeResponse = await openai.responses.create({
          model: SCOPE_MODEL,
          input: [
            { role: "system", content: scopePrompt.trim() },
            { role: "user", content: scopeInput },
          ],
        });

        scopeText = getResponseOutputText(scopeResponse);

        if (threadId) {
          SCOPE_CACHE.set(threadId, {
            text: scopeText,
            updatedAt: Date.now(),
          });
        }
      } else if (threadId) {
        scopeText = SCOPE_CACHE.get(threadId)?.text ?? "";
      }
      logEvent("[ai] scope-control end", {
        ms: Date.now() - scopeStart,
        cached: !shouldRecomputeScope,
      });
      logEvent("[ai] verifier start");
      logEvent("[ai] verifier end", { ms: 0 });

      logEvent("[ai] primary start");
      const primaryStart = Date.now();
      const primaryInput = [
        "SCOPE_CONTROL:",
        scopeText,
        "CAPABILITIES:",
        `voice=${clientEntitlements.capabilities.voice ? "yes" : "no"}`,
        `photos=${clientEntitlements.capabilities.photos ? "yes" : "no"}`,
        `linksVisuals=${clientEntitlements.capabilities.linksVisuals ? "yes" : "no"}`,
        attachments.length > 0
          ? `ATTACHMENTS: ${attachments.length} image(s) included.`
          : null,
        "MESSAGES:",
        serializeMessages(body!.messages),
      ]
        .filter(Boolean)
        .join("\n");

      const primaryContent: Array<
        | { type: "input_text"; text: string }
        | { type: "input_image"; image_url: string; detail: "auto" }
      > = [
        { type: "input_text", text: primaryInput },
        ...attachments.map((attachment) => ({
          type: "input_image" as const,
          image_url: attachment.url ?? attachment.dataUrl ?? "",
          detail: "auto" as const,
        })),
      ];

      const primaryResponse = await openai.responses.create({
        model: primaryModel,
        input: [
          { role: "system", content: primaryPrompt.trim() },
          { role: "user", content: primaryContent },
        ],
      });
      const outputText = getResponseOutputText(primaryResponse);
      logEvent("[ai] primary end", { ms: Date.now() - primaryStart });
      logEvent("[ai] response json");

      try {
        await withTimeout(
          fetchMutation(
            creditsApi.entitlements.chargeAssistantCredits,
            {
              anonymousId: anonymousId ?? undefined,
              turnId,
              cost: assistantCost,
              threadId: body.threadId,
            },
            token ? { token } : {},
          ),
        );
      } catch (error) {
        console.error("[ai] credits charge error:", error);
      }

      return applyHeaders(
        NextResponse.json({
          text: outputText,
          entitlements: clientEntitlements,
        }),
      );
    } catch (error) {
      console.error("AI route error:", error);
      return NextResponse.json(
        { error: "Failed to generate response." },
        { status: 500 },
      );
    }
  }

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
          [...body!.messages].reverse().find((m) => m.role === "user")
            ?.content ?? "";
        const shouldRecomputeScope =
          !threadId ||
          hasScopeCues(lastUserMessage) ||
          !SCOPE_CACHE.has(threadId);
        let scopeText = "";

        const scopeStart = Date.now();
        logEvent("[ai] scope-control start");
        if (shouldRecomputeScope) {
          const scopeInput = [
            `USER_PLAN: ${clientEntitlements.userPlan}`,
            `USER_HAS_ACCOUNT: ${userHasAccount ? "yes" : "no"}`,
            `USER_COUNTRY: ${body!.userCountry ?? "unknown"}`,
            `USER_LANGUAGE: ${body!.userLanguage ?? "unknown"}`,
            `THREAD_CONTEXT: ${body!.threadContext ?? "unknown"}`,
            `CAPABILITIES: voice=${clientEntitlements.capabilities.voice ? "yes" : "no"}, photos=${clientEntitlements.capabilities.photos ? "yes" : "no"}, linksVisuals=${clientEntitlements.capabilities.linksVisuals ? "yes" : "no"}`,
            "MESSAGES:",
            serializeMessages(body!.messages),
          ].join("\n");

          const scopeResponse = await openai.responses.create({
            model: SCOPE_MODEL,
            input: [
              { role: "system", content: scopePrompt.trim() },
              { role: "user", content: scopeInput },
            ],
          });

          scopeText = getResponseOutputText(scopeResponse);

          if (threadId) {
            SCOPE_CACHE.set(threadId, {
              text: scopeText,
              updatedAt: Date.now(),
            });
          }
        } else if (threadId) {
          scopeText = SCOPE_CACHE.get(threadId)?.text ?? "";
        }
        logEvent("[ai] scope-control end", {
          ms: Date.now() - scopeStart,
          cached: !shouldRecomputeScope,
        });
        logEvent("[ai] verifier start");
        logEvent("[ai] verifier end", { ms: 0 });

        logEvent("[ai] primary start");
        const primaryStart = Date.now();
        const primaryInput = [
          "SCOPE_CONTROL:",
          scopeText,
          "CAPABILITIES:",
          `voice=${clientEntitlements.capabilities.voice ? "yes" : "no"}`,
          `photos=${clientEntitlements.capabilities.photos ? "yes" : "no"}`,
          `linksVisuals=${clientEntitlements.capabilities.linksVisuals ? "yes" : "no"}`,
          attachments.length > 0
            ? `ATTACHMENTS: ${attachments.length} image(s) included.`
            : null,
          "MESSAGES:",
          serializeMessages(body!.messages),
        ]
          .filter(Boolean)
          .join("\n");

        const primaryContent: Array<
          | { type: "input_text"; text: string }
          | { type: "input_image"; image_url: string; detail: "auto" }
        > = [
          { type: "input_text", text: primaryInput },
          ...attachments.map((attachment) => ({
            type: "input_image" as const,
            image_url: attachment.url ?? attachment.dataUrl ?? "",
            detail: "auto" as const,
          })),
        ];

        const primaryStream = await openai.responses.create({
          model: primaryModel,
          stream: true,
          input: [
            { role: "system", content: primaryPrompt.trim() },
            { role: "user", content: primaryContent },
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
            logEvent("[ai] primary end", { ms: Date.now() - primaryStart });
            logEvent("[ai] response stream");
            try {
              await withTimeout(
                fetchMutation(
                  creditsApi.entitlements.chargeAssistantCredits,
                  {
                    anonymousId: anonymousId ?? undefined,
                    turnId,
                    cost: assistantCost,
                    threadId: body.threadId,
                  },
                  token ? { token } : {},
                ),
              );
            } catch (error) {
              console.error("[ai] credits charge error:", error);
            }
            sendEvent("done", {});
            controller.close();
            return;
          }
        }

        logEvent("[ai] primary end", { ms: Date.now() - primaryStart });
        logEvent("[ai] response stream");
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
