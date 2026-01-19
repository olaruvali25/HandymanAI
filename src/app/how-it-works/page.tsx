import Link from "next/link";

import Container from "@/components/Container";

const primaryButton =
  "inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-8 py-4 text-sm font-semibold text-black shadow-[0_0_20px_-5px_var(--accent)] transition-all duration-200 hover:bg-[var(--accent)]/90 hover:scale-[1.02] hover:shadow-[0_0_25px_-5px_var(--accent)] active:scale-[0.98]";
const secondaryButton =
  "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]";

export default function HowItWorksPage() {
  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(255,122,26,0.12)] via-transparent to-transparent opacity-80" />
        <Container>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-1.5 text-[10px] font-bold tracking-[0.2em] text-[var(--accent)] uppercase shadow-[0_0_20px_-5px_var(--accent)]/20">
              Reliable Fix Guidance
            </div>
            <h1 className="font-display mt-8 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl lg:leading-[1.1]">
              Stop guessing. <br className="hidden sm:block" /> Fix it right the first time.
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
              Fixly helps you diagnose problems and provides
              clear, professional-grade repair steps in minutes.
            </p>
            <div className="mt-12 flex justify-center gap-4">
              <Link className={primaryButton} href="/signup">
                Get started
              </Link>
              <Link className={secondaryButton} href="#how-it-works">
                See the process
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section id="how-it-works" className="py-32 lg:py-40">
        <Container>
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <div className="text-[10px] font-bold tracking-[0.2em] text-[var(--accent)] uppercase">
                The Process
              </div>
              <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Three steps to a finished repair.
              </h2>
            </div>

            <div className="relative mt-20">
              {/* Connecting Line */}
              <div className="absolute left-[23px] top-0 h-full w-px bg-gradient-to-b from-[var(--accent)]/50 via-white/10 to-transparent sm:left-1/2 sm:-translate-x-px" />

              <div className="space-y-24 sm:space-y-32">
                {[
                  {
                    title: "Describe the problem",
                    text: "Tell us what's happening. No technical jargon needed—just explain it in your own words.",
                  },
                  {
                    title: "Upload a photo",
                    text: "Show us the exact part. Our AI analyzes the image to identify components and diagnose issues instantly.",
                  },
                  {
                    title: "Get exact instructions",
                    text: "Follow clear, step-by-step guidance tailored to your specific situation. Fix it with confidence.",
                  },
                ].map((item, index) => (
                  <div
                    key={item.title}
                    className={`relative flex flex-col gap-8 sm:flex-row sm:items-center ${index % 2 === 1 ? "sm:flex-row-reverse" : ""
                      }`}
                  >
                    {/* Step Number */}
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--bg)] text-sm font-bold text-[var(--accent)] shadow-[0_0_20px_-5px_var(--accent)] sm:mx-auto">
                      {index + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 sm:w-1/2">
                      <div className={`sm:px-12 ${index % 2 === 1 ? "sm:text-right" : "sm:text-left"}`}>
                        <h3 className="font-display text-2xl font-semibold text-white">
                          {item.title}
                        </h3>
                        <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
                          {item.text}
                        </p>
                      </div>
                    </div>

                    {/* Spacer for the other side on desktop */}
                    <div className="hidden sm:block sm:w-1/2" />
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
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <div className="text-[10px] font-bold tracking-[0.2em] text-[var(--muted)] uppercase">
                Why Fixly
              </div>
              <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Save money, time, and frustration.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)]">
                Get the confidence of a pro without the high service fees.
              </p>
            </div>

            <div className="mt-20 grid gap-12 lg:grid-cols-2 lg:gap-24">
              <div className="flex flex-col justify-center">
                <h3 className="font-display text-xl font-semibold text-white/40">
                  Typical handyman visit
                </h3>
                <p className="mt-6 text-2xl font-semibold text-white/60">
                  $120 – $240
                </p>
                <p className="mt-4 text-base leading-relaxed text-[var(--muted)]/60">
                  Basic call-out fee, plus parts and labor. Often involves scheduling delays and waiting for a window.
                </p>
              </div>

              <div className="relative rounded-[2.5rem] border border-[var(--accent)]/20 bg-[var(--accent)]/[0.02] p-10 shadow-2xl">
                <div className="absolute -top-4 left-10 rounded-full bg-[var(--accent)] px-4 py-1 text-[10px] font-bold tracking-widest text-black uppercase">
                  The Fixly Way
                </div>
                <h3 className="font-display text-xl font-semibold text-white">
                  Guided DIY
                </h3>
                <ul className="mt-8 space-y-5">
                  {[
                    "Keep more money in your pocket.",
                    "Fix issues on your own schedule.",
                    "Build practical skills with every repair.",
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-start gap-4 text-white/80">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                      <span className="text-base leading-tight">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <div className="mx-auto h-1 w-24 rounded-full bg-[var(--accent)]" />

      <section className="py-32 lg:py-40">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-4 py-1.5 text-[10px] font-bold tracking-[0.2em] text-[var(--muted)] uppercase">
              Safety First
            </div>
            <h2 className="font-display mt-8 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Guidance with safety in mind.
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
              Fixly prioritizes safe practices. We’ll always recommend when to pause and
              consult a licensed professional for electrical, gas, or structural
              work.
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-32 lg:pb-40">
        <Container>
          <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-white/[0.02] px-8 py-20 text-center shadow-2xl backdrop-blur-sm md:px-16 lg:py-28">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--accent)]/10 to-transparent opacity-40" />
            <div className="relative z-10">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Ready to fix it yourself?
              </h2>
              <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
                Get clear steps and the confidence to finish the job today.
              </p>
              <div className="mt-12">
                <Link className={primaryButton} href="/signup">
                  Get started now
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
