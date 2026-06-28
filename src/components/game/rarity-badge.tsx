"use client";

import { RARITIES, type Rarity } from "@/lib/game/constants";
import { useI18n } from "@/i18n/request";
import { cn } from "@/lib/utils";

interface RarityBadgeProps {
  rarity: Rarity | string;
  className?: string;
  size?: "sm" | "md";
}

export function RarityBadge({ rarity, className, size = "sm" }: RarityBadgeProps) {
  const { t } = useI18n();
  const r = RARITIES[rarity as Rarity] ?? RARITIES.COMMON;
  const sizeCls = size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  return (
    <span
      className={cn(
        "inline-block font-pixel font-bold uppercase tracking-wider border",
        sizeCls,
        className
      )}
      style={{
        color: r.color,
        borderColor: r.color,
        backgroundColor: `${r.color}22`,
      }}
    >
      {t(`rarities.${r.code}`)}
    </span>
  );
}
