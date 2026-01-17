import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import CreditsStatus from "@/app/pricing/CreditsStatus";
import TopUpCredits from "@/app/pricing/TopUpCredits";

const plans = [
  {
    name: "Starter",
    price: "$12",
    cadence: "/month",
    creditsPerMonth: 300,
    summary: "A solid base for occasional fixes.",
    features: [
      "Credits refresh monthly",
      "Use credits for text + photos",
      "No message caps, just credits",
    ],
    cta: "Get Starter",
    href: "/pricing?plan=starter",
  },
  {
    name: "Plus",
    price: "$24",
    cadence: "/month",
    creditsPerMonth: 800,
    summary: "Great for photo-heavy repairs.",
    features: [
      "Credits refresh monthly",
      "Use credits for text + photos",
      "No message caps, just credits",
    ],
    badge: "Most popular",
    cta: "Get Plus",
    href: "/pricing?plan=plus",
  },
  {
    name: "Pro",
    price: "$40",
    cadence: "/month",
    creditsPerMonth: 1600,
    summary: "Built for ongoing home projects.",
    features: [
      "Credits refresh monthly",
      "Use credits for text + photos",
      "No message caps, just credits",
    ],
    cta: "Get Pro",
    href: "/pricing?plan=pro",
  },
];

const creditCosts = [
  { label: "Text message you send", value: "1 credit" },
  {
    label: "Message with photo attachments",
    value: "16 credits (1 + 15)",
  },
  { label: "Text reply from Fixly", value: "2 credits" },
  {
    label: "Reply that generates an image",
    value: "7 credits (2 + 5)",
  },
];

export const metadata: Metadata = {
  title: "Fixly Pricing | Monthly credits for home repairs",
  description:
    "Choose a monthly plan or top up credits. Credits power Fixlys step-by-step help for repairs, photos, and guidance.",
  openGraph: {
    title: "Fixly Pricing | Monthly credits for home repairs",
    description:
      "Choose a monthly plan or top up credits. Credits power Fixlys step-by-step help for repairs, photos, and guidance.",
    siteName: "Fixly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(255,122,26,0.15)] via-transparent to-transparent opacity-70" />
        <Container>
          <div className="relative z-10 grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-center">
              <h1 className="font-display text-5xl font-bold tracking-tighter text-white sm:text-6xl lg:text-7xl">
                Pricing
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
                Pick a monthly credit plan, or top up anytime.
              </p>
              <CreditsStatus />
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
              <div className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                Why credits
              </div>
              <div className="mt-6 grid gap-4">
                {[
                  "Use credits for text and photos",
                  "Flexible for quick fixes or deep dives",
                  "Balance updates as you chat",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center rounded-xl border border-white/5 bg-black/20 px-5 py-4 text-sm text-white/90 transition-colors hover:bg-black/30"
                  >
                    <span className="mr-3 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-24">
        <Container>
          <div className="grid gap-8 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`group relative flex h-full flex-col rounded-3xl border p-8 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-black/50 ${plan.badge
                  ? "border-[var(--accent)]/30 bg-[var(--accent)]/[0.03] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/[0.05]"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                  }`}
              >
                {plan.badge ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-black shadow-lg shadow-[var(--accent)]/20">
                    {plan.badge}
                  </div>
                ) : null}
                <div className="text-lg font-semibold text-white">
                  {plan.name}
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <div className="text-4xl font-bold tracking-tight text-white">
                    {plan.price}
                  </div>
                  <div className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                    {plan.cadence}
                  </div>
                </div>
                <div className="mt-6 rounded-xl border border-white/5 bg-black/20 px-4 py-4 text-center">
                  <div className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                    Credits per month
                  </div>
                  <div className="mt-1 text-3xl font-bold text-white">
                    {plan.creditsPerMonth}
                  </div>
                </div>
                <p className="mt-6 text-sm leading-relaxed text-[var(--muted)]">
                  {plan.summary}
                </p>
                <ul className="mt-8 space-y-4 text-sm text-white/80">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <Link
                    href={plan.href}
                    className={`inline-flex w-full items-center justify-center rounded-full px-6 py-4 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${plan.badge
                      ? "bg-[var(--accent)] text-black shadow-[0_0_20px_-5px_var(--accent)] hover:bg-[var(--accent)]/90 hover:shadow-[0_0_25px_-5px_var(--accent)]"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}

            <TopUpCredits />
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-24">
        <Container>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white">
            How credits work
          </h2>
          <div className="mt-8 grid gap-4 text-sm text-white/80 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-sm transition-colors hover:bg-white/10">
              Every message uses credits.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-sm transition-colors hover:bg-white/10">
              Adding photos costs more credits.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-sm transition-colors hover:bg-white/10">
              Your balance updates automatically as you chat.
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-24">
        <Container>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white">
            Credit costs
          </h2>
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm">
            {creditCosts.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 border-b border-white/5 px-8 py-6 text-sm text-white/80 transition-colors hover:bg-white/5 last:border-b-0"
              >
                <span className="font-medium text-white">{row.label}</span>
                <span className="text-[var(--muted)]">{row.value}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-24">
        <Container>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white">
            Examples
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              "Text-only turn: 3 credits (1 + 2)",
              "You send photos + text reply: 18 credits (16 + 2)",
              "Text + image reply: 8 credits (1 + 7)",
            ].map((example) => (
              <div
                key={example}
                className="rounded-3xl border border-white/10 bg-white/5 p-8 text-sm leading-relaxed text-white/80 shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
              >
                {example}
              </div>
            ))}
          </div>
        </Container>
      </section>



      <section className="pb-24">
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-8 py-12 text-center shadow-2xl backdrop-blur-sm md:px-12 md:text-left">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--accent)]/10 to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col items-center justify-between gap-8 md:flex-row">
              <div>
                <h3 className="font-display text-3xl font-bold tracking-tight text-white">
                  Ready to fix something?
                </h3>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-8 py-4 text-sm font-semibold text-black shadow-[0_0_20px_-5px_var(--accent)] transition-all duration-200 hover:bg-[var(--accent)]/90 hover:scale-[1.02] hover:shadow-[0_0_25px_-5px_var(--accent)] active:scale-[0.98]"
                >
                  Start a chat
                </Link>
                <Link
                  href="/pricing?topup=1"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Add credits
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
