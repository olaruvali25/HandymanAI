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
    <div className="mt-12">
      <div className="flex flex-wrap gap-2.5">
        {filters.map((filter) => {
          const isActive = filter === activeFilter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full border px-5 py-2 text-[11px] font-bold tracking-[0.1em] uppercase transition-all duration-300 ${isActive
                  ? "border-[var(--accent)] bg-[var(--accent)] text-black shadow-[0_0_20px_-5px_var(--accent)]/40"
                  : "border-white/5 bg-white/[0.03] text-white/40 hover:border-white/10 hover:bg-white/[0.06] hover:text-white/80"
                }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {filteredReviews.map((review) => (
          <article
            key={review.id}
            className="group relative flex h-full flex-col rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:bg-white/[0.05] hover:shadow-2xl hover:shadow-black/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-white/90">
                  {review.name}
                </div>
                <div className="mt-1 text-[10px] font-bold tracking-[0.2em] text-[var(--muted)] uppercase">
                  {review.region}
                </div>
              </div>
              <div className="text-right">
                <StarRating rating={review.rating} />
                <div className="mt-1.5 text-[10px] font-bold tracking-[0.1em] text-[var(--muted)] uppercase">
                  {review.rating.toFixed(1)} Rating
                </div>
              </div>
            </div>

            {review.highlight ? (
              <div className="mt-5 inline-flex self-start rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-1 text-[9px] font-bold tracking-[0.1em] text-[var(--accent)] uppercase">
                {review.highlight}
              </div>
            ) : null}

            <div className="mt-8 rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 text-[13px] leading-relaxed text-[var(--muted)]">
              <div className="flex flex-col gap-2">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.1em] text-white/40 uppercase mr-2">Problem:</span>
                  <span className="text-white/80">{review.problem}</span>
                </div>
                <div className="h-px w-full bg-white/5" />
                <div>
                  <span className="text-[10px] font-bold tracking-[0.1em] text-white/40 uppercase mr-2">Fix:</span>
                  <span className="text-white/80">{review.fix}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-white/60">
              {review.body.map((line, index) => (
                <p key={`${review.id}-line-${index}`}>{line}</p>
              ))}
            </div>

            <div className="mt-auto flex flex-wrap gap-2 pt-8">
              {review.tags.map((tag) => (
                <span
                  key={`${review.id}-${tag}`}
                  className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-[9px] font-bold tracking-[0.1em] text-white/30 uppercase transition-colors group-hover:border-white/10 group-hover:text-white/50"
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
