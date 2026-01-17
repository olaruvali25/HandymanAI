import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import ReviewsGrid from "@/components/reviews/ReviewsGrid";
import StarRating from "@/components/reviews/StarRating";

const reviews = [
  {
    id: "maya-r",
    name: "Maya R.",
    region: "US",
    rating: 4.5,
    problem: "leaking P-trap",
    fix: "tightened slip joint + new washer",
    tags: ["Plumbing", "Saved money"],
    highlight: "Beginner",
    body: [
      "Total beginner and honestly nervous, but the photo guidance circled the right nut on my P-trap.",
      "New washer, quarter-turn, drip gone. I did not need a call-out.",
    ],
  },
  {
    id: "lukas-d",
    name: "Lukas D.",
    region: "Germany",
    rating: 5,
    problem: "closet door off track",
    fix: "adjusted roller + replaced guide",
    tags: ["Doors"],
    body: [
      "Closet door jumped the track and I thought it was toast.",
      "The steps were calm and practical. It was a tiny roller adjustment and a new guide.",
    ],
  },
  {
    id: "priya-k",
    name: "Priya K.",
    region: "UK",
    rating: 5,
    problem: "front door rubbing the frame",
    fix: "tightened hinges + added a shim",
    tags: ["Doors"],
    body: [
      "Fixly nudged me to check the hinges before sanding the door. That saved me hours.",
      "It felt doable and the door now closes cleanly.",
    ],
  },
  {
    id: "noah-b",
    name: "Noah B.",
    region: "Canada",
    rating: 4.5,
    problem: "floating shelf wobble",
    fix: "found stud + used toggle anchors",
    tags: ["Mounting"],
    body: [
      "I was nervous about drilling into tile, but the voice guidance kept me slow and steady.",
      "Shelf is rock solid now.",
    ],
  },
  {
    id: "elena-p",
    name: "Elena P.",
    region: "Romania",
    rating: 4,
    problem: "small drywall hole",
    fix: "mesh patch + light skim coat",
    tags: ["Patch/Caulk"],
    highlight: "First DIY patch",
    body: [
      "I am not handy. The tool checklist helped a lot.",
      "Two short passes and it blended in better than I expected.",
    ],
  },
  {
    id: "jasmine-l",
    name: "Jasmine L.",
    region: "Australia",
    rating: 5,
    problem: "bathtub caulk cracked",
    fix: "removed old bead + re-caulked",
    tags: ["Patch/Caulk"],
    body: [
      "The photo tips were key, especially the angle for the bead.",
      "It looks cleaner and I am not dreading the next time.",
    ],
  },
  {
    id: "omar-s",
    name: "Omar S.",
    region: "US",
    rating: 5,
    problem: "toilet running nonstop",
    fix: "adjusted chain + replaced flapper",
    tags: ["Plumbing", "Saved money"],
    highlight: "Saved a call-out",
    body: [
      "I saved a call-out fee and learned why it kept running.",
      "Fix was quick once I saw the photo callouts.",
    ],
  },
  {
    id: "sofia-m",
    name: "Sofia M.",
    region: "UK",
    rating: 4.5,
    problem: "cabinet door misaligned",
    fix: "tuned hinge screws",
    tags: ["Doors"],
    body: [
      "It was a simple tweak, but I would have guessed wrong.",
      "Loved the short checklist and the gentle pacing.",
    ],
  },
  {
    id: "ethan-c",
    name: "Ethan C.",
    region: "Canada",
    rating: 5,
    problem: "shower head leak",
    fix: "cleaned threads + new tape",
    tags: ["Plumbing"],
    body: [
      "I asked the home repair chatbot late at night and had it fixed before bed.",
    ],
  },
  {
    id: "avery-n",
    name: "Avery N.",
    region: "US",
    rating: 4,
    problem: "outlet felt warm",
    fix: "shut off breaker + called an electrician",
    tags: ["Saved money"],
    highlight: "Safety call",
    body: [
      "Fixly told me to stop and call a pro for safety. That honesty mattered.",
    ],
  },
  {
    id: "hannah-t",
    name: "Hannah T.",
    region: "Germany",
    rating: 5,
    problem: "sticky patio door",
    fix: "cleaned track + adjusted rollers",
    tags: ["Doors"],
    body: [
      "I expected new rollers, but a clean and tiny adjustment did it.",
      "Saved time and a lot of frustration.",
    ],
  },
  {
    id: "leo-g",
    name: "Leo G.",
    region: "Australia",
    rating: 5,
    problem: "towel bar pulling out",
    fix: "added anchors + longer screws",
    tags: ["Mounting"],
    highlight: "Beginner",
    body: [
      "Beginner here. The picture callout for the anchor size was the difference.",
    ],
  },
];

