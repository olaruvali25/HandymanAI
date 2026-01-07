import type { Metadata } from "next";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return (
    <section className="py-16 lg:py-24">
      <Container>
        <h1 className="font-display text-3xl font-semibold text-white">
          Pricing
        </h1>
        <div className="mt-8 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elev)] p-10 text-sm text-[var(--muted)]">
          Pricing content coming soon.
        </div>
      </Container>
    </section>
  );
}
