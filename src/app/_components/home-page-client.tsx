"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import GrokThread from "@/components/chat/GrokThread";

export default function HomePageClient({
  initialThreadId = null,
}: {
  initialThreadId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("chat-page");
    document.body.classList.add("chat-page");
    return () => {
      document.documentElement.classList.remove("chat-page");
      document.body.classList.remove("chat-page");
    };
  }, []);

  const handleThreadChange = useCallback(
    (threadId: string | null) => {
      const target = threadId ? `/c/${threadId}` : "/";
      if (pathname === target) return;
      router.push(target);
    },
    [pathname, router],
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <section id="chat" className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 w-full flex-1 items-stretch">
          <GrokThread
            initialThreadId={initialThreadId}
            inlineThread
            showHistorySidebar
            onThreadChange={handleThreadChange}
          />
        </div>
      </section>
    </div>
  );
}
