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
    <div className="bg-[var(--bg)]">
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,122,26,0.12),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
        <Container>
          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1 text-xs font-medium text-[var(--accent)]">
                AI handyman, built for DIY confidence
              </div>
              <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Fixly is your AI handyman for fast, safe DIY repair help.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-[var(--muted)] sm:text-lg">
                Ask a question, share a photo, and get clear, step-by-step
                guidance for home repair help. Fixly helps you fix it yourself,
                avoid call-out fees, and learn practical skills for everyday
                problems.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  "Describe the issue",
                  "Add photo or voice",
                  "Follow clear steps",
                ].map((step, index) => (
                  <div
                    key={step}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)]/70 px-4 py-3 text-sm text-white"
                  >
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Step {index + 1}
                    </div>
                    <div className="mt-2 font-medium">{step}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  "Save time when a leak starts",
                  "Avoid call-out fees for small jobs",
                  "Get unstuck fast without guesswork",
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
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)]/70 p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Repair flow (example)
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-white/80">
                  <div>$ fixly diagnose &quot;kitchen sink leak&quot;</div>
                  <div className="mt-2 text-white/50">
                    ▸ Check supply line fittings
                  </div>
                  <div className="text-white/50">
                    ▸ Tighten 1/4 turn, test for drip
                  </div>
                  <div className="text-white/50">
                    ▸ If still leaking, replace washer
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/80"
                    >
                      <div className="text-sm font-semibold text-white">
                        {card.title}
                      </div>
                      <div className="mt-1 text-xs text-white/60">
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

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="font-display text-3xl font-semibold text-white">
                Built for the moment you need help.
              </h2>
              <p className="mt-4 text-base text-[var(--muted)]">
                Fixly exists because small fixes should not cost a fortune.
                People get stuck on simple repairs, and scheduling a pro can be
                slow and expensive. We built an AI handyman that helps you make
                smart, safe decisions with clear steps you can trust.
              </p>
              <p className="mt-4 text-base text-[var(--muted)]">
                From plumbing leaks and sticky doors to mounting shelves and
                fixing drywall, Fixly gives you fast, practical home repair help
                so you can fix it yourself and keep moving.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Clarity over guesswork",
                "Guided DIY repair assistant",
                "Fast answers for small jobs",
                "Respect for pros and safety",
              ].map((value) => (
                <div
                  key={value}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)]/60 px-5 py-4 text-sm text-white/80 shadow-[var(--shadow-soft)]"
                >
                  <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Promise
                  </div>
                  <div className="font-medium text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-16">
        <Container>
          <h2 className="font-display text-3xl font-semibold text-white">
            Fixly vs calling a handyman
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            Fixly is ideal for small and medium repairs, while pros are best for
            dangerous or complex work. We always call out when to bring in a
            licensed expert for gas, serious electrical, or major water issues.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)]/60 p-6">
              <div className="text-sm font-semibold text-white">
                Fixly (AI handyman)
              </div>
              <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                <li>Guided DIY steps with photo and voice support.</li>
                <li>Faster for small repairs like leaks, doors, and mounting.</li>
                <li>Learn skills and fix it yourself with confidence.</li>
                <li>Lower cost and no scheduling delays.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="text-sm font-semibold text-white">
                Pro handyman
              </div>
              <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                <li>Best for high-risk or complex repairs.</li>
                <li>Great for large projects or code-sensitive work.</li>
                <li>Higher cost with scheduling lead time.</li>
                <li>Ideal when you need licensed, insured service.</li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-16">
        <Container>
          <h2 className="font-display text-3xl font-semibold text-white">
            What Fixly can help with
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            From quick fixes to routine maintenance, Fixly covers the most
            common DIY repair assistant needs.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <div
                key={item.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)]/60 p-5 text-sm text-white/80"
              >
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Category
                </div>
                <div className="text-base font-semibold text-white">
                  {item.title}
                </div>
                <div className="mt-2 text-sm text-[var(--muted)]">
                  {item.copy}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-16">
        <Container>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)]/60 p-6">
            <h2 className="font-display text-2xl font-semibold text-white">
              How Fixly stays safe
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <li>Warns you about hazards and risky steps.</li>
              <li>Suggests shutting off water or breakers when appropriate.</li>
              <li>
                Encourages pros for gas, serious electrical, or structural work.
              </li>
            </ul>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-16 lg:py-24">
        <Container>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[radial-gradient(circle_at_top,rgba(255,122,26,0.12),transparent_60%)] p-10 text-center shadow-[var(--shadow-soft)]">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Ready to fix it yourself?
            </h2>
            <p className="mt-4 text-[var(--muted)]">
              Start a chat with your AI handyman and get your repair done with
              confidence.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[var(--accent-soft)]"
              >
                Start a chat now
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:text-white"
              >
                View pricing
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
