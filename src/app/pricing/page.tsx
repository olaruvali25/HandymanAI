import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import CreditsStatus from "@/app/pricing/CreditsStatus";
import TopUpCredits from "@/app/pricing/TopUpCredits";
import PlanCheckoutButton from "@/app/pricing/PlanCheckoutButton";

const plans = [
  {
    id: "starter",
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
    cta: "Choose this plan",
  },
  {
    id: "plus",
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
    cta: "Choose this plan",
  },
  {
    id: "pro",
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
    cta: "Choose this plan",
  },
];

const creditCosts = [
  { label: "Text message you send", value: "2 credits" },
  {
    label: "Message with photo attachments",
    value: "17 credits (2 + 15)",
  },
  { label: "Text reply from Fixly", value: "2 credits" },
  ,
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
      <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(255,122,26,0.12)] via-transparent to-transparent opacity-80" />
        <Container>
          <div className="relative z-10 grid gap-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-center">
              <h1 className="font-display text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl lg:leading-[1.1]">
                Fix it yourself.
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
                Grab some credits and stop overpaying for repairs that you could do yourself.
              </p>
              <div className="mt-10">
                <CreditsStatus />
              </div>
            </div>
            <div className="relative rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
              <div className="text-[10px] font-bold tracking-[0.2em] text-[var(--muted)] uppercase">
                Why credits
              </div>
              <div className="mt-8 grid gap-3">
                {[
                  "Use credits for text and photos",
                  "Flexible for quick fixes or deep dives",
                  "Balance updates as you chat",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center rounded-2xl border border-white/5 bg-white/[0.03] px-6 py-4 text-sm text-white/80 transition-all duration-300 hover:bg-white/[0.06]"
                  >
                    <span className="mr-4 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-32 lg:py-40">
        <Container>
          <div className="grid gap-8 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`group relative flex h-full flex-col rounded-[2.5rem] border p-8 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-black/50 ${plan.badge
                  ? "border-[var(--accent)]/20 bg-[var(--accent)]/[0.02] hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/[0.04]"
                  : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.05]"
                  }`}
              >
                {plan.badge ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-4 py-1 text-[10px] font-bold tracking-[0.2em] text-black uppercase shadow-[0_0_20px_-5px_var(--accent)]">
                    {plan.badge}
                  </div>
                ) : null}
                <div className="text-lg font-semibold text-white/90">
                  {plan.name}
                </div>
                <div className="mt-6 flex items-baseline gap-2">
                  <div className="text-4xl font-semibold tracking-tight text-white">
                    {plan.price}
                  </div>
                  <div className="text-[10px] font-bold tracking-[0.2em] text-[var(--muted)] uppercase">
                    {plan.cadence}
                  </div>
                </div>
                <div className="mt-8 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-5 text-center">
                  <div className="text-[10px] font-bold tracking-[0.2em] text-[var(--muted)] uppercase">
                    Monthly Credits
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {plan.creditsPerMonth}
                  </div>
                </div>
                <p className="mt-8 text-[15px] leading-relaxed text-[var(--muted)]">
                  {plan.summary}
                </p>
                <ul className="mt-10 space-y-5 text-[14px] text-white/70">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-4">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-10">
                  <PlanCheckoutButton
                    plan={plan.id as "starter" | "plus" | "pro"}
                    label={plan.cta}
                    variant={plan.badge ? "primary" : "secondary"}
                  />
                </div>
              </div>
            ))}
            <TopUpCredits />
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-32 lg:py-40">
        <Container>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            How credits work
          </h2>
          <div className="mt-12 grid gap-6 text-[15px] text-white/70 sm:grid-cols-3">
            <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] px-8 py-8 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]">
              Every message uses credits to power the AI response.
            </div>
            <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] px-8 py-8 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]">
              Adding photos costs more credits for visual analysis.
            </div>
            <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] px-8 py-8 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]">
              Your balance updates automatically as you chat.
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-32 lg:py-40">
        <Container>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Credit costs
          </h2>
          <div className="mt-12 overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] shadow-2xl backdrop-blur-sm">
            {creditCosts.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-8 border-b border-white/5 px-10 py-8 text-[15px] text-white/70 transition-all duration-300 last:border-b-0 hover:bg-white/[0.04]"
              >
                <span className="font-medium text-white/90">{row.label}</span>
                <span className="font-mono text-[13px] tracking-tight text-[var(--muted)]">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-32 lg:py-40">
        <Container>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Examples
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              "Text-only turn: 4 credits (2 + 2)",
              "You send photos + text reply: 19 credits (15 + 2 + 2)",
            ].map((example) => (
              <div
                key={example}
                className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-10 text-[15px] leading-relaxed text-white/70 shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:bg-white/[0.05]"
              >
                {example}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-32 lg:pb-40">
        <Container>
          <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-white/[0.02] px-8 py-20 text-center shadow-2xl backdrop-blur-sm md:px-16 md:text-left lg:py-28">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--accent)]/10 to-transparent opacity-40" />
            <div className="relative z-10 flex flex-col items-center justify-between gap-12 md:flex-row">
              <div>
                <h3 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Ready to fix something?
                </h3>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-10 py-4 text-[15px] font-bold text-black shadow-[0_0_30px_-5px_var(--accent)]/40 transition-all duration-300 hover:scale-[1.02] hover:bg-[var(--accent)]/90 hover:shadow-[0_0_40px_-5px_var(--accent)]/50 active:scale-[0.98]"
                >
                  Get started
                </Link>
                <Link
                  href="/pricing?topup=1"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-10 py-4 text-[15px] font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 active:scale-[0.98]"
                >
                  Continue with this option
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
