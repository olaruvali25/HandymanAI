"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

import { Button } from "@/components/ui/button";
import Container from "./Container";
import { useUser } from "@/lib/useUser";

export default function Navbar() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();
  const displayName = user?.name || user?.email || "Account";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
          </nav>
          <div className="flex items-center gap-3 text-sm">
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
                    <div className="absolute right-0 top-full z-50 w-64 pt-2 origin-top-right focus:outline-none">
                      <div className="rounded-xl border border-white/10 bg-[var(--bg-elev)] p-1 shadow-xl backdrop-blur-xl">
                        <div className="px-3 py-2">
                          <p className="truncate text-sm font-bold text-white">
                            {user?.name || "User"}
                          </p>
                          <p className="truncate text-xs text-[var(--muted)]">
                            {user?.email}
                          </p>
                        </div>
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
                          Grab a Fix
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
