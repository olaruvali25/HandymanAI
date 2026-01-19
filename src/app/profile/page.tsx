"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAction, useConvexAuth } from "convex/react";
import { useUser } from "@/lib/useUser";
import { useEntitlementsQuery } from "@/lib/queries/entitlements";
import { api } from "@convex/_generated/api";
import Container from "@/components/Container";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Invoice = {
  id: string;
  date: string;
  amount: string;
  status: string;
  href: string;
};

const formatDate = (value?: number) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function ProfilePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();
  const { data: entitlements } = useEntitlementsQuery();
  const createPortalSession = useAction(
    api.stripe.createCustomerPortalSession,
  );
  const [isManagingBilling, setIsManagingBilling] = useState(false);

  const createdAt = useMemo(() => formatDate(user?._creationTime), [user]);
  const invoices: Invoice[] = [];
  const hasStripeCustomer = Boolean(user?.stripeCustomerId);

  const handleManageBilling = async () => {
    if (isManagingBilling) return;
    setIsManagingBilling(true);
    try {
      if (!hasStripeCustomer) {
        window.location.href = "/pricing";
        return;
      }
      const url = await createPortalSession({});
      if (url) {
        window.location.href = url;
        return;
      }
      window.location.href = "/pricing";
    } catch {
      window.location.href = "/pricing";
    } finally {
      setIsManagingBilling(false);
    }
  };

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="bg-[var(--bg)]">
        <Container>
          <div className="py-16">
            <h1 className="font-display text-4xl font-semibold text-white">
              Profile
            </h1>
            <p className="mt-3 text-[var(--muted)]">
              Please log in to view your profile.
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[var(--accent-soft)]"
              >
                Log in
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <div className="py-12">
          <h1 className="font-display text-4xl font-semibold text-white">
            Profile
          </h1>

          <div className="mt-8 grid gap-6">
            <Card className="border-[var(--border)] bg-[var(--bg-elev)]/60">
              <CardHeader>
                <CardTitle className="text-white">Account</CardTitle>
                <CardDescription>Your basic account details.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-white/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[var(--muted)]">Name</span>
                  <span>{user?.name || "-"}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[var(--muted)]">Email</span>
                  <span>{user?.email || "-"}</span>
                </div>
                {createdAt ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[var(--muted)]">Created</span>
                    <span>{createdAt}</span>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-[var(--border)] bg-[var(--bg-elev)]/60">
              <CardHeader>
                <CardTitle className="text-white">Plan & billing</CardTitle>
                <CardDescription>
                  Manage your plan and billing preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm text-white/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[var(--muted)]">Current plan</span>
                  <span>No active plan</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="bg-[var(--accent)] text-black"
                    onClick={handleManageBilling}
                    disabled={isManagingBilling}
                  >
                    Manage billing
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/pricing">View pricing</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[var(--border)] bg-[var(--bg-elev)]/60">
              <CardHeader>
                <CardTitle className="text-white">Credits</CardTitle>
                <CardDescription>Your current credit balance.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-3xl font-semibold text-white">
                    {typeof entitlements?.credits === "number"
                      ? entitlements.credits
                      : "-"}
                  </div>
                  <div className="text-sm text-[var(--muted)]">credits</div>
                </div>
                <Button asChild variant="outline">
                  <Link href="/pricing?topup=1">Get credits</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-[var(--border)] bg-[var(--bg-elev)]/60">
              <CardHeader>
                <CardTitle className="text-white">Payment & invoices</CardTitle>
                <CardDescription>
                  Billing history and payment settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm text-white/80">
                {invoices.length > 0 ? (
                  <div className="grid gap-3">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-4 py-3"
                      >
                        <div>
                          <div className="text-white">{invoice.date}</div>
                          <div className="text-xs text-[var(--muted)]">
                            {invoice.amount} · {invoice.status}
                          </div>
                        </div>
                        <Link
                          href={invoice.href}
                          className="text-xs font-semibold text-[var(--accent)]"
                        >
                          Receipt
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[var(--muted)]">
                    Invoices and payment methods appear once you have an active
                    plan.
                  </div>
                )}
                <Button
                  className="bg-[var(--accent)] text-black"
                  onClick={handleManageBilling}
                  disabled={isManagingBilling}
                >
                  Manage billing
                </Button>
              </CardContent>
            </Card>

            <Card className="border-[var(--border)] bg-[var(--bg-elev)]/60">
              <CardHeader>
                <CardTitle className="text-white">Security</CardTitle>
                <CardDescription>Update your sign-in details.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm text-white/80">
                <div className="text-[var(--muted)]">
                  Password changes are available for password accounts.
                </div>
                <Button variant="outline" disabled>
                  Change password
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
