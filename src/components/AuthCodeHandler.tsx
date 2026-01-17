"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useEffect, useRef } from "react";

export default function AuthCodeHandler() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current || isAuthenticated) return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code) return;
    handledRef.current = true;
    url.searchParams.delete("code");
    void (async () => {
      try {
        // Convex Auth uses provider-less sign-in for OAuth code exchange.
        await signIn(undefined as unknown as string, { code });
      } finally {
        window.history.replaceState({}, "", url.toString());
      }
    })();
  }, [isAuthenticated, signIn]);

  return null;
}
