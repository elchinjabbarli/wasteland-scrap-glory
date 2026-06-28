"use client";

import { useState, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { Loader2, Plus } from "lucide-react";
import { STAT_INFO, STAT_KEYS, type StatKey } from "@/lib/game/prestige";
import { maxHp, critChance, evasionChance, attackSpeedMultiplier } from "@/lib/game/stats";
import { motion } from "framer-motion";

export function StatAllocationView() {
  const { player, setView } = useGameStore();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<StatKey | null>(null);

  const refreshPlayer = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();
    if (meData.player) useGameStore.getState().setPlayer(meData.player);
    qc.invalidateQueries({ queryKey: ["inventory"] });
  }, [qc]);

  async function handleAllocate(stat: StatKey) {
    if (!player || player.statPoints <= 0) return;
    setBusy(stat);
    try {
      const res = await fetch("/api/player/allocate-stat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stat, points: 1 }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: t("stats.allocated", { stat: STAT_INFO[stat].name[locale as "tr" | "en"], value: data.newStatValue }) });
        await refreshPlayer();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  if (!player) return null;

  // Türetilmiş stat'lar
  const derivedMaxHp = maxHp(player.end);
  const derivedCrit = critChance(player.lck);
  const derivedEvasion = evasionChance(player.agi);
  const derivedAtkSpeed = attackSpeedMultiplier(player.agi);

  return (
    <div className="p-3 sm:p-4 max-w-2xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4 text-center">
        <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text mb-1">
          {t("stats.title")}
        </h2>
        <div className="mt-2 inline-block px-3 py-1 border-2 border-accent bg-accent/10">
          <span className="font-pixel text-sm font-bold text-accent">
            {t("stats.available", { n: player.statPoints })}
          </span>
        </div>
      </PixelPanel>

      {/* 6 Stat kartı */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {STAT_KEYS.map((key) => {
          const info = STAT_INFO[key];
          const Icon = (Icons[info.icon as keyof typeof Icons] ?? Icons.Circle) as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
          const value = player[key];
          const canAllocate = player.statPoints > 0 && !busy;
          return (
            <motion.div
              key={key}
              whileHover={canAllocate ? { scale: 1.02 } : {}}
              className="pixel-panel p-3 flex flex-col items-center text-center"
              style={{ borderColor: info.color }}
            >
              <div
                className="w-10 h-10 flex items-center justify-center border-2 mb-2"
                style={{ borderColor: info.color, backgroundColor: `${info.color}22` }}
              >
                <Icon className="w-5 h-5" style={{ color: info.color }} />
              </div>
              <div className="font-pixel text-xs font-bold uppercase tracking-wider" style={{ color: info.color }}>
                {info.name[locale as "tr" | "en"]}
              </div>
              <div className="font-pixel text-2xl font-bold my-1" style={{ color: info.color }}>
                {value}
              </div>
              <div className="text-[9px] text-muted-foreground font-pixel mb-2 leading-tight">
                {info.desc[locale as "tr" | "en"]}
              </div>
              <Button
                onClick={() => handleAllocate(key)}
                disabled={!canAllocate}
                className="pixel-button w-full font-pixel uppercase h-8 text-xs"
                style={{
                  backgroundColor: canAllocate ? info.color : undefined,
                  color: canAllocate ? "#000" : undefined,
                }}
              >
                {busy === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                {t("stats.allocate")}
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Türetilmiş stat'lar */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs font-bold text-accent uppercase tracking-wider mb-3">
          {t("stats.derivedStats")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <DerivedStat label={t("profile.maxHp")} value={derivedMaxHp} color="var(--accent)" />
          <DerivedStat label={t("profile.critChance")} value={`${(derivedCrit * 100).toFixed(1)}%`} color="var(--rust)" />
          <DerivedStat label={t("profile.evasionChance")} value={`${(derivedEvasion * 100).toFixed(1)}%`} color="var(--tech)" />
          <DerivedStat label={t("profile.attackSpeed")} value={`${derivedAtkSpeed.toFixed(2)}x`} color="#a855f7" />
        </div>
      </PixelPanel>

      {player.statPoints === 0 && (
        <div className="text-center p-3 border border-border bg-card/50">
          <p className="text-xs text-muted-foreground font-pixel uppercase">{t("stats.noPoints")}</p>
          <p className="text-[10px] text-muted-foreground/60 font-pixel mt-1">
            Seviye atladıkça 1 point kazanırsın. Sv 100'de prestij yapabilirsin.
          </p>
          <Button
            onClick={() => setView("battle")}
            className="pixel-button mt-2 bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-9 text-xs"
          >
            Savaşa Git
          </Button>
        </div>
      )}
    </div>
  );
}

function DerivedStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="p-2 border border-border bg-card/50">
      <div className="font-pixel text-base sm:text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
