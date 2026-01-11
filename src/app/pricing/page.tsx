import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";

const tiers = [
  {
    name: "Small Fix",
    price: "$10",
    cadence: "one-time",
    summary: "For quick, focused repairs you can finish today.",
    features: [
      "Step-by-step text chat guidance",
      "Basic next-step prompts",
      "Up to 12 photos for this fix",
      "Single fix scope (one problem)",
      "No voice mode",
    ],
    cta: "Start Small Fix",
    href: "/?plan=small",
  },
  {
    name: "Medium Fix",
    price: "$20",
    cadence: "one-time",
    summary: "Great for a couple of related issues in one session.",
    features: [
      "Everything in Small Fix",
      "Photo guidance enabled",
      "Voice input + AI voice replies",
      "Smarter follow-ups after each step",
      "Up to 2-3 related issues per session",
    ],
    badge: "Most popular",
    cta: "Choose Medium Fix",
    href: "/?plan=medium",
  },
  {
    name: "Big Fix",
    price: "$25",
    cadence: "one-time",
    summary: "Best for bigger projects with more back-and-forth.",
    features: [
      "Photo + voice fully enabled",
      "Longer guidance window (7 days)",
      "Iterative troubleshooting support",
      "More context memory per fix",
      "Expanded steps for complex DIY",
    ],
    cta: "Choose Big Fix",
    href: "/?plan=big",
  },
  {
    name: "Pro",
    price: "$25",
    cadence: "/month",
    summary: "For homeowners and renters who fix things regularly.",
    features: [
      "Everything Fixly has (unlimited)",
      "Unlimited chats + saved history",
      "Favorites and quick re-use",
      "Photo + voice always on",
      "Premium visuals when useful",
      "Cancel anytime",
    ],
    badge: "All access",
    cta: "Go Pro",
    href: "/pricing?plan=pro",
  },
];

const comparisonRows = [
  {
    label: "Voice guidance",
    values: ["—", "Yes", "Yes", "Yes"],
  },
  {
    label: "Photo guidance",
    values: ["Limited", "Yes", "Unlimited", "Unlimited"],
  },
  {
    label: "Chat history",
    values: ["—", "—", "—", "Yes"],
  },
  {
    label: "Favorites",
    values: ["—", "—", "Yes", "Yes"],
  },
  {
    label: "Premium visuals",
    values: ["—", "—", "Limited", "Yes"],
  },
];

const faqs = [
  {
    question: "What counts as a fix?",
    answer:
      "A fix is one clear problem you are working through, like a leak, a door adjustment, or a mounting job.",
  },
  {
    question: "Can Fixly help with dangerous issues?",
    answer:
      "Fixly can warn you about unsafe work. For gas, serious electrical, or structural issues, it will tell you to stop and call a licensed pro.",
  },
  {
    question: "Do I need Pro?",
    answer:
      "Not necessarily. If you only need help occasionally, a one-time fix is enough.",
  },
  {
    question: "Can I switch plans later?",
    answer: "Yes. You can start with a one-time fix and move to Pro anytime.",
  },
  {
    question: "Do you store my chats?",
    answer:
      "Pro includes saved history. One-time fixes keep the thread for that repair only.",
  },
  {
    question: "Refunds?",
    answer:
      "If something feels off, contact support and we will help you sort it out.",
  },
];

export const metadata: Metadata = {
  title: "Fixly Pricing | AI Handyman & DIY Repair Assistant Plans",
  description:
    "Simple pricing for Fixly, the AI handyman and DIY repair assistant. Get step-by-step help to fix leaks, fix doors, and save money vs handyman with voice + photo guidance.",
  openGraph: {
    title: "Fixly Pricing | AI Handyman & DIY Repair Assistant Plans",
    description:
      "Choose a Fixly plan for DIY repair help. Fix leaks, fix doors, and save money vs handyman with voice + photo guidance.",
    type: "website",
  },
  keywords: [
    "AI handyman",
    "DIY repair assistant",
    "fix leaks",
    "fix doors",
    "save money vs handyman",
    "voice + photo guidance",
  ],
};

