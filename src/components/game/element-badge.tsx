"use client";

import { ELEMENTS, type Element } from "@/lib/game/constants";
import { useI18n } from "@/i18n/request";
import { cn } from "@/lib/utils";

interface ElementBadgeProps {
  element: Element | string;
  className?: string;
}

export function ElementBadge({ element, className }: ElementBadgeProps) {
  const { t } = useI18n();
  const el = ELEMENTS[element as Element] ?? ELEMENTS.PHYSICAL;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border", className)}
      style={{ color: el.color, borderColor: el.color, backgroundColor: `${el.color}22` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: el.color }} />
      {t(`elements.${el.code}`)}
    </span>
  );
}
