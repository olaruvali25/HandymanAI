import Link from "next/link";

import Container from "@/components/Container";

const primaryButton =
  "inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-8 py-4 text-sm font-semibold text-black shadow-[0_0_20px_-5px_var(--accent)] transition-all duration-200 hover:bg-[var(--accent)]/90 hover:scale-[1.02] hover:shadow-[0_0_25px_-5px_var(--accent)] active:scale-[0.98]";
const secondaryButton =
  "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]";

export default function HowItWorksPage() {
  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(255,122,26,0.15)] via-transparent to-transparent opacity-70" />
        <Container>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--accent)] shadow-[0_0_15px_-5px_var(--accent)]">
              Reliable Fix Guidance
            </div>
            <h2 className="mt-8 font-display text-5xl font-bold tracking-tighter text-white sm:text-6xl lg:text-7xl">
              Stop guessing. Fix it right the first time.
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
              Fixly helps you diagnose the problem and deliver professional-grade
              repair steps in minutes.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link className={primaryButton} href="/signup">
                Start Fixing
              </Link>
              <Link className={secondaryButton} href="#how-it-works">
                See How It Works
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section id="how-it-works" className="py-24">
        <Container>
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
                How It Works
              </div>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Three steps from problem to solution.
              </h2>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "Describe the problem",
                  text: "Tell us what's happening and when it started.",
                },
                {
                  title: "Upload a photo",
                  text: "Show the exact part so we can diagnose quickly.",
                },
                {
                  title: "Get exact instructions",
                  text: "Follow tailored steps and finish the job confidently.",
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className="group relative rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-2xl"
                >
                  <div className="absolute -top-6 left-8 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--bg)] text-lg font-bold text-[var(--accent)] shadow-[0_0_15px_-5px_var(--accent)]">
                    {index + 1}
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold text-white group-hover:text-[var(--accent)] transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-24">
        <Container>
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                Why Fixly
              </div>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Save money, time, and frustration on every repair.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)]">
                Get the confidence of a pro without the scheduling delays or high
                service fees.
              </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl transition-all duration-300 hover:bg-white/[0.07]">
                <h3 className="font-display text-xl font-bold text-white">
                  Typical handyman visit
                </h3>
                <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
                  $120-$240 for a basic repair, plus scheduling delays and repeat
                  visits.
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.03] p-8 shadow-2xl transition-all duration-300 hover:bg-[var(--accent)]/[0.05]">
                <h3 className="font-display text-xl font-bold text-white">
                  Fixly guidance
                </h3>
                <ul className="mt-4 space-y-3 text-base text-white/80">
                  <li className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    Keep more money in your pocket.
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    Fix issues on your schedule.
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    Build independence and confidence with every repair.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-24">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
              Safety First
            </div>
            <h2 className="mt-8 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Professional guidance with safety in mind.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
              Fixly prioritizes safe practices and recommends when to pause and
              consult a licensed professional for electrical, gas, or structural
              work.
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-8 py-16 text-center shadow-2xl backdrop-blur-sm md:px-16">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--accent)]/10 to-transparent opacity-50" />
            <div className="relative z-10">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Get back to a working home today.
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--muted)]">
                Fast answers, clear steps, and the confidence to finish the job.
              </p>
              <div className="mt-10">
                <Link className={primaryButton} href="/signup">
                  Start Fixing Now
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
