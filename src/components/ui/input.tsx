import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "border-input text-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex h-10 w-full rounded-[var(--radius-sm)] border bg-[color:var(--bg)] px-4 py-2 text-sm placeholder:text-[var(--muted)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
