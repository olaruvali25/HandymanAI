"use client";

import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/shallow";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAssistantApi,
  useAssistantState,
  useLocalRuntime,
  type ChatModelAdapter,
  type TextMessagePart,
  type ThreadUserMessagePart,
  type ThreadMessage,
} from "@assistant-ui/react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuSkeleton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import ShimmerText from "@/components/kokonutui/shimmer-text";
import {
  CHAT_MAX_IMAGE_ATTACHMENT_BYTES,
  type ChatAttachment,
  type ChatMessageAction,
  type ChatMessageRole,
} from "@/lib/schemas/chat";
import {
  ClientEntitlementsSchema,
  type ClientEntitlements,
} from "@/lib/schemas/entitlements";
import {
  entitlementsQueryKey,
  useEntitlementsQuery,
} from "@/lib/queries/entitlements";
import { useUserPreferencesStore } from "@/lib/stores/user-preferences";
import { setStoredCredits } from "@/lib/credits";
import { env } from "@/env";
import { cn } from "@/lib/utils";

type SpeechRecognitionResultLike = {
  transcript?: string;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type Entitlements = ClientEntitlements;

type HistoryThread = {
  id: Id<"chatThreads">;
  title: string;
  updatedAt: number;
  lastPreview: string;
};

type HistoryMessage = {
  role: ChatMessageRole;
  contentText: string;
  createdAt: number;
  attachments?: ChatAttachment[];
  actions?: ChatMessageAction[];
};

const defaultEntitlements: Entitlements = {
  userHasAccount: false,
  userPlan: "none",
  remainingReplies: null,
  credits: undefined,
  remainingSource: undefined,
  capabilities: {
    voice: false,
    photos: false,
    linksVisuals: false,
    history: false,
    favorites: false,
    premiumVisuals: "none",
    photoLimit: null,
  },
  gating: {
    must_prompt_signup_after_this: false,
    must_prompt_payment_after_this: false,
  },
};

const PremiumBackground = () => (
  <div className="mesh-container">
    <div
      className="mesh-blob animate-mesh bg-[rgba(255,122,26,0.18)]"
      style={{
        width: "50%",
        height: "60%",
        top: "-10%",
        left: "25%",
        animationDelay: "0s",
      }}
    />
    <div
      className="mesh-blob animate-mesh bg-[rgba(59,198,255,0.12)]"
      style={{
        width: "40%",
        height: "50%",
        bottom: "-10%",
        left: "-5%",
        animationDelay: "-5s",
      }}
    />
    <div
      className="mesh-blob animate-mesh bg-[rgba(255,198,120,0.1)]"
      style={{
        width: "45%",
        height: "45%",
        top: "20%",
        right: "-10%",
        animationDelay: "-10s",
      }}
    />
  </div>
);

const FixlyLogo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-3", className)}>
    <div className="flex h-12 w-12 rotate-3 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] shadow-[var(--accent)]/20 shadow-lg">
      <WrenchIcon className="h-7 w-7 -rotate-3 text-white" />
    </div>
    <div className="flex flex-col text-left">
      <span className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
        Fixly
      </span>
      <span className="mt-1 text-[10px] leading-none font-bold tracking-[0.2em] text-[var(--accent)] uppercase opacity-80">
        Handyman AI
      </span>
    </div>
  </div>
);

const EmptyStateHero = ({
  onSuggestionClick,
}: {
  onSuggestionClick?: (text: string) => void;
}) => (
  <div className="animate-in fade-in zoom-in relative z-10 flex flex-col items-center justify-center px-6 text-center duration-700">
    <FixlyLogo className="mb-12" />
    <h1 className="font-display max-w-xl text-4xl leading-tight font-semibold text-[var(--text)] md:text-5xl">
      What can I help you <span className="text-[var(--accent)]">fix</span>{" "}
      today?
    </h1>
    <p className="mt-6 max-w-lg text-lg text-[var(--muted)] opacity-80">
      Snap a photo or describe the issue. From leaky faucets to broken
      appliances, {"I'm"} here to guide you.
    </p>

    <div className="mt-12 flex flex-wrap justify-center gap-3 opacity-90">
      {[
        "Broken dishwasher",
        "Leaking pipe",
        "Wobbly chair",
        "Light switch help",
      ].map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSuggestionClick?.(suggestion)}
          className="cursor-pointer rounded-full border border-[var(--border)] bg-[var(--surface)]/40 px-5 py-2.5 text-sm font-medium text-[var(--text)] transition-all hover:scale-105 hover:border-[var(--accent)]/50 hover:bg-[var(--surface)]"
        >
          {suggestion}
        </button>
      ))}
    </div>
  </div>
);

const ThreadMessageSkeleton = ({ isUser }: { isUser?: boolean }) => (
  <div
    className={cn(
      "flex w-full animate-pulse flex-col gap-2 py-4",
      isUser ? "items-end" : "items-start",
    )}
  >
    <div
      className={cn("h-4 rounded-lg bg-white/5", isUser ? "w-2/3" : "w-3/4")}
    />
    <div
      className={cn("h-4 rounded-lg bg-white/5", isUser ? "w-1/2" : "w-2/3")}
    />
    {!isUser && <div className="h-4 w-1/2 rounded-lg bg-white/5" />}
  </div>
);

const ThreadLoadingState = () => (
  <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-4 pb-6">
    <ThreadMessageSkeleton isUser />
    <ThreadMessageSkeleton />
    <ThreadMessageSkeleton isUser />
    <ThreadMessageSkeleton />
  </div>
);

type ActionItem = ChatMessageAction;

type MessageActions = {
  actions: ActionItem[];
  gating?: {
    blocked: boolean;
    reason: string;
  };
};

type UiAttachment = {
  id: string;
  kind: "image" | "file";
  name: string;
  mime: string;
  size: number;
  previewUrl?: string;
};

const EntitlementsContext = createContext<{
  entitlements: Entitlements;
  entitlementsSource: "init" | "api";
  messageActions: MessageActions | null;
  setEntitlements: (value: Entitlements, source?: "init" | "api") => void;
  setMessageActions: (actions: MessageActions | null) => void;
}>({
  entitlements: defaultEntitlements,
  entitlementsSource: "init",
  messageActions: null,
  setEntitlements: () => {},
  setMessageActions: () => {},
});

const useEntitlements = () => useContext(EntitlementsContext);

const useIsClient = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

const ImageViewerContext = createContext<{
  openImage: (url: string, name?: string) => void;
} | null>(null);

const useImageViewer = () => {
  const context = useContext(ImageViewerContext);
  return (
    context ?? {
      openImage: () => {},
    }
  );
};

const extractText = (message: ThreadMessage) => {
  if (typeof message.content === "string") return message.content;
  return message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
};

const buildPayloadMessages = (messages: readonly ThreadMessage[]) => {
  return messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant",
    )
    .map((message) => ({
      role: message.role,
      content: extractText(message).trim(),
    }))
    .filter((message) => message.content.length > 0);
};

const buildHistoryContent = (
  message: HistoryMessage,
): Array<
  TextMessagePart | { type: "image"; image: string; filename?: string }
> => {
  const parts: Array<
    TextMessagePart | { type: "image"; image: string; filename?: string }
  > = [];
  if (message.contentText.trim()) {
    parts.push({ type: "text", text: message.contentText });
  }
  const attachments = message.attachments ?? [];
  for (const attachment of attachments) {
    const url = attachment.url ?? attachment.dataUrl;
    if (!url) continue;
    parts.push({
      type: "image",
      image: url,
      filename: attachment.name,
    });
  }
  return parts.length > 0 ? parts : [{ type: "text" as const, text: "" }];
};

