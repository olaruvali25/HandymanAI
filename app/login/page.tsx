import type { Metadata } from "next";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <section className="py-16 lg:py-24">
      <Container>
        <div className="mx-auto max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elev)] p-8 shadow-[var(--shadow-soft)]">
          <h1 className="font-display text-3xl font-semibold text-white">
            Login
          </h1>
          <form className="mt-8 space-y-5" action="#" method="post">
            <div>
              <label className="text-sm text-[var(--muted)]" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--bg)] px-4 py-3 text-sm text-white placeholder:text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--muted)]" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="********"
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--bg)] px-4 py-3 text-sm text-white placeholder:text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-semibold text-black transition hover:bg-[var(--accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Log In
            </button>
          </form>
        </div>
      </Container>
    </section>
  );
}
