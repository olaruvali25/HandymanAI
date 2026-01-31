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

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOauthSubmitting, setIsOauthSubmitting] = useState<
    "google" | "facebook" | null
  >(null);

  const rawReturnTo = searchParams.get("returnTo");
  const returnTo =
    rawReturnTo && rawReturnTo.startsWith("/") ? rawReturnTo : "/";
  const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  const oauthProviders = {
    google: {
      label: "Google",
      envHint: "GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET",
    },
    facebook: {
      label: "Facebook",
      envHint: "FACEBOOK_CLIENT_ID/FACEBOOK_CLIENT_SECRET",
    },
  } as const;

  const oauthProviderSlugs: Record<keyof typeof oauthProviders, string> = {
    google: "oidc",
    facebook: "facebook",
  };

  const formatAuthError = (
    message: string,
    provider?: keyof typeof oauthProviders,
  ) => {
    const lower = message.toLowerCase();
    if (lower.includes("missing environment variable")) {
      return `${message}\n\nConvex Auth env vars are missing in the Convex deployment.`;
    }
    if (provider && lower.includes("provider") && lower.includes("not found")) {
      const meta = oauthProviders[provider];
      return `${meta.label} OAuth isn't configured yet. Set ${meta.envHint} in your Convex env and restart convex dev.`;
    }
    if (
      provider &&
      lower.includes("client") &&
      (lower.includes("id") || lower.includes("secret"))
    ) {
      const meta = oauthProviders[provider];
      return `${meta.label} OAuth credentials are missing. Set ${meta.envHint} in your Convex env and restart convex dev.`;
    }
    return message;
  };

  const handleOAuthSignIn = async (provider: keyof typeof oauthProviders) => {
    setError(null);
    if (!hasConvexUrl) {
      setError(
        "Missing NEXT_PUBLIC_CONVEX_URL. Run `npm run dev:convex` and paste the URL into `.env.local`.",
      );
      return;
    }
    setIsOauthSubmitting(provider);
    try {
      await signOut();
      const result = await signIn(oauthProviderSlugs[provider], {
        redirectTo: returnTo,
      });
      if (!result.signingIn && !result.redirect) {
        setError(`${oauthProviders[provider].label} sign-in failed.`);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "OAuth sign-in failed.";
      setError(formatAuthError(message, provider));
    } finally {
      setIsOauthSubmitting(null);
    }
  };

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
              <CardTitle className="text-white">Sign Up</CardTitle>
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
                  const trimmedName = name.trim();
                  const trimmedEmail = email.trim();
                  const hasNumber = /\d/.test(password);
                  const hasSpecial = /[^A-Za-z0-9]/.test(password);
                  if (
                    !trimmedName ||
                    !trimmedEmail ||
                    password.length < 8 ||
                    !hasNumber ||
                    !hasSpecial
                  ) {
                    setError("Sign up failed. Please check your details.");
                    return;
                  }
                  setIsSubmitting(true);
                  try {
                    await signOut();
                    const result = await signIn("password", {
                      flow: "signUp",
                      name: trimmedName,
                      email: trimmedEmail,
                      password,
                      redirectTo: returnTo,
                    });
                    if (!result.signingIn) {
                      setError("Sign up failed. Please check your details.");
                    }
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : "Sign up failed.";
                    setError(formatAuthError(message));
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                {!hasConvexUrl ? (
                  <div className="border-border rounded-[var(--radius-md)] border bg-black/30 px-4 py-3 text-sm text-[var(--muted)]">
                    Convex isn’t configured yet. Run{" "}
                    <span className="text-white">npm run dev:convex</span> and
                    set{" "}
                    <span className="text-white">NEXT_PUBLIC_CONVEX_URL</span>{" "}
                    in <span className="text-white">.env.local</span>.
                  </div>
                ) : null}
                <div className="space-y-3">
                  <Button
                    className="w-full border-white/20 text-white hover:bg-white/10"
                    type="button"
                    variant="outline"
                    disabled={isSubmitting || isOauthSubmitting !== null}
                    onClick={() => handleOAuthSignIn("google")}
                  >
                    {isOauthSubmitting === "google"
                      ? "Connecting..."
                      : "Continue with Google"}
                  </Button>
                  <Button
                    className="w-full border-white/20 text-white hover:bg-white/10"
                    type="button"
                    variant="outline"
                    disabled={isSubmitting || isOauthSubmitting !== null}
                    onClick={() => handleOAuthSignIn("facebook")}
                  >
                    {isOauthSubmitting === "facebook"
                      ? "Connecting..."
                      : "Continue with Facebook"}
                  </Button>
                </div>

                <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                  <span className="h-px flex-1 bg-white/10" />
                  <span>or continue with email</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <div>
                  <Label className="text-[var(--muted)]" htmlFor="name">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Alex Parker"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
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
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {error ? (
                  <div className="border-border rounded-[var(--radius-md)] border bg-black/30 px-4 py-3 text-sm text-[var(--accent-soft)]">
                    {error}
                  </div>
                ) : null}

                <Button
                  className="w-full"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating account..." : "Create Account"}
                </Button>

                <div className="text-center text-sm text-[var(--muted)]">
                  Already have an account?{" "}
                  <Link
                    className="text-white underline underline-offset-4"
                    href="/login"
                  >
                    Log in
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
