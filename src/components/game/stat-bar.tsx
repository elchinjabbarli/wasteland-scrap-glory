"use client";

import { cn } from "@/lib/utils";

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatBar({ label, value, max, color = "var(--accent)", showValue = true, size = "md", className }: StatBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const sizeCls = {
    sm: { bar: "h-1.5", text: "text-[10px]" },
    md: { bar: "h-2.5", text: "text-xs" },
    lg: { bar: "h-4", text: "text-sm" },
  }[size];

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between items-center mb-1">
        <span className={cn("font-pixel uppercase tracking-wider text-muted-foreground", sizeCls.text)}>{label}</span>
        {showValue && (
          <span className={cn("font-pixel font-bold", sizeCls.text)} style={{ color }}>
            {value}
            {max !== 100 && max !== 1 && <span className="text-muted-foreground">/{max}</span>}
          </span>
        )}
      </div>
      <div className={cn("w-full bg-muted border border-border overflow-hidden", sizeCls.bar)}>
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}88`,
          }}
        />
      </div>
    </div>
  );
}
