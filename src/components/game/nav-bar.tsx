"use client";

import { useGameStore, type GameView } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { Home, Swords, Backpack, User, Hammer, Sparkles, Store, Star, MapPin, Trophy, Gift, Crown, Users, Skull, Heart, Globe, Award, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavBarProps {
  className?: string;
}

export function NavBar({ className }: NavBarProps) {
  const { view, setView, player } = useGameStore();
  const { t } = useI18n();

  const items: { key: GameView; icon: React.ComponentType<{ className?: string }>; label: string; badge?: number; show?: boolean }[] = [
    { key: "dashboard", icon: Home, label: t("nav.home") },
    { key: "battle", icon: Swords, label: t("nav.battle") },
    { key: "expedition", icon: MapPin, label: t("nav.expedition") },
    { key: "inventory", icon: Backpack, label: t("nav.inventory") },
    { key: "crafting", icon: Hammer, label: t("nav.crafting") },
    { key: "upgrade", icon: Sparkles, label: t("nav.upgrade") },
    { key: "market", icon: Store, label: t("nav.market") },
    { key: "clan", icon: Users, label: t("nav.clan") },
    { key: "raid", icon: Skull, label: t("nav.raid"), show: !!player?.clanId },
    { key: "globalBoss", icon: Globe, label: t("nav.globalBoss") },
    { key: "quests", icon: Gift, label: t("nav.quests") },
    { key: "achievements", icon: Trophy, label: t("nav.achievements") },
    { key: "leaderboard", icon: Crown, label: t("nav.leaderboard") },
    { key: "social", icon: Heart, label: t("nav.social") },
    { key: "badges", icon: Award, label: t("nav.badges") },
    { key: "prestige", icon: Star, label: t("nav.prestige") },
    { key: "settings", icon: Settings, label: t("nav.badges") === "Badges" ? "Settings" : "Ayarlar" },
    { key: "profile", icon: User, label: t("nav.profile"), badge: player?.statPoints ?? 0 },
  ];

  const visibleItems = items.filter((it) => it.show !== false);

  return (
    <nav
      className={cn(
        "sticky bottom-0 left-0 right-0 z-50 bg-wasteland-panel/95 backdrop-blur-sm border-t-2 border-wasteland-border",
        "px-1 py-1.5 flex justify-start items-stretch gap-0.5 overflow-x-auto scrollbar-thin",
        "shadow-[0_-4px_0_0_oklch(0_0_0/0.5)]",
        className
      )}
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      {visibleItems.map((it) => {
        const active = view === it.key;
        return (
          <button
            key={it.key}
            onClick={() => setView(it.key)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1.5 px-2 transition-all border-2 flex-shrink-0 min-w-[58px]",
              "pixel-button",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card/50 text-muted-foreground border-border hover:text-foreground hover:border-accent"
            )}
            style={active ? { boxShadow: "0 0 12px var(--primary)" } : undefined}
          >
            <div className="relative">
              <it.icon className={cn("w-4 h-4", active && "glow-text")} />
              {it.badge && it.badge > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-accent text-accent-foreground text-[8px] font-bold flex items-center justify-center rounded-full">
                  {it.badge}
                </span>
              ) : null}
            </div>
            <span className={cn("font-pixel text-[8px] uppercase tracking-wider", active && "font-bold")}>
              {it.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
