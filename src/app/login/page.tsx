"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

import Container from "@/components/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rawReturnTo = searchParams.get("returnTo");
  const returnTo =
    rawReturnTo && rawReturnTo.startsWith("/") ? rawReturnTo : "/tasks";
  const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(returnTo);
    }
  }, [isAuthenticated, isLoading, returnTo, router]);

  return (
    <section className="py-16 lg:py-24">
      <Container>
        <div className="mx-auto max-w-md">
          <Card className="bg-[var(--bg-elev)]">
            <CardHeader>
              <CardTitle className="text-white">Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-5"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setError(null);
                  if (!hasConvexUrl) {
                    setError(
                      "Missing NEXT_PUBLIC_CONVEX_URL. Run `npm run dev:convex` and paste the URL into `.env.local`.",
                    );
                    return;
                  }
                  setIsSubmitting(true);
                  try {
                    await signIn("password", {
                      flow: "signIn",
                      email,
                      password,
                      redirectTo: returnTo,
                    });
                    router.push(returnTo);
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : "Login failed.";
                    setError(
                      message.includes("Missing environment variable")
                        ? `${message}\n\nConvex Auth needs ` +
                            "`SITE_URL`, `CONVEX_SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS` " +
                            "set in the Convex environment (not Next.js)."
                        : message,
                    );
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                {!hasConvexUrl ? (
                  <div className="rounded-[var(--radius-md)] border border-border bg-black/30 px-4 py-3 text-sm text-[var(--muted)]">
                    Convex isn’t configured yet. Run{" "}
                    <span className="text-white">npm run dev:convex</span> and
                    set <span className="text-white">NEXT_PUBLIC_CONVEX_URL</span>{" "}
                    in <span className="text-white">.env.local</span>.
                  </div>
                ) : null}
                <div>
                  <Label className="text-[var(--muted)]" htmlFor="email">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[var(--muted)]" htmlFor="password">
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {error ? (
                  <div className="rounded-[var(--radius-md)] border border-border bg-black/30 px-4 py-3 text-sm text-[var(--accent-soft)]">
                    {error}
                  </div>
                ) : null}

                <Button className="w-full" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Logging in..." : "Log In"}
                </Button>

                <div className="text-center text-sm text-[var(--muted)]">
                  Don&apos;t have an account?{" "}
                  <Link className="text-white underline underline-offset-4" href="/signup">
                    Sign up
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </Container>
    </section>
  );
}
