"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PixelPanelProps {
  children: ReactNode;
  className?: string;
  glow?: "none" | "rust" | "radiation" | "blood";
}

export function PixelPanel({ children, className, glow = "none" }: PixelPanelProps) {
  const glowMap = {
    none: "",
    rust: "shadow-[0_0_15px_-2px_var(--rust)]",
    radiation: "shadow-[0_0_18px_-2px_var(--radiation)]",
    blood: "shadow-[0_0_15px_-2px_var(--blood)]",
  };
  return (
    <div className={cn("pixel-panel p-4", glowMap[glow], className)}>
      {children}
    </div>
  );
}
