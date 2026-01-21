"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAction, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";

const creditOptions = Array.from({ length: 15 }, (_, i) => (i + 1) * 100);
const pricePer100 = 5;

export default function TopUpCredits() {
  const [credits, setCredits] = useState(100);
  const price = useMemo(() => (credits / 100) * pricePer100, [credits]);
  const createCheckout = useAction(api.stripe.createTopupCheckoutSession);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated } = useConvexAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const canCheckout = true;

  return (
    <div className="group relative flex h-full flex-col rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:bg-white/[0.05] hover:shadow-black/50">
      <div className="text-lg font-semibold text-white/90">Top-up credits</div>
      <div className="mt-1 text-[10px] font-bold tracking-[0.2em] text-[var(--muted)] uppercase">
        One-time purchase
      </div>
      <div className="mt-8 flex items-baseline gap-2">
        <div className="text-4xl font-semibold tracking-tight text-white">
          $5
        </div>
        <div className="text-[10px] font-bold tracking-[0.2em] text-[var(--muted)] uppercase">
          per 100 credits
        </div>
      </div>

      <div className="mt-10">
        <label className="text-[10px] font-bold tracking-[0.2em] text-[var(--muted)] uppercase">
          Choose credits
        </label>
        <div className="relative mt-4">
          <select
            value={credits}
            onChange={(event) => setCredits(Number(event.target.value))}
            className="w-full appearance-none rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-sm text-white/90 transition-all duration-300 focus:border-[var(--accent)]/30 focus:bg-white/[0.05] focus:outline-none"
          >
            {creditOptions.map((option) => (
              <option key={option} value={option} className="bg-[#1a1a1a]">
                {option} credits
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-[var(--muted)]">
            <svg
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1L5 5L9 1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="text-[var(--muted)]">Total price</span>
        <span className="font-semibold text-white">${price.toFixed(0)}</span>
      </div>

      <div className="mt-auto pt-10">
        <button
          type="button"
          onClick={async () => {
            if (!canCheckout || isSubmitting) return;
            if (!isAuthenticated) {
              setShowAuthModal(true);
              return;
            }
            setIsSubmitting(true);
            try {
              const paymentUrl = await createCheckout({ credits });
              if (paymentUrl) {
                window.location.href = paymentUrl;
              }
            } catch (error) {
              console.error("Payment failed", error);
            } finally {
              setIsSubmitting(false);
            }
          }}
          disabled={!canCheckout || isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-8 py-4 text-[15px] font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Redirecting..." : "Add credits"}
        </button>
      </div>

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
                    Purchase
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
                    Log in to buy credits
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
    </div>
  );
}
