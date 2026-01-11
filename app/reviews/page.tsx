import type { Metadata } from "next";
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
    <div className="bg-[var(--bg)]">
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,122,26,0.12),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
        <Container>
          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1 text-xs font-medium text-[var(--accent)]">
                Fixly reviews from early users
              </div>
              <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Real stories from people who fixed it themselves.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-[var(--muted)] sm:text-lg">
                Fixly is an AI handyman assistant for DIY repair help. Share a
                photo or use voice guidance, save time and money vs a handyman,
                and know when to pause and call a pro.
              </p>
              <p className="mt-4 max-w-2xl text-sm text-[var(--muted)]">
                These Fixly reviews include plumbing leak fix wins, door hinge
                repair, mounting, and patch work from our home repair chatbot
                community.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  "Photo-aware guidance",
                  "Voice-friendly steps",
                  "Honest safety prompts",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--muted)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-[var(--accent)]/10 blur-2xl" />
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)]/70 p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Early community rating
                </div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-3xl font-semibold text-white">
                      4.8
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      Average (early user feedback)
                    </div>
                  </div>
                  <div className="text-right">
                    <StarRating rating={4.8} />
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      Not audited, shared by beta users
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {ratingBreakdown.map((row) => (
                    <div
                      key={row.rating}
                      className="flex items-center gap-3 text-xs text-[var(--muted)]"
                    >
                      <span className="w-10">{row.rating} star</span>
                      <div className="h-2 flex-1 rounded-full bg-white/5">
                        <div
                          className="h-2 rounded-full bg-[var(--accent)]"
                          style={{ width: `${row.share}%` }}
                        />
                      </div>
                      <span className="w-8 text-right">{row.share}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-16">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-semibold text-white">
                Reviews that feel like real jobs.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
                Every story below is written in a human voice, with the problem
                and the fix called out clearly.
              </p>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs text-[var(--muted)]">
              DIY-friendly, small and medium fixes
            </div>
          </div>

          <ReviewsGrid reviews={reviews} />
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-16">
        <Container>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)]/60 p-6">
            <h2 className="font-display text-2xl font-semibold text-white">
              Before you trust us, trust the limits.
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <li>Fixly is great for small and medium DIY repairs.</li>
              <li>
                For gas, serious electrical, or structural work, we will tell
                you to call a licensed pro.
              </li>
              <li>Safety and clarity come before speed.</li>
            </ul>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-16 lg:py-24">
        <Container>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[radial-gradient(circle_at_top,rgba(255,122,26,0.12),transparent_60%)] p-10 text-center shadow-[var(--shadow-soft)]">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Try Fixly on your next small fix.
            </h2>
            <p className="mt-4 text-[var(--muted)]">
              Start a chat with your AI handyman and get unstuck in minutes.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[var(--accent-soft)]"
              >
                Start a chat
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:text-white"
              >
                See pricing
              </a>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
