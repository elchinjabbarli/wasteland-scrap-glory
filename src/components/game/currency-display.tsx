"use client";

import { Recycle, Cpu, Gem, CircuitBoard, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CurrencyDisplayProps {
  scrap?: number;
  techPart?: number;
  crystal?: number;
  electronic?: number;
  crystalDust?: number;
  compact?: boolean;
  className?: string;
}

export function CurrencyDisplay({
  scrap = 0,
  techPart = 0,
  crystal = 0,
  electronic = 0,
  crystalDust = 0,
  compact = false,
  className,
}: CurrencyDisplayProps) {
  const items = [
    { icon: Recycle, value: scrap, color: "var(--scrap)", label: "Hurda" },
    { icon: CircuitBoard, value: electronic, color: "#a3e635", label: "Elektronik" },
    { icon: Cpu, value: techPart, color: "var(--tech)", label: "Tech-Part" },
    { icon: Gem, value: crystal, color: "var(--crystal)", label: "Kristal" },
    { icon: Sparkles, value: crystalDust, color: "#f0abfc", label: "Kristal Tozu" },
  ].filter((i) => i.value > 0 || !compact);

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((it, i) => (
        <div
          key={i}
          className="flex items-center gap-1.5 px-2 py-1 border border-border bg-card/50"
          title={it.label}
        >
          <it.icon className="w-3 h-3" style={{ color: it.color }} />
          <span className="text-xs font-pixel font-bold" style={{ color: it.color }}>
            {it.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
