"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

import { Button } from "@/components/ui/button";
import Container from "./Container";

export default function Navbar() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();

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
            <Link className="transition hover:text-white" href="/reviews">
              Reviews
            </Link>
            <Link className="transition hover:text-white" href="/about">
              About
            </Link>
            {isAuthenticated ? (
              <Link className="transition hover:text-white" href="/tasks">
                Tasks
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {!isLoading && isAuthenticated ? (
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