const ratingBreakdown = [
  { rating: 5, share: 68 },
  { rating: 4, share: 21 },
  { rating: 3, share: 7 },
  { rating: 2, share: 3 },
  { rating: 1, share: 1 },
];

export const metadata: Metadata = {
  title: "Fixly Reviews | Real DIY Repair Stories",
  description:
    "Fixly reviews from early users of our AI handyman assistant and home repair chatbot. Get DIY repair help for plumbing leak fix, door hinge repair, and more, and save money vs handyman.",
  openGraph: {
    title: "Fixly Reviews | Real DIY Repair Stories",
    description:
      "Fixly reviews from early users of our AI handyman assistant and home repair chatbot. DIY repair help for plumbing leak fix, door hinge repair, and more.",
    type: "website",
  },
  keywords: [
    "Fixly reviews",
    "AI handyman assistant",
    "DIY repair help",
    "home repair chatbot",
    "plumbing leak fix",
    "door hinge repair",
    "save money vs handyman",
  ],
};

export default function ReviewsPage() {
  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(255,122,26,0.15)] via-transparent to-transparent opacity-70" />
        <Container>
          <div className="relative z-10 grid gap-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-1.5 text-xs font-bold tracking-widest text-[var(--accent)] uppercase shadow-[0_0_15px_-5px_var(--accent)]">
                Fixly reviews from early users
              </div>
              <h1 className="font-display mt-8 text-5xl font-bold tracking-tighter text-white sm:text-6xl lg:text-7xl">
                Real stories from people who fixed it themselves.
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
                Fixly is an AI handyman assistant for DIY repair help. Share a
                photo or use voice guidance, save time and money vs a handyman,
                and know when to pause and call a pro.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                These Fixly reviews include plumbing leak fix wins, door hinge
                repair, mounting, and patch work from our home repair chatbot
                community.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  "Photo-aware guidance",
                  "Voice-friendly steps",
                  "Honest safety prompts",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative flex items-center">
              <div className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-[var(--accent)]/10 blur-3xl" />
              <div className="relative w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
                <div className="text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
                  Early community rating
                </div>
                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-5xl font-bold tracking-tight text-white">
                      4.8
                    </div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      Average (early user feedback)
                    </div>
                  </div>
                  <div className="text-right">
                    <StarRating rating={4.8} size={24} />
                    <div className="mt-2 text-xs font-medium text-[var(--muted)]">
                      Not audited, shared by beta users
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {ratingBreakdown.map((row) => (
                    <div
                      key={row.rating}
                      className="flex items-center gap-4 text-xs font-medium text-[var(--muted)]"
                    >
                      <span className="w-12">{row.rating} star</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] shadow-[0_0_10px_-2px_var(--accent)]"
                          style={{ width: `${row.share}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-white/60">
                        {row.share}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-24">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Reviews that feel like real jobs.
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-[var(--muted)]">
                Every story below is written in a human voice, with the problem
                and the fix called out clearly.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-medium text-white/80 backdrop-blur-sm">
              DIY-friendly, small and medium fixes
            </div>
          </div>

          <ReviewsGrid reviews={reviews} />
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-24">
        <Container>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-sm md:p-12">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Before you trust us, trust the limits.
            </h2>
            <ul className="mt-6 space-y-3 text-base leading-relaxed text-[var(--muted)]">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                <span>Fixly is great for small and medium DIY repairs.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                <span>
                  For gas, serious electrical, or structural work, we will tell
                  you to call a licensed pro.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                <span>Safety and clarity come before speed.</span>
              </li>
            </ul>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-8 py-16 text-center shadow-2xl backdrop-blur-sm md:px-16">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--accent)]/10 to-transparent opacity-50" />
            <div className="relative z-10">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Try Fixly on your next small fix.
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--muted)]">
                Start a chat with your AI handyman and get unstuck in minutes.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-8 py-4 text-sm font-semibold text-black shadow-[0_0_20px_-5px_var(--accent)] transition-all duration-200 hover:scale-[1.02] hover:bg-[var(--accent)]/90 hover:shadow-[0_0_25px_-5px_var(--accent)] active:scale-[0.98]"
                >
                  Start a chat
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-white/10 active:scale-[0.98]"
                >
                  See pricing
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
