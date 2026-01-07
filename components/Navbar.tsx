import Link from "next/link";
import Container from "./Container";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:var(--bg)]/90 backdrop-blur">
      <Container>
        <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <span className="font-display text-xl">Handyman AI</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
            <Link className="transition hover:text-white" href="/pricing">
              Pricing
            </Link>
            <Link className="transition hover:text-white" href="/reviews">
              Reviews
            </Link>
            <Link className="transition hover:text-white" href="/about">
              About
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link className="text-[var(--muted)] transition hover:text-white" href="/login">
              Login
            </Link>
            <Link
              className="rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 font-medium text-black transition hover:bg-[var(--accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              href="/signup"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
