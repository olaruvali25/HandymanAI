import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getOpenAIClient } from "@/lib/openai";
import { env } from "@/env";
import {
  buildCookieHeader,
  buildCounterCookieValue,
  getConvexAuthToken,
  getEntitlements,
  normalizeStoredPlan,
  parseCounterCookieValue,
  PHOTO_COOKIE,
  SESSION_COOKIE,
  THREAD_COOKIE,
  toClientEntitlements,
  resolveEntitlements,
  type StoredPlan,
} from "@/lib/entitlements";
import { randomUUID } from "crypto";
import type { FunctionReference } from "convex/server";

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
  attachments?: {
    name: string;
    type: string;
    dataUrl: string;
    size: number;
  }[];
};

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOTAL_CHARS = 12000;
const IS_DEV = process.env.NODE_ENV === "development";
const STREAMING_DISABLED = process.env.FIXLY_DISABLE_STREAMING === "1";

const CACHE_MAX_ENTRIES = 1000;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

class BoundedMap<K, V> {
  private map = new Map<K, { value: V; expiresAt: number }>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) { }

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

const SCOPE_CACHE = new BoundedMap<
  string,
  { text: string; updatedAt: number }
>(CACHE_MAX_ENTRIES, CACHE_TTL_MS);
const BLOCKED_NOTICE = new BoundedMap<
  string,
  { limit?: boolean; mismatch?: boolean; photo?: boolean }
