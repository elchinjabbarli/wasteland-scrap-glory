"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Swords, Skull, Trophy, Clock, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { RAID_BOSSES } from "@/lib/game/raid";

interface ActiveRaid {
  id: string;
  bossName: string;
  bossCode: string;
  maxHp: number;
  currentHp: number;
  expiresAt: string;
  remainingMs: number;
  progress: number;
}

interface RaidDetail {
  id: string;
  bossCode: string;
  bossName: string;
  maxHp: number;
  currentHp: number;
  status: string;
  remainingMs: number;
  topContributors: { rank: number; name: string; faction: string; level: number; damage: number; attacks: number }[];
}

export function RaidView() {
  const { player } = useGameStore();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [activeRaids, setActiveRaids] = useState<ActiveRaid[]>([]);
  const [selectedRaid, setSelectedRaid] = useState<RaidDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [attacking, setAttacking] = useState(false);
  const [lastDamage, setLastDamage] = useState<number | null>(null);

  const loadActive = useCallback(async () => {
    try {
      const res = await fetch("/api/raid/active");
      const data = await res.json();
      setActiveRaids(data.raids ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRaidDetail = useCallback(async (raidId: string) => {
    try {
      const res = await fetch(`/api/raid/${raidId}`);
      const data = await res.json();
      setSelectedRaid(data.raid);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadActive();
    const interval = setInterval(loadActive, 5000);
    return () => clearInterval(interval);
  }, [loadActive]);

  useEffect(() => {
    if (selectedRaid) {
      const interval = setInterval(() => loadRaidDetail(selectedRaid.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedRaid, loadRaidDetail]);

  async function handleStart(bossCode: string) {
    setAttacking(true);
    try {
      const res = await fetch("/api/raid/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bossCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: `${data.raid.bossName} başlatıldı!` });
        await loadActive();
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setAttacking(false);
    }
  }

  async function handleAttack(raidId: string) {
    setAttacking(true);
    setLastDamage(null);
    try {
      const res = await fetch("/api/raid/attack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raidId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        setLastDamage(data.damage);
        if (data.defeated) {
          toast({ title: "🏆 BOSS YENİLDİ!", description: `Toplam hasarın: ${data.damage}` });
        } else if (data.reward?.item) {
          toast({ title: "🎁 TOP 3 ÖDÜL!", description: `${data.reward.item.name} kazandın!` });
        }
        await loadRaidDetail(raidId);
        await loadActive();
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setAttacking(false);
    }
  }

  if (!player) return null;

  const bossDefs = Object.values(RAID_BOSSES);

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">
      <PixelPanel glow="blood" className="p-3 sm:p-4">
        <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text flex items-center gap-2">
          <Skull className="w-5 h-5" />
          {t("raid.title")}
        </h2>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mt-1">
          {t("raid.subtitle")}
        </p>
        {!player.clanId && (
          <div className="mt-2 p-2 border border-yellow-500 bg-yellow-500/10 text-center">
            <p className="text-xs text-yellow-500 font-pixel uppercase">{t("raid.noClan")}</p>
          </div>
        )}
      </PixelPanel>

      {/* Aktif raid'ler */}
      <PixelPanel className="p-3">
        <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2 flex items-center gap-2">
          <Swords className="w-4 h-4" />
          {t("raid.active")} ({activeRaids.length})
        </h3>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground font-pixel uppercase text-xs">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            {t("common.loading")}
          </div>
        ) : activeRaids.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
            {t("raid.noActive")}
          </div>
        ) : (
          <div className="space-y-2">
            {activeRaids.map((r) => {
              const remainMin = Math.floor(r.remainingMs / 60000);
              const remainSec = Math.floor((r.remainingMs % 60000) / 1000);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pixel-panel p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-pixel text-sm font-bold text-rust">{r.bossName}</span>
                    <span className="text-[10px] text-muted-foreground font-pixel flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {remainMin}dk {remainSec}sn
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] font-pixel mb-1">
                    <span className="text-muted-foreground">HP</span>
                    <span className="text-rust">{r.currentHp.toLocaleString()} / {r.maxHp.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-muted border border-border h-3 overflow-hidden mb-2">
                    <motion.div
                      className="h-full bg-gradient-to-r from-rust to-destructive"
                      animate={{ width: `${r.progress}%` }}
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => setSelectedRaid({ id: r.id, bossCode: r.bossCode, bossName: r.bossName, maxHp: r.maxHp, currentHp: r.currentHp, status: "ACTIVE", remainingMs: r.remainingMs, topContributors: [] })}
                      className="pixel-button flex-1 bg-card text-foreground border-2 border-border font-pixel uppercase h-9 text-[10px]"
                    >
                      {t("raid.details")}
                    </Button>
                    <Button
                      onClick={() => handleAttack(r.id)}
                      disabled={attacking}
                      className="pixel-button flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-9 text-[10px]"
                    >
                      {attacking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Swords className="w-3 h-3" />}
                      {t("raid.attack")}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </PixelPanel>

      {/* Boss seçimi (raid başlat) */}
      {player.clanId && activeRaids.length === 0 && (
        <PixelPanel className="p-3">
          <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{t("raid.startNew")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {bossDefs.map((boss) => (
              <div key={boss.code} className="pixel-panel p-3" style={{ borderColor: boss.color }}>
                <div className="flex items-center gap-2 mb-2">
                  <Skull className="w-4 h-4" style={{ color: boss.color }} />
                  <span className="font-pixel text-xs font-bold" style={{ color: boss.color }}>{boss.name}</span>
                </div>
                <p className="text-[9px] text-muted-foreground mb-2 leading-tight">
                  {boss.description[locale as "tr" | "en"]}
                </p>
                <div className="text-[9px] text-muted-foreground font-pixel uppercase mb-2">
                  HP × {boss.hpMultiplier} · Klan Sv {boss.minClanLevel}+
                </div>
                <Button
                  onClick={() => handleStart(boss.code)}
                  disabled={attacking}
                  className="pixel-button w-full font-pixel uppercase h-8 text-[10px]"
                  style={{ backgroundColor: boss.color, color: "#000" }}
                >
                  <Swords className="w-3 h-3" />
                  {t("raid.start")}
                </Button>
              </div>
            ))}
          </div>
        </PixelPanel>
      )}

      {/* Raid detay modal */}
      {selectedRaid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedRaid(null)}>
          <PixelPanel glow="blood" className="max-w-md w-full p-4 max-h-[80vh] overflow-y-auto" >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-pixel text-sm font-bold text-rust">{selectedRaid.bossName}</h3>
              <button onClick={() => setSelectedRaid(null)} className="text-muted-foreground hover:text-foreground font-pixel">✕</button>
            </div>
            <div className="text-center mb-3">
              <div className="font-pixel text-2xl font-bold text-rust">
                {selectedRaid.currentHp.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground font-pixel uppercase">/ {selectedRaid.maxHp.toLocaleString()} HP</div>
              <div className="w-full bg-muted border border-border h-2 overflow-hidden mt-2">
                <div className="h-full bg-rust" style={{ width: `${((selectedRaid.maxHp - selectedRaid.currentHp) / selectedRaid.maxHp) * 100}%` }} />
              </div>
            </div>
            <Button
              onClick={() => handleAttack(selectedRaid.id)}
              disabled={attacking || selectedRaid.status !== "ACTIVE"}
              className="pixel-button w-full bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-11 mb-3"
            >
              {attacking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
              {t("raid.attack")}
            </Button>
            {lastDamage !== null && (
              <div className="text-center mb-3 p-2 border border-accent bg-accent/10">
                <div className="font-pixel text-lg font-bold text-accent">-{lastDamage} hasar!</div>
              </div>
            )}
            <h4 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{t("raid.topContributors")}</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
              {selectedRaid.topContributors.length === 0 ? (
                <div className="text-center text-muted-foreground font-pixel uppercase text-[10px] py-4">
                  Henüz katkı yok
                </div>
              ) : (
                selectedRaid.topContributors.map((c) => (
                  <div key={c.rank} className="flex items-center gap-2 p-1.5 border border-border bg-card/30 text-[10px] font-pixel">
                    <span className={cn("w-5 text-center font-bold", c.rank === 1 ? "text-yellow-400" : c.rank === 2 ? "text-gray-300" : c.rank === 3 ? "text-orange-400" : "text-muted-foreground")}>
                      #{c.rank}
                    </span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-rust">{c.damage.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </PixelPanel>
        </div>
      )}
    </div>
  );
}
