import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "About Fixly | AI Handyman for DIY Repair Help",
  description:
    "Fixly is an AI handyman that turns photos and questions into clear DIY repair guidance. Learn how we help you fix it yourself, save money vs a handyman, and stay safe.",
  openGraph: {
    title: "About Fixly | AI Handyman for DIY Repair Help",
    description:
      "Fixly is an AI handyman for fast, safe DIY repair guidance. Get step-by-step help for plumbing leaks, doors, mounting, and more.",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(255,122,26,0.15)] via-transparent to-transparent opacity-70" />
        <Container>
          <div className="relative z-10 grid gap-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-center">
              <div className="inline-flex self-start items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--accent)] shadow-[0_0_15px_-5px_var(--accent)]">
                AI handyman, built for DIY confidence
              </div>
              <h1 className="mt-8 font-display text-5xl font-bold tracking-tighter text-white sm:text-6xl lg:text-7xl">
                Fixly is your AI handyman for fast, safe DIY repair help.
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
                Ask a question, share a photo, and get clear, step-by-step
                guidance for home repair help. Fixly helps you fix it yourself,
                avoid call-out fees, and learn practical skills for everyday
                problems.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  "Describe the issue",
                  "Add photo or voice",
                  "Follow clear steps",
                ].map((step, index) => (
                  <div
                    key={step}
                    className="group rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-lg"
                  >
                    <div className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] group-hover:text-[var(--accent)]">
                      Step {index + 1}
                    </div>
                    <div className="mt-2 font-semibold">{step}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  "Save time when a leak starts",
                  "Avoid call-out fees for small jobs",
                  "Get unstuck fast without guesswork",
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
              <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[var(--accent)]/10 blur-3xl" />
              <div className="relative w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  Repair flow (example)
                </div>
                <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 font-sans">
                  <div className="self-end rounded-2xl rounded-tr-sm bg-white/10 px-4 py-2 text-sm font-medium text-white">
                    Kitchen sink leak
                  </div>
                  <div className="self-start rounded-2xl rounded-tl-sm bg-[var(--accent)]/10 px-4 py-3 text-sm text-white">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                      Suggested Fix
                    </div>
                    <ul className="space-y-2 text-white/80">
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                        <span>Check supply line fittings</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                        <span>Tighten 1/4 turn, test for drip</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                        <span>If still leaking, share a photo</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      title: "Photo-aware tips",
                      copy: "Callouts that match what you see.",
                    },
                    {
                      title: "Voice-friendly",
                      copy: "Hands-free guidance while you work.",
                    },
                    {
                      title: "Parts checklist",
                      copy: "Know what to grab before you start.",
                    },
                    {
                      title: "Safety prompts",
                      copy: "Know when to stop and call a pro.",
                    },
                  ].map((card) => (
                    <div
                      key={card.title}
                      className="rounded-xl border border-white/5 bg-white/5 px-4 py-4 text-sm text-white/80 transition-colors hover:bg-white/10"
                    >
                      <div className="font-semibold text-white">
                        {card.title}
                      </div>
                      <div className="mt-1 text-xs text-white/50">
                        {card.copy}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-px w-full max-w-7xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <section className="py-24">
        <Container>
          <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Built for the moment you need help.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[var(--muted)]">
                Fixly exists because small fixes should not cost a fortune.
                People get stuck on simple repairs, and scheduling a pro can be
                slow and expensive. We built an AI handyman that helps you make
                smart, safe decisions with clear steps you can trust.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
                From plumbing leaks and sticky doors to mounting shelves and
                fixing drywall, Fixly gives you fast, practical home repair help
                so you can fix it yourself and keep moving.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                "Clarity over guesswork",
                "Guided DIY repair assistant",
                "Fast answers for small jobs",
                "Respect for pros and safety",
              ].map((value) => (
                <div
                  key={value}
                  className="group rounded-3xl border border-white/10 bg-white/5 px-6 py-6 text-sm text-white shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-2xl"
                >
                  <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--muted)] group-hover:text-[var(--accent)]">
                    Promise
                  </div>
                  <div className="font-semibold text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-px w-full max-w-7xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <section className="py-24">
        <Container>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Fixly vs calling a handyman
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-[var(--muted)]">
            Fixly is ideal for small and medium repairs, while pros are best for
            dangerous or complex work. We always call out when to bring in a
            licensed expert for gas, serious electrical, or major water issues.
          </p>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.03] p-8 shadow-2xl">
              <div className="text-lg font-bold text-white">
                Fixly (AI handyman)
              </div>
              <ul className="mt-6 space-y-4 text-sm text-white/80">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span>Guided DIY steps with photo and voice support.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span>Faster for small repairs like leaks, doors, and mounting.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span>Learn skills and fix it yourself with confidence.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span>Lower cost and no scheduling delays.</span>
                </li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
              <div className="text-lg font-bold text-white">
                Pro handyman
              </div>
              <ul className="mt-6 space-y-4 text-sm text-[var(--muted)]">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/20" />
                  <span>Best for high-risk or complex repairs.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/20" />
                  <span>Great for large projects or code-sensitive work.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/20" />
                  <span>Higher cost with scheduling lead time.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/20" />
                  <span>Ideal when you need licensed, insured service.</span>
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-px w-full max-w-7xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <section className="py-24">
        <Container>
          <div className="flex flex-col items-start md:items-center md:text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              What Fixly can help with
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-[var(--muted)]">
              From quick fixes to routine maintenance, Fixly covers the most
              common DIY repair assistant needs.
            </p>
          </div>
          <div className="mt-16 rounded-3xl border border-white/10 bg-white/5 p-8 md:p-12">
            <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Sink leaks",
                  copy: "Identify drips, tighten fittings, replace washers.",
                },
                {
                  title: "Clogged drains",
                  copy: "Safe clearing steps without harsh damage.",
                },
                {
                  title: "Toilet running",
                  copy: "Diagnose flappers, fill valves, and seals.",
                },
                {
                  title: "Door hinges",
                  copy: "Fix sagging doors and align strike plates.",
                },
                {
                  title: "Closet doors",
                  copy: "Track alignment and smooth gliding fixes.",
                },
                {
                  title: "Mounting TV/shelves",
                  copy: "Find studs, level, and secure anchors.",
                },
                {
                  title: "Drywall patch",
                  copy: "Fill holes, sand smooth, and blend paint.",
                },
                {
                  title: "Caulk and grout",
                  copy: "Refresh seams to stop moisture damage.",
                },
                {
                  title: "Fence gate sag",
                  copy: "Square up hinges and replace hardware.",
                },
                {
                  title: "Switch basics",
                  copy: "Safe checks with breaker guidance.",
                },
                {
                  title: "Fixture swaps",
                  copy: "Step-by-step for light fixtures with warnings.",
                },
                {
                  title: "Weather sealing",
                  copy: "Draft fixes for doors and windows.",
                },
              ].map((item) => (
                <div key={item.title} className="relative pl-6">
                  <div className="absolute left-0 top-2.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                  <div className="text-base font-bold text-white">
                    {item.title}
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    {item.copy}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-px w-full max-w-7xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <section className="py-24">
        <Container>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-sm md:p-12">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              How Fixly stays safe
            </h2>
            <ul className="mt-6 space-y-3 text-base leading-relaxed text-[var(--muted)]">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                <span>Warns you about hazards and risky steps.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                <span>Suggests shutting off water or breakers when appropriate.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                <span>
                  Encourages pros for gas, serious electrical, or structural work.
                </span>
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
                Ready to fix it yourself?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--muted)]">
                Start a chat with your AI handyman and get your repair done with
                confidence.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-8 py-4 text-sm font-semibold text-black shadow-[0_0_20px_-5px_var(--accent)] transition-all duration-200 hover:bg-[var(--accent)]/90 hover:scale-[1.02] hover:shadow-[0_0_25px_-5px_var(--accent)] active:scale-[0.98]"
                >
                  Start a chat now
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
