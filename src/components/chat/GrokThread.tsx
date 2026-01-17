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
  type ChangeEvent,
} from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
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

type Entitlements = {
  userHasAccount: boolean;
  userPlan: string;
  remainingReplies: number | null;
  remainingSource?: "memory" | "cookie" | "init" | "unlimited";
  credits?: number;
  capabilities: {
    voice: boolean;
    photos: boolean;
    linksVisuals: boolean;
  };
  gating: {
    must_prompt_signup_after_this: boolean;
    must_prompt_payment_after_this: boolean;
  };
};

type HistoryThread = {
  id: Id<"chatThreads">;
  title: string;
  updatedAt: number;
  lastPreview: string;
};

type HistoryMessage = {
  role: "user" | "assistant" | "system";
  contentText: string;
  createdAt: number;
  attachments?: unknown[];
};

const defaultEntitlements: Entitlements = {
  userHasAccount: false,
  userPlan: "none",
  remainingReplies: null,
  credits: undefined,
  capabilities: { voice: false, photos: false, linksVisuals: false },
  gating: {
    must_prompt_signup_after_this: false,
    must_prompt_payment_after_this: false,
  },
};

type ActionItem = {
  type: "link";
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

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
  setEntitlements: () => { },
  setMessageActions: () => { },
});

const useEntitlements = () => useContext(EntitlementsContext);

const extractText = (message: ThreadMessage) => {
  if (typeof message.content === "string") return message.content;
  return message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
};

const buildPayloadMessages = (messages: readonly ThreadMessage[]) => {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: extractText(message).trim(),
    }))
    .filter((message) => message.content.length > 0);
};