>(CACHE_MAX_ENTRIES, CACHE_TTL_MS);
const PHOTO_STORE = new BoundedMap<string, number>(
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

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const sanitizeAttachments = (attachments?: AiRequestBody["attachments"]) => {
  if (!attachments || attachments.length === 0) return [];
  return attachments
    .filter(
      (attachment) =>
        attachment &&
        typeof attachment.dataUrl === "string" &&
        attachment.dataUrl.startsWith("data:image/") &&
        (attachment.size ?? 0) > 0 &&
        (attachment.size ?? 0) <= MAX_ATTACHMENT_BYTES,
    )
    .map((attachment) => ({
      name: attachment.name ?? "upload",
      type: attachment.type ?? "",
      dataUrl: attachment.dataUrl,
      size: attachment.size ?? 0,
    }));
};

const filesToAttachments = async (files: File[]) => {
  const attachments = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES) continue;
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

const getPhotoScope = (
  userPlan: string,
  userHasAccount: boolean,
): "daily" | "thread" => {
  if (userPlan === "small_fix" || userPlan === "none" || userPlan === "free") {
    return "thread";
  }
  return userHasAccount ? "daily" : "thread";
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
    return {
      text:
        "This looks like a bigger fix - upgrade so I can guide you fully.",
      gating: { blocked: true, reason: "plan_mismatch" },
      actions: [
        {
          type: "link",
          label: "Upgrade",
          href: "/pricing",
          variant: "primary",
        },
      ],
    };
  }

  if (userPlan === "none") {
    return {
      text: isRepeat
        ? "I cant continue until you create an account."
        : "Were close  create an account to continue so I can keep guiding you.",
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
    text:
      "Want me to guide you step-by-step (voice + photos)? Grab a Fix and well finish this.",
    gating: { blocked: true, reason: "payment" },
    actions: [
      {
        type: "link",
        label: "Get a Fix",
        href: "/pricing",
        variant: "primary",
      },
    ],
  };
};

const buildLimitResponse = (userHasAccount: boolean) => {
  if (!userHasAccount) {
    return {
      text: "Your issue is about to be fixed, but to keep guiding you, log-in or sign-up to continue.",
      actions: [
        { type: "link", label: "Log in", href: "/login", variant: "secondary" },
        { type: "link", label: "Sign up", href: "/signup", variant: "primary" },
      ],
      gating: { blocked: true, reason: "limit" },
    };
  }

  return {
    text: "Got it, we'll solve this issue in a few moments, but first let's get you set up with a Fix so we can continue.",
    actions: [
      { type: "link", label: "Get a Fix", href: "/pricing", variant: "primary" },
    ],
    gating: { blocked: true, reason: "limit" },
  };
};

const buildPhotoLimitResponse = (userPlan: string, isRepeat?: boolean) => {
  const baseText = isRepeat
    ? "This feature is included in Medium/Big/Pro. Upgrade to continue."
    : "This feature is included in Medium/Big/Pro. Upgrade to continue.";

  if (userPlan === "none") {
    return {
      text: "This feature is included in Medium/Big/Pro. Create an account to continue.",
      gating: { blocked: true, reason: "photo_limit" },
      actions: [
        { type: "link", label: "Sign up", href: "/signup", variant: "primary" },
        { type: "link", label: "Log in", href: "/login", variant: "secondary" },
      ],
    };
  }

  if (userPlan === "small_fix") {
    return {
      text: baseText,
      gating: { blocked: true, reason: "photo_limit" },
      actions: [
        {
          type: "link",
          label: "Upgrade",
          href: "/pricing",
          variant: "primary",
        },
      ],
    };
  }

  return {
    text: baseText,
    gating: { blocked: true, reason: "photo_limit" },
    actions: [
      { type: "link", label: "Upgrade", href: "/pricing", variant: "primary" },
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
    ...entitlements.capabilities,
    voice: false,
    photos: false,
    linksVisuals: false,
  };

  return entitlements;
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

type MessageCountQuery = FunctionReference<
  "query",
  "public",
  { sessionId?: string },
  number
>;
type MessageCountMutation = FunctionReference<
  "mutation",
  "public",
  { sessionId?: string },
  number
>;

const entitlementsApi = api as unknown as {
  entitlements: {
    getMessageCount: MessageCountQuery;
    incrementMessageCount: MessageCountMutation;
  };
};

const getMessageCount = async (
  sessionId: string | null,
  token: string | null,
) => {
  return withTimeout(
    fetchQuery(
      entitlementsApi.entitlements.getMessageCount,
      { sessionId: sessionId ?? undefined },
      token ? { token } : {},
    ),
  );
};

const incrementMessageCount = async (
  sessionId: string | null,
  token: string | null,
) => {
  return withTimeout(
    fetchMutation(
      entitlementsApi.entitlements.incrementMessageCount,
      { sessionId: sessionId ?? undefined },
      token ? { token } : {},
    ),
  );
};

export async function GET(req: Request) {
  logEvent("[ai] GET /api/ai start");
  const planOverride = await getPlanOverride(req);
  const entitlements = getEntitlements(req, {
    planOverride: planOverride ?? undefined,
  });
  const cookieHeader = req.headers.get("cookie");
  const token = getConvexAuthToken(cookieHeader);
  let sessionId = entitlements.sessionId;
  let shouldSetSessionCookie = false;
  if (!entitlements.userHasAccount && !sessionId) {
    sessionId = randomUUID();
    shouldSetSessionCookie = true;
  }
  try {
    const messageCount = await getMessageCount(sessionId, token);
    const resolved = resolveEntitlements({
      isAnonymous: !entitlements.userHasAccount,
      plan: entitlements.userPlan,
      messageCount,
    });

    entitlements.userPlan = resolved.userPlan;
    entitlements.capabilities = resolved.capabilities;
    entitlements.remainingReplies = resolved.remainingMessages;
    entitlements.remainingSource = "server";
    entitlements.sessionId = sessionId;
  } catch (error) {
    console.error("[ai] entitlements init error:", error);
  }

  const clientEntitlements = applyGatingIfNeeded(
    toClientEntitlements(entitlements),
  );
  const res = NextResponse.json({ entitlements: clientEntitlements });
  res.headers.set("X-User-Has-Account", entitlements.userHasAccount ? "1" : "0");

  if (!entitlements.cookies[THREAD_COOKIE] && entitlements.threadId) {
    res.headers.append(
      "Set-Cookie",
      buildCookieHeader(THREAD_COOKIE, entitlements.threadId),
    );
  }

  if (shouldSetSessionCookie && sessionId) {
    res.headers.append(
      "Set-Cookie",
      buildCookieHeader(SESSION_COOKIE, sessionId),
    );
  }

  return res;
}

export async function POST(req: Request) {
  logEvent("[ai] POST /api/ai start", { streamingDisabled: STREAMING_DISABLED });
  let body: AiRequestBody | null = null;
  let attachmentsFromForm: AiRequestBody["attachments"] = [];
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      const rawPayload =
        form.get("payload") ??
        form.get("messages");
      if (typeof rawPayload === "string") {
        try {
          const parsed = JSON.parse(rawPayload) as AiRequestBody | IncomingMessage[];
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
      return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }
  } else {
    try {
      body = (await req.json()) as AiRequestBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
  }

  const validationError = body
    ? validatePayload(
      body,
      attachmentsFromForm.length > 0 || (body.attachments?.length ?? 0) > 0,
    )
    : "Invalid payload.";
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const planOverride = await getPlanOverride(req);
  const entitlements = getEntitlements(req, {
    planOverride: planOverride ?? undefined,
  });
  const cookieHeader = req.headers.get("cookie");
  const token = getConvexAuthToken(cookieHeader);
  let sessionId = entitlements.sessionId;
  let shouldSetSessionCookie = false;
  if (!sessionId && !token) {
    sessionId = randomUUID();
    shouldSetSessionCookie = true;
  }
  let resolved;
  try {
    const messageCount = await incrementMessageCount(sessionId, token);
    resolved = resolveEntitlements({
      isAnonymous: !entitlements.userHasAccount,
      plan: entitlements.userPlan,
      messageCount,
    });
    entitlements.userPlan = resolved.userPlan;
    entitlements.capabilities = resolved.capabilities;
    entitlements.remainingReplies = resolved.remainingMessages;
    entitlements.remainingSource = "server";
    entitlements.sessionId = sessionId;
  } catch (error) {
    console.error("[ai] entitlements error:", error);
    return NextResponse.json(
      { error: "Unable to reach usage service. Please try again." },
      { status: 503 },
    );
  }

  if (!resolved.canChat) {
    const gated = applyGatingIfNeeded(toClientEntitlements(entitlements));
    const limitNoticeKey = `limit:${entitlements.userHasAccount ? "user" : "anon"}:${entitlements.sessionId ?? entitlements.threadId}`;
    const isRepeat = Boolean(BLOCKED_NOTICE.get(limitNoticeKey)?.limit);
    const response = isRepeat
      ? {
          text: "You're still at the limit. Use the button above to continue.",
          actions: [] as Array<{
            type: "link";
            label: string;
            href: string;
            variant?: "primary" | "secondary";
          }>,
          gating: { blocked: true, reason: "limit" as const },
        }
      : buildLimitResponse(entitlements.userHasAccount);
    if (!isRepeat) {
      BLOCKED_NOTICE.set(limitNoticeKey, { limit: true });
    }
    const { text, actions, gating } = response;
    const encoder = new TextEncoder();
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    if (!entitlements.cookies[THREAD_COOKIE] && entitlements.threadId) {
      headers.append(
        "Set-Cookie",
        buildCookieHeader(THREAD_COOKIE, entitlements.threadId),
      );
    }
    if (shouldSetSessionCookie && sessionId) {
      headers.append(
        "Set-Cookie",
        buildCookieHeader(SESSION_COOKIE, sessionId),
      );
    }

    logEvent("[ai] response limit", { userHasAccount: entitlements.userHasAccount });
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
        if (actions?.length) {
          sendEvent("actions", { actions, gating });
        }
        sendEvent("delta", { text });
        sendEvent("done", {});
        controller.close();
      },
    });

    if (STREAMING_DISABLED) {
      const res = NextResponse.json({
        text,
        entitlements: gated,
        actions: actions?.length ? actions : undefined,
        gating,
      });
      headers.forEach((value, key) => res.headers.append(key, value));
      return res;
    }

    return new Response(stream, { headers });
  }

  if (!env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY." },
      { status: 500 },
    );
  }

  const clientEntitlements = applyGatingIfNeeded(
    toClientEntitlements(entitlements),
  );
  const attachments =
    attachmentsFromForm.length > 0
      ? sanitizeAttachments(attachmentsFromForm)
      : sanitizeAttachments(body.attachments);
  const baseModel = env.OPENAI_MODEL ?? "gpt-5.2";
  const model =
    attachments.length > 0 && !/gpt-4|4o/i.test(baseModel)
      ? "gpt-4o-mini"
      : baseModel;
  if (process.env.NODE_ENV === "development") {
    console.debug("[ai] attachments", {
      count: attachments.length,
      types: attachments.map((attachment) => attachment.type),
      sizes: attachments.map((attachment) => attachment.size),
    });
    console.debug("[ai] vision model", {
      model,
      hasAttachments: attachments.length > 0,
    });
  }
  const remainingMode = entitlements.userHasAccount ? "account" : "anon";
  const photoLimit = entitlements.capabilities.photoLimit;
  const photoScope =
    photoLimit === null
      ? null
      : getPhotoScope(entitlements.userPlan, entitlements.userHasAccount);
  const photoKey =
    photoScope === "daily"
      ? `photo:${entitlements.remainingKey}`
      : photoScope === "thread"
        ? `photo:thread:${entitlements.threadId}`
        : null;
  const storedPhoto =
    photoKey && PHOTO_STORE.has(photoKey) ? PHOTO_STORE.get(photoKey) : undefined;
  const cookiePhoto =
    photoKey && photoScope
      ? parseCounterCookieValue(
        entitlements.cookies[PHOTO_COOKIE],
        photoScope,
        entitlements.threadId,
        remainingMode,
      )
      : Number.NaN;
  const photoUsed = Number.isFinite(storedPhoto)
    ? (storedPhoto as number)
    : Number.isFinite(cookiePhoto)
      ? (cookiePhoto as number)
      : 0;
  let nextPhotoCount: number | null = null;

  if (process.env.NODE_ENV === "development") {
    console.debug("[ai] entitlements", {
      userHasAccount: entitlements.userHasAccount,
      plan: entitlements.userPlan,
      remaining: entitlements.remainingReplies,
      threadId: entitlements.threadId,
      photoUsed,
      photoLimit,
    });
  }

  if (attachments.length > 0 && !entitlements.capabilities.photos) {
    const photoNoticeKey = `photo:blocked:${entitlements.remainingKey}`;
    const isRepeat = Boolean(BLOCKED_NOTICE.get(photoNoticeKey)?.photo);
    const { text, actions, gating } = buildPhotoLimitResponse(
      entitlements.userPlan,
      isRepeat,
    );
    BLOCKED_NOTICE.set(photoNoticeKey, { photo: true });
    const encoder = new TextEncoder();
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    if (!entitlements.cookies[THREAD_COOKIE] && entitlements.threadId) {
      headers.append(
        "Set-Cookie",
        buildCookieHeader(THREAD_COOKIE, entitlements.threadId),
      );
    }
    if (shouldSetSessionCookie && sessionId) {
      headers.append(
        "Set-Cookie",
        buildCookieHeader(SESSION_COOKIE, sessionId),
      );
    }
    logEvent("[ai] response photo blocked");
    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (event: string, data: object) => {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`,
            ),
          );
        };
        sendEvent("meta", { entitlements: clientEntitlements });
        sendEvent("actions", { actions, gating });
        sendEvent("delta", { text });
        sendEvent("done", {});
        controller.close();
      },
    });

    if (STREAMING_DISABLED) {
      const res = NextResponse.json({
        text,
        entitlements: clientEntitlements,
        actions,
        gating,
      });
      headers.forEach((value, key) => res.headers.append(key, value));
      return res;
    }

    return new Response(stream, { headers });
  }

  if (photoLimit !== null && attachments.length > 0 && photoKey && photoScope) {
    const nextPhoto = photoUsed + attachments.length;
    if (nextPhoto > photoLimit) {
      const photoNoticeKey = `photo:${photoKey}`;
      const isRepeat = Boolean(BLOCKED_NOTICE.get(photoNoticeKey)?.photo);
      const { text, actions, gating } = buildPhotoLimitResponse(
        entitlements.userPlan,
        isRepeat,
      );
      BLOCKED_NOTICE.set(photoNoticeKey, { photo: true });
      if (process.env.NODE_ENV === "development") {
        console.debug("[ai] gate:photo_limit", {
          plan: entitlements.userPlan,
          threadId: entitlements.threadId,
          photoUsed,
          photoLimit,
        });
      }
      const encoder = new TextEncoder();
      const headers = new Headers({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      if (!entitlements.cookies[THREAD_COOKIE] && entitlements.threadId) {
        headers.append(
          "Set-Cookie",
          buildCookieHeader(THREAD_COOKIE, entitlements.threadId),
        );
      }
      if (shouldSetSessionCookie && sessionId) {
        headers.append(
          "Set-Cookie",
          buildCookieHeader(SESSION_COOKIE, sessionId),
        );
      }
      logEvent("[ai] response photo limit");
      const stream = new ReadableStream({
        start(controller) {
          const sendEvent = (event: string, data: object) => {
            controller.enqueue(
              encoder.encode(
                `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`,
              ),
            );
          };
          sendEvent("meta", { entitlements: clientEntitlements });
          sendEvent("actions", { actions, gating });
          sendEvent("delta", { text });
          sendEvent("done", {});
          controller.close();
        },
      });

      if (STREAMING_DISABLED) {
        const res = NextResponse.json({
          text,
          entitlements: clientEntitlements,
          actions,
          gating,
        });
        headers.forEach((value, key) => res.headers.append(key, value));
        return res;
      }

      return new Response(stream, { headers });
    }
    nextPhotoCount = nextPhoto;
    PHOTO_STORE.set(photoKey, nextPhoto);
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

  const openai = getOpenAIClient();
  const encoder = new TextEncoder();

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  if (entitlements.remainingReplies !== null) {
    headers.set("X-Remaining", String(entitlements.remainingReplies));
  }

  if (!entitlements.cookies[THREAD_COOKIE] && entitlements.threadId) {
    headers.append(
      "Set-Cookie",
      buildCookieHeader(THREAD_COOKIE, entitlements.threadId),
    );
  }

  if (shouldSetSessionCookie && sessionId) {
    headers.append(
      "Set-Cookie",
      buildCookieHeader(SESSION_COOKIE, sessionId),
    );
  }

  if (nextPhotoCount !== null && photoScope) {
    headers.append(
      "Set-Cookie",
      buildCookieHeader(
        PHOTO_COOKIE,
        buildCounterCookieValue(
          nextPhotoCount,
          photoScope,
          entitlements.threadId,
          remainingMode,
        ),
      ),
    );
  }

  headers.set("X-Plan", planLabel);
  headers.set("X-User-Has-Account", entitlements.userHasAccount ? "1" : "0");
  headers.set("X-Can-Voice", entitlements.capabilities.voice ? "1" : "0");
  headers.set("X-Can-Photos", entitlements.capabilities.photos ? "1" : "0");
  headers.set(
    "X-Can-Links",
    entitlements.capabilities.linksVisuals ? "1" : "0",
  );

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
        !entitlements.threadId ||
        hasScopeCues(lastUserMessage) ||
        !SCOPE_CACHE.has(entitlements.threadId);
      let scopeText = "";

      const scopeStart = Date.now();
      logEvent("[ai] scope-control start");
      if (shouldRecomputeScope) {
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
        scopeText = SCOPE_CACHE.get(entitlements.threadId)?.text ?? "";
      }
      logEvent("[ai] scope-control end", {
        ms: Date.now() - scopeStart,
        cached: !shouldRecomputeScope,
      });
      logEvent("[ai] verifier start");
      logEvent("[ai] verifier end", { ms: 0 });

      const scopeClassification = parseScopeFromText(scopeText);
      if (
        (entitlements.userPlan === "small_fix" &&
          (scopeClassification === "medium" || scopeClassification === "big")) ||
        (entitlements.userPlan === "medium_fix" && scopeClassification === "big")
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
        logEvent("[ai] response plan mismatch");
        return applyHeaders(
          NextResponse.json({
            text,
            entitlements: clientEntitlements,
            actions,
            gating,
          }),
        );
      }

      logEvent("[ai] primary start");
      const primaryStart = Date.now();
      const primaryInput = [
        "SCOPE_CONTROL:",
        scopeText,
        "CAPABILITIES:",
        `voice=${entitlements.capabilities.voice ? "yes" : "no"}`,
        `photos=${entitlements.capabilities.photos ? "yes" : "no"}`,
        `linksVisuals=${entitlements.capabilities.linksVisuals ? "yes" : "no"}`,
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
          image_url: attachment.dataUrl,
          detail: "auto" as const,
        })),
      ];

      const primaryResponse = await openai.responses.create({
        model,
        input: [
          { role: "system", content: primaryPrompt.trim() },
          { role: "user", content: primaryContent },
        ],
      });
      const outputText = getResponseOutputText(primaryResponse);
      logEvent("[ai] primary end", { ms: Date.now() - primaryStart });
      logEvent("[ai] response json");

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
          [...body!.messages].reverse().find((m) => m.role === "user")?.content ??
          "";
        const shouldRecomputeScope =
          !entitlements.threadId ||
          hasScopeCues(lastUserMessage) ||
          !SCOPE_CACHE.has(entitlements.threadId);
        let scopeText = "";

        const scopeStart = Date.now();
        logEvent("[ai] scope-control start");
        if (shouldRecomputeScope) {
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
          scopeText = SCOPE_CACHE.get(entitlements.threadId)?.text ?? "";
        }
        logEvent("[ai] scope-control end", {
          ms: Date.now() - scopeStart,
          cached: !shouldRecomputeScope,
        });
        logEvent("[ai] verifier start");
        logEvent("[ai] verifier end", { ms: 0 });

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
          logEvent("[ai] response plan mismatch", {
            plan: entitlements.userPlan,
            scope: scopeClassification,
            threadId: entitlements.threadId,
          });
          if (process.env.NODE_ENV === "development") {
            console.debug("[ai] gate:plan_mismatch", {
              plan: entitlements.userPlan,
              scope: scopeClassification,
              threadId: entitlements.threadId,
            });
          }
          sendEvent("actions", { actions, gating });
          sendEvent("delta", { text });
          sendEvent("done", {});
          controller.close();
          return;
        }

        logEvent("[ai] primary start");
        const primaryStart = Date.now();
        const primaryInput = [
          "SCOPE_CONTROL:",
          scopeText,
          "CAPABILITIES:",
          `voice=${entitlements.capabilities.voice ? "yes" : "no"}`,
          `photos=${entitlements.capabilities.photos ? "yes" : "no"}`,
          `linksVisuals=${entitlements.capabilities.linksVisuals ? "yes" : "no"}`,
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
              image_url: attachment.dataUrl,
              detail: "auto" as const,
            })),
          ];

        const primaryStream = await openai.responses.create({
          model,
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
