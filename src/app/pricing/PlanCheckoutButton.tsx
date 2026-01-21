"use client";

import Link from "next/link";
import { useState } from "react";
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

      {showAuthModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowAuthModal(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[var(--bg-elev)]/95 p-6 text-white shadow-2xl">
            <div className="text-lg font-semibold">Log in to choose a plan</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Log in or create an account to finish your purchase.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                Not now
              </button>
              <Link
                href="/login"
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black hover:bg-[var(--accent)]/90"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
