"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

import { Button } from "@/components/ui/button";
import Container from "./Container";
import { useUser } from "@/lib/useUser";
import {
  CREDIT_STORAGE_KEY,
  ensureAnonymousId,
  ensureInitialCredits,
  getStoredCredits,
  setStoredCredits,
} from "@/lib/credits";

export default function Navbar() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();
  const displayName = user?.name || user?.email || "Account";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const existing = getStoredCredits();
    if (existing !== null) return existing;
    const initial = ensureInitialCredits();
    return typeof initial === "number" ? initial : null;
  });
  const isHydrated = typeof window !== "undefined";
  const menuRef = useRef<HTMLDivElement | null>(null);
  const updateCredits = useCallback((value: number | null | undefined) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    const normalized = Math.max(0, Math.floor(value));
    setCredits(normalized);
    setStoredCredits(normalized);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    ensureAnonymousId();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const handleCreditsUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ credits?: number }>).detail;
      if (typeof detail?.credits === "number") {
        updateCredits(detail.credits);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== CREDIT_STORAGE_KEY) return;
      const next = getStoredCredits();
      if (next !== null) {
        setCredits(next);
      }
    };
    window.addEventListener("fixly-credits-update", handleCreditsUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("fixly-credits-update", handleCreditsUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [isHydrated, updateCredits]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const refreshCredits = () => {
      fetch("/api/ai")
        .then((res) => res.json())
        .then((data) => {
          if (typeof data?.entitlements?.credits === "number") {
            updateCredits(data.entitlements.credits);
            return;
          }
          const stored = getStoredCredits();
          if (stored !== null) {
            setCredits(stored);
            return;
          }
          const initial = ensureInitialCredits();
          if (typeof initial === "number") {
            updateCredits(initial);
          }
        })
        .catch(() => {});
    };
    refreshCredits();
    window.addEventListener("focus", refreshCredits);
    const interval = window.setInterval(refreshCredits, 60000);
    return () => {
      window.removeEventListener("focus", refreshCredits);
      window.clearInterval(interval);
    };
  }, [isAuthenticated, updateCredits]);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:var(--bg)]/90 backdrop-blur">
      <Container>
        <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <span className="font-display text-xl">Fixly</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
            <Link className="transition hover:text-white" href="/pricing">
              Pricing
            </Link>
            <Link className="transition hover:text-white" href="/how-it-works">
              How it works
            </Link>
            <Link className="transition hover:text-white" href="/reviews">
              Reviews
            </Link>
            <Link className="transition hover:text-white" href="/about">
              About
            </Link>
            <Link className="transition hover:text-white" href="/help">
              Help
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {isHydrated && typeof credits === "number" ? (
              <span className="inline-flex items-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
                Credits: {credits}
              </span>
            ) : null}
            {!isLoading && isAuthenticated ? (
              <>
                <div
                  ref={menuRef}
                  className="relative"
                  onMouseEnter={() => setIsMenuOpen(true)}
                  onMouseLeave={() => setIsMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-[var(--muted)] transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                  >
                    <span className="max-w-[160px] truncate">
                      {displayName}
                    </span>
                    <span className="text-xs">▾</span>
                  </button>
                  {isMenuOpen ? (
                    <div className="absolute top-full right-4 left-4 z-50 w-auto origin-top pt-2 focus:outline-none md:right-0 md:left-auto md:w-64 md:origin-top-right">
                      <div className="rounded-xl border border-white/10 bg-[var(--bg-elev)] p-1 shadow-xl backdrop-blur-xl">
                        <Link
                          href="/profile"
                          className="block rounded-lg px-3 py-2 transition hover:bg-white/5"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <p className="truncate text-sm font-bold text-white">
                            {user?.name || "User"}
                          </p>
                          <p className="truncate text-xs text-[var(--muted)]">
                            {user?.email}
                          </p>
                        </Link>
                        <div className="my-1 h-px bg-white/10" />
                        <Link
                          href="/tasks"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-[var(--text)] transition hover:bg-white/5"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Tasks
                        </Link>
                        <div className="my-1 h-px bg-white/10" />
                        <Link
                          href="/pricing"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-[var(--text)] transition hover:bg-white/5"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Get Credits
                        </Link>
                        <Link
                          href="/help"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-[var(--text)] transition hover:bg-white/5"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Help
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await signOut();
                    router.push("/");
                  }}
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link
                  className="text-[var(--muted)] transition hover:text-white"
                  href="/login"
                >
                  Login
                </Link>
                <Link
                  className="rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 font-medium text-black transition hover:bg-[var(--accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                  href="/signup"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}
