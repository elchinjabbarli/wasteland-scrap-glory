"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Flame, Gift, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { STREAK_REWARDS } from "@/lib/game/streak";

interface StreakInfo {
  currentStreak: number;
  canClaim: boolean;
  todayReward: { day: number; scrap: number; xp: number; crystal?: number };
  tomorrowReward: { day: number; scrap: number; xp: number; crystal?: number };
  maxStreak: number;
}

export function StreakBanner() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [info, setInfo] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/streak/info");
      const data = await res.json();
      setInfo(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshPlayer = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();
    if (meData.player) useGameStore.getState().setPlayer(meData.player);
  }, []);

  async function handleClaim() {
    setClaiming(true);
    try {
      const res = await fetch("/api/streak/claim", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        const r = data.rewards;
        toast({
          title: `🔥 ${data.streak}. Gün!`,
          description: `+${r.scrap} Hurda · +${r.xp} XP${r.crystal ? ` · +${r.crystal} Kristal` : ""}`,
        });
        await refreshPlayer();
        await load();
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  }

  if (loading || !info) return null;

  return (
    <div className="px-3 sm:p-4 max-w-4xl mx-auto pb-2">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pixel-panel p-2 sm:p-3"
        style={{ borderColor: "var(--rust)", boxShadow: "0 0 14px var(--rust)44" }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Flame icon */}
          <div className="w-10 h-10 flex items-center justify-center border-2 border-rust bg-rust/10 flex-shrink-0">
            <Flame className="w-5 h-5 text-rust animate-pulse" />
          </div>

          {/* Streak info */}
          <div className="flex-1 min-w-0">
            <div className="font-pixel text-xs font-bold text-rust">
              {locale === "tr" ? "Giriş Serisi" : "Login Streak"}: {info.currentStreak}/{info.maxStreak}
            </div>
            <div className="text-[9px] text-muted-foreground font-pixel">
              {locale === "tr" ? "Bugün" : "Today"}: +{info.todayReward.scrap} Hurda · +{info.todayReward.xp} XP
              {info.todayReward.crystal ? ` · +${info.todayReward.crystal} 💎` : ""}
            </div>
          </div>

          {/* 7-day dots */}
          <div className="flex gap-0.5 flex-shrink-0">
            {STREAK_REWARDS.map((r, i) => {
              const day = i + 1;
              const claimed = day <= info.currentStreak;
              const isToday = day === info.currentStreak && !info.canClaim;
              return (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center border text-[8px] font-pixel font-bold",
                    claimed ? "border-rust text-rust bg-rust/10" : "border-border text-muted-foreground/40"
                  )}
                  style={isToday ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
                  title={`${r.day}. gün: +${r.scrap} Hurda${r.crystal ? ` +${r.crystal} Kristal` : ""}`}
                >
                  {r.crystal ? "💎" : day}
                </div>
              );
            })}
          </div>

          {/* Claim button */}
          {info.canClaim && (
            <Button
              onClick={handleClaim}
              disabled={claiming}
              className="pixel-button bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-9 text-[10px] px-3 flex-shrink-0"
            >
              {claiming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
              {locale === "tr" ? "Al" : "Claim"}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