export default function PricingPage() {
  return (
    <div className="bg-[var(--bg)]">
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,122,26,0.12),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
        <Container>
          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1 text-xs font-medium text-[var(--accent)]">
                Flexible pricing for real DIY moments
              </div>
              <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Fix it yourself without guessing.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-[var(--muted)] sm:text-lg">
                Get photo and voice guidance, clear step-by-step help, and
                honest prompts to call a pro when it matters.
              </p>
              <p className="mt-4 text-sm text-[var(--muted)]">
                No long contracts. Cancel anytime. <span className="text-white/60">(Pro only)</span>
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">

              </p>
            </div>

            <div className="relative">
              <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-[var(--accent)]/10 blur-2xl" />
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)]/70 p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Why people choose Fixly
                </div>
                <div className="mt-4 grid gap-3">
                  {[
                    "Clear steps instead of guesswork",
                    "Photo guidance for the tricky parts",
                    "Voice-friendly when your hands are busy",
                    "Know when to pause and call a pro",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80"
                    >
                      {item}
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
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="group relative flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:border-white/20"
              >
                {tier.badge ? (
                  <div className="absolute right-4 top-4 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                    {tier.badge}
                  </div>
                ) : null}
                <div className="text-sm font-semibold text-white">
                  {tier.name}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className="text-3xl font-semibold text-white">
                    {tier.price}
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    {tier.cadence}
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {tier.summary}
                </p>
                <ul className="mt-5 space-y-2 text-sm text-white/80">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[var(--accent)]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link
                    href={tier.href}
                    className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${tier.badge
                      ? "bg-[var(--accent)] text-black hover:bg-[var(--accent-soft)]"
                      : "border border-[var(--border)] text-white hover:border-white/40"
                      }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-16">
        <Container>
          <h2 className="font-display text-3xl font-semibold text-white">
            Compare plans at a glance
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
            A quick view of what changes as your fix gets bigger.
          </p>

          <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)]/60">
            <div className="grid grid-cols-[1.3fr_repeat(4,1fr)] gap-0 border-b border-[var(--border)] text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              <div className="px-4 py-3">Feature</div>
              <div className="px-4 py-3">Small</div>
              <div className="px-4 py-3">Medium</div>
              <div className="px-4 py-3">Big</div>
              <div className="px-4 py-3">Pro</div>
            </div>
            {comparisonRows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1.3fr_repeat(4,1fr)] gap-0 border-b border-[var(--border)] text-sm text-white/80 last:border-b-0"
              >
                <div className="px-4 py-3 text-white">{row.label}</div>
                {row.values.map((value, index) => (
                  <div
                    key={`${row.label}-${index}`}
                    className="px-4 py-3 text-[var(--muted)]"
                  >
                    {value}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-16 lg:py-24">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h2 className="font-display text-3xl font-semibold text-white">
                Still not sure?
              </h2>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Short answers to the questions we hear most often.
              </p>
              <div className="mt-6 grid gap-4">
                {faqs.map((faq) => (
                  <div
                    key={faq.question}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)]/60 px-5 py-4 text-sm text-white/80"
                  >
                    <div className="text-sm font-semibold text-white">
                      {faq.question}
                    </div>
                    <div className="mt-2 text-[var(--muted)]">
                      {faq.answer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[radial-gradient(circle_at_top,rgba(255,122,26,0.12),transparent_60%)] p-8 text-center shadow-[var(--shadow-soft)]">
              <h3 className="font-display text-2xl font-semibold text-white">
                Ready to start your fix?
              </h3>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Pick a plan, start a chat, and move through the repair with
                confidence.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href="/?plan=small"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[var(--accent-soft)]"
                >
                  Start a chat
                </Link>
                <Link
                  href="/reviews"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40"
                >
                  Read reviews
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="pb-16 lg:pb-24">
        <Container>
          <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elev)]/70 p-8 shadow-[var(--shadow-soft)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,122,26,0.18),transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="relative z-10 flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
              <div>
                <h3 className="font-display text-2xl font-semibold text-white">
                  Start with a Small Fix.
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  A focused plan for quick DIY wins, with room to upgrade later.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/?plan=small"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[var(--accent-soft)]"
                >
                  Start Small Fix
                </Link>
                <Link
                  href="/pricing?plan=pro"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40"
                >
                  Try Pro
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
