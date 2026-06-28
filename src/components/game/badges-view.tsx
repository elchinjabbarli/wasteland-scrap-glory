"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import * as Icons from "lucide-react";
import { Loader2, Award, Lock, Check, Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BadgeItem {
  code: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  icon: string;
  color: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

interface TitleItem {
  code: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  color: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

type Tab = "badges" | "titles";

export function BadgesView() {
  const { player } = useGameStore();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("badges");
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [titles, setTitles] = useState<TitleItem[]>([]);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/player/badges");
      const data = await res.json();
      setBadges(data.badges ?? []);
      setTitles(data.titles ?? []);
      setActiveTitle(data.activeTitle ?? null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSetTitle(code: string) {
    setBusy(code);
    try {
      const res = await fetch("/api/player/set-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: "Unvan güncellendi" });
        setActiveTitle(code);
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground font-pixel uppercase text-xs">
        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
        {t("common.loading")}
      </div>
    );
  }

  const unlockedBadges = badges.filter((b) => b.isUnlocked).length;
  const unlockedTitles = titles.filter((t2) => t2.isUnlocked).length;

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text flex items-center gap-2">
          <Award className="w-5 h-5" />
          {t("badges.title")}
        </h2>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mt-1">
          {t("badges.subtitle")}
        </p>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="text-center p-2 border border-accent bg-accent/10">
            <div className="font-pixel text-xl font-bold text-accent">{unlockedBadges}/{badges.length}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-pixel">{t("badges.unlocked")}</div>
          </div>
          <div className="text-center p-2 border border-border bg-card/50">
            <div className="font-pixel text-xl font-bold text-foreground">{unlockedTitles}/{titles.length}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-pixel">{t("badges.unlockedTitles")}</div>
          </div>
        </div>

        <div className="flex gap-1 mt-3">
          <button
            onClick={() => setTab("badges")}
            className={cn("pixel-button flex-1 px-2 py-1.5 text-[10px] font-pixel uppercase border-2", tab === "badges" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border")}
          >
            <Award className="w-3 h-3 inline mr-1" />
            {t("badges.badges")}
          </button>
          <button
            onClick={() => setTab("titles")}
            className={cn("pixel-button flex-1 px-2 py-1.5 text-[10px] font-pixel uppercase border-2", tab === "titles" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border")}
          >
            <Star className="w-3 h-3 inline mr-1" />
            {t("badges.titles")}
          </button>
        </div>
      </PixelPanel>

      {/* ROZETLER */}
      {tab === "badges" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {badges.map((badge) => {
            const Icon = (Icons[badge.icon as keyof typeof Icons] ?? Icons.Award) as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
            return (
              <motion.div
                key={badge.code}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn("pixel-panel p-2 text-center", !badge.isUnlocked && "opacity-50")}
                style={{ borderColor: badge.isUnlocked ? badge.color : "var(--wasteland-border)" }}
              >
                <div
                  className="w-10 h-10 mx-auto flex items-center justify-center border-2 mb-1"
                  style={{
                    borderColor: badge.isUnlocked ? badge.color : "var(--wasteland-border)",
                    backgroundColor: badge.isUnlocked ? `${badge.color}22` : "transparent",
                  }}
                >
                  {badge.isUnlocked ? (
                    <Icon className="w-5 h-5" style={{ color: badge.color }} />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="font-pixel text-[9px] font-bold leading-tight" style={{ color: badge.isUnlocked ? badge.color : "var(--foreground)" }}>
                  {badge.name[locale as "tr" | "en"]}
                </div>
                <div className="text-[8px] text-muted-foreground mt-0.5 leading-tight">
                  {badge.description[locale as "tr" | "en"]}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* UNVANLAR */}
      {tab === "titles" && (
        <div className="space-y-1">
          {titles.map((title) => {
            const isActive = activeTitle === title.code;
            return (
              <motion.div
                key={title.code}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn("pixel-panel p-2 flex items-center gap-2", !title.isUnlocked && "opacity-50")}
                style={{ borderColor: isActive ? title.color : title.isUnlocked ? "var(--wasteland-border)" : "var(--wasteland-border)" }}
              >
                <Star className={cn("w-4 h-4 flex-shrink-0", title.isUnlocked ? "text-accent" : "text-muted-foreground")} />
                <div className="flex-1 min-w-0">
                  <div className="font-pixel text-xs font-bold" style={{ color: title.isUnlocked ? title.color : "var(--foreground)" }}>
                    {title.name[locale as "tr" | "en"]}
                  </div>
                  <div className="text-[9px] text-muted-foreground leading-tight">
                    {title.description[locale as "tr" | "en"]}
                  </div>
                </div>
                {isActive && (
                  <span className="text-[9px] font-pixel font-bold text-accent uppercase border border-accent px-1">
                    {t("badges.active")}
                  </span>
                )}
                {title.isUnlocked && !isActive && (
                  <Button
                    onClick={() => handleSetTitle(title.code)}
                    disabled={busy === title.code}
                    className="pixel-button bg-card text-foreground border-2 border-border font-pixel uppercase h-7 text-[10px] px-2"
                  >
                    {busy === title.code ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    {t("badges.use")}
                  </Button>
                )}
                {!title.isUnlocked && (
                  <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
