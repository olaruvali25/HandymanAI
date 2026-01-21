"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useAction, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";

type PlanId = "starter" | "plus" | "pro";

export default function PlanCheckoutButton({
  plan,
  label,
  variant,
}: {
  plan: PlanId;
  label: string;
  variant: "primary" | "secondary";
}) {
  const createCheckout = useAction(api.stripe.createPlanCheckoutSession);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated } = useConvexAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (isSubmitting) return;
          if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
          }
          setIsSubmitting(true);
          try {
            const paymentUrl = await createCheckout({ plan });
            if (paymentUrl) {
              window.location.href = paymentUrl;
            }
          } catch (error) {
            console.error("Plan checkout failed", error);
          } finally {
            setIsSubmitting(false);
          }
        }}
        className={`inline-flex w-full items-center justify-center rounded-full px-6 py-4 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
          variant === "primary"
            ? "bg-[var(--accent)] text-black shadow-[0_0_20px_-5px_var(--accent)] hover:bg-[var(--accent)]/90 hover:shadow-[0_0_25px_-5px_var(--accent)]"
            : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
        }`}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Redirecting..." : label}
      </button>

      {showAuthModal && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowAuthModal(false)}
              />
              <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[var(--bg-elev)]/90 text-white shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <div className="text-xs font-bold tracking-[0.3em] text-[var(--muted)] uppercase">
                    Subscription
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:border-white/30 hover:text-white"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="px-6 py-6">
                  <div className="text-lg font-semibold text-white">
                    Log in to choose a plan
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Log in or create an account to continue.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--accent)]/90"
                    >
                      Sign up
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowAuthModal(false)}
                      className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5"
                    >
                      Not now
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
