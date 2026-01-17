"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const creditOptions = Array.from({ length: 100 }, (_, i) => (i + 1) * 100);
const pricePer100 = 5;

export default function TopUpCredits() {
  const [credits, setCredits] = useState(100);
  const price = useMemo(() => (credits / 100) * pricePer100, [credits]);

  return (
    <div className="group relative flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-black/50">
      <div className="text-lg font-semibold text-white">Top-up credits</div>
      <div className="mt-1 text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
        One-time purchase
      </div>
      <div className="mt-6 text-4xl font-bold tracking-tight text-white">
        $5
      </div>
      <div className="mt-1 text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
        per 100 credits
      </div>

      <div className="mt-8">
        <label className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
          Choose credits
        </label>
        <div className="relative mt-3">
          <select
            value={credits}
            onChange={(event) => setCredits(Number(event.target.value))}
            className="w-full appearance-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
          >
            {creditOptions.map((option) => (
              <option key={option} value={option} className="bg-[#1a1a1a]">
                {option} credits
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[var(--muted)]">
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

      <div className="mt-4 text-sm text-[var(--muted)]">
        Total:{" "}
        <span className="font-medium text-white">${price.toFixed(0)}</span>
      </div>

      <div className="mt-auto pt-8">
        <Link
          href="/pricing?topup=1"
          className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-white/10 active:scale-[0.98]"
        >
          Add credits
        </Link>
      </div>
    </div>
  );
}