const createChatAdapter = (options?: {
  onEntitlements?: (entitlements: Entitlements) => void;
  onMessageActions?: (actions: MessageActions | null) => void;
  anonymousId?: string | null;
  threadId?: string | null;
  uploadAttachments?: (
    parts: Array<{ type: "image"; image: string; filename?: string }>,
    messageId?: string,
  ) => Promise<ChatAttachment[]>;
  getRegisteredAttachments?: (messageId?: string) => ChatAttachment[] | null;
  registerAttachments?: (
    messageId: string | undefined,
    attachments: ChatAttachment[],
  ) => void;
}): ChatModelAdapter => ({
  async *run({ messages, abortSignal }) {
    options?.onMessageActions?.(null);
    const payload = buildPayloadMessages(messages);
    const lastUserMessage = [...payload]
      .reverse()
      .find((message) => message.role === "user")?.content;
    const fallbackLocale =
      typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "en-US";
    const locale = lastUserMessage
      ? detectLanguageCode(lastUserMessage, fallbackLocale)
      : detectLanguageCode("", fallbackLocale);
    const userCountry = getCountryFromLocale(fallbackLocale);

    try {
      const lastMessage = messages[messages.length - 1];
      const lastContent = lastMessage?.content;
      const imageParts = Array.isArray(lastContent)
        ? lastContent.filter(
            (
              part,
            ): part is { type: "image"; image: string; filename?: string } =>
              typeof part === "object" &&
              part !== null &&
              "type" in part &&
              (part as { type?: string }).type === "image" &&
              "image" in part,
          )
        : [];
      const messageId =
        lastMessage && typeof lastMessage === "object" && "id" in lastMessage
          ? String((lastMessage as { id?: string }).id ?? "")
          : undefined;
      let uploadedAttachments: ChatAttachment[] = [];
      if (imageParts.length > 0) {
        const cached = options?.getRegisteredAttachments?.(messageId);
        if (cached && cached.length > 0) {
          uploadedAttachments = cached;
        } else if (options?.uploadAttachments) {
          uploadedAttachments = await options.uploadAttachments(
            imageParts,
            messageId,
          );
          if (uploadedAttachments.length > 0) {
            options?.registerAttachments?.(messageId, uploadedAttachments);
          }
        }
        if (uploadedAttachments.length === 0) {
          throw new Error("ATTACHMENTS_FAILED");
        }
      }
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payload,
          userCountry,
          userLanguage: locale,
          threadContext: "web-chat",
          threadId: options?.threadId ?? undefined,
          anonymousId: options?.anonymousId ?? undefined,
          attachments:
            messages[messages.length - 1]?.role === "user" &&
            uploadedAttachments.length > 0
              ? uploadedAttachments
              : undefined,
        }),
        signal: abortSignal,
      });

      if (!response.ok || !response.body) {
        let errorMessage = "Chat API error";
        try {
          const errorPayload = (await response.json()) as {
            error?: string;
            entitlements?: unknown;
            actions?: MessageActions;
            assistantMessage?: string;
          };
          const entitlements = ClientEntitlementsSchema.safeParse(
            errorPayload?.entitlements,
          );
          if (entitlements.success) {
            options?.onEntitlements?.(entitlements.data);
          }
          if (errorPayload?.error) {
            errorMessage = errorPayload.error;
          }
          if (errorPayload?.actions) {
            options?.onMessageActions?.(errorPayload.actions);
          }
          if (
            errorPayload?.error === "INSUFFICIENT_CREDITS" &&
            errorPayload.assistantMessage
          ) {
            yield {
              content: [{ type: "text", text: errorPayload.assistantMessage }],
              status: { type: "complete", reason: "stop" },
            };
            return;
          }
        } catch {
          // ignore parse failures
        }
        throw new Error(errorMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundaryIndex = buffer.indexOf("\n\n");
        while (boundaryIndex !== -1) {
          const rawEvent = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);
          boundaryIndex = buffer.indexOf("\n\n");

          let eventName = "message";
          let data = "";

          for (const line of rawEvent.split("\n")) {
            if (line.startsWith("event:")) {
              eventName = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              const value = line.slice(5).replace(/^ /, "");
              data = data ? `${data}\n${value}` : value;
            }
          }

          if (eventName === "meta") {
            try {
              const payload = JSON.parse(data) as {
                entitlements?: unknown;
              };
              const entitlements = ClientEntitlementsSchema.safeParse(
                payload.entitlements,
              );
              if (entitlements.success) {
                options?.onEntitlements?.(entitlements.data);
              }
            } catch {
              continue;
            }
          }

          if (eventName === "actions") {
            try {
              const payload = JSON.parse(data) as MessageActions;
              if (payload?.actions?.length) {
                options?.onMessageActions?.(payload);
              }
            } catch {
              continue;
            }
          }

          if (eventName === "delta") {
            try {
              const payload = JSON.parse(data) as { text?: string };
              const text = payload.text ?? "";
              if (text) {
                assistantText += text;
                yield {
                  content: [{ type: "text", text: assistantText }],
                };
              }
            } catch {
              continue;
            }
          }

          if (eventName === "done") {
            yield {
              content: [{ type: "text", text: assistantText }],
              status: { type: "complete", reason: "stop" },
            };
            return;
          }

          if (eventName === "error") {
            yield {
              content: [
                {
                  type: "text",
                  text: "Sorry, something went wrong. Try again.",
                },
              ],
              status: {
                type: "incomplete",
                reason: "error",
                error: "api_error",
              },
            };
            return;
          }
        }
      }

      if (assistantText.length > 0) {
        yield {
          content: [{ type: "text", text: assistantText }],
          status: { type: "complete", reason: "stop" },
        };
      }
    } catch (error) {
      if (abortSignal.aborted) {
        yield {
          content: [],
          status: { type: "incomplete", reason: "cancelled" },
        };
        return;
      }

      const messageText =
        error instanceof Error && error.message !== "ATTACHMENTS_FAILED"
          ? error.message
          : "We could not reach the server. Please try again.";
      yield {
        content: [
          {
            type: "text",
            text: messageText,
          },
        ],
        status: { type: "incomplete", reason: "error", error: "api_error" },
      };
      return;
    }
  },
});

const detectLanguage = (text: string, fallback: string) => {
  const lower = text.toLowerCase();
  const has = (pattern: RegExp) => pattern.test(lower);

  if (has(/\b(que|para|como|pero|gracias)\b/)) return "es-ES";
  if (has(/\b(und|nicht|bitte|danke|ich)\b/)) return "de-DE";
  if (has(/\b(het|niet|dank|als|maar)\b/)) return "nl-NL";
  if (has(/\b(oui|non|merci|avec|pour)\b/)) return "fr-FR";
  if (has(/\b(nao|obrigado|por favor|com)\b/)) return "pt-PT";
  if (has(/\b(ciao|grazie|per favore|con)\b/)) return "it-IT";
  if (has(/\b(si|sau|pentru|te rog|nu)\b/)) return "ro-RO";

  return fallback;
};

const detectLanguageCode = (text: string, fallback: string) => {
  const locale = detectLanguage(text, fallback);
  return locale.split("-")[0] || fallback;
};

const getCountryFromLocale = (locale: string) => {
  const parts = locale.split("-");
  return parts[1] || "unknown";
};

const dataUrlToBlob = (dataUrl: string) => {
  const [meta, base64] = dataUrl.split(",");
  if (!meta || !base64) {
    throw new Error("Invalid data URL.");
  }
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

const buildGuestChatId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `guest-${Date.now()}`;
};

const CameraIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-5 w-5", className)}
  >
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

const MicIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-5 w-5", className)}
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const ArrowUpIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-5 w-5", className)}
  >
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const SquareIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("h-4 w-4", className)}
  >
    <rect x="7" y="7" width="10" height="10" rx="2" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className={cn("h-4 w-4", className)}
  >
    <path d="M6 6l12 12" />
    <path d="M18 6l-12 12" />
  </svg>
);

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-5 w-5", className)}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const AttachmentIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className={cn("h-5 w-5", className)}
  >
    <path d="M12 6v9a3 3 0 0 1-6 0V7a5 5 0 0 1 10 0v8a7 7 0 0 1-14 0V8" />
  </svg>
);

const formatFileSize = (size?: number) => {
  if (!size || !Number.isFinite(size)) return "";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
};

const getUiAttachments = (
  content: ThreadMessage["content"],
): UiAttachment[] => {
  if (!Array.isArray(content)) return [];
  return content
    .map((part, index) => {
      if (part.type === "image" && "image" in part) {
        return {
          id: `image-${index}`,
          kind: "image",
          name: (part as { filename?: string }).filename ?? "Image",
          mime: "image",
          size: 0,
          previewUrl: (part as { image: string }).image,
        };
      }
      if (part.type === "file") {
        const file = part as {
          filename?: string;
          mimeType?: string;
        };
        return {
          id: `file-${index}`,
          kind: "file",
          name: file.filename ?? "Attachment",
          mime: file.mimeType ?? "",
          size: 0,
        };
      }
      return null;
    })
    .filter((item): item is UiAttachment => item !== null);
};

