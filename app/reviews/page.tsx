import type { Metadata } from "next";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Reviews",
};

export default function ReviewsPage() {
  return (
    <section className="py-16 lg:py-24">
      <Container>
        <h1 className="font-display text-3xl font-semibold text-white">
          Reviews
        </h1>
        <div className="mt-8 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elev)] p-10 text-sm text-[var(--muted)]">
          Reviews content coming soon.
        </div>
      </Container>
    </section>
  );
}
