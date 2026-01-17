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
      <div className="flex flex-wrap gap-3">
        {filters.map((filter) => {
          const isActive = filter === activeFilter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full border px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 ${isActive
                  ? "border-[var(--accent)] bg-[var(--accent)] text-black shadow-[0_0_20px_-5px_var(--accent)]"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white"
                }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {filteredReviews.map((review) => (
          <article
            key={review.id}
            className="group relative flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-black/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-white">
                  {review.name}
                </div>
                <div className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                  {review.region}
                </div>
              </div>
              <div className="text-right">
                <StarRating rating={review.rating} />
                <div className="mt-1 text-xs font-medium text-[var(--muted)]">
                  {review.rating.toFixed(1)}
                </div>
              </div>
            </div>

            {review.highlight ? (
              <div className="mt-4 inline-flex self-start rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black shadow-lg shadow-[var(--accent)]/20">
                {review.highlight}
              </div>
            ) : null}

            <div className="mt-6 rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
              <span className="font-semibold text-white">Problem:</span>{" "}
              {review.problem}
              <span className="mx-2 text-white/20">/</span>
              <span className="font-semibold text-white">Fix:</span>{" "}
              {review.fix}
            </div>

            <div className="mt-6 space-y-4 text-sm leading-relaxed text-white/80">
              {review.body.map((line, index) => (
                <p key={`${review.id}-line-${index}`}>{line}</p>
              ))}
            </div>

            <div className="mt-auto pt-6 flex flex-wrap gap-2">
              {review.tags.map((tag) => (
                <span
                  key={`${review.id}-${tag}`}
                  className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-white/50 transition-colors group-hover:border-white/10 group-hover:text-white/70"
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
