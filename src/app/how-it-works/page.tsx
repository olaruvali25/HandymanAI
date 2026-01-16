import Link from "next/link";

import Container from "@/components/Container";

const primaryButton =
  "inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[var(--accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";
const secondaryButton =
  "inline-flex items-center justify-center rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

export default function HowItWorksPage() {
  return (
    <>
      <section className="bg-[var(--bg)]">
        <Container>
          <div className="py-16 text-center lg:py-24">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              Reliable Fix Guidance
            </p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Stop guessing. Fix it right the first time.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base text-[var(--muted)] sm:text-lg">
              Fixly helps you diagnose the problem and deliver professional-grade
              repair steps in minutes.
            </p>
            <div className="mt-8 flex justify-center gap-4">
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

      <section id="how-it-works" className="bg-[var(--bg)] py-16 lg:py-24">
        <Container>
          <div className="mx-auto max-w-5xl">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              How It Works
            </p>
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Three steps from problem to solution.
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
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
                  className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--bg)] p-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--accent-soft)]">
                      {index + 1}
                    </div>
                    <h3 className="font-display text-lg text-white">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16 lg:py-24">
        <Container>
          <div className="mx-auto max-w-5xl">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              Why Fixly
            </p>
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Save money, time, and frustration on every repair.
            </h2>
            <p className="mt-4 text-[var(--muted)]">
              Get the confidence of a pro without the scheduling delays or high
              service fees.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elev)] p-6">
                <h3 className="font-display text-lg text-white">
                  Typical handyman visit
                </h3>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  $120-$240 for a basic repair, plus scheduling delays and repeat
                  visits.
                </p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6">
                <h3 className="font-display text-lg text-white">
                  Fixly guidance
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                  <li>Keep more money in your pocket.</li>
                  <li>Fix issues on your schedule.</li>
                  <li>Build independence and confidence with every repair.</li>
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="bg-[var(--bg)] py-16 lg:py-24">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              Safety First
            </p>
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Professional guidance with safety in mind.
            </h2>
            <p className="mt-4 text-[var(--muted)]">
              Fixly prioritizes safe practices and recommends when to pause and
              consult a licensed professional for electrical, gas, or structural
              work.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-16 lg:py-24">
        <Container>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[radial-gradient(circle_at_top,rgba(255,122,26,0.12),transparent_60%)] p-10 text-center shadow-[var(--shadow-soft)]">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Get back to a working home today.
            </h2>
            <p className="mt-4 text-[var(--muted)]">
              Fast answers, clear steps, and the confidence to finish the job.
            </p>
            <div className="mt-6">
              <Link className={primaryButton} href="/signup">
                Start Fixing Now
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