const ChatMessage = () => {
  const { messageActions } = useEntitlements();
  const { openImage } = useImageViewer();
  const role = useAssistantState((state) => state.message.role);
  const isUser = role === "user";
  const status = useAssistantState((state) => state.message.status);
  const messageContent = useAssistantState(
    (state) => state.message.content as ThreadMessage["content"],
  );
  const isError =
    role === "assistant" &&
    status?.type === "incomplete" &&
    status.reason === "error";
  const isLastAssistant = useAssistantState((state) => {
    const messages = state.thread.messages;
    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");
    if (!lastAssistant) return false;
    if ("id" in lastAssistant && "id" in state.message) {
      return lastAssistant.id === (state.message as typeof lastAssistant).id;
    }
    return lastAssistant === state.message;
  });

  const attachments = getUiAttachments(messageContent);
  const imageAttachments = attachments.filter((item) => item.kind === "image");
  const fileAttachments = attachments.filter((item) => item.kind === "file");
  const textContent = Array.isArray(messageContent)
    ? messageContent
        .filter((part) => part.type === "text" && "text" in part)
        .map((part) => (part as { text: string }).text)
        .filter(Boolean)
        .join("\n")
    : "";

  const isImageOnly =
    imageAttachments.length > 0 &&
    fileAttachments.length === 0 &&
    textContent.trim().length === 0;

  const isEmptyAssistant =
    role === "assistant" &&
    textContent.trim().length === 0 &&
    attachments.length === 0;

  if (isEmptyAssistant) return null;

  return (
    <MessagePrimitive.Root
      className={cn("px-4", isImageOnly ? "py-1" : "py-2")}
    >
      <div
        className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={
            isImageOnly
              ? "inline-flex max-w-[85%] flex-col gap-2 text-left"
              : `max-w-[85%] rounded-2xl px-5 py-3 text-left shadow-sm ${
                  isUser
                    ? "bg-[var(--accent)] text-white"
                    : isError
                      ? "border border-red-500/40 bg-red-500/10 text-sm text-red-100"
                      : "border border-[var(--border)] bg-[var(--bg-elev)] text-base text-[var(--text)]"
                }`
          }
        >
          <div className="flex flex-col gap-3">
            {imageAttachments.length > 0 && (
              <div
                className={
                  isImageOnly
                    ? "flex flex-wrap gap-2"
                    : "grid grid-cols-3 gap-2"
                }
              >
                {imageAttachments.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() =>
                      image.previewUrl
                        ? openImage(image.previewUrl, image.name)
                        : null
                    }
                    className={cn(
                      "block cursor-pointer overflow-hidden rounded-lg",
                      isImageOnly && "h-24 w-24",
                    )}
                    aria-label={`Open ${image.name}`}
                  >
                    <Image
                      src={image.previewUrl ?? ""}
                      alt={image.name}
                      width={220}
                      height={220}
                      className={cn(
                        "rounded-lg object-cover",
                        isImageOnly ? "h-24 w-24" : "h-24 w-full",
                      )}
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}
            {fileAttachments.length > 0 && (
              <div className="flex flex-col gap-2">
                {fileAttachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-2 text-xs text-[var(--text)]"
                  >
                    <AttachmentIcon />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{file.name}</div>
                      {file.size ? (
                        <div className="text-[10px] text-[var(--muted)]">
                          {formatFileSize(file.size)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {textContent ? (
              <div className="whitespace-pre-wrap">{textContent}</div>
            ) : !Array.isArray(messageContent) ? (
              <MessagePrimitive.Content />
            ) : null}
          </div>
        </div>
      </div>
      {!isUser && isLastAssistant && messageActions?.actions?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {messageActions.actions.map((action) => {
            const isPrimary = action.variant !== "secondary";
            return (
              <a
                key={`${action.label}-${action.href}`}
                href={action.href}
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition ${
                  isPrimary
                    ? "bg-[var(--accent)] text-black hover:bg-[var(--accent-soft)]"
                    : "border border-[var(--border)] text-white hover:border-white/40"
                }`}
              >
                {action.label}
              </a>
            );
          })}
        </div>
      ) : null}
    </MessagePrimitive.Root>
  );
};

const TypingIndicator = () => {
  const isRunning = useAssistantState((state) => state.thread.isRunning);
  const lastAssistantText = useAssistantState((state) => {
    const messages = state.thread.messages;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "assistant") {
        return extractText(messages[i]).trim();
      }
    }
    return "";
  });
  const hasContent = lastAssistantText.length > 0;

  if (!isRunning || hasContent) return null;

  return (
    <div className="px-4 py-2">
      <div className="flex w-full flex-col items-start gap-2">
        <ShimmerText
          text="Processing your request..."
          className="from-(--accent)! via-(--accent-soft)! to-(--accent)! bg-size-[200%_100%]! text-xs! font-semibold!"
        />
        <div className="typing-bubble max-w-[85%] rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] px-5 py-3 text-[var(--text)]">
          <div className="typing-dots">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      </div>
    </div>
  );
};

type ComposerProps = {
  selectedFiles: File[];
  setSelectedFiles: Dispatch<SetStateAction<File[]>>;
  draft: string;
  setDraft: (value: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (value: string) => void;
  lastUserText: string;
  speechEnabled: boolean;
  setSpeechEnabled: (value: boolean) => void;
  voiceGender: "female" | "male";
  setVoiceGender: (value: "female" | "male") => void;
  canVoice: boolean;
  canPhotos: boolean;
};

const Composer = ({
  selectedFiles,
  setSelectedFiles,
  draft,
  setDraft,
  selectedLanguage,
  setSelectedLanguage,
  lastUserText,
  speechEnabled,
  setSpeechEnabled,
  voiceGender,
  setVoiceGender,
  canVoice,
  canPhotos,
}: ComposerProps) => {
  const api = useAssistantApi();
  const { openImage } = useImageViewer();
  const isRunning = useAssistantState((state) => state.thread.isRunning);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const speechRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef<string>("");
  const draftRef = useRef<string>(draft);
  const shouldListenRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isPopoverReady = useIsClient();
  const filesWithIndex = useMemo(
    () => selectedFiles.map((file, index) => ({ file, index })),
    [selectedFiles],
  );
  const imageItems = useMemo(
    () => filesWithIndex.filter(({ file }) => file.type.startsWith("image/")),
    [filesWithIndex],
  );
  const otherItems = useMemo(
    () => filesWithIndex.filter(({ file }) => !file.type.startsWith("image/")),
    [filesWithIndex],
  );
  const imagePreviews = useMemo(
    () =>
      imageItems.map(({ file, index }) => ({
        index,
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [imageItems],
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [imagePreviews]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const isEmpty = !draft.trim() && selectedFiles.length === 0;

  const handleCameraClick = () => {
    if (!canPhotos) return;
    cameraInputRef.current?.click();
  };

  const handleAttachmentClick = () => {
    if (!canPhotos) return;
    fileInputRef.current?.click();
  };

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      setSelectedFiles((prev) => [...prev, ...files]);
    },
    [setSelectedFiles],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      if (!canPhotos) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i += 1) {
        if (items[i]?.type.indexOf("image") !== -1) {
          const file = items[i]?.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        event.preventDefault();
        addFiles(pastedFiles);
      }
    },
    [canPhotos, addFiles],
  );

  const handleCameraChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length === 0) return;
    addFiles(files);
    event.target.value = "";
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    addFiles(files);
    event.target.value = "";
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const { SpeechRecognition, webkitSpeechRecognition } =
      window as WindowWithSpeechRecognition;
    const SpeechRecognitionConstructor =
      SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) return;

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      baseTextRef.current = draftRef.current || "";
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const alternative = result?.[0];
        transcript += alternative?.transcript ?? "";
      }

      const base = baseTextRef.current.trimEnd();
      const next = `${base}${base ? " " : ""}${transcript.trim()}`;
      setDraft(next);
    };

    recognition.onerror = () => {
      setMicError("Microphone access was blocked.");
      setIsListening(false);
      shouldListenRef.current = false;
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        recognition.start();
        return;
      }
      setIsListening(false);
    };

    speechRef.current = recognition;

    return () => {
      speechRef.current = null;
    };
  }, [api, setDraft]);

  const handleMicClick = () => {
    if (!canVoice) return;
    const recognition = speechRef.current;
    if (!recognition) {
      setMicError("Voice input isn't supported in this browser.");
      return;
    }

    setMicError(null);

    if (isListening) {
      shouldListenRef.current = false;
      recognition.stop();
      return;
    }

    const fallback =
      typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "en-US";
    const inferred =
      selectedLanguage === "auto"
        ? detectLanguage(lastUserText, fallback)
        : selectedLanguage;
    recognition.lang = inferred;
    shouldListenRef.current = true;
    recognition.start();
  };

  const handleRemoveFile = () => {
    setSelectedFiles([]);
  };

  useEffect(() => {
    if (selectedFiles.length > 0) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  }, [selectedFiles.length]);

  const buildUserContent = async (
    text: string,
    files: File[],
  ): Promise<ThreadUserMessagePart[]> => {
    const content: ThreadUserMessagePart[] = [];

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        content.push({
          type: "image",
          image: base64,
          filename: file.name,
        });
      } else {
        const data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        content.push({
          type: "file",
          filename: file.name,
          data,
          mimeType: file.type,
        });
      }
    }

    if (text) {
      content.push({ type: "text", text });
    }

    return content;
  };

  return (
    <>
      <ComposerPrimitive.Root
        className="group/composer glass-panel-heavy hover:shadow-soft mx-auto mb-6 w-full max-w-3xl overflow-hidden rounded-[32px] p-2 transition-all"
        data-empty={isEmpty}
        data-running={isRunning}
      >
        {selectedFiles.length > 0 && (
          <div className="animate-in slide-in-from-bottom-4 mx-2 mb-2 flex flex-col gap-3 rounded-[24px] bg-[var(--bg)]/40 p-4 duration-300">
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {imagePreviews.map((preview) => (
                  <div
                    key={`${preview.index}-${preview.url}`}
                    className="relative flex h-[100px] w-[100px] items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 shadow-md transition-transform hover:scale-105"
                  >
                    <button
                      type="button"
                      onClick={() => openImage(preview.url, preview.name)}
                      className="h-full w-full cursor-pointer"
                      aria-label={`Open ${preview.name}`}
                    >
                      <Image
                        src={preview.url}
                        alt={preview.name}
                        width={100}
                        height={100}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles((prev) =>
                          prev.filter((_, idx) => idx !== preview.index),
                        )
                      }
                      className="absolute top-1.5 right-1.5 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-red-500"
                      aria-label="Remove image"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {otherItems.length > 0 && (
              <div className="flex flex-col gap-2">
                {otherItems.map(({ file, index }) => (
                  <div
                    key={`${index}-${file.name}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 px-4 py-3 shadow-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)]">
                        <AttachmentIcon />
                      </div>
                      <span className="truncate font-medium text-[var(--text)]">
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles((prev) =>
                          prev.filter((_, idx) => idx !== index),
                        )
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-all hover:bg-red-500/10 hover:text-red-500"
                      aria-label="Remove file"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase transition-colors hover:text-[var(--accent)]"
              >
                Clear all files
              </button>
              <span className="text-[10px] text-[var(--muted)] opacity-60">
                {selectedFiles.length} file
                {selectedFiles.length === 1 ? "" : "s"} attached
              </span>
            </div>
          </div>
        )}

        {micError && (
          <div className="animate-in slide-in-from-top-1 mx-4 mb-2 text-[10px] font-bold tracking-tight text-red-400/80 uppercase">
            {micError}
          </div>
        )}

        <div className="flex items-end gap-1.5 px-3 py-2.5">
          <button
            type="button"
            onClick={handleCameraClick}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] transition-all hover:bg-[var(--surface)] hover:text-[var(--text)] active:scale-95",
              !canPhotos && "cursor-not-allowed opacity-40",
            )}
            disabled={!canPhotos}
            title="Attach a photo"
          >
            <CameraIcon className="h-[22px] w-[22px]" />
          </button>

          <div className="relative flex min-h-[40px] flex-1 items-center overflow-hidden">
            <ComposerPrimitive.Input
              placeholder="Describe the issue..."
              className="w-full resize-none bg-transparent px-1 py-2 text-base leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--muted)]/40"
              submitOnEnter={false}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onPaste={handlePaste}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const text = draft.trim();
                  if (!text && selectedFiles.length === 0) return;
                  const content = await buildUserContent(text, selectedFiles);
                  if (content.length > 0) {
                    api.thread().append({ role: "user", content });
                    setDraft("");
                    handleRemoveFile();
                  }
                }
              }}
            />
          </div>

          <div className="flex items-center gap-1">
            {isPopoverReady ? (
              <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl transition-all active:scale-95",
                      isMenuOpen
                        ? "rotate-45 bg-[var(--surface)] text-[var(--text)]"
                        : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
                    )}
                    aria-label="More options"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  side="top"
                  sideOffset={12}
                  className="glass-panel w-64 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/95 p-2 text-[var(--text)] shadow-2xl"
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleAttachmentClick();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] transition-colors hover:bg-[var(--surface)]"
                  >
                    <AttachmentIcon className="h-4 w-4" />
                    <span>Upload Documents</span>
                  </button>

                  <div className="my-1.5 h-px bg-[var(--border)]" />

                  <div className="px-3 py-2 text-left">
                    <label className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase opacity-60">
                      Language Support
                    </label>
                    <Select
                      value={selectedLanguage}
                      onValueChange={setSelectedLanguage}
                    >
                      <SelectTrigger className="mt-2 h-9 border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:ring-[var(--accent)]">
                        <SelectValue placeholder="Automatic Detection" />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--border)] bg-[var(--bg)] text-[var(--text)]">
                        <SelectItem value="auto">
                          Automatic Detection
                        </SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es-ES">Spanish</SelectItem>
                        <SelectItem value="de-DE">German</SelectItem>
                        <SelectItem value="fr-FR">French</SelectItem>
                        <SelectItem value="ro-RO">Romanian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="my-1.5 h-px bg-[var(--border)]" />

                  <button
                    type="button"
                    onClick={() => {
                      if (canVoice) setSpeechEnabled(!speechEnabled);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all",
                      speechEnabled
                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "text-[var(--text)] hover:bg-[var(--surface)]",
                      !canVoice && "cursor-not-allowed opacity-50",
                    )}
                    disabled={!canVoice}
                  >
                    <span>Voice Integration</span>
                    <div
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        speechEnabled
                          ? "bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"
                          : "bg-[var(--muted)]",
                      )}
                    />
                  </button>

                  <div className="mt-1 px-1 pb-1">
                    <div className="flex gap-1 rounded-xl bg-[var(--surface)]/50 p-1">
                      <button
                        type="button"
                        onClick={() => setVoiceGender("female")}
                        className={cn(
                          "flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all",
                          voiceGender === "female"
                            ? "bg-[var(--bg-elev)] text-[var(--text)] shadow-sm"
                            : "text-[var(--muted)] hover:text-[var(--text)]",
                        )}
                      >
                        Female
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoiceGender("male")}
                        className={cn(
                          "flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all",
                          voiceGender === "male"
                            ? "bg-[var(--bg-elev)] text-[var(--text)] shadow-sm"
                            : "text-[var(--muted)] hover:text-[var(--text)]",
                        )}
                      >
                        Male
                      </button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all active:scale-95",
                  isMenuOpen
                    ? "rotate-45 bg-[var(--surface)] text-[var(--text)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
                )}
                aria-label="More options"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMicClick}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-all active:scale-95",
                  isListening
                    ? "bg-red-500"
                    : "bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] hover:scale-105 hover:brightness-110",
                  !canVoice && "opacity-50",
                )}
                disabled={!canVoice}
              >
                {isListening ? (
                  <SquareIcon className="h-4 w-4" />
                ) : (
                  <MicIcon className="h-[22px] w-[22px]" />
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  const text = draft.trim();
                  if (!text && selectedFiles.length === 0) return;
                  const content = await buildUserContent(text, selectedFiles);
                  if (content.length > 0) {
                    api.thread().append({ role: "user", content });
                    setDraft("");
                    handleRemoveFile();
                  }
                }}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] text-white shadow-lg transition-all active:scale-95",
                  selectedFiles.length === 0 && isEmpty
                    ? "pointer-events-none scale-75 opacity-0"
                    : "hover:scale-105 hover:brightness-110",
                )}
                disabled={selectedFiles.length === 0 && isEmpty}
              >
                <ArrowUpIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </ComposerPrimitive.Root>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleCameraChange}
        disabled={!canPhotos}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,application/pdf,text/plain"
        multiple
        className="hidden"
        onChange={handleAttachmentChange}
        disabled={!canPhotos}
      />
    </>
  );
};

