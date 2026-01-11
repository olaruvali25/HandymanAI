"use client";

import { useId } from "react";

type StarRatingProps = {
  rating: number;
  size?: number;
  className?: string;
};

export default function StarRating({
  rating,
  size = 16,
  className = "",
}: StarRatingProps) {
  const id = useId();
  const stars = Array.from({ length: 5 }, (_, index) => {
    const fill = Math.max(0, Math.min(1, rating - index));
    const clipId = `${id}-star-${index}`;

    return (
      <svg
        key={clipId}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={`${fill * 100}%`} height="100%" />
          </clipPath>
        </defs>
        <path
          d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
          fill="none"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        <path
          d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
          fill="var(--accent)"
          clipPath={`url(#${clipId})`}
        />
      </svg>
    );
  });

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {stars}
    </div>
  );
}
