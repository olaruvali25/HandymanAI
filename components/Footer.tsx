import Link from "next/link";
import Container from "./Container";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[color:var(--bg-elev)]">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 py-10 text-sm text-[var(--muted)] md:flex-row md:items-center">
          <div className="font-display text-base text-white">Handyman AI</div>
          <div className="flex flex-wrap items-center gap-6">
            <Link className="transition hover:text-white" href="#">
              Privacy
            </Link>
            <Link className="transition hover:text-white" href="#">
              Terms
            </Link>
            <Link className="transition hover:text-white" href="#">
              Contact
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