const ComposerContainer = ({
  children,
  isVisible,
}: {
  children: React.ReactNode;
  isVisible: boolean;
}) => {
  if (!isVisible) return null;
  return (
    <div className="relative z-20 shrink-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/90 to-transparent pt-4 pb-6">
      {children}
    </div>
  );
};

export default function GrokThread({
  onChatStart,
  showHistorySidebar = false,
  inlineThread = false,
  header,
  initialThreadId = null,
  onThreadChange,
}: {
  onChatStart?: () => void;
  showHistorySidebar?: boolean;
  inlineThread?: boolean;
  header?: React.ReactNode;
  initialThreadId?: string | null;
  onThreadChange?: (threadId: string | null) => void;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const queryClient = useQueryClient();
  const { data: initialEntitlements } = useEntitlementsQuery();
  const [guestChatId, setGuestChatId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const existing = localStorage.getItem("fixly_guest_chat_id");
    if (existing) return existing;
    if (isLoading || isAuthenticated) return null;
    const created = buildGuestChatId();
    localStorage.setItem("fixly_guest_chat_id", created);
    return created;
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const {
    selectedLanguage,
    setSelectedLanguage,
    speechEnabled,
    setSpeechEnabled,
    voiceGender,
    setVoiceGender,
  } = useUserPreferencesStore(
    useShallow((state) => ({
      selectedLanguage: state.selectedLanguage,
      setSelectedLanguage: state.setSelectedLanguage,
      speechEnabled: state.speechEnabled,
      setSpeechEnabled: state.setSpeechEnabled,
      voiceGender: state.voiceGender,
      setVoiceGender: state.setVoiceGender,
    })),
  );
  const [entitlementsSource, setEntitlementsSource] = useState<"init" | "api">(
    "init",
  );
  const entitlements = initialEntitlements ?? defaultEntitlements;
  const [messageActions, setMessageActions] = useState<MessageActions | null>(
    null,
  );
  const prevRemainingRef = useRef<number | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreadId,
  );
  const lastNotifiedThreadRef = useRef<string | null>(initialThreadId ?? null);
  const [resetThreadToken, setResetThreadToken] = useState(0);
  const notifyThreadChange = useCallback(
    (threadId: string | null) => {
      if (!onThreadChange) return;
      if (lastNotifiedThreadRef.current === threadId) return;
      lastNotifiedThreadRef.current = threadId;
      onThreadChange(threadId);
    },
    [onThreadChange],
  );
  const canUseChatHistory =
    !isLoading && (isAuthenticated || Boolean(guestChatId));
  const shouldPersistHistory =
    !isLoading && (isAuthenticated || Boolean(guestChatId));
  const threads = useQuery(
    api.chatHistory.listThreadsForUser,
    isAuthenticated && canUseChatHistory && showHistorySidebar ? {} : "skip",
  ) as HistoryThread[] | undefined;
  const threadSummary = useQuery(
    api.chatHistory.getThreadSummaryForActor,
    activeThreadId && canUseChatHistory
      ? {
          threadId: activeThreadId as Id<"chatThreads">,
          anonymousId: isAuthenticated ? undefined : (guestChatId ?? undefined),
        }
      : "skip",
  ) as
    | {
        id: Id<"chatThreads">;
        title: string;
        updatedAt: number;
        lastPreview: string;
      }
    | null
    | undefined;
  const canFetchThreadMessages =
    Boolean(activeThreadId) && Boolean(threadSummary);
  const threadMessages = useQuery(
    api.chatHistory.getThreadMessagesForActor,
    canFetchThreadMessages && canUseChatHistory
      ? {
          threadId: activeThreadId as Id<"chatThreads">,
          anonymousId: isAuthenticated ? undefined : (guestChatId ?? undefined),
        }
      : "skip",
  ) as HistoryMessage[] | undefined;
  const createThread = useMutation(api.chatHistory.createThread);
  const appendMessages = useMutation(api.chatHistory.appendMessages);
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const mergeGuestThreads = useMutation(api.chatHistory.mergeGuestThreads);
  const renameThread = useMutation(api.chatHistory.renameThread);
  const deleteThread = useMutation(api.chatHistory.deleteThread);
  const uploadedAttachmentsRef = useRef<Map<string, ChatAttachment[]>>(
    new Map(),
  );
  const getRegisteredAttachments = useCallback((messageId?: string) => {
    if (!messageId) return null;
    return uploadedAttachmentsRef.current.get(messageId) ?? null;
  }, []);
  const registerAttachments = useCallback(
    (messageId: string | undefined, attachments: ChatAttachment[]) => {
      if (!messageId || attachments.length === 0) return;
      uploadedAttachmentsRef.current.set(messageId, attachments);
    },
    [],
  );
  const uploadAttachments = useCallback(
    async (
      parts: Array<{ type: "image"; image: string; filename?: string }>,
      messageId?: string,
    ) => {
      if (parts.length === 0) return [];
      const existing = getRegisteredAttachments(messageId);
      if (existing && existing.length > 0) return existing;

      const uploaded: ChatAttachment[] = [];
      for (const part of parts) {
        try {
          const blob = dataUrlToBlob(part.image);
          if (blob.size <= 0 || blob.size > CHAT_MAX_IMAGE_ATTACHMENT_BYTES) {
            continue;
          }
          const { url } = await generateUploadUrl({});
          const upload = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": blob.type },
            body: blob,
          });
          if (!upload.ok) continue;
          const payload = (await upload.json()) as { storageId?: string };
          if (!payload.storageId) continue;
          uploaded.push({
            name: part.filename ?? "image.png",
            type: blob.type,
            size: blob.size,
            storageId: payload.storageId as Id<"_storage">,
          });
        } catch {
          continue;
        }
      }
      if (uploaded.length > 0) {
        registerAttachments(messageId, uploaded);
      }
      return uploaded;
    },
    [generateUploadUrl, getRegisteredAttachments, registerAttachments],
  );
  const setEntitlementsWithSource = useCallback(
    (value: Entitlements, source: "init" | "api" = "api") => {
      queryClient.setQueryData(entitlementsQueryKey, value);
      setEntitlementsSource(source);
    },
    [queryClient],
  );
  const chatAdapter = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      createChatAdapter({
        onEntitlements: (next) => {
          setEntitlementsWithSource(next, "api");
        },
        onMessageActions: setMessageActions,
        anonymousId: guestChatId,
        threadId: activeThreadId,
        uploadAttachments,
        getRegisteredAttachments,
        registerAttachments,
      }),
    [
      guestChatId,
      activeThreadId,
      setEntitlementsWithSource,
      uploadAttachments,
      getRegisteredAttachments,
      registerAttachments,
    ],
  );
  const runtime = useLocalRuntime(chatAdapter);
  const createGuestChatId = buildGuestChatId;
  const showEntitlementsDebug =
    env.NEXT_PUBLIC_SHOW_ENTITLEMENTS_DEBUG ?? false;

  useEffect(() => {
    if (!entitlements.capabilities.voice && speechEnabled) {
      setSpeechEnabled(false);
    }
  }, [entitlements.capabilities.voice, speechEnabled, setSpeechEnabled]);

  useEffect(() => {
    if (!entitlements.capabilities.photos && selectedFiles.length > 0) {
      setSelectedFiles([]);
    }
  }, [entitlements.capabilities.photos, selectedFiles.length]);

  useEffect(() => {
    setActiveThreadId(initialThreadId ?? null);
  }, [initialThreadId, setActiveThreadId]);

  useEffect(() => {
    if (!activeThreadId) return;
    if (isLoading) return;
    if (threadSummary === undefined) return;
    if (threadSummary !== null) return;
    setActiveThreadId(null);
    setResetThreadToken((value) => value + 1);
    notifyThreadChange(null);
  }, [
    activeThreadId,
    isLoading,
    notifyThreadChange,
    threadSummary,
    setActiveThreadId,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLoading || isAuthenticated || guestChatId) return;
    const created = buildGuestChatId();
    localStorage.setItem("fixly_guest_chat_id", created);
    setGuestChatId(created);
  }, [guestChatId, isAuthenticated, isLoading]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!guestChatId || isAuthenticated) return;
    if (localStorage.getItem("fixly_guest_chat_id") === guestChatId) return;
    localStorage.setItem("fixly_guest_chat_id", guestChatId);
  }, [guestChatId, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!guestChatId) return;
    if (typeof window === "undefined") return;
    mergeGuestThreads({ guestChatId })
      .then(() => {
        localStorage.removeItem("fixly_guest_chat_id");
        setGuestChatId(null);
      })
      .catch(() => {});
  }, [guestChatId, isAuthenticated, mergeGuestThreads]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const sourceLabel =
      entitlementsSource === "api" ? "server response" : "init";
    const remainingSource = entitlements.remainingSource ?? "unknown";
    console.debug(
      "[entitlements]",
      `remaining=${String(entitlements.remainingReplies)} from ${sourceLabel}/${remainingSource}`,
    );
    if (
      entitlementsSource === "api" &&
      typeof entitlements.remainingReplies === "number" &&
      prevRemainingRef.current !== null &&
      entitlements.remainingReplies < prevRemainingRef.current
    ) {
      console.debug(
        "[entitlements] decrement",
        `from ${prevRemainingRef.current} to ${entitlements.remainingReplies}`,
      );
    }
    if (typeof entitlements.remainingReplies === "number") {
      prevRemainingRef.current = entitlements.remainingReplies;
    }
  }, [entitlements, entitlementsSource]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof entitlements.credits !== "number") return;
    setStoredCredits(entitlements.credits);
    window.dispatchEvent(
      new CustomEvent("fixly-credits-update", {
        detail: { credits: entitlements.credits },
      }),
    );
  }, [entitlements.credits]);

  return (
    <EntitlementsContext.Provider
      value={{
        entitlements,
        entitlementsSource,
        messageActions,
        setEntitlements: setEntitlementsWithSource,
        setMessageActions,
      }}
    >
      <AssistantRuntimeProvider runtime={runtime}>
        <ChatThreadContent
          onChatStart={onChatStart}
          isAuthenticated={isAuthenticated}
          authLoading={isLoading}
          canUseChatHistory={canUseChatHistory}
          guestChatId={guestChatId}
          setGuestChatId={setGuestChatId}
          shouldPersistHistory={shouldPersistHistory}
          createGuestChatId={createGuestChatId}
          showHistorySidebar={showHistorySidebar}
          inlineThread={inlineThread}
          header={header}
          threads={threads}
          threadMessages={threadMessages}
          activeThreadId={activeThreadId}
          setActiveThreadId={setActiveThreadId}
          createThread={createThread}
          appendMessages={appendMessages}
          renameThread={renameThread}
          deleteThread={deleteThread}
          getRegisteredAttachments={getRegisteredAttachments}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          speechEnabled={speechEnabled}
          setSpeechEnabled={setSpeechEnabled}
          voiceGender={voiceGender}
          setVoiceGender={setVoiceGender}
          notifyThreadChange={notifyThreadChange}
          resetThreadToken={resetThreadToken}
        />
        {showEntitlementsDebug && <EntitlementsDebug />}
      </AssistantRuntimeProvider>
    </EntitlementsContext.Provider>
  );
}

