"use client";

import { useState } from "react";
import { useAction } from "convex/react";
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

  return (
    <button
      type="button"
      onClick={async () => {
        if (isSubmitting) return;
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
  );
}
