"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { I18nextProvider } from "react-i18next";

import { env } from "@/env";
import AuthCodeHandler from "@/components/AuthCodeHandler";
import i18n from "@/i18n/i18n";

const fallbackDevUrl = "http://127.0.0.1:3210";
const convexUrl = env.NEXT_PUBLIC_CONVEX_URL ?? fallbackDevUrl;
const convex = new ConvexReactClient(convexUrl);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ConvexAuthNextjsProvider client={convex}>
          <AuthCodeHandler />
          {children}
        </ConvexAuthNextjsProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
