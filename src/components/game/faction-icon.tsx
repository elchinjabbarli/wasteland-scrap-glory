"use client";

import { FACTIONS, type Faction } from "@/lib/game/constants";
import { useI18n } from "@/i18n/request";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

interface FactionIconProps {
  faction: Faction | string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

export function FactionIcon({ faction, size = "md", className, showLabel = false }: FactionIconProps) {
  const { t: _t, locale } = useI18n();
  const f = FACTIONS[faction as Faction] ?? FACTIONS.BOZKIR;
  const Icon = (Icons[f.icon as keyof typeof Icons] ?? Icons.Shield) as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  const sizeCls = { sm: "w-6 h-6", md: "w-10 h-10", lg: "w-16 h-16" }[size];
  const iconSize = { sm: "w-3 h-3", md: "w-5 h-5", lg: "w-8 h-8" }[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn("flex items-center justify-center border-2", sizeCls)}
        style={{
          borderColor: f.accent,
          backgroundColor: `${f.color}22`,
          boxShadow: `0 0 10px ${f.accent}44`,
        }}
      >
        <Icon className={iconSize} style={{ color: f.accent }} />
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className="font-pixel font-bold text-sm" style={{ color: f.accent }}>
            {f.name[locale as "tr" | "en"]}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {f.archetype[locale as "tr" | "en"]}
          </span>
        </div>
      )}
    </div>
  );
}
