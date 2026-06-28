"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { RarityBadge } from "./rarity-badge";
import { Loader2, Trophy, Lock, CheckCircle2 } from "lucide-react";
import * as Icons from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { RARITIES, type Rarity } from "@/lib/game/constants";

type Category = "ALL" | "BATTLE" | "EXPLORATION" | "ECONOMY" | "SOCIAL";

interface AchievementItem {
  code: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  category: string;
  points: number;
  rarity: Rarity;
  icon: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  target: number;
}

export function AchievementsView() {
  const { t, locale } = useI18n();
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Category>("ALL");

  useEffect(() => {
    fetch("/api/achievements")
      .then((r) => r.json())
      .then((d) => {
        setAchievements(d.achievements ?? []);
        setTotalPoints(d.totalPoints ?? 0);
        setUnlockedCount(d.unlockedCount ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "ALL" ? achievements : achievements.filter((a) => a.category === filter);

  const categories: { key: Category; label: string }[] = [
    { key: "ALL", label: t("achievements.all") },
    { key: "BATTLE", label: t("achievements.battle") },
    { key: "EXPLORATION", label: t("achievements.exploration") },
    { key: "ECONOMY", label: t("achievements.economy") },
    { key: "SOCIAL", label: t("achievements.social") },
  ];

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          {t("achievements.title")}
        </h2>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mt-1">
          {t("achievements.subtitle")}
        </p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="text-center p-2 border border-accent bg-accent/10">
            <div className="font-pixel text-xl font-bold text-accent glow-text">{totalPoints}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-pixel">{t("achievements.totalPoints")}</div>
          </div>
          <div className="text-center p-2 border border-border bg-card/50">
            <div className="font-pixel text-xl font-bold text-foreground">{unlockedCount}/{achievements.length}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-pixel">{t("achievements.unlocked", { n: unlockedCount })}</div>
          </div>
        </div>
      </PixelPanel>

      {/* Kategori filtre */}
      <PixelPanel className="p-2">
        <div className="flex gap-1 flex-wrap">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={cn(
                "pixel-button px-2 py-1.5 text-[10px] font-pixel uppercase tracking-wider border-2",
                filter === c.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </PixelPanel>

      {/* Başarım listesi */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground font-pixel uppercase text-xs">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
          {t("common.loading")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((ach) => {
            const rarInfo = RARITIES[ach.rarity] ?? RARITIES.COMMON;
            const Icon = (Icons[ach.icon as keyof typeof Icons] ?? Icons.Trophy) as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
            const progressPct = ach.target > 0 ? Math.min(100, (ach.progress / ach.target) * 100) : 0;
            return (
              <motion.div
                key={ach.code}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn("pixel-panel p-3", !ach.isUnlocked && "opacity-70")}
                style={{ borderColor: ach.isUnlocked ? rarInfo.color : "var(--wasteland-border)" }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div
                    className={cn("w-10 h-10 flex items-center justify-center border-2 flex-shrink-0")}
                    style={{
                      borderColor: ach.isUnlocked ? rarInfo.color : "var(--wasteland-border)",
                      backgroundColor: ach.isUnlocked ? `${rarInfo.color}22` : "transparent",
                    }}
                  >
                    {ach.isUnlocked ? (
                      <Icon className="w-5 h-5" style={{ color: rarInfo.color }} />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-pixel text-xs font-bold truncate" style={{ color: ach.isUnlocked ? rarInfo.color : "var(--foreground)" }}>
                      {ach.name[locale as "tr" | "en"]}
                    </div>
                    <div className="text-[9px] text-muted-foreground font-pixel uppercase">
                      {ach.category} · +{ach.points}p
                    </div>
                  </div>
                  {ach.isUnlocked && (
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mb-2 leading-tight">
                  {ach.description[locale as "tr" | "en"]}
                </p>
                {!ach.isUnlocked && (
                  <div>
                    <div className="flex justify-between text-[9px] font-pixel mb-1">
                      <span className="text-muted-foreground uppercase">{t("achievements.progress", { current: ach.progress, target: ach.target })}</span>
                      <span className="text-muted-foreground">{Math.round(progressPct)}%</span>
                    </div>
                    <div className="w-full bg-muted border border-border h-1.5 overflow-hidden">
                      <div className="h-full" style={{ width: `${progressPct}%`, backgroundColor: rarInfo.color }} />
                    </div>
                  </div>
                )}
                {ach.isUnlocked && ach.unlockedAt && (
                  <div className="text-[9px] text-accent font-pixel uppercase">
                    {t("achievements.unlockedAt", { date: new Date(ach.unlockedAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US") })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
