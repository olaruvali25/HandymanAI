"use client";

import { useState } from "react";
import Container from "@/components/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import HelpAccordion from "@/components/help/HelpAccordion";

const faqs = [
    {
        question: "What is Fixly?",
        answer:
            "Fixly is an AI-powered handyman assistant that guides you through home repairs step-by-step. It helps you diagnose problems, find the right tools, and complete fixes safely.",
    },
    {
        question: "Who is Fixly for?",
        answer:
            "It's for anyone who wants to save money and learn how to fix things around the house, from complete beginners to experienced DIYers looking for a quick reference.",
    },
    {
        question: "What types of problems can Fixly help with?",
        answer:
            "Fixly can help with plumbing (leaks, faucets), electrical (outlets, switches), wall repairs (drywall, paint), furniture assembly, appliance troubleshooting, and more.",
    },
    {
        question: "Is Fixly a replacement for a professional handyman?",
        answer:
            "For many common repairs, yes. However, for complex, dangerous, or legally restricted work (like gas lines or major structural changes), we always recommend calling a licensed pro.",
    },
    {
        question: "How do I start a new repair chat?",
        answer:
            "Just type your problem into the chat box on the home page and hit send. You can describe the issue in your own words, and Fixly will start asking the right questions.",
    },
    {
        question: "Can I upload photos?",
        answer:
            "Yes, uploading photos helps Fixly see exactly what you're looking at. It can identify parts, see the severity of a leak, and provide much more accurate guidance.",
    },
    {
        question: "Why does Fixly ask questions before giving steps?",
        answer:
            "To ensure we understand the specific situation, safety risks, and required tools before you start working. This prevents mistakes and ensures a successful repair.",
    },
    {
        question: "Can Fixly guide beginners with no experience?",
        answer:
            "Absolutely. Fixly adapts its instructions to your skill level, explaining terms and tools simply and providing extra detail where needed.",
    },
    {
        question: "Can I stop and continue later?",
        answer:
            "Yes, your chat history is saved automatically. You can close the window and come back later to pick up exactly where you left off.",
    },
    {
        question: "What are credits and how are they used?",
        answer:
            "Credits are the currency used to power Fixly's AI. Sending messages and attachments consumes credits based on the complexity of the task.",
    },
    {
        question: "Why does one message use more credits than another?",
        answer:
            "Messages with photo attachments require more processing power for vision analysis and thus cost more credits than simple text-only messages.",
    },
    {
        question: "What happens when I run out of credits?",
        answer:
            "You'll be prompted to top up your credits or upgrade your plan to continue the conversation. You can always view your balance in the navbar.",
    },
    {
        question: "Do credits expire?",
        answer:
            "Credits purchased through top-ups do not expire. Monthly plan credits refresh at the start of each billing cycle according to your plan level.",
    },
    {
        question: "Can I buy extra credits?",
        answer:
            "Yes, you can purchase credit top-up packs at any time from the pricing page if you need a little extra to finish a project.",
    },
    {
        question: "Do I need an account to use Fixly?",
        answer:
            "You can start a chat as a guest to try it out, but you'll need an account to save your history across devices and access premium features.",
    },
    {
        question: "What happens to my chats if I create an account later?",
        answer:
            "If you use the same browser, your guest chats can usually be linked to your new account so you don't lose your progress.",
    },
    {
        question: "Can I use Fixly on multiple devices?",
        answer:
            "Yes, just log in to your account on any device (phone, tablet, or computer) to access your chats, credits, and saved tasks.",
    },
    {
        question: "What if Fixly says something is dangerous?",
        answer:
            "Safety is our priority. If Fixly identifies a high-risk situation, it will advise you to stop and call a professional. Please follow these warnings strictly.",
    },
    {
        question: "Does Fixly handle gas or electrical emergencies?",
        answer:
            "No. For emergencies like gas leaks, major electrical fires, or structural collapses, call emergency services or a licensed professional immediately.",
    },
    {
        question: "What should I do if I’m unsure during a repair?",
        answer:
            "Stop immediately. You can ask Fixly for clarification, send a photo of what's confusing you, or consult a professional if you feel unsafe.",
    },
    {
        question: "Why can’t I send a message sometimes?",
        answer:
            "This usually happens if you've run out of credits or if there's a temporary connection issue. Check your credit balance in the navbar.",
    },
    {
        question: "What should I do if something doesn’t load correctly?",
        answer:
            "Try refreshing the page or clearing your browser cache. If the issue persists, please contact our support team using the form below.",
    },
];

