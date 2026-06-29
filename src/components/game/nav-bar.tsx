"use client";

import { useState } from "react";
import { useGameStore, type GameView } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import {
  Home, Swords, Backpack, User, Hammer, Sparkles, Store, Star,
  MapPin, Trophy, Gift, Crown, Users, Skull, Heart, Globe, Award, Settings,
  MoreHorizontal, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface NavBarProps {
  className?: string;
}

// Ana navigasyon (her zaman görünür — 5 buton)
const PRIMARY_NAV: { key: GameView; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { key: "dashboard", icon: Home, labelKey: "nav.home" },
  { key: "battle", icon: Swords, labelKey: "nav.battle" },
  { key: "inventory", icon: Backpack, labelKey: "nav.inventory" },
  { key: "quests", icon: Gift, labelKey: "nav.quests" },
  { key: "profile", icon: User, labelKey: "nav.profile" },
];

// İkincil navigasyon (daha fazla menüsünde)
const SECONDARY_NAV: { key: GameView; icon: React.ComponentType<{ className?: string }>; labelKey: string; customLabel?: { tr: string; en: string } }[] = [
  { key: "expedition", icon: MapPin, labelKey: "nav.expedition" },
  { key: "crafting", icon: Hammer, labelKey: "nav.crafting" },
  { key: "upgrade", icon: Sparkles, labelKey: "nav.upgrade" },
  { key: "market", icon: Store, labelKey: "nav.market" },
  { key: "clan", icon: Users, labelKey: "nav.clan" },
  { key: "raid", icon: Skull, labelKey: "nav.raid" },
  { key: "globalBoss", icon: Globe, labelKey: "nav.globalBoss" },
  { key: "tournament", icon: Trophy, labelKey: "", customLabel: { tr: "Turnuva", en: "Tournament" } },
  { key: "achievements", icon: Trophy, labelKey: "nav.achievements" },
  { key: "leaderboard", icon: Crown, labelKey: "nav.leaderboard" },
  { key: "social", icon: Heart, labelKey: "nav.social" },
  { key: "badges", icon: Award, labelKey: "nav.badges" },
  { key: "prestige", icon: Star, labelKey: "nav.prestige" },
  { key: "settings", icon: Settings, labelKey: "", customLabel: { tr: "Ayarlar", en: "Settings" } },
];

export function NavBar({ className }: NavBarProps) {
  const { view, setView, player } = useGameStore();
  const { t } = useI18n();
  const [moreOpen, setMoreOpen] = useState(false);

  // Raid sadece klan üyelerine göster
  const secondaryItems = SECONDARY_NAV.filter((it) => {
    if (it.key === "raid" && !player?.clanId) return false;
    return true;
  });

  // Aktif view primary'de mi?
  const activeInPrimary = PRIMARY_NAV.some((it) => it.key === view);
  // Aktif view secondary'de mi?
  const activeInSecondary = secondaryItems.some((it) => it.key === view);

  function handleSelect(v: GameView) {
    setView(v);
    setMoreOpen(false);
  }

  return (
    <>
      {/* Daha Fazla menüsü — overlay */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/80 flex items-end justify-center"
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl bg-wasteland-panel border-t-4 border-rust p-4 rounded-t-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-pixel text-sm font-bold text-accent uppercase tracking-wider">
                  {t("nav.battle") === "Battle" ? "More" : "Daha Fazla"}
                </h3>
                <button onClick={() => setMoreOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {secondaryItems.map((it) => {
                  const active = view === it.key;
                  const label = it.customLabel
                    ? (t("nav.battle") === "Battle" ? it.customLabel.en : it.customLabel.tr)
                    : t(it.labelKey);
                  return (
                    <button
                      key={it.key}
                      onClick={() => handleSelect(it.key)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 py-3 px-1 border-2 transition-all min-h-[64px]",
                        "pixel-button",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card/50 text-muted-foreground border-border hover:text-foreground hover:border-accent"
                      )}
                    >
                      <it.icon className={cn("w-5 h-5", active && "glow-text")} />
                      <span className={cn("font-pixel text-[7px] uppercase tracking-wider text-center leading-tight", active && "font-bold")}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ana navigasyon — 5 buton + "Daha Fazla" */}
      <nav
        className={cn(
          "sticky bottom-0 left-0 right-0 z-50 bg-wasteland-panel/95 backdrop-blur-sm border-t-2 border-wasteland-border",
          "px-1 py-1.5 flex justify-around items-stretch gap-0.5",
          "shadow-[0_-4px_0_0_oklch(0_0_0/0.5)]",
          className
        )}
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        {PRIMARY_NAV.map((it) => {
          const active = view === it.key;
          const isProfile = it.key === "profile";
          const badge = isProfile ? (player?.statPoints ?? 0) : 0;
          return (
            <button
              key={it.key}
              onClick={() => handleSelect(it.key)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-2 transition-all border-2 flex-1 min-h-[52px] min-w-[56px]",
                "pixel-button",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/50 text-muted-foreground border-border hover:text-foreground hover:border-accent"
              )}
              style={active ? { boxShadow: "0 0 12px var(--primary)" } : undefined}
            >
              <div className="relative">
                <it.icon className={cn("w-5 h-5", active && "glow-text")} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent text-accent-foreground text-[8px] font-bold flex items-center justify-center rounded-full">
                    {badge}
                  </span>
                )}
              </div>
              <span className={cn("font-pixel text-[8px] uppercase tracking-wider", active && "font-bold")}>
                {t(it.labelKey)}
              </span>
            </button>
          );
        })}

        {/* Daha Fazla butonu */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center gap-0.5 py-2 px-2 transition-all border-2 flex-1 min-h-[52px] min-w-[56px]",
            "pixel-button",
            activeInSecondary
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card/50 text-muted-foreground border-border hover:text-foreground hover:border-accent"
          )}
        >
          <div className="relative">
            <MoreHorizontal className={cn("w-5 h-5", activeInSecondary && "glow-text")} />
          </div>
          <span className={cn("font-pixel text-[8px] uppercase tracking-wider", activeInSecondary && "font-bold")}>
            {t("nav.battle") === "Battle" ? "More" : "Daha Fazla"}
          </span>
        </button>
      </nav>
    </>
  );
}
