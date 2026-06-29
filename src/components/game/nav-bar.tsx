"use client";

import { useState } from "react";
import { useGameStore, type GameView } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import {
  Home, Swords, Backpack, User, Gift, MoreHorizontal, X,
  MapPin, Hammer, Sparkles, Store, Star,
  Trophy, Crown, Users, Skull, Heart, Globe, Award, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface NavBarProps {
  className?: string;
}

// Ana navigasyon — 5 buton (her zaman görünür)
const PRIMARY_NAV: { key: GameView; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { key: "dashboard", icon: Home, labelKey: "nav.home" },
  { key: "battle", icon: Swords, labelKey: "nav.battle" },
  { key: "inventory", icon: Backpack, labelKey: "nav.inventory" },
  { key: "quests", icon: Gift, labelKey: "nav.quests" },
  { key: "profile", icon: User, labelKey: "nav.profile" },
];

// İkincil navigasyon — "Daha Fazla" menüsünde
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

  const secondaryItems = SECONDARY_NAV.filter((it) => {
    if (it.key === "raid" && !player?.clanId) return false;
    return true;
  });

  const activeInPrimary = PRIMARY_NAV.some((it) => it.key === view);
  const activeInSecondary = secondaryItems.some((it) => it.key === view);

  function handleSelect(v: GameView) {
    setView(v);
    setMoreOpen(false);
  }

  function getLabel(it: { labelKey: string; customLabel?: { tr: string; en: string } }): string {
    if (it.customLabel) {
      return t("nav.battle") === "Battle" ? it.customLabel.en : it.customLabel.tr;
    }
    return t(it.labelKey);
  }

  return (
    <>
      {/* Daha Fazla menüsü — alttan açılır panel */}
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
              initial={{ y: 400 }}
              animate={{ y: 0 }}
              exit={{ y: 400 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="w-full max-w-2xl bg-wasteland-panel border-t-4 border-rust rounded-t-3xl p-5"
              onClick={(e) => e.stopPropagation()}
              style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            >
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-pixel text-sm font-bold text-accent uppercase tracking-wider">
                  {t("nav.battle") === "Battle" ? "More" : "Daha Fazla"}
                </h3>
                <button onClick={() => setMoreOpen(false)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {secondaryItems.map((it) => {
                  const active = view === it.key;
                  const label = getLabel(it);
                  return (
                    <button
                      key={it.key}
                      onClick={() => handleSelect(it.key)}
                      className={cn(
                        "flex flex-col items-center gap-2 py-3 px-1 rounded-xl border-2 transition-all min-h-[72px]",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card/50 text-muted-foreground border-border hover:text-foreground hover:border-accent"
                      )}
                    >
                      <it.icon className="w-6 h-6" />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-center leading-tight">
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

      {/* Ana navigasyon — sabit alt çubuk */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-wasteland-panel/98 backdrop-blur-md border-t-2 border-wasteland-border",
          "flex justify-around items-stretch",
          className
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
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
                "flex flex-col items-center justify-center gap-1 py-2.5 flex-1 transition-all min-h-[60px] relative",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Aktif çizgi */}
              {active && (
                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
              <div className="relative">
                <it.icon className={cn("w-6 h-6", active && "text-primary")} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center rounded-full">
                    {badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wide",
                active && "text-primary"
              )}>
                {t(it.labelKey)}
              </span>
            </button>
          );
        })}

        {/* Daha Fazla butonu */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-2.5 flex-1 transition-all min-h-[60px] relative",
            activeInSecondary ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {activeInSecondary && (
            <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
          )}
          <div className="relative">
            <MoreHorizontal className={cn("w-6 h-6", activeInSecondary && "text-primary")} />
          </div>
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wide",
            activeInSecondary && "text-primary"
          )}>
            {t("nav.battle") === "Battle" ? "More" : "Daha Fazla"}
          </span>
        </button>
      </nav>
    </>
  );
}