const createChatAdapter = (options?: {
  onEntitlements?: (entitlements: Entitlements) => void;
  onMessageActions?: (actions: MessageActions | null) => void;
  anonymousId?: string | null;
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
      const lastContent = messages[messages.length - 1]?.content;
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
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payload,
          userCountry,
          userLanguage: locale,
          threadContext: "web-chat",
          anonymousId: options?.anonymousId ?? undefined,
          attachments:
            messages[messages.length - 1]?.role === "user" &&
            imageParts.length > 0
              ? imageParts.map((part) => {
                  const dataUrl = part.image;
                  const mimeType = dataUrl.startsWith("data:")
                    ? dataUrl.slice(5, dataUrl.indexOf(";"))
                    : "image/png";
                  return {
                    dataUrl,
                    type: mimeType,
                    name: part.filename ?? "image.png",
                    size: 0,
                  };
                })
              : undefined,
        }),
        signal: abortSignal,
      });

      if (!response.ok || !response.body) {
        let errorMessage = "Chat API error";
        try {
          const errorPayload = (await response.json()) as {
            error?: string;
            entitlements?: Entitlements;
            actions?: MessageActions;
          };
          if (errorPayload?.entitlements) {
            options?.onEntitlements?.(errorPayload.entitlements);
          }
          if (errorPayload?.error) {
            errorMessage = errorPayload.error;
          }
          if (errorPayload?.actions) {
            options?.onMessageActions?.(errorPayload.actions);
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
                entitlements?: Entitlements;
              };
              if (payload.entitlements) {
                options?.onEntitlements?.(payload.entitlements);
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
              status: { type: "incomplete", reason: "error", error: "api_error" },
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

      yield {
        content: [
          {
            type: "text",
            text:
              error instanceof Error
                ? error.message
                : "We could not reach the server. Please try again.",
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

const buildGuestChatId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `guest-${Date.now()}`;
};

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="13" r="3.25" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M12 5v14" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

function SquareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
    >
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6l-12 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function AttachmentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="M12 6v9a3 3 0 0 1-6 0V7a5 5 0 0 1 10 0v8a7 7 0 0 1-14 0V8" />
    </svg>
  );
}

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
          name:
            (part as { filename?: string }).filename ?? "Image",
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
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
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

  return (
    <MessagePrimitive.Root className="px-4 py-2">
      <div
        className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[85%] rounded-2xl px-5 py-3 text-left shadow-sm ${isUser
            ? "bg-[var(--accent)] text-white"
            : isError
              ? "border border-red-500/40 bg-red-500/10 text-red-100 text-sm"
              : "border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)] text-base"
            }`}
        >
          <div className="flex flex-col gap-3">
            {imageAttachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {imageAttachments.map((image) => (
                  <a
                    key={image.id}
                    href={image.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <Image
                      src={image.previewUrl ?? ""}
                      alt={image.name}
                      width={220}
                      height={220}
                      className="h-24 w-full rounded-lg object-cover"
                      unoptimized
                    />
                  </a>
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
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition ${isPrimary
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
      <div className="flex w-full justify-start">
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
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
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
  selectedFile,
  setSelectedFile,
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
  const isEmpty = useAssistantState((state) => state.composer.isEmpty);
  const isRunning = useAssistantState((state) => state.thread.isRunning);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const speechRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef<string>("");
  const shouldListenRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    if (!selectedFile.type.startsWith("image/")) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleCameraClick = () => {
    if (!canPhotos) return;
    cameraInputRef.current?.click();
  };

  const handleAttachmentClick = () => {
    if (!canPhotos) return;
    fileInputRef.current?.click();
  };

  const handleCameraChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setSelectedFile(file);
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
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
      baseTextRef.current = api.composer().getState().text || "";
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
      api.composer().setText(next);
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
  }, [api]);

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
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const buildUserContent = async (
    text: string,
    file: File | null,
  ): Promise<ThreadUserMessagePart[]> => {
    const content: ThreadUserMessagePart[] = [];

    if (file) {
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
    <ComposerPrimitive.Root
      className="group/composer mx-auto w-full max-w-3xl px-4"
      data-empty={isEmpty}
      data-running={isRunning}
    >
      {selectedFile && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-3 text-sm text-[var(--text)] shadow-lg">
          <div className="flex items-center gap-3">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Selected preview"
                width={48}
                height={48}
                className="h-12 w-12 rounded-lg object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)]">
                <AttachmentIcon />
              </div>
            )}
            <span className="max-w-[200px] truncate font-medium">
              {selectedFile.name}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
          >
            <CloseIcon />
          </button>
        </div>
      )}
      {micError && (
        <div className="mb-3 text-xs text-red-200">
          {micError}
        </div>
      )}

      <div className="relative flex items-end gap-3 rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)]/80 p-4 shadow-2xl backdrop-blur-xl transition-all focus-within:border-[var(--accent)]/50 focus-within:ring-1 focus-within:ring-[var(--accent)]/50 hover:border-[var(--accent)]/30">
        <button
          type="button"
          onClick={handleCameraClick}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)] ${canPhotos ? "" : "cursor-not-allowed opacity-40 hover:bg-transparent"}`}
          disabled={!canPhotos}
        >
          <CameraIcon />
        </button>

        <ComposerPrimitive.Input
          placeholder="Describe the problem..."
          className="min-h-[44px] w-full bg-transparent py-2.5 text-base text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          onKeyDown={async (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const text = api.composer().getState().text.trim();
              if (!text && !selectedFile) return;

              const content = await buildUserContent(text, selectedFile);

              if (content.length > 0) {
                api.thread().append({ role: "user", content });
                api.composer().setText("");
                handleRemoveFile();
              }
            }
          }}
        />

        <select
          value={selectedLanguage}
          onChange={(event) => setSelectedLanguage(event.target.value)}
          className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text)]"
          aria-label="Voice language"
        >
          <option value="auto">Auto</option>
          <option value="en-US">English</option>
          <option value="es-ES">Spanish</option>
          <option value="de-DE">German</option>
          <option value="nl-NL">Dutch</option>
          <option value="fr-FR">French</option>
          <option value="pt-PT">Portuguese</option>
          <option value="it-IT">Italian</option>
          <option value="ro-RO">Romanian</option>
        </select>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:border-[var(--accent)]/50 hover:text-[var(--text)] ${isMenuOpen ? "border-[var(--accent)] text-[var(--text)]" : ""
              }`}
            aria-label="More options"
            aria-expanded={isMenuOpen}
          >
            <PlusIcon />
          </button>

          {isMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 flex w-48 flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-2 shadow-xl backdrop-blur-xl">
              <button
                type="button"
                onClick={() => {
                  if (canPhotos) {
                    handleAttachmentClick();
                    setIsMenuOpen(false);
                  }
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text)] transition ${canPhotos ? "hover:bg-[var(--surface)]" : "cursor-not-allowed opacity-50"}`}
                disabled={!canPhotos}
              >
                <AttachmentIcon />
                <span>Attach file</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (canVoice) {
                    setSpeechEnabled(!speechEnabled);
                  }
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text)] transition ${canVoice ? "hover:bg-[var(--surface)]" : "cursor-not-allowed opacity-50"}`}
                disabled={!canVoice}
              >
                <span className={speechEnabled ? "text-[var(--accent)]" : "text-[var(--muted)]"}>
                  {speechEnabled ? "Voice On" : "Voice Off"}
                </span>
              </button>

              <div className="px-3 py-1">
                <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
                  Voice Gender
                </label>
                <div className="flex gap-1 rounded-lg bg-[var(--surface)] p-1">
                  <button
                    type="button"
                    onClick={() => setVoiceGender("female")}
                    disabled={!canVoice}
                    className={`flex-1 rounded-md py-1 text-xs font-medium transition ${voiceGender === "female"
                      ? "bg-[var(--bg-elev)] text-[var(--text)] shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                      }`}
                  >
                    Female
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceGender("male")}
                    disabled={!canVoice}
                    className={`flex-1 rounded-md py-1 text-xs font-medium transition ${voiceGender === "male"
                      ? "bg-[var(--bg-elev)] text-[var(--text)] shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                      }`}
                  >
                    Male
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition ${canVoice ? "hover:bg-[var(--accent-soft)]" : "opacity-50"}`}>
          <button
            type="button"
            onClick={handleMicClick}
            aria-pressed={isListening}
            className={`absolute inset-0 flex items-center justify-center transition ${isListening
              ? ""
              : "group-data-[empty=false]/composer:scale-0 group-data-[empty=false]/composer:opacity-0"
              }`}
            disabled={!canVoice}
          >
            {isListening ? <SquareIcon /> : <MicIcon />}
          </button>
          <button
            type="button"
            onClick={async () => {
              const text = api.composer().getState().text.trim();
              if (!text && !selectedFile) return;

              const content = await buildUserContent(text, selectedFile);

              if (content.length > 0) {
                api.thread().append({ role: "user", content });
                api.composer().setText("");
                handleRemoveFile();
              }
            }}
            className={`absolute inset-0 flex items-center justify-center transition group-data-[empty=true]/composer:scale-0 group-data-[empty=true]/composer:opacity-0 ${isListening ? "pointer-events-none scale-0 opacity-0" : ""
              }`}
          >
            <ArrowUpIcon />
          </button>
          <ComposerPrimitive.Cancel className="absolute inset-0 flex items-center justify-center transition group-data-[running=false]/composer:scale-0 group-data-[running=false]/composer:opacity-0">
            <SquareIcon />
          </ComposerPrimitive.Cancel>
        </div>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraChange}
        disabled={!canPhotos}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,application/pdf,text/plain"
        className="hidden"
        onChange={handleAttachmentChange}
        disabled={!canPhotos}
      />
    </ComposerPrimitive.Root>
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
    <div className="sticky bottom-0 mt-auto shrink-0 bg-gradient-to-t from-[var(--bg)] to-transparent pb-4 pt-2">
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
}: {
  onChatStart?: () => void;
  showHistorySidebar?: boolean;
  inlineThread?: boolean;
  header?: React.ReactNode;
  initialThreadId?: string | null;
}) {
  const { isAuthenticated } = useConvexAuth();
  const [guestChatId, setGuestChatId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const existing = localStorage.getItem("fixly_guest_chat_id");
    if (existing) return existing;
    if (isAuthenticated) return null;
    const created = buildGuestChatId();
    localStorage.setItem("fixly_guest_chat_id", created);
    return created;
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [entitlements, setEntitlements] =
    useState<Entitlements>(defaultEntitlements);
  const [entitlementsSource, setEntitlementsSource] = useState<
    "init" | "api"
  >("init");
  const [messageActions, setMessageActions] =
    useState<MessageActions | null>(null);
  const prevRemainingRef = useRef<number | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreadId,
  );
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const canUseChatHistory = isAuthenticated || Boolean(guestChatId);
  const shouldPersistHistory = isAuthenticated || Boolean(guestChatId);
  const threads = useQuery(
    api.chatHistory.listThreadsForUser,
    isAuthenticated && canUseChatHistory && showHistorySidebar ? {} : "skip",
  ) as HistoryThread[] | undefined;
  const threadMessages = useQuery(
    api.chatHistory.getThreadMessagesForActor,
    activeThreadId && canUseChatHistory
      ? {
        threadId: activeThreadId as Id<"chatThreads">,
        anonymousId: isAuthenticated ? undefined : guestChatId ?? undefined,
      }
      : "skip",
  ) as HistoryMessage[] | undefined;
  const createThread = useMutation(api.chatHistory.createThread);
  const appendMessages = useMutation(api.chatHistory.appendMessages);
  const mergeGuestThreads = useMutation(api.chatHistory.mergeGuestThreads);
  const renameThread = useMutation(api.chatHistory.renameThread);
  const deleteThread = useMutation(api.chatHistory.deleteThread);
  const setEntitlementsWithSource = useCallback(
    (value: Entitlements, source: "init" | "api" = "api") => {
      setEntitlements(value);
      setEntitlementsSource(source);
    },
    [],
  );
  const chatAdapter = useMemo(
    () =>
      createChatAdapter({
        onEntitlements: (next) => setEntitlementsWithSource(next, "api"),
        onMessageActions: setMessageActions,
        anonymousId: guestChatId,
      }),
    [guestChatId, setEntitlementsWithSource],
  );
  const runtime = useLocalRuntime(chatAdapter);
  const createGuestChatId = buildGuestChatId;
  useEffect(() => {
    let isMounted = true;
    fetch("/api/ai")
      .then((response) => response.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.entitlements) {
          setEntitlementsWithSource(data.entitlements as Entitlements, "init");
        }
      })
      .catch(() => {
        // Ignore capability fetch errors; server will still enforce.
      });

    return () => {
      isMounted = false;
    };
  }, [setEntitlementsWithSource]);

  useEffect(() => {
    if (!entitlements.capabilities.voice && speechEnabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpeechEnabled(false);
    }
  }, [entitlements.capabilities.voice, speechEnabled]);

  useEffect(() => {
    if (!entitlements.capabilities.photos && selectedFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFile(null);
    }
  }, [entitlements.capabilities.photos, selectedFile]);

  useEffect(() => {
    if (initialThreadId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveThreadId(initialThreadId);
    }
  }, [initialThreadId]);

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
      .catch(() => { });
  }, [guestChatId, isAuthenticated, mergeGuestThreads]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const sourceLabel = entitlementsSource === "api" ? "server response" : "init";
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
    localStorage.setItem("fixly_credits", String(entitlements.credits));
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
          isHistoryCollapsed={isHistoryCollapsed}
          setIsHistoryCollapsed={setIsHistoryCollapsed}
          isHistoryDrawerOpen={isHistoryDrawerOpen}
          setIsHistoryDrawerOpen={setIsHistoryDrawerOpen}
          createThread={createThread}
          appendMessages={appendMessages}
          renameThread={renameThread}
          deleteThread={deleteThread}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          speechEnabled={speechEnabled}
          setSpeechEnabled={setSpeechEnabled}
          voiceGender={voiceGender}
          setVoiceGender={setVoiceGender}
        />
        {process.env.NODE_ENV === "development" && <EntitlementsDebug />}
      </AssistantRuntimeProvider>
    </EntitlementsContext.Provider>
  );
}

const ChatThreadContent = ({
  onChatStart,
  isAuthenticated,
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
  isHistoryCollapsed,
  setIsHistoryCollapsed,
  isHistoryDrawerOpen,
  setIsHistoryDrawerOpen,
  createThread,
  appendMessages,
  renameThread,
  deleteThread,
  selectedFile,
  setSelectedFile,
  selectedLanguage,
  setSelectedLanguage,
  speechEnabled,
  setSpeechEnabled,
  voiceGender,
  setVoiceGender,
}: {
  onChatStart?: () => void;
  isAuthenticated: boolean;
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
  isHistoryCollapsed: boolean;
  setIsHistoryCollapsed: (value: boolean) => void;
  isHistoryDrawerOpen: boolean;
  setIsHistoryDrawerOpen: (value: boolean) => void;
  createThread: (args: {
    title?: string;
    guestChatId?: string;
  }) => Promise<Id<"chatThreads">>;
  appendMessages: (args: {
    threadId: Id<"chatThreads">;
    guestChatId?: string;
    messages: Array<{
      role: "user" | "assistant" | "system";
      contentText: string;
      createdAt?: number;
      attachments?: unknown[];
    }>;
  }) => Promise<null>;
  renameThread: (args: { threadId: Id<"chatThreads">; title: string }) => Promise<null>;
  deleteThread: (args: { threadId: Id<"chatThreads"> }) => Promise<null>;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  selectedLanguage: string;
  setSelectedLanguage: (value: string) => void;
  speechEnabled: boolean;
  setSpeechEnabled: (value: boolean) => void;
  voiceGender: "female" | "male";
  setVoiceGender: (value: "female" | "male") => void;
}) => {
  const { entitlements } = useEntitlements();
  const api = useAssistantApi();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);
  const scrollRafRef = useRef<number | null>(null);
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
  const threadMessagesState = useAssistantState((state) => state.thread.messages);
  const isThreadEmpty = useAssistantState(
    (state) => state.thread.messages.length === 0
  );

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
  }, [inlineThread, lastAssistantText, threadMessagesState.length, scrollToBottom]);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);
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
  const activeThreadIdRef = useRef<string | null>(activeThreadId);

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
    audio
      .play()
      .catch(() => {
        ttsSpeakingRef.current = false;
        playNextAudioInner();
      });
  }, []);

  const enqueueTts = useCallback((text: string) => {
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
  }, [playNextAudio, voiceGender]);

  useEffect(() => {
    if (!canUseChatHistory || !activeThreadId || !threadMessages) return;
    if (loadedThreadRef.current === activeThreadId) return;
    const initialMessages = threadMessages.map((message) => ({
      role: message.role,
      content: [
        {
          type: "text",
          text: message.contentText,
        } as TextMessagePart,
      ],
    }));
    api.thread().reset(initialMessages);
    loadedThreadRef.current = activeThreadId;
    lastPersistedCountRef.current = initialMessages.length;
  }, [
    api,
    activeThreadId,
    canUseChatHistory,
    threadMessages,
  ]);

  useEffect(() => {
    if (!activeThreadId) {
      loadedThreadRef.current = null;
      lastPersistedCountRef.current = threadMessagesState.length;
    }
  }, [activeThreadId, threadMessagesState.length]);

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

    const newMessages = threadMessagesState
      .slice(lastPersistedCountRef.current)
      .map((message) => ({
        role: message.role,
        contentText: extractText(message).trim(),
      }))
      .filter((message) => message.contentText.length > 0);

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
          guestChatId: isAuthenticated ? undefined : guestChatId ?? undefined,
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
      .catch(() => { })
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
    isRunning,
    lastAssistantStatus,
    lastMessageRole,
    setActiveThreadId,
    setGuestChatId,
    threadMessagesState,
  ]);

  return (
    <>
      <ChatLogic onChatStart={onChatStart} />
      <ChatShell
        onClose={() => setSelectedFile(null)}
        inlineThread={inlineThread}
      >
        <div
          className={
            showHistorySidebar
              ? "flex h-full w-full items-stretch"
              : "h-full w-full"
          }
        >
          {showHistorySidebar ? (
            <ChatHistorySidebar
              canUseChatHistory={canUseChatHistory}
              isAuthenticated={isAuthenticated}
              threads={threads}
              activeThreadId={activeThreadId}
              onSelectThread={(threadId) => {
                setActiveThreadId(threadId);
                loadedThreadRef.current = null;
                lastPersistedCountRef.current = 0;
                api.thread().reset();
                setIsHistoryDrawerOpen(false);
              }}
              onNewChat={async () => {
                api.thread().reset();
                if (canUseChatHistory && isAuthenticated) {
                  try {
                    const threadId = await createThread({
                      title: "New repair chat",
                    });
                    setActiveThreadId(threadId);
                    loadedThreadRef.current = threadId;
                  } catch {
                    setActiveThreadId(null);
                  }
                } else {
                  setActiveThreadId(null);
                }
              }}
              onRenameThread={(threadId, title) => renameThread({ threadId, title })}
              onDeleteThread={(threadId) => {
                deleteThread({ threadId });
                if (activeThreadId === threadId) {
                  setActiveThreadId(null);
                  api.thread().reset();
                }
              }}
              isCollapsed={isHistoryCollapsed}
              onToggleCollapse={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
              isDrawerOpen={isHistoryDrawerOpen}
              onToggleDrawer={() =>
                setIsHistoryDrawerOpen(!isHistoryDrawerOpen)
              }
            />
          ) : null}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {header ? (
              <div className="shrink-0 pb-8">{header}</div>
            ) : null}
            <ThreadPrimitive.Root className="flex min-h-0 w-full flex-1 flex-col bg-transparent">
              <ThreadPrimitive.Empty>
                <div className="flex w-full flex-col items-center justify-center pt-4">
                  <Composer
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
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
              </ThreadPrimitive.Empty>

              <div
                className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain scroll-smooth scroll-pb-28 pb-28 pt-4"
                ref={scrollRef}
                onScroll={updateIsAtBottom}
              >
                <ThreadPrimitive.Viewport className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4">
                  <ThreadPrimitive.Messages components={{ Message: ChatMessage }} />
                  <TypingIndicator />
                  <div ref={bottomRef} />
                </ThreadPrimitive.Viewport>
              </div>

              <ComposerContainer isVisible={!isThreadEmpty}>
                <Composer
                  selectedFile={selectedFile}
                  setSelectedFile={setSelectedFile}
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
            </ThreadPrimitive.Root>
          </div>
        </div>
      </ChatShell>
    </>
  );
};

const ChatHistorySidebar = ({
  canUseChatHistory,
  isAuthenticated,
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onRenameThread,
  onDeleteThread,
  isCollapsed,
  onToggleCollapse,
  isDrawerOpen,
  onToggleDrawer,
}: {
  canUseChatHistory: boolean;
  isAuthenticated: boolean;
  threads?: HistoryThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onRenameThread: (threadId: Id<"chatThreads">, title: string) => void;
  onDeleteThread: (threadId: Id<"chatThreads">) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filteredThreads = useMemo(() => {
    if (!threads) return [];
    if (!searchQuery) return threads;
    return threads.filter((thread) =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase())
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

  const content = () => {
    if (!isAuthenticated || !canUseChatHistory) {
      return (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-xs text-[var(--muted)]">
          Log-in or create an account to see your chat history.
          <Link
            href={isAuthenticated ? "/pricing" : "/login"}
            className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-black transition hover:bg-[var(--accent-soft)]"
          >
            {isAuthenticated ? "Get a Fix" : "Log in"}
          </Link>
        </div>
      );
    }

    return (
      <>
        <div className="mb-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/30"
          >
            <PlusIcon />
            <span>New chat</span>
          </button>
          {!isCollapsed && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-xs text-white placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 overflow-y-auto">
          {filteredThreads.length > 0 ? (
            filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={`group relative flex items-center rounded-lg px-3 py-2 transition ${activeThreadId === thread.id
                  ? "bg-[var(--accent)]/10 text-white"
                  : "text-[var(--muted)] hover:bg-white/5 hover:text-white"
                  }`}
              >
                {editingThreadId === thread.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="w-full bg-transparent text-xs font-semibold text-white outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectThread(thread.id)}
                    className="flex min-w-0 flex-1 flex-col text-left"
                  >
                    <div className="truncate text-xs font-semibold">
                      {thread.title}
                    </div>
                    <div className="truncate text-[10px] opacity-70">
                      {thread.lastPreview}
                    </div>
                  </button>
                )}

                {!isCollapsed && editingThreadId !== thread.id && (
                  <div className="absolute right-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(thread);
                      }}
                      className="rounded p-1 hover:bg-white/10 hover:text-white"
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
                      className="rounded p-1 hover:bg-red-500/20 hover:text-red-400"
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
                )}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-[var(--muted)]">
              {searchQuery ? "No matching chats." : "No chats yet."}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="relative h-full">
      <button
        type="button"
        onClick={onToggleDrawer}
        className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:border-white/30 lg:hidden"
      >
        History
      </button>

      <aside
        className={`hidden h-full flex-col self-stretch border-r border-white/10 bg-[var(--bg-elev)]/60 p-3 lg:flex ${isCollapsed ? "w-14" : "w-64"
          }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span
            className={`text-xs font-semibold text-white ${isCollapsed ? "hidden" : "block"
              }`}
          >
            History
          </span>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--muted)] transition hover:text-white"
            aria-label="Collapse history"
          >
            {isCollapsed ? "›" : "‹"}
          </button>
        </div>
        {!isCollapsed ? (
          <div className="flex min-h-0 flex-1 flex-col">{content()}</div>
        ) : (
          <button
            type="button"
            onClick={onNewChat}
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
            title="New chat"
          >
            <PlusIcon />
          </button>
        )}
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition lg:hidden ${isDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        onClick={onToggleDrawer}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-white/10 bg-[var(--bg)]/95 p-4 transition lg:hidden ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">History</span>
          <button
            type="button"
            onClick={onToggleDrawer}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--muted)]"
            aria-label="Close history"
          >
            ×
          </button>
        </div>
        <div className="mt-4 flex min-h-0 flex-1 flex-col">{content()}</div>
      </aside>
    </div>
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
    (state) => state.thread.messages.length > 0
  );

  return (
    <div
      className={
        hasMessages && !inlineThread
          ? "fixed inset-0 z-50 flex min-h-screen flex-col bg-[var(--bg)] px-6 py-6"
          : "relative flex min-h-dvh w-full flex-col overflow-hidden"
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
          className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--muted)] transition hover:text-white"
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
    <div className="fixed bottom-4 right-4 z-[70] rounded-xl border border-white/10 bg-black/70 px-4 py-3 text-xs text-white/80">
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
    (state) => state.thread.messages.length > 0
  );

  useEffect(() => {
    if (hasMessages && onChatStart) {
      onChatStart();
    }
  }, [hasMessages, onChatStart]);

  return null;
};
