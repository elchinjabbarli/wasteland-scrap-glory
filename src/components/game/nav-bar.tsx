"use client";

import { useGameStore, type GameView } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { Home, Swords, Compass, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavBarProps {
  className?: string;
}

// 4 buton: Ana Sayfa, Savaş, Keşfet, Profil
const NAV_ITEMS: { key: GameView; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { key: "dashboard", icon: Home, labelKey: "nav.home" },
  { key: "battle", icon: Swords, labelKey: "nav.battle" },
  { key: "explore", icon: Compass, labelKey: "nav.explore" },
  { key: "profile", icon: User, labelKey: "nav.profile" },
];

export function NavBar({ className }: NavBarProps) {
  const { view, setView, player } = useGameStore();
  const { t } = useI18n();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-wasteland-panel/98 backdrop-blur-md border-t border-wasteland-border",
        "flex justify-around items-stretch",
        className
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map((it) => {
        const active = view === it.key;
        const isProfile = it.key === "profile";
        const badge = isProfile ? (player?.statPoints ?? 0) : 0;
        return (
          <button
            key={it.key}
            onClick={() => setView(it.key)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 flex-1 transition-all min-h-[64px] relative",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-primary rounded-full" />
            )}
            <div className="relative">
              <it.icon className={cn("w-7 h-7", active && "text-primary")} />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-accent text-accent-foreground text-[11px] font-bold flex items-center justify-center rounded-full">
                  {badge}
                </span>
              )}
            </div>
            <span className={cn(
              "text-[11px] font-bold uppercase tracking-wide",
              active && "text-primary"
            )}>
              {t(it.labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
