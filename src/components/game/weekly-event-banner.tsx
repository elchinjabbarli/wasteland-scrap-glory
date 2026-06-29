"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/i18n/request";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyEventInfo {
  type: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  xpMul: number;
  bossHpMul: number;
  bossRewardMul: number;
  dropMul: number;
  craftTimeMul: number;
  color: string;
  icon: string;
}

export function WeeklyEventBanner() {
  const { t, locale } = useI18n();
  const [event, setEvent] = useState<WeeklyEventInfo | null>(null);

  useEffect(() => {
    fetch("/api/weekly-event")
      .then((r) => r.json())
      .then((d) => setEvent(d.event))
      .catch(() => {});
  }, []);

  if (!event) return null;

  const Icon = (Icons[event.icon as keyof typeof Icons] ?? Icons.Star) as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

  const effects: string[] = [];
  if (event.xpMul !== 1.0) effects.push(`XP ${event.xpMul > 1 ? "+" : ""}${Math.round((event.xpMul - 1) * 100)}%`);
  if (event.bossHpMul !== 1.0) effects.push(`Boss HP ${event.bossHpMul > 1 ? "+" : ""}${Math.round((event.bossHpMul - 1) * 100)}%`);
  if (event.bossRewardMul !== 1.0) effects.push(`Boss Ödül +${Math.round((event.bossRewardMul - 1) * 100)}%`);
  if (event.dropMul !== 1.0) effects.push(`Drop +${Math.round((event.dropMul - 1) * 100)}%`);
  if (event.craftTimeMul !== 1.0) effects.push(`Craft ${event.craftTimeMul < 1 ? "hızlı" : "yavaş"} ${Math.round(Math.abs(event.craftTimeMul - 1) * 100)}%`);

  return (
    <div className="px-3 sm:px-4 max-w-4xl mx-auto pb-2">
      <div
        className="pixel-panel p-2 flex items-center gap-2"
        style={{ borderColor: event.color, boxShadow: `0 0 14px ${event.color}55` }}
      >
        <div
          className="w-8 h-8 flex items-center justify-center border-2 flex-shrink-0"
          style={{ borderColor: event.color, backgroundColor: `${event.color}22` }}
        >
          <Icon className="w-4 h-4 animate-pulse" style={{ color: event.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-pixel text-xs font-bold" style={{ color: event.color }}>
            {t("weeklyEvent.title")}: {event.name[locale as "tr" | "en"]}
          </div>
          <div className="text-[9px] text-muted-foreground font-pixel">
            {event.description[locale as "tr" | "en"]}
          </div>
          <div className="text-[9px] font-pixel font-bold" style={{ color: event.color }}>
            {effects.join(" · ")}
          </div>
        </div>
        <div className="text-[8px] font-pixel font-bold uppercase text-accent flex-shrink-0">
          ★
        </div>
      </div>
    </div>
  );
}
