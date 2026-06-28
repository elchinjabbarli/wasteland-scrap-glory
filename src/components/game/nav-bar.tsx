"use client";

import { useGameStore, type GameView } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { Home, Swords, Backpack, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavBarProps {
  className?: string;
}

export function NavBar({ className }: NavBarProps) {
  const { view, setView } = useGameStore();
  const { t } = useI18n();

  const items: { key: GameView; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { key: "dashboard", icon: Home, label: t("nav.home") },
    { key: "battle", icon: Swords, label: t("nav.battle") },
    { key: "inventory", icon: Backpack, label: t("nav.inventory") },
    { key: "profile", icon: User, label: t("nav.profile") },
  ];

  return (
    <nav
      className={cn(
        "sticky bottom-0 left-0 right-0 z-50 bg-wasteland-panel/95 backdrop-blur-sm border-t-2 border-wasteland-border",
        "px-1 py-1.5 flex justify-around items-stretch gap-1",
        "shadow-[0_-4px_0_0_oklch(0_0_0/0.5)]",
        className
      )}
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      {items.map((it) => {
        const active = view === it.key;
        return (
          <button
            key={it.key}
            onClick={() => setView(it.key)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 px-1 transition-all border-2",
              "pixel-button",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card/50 text-muted-foreground border-border hover:text-foreground hover:border-accent"
            )}
            style={active ? { boxShadow: "0 0 12px var(--primary)" } : undefined}
          >
            <it.icon className={cn("w-4 h-4 sm:w-5 sm:h-5", active && "glow-text")} />
            <span className={cn("font-pixel text-[8px] sm:text-[10px] uppercase tracking-wider", active && "font-bold")}>
              {it.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
