"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { Loader2, Gift, CheckCircle2, Gem } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuestItem {
  id: string;
  type: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  target: number;
  progress: number;
  completed: boolean;
  rewardScrap: number;
  rewardXp: number;
  icon: string;
  expiresAt: string;
}

interface QuestsData {
  quests: QuestItem[];
  allCompleted: boolean;
  claimedToday: boolean;
  rewardCrystal: number;
}

export function QuestsView() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [data, setData] = useState<QuestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/quests/daily");
      const d = await res.json();
      setData(d);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleClaim() {
    setClaiming(true);
    try {
      const res = await fetch("/api/quests/claim", { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: d.error, variant: "destructive" });
      } else {
        toast({
          title: "🎁 Ödül Alındı!",
          description: `+${d.rewards.scrap} Hurda · +${d.rewards.xp} XP · +${d.rewards.crystal} Kristal`,
        });
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (meData.player) useGameStore.getState().setPlayer(meData.player);
        await load();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="p-4 text-center text-muted-foreground font-pixel uppercase text-xs">
        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
        {t("common.loading")}
      </div>
    );
  }

  const expiresAt = new Date(data.quests[0]?.expiresAt ?? Date.now() + 86400000);
  const hoursLeft = Math.floor((expiresAt.getTime() - Date.now()) / 3600000);
  const minLeft = Math.floor(((expiresAt.getTime() - Date.now()) % 3600000) / 60000);

  return (
    <div className="p-3 sm:p-4 max-w-2xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text flex items-center gap-2">
          <Gift className="w-5 h-5" />
          {t("quests.title")}
        </h2>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mt-1">
          {t("quests.subtitle")}
        </p>
        <div className="mt-2 text-center text-[10px] text-muted-foreground font-pixel uppercase">
          {t("quests.expiresIn", { hours: hoursLeft, min: minLeft })}
        </div>
      </PixelPanel>

      {/* Görevler */}
      {data.quests.map((q) => {
        const Icon = (Icons[q.icon as keyof typeof Icons] ?? Icons.Circle) as React.ComponentType<{ className?: string }>;
        const progressPct = q.target > 0 ? Math.min(100, (q.progress / q.target) * 100) : 0;
        return (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <PixelPanel
              glow={q.completed ? "radiation" : "none"}
              className="p-3"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-10 h-10 flex items-center justify-center border-2 flex-shrink-0",
                    q.completed ? "border-accent bg-accent/10" : "border-border"
                  )}
                >
                  {q.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  ) : (
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("font-pixel text-sm font-bold", q.completed ? "text-accent" : "text-foreground")}>
                      {q.name[locale as "tr" | "en"]}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-pixel">
                      {q.progress}/{q.target}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2 leading-tight">
                    {q.description[locale as "tr" | "en"]}
                  </p>
                  <div className="w-full bg-muted border border-border h-2 overflow-hidden mb-2">
                    <motion.div
                      className="h-full"
                      style={{ backgroundColor: q.completed ? "var(--accent)" : "var(--rust)" }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-pixel">
                    <span className="text-rust">+{q.rewardScrap} Hurda</span>
                    <span className="text-accent">+{q.rewardXp} XP</span>
                  </div>
                </div>
              </div>
            </PixelPanel>
          </motion.div>
        );
      })}

      {/* Toplu ödül */}
      <PixelPanel glow={data.allCompleted && !data.claimedToday ? "radiation" : "none"} className="p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Gem className="w-5 h-5 text-accent glow-text" />
          <span className="font-pixel text-sm font-bold text-accent uppercase">
            {t("quests.rewardCrystal", { n: data.rewardCrystal })}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground font-pixel uppercase mb-3">
          {data.allCompleted ? t("quests.allCompleted") : t("quests.completeAll")}
        </p>
        <Button
          onClick={handleClaim}
          disabled={!data.allCompleted || data.claimedToday || claiming}
          className={cn(
            "pixel-button w-full font-pixel uppercase h-11",
            data.allCompleted && !data.claimedToday
              ? "bg-accent text-accent-foreground hover:bg-accent/90"
              : "bg-card text-muted-foreground border-2 border-border"
          )}
        >
          {claiming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : data.claimedToday ? (
            t("quests.claimedToday")
          ) : (
            <Gift className="w-4 h-4" />
          )}
          {t("quests.claimReward")}
        </Button>
      </PixelPanel>
    </div>
  );
}
