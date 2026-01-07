"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
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

const chatAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const payload = buildPayloadMessages(messages);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
        signal: abortSignal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat API error");
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
            text: "We could not reach the server. Please try again.",
          },
        ],
        status: { type: "incomplete", reason: "error", error: "api_error" },
      };
      return;
    }
  },
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

const ChatMessage = () => {
  const role = useAssistantState((state) => state.message.role);
  const isUser = role === "user";
  const status = useAssistantState((state) => state.message.status);
  const isError =
    role === "assistant" &&
    status?.type === "incomplete" &&
    status.reason === "error";

  return (
    <MessagePrimitive.Root className="px-4 py-2">
      <div
        className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
            isUser
              ? "bg-[var(--accent)] text-white"
              : isError
                ? "border border-red-500/40 bg-red-500/10 text-red-100 text-sm"
                : "border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)] text-base"
          }`}
        >
          <MessagePrimitive.Content />
        </div>
      </div>
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
  selectedImage: File | null;
  setSelectedImage: (file: File | null) => void;
};

const Composer = ({ selectedImage, setSelectedImage }: ComposerProps) => {
  const isEmpty = useAssistantState((state) => state.composer.isEmpty);
  const isRunning = useAssistantState((state) => state.thread.isRunning);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setSelectedImage(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <ComposerPrimitive.Root
      className="group/composer mx-auto w-full max-w-2xl"
      data-empty={isEmpty}
      data-running={isRunning}
    >
      {selectedImage && previewUrl && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-3 text-sm text-[var(--text)] shadow-lg">
          <div className="flex items-center gap-3">
            <img
              src={previewUrl}
              alt="Selected preview"
              className="h-12 w-12 rounded-lg object-cover"
            />
            <span className="max-w-[200px] truncate font-medium">
              {selectedImage.name}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemoveImage}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      <div className="relative flex items-end gap-3 rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)]/80 p-4 shadow-2xl backdrop-blur-xl transition-all focus-within:border-[var(--accent)]/50 focus-within:ring-1 focus-within:ring-[var(--accent)]/50 hover:border-[var(--accent)]/30">
        <button
          type="button"
          onClick={handleCameraClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
        >
          <CameraIcon />
        </button>

        <ComposerPrimitive.Input
          placeholder="Describe the problem..."
          className="min-h-[44px] w-full bg-transparent py-2.5 text-base text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        />

        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition hover:bg-[var(--accent-soft)]">
          <button
            type="button"
            className="absolute inset-0 flex items-center justify-center transition group-data-[empty=false]/composer:scale-0 group-data-[empty=false]/composer:opacity-0"
          >
            <MicIcon />
          </button>
          <ComposerPrimitive.Send className="absolute inset-0 flex items-center justify-center transition group-data-[empty=true]/composer:scale-0 group-data-[empty=true]/composer:opacity-0">
            <ArrowUpIcon />
          </ComposerPrimitive.Send>
          <ComposerPrimitive.Cancel className="absolute inset-0 flex items-center justify-center transition group-data-[running=false]/composer:scale-0 group-data-[running=false]/composer:opacity-0">
            <SquareIcon />
          </ComposerPrimitive.Cancel>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const runtime = useLocalRuntime(chatAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatLogic onChatStart={onChatStart} />
      <ChatShell onClose={() => setSelectedImage(null)}>
        <ThreadPrimitive.Root className="flex h-full w-full flex-col bg-transparent">
          <ThreadPrimitive.Empty>
            <div className="flex w-full flex-col items-center justify-center">
              <Composer
                selectedImage={selectedImage}
                setSelectedImage={setSelectedImage}
              />
            </div>
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Viewport className="flex grow flex-col gap-4 overflow-y-auto pb-4 pt-4">
            <ThreadPrimitive.Messages components={{ Message: ChatMessage }} />
            <TypingIndicator />
          </ThreadPrimitive.Viewport>

          <ComposerContainer>
            <Composer
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
            />
          </ComposerContainer>
        </ThreadPrimitive.Root>
      </ChatShell>
    </AssistantRuntimeProvider>
  );
}

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
