"use client";

/**
 * @author: @dorianbaffier
 * @description: Shimmer Text
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface Text_01Props {
  text: string;
  className?: string;
  containerClassName?: string;
}

export default function ShimmerText({
  text = "Text Shimmer",
  className,
  containerClassName,
}: Text_01Props) {
  return (
    <div className={cn("flex items-center", containerClassName)}>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          animate={{
            backgroundPosition: ["200% center", "-200% center"],
          }}
          className={cn(
            "bg-gradient-to-r from-neutral-950 via-neutral-400 to-neutral-950 bg-[length:200%_100%] bg-clip-text text-base font-bold text-transparent dark:from-white dark:via-neutral-600 dark:to-white",
            className,
          )}
          transition={{
            duration: 2.5,
            ease: "linear",
            repeat: Number.POSITIVE_INFINITY,
          }}
        >
          {text}
        </motion.h1>
      </motion.div>
    </div>
  );
}