export default function HelpPage() {
    const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormState("submitting");

        // Simulate form submission
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setFormState("success");
        } catch {
            setFormState("error");
        }
    };

    return (
        <div className="min-h-dvh bg-[var(--bg)]">
            <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-32">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(255,122,26,0.12)] via-transparent to-transparent opacity-80" />
                <Container>
                    <div className="relative z-10 mx-auto max-w-3xl text-center">
                        <h1 className="font-display text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                            How can we help?
                        </h1>
                        <p className="mt-6 text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
                            Find answers to common questions about using Fixly, managing your credits, and staying safe during repairs.
                        </p>
                    </div>
                </Container>
            </section>

            <section className="pb-24 lg:pb-32">
                <Container>
                    <div className="mx-auto max-w-3xl">
                        <h2 className="mb-12 font-display text-3xl font-semibold text-white">Frequently Asked Questions</h2>
                        <HelpAccordion items={faqs} />
                    </div>
                </Container>
            </section>

            <div className="mx-auto h-px max-w-3xl bg-white/10" />

            <section className="py-24 lg:py-32">
                <Container>
                    <div className="mx-auto max-w-3xl">
                        <div className="mb-12 text-center">
                            <h2 className="font-display text-3xl font-semibold text-white">Still have questions?</h2>
                            <p className="mt-4 text-[var(--muted)]">
                                Can't find what you're looking for? Send us a message and our team will get back to you as soon as possible.
                            </p>
                        </div>

                        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl">
                            <CardContent className="p-8">
                                {formState === "success" ? (
                                    <div className="py-12 text-center">
                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">
                                            <svg
                                                width="32"
                                                height="32"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-white">Message sent!</h3>
                                        <p className="mt-2 text-[var(--muted)]">
                                            Thanks for reaching out. We'll get back to you as soon as possible.
                                        </p>
                                        <Button
                                            variant="outline"
                                            className="mt-8"
                                            onClick={() => setFormState("idle")}
                                        >
                                            Send another message
                                        </Button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid gap-6 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label htmlFor="name" className="text-sm font-medium text-white">
                                                    Name
                                                </label>
                                                <Input
                                                    id="name"
                                                    placeholder="Your name"
                                                    required
                                                    className="border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[var(--accent)]/50 focus:ring-[var(--accent)]/20"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="email" className="text-sm font-medium text-white">
                                                    Email
                                                </label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="you@example.com"
                                                    required
                                                    className="border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[var(--accent)]/50 focus:ring-[var(--accent)]/20"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="message" className="text-sm font-medium text-white">
                                                Message
                                            </label>
                                            <textarea
                                                id="message"
                                                required
                                                rows={5}
                                                className="flex w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-[var(--accent)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                                                placeholder="How can we help you?"
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={formState === "submitting"}
                                            className="w-full bg-[var(--accent)] py-6 text-base font-semibold text-black hover:bg-[var(--accent-soft)]"
                                        >
                                            {formState === "submitting" ? "Sending..." : "Send Message"}
                                        </Button>
                                        {formState === "error" && (
                                            <p className="text-center text-sm text-red-400">
                                                Something went wrong. Please try again.
                                            </p>
                                        )}
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </Container>
            </section>
        </div>
    );
}
