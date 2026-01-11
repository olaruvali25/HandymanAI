"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAssistantApi,
  useAssistantState,
  useLocalRuntime,
  type ChatModelAdapter,
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

const defaultEntitlements: Entitlements = {
  userHasAccount: false,
  userPlan: "none",
  remainingReplies: null,
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
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payload,
          userCountry,
          userLanguage: locale,
          threadContext: "web-chat",
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

const ChatMessage = () => {
  const { messageActions } = useEntitlements();
  const role = useAssistantState((state) => state.message.role);
  const isUser = role === "user";
  const status = useAssistantState((state) => state.message.status);
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
          <div className="text-left whitespace-pre-wrap">
            <MessagePrimitive.Content />
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

  return (
    <ComposerPrimitive.Root
      className="group/composer mx-auto w-full max-w-2xl"
      data-empty={isEmpty}
      data-running={isRunning}
    >
      {selectedFile && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-3 text-sm text-[var(--text)] shadow-lg">
          <div className="flex items-center gap-3">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Selected preview"
                className="h-12 w-12 rounded-lg object-cover"
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
          <ComposerPrimitive.Send
            className={`absolute inset-0 flex items-center justify-center transition group-data-[empty=true]/composer:scale-0 group-data-[empty=true]/composer:opacity-0 ${isListening ? "pointer-events-none scale-0 opacity-0" : ""
              }`}
          >
            <ArrowUpIcon />
          </ComposerPrimitive.Send>
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
}: {
  children: React.ReactNode;
}) => {
  const isThreadEmpty = useAssistantState(
    (state) => state.thread.messages.length === 0
  );

  if (isThreadEmpty) return null;

  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-[var(--bg)] to-transparent pb-4 pt-2">
      {children}
    </div>
  );
};

export default function GrokThread({
  onChatStart,
}: {
  onChatStart?: () => void;
}) {
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
      }),
    [setEntitlementsWithSource],
  );
  const runtime = useLocalRuntime(chatAdapter);

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
  }, []);

  useEffect(() => {
    if (!entitlements.capabilities.voice && speechEnabled) {
      setSpeechEnabled(false);
    }
  }, [entitlements.capabilities.voice, speechEnabled]);

  useEffect(() => {
    if (!entitlements.capabilities.photos && selectedFile) {
      setSelectedFile(null);
    }
  }, [entitlements.capabilities.photos, selectedFile]);

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortControllersRef = useRef<AbortController[]>([]);
  const ttsPendingAudioRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const ttsBufferRef = useRef<string>("");
  const ttsSpeakingRef = useRef(false);
  const ttsProcessedLengthRef = useRef(0);
  const ttsSequenceRef = useRef(0);
  const ttsNextPlayRef = useRef(0);
  const lastAssistantLengthRef = useRef(0);

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

  const playNextAudio = useCallback(() => {
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
        playNextAudio();
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

  return (
    <>
      <ChatLogic onChatStart={onChatStart} />
      <ChatShell onClose={() => setSelectedFile(null)}>
        <ThreadPrimitive.Root className="flex h-full w-full flex-col bg-transparent">
          <ThreadPrimitive.Empty>
            <div className="flex w-full flex-col items-center justify-center">
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

          <ThreadPrimitive.Viewport className="flex grow flex-col gap-4 overflow-y-auto pb-4 pt-4">
            <ThreadPrimitive.Messages components={{ Message: ChatMessage }} />
            <TypingIndicator />
          </ThreadPrimitive.Viewport>

          <ComposerContainer>
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
      </ChatShell>
    </>
  );
};

const ChatShell = ({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) => {
  const api = useAssistantApi();
  const hasMessages = useAssistantState(
    (state) => state.thread.messages.length > 0
  );

  return (
    <div
      className={
        hasMessages
          ? "fixed inset-0 z-50 flex min-h-screen flex-col bg-[var(--bg)] px-6 py-6"
          : "relative flex h-full w-full flex-col"
      }
    >
      {hasMessages && (
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
