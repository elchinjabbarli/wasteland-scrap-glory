"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { FactionIcon } from "./faction-icon";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Skull, Swords, Crown, Clock, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlobalBoss {
  id: string;
  week: string;
  code: string;
  name: string;
  maxHp: number;
  currentHp: number;
  startedAt: string;
  expiresAt: string;
  status: string;
  remainingMs: number;
  progress: number;
  topContributors: { rank: number; name: string; faction: string; level: number; damage: number; attacks: number }[];
}

export function GlobalBossView() {
  const { player } = useGameStore();
  const { t } = useI18n();
  const { toast } = useToast();
  const [boss, setBoss] = useState<GlobalBoss | null>(null);
  const [loading, setLoading] = useState(true);
  const [attacking, setAttacking] = useState(false);
  const [lastDamage, setLastDamage] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/global-boss");
      const data = await res.json();
      setBoss(data.boss);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleAttack() {
    if (!boss) return;
    setAttacking(true);
    setLastDamage(null);
    try {
      const res = await fetch("/api/global-boss/attack", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        setLastDamage(data.damage);
        if (data.defeated) {
          toast({ title: "🏆 GLOBAL BOSS YENİLDİ!", description: `Sıralaman: #${data.rank}` });
        } else if (data.reward?.item) {
          toast({ title: "🎁 LEGENDARY ÖDÜL!", description: `${data.reward.item.name} kazandın! (Sıra: #${data.rank})` });
        }
        await load();
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setAttacking(false);
    }
  }

  if (loading || !player) {
    return (
      <div className="p-4 text-center text-muted-foreground font-pixel uppercase text-xs">
        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
        {t("common.loading")}
      </div>
    );
  }

  if (!boss) {
    return (
      <div className="p-4 text-center text-muted-foreground font-pixel uppercase text-xs">
        {t("errors.generic")}
      </div>
    );
  }

  const remainHr = Math.floor(boss.remainingMs / 3600000);
  const remainMin = Math.floor((boss.remainingMs % 3600000) / 60000);
  const isActive = boss.status === "ACTIVE";

  return (
    <div className="p-3 sm:p-4 max-w-2xl mx-auto space-y-3">
      <PixelPanel glow="blood" className="p-4 sm:p-6 text-center">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="flex justify-center mb-3"
        >
          <div className="w-24 h-24 flex items-center justify-center border-4 border-destructive bg-card" style={{ boxShadow: "0 0 30px var(--destructive)" }}>
            <Skull className="w-12 h-12 text-destructive" />
          </div>
        </motion.div>
        <h2 className="font-pixel text-base sm:text-xl font-bold text-destructive glow-text mb-1">
          {boss.name}
        </h2>
        <p className="text-[10px] text-muted-foreground font-pixel uppercase tracking-wider mb-3">
          {t("globalBoss.weeklyBoss")} · {boss.week}
        </p>

        {/* HP */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-pixel">
            <span className="text-muted-foreground uppercase">{t("globalBoss.hp")}</span>
            <span className="text-rust font-bold">{boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}</span>
          </div>
          <div className="w-full bg-muted border border-border h-4 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-destructive via-rust to-yellow-500"
              animate={{ width: `${boss.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground font-pixel">
            {boss.progress.toFixed(2)}% {t("globalBoss.defeated")}
          </div>
        </div>

        {/* Süre / Durum */}
        <div className="mt-3 flex items-center justify-center gap-3 text-[10px] font-pixel">
          {isActive ? (
            <>
              <Clock className="w-3 h-3 text-yellow-500" />
              <span className="text-yellow-500">{remainHr}sa {remainMin}dk kaldı</span>
            </>
          ) : (
            <span className={cn("font-bold uppercase", boss.status === "DEFEATED" ? "text-accent" : "text-muted-foreground")}>
              {boss.status === "DEFEATED" ? `🏆 ${t("globalBoss.defeated")}!` : t("globalBoss.expired")}
            </span>
          )}
        </div>

        {/* Saldırı butonu */}
        <Button
          onClick={handleAttack}
          disabled={attacking || !isActive}
          className="pixel-button w-full mt-4 bg-destructive text-white hover:bg-destructive/90 font-pixel uppercase h-12"
        >
          {attacking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
          {t("globalBoss.attack")}
        </Button>

        {lastDamage !== null && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-2 p-2 border border-accent bg-accent/10"
          >
            <div className="font-pixel text-lg font-bold text-accent glow-text">-{lastDamage.toLocaleString()} hasar!</div>
          </motion.div>
        )}
      </PixelPanel>

      {/* Top 100 katkıda bulunanlar */}
      <PixelPanel className="p-3">
        <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2 flex items-center gap-2">
          <Crown className="w-4 h-4" />
          {t("globalBoss.topContributors")} (Top {boss.topContributors.length})
        </h3>
        {boss.topContributors.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground font-pixel uppercase text-xs">
            {t("globalBoss.noContributors")}
          </div>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin">
            {boss.topContributors.map((c) => (
              <div
                key={c.rank}
                className={cn(
                  "flex items-center gap-2 p-1.5 border text-[10px] font-pixel",
                  c.rank <= 100 && boss.status === "DEFEATED" ? "border-yellow-500/50 bg-yellow-500/5" : "border-border bg-card/30"
                )}
              >
                <span className={cn(
                  "w-7 text-center font-bold",
                  c.rank === 1 ? "text-yellow-400" : c.rank === 2 ? "text-gray-300" : c.rank === 3 ? "text-orange-400" : "text-muted-foreground"
                )}>
                  #{c.rank}
                </span>
                <FactionIcon faction={c.faction} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{c.name}</div>
                  <div className="text-[9px] text-muted-foreground uppercase">Sv {c.level} · {c.attacks} saldırı</div>
                </div>
                <span className="text-rust font-bold">{c.damage.toLocaleString()}</span>
                {c.rank <= 100 && boss.status === "DEFEATED" && (
                  <Zap className="w-3 h-3 text-yellow-500" />
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[9px] text-muted-foreground font-pixel uppercase mt-2 text-center">
          {t("globalBoss.rewardInfo")}
        </p>
      </PixelPanel>
    </div>
  );
}