const ChatThreadContent = ({
  onChatStart,
  isAuthenticated,
  authLoading,
  canUseChatHistory,
  guestChatId,
  setGuestChatId,
  shouldPersistHistory,
  createGuestChatId,
  showHistorySidebar,
  inlineThread,
  header,
  threads,
  threadMessages,
  activeThreadId,
  setActiveThreadId,
  createThread,
  appendMessages,
  renameThread,
  deleteThread,
  getRegisteredAttachments,
  selectedFiles,
  setSelectedFiles,
  selectedLanguage,
  setSelectedLanguage,
  speechEnabled,
  setSpeechEnabled,
  voiceGender,
  setVoiceGender,
  notifyThreadChange,
  resetThreadToken,
}: {
  onChatStart?: () => void;
  isAuthenticated: boolean;
  authLoading: boolean;
  canUseChatHistory: boolean;
  guestChatId: string | null;
  setGuestChatId: (value: string | null) => void;
  shouldPersistHistory: boolean;
  createGuestChatId: () => string;
  showHistorySidebar: boolean;
  inlineThread: boolean;
  header?: React.ReactNode;
  threads?: HistoryThread[];
  threadMessages?: HistoryMessage[];
  activeThreadId: string | null;
  setActiveThreadId: (value: string | null) => void;
  createThread: (args: {
    title?: string;
    guestChatId?: string;
  }) => Promise<Id<"chatThreads">>;
  appendMessages: (args: {
    threadId: Id<"chatThreads">;
    guestChatId?: string;
    messages: Array<{
      role: ChatMessageRole;
      contentText: string;
      createdAt?: number;
      attachments?: ChatAttachment[];
      actions?: ActionItem[];
    }>;
  }) => Promise<null>;
  renameThread: (args: {
    threadId: Id<"chatThreads">;
    title: string;
  }) => Promise<null>;
  deleteThread: (args: { threadId: Id<"chatThreads"> }) => Promise<null>;
  getRegisteredAttachments: (messageId?: string) => ChatAttachment[] | null;
  selectedFiles: File[];
  setSelectedFiles: Dispatch<SetStateAction<File[]>>;
  selectedLanguage: string;
  setSelectedLanguage: (value: string) => void;
  speechEnabled: boolean;
  setSpeechEnabled: (value: boolean) => void;
  voiceGender: "female" | "male";
  setVoiceGender: (value: "female" | "male") => void;
  notifyThreadChange?: (threadId: string | null) => void;
  resetThreadToken: number;
}) => {
  const { entitlements, messageActions, setMessageActions } = useEntitlements();
  const api = useAssistantApi();

  const handleSuggestionClick = useCallback(
    (text: string) => {
      api.thread().append({
        role: "user",
        content: [{ type: "text", text }],
      });
    },
    [api],
  );
  // Keep draft local so the input stays responsive even if composer state stalls.
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);
  const scrollRafRef = useRef<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortControllersRef = useRef<AbortController[]>([]);
  const ttsPendingAudioRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const ttsBufferRef = useRef<string>("");
  const ttsSpeakingRef = useRef(false);
  const ttsProcessedLengthRef = useRef(0);
  const ttsSequenceRef = useRef(0);
  const ttsNextPlayRef = useRef(0);
  const lastAssistantLengthRef = useRef(0);
  const loadedThreadRef = useRef<string | null>(null);
  const lastPersistedCountRef = useRef(0);
  const isPersistingRef = useRef(false);
  const isCreatingThreadRef = useRef(false);
  const activeThreadIdRef = useRef<string | null>(activeThreadId);
  const lastUserText = useAssistantState((state) => {
    const messages = state.thread.messages;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") {
        return extractText(messages[i]).trim();
      }
    }
    return "";
  });
  const isRunning = useAssistantState((state) => state.thread.isRunning);
  const lastAssistantText = useAssistantState((state) => {
    const messages = state.thread.messages;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "assistant") {
        return extractText(messages[i]).trim();
      }
    }
    return "";
  });
  const lastAssistantStatus = useAssistantState((state) => {
    const messages = state.thread.messages;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "assistant") {
        return messages[i]?.status ?? null;
      }
    }
    return null;
  });
  const lastMessageRole = useAssistantState((state) => {
    const messages = state.thread.messages;
    const last = messages[messages.length - 1];
    return last?.role ?? null;
  });
  const threadMessagesState = useAssistantState(
    (state) => state.thread.messages,
  );
  const isThreadEmpty = useAssistantState(
    (state) => state.thread.messages.length === 0,
  );
  // Track if we are currently loading/syncing a historical thread to avoid flashing the empty hero state.
  const isThreadTransitioning =
    Boolean(activeThreadId) && loadedThreadRef.current !== activeThreadId;
  const shouldShowThreadLoading =
    Boolean(activeThreadId) && threadMessagesState.length === 0;

  const [viewerImage, setViewerImage] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const openImage = useCallback((url: string, name?: string) => {
    setViewerImage({ url, name: name ?? "Image" });
  }, []);
  const imageViewerValue = useMemo(() => ({ openImage }), [openImage]);

  const updateIsAtBottom = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const distance =
      element.scrollHeight - (element.scrollTop + element.clientHeight);
    isAtBottomRef.current = distance < 120;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
    bottomRef.current?.scrollIntoView({ block: "end", behavior });
  }, []);

  useEffect(() => {
    updateIsAtBottom();
  }, [updateIsAtBottom, threadMessagesState.length]);

  useLayoutEffect(() => {
    if (!inlineThread) return;
    if (!isAtBottomRef.current) return;
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollToBottom("smooth");
    });
  }, [
    inlineThread,
    lastAssistantText,
    threadMessagesState.length,
    scrollToBottom,
  ]);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  const clearTts = () => {
    ttsAbortControllersRef.current.forEach((controller) => controller.abort());
    ttsAbortControllersRef.current = [];
    ttsPendingAudioRef.current.clear();
    ttsBufferRef.current = "";
    ttsProcessedLengthRef.current = 0;
    ttsSpeakingRef.current = false;
    audioRef.current?.pause();
    ttsSequenceRef.current = 0;
    ttsNextPlayRef.current = 0;
    lastAssistantLengthRef.current = 0;
  };

  const playNextAudio = useCallback(function playNextAudioInner() {
    if (ttsSpeakingRef.current) return;
    const audio = ttsPendingAudioRef.current.get(ttsNextPlayRef.current);
    if (!audio) return;

    ttsSpeakingRef.current = true;
    audioRef.current = audio;
    ttsPendingAudioRef.current.delete(ttsNextPlayRef.current);
    ttsNextPlayRef.current += 1;
    audio.play().catch(() => {
      ttsSpeakingRef.current = false;
      playNextAudioInner();
    });
  }, []);

  const enqueueTts = useCallback(
    (text: string) => {
      const sequence = ttsSequenceRef.current;
      ttsSequenceRef.current += 1;
      const controller = new AbortController();
      ttsAbortControllersRef.current.push(controller);
      const voice = voiceGender === "male" ? "echo" : "nova";

      fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("TTS failed");
          }
          return response.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => {
            URL.revokeObjectURL(url);
            ttsSpeakingRef.current = false;
            playNextAudio();
          };
          ttsPendingAudioRef.current.set(sequence, audio);
          playNextAudio();
        })
        .catch(() => {
          // Ignore TTS failures to avoid blocking chat.
        });
    },
    [playNextAudio, voiceGender],
  );

  useEffect(() => {
    if (!canUseChatHistory || !activeThreadId || !threadMessages) return;
    const shouldHydrate =
      loadedThreadRef.current !== activeThreadId ||
      (threadMessagesState.length === 0 && threadMessages.length > 0);
    if (!shouldHydrate) return;
    const initialMessages = threadMessages.map((message) => ({
      role: message.role,
      content: buildHistoryContent(message),
    }));
    if (threadMessagesState.length > initialMessages.length) {
      // Local runtime is ahead of server; wait for persistence to catch up.
      return;
    }
    api.thread().reset(initialMessages);
    const lastActionMessage = [...threadMessages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" && (message.actions?.length ?? 0) > 0,
      );
    if (lastActionMessage?.actions?.length) {
      const nextActions = lastActionMessage.actions;
      const currentActions = messageActions?.actions ?? null;
      const isSame =
        currentActions &&
        currentActions.length === nextActions.length &&
        currentActions.every(
          (action, index) =>
            action.type === nextActions[index]?.type &&
            action.label === nextActions[index]?.label &&
            action.href === nextActions[index]?.href &&
            action.variant === nextActions[index]?.variant,
        );
      if (!isSame) {
        setMessageActions({ actions: nextActions });
      }
    } else if (messageActions?.actions?.length) {
      setMessageActions(null);
    }
    loadedThreadRef.current = activeThreadId;
    lastPersistedCountRef.current = initialMessages.length;
  }, [
    api,
    activeThreadId,
    canUseChatHistory,
    messageActions,
    setMessageActions,
    threadMessages,
    threadMessagesState.length,
  ]);

  useEffect(() => {
    if (!activeThreadId) {
      loadedThreadRef.current = null;
      lastPersistedCountRef.current = threadMessagesState.length;
    }
  }, [activeThreadId, threadMessagesState.length]);

  useEffect(() => {
    if (!resetThreadToken) return;
    api.thread().reset();
  }, [api, resetThreadToken]);

  useEffect(() => {
    if (!notifyThreadChange) return;
    if (isRunning) return;
    if (activeThreadId) {
      if (!threadMessages) return;
      if (threadMessages.length < threadMessagesState.length) return;
    }
    notifyThreadChange(activeThreadId);
  }, [
    activeThreadId,
    isRunning,
    notifyThreadChange,
    threadMessages,
    threadMessagesState.length,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!speechEnabled) {
      window.speechSynthesis?.cancel();
      clearTts();
      return;
    }
    if (isRunning && lastMessageRole === "user") {
      window.speechSynthesis?.cancel();
      clearTts();
    }
    if (!lastAssistantText) return;
    if (
      lastAssistantStatus?.type === "incomplete" &&
      lastAssistantStatus.reason === "error"
    ) {
      return;
    }

    if (lastAssistantText.length < lastAssistantLengthRef.current) {
      clearTts();
    }
    lastAssistantLengthRef.current = lastAssistantText.length;

    const newText = lastAssistantText.slice(ttsProcessedLengthRef.current);
    if (!newText) return;

    ttsProcessedLengthRef.current = lastAssistantText.length;
    ttsBufferRef.current += newText;

    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const sentences = ttsBufferRef.current.match(sentenceRegex) ?? [];
    const remainder = ttsBufferRef.current.replace(sentenceRegex, "");

    if (sentences.length > 0) {
      sentences
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .forEach((sentence) => enqueueTts(sentence));
    }

    let nextBuffer = remainder;
    const maxChunk = 160;
    while (nextBuffer.length > maxChunk) {
      const cut = nextBuffer.lastIndexOf(" ", maxChunk);
      const take =
        cut > 40 ? nextBuffer.slice(0, cut) : nextBuffer.slice(0, maxChunk);
      enqueueTts(take.trim());
      nextBuffer = nextBuffer.slice(take.length).trimStart();
    }
    ttsBufferRef.current = nextBuffer;

    if (!isRunning && ttsBufferRef.current.trim()) {
      enqueueTts(ttsBufferRef.current.trim());
      ttsBufferRef.current = "";
    }
  }, [
    isRunning,
    lastAssistantText,
    lastAssistantStatus,
    selectedLanguage,
    lastUserText,
    speechEnabled,
    voiceGender,
    lastMessageRole,
    enqueueTts,
  ]);

  const extractAttachmentsForMessage = useCallback(
    (message: ThreadMessage): ChatAttachment[] => {
      const messageId =
        message && typeof message === "object" && "id" in message
          ? String((message as { id?: string }).id ?? "")
          : undefined;
      const cached = getRegisteredAttachments(messageId);
      if (cached && cached.length > 0) {
        return cached;
      }

      if (!Array.isArray(message.content)) return [];
      const legacy = message.content
        .filter(
          (part): part is { type: "image"; image: string; filename?: string } =>
            typeof part === "object" &&
            part !== null &&
            "type" in part &&
            (part as { type?: string }).type === "image" &&
            "image" in part,
        )
        .map((part) => {
          const dataUrl = part.image;
          const mimeType = dataUrl.startsWith("data:")
            ? dataUrl.slice(5, dataUrl.indexOf(";"))
            : "image/png";
          return {
            name: part.filename ?? "image.png",
            type: mimeType,
            size: 0,
            dataUrl,
          };
        });
      return legacy;
    },
    [getRegisteredAttachments],
  );

  useEffect(() => {
    if (!shouldPersistHistory) return;
    if (activeThreadIdRef.current) return;
    if (isCreatingThreadRef.current) return;
    const firstUserIndex = threadMessagesState.findIndex(
      (message) => message.role === "user",
    );
    if (firstUserIndex === -1) return;
    if (!isAuthenticated && !guestChatId && typeof window !== "undefined") {
      const created = createGuestChatId();
      localStorage.setItem("fixly_guest_chat_id", created);
      setGuestChatId(created);
      return;
    }

    isCreatingThreadRef.current = true;
    const persist = async () => {
      const firstUser = threadMessagesState[firstUserIndex];
      const titleSource = firstUser ? extractText(firstUser).trim() : "Chat";
      const title =
        titleSource.split("\n")[0].slice(0, 48) || "New repair chat";
      const threadId = await createThread({
        title,
        guestChatId: isAuthenticated ? undefined : (guestChatId ?? undefined),
      });
      setActiveThreadId(threadId);
      loadedThreadRef.current = threadId;

      const initialMessages = threadMessagesState
        .slice(0, firstUserIndex + 1)
        .map((message) => {
          const contentText = extractText(message).trim();
          const attachments = extractAttachmentsForMessage(message);
          return {
            role: message.role,
            contentText,
            attachments: attachments.length > 0 ? attachments : undefined,
          };
        })
        .filter(
          (message) =>
            message.contentText.length > 0 ||
            (message.attachments?.length ?? 0) > 0,
        );

      if (initialMessages.length > 0) {
        await appendMessages({
          threadId: threadId as Id<"chatThreads">,
          guestChatId: guestChatId ?? undefined,
          messages: initialMessages,
        });
        lastPersistedCountRef.current = firstUserIndex + 1;
      } else {
        lastPersistedCountRef.current = threadMessagesState.length;
      }
    };

    persist()
      .catch(() => {})
      .finally(() => {
        isCreatingThreadRef.current = false;
      });
  }, [
    appendMessages,
    createGuestChatId,
    createThread,
    extractAttachmentsForMessage,
    guestChatId,
    isAuthenticated,
    setActiveThreadId,
    setGuestChatId,
    shouldPersistHistory,
    threadMessagesState,
  ]);

  useEffect(() => {
    if (!shouldPersistHistory) return;
    if (isRunning) return;
    if (lastMessageRole !== "assistant") return;
    if (
      lastAssistantStatus?.type === "incomplete" &&
      lastAssistantStatus.reason === "error"
    ) {
      return;
    }
    if (threadMessagesState.length <= lastPersistedCountRef.current) return;
    if (isPersistingRef.current) return;
    if (!isAuthenticated && !guestChatId && typeof window !== "undefined") {
      const created = createGuestChatId();
      localStorage.setItem("fixly_guest_chat_id", created);
      setGuestChatId(created);
      return;
    }

    const lastAssistantIndex = (() => {
      for (let i = threadMessagesState.length - 1; i >= 0; i -= 1) {
        if (threadMessagesState[i]?.role === "assistant") {
          return i;
        }
      }
      return -1;
    })();
    const actionItems = messageActions?.actions?.length
      ? messageActions.actions
      : null;
    const newMessages = threadMessagesState
      .slice(lastPersistedCountRef.current)
      .map((message, index) => {
        const contentText = extractText(message).trim();
        const attachments = extractAttachmentsForMessage(message);
        const absoluteIndex = lastPersistedCountRef.current + index;
        const actions =
          actionItems &&
          message.role === "assistant" &&
          absoluteIndex === lastAssistantIndex
            ? actionItems
            : undefined;
        return {
          role: message.role,
          contentText,
          attachments: attachments.length > 0 ? attachments : undefined,
          actions,
        };
      })
      .filter(
        (message) =>
          message.contentText.length > 0 ||
          (message.attachments?.length ?? 0) > 0 ||
          (message.actions?.length ?? 0) > 0,
      );

    if (newMessages.length === 0) {
      lastPersistedCountRef.current = threadMessagesState.length;
      return;
    }

    isPersistingRef.current = true;
    const persist = async () => {
      let threadId = activeThreadIdRef.current;
      if (!threadId) {
        const firstUser = threadMessagesState.find(
          (message) => message.role === "user",
        );
        const titleSource = firstUser ? extractText(firstUser).trim() : "Chat";
        const title =
          titleSource.split("\n")[0].slice(0, 48) || "New repair chat";
        threadId = await createThread({
          title,
          guestChatId: isAuthenticated ? undefined : (guestChatId ?? undefined),
        });
        setActiveThreadId(threadId);
        loadedThreadRef.current = threadId;
      }

      await appendMessages({
        threadId: threadId as Id<"chatThreads">,
        guestChatId: guestChatId ?? undefined,
        messages: newMessages,
      });
      lastPersistedCountRef.current = threadMessagesState.length;
    };

    persist()
      .catch(() => {})
      .finally(() => {
        isPersistingRef.current = false;
      });
  }, [
    appendMessages,
    guestChatId,
    isAuthenticated,
    shouldPersistHistory,
    createThread,
    createGuestChatId,
    extractAttachmentsForMessage,
    isRunning,
    lastAssistantStatus,
    lastMessageRole,
    messageActions,
    setActiveThreadId,
    setGuestChatId,
    threadMessagesState,
  ]);

  return (
    <ImageViewerContext.Provider value={imageViewerValue}>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <ChatLogic onChatStart={onChatStart} />
        <ChatShell
          onClose={() => setSelectedFiles([])}
          inlineThread={inlineThread}
        >
          <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            {/* PREMIUM GRADIENT BACKGROUND (Only visible when empty and not transitioning) */}
            {isThreadEmpty && !isThreadTransitioning && (
              <div className="animate-in fade-in pointer-events-none absolute inset-0 -z-10 h-full w-full overflow-hidden duration-1000">
                <PremiumBackground />
              </div>
            )}

            {showHistorySidebar ? (
              <SidebarProvider
                className="relative min-h-0 flex-1"
                style={{ "--sidebar-width": "307px" } as CSSProperties}
              >
                <ChatHistorySidebar
                  canUseChatHistory={canUseChatHistory}
                  isAuthenticated={isAuthenticated}
                  authLoading={authLoading}
                  threads={threads}
                  activeThreadId={activeThreadId}
                  onSelectThread={(threadId) => {
                    setActiveThreadId(threadId);
                    loadedThreadRef.current = null;
                    lastPersistedCountRef.current = 0;
                    api.thread().reset();
                  }}
                  onNewChat={async () => {
                    api.thread().reset();
                    loadedThreadRef.current = null;
                    lastPersistedCountRef.current = 0;
                    setActiveThreadId(null);
                    notifyThreadChange?.(null);
                  }}
                  onRenameThread={(threadId, title) =>
                    renameThread({ threadId, title })
                  }
                  onDeleteThread={(threadId) => {
                    deleteThread({ threadId });
                    if (activeThreadId === threadId) {
                      setActiveThreadId(null);
                      api.thread().reset();
                    }
                  }}
                />
                <SidebarRail />
                <SidebarInset
                  className={cn(
                    "flex h-full min-h-0 flex-1 flex-col overflow-hidden transition-colors duration-700",
                    isThreadEmpty ? "bg-transparent" : "bg-[var(--bg)]",
                  )}
                >
                  <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                    {/* MOBILE SIDEBAR TRIGGER */}
                    <div className="flex shrink-0 items-center gap-3 px-4 pt-4 md:hidden">
                      <SidebarTrigger className="h-8 w-8 rounded-full border border-[var(--border)] bg-[var(--bg-elev)]/80 text-[var(--text)] hover:bg-[var(--surface)]" />
                      <span className="text-xs font-semibold text-[var(--text)]">
                        History
                      </span>
                    </div>

                    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                      <ThreadPrimitive.Root
                        className={cn(
                          "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden",
                          isThreadEmpty ? "overscroll-none" : "",
                        )}
                      >
                        {/* EMPTY STATE HERO + COMPOSER */}
                        <ThreadPrimitive.Empty>
                          {!isThreadTransitioning &&
                            !shouldShowThreadLoading && (
                              <div className="flex h-full w-full flex-col overflow-y-auto">
                                <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pt-[10vh] pb-20">
                                  {header || (
                                    <EmptyStateHero
                                      onSuggestionClick={handleSuggestionClick}
                                    />
                                  )}

                                  <div className="animate-in slide-in-from-bottom-4 mt-12 w-full duration-700">
                                    <Composer
                                      selectedFiles={selectedFiles}
                                      setSelectedFiles={setSelectedFiles}
                                      draft={draft}
                                      setDraft={setDraft}
                                      selectedLanguage={selectedLanguage}
                                      setSelectedLanguage={setSelectedLanguage}
                                      lastUserText={lastUserText}
                                      speechEnabled={speechEnabled}
                                      setSpeechEnabled={setSpeechEnabled}
                                      voiceGender={voiceGender}
                                      setVoiceGender={setVoiceGender}
                                      canVoice={entitlements.capabilities.voice}
                                      canPhotos={
                                        entitlements.capabilities.photos
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                        </ThreadPrimitive.Empty>

                        <div
                          className={cn(
                            "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain scroll-smooth pt-4",
                            isThreadEmpty &&
                              !isThreadTransitioning &&
                              !shouldShowThreadLoading &&
                              "hidden",
                          )}
                          ref={scrollRef}
                          onScroll={updateIsAtBottom}
                        >
                          {isThreadTransitioning || shouldShowThreadLoading ? (
                            <ThreadLoadingState />
                          ) : (
                            <ThreadPrimitive.Viewport className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-6">
                              <ThreadPrimitive.Messages
                                components={{ Message: ChatMessage }}
                              />
                              <TypingIndicator />
                              <div ref={bottomRef} />
                            </ThreadPrimitive.Viewport>
                          )}
                        </div>
                      </ThreadPrimitive.Root>

                      <ComposerContainer
                        isVisible={!isThreadEmpty || isThreadTransitioning}
                      >
                        <Composer
                          selectedFiles={selectedFiles}
                          setSelectedFiles={setSelectedFiles}
                          draft={draft}
                          setDraft={setDraft}
                          selectedLanguage={selectedLanguage}
                          setSelectedLanguage={setSelectedLanguage}
                          lastUserText={lastUserText}
                          speechEnabled={speechEnabled}
                          setSpeechEnabled={setSpeechEnabled}
                          voiceGender={voiceGender}
                          setVoiceGender={setVoiceGender}
                          canVoice={entitlements.capabilities.voice}
                          canPhotos={entitlements.capabilities.photos}
                        />
                      </ComposerContainer>
                    </div>
                  </div>
                </SidebarInset>
              </SidebarProvider>
            ) : (
              <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                <ThreadPrimitive.Root
                  className={cn(
                    "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden",
                    (isThreadEmpty || isThreadTransitioning) &&
                      "overscroll-none",
                  )}
                >
                  {/* EMPTY STATE HERO + COMPOSER (Stand-alone mode) */}
                  <ThreadPrimitive.Empty>
                    {!isThreadTransitioning && !shouldShowThreadLoading && (
                      <div className="flex h-full w-full flex-col overflow-y-auto">
                        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pt-[10vh] pb-20">
                          {header || (
                            <EmptyStateHero
                              onSuggestionClick={handleSuggestionClick}
                            />
                          )}

                          <div className="animate-in slide-in-from-bottom-4 mt-12 w-full duration-700">
                            <Composer
                              selectedFiles={selectedFiles}
                              setSelectedFiles={setSelectedFiles}
                              draft={draft}
                              setDraft={setDraft}
                              selectedLanguage={selectedLanguage}
                              setSelectedLanguage={setSelectedLanguage}
                              lastUserText={lastUserText}
                              speechEnabled={speechEnabled}
                              setSpeechEnabled={setSpeechEnabled}
                              voiceGender={voiceGender}
                              setVoiceGender={setVoiceGender}
                              canVoice={entitlements.capabilities.voice}
                              canPhotos={entitlements.capabilities.photos}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </ThreadPrimitive.Empty>

                  {/* MESSAGE AREA (Stand-alone mode) */}
                  <div
                    className={cn(
                      "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain scroll-smooth pt-4",
                      isThreadEmpty &&
                        !isThreadTransitioning &&
                        !shouldShowThreadLoading &&
                        "hidden",
                    )}
                    ref={scrollRef}
                    onScroll={updateIsAtBottom}
                  >
                    {isThreadTransitioning || shouldShowThreadLoading ? (
                      <ThreadLoadingState />
                    ) : (
                      <ThreadPrimitive.Viewport className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-6">
                        <ThreadPrimitive.Messages
                          components={{ Message: ChatMessage }}
                        />
                        <TypingIndicator />
                        <div ref={bottomRef} />
                      </ThreadPrimitive.Viewport>
                    )}
                  </div>
                </ThreadPrimitive.Root>

                {/* STICKY COMPOSER (Stand-alone mode, outside Root) */}
                <ComposerContainer
                  isVisible={!isThreadEmpty || isThreadTransitioning}
                >
                  <Composer
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    draft={draft}
                    setDraft={setDraft}
                    selectedLanguage={selectedLanguage}
                    setSelectedLanguage={setSelectedLanguage}
                    lastUserText={lastUserText}
                    speechEnabled={speechEnabled}
                    setSpeechEnabled={setSpeechEnabled}
                    voiceGender={voiceGender}
                    setVoiceGender={setVoiceGender}
                    canVoice={entitlements.capabilities.voice}
                    canPhotos={entitlements.capabilities.photos}
                  />
                </ComposerContainer>
              </div>
            )}
          </div>
        </ChatShell>
      </div>

      <Dialog
        open={Boolean(viewerImage)}
        onOpenChange={(open) => {
          if (!open) {
            setViewerImage(null);
          }
        }}
      >
        <DialogContent className="h-[70svh] w-[70vw] max-w-[70vw] overflow-hidden border-[var(--border)] bg-[var(--bg)]/95 p-4 text-[var(--text)]">
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {viewerImage ? (
            <div className="flex h-full w-full items-center justify-center overflow-hidden">
              <Image
                src={viewerImage.url}
                alt={viewerImage.name}
                width={1400}
                height={1400}
                className="h-full w-full object-contain"
                unoptimized
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </ImageViewerContext.Provider>
  );
};

const ChatHistorySidebar = ({
  canUseChatHistory,
  isAuthenticated,
  authLoading,
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onRenameThread,
  onDeleteThread,
}: {
  canUseChatHistory: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
  threads?: HistoryThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onRenameThread: (threadId: Id<"chatThreads">, title: string) => void;
  onDeleteThread: (threadId: Id<"chatThreads">) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [mobileMenuThreadId, setMobileMenuThreadId] = useState<string | null>(
    null,
  );
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isSidebarLoading =
    authLoading ||
    (isAuthenticated && canUseChatHistory && threads === undefined);

  const filteredThreads = useMemo(() => {
    if (!threads) return [];
    if (!searchQuery) return threads;
    return threads.filter((thread) =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [threads, searchQuery]);

  const handleStartEdit = (thread: HistoryThread) => {
    setEditingThreadId(thread.id);
    setEditTitle(thread.title);
  };

  const handleSaveEdit = () => {
    if (editingThreadId && editTitle.trim()) {
      onRenameThread(editingThreadId as Id<"chatThreads">, editTitle.trim());
    }
    setEditingThreadId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditingThreadId(null);
    }
  };

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      style={{ "--sidebar-width": "307px" } as CSSProperties}
      className="border-sidebar-border/60 !top-[var(--app-header-height)] !bottom-auto !h-[calc(100svh-var(--app-header-height))] bg-[var(--bg-elev)]/80 transition-[left,right,width] duration-300 ease-in-out"
    >
      <SidebarHeader className="gap-3">
        <div className="flex items-center justify-between px-1">
          {!isCollapsed && (
            <span className="text-sidebar-foreground text-xs font-semibold">
              History
            </span>
          )}
          <SidebarTrigger className="border-sidebar-border/60 text-sidebar-foreground hover:bg-sidebar-accent hidden h-7 w-7 border md:inline-flex" />
        </div>
        {isSidebarLoading && !isCollapsed ? (
          <div className="space-y-2 px-1">
            <Skeleton className="bg-sidebar-foreground/15 h-9 w-full rounded-lg" />
            <Skeleton className="bg-sidebar-foreground/10 h-9 w-full rounded-lg" />
          </div>
        ) : (
          isAuthenticated &&
          canUseChatHistory && (
            <>
              <button
                type="button"
                onClick={onNewChat}
                className={cn(
                  "border-sidebar-border/60 bg-sidebar/60 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-2 rounded-lg border font-semibold transition-all duration-300",
                  isCollapsed
                    ? "h-9 w-9 justify-center px-0"
                    : "w-full px-3 py-2 text-xs",
                )}
                title={isCollapsed ? "New chat" : undefined}
              >
                <PlusIcon className="shrink-0" />
                {!isCollapsed && <span>New chat</span>}
              </button>
              {!isCollapsed && (
                <SidebarInput
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-sidebar-foreground placeholder:text-sidebar-foreground/60 bg-transparent focus-visible:ring-[var(--accent)]"
                />
              )}
            </>
          )
        )}
      </SidebarHeader>
      {!isCollapsed && (
        <>
          {isAuthenticated && canUseChatHistory && <SidebarSeparator />}
          <SidebarContent>
            {isSidebarLoading ? (
              <div className="px-2 py-2">
                <SidebarMenuSkeleton className="mb-2" showIcon width="76%" />
                <SidebarMenuSkeleton className="mb-2" width="82%" />
                <SidebarMenuSkeleton className="mb-2" width="65%" />
                <SidebarMenuSkeleton className="mb-2" width="68%" />
                <SidebarMenuSkeleton width="51%" />
              </div>
            ) : !isAuthenticated || !canUseChatHistory ? (
              <div className="border-sidebar-border/60 bg-sidebar/60 text-sidebar-foreground/70 mx-2 mt-2 flex flex-col justify-center rounded-xl border px-4 py-4 text-xs">
                <p className="text-center leading-relaxed wrap-break-word">
                  Log-in or create an account to see your chat history.
                </p>
                <Link
                  href={isAuthenticated ? "/pricing" : "/login"}
                  className="mx-auto mt-3 inline-flex w-fit max-w-full items-center justify-center rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-black transition hover:bg-[var(--accent-soft)]"
                >
                  Log in
                </Link>
              </div>
            ) : (
              <SidebarMenu>
                {filteredThreads.length > 0 ? (
                  filteredThreads.map((thread) => (
                    <SidebarMenuItem key={thread.id}>
                      {editingThreadId === thread.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className="border-sidebar-border/60 text-sidebar-foreground ring-sidebar-ring w-full rounded-md border bg-transparent px-2 py-1 text-xs font-semibold outline-none focus:border-[var(--accent)]"
                        />
                      ) : (
                        <SidebarMenuButton
                          asChild
                          isActive={activeThreadId === thread.id}
                          className="h-auto py-2"
                        >
                          <Link
                            href={`/c/${thread.id}`}
                            className="w-full"
                            onClick={(event) => {
                              if (
                                event.metaKey ||
                                event.ctrlKey ||
                                event.shiftKey ||
                                event.altKey ||
                                event.button !== 0
                              ) {
                                return;
                              }
                              onSelectThread(thread.id);
                            }}
                          >
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-xs font-semibold">
                                {thread.title}
                              </span>
                              <span className="truncate text-[10px] opacity-70">
                                {thread.lastPreview}
                              </span>
                            </div>
                          </Link>
                        </SidebarMenuButton>
                      )}

                      {editingThreadId !== thread.id && (
                        <>
                          <div className="absolute top-1/2 right-1 hidden -translate-y-1/2 items-center gap-1 opacity-0 transition group-hover/menu-item:opacity-100 md:flex">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(thread);
                              }}
                              className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded p-1"
                              title="Rename"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-3 w-3"
                              >
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Delete this chat?")) {
                                  onDeleteThread(thread.id);
                                }
                              }}
                              className="text-sidebar-foreground/70 rounded p-1 hover:bg-red-500/20 hover:text-red-400"
                              title="Delete"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-3 w-3"
                              >
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                          <div className="absolute top-1 right-1 md:hidden">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMobileMenuThreadId(
                                  mobileMenuThreadId === thread.id
                                    ? null
                                    : thread.id,
                                );
                              }}
                              className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded p-1"
                              aria-label="More actions"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="h-4 w-4"
                              >
                                <circle cx="5" cy="12" r="1.5" />
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="19" cy="12" r="1.5" />
                              </svg>
                            </button>
                            {mobileMenuThreadId === thread.id ? (
                              <div className="border-sidebar-border/60 bg-sidebar absolute right-0 z-20 mt-1 w-32 rounded-md border p-1 shadow-xl">
                                <button
                                  type="button"
                                  className="text-sidebar-foreground hover:bg-sidebar-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMobileMenuThreadId(null);
                                    handleStartEdit(thread);
                                  }}
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-red-300 transition hover:bg-red-500/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMobileMenuThreadId(null);
                                    if (confirm("Delete this chat?")) {
                                      onDeleteThread(thread.id);
                                    }
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </>
                      )}
                    </SidebarMenuItem>
                  ))
                ) : (
                  <div className="text-sidebar-foreground/60 px-3 py-2 text-xs">
                    {searchQuery ? "No matching chats." : "No chats yet."}
                  </div>
                )}
              </SidebarMenu>
            )}
          </SidebarContent>
        </>
      )}
    </Sidebar>
  );
};

