"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import GrokThread from "@/components/chat/GrokThread";

export default function HomePageClient() {
  const searchParams = useSearchParams();
  const threadParam = searchParams.get("thread");

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("chat-page");
    document.body.classList.add("chat-page");
    return () => {
      document.documentElement.classList.remove("chat-page");
      document.body.classList.remove("chat-page");
    };
  }, []);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <section
        id="chat"
        className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,rgba(255,122,26,0.15),transparent_50%)]"
      >
        <div className="flex min-h-0 w-full flex-1 items-stretch">
          <GrokThread
            initialThreadId={threadParam}
            inlineThread
            showHistorySidebar
            header={
              <div className="mx-auto flex max-w-4xl flex-col items-center pt-10 text-center">
                <div className="mb-6 inline-flex items-center rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1 text-xs font-medium text-[var(--accent)] backdrop-blur-sm">
                  <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
                  Live AI Assistant
                </div>

                <h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  What can I help you fix today?
                </h1>

                <p className="mt-6 max-w-2xl text-lg text-[var(--muted)]">
                  Describe the problem, upload a photo, and get professional
                  repair guidance in seconds.
                </p>
              </div>
            }
          />
        </div>
      </section>
    </div>
  );
}
