"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/i18n/request";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

interface WeatherInfo {
  type: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  multiplier: number;
  combatMul: number;
  dropMul: number;
  color: string;
  icon: string;
  isPositive: boolean;
}

export function WeatherBanner() {
  const { t, locale } = useI18n();
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.json())
      .then((d) => setWeather(d))
      .catch(() => {});
  }, []);

  if (!weather || weather.type === "CLEAR") return null;

  const Icon = (Icons[weather.icon as keyof typeof Icons] ?? Icons.Sun) as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

  const bonuses: string[] = [];
  if (weather.multiplier !== 1.0) {
    bonuses.push(`Ödül ${weather.multiplier > 1 ? "+" : ""}${Math.round((weather.multiplier - 1) * 100)}%`);
  }
  if (weather.dropMul !== 1.0) {
    bonuses.push(`Drop ${weather.dropMul > 1 ? "+" : ""}${Math.round((weather.dropMul - 1) * 100)}%`);
  }
  if (weather.combatMul !== 1.0) {
    bonuses.push(`Hasar ${weather.combatMul > 1 ? "+" : ""}${Math.round((weather.combatMul - 1) * 100)}%`);
  }

  return (
    <div className="px-3 sm:px-4 max-w-4xl mx-auto pb-2">
      <div
        className="pixel-panel p-2 flex items-center gap-2"
        style={{ borderColor: weather.color, boxShadow: `0 0 12px ${weather.color}44` }}
      >
        <div
          className="w-8 h-8 flex items-center justify-center border-2 flex-shrink-0"
          style={{ borderColor: weather.color, backgroundColor: `${weather.color}22` }}
        >
          <Icon className="w-4 h-4" style={{ color: weather.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-pixel text-xs font-bold" style={{ color: weather.color }}>
            {t("weather.todayWeather")}: {weather.name[locale as "tr" | "en"]}
          </div>
          <div className="text-[9px] text-muted-foreground font-pixel">
            {bonuses.join(" · ")}
          </div>
        </div>
        <div className={cn("text-[9px] font-pixel font-bold uppercase", weather.isPositive ? "text-accent" : "text-destructive")}>
          {weather.isPositive ? "BONUS" : "RİSK"}
        </div>
      </div>
    </div>
  );
}
