"use client";

import { useEffect, useState } from "react";

type Entitlements = {
  userHasAccount: boolean;
  credits?: number;
};

export default function CreditsStatus() {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/ai")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.entitlements) {
          setEntitlements(data.entitlements as Entitlements);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setEntitlements(null);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!entitlements) return null;

  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/10">
      <div className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
        Your balance
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-white">
        {typeof entitlements.credits === "number"
          ? `${entitlements.credits} credits`
          : "Credits unavailable"}
      </div>
      {!entitlements.userHasAccount ? (
        <div className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          Youre browsing as a guest. Your credits carry over if you create an
          account later.
        </div>
      ) : null}
    </div>
  );
}
