"use client";

import { useEntitlementsQuery } from "@/lib/queries/entitlements";

export default function CreditsStatus() {
  const { data: entitlements } = useEntitlementsQuery();

  if (!entitlements) return null;

  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/10">
      <div className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
        Your balance
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-white">
        {typeof entitlements.credits === "number"
          ? `${entitlements.credits} credits`
          : "Credits unavailable"}
      </div>
      {!entitlements.userHasAccount ? (
        <div className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          You&apos;re browsing as a guest. Your credits carry over if you create an
          account later.
        </div>
      ) : null}
    </div>
  );
}