const ChatShell = ({
  children,
  onClose,
  inlineThread,
}: {
  children: React.ReactNode;
  onClose: () => void;
  inlineThread: boolean;
}) => {
  const api = useAssistantApi();
  const hasMessages = useAssistantState(
    (state) => state.thread.messages.length > 0,
  );

  return (
    <div
      className={
        hasMessages && !inlineThread
          ? "fixed inset-0 z-50 flex h-screen flex-col bg-[var(--bg)] px-6 py-6"
          : "relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
      }
    >
      {hasMessages && !inlineThread && (
        <button
          type="button"
          onClick={() => {
            api.thread().reset();
            onClose();
          }}
          aria-label="Close chat"
          className="absolute top-6 right-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--muted)] transition hover:text-white"
        >
          <CloseIcon />
        </button>
      )}
      {children}
    </div>
  );
};

const EntitlementsDebug = () => {
  const { entitlements, entitlementsSource, messageActions } =
    useEntitlements();
  return (
    <div className="fixed right-4 bottom-4 z-[70] rounded-xl border border-white/10 bg-black/70 px-4 py-3 text-xs text-white/80">
      <div className="font-semibold text-white">Entitlements</div>
      <div>source: {entitlementsSource}</div>
      <div>plan: {entitlements.userPlan}</div>
      <div>remaining: {String(entitlements.remainingReplies)}</div>
      <div>remaining source: {entitlements.remainingSource ?? "unknown"}</div>
      <div>
        caps: v={entitlements.capabilities.voice ? "1" : "0"} p=
        {entitlements.capabilities.photos ? "1" : "0"} l=
        {entitlements.capabilities.linksVisuals ? "1" : "0"}
      </div>
      <div>actions: {messageActions?.actions?.length ?? 0}</div>
    </div>
  );
};

const ChatLogic = ({ onChatStart }: { onChatStart?: () => void }) => {
  const hasMessages = useAssistantState(
    (state) => state.thread.messages.length > 0,
  );

  useEffect(() => {
    if (hasMessages && onChatStart) {
      onChatStart();
    }
  }, [hasMessages, onChatStart]);

  return null;
};
