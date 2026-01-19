"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Container from "@/components/Container";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

type EntitlementsSnapshot = {
  userPlan: string;
};

export default function ChatHistoryPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [entitlements, setEntitlements] = useState<EntitlementsSnapshot | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;
    fetch("/api/ai")
      .then((response) => response.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.entitlements) {
          setEntitlements({ userPlan: data.entitlements.userPlan });
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, []);

  const canUseChatHistory = useMemo(() => {
    const plan = entitlements?.userPlan ?? "none";
    return (
      plan === "pro" ||
      plan === "big_fix" ||
      plan === "medium_fix" ||
      plan === "big" ||
      plan === "medium"
    );
  }, [entitlements]);

  const threads = useQuery(
    api.chatHistory.listThreadsForUser,
    !isLoading && isAuthenticated && canUseChatHistory ? {} : "skip",
  );

  return (
    <div className="bg-[var(--bg)] py-16 lg:py-24">
      <Container>
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="font-display text-4xl font-semibold text-white sm:text-5xl">
                Chat history
              </h1>
              <p className="mt-4 max-w-2xl text-base text-[var(--muted)] sm:text-lg">
                Find past fixes, revisit steps, and pick up where you left off.
              </p>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Chat history is available on Medium, Big, and Pro plans.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Search
              </label>
              <input
                type="text"
                placeholder="Search past chats..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30"
              />
            </div>

            {!isLoading && (!isAuthenticated || !canUseChatHistory) ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center">
                <h2 className="text-xl font-semibold text-white">
                  See your chat history
                </h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Chat history.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {!isAuthenticated ? (
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/30"
                    >
                      Log in
                    </Link>
                  ) : null}
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[var(--accent-soft)]"
                  >
                    Get a Fix
                  </Link>
                </div>
              </div>
            ) : threads && threads.length > 0 ? (
              <div className="grid gap-4">
                {threads.map((chat) => (
                  <div
                    key={chat.id}
                    className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          {chat.title}
                        </h2>
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          {chat.lastPreview}
                        </p>
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        {new Date(chat.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-4 inline-flex items-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                      Available on Medium/Big/Pro
                    </div>
                    <div className="mt-4">
                      <Link
                        href={`/?thread=${chat.id}`}
                        className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)] transition hover:text-[var(--accent-soft)]"
                      >
                        Open chat
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center">
                <h2 className="text-xl font-semibold text-white">
                  No chats yet
                </h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Start a repair chat and your history will show up here.
                </p>
                <Link
                  href="/"
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[var(--accent-soft)]"
                >
                  Start a new repair chat
                </Link>
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
