"use client";

import { useMemo, useState } from "react";
import StarRating from "@/components/reviews/StarRating";

type Review = {
  id: string;
  name: string;
  region: string;
  rating: number;
  problem: string;
  fix: string;
  tags: string[];
  body: string[];
  highlight?: string;
};

type ReviewsGridProps = {
  reviews: Review[];
};

const filters = [
  "All",
  "Plumbing",
  "Doors",
  "Mounting",
  "Patch/Caulk",
  "Saved money",
];

export default function ReviewsGrid({ reviews }: ReviewsGridProps) {
  const [activeFilter, setActiveFilter] = useState("All");
  const filteredReviews = useMemo(() => {
    if (activeFilter === "All") {
      return reviews;
    }
    return reviews.filter((review) => review.tags.includes(activeFilter));
  }, [activeFilter, reviews]);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = filter === activeFilter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                isActive
                  ? "border-[var(--accent)]/60 bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-white/30 hover:text-white"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredReviews.map((review) => (
          <article
            key={review.id}
            className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">
                  {review.name}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {review.region}
                </div>
              </div>
              <div className="text-right">
                <StarRating rating={review.rating} />
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {review.rating.toFixed(1)}
                </div>
              </div>
            </div>

            {review.highlight ? (
              <div className="mt-3 inline-flex items-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                {review.highlight}
              </div>
            ) : null}

            <div className="mt-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-[var(--muted)]">
              <span className="font-semibold text-white">Problem:</span>{" "}
              {review.problem}
              <span className="mx-2 text-white/30">/</span>
              <span className="font-semibold text-white">Fix:</span>{" "}
              {review.fix}
            </div>

            <div className="mt-4 space-y-3 text-sm text-white/80">
              {review.body.map((line, index) => (
                <p key={`${review.id}-line-${index}`}>{line}</p>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {review.tags.map((tag) => (
                <span
                  key={`${review.id}-${tag}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
