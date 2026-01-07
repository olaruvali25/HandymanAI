"use client";

import { useState } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import GrokThread from "@/components/chat/GrokThread";

// Metadata cannot be exported from a client component, so we need to move it or handle it differently.
// For now, let's just remove the export and keep the object if needed, or better yet, since this is a page, 
// we should probably keep it server side and make a client wrapper. 
// However, to keep it simple and follow instructions "ONLY CHANGE FILES THAT I TOLD U", 
// I will convert this page to a client component as I already added state.
// But metadata export is not allowed in client components.
// I will remove the metadata export for now to fix the build, or I can try to keep it server side but that requires refactoring into two files.
// Given the strict instruction "ONLY DO WHAT YOU ARE TOLD", I will stick to this file. 
// I will comment out metadata export to avoid error.

/*
export const metadata: Metadata = {
  title: "Home Repair Help, Fast",
  description:
    "Handyman AI gives precise, step-by-step repair guidance so you can fix it yourself with confidence.",
};
*/

const primaryButton =
  "inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[var(--accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";
const secondaryButton =
  "inline-flex items-center justify-center rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

export default function Home() {
  const [isChatActive, setIsChatActive] = useState(false);

  return (
    <div className="pb-20">
      <div
        className={`transition-all duration-500 ease-in-out ${isChatActive ? "fixed inset-0 z-50 bg-[var(--bg)]" : ""
          }`}
      >
        <div
          className={`h-full w-full ${isChatActive ? "flex flex-col" : "hidden"
            }`}
        >
          {isChatActive && (
            <div className="flex h-full flex-col">
              <div className="border-b border-[var(--border)] bg-[var(--bg-elev)] px-6 py-4">
                <button
                  onClick={() => setIsChatActive(false)}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-white"
                >
                  ← Back to Home
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Container className="h-full">
                  <div className="mx-auto h-full max-w-3xl py-6">
                    <GrokThread />
                  </div>
                </Container>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isChatActive && (
        <>
          <section
            id="hero"
            className="relative flex min-h-[80vh] flex-col justify-center border-b border-[var(--border)] bg-[radial-gradient(circle_at_top,rgba(255,122,26,0.15),transparent_50%)] pt-20 pb-20"
          >
            <Container>
              <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
                <div className="mb-8 inline-flex items-center rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1 text-xs font-medium text-[var(--accent)] backdrop-blur-sm">
                  <span className="mr-2 h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
                  Live AI Assistant
                </div>

                <h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  What can I help you fix today?
                </h1>

                <p className="mt-6 max-w-2xl text-lg text-[var(--muted)]">
                  Describe the problem, upload a photo, and get professional repair guidance in seconds.
                </p>

                <div className="mt-12 w-full">
                  <div className="relative mx-auto w-full max-w-3xl">
                    <div className="min-h-[300px] w-full">
                      <GrokThread />
                    </div>
                  </div>
                </div>
              </div>
            </Container>
          </section>

          <section className="border-b border-[var(--border)] bg-[var(--bg)]">
            <Container>
              <div className="py-16 text-center lg:py-24">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
                  Reliable Fix Guidance
                </p>
                <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Stop guessing. Fix it right the first time.
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base text-[var(--muted)] sm:text-lg">
                  Handyman AI helps you diagnose the problem and deliver professional-grade repair steps in minutes.
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

          <section id="how-it-works" className="border-y border-[var(--border)] bg-[var(--bg-elev)] py-16 lg:py-24">
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
                  Why Handyman AI
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
                      $120-$240 for a basic repair, plus scheduling delays and
                      repeat visits.
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6">
                    <h3 className="font-display text-lg text-white">
                      Handyman AI guidance
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

          <section className="border-y border-[var(--border)] bg-[var(--bg-elev)] py-16 lg:py-24">
            <Container>
              <div className="mx-auto max-w-4xl text-center">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
                  Safety First
                </p>
                <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
                  Professional guidance with safety in mind.
                </h2>
                <p className="mt-4 text-[var(--muted)]">
                  Handyman AI prioritizes safe practices and recommends when to
                  pause and consult a licensed professional for electrical, gas, or
                  structural work.
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
      )}
    </div>
  );
}
