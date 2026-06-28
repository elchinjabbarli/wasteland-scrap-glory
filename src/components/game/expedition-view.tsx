"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { Loader2, MapPin, Clock, AlertTriangle, Package, Zap, Gem } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ZONES, type ZoneType } from "@/lib/game/expedition";

interface ActiveExpedition {
  id: string;
  zoneType: string;
  zoneLevel: number;
  riskPercent: number;
  startedAt: string;
  finishesAt: string;
  durationMinutes: number;
  status: string;
  remainingMs: number;
}

export function ExpeditionView() {
  const { player } = useGameStore();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [active, setActive] = useState<ActiveExpedition[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<null | { success: boolean; rewards?: { scrap: number; techPart: number; item?: { name: string } } }>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/expedition/active");
      const data = await res.json();
      setActive(data.expeditions ?? []);
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

  const refreshPlayer = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();
    if (meData.player) useGameStore.getState().setPlayer(meData.player);
    qc.invalidateQueries({ queryKey: ["inventory"] });
  }, [qc]);

  async function handleStart(zone: ZoneType) {
    setBusy(zone);
    try {
      const res = await fetch("/api/expedition/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneType: zone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: `${ZONES[zone].name[locale as "tr" | "en"]} başladı` });
        await load();
        await refreshPlayer();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleComplete(expeditionId: string) {
    setBusy(expeditionId);
    try {
      const res = await fetch("/api/expedition/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expeditionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        setResultModal({
          success: data.success,
          rewards: data.rewards,
        });
        await load();
        await refreshPlayer();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel(expeditionId: string) {
    if (!confirm(t("expedition.cancelConfirm"))) return;
    setBusy(expeditionId);
    try {
      const res = await fetch("/api/expedition/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expeditionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        toast({ title: "İptal edildi" });
        await load();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleSpeedUp(expeditionId: string, method: "AD" | "CRYSTAL") {
    setBusy(`${expeditionId}-${method}`);
    try {
      if (method === "AD") await new Promise((r) => setTimeout(r, 1500));
      const res = await fetch("/api/expedition/speedup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expeditionId, method }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: "Hızlandırıldı" });
        await load();
        await refreshPlayer();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  if (!player) return null;

  const zones = Object.values(ZONES);

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          {t("expedition.title")}
        </h2>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mt-1">
          {t("expedition.subtitle")}
        </p>
      </PixelPanel>

      {/* Aktif seferler */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs sm:text-sm font-bold text-accent uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {t("expedition.activeExpeditions")} (1)
        </h3>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground font-pixel uppercase text-xs">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            {t("common.loading")}
          </div>
        ) : active.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
            {t("expedition.noActive")}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {active.map((exp) => {
                const zone = ZONES[exp.zoneType as ZoneType] ?? ZONES.RADIATION_VALLEY;
                const ready = exp.remainingMs <= 0;
                const progress = ready ? 100 : Math.min(100, ((exp.durationMinutes * 60 * 1000 - exp.remainingMs) / (exp.durationMinutes * 60 * 1000)) * 100);
                const remainMin = Math.floor(exp.remainingMs / 60000);
                const remainSec = Math.floor((exp.remainingMs % 60000) / 1000);
                return (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="pixel-panel p-3"
                    style={{ borderColor: zone.color }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-pixel text-xs font-bold" style={{ color: zone.color }}>
                          {zone.name[locale as "tr" | "en"]}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-pixel uppercase">
                          {t("expedition.risk", { percent: exp.riskPercent })}
                        </span>
                      </div>
                      <span className={cn("text-xs font-pixel font-bold", ready ? "text-accent glow-text" : "text-muted-foreground")}>
                        {ready ? t("expedition.ready") : t("expedition.remaining", { min: remainMin, sec: remainSec })}
                      </span>
                    </div>
                    <div className="w-full bg-muted border border-border h-2 overflow-hidden mb-2">
                      <motion.div
                        className="h-full"
                        style={{ backgroundColor: ready ? "var(--accent)" : zone.color }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {ready ? (
                        <Button
                          onClick={() => handleComplete(exp.id)}
                          disabled={busy === exp.id}
                          className="pixel-button flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-9 text-xs"
                        >
                          {busy === exp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                          {t("expedition.collect")}
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleSpeedUp(exp.id, "AD")}
                            disabled={busy === `${exp.id}-AD`}
                            className="pixel-button flex-1 bg-card text-foreground border-2 border-border font-pixel uppercase h-9 text-[10px]"
                          >
                            {busy === `${exp.id}-AD` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            {t("expedition.speedupAd")}
                          </Button>
                          <Button
                            onClick={() => handleSpeedUp(exp.id, "CRYSTAL")}
                            disabled={busy === `${exp.id}-CRYSTAL" || (player?.crystal ?? 0) < 1`}
                            className="pixel-button flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-pixel uppercase h-9 text-[10px]"
                          >
                            <Gem className="w-3 h-3" />
                            {t("expedition.speedupCrystal")}
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => handleCancel(exp.id)}
                        disabled={busy === exp.id}
                        className="pixel-button bg-card text-destructive border-2 border-destructive font-pixel uppercase h-9 text-[10px] px-2"
                      >
                        {t("expedition.cancel")}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </PixelPanel>

      {/* Bölgeler */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs sm:text-sm font-bold text-accent uppercase tracking-wider mb-3">
          {t("expedition.zones")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {zones.map((zone) => {
            const locked = player.level < zone.minLevel;
            const Icon = (Icons[zone.icon as keyof typeof Icons] ?? Icons.MapPin) as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
            return (
              <div
                key={zone.code}
                className="pixel-panel p-3"
                style={{ borderColor: locked ? "var(--wasteland-border)" : zone.color, opacity: locked ? 0.6 : 1 }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div
                    className="w-10 h-10 flex items-center justify-center border-2 flex-shrink-0"
                    style={{ borderColor: zone.color, backgroundColor: `${zone.color}22` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: zone.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-pixel text-xs font-bold truncate" style={{ color: zone.color }}>
                      {zone.name[locale as "tr" | "en"]}
                    </div>
                    <div className="text-[9px] text-muted-foreground font-pixel uppercase">
                      {t("expedition.levelReq", { level: `${zone.minLevel}-${zone.maxLevel}` })}
                    </div>
                  </div>
                  {locked && (
                    <Icons.Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mb-2 leading-tight">
                  {zone.description[locale as "tr" | "en"]}
                </p>
                <div className="grid grid-cols-2 gap-1 text-[9px] font-pixel mb-2">
                  <div>
                    <span className="text-muted-foreground uppercase">{t("expedition.risk").split(":")[0]}:</span>{" "}
                    <span className="text-rust">{zone.riskPercent}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground uppercase">{t("expedition.duration").split(":")[0]}:</span>{" "}
                    <span className="text-accent">{zone.durationMinutes}dk</span>
                  </div>
                </div>
                <div className="text-[9px] text-muted-foreground font-pixel mb-2 italic">
                  ⚠ {zone.riskType[locale as "tr" | "en"]}
                </div>
                <Button
                  onClick={() => handleStart(zone.code)}
                  disabled={locked || busy === zone.code || active.length >= 1}
                  className="pixel-button w-full font-pixel uppercase h-9 text-xs"
                  style={{ backgroundColor: !locked && active.length < 1 ? zone.color : undefined, color: !locked && active.length < 1 ? "#000" : undefined }}
                >
                  {busy === zone.code ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : locked ? (
                    <>
                      <Icons.Lock className="w-3 h-3" />
                      {t("expedition.locked")}
                    </>
                  ) : active.length >= 1 ? (
                    t("expedition.slotFull")
                  ) : (
                    <MapPin className="w-3 h-3" />
                  )}
                  {!locked && active.length < 1 && t("expedition.start")}
                </Button>
              </div>
            );
          })}
        </div>
      </PixelPanel>

      {/* Sonuç modal */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setResultModal(null)}>
          <PixelPanel glow={resultModal.success ? "radiation" : "blood"} className="max-w-md w-full p-6 text-center" >
            <div className={cn("font-pixel text-2xl font-bold mb-4", resultModal.success ? "text-accent glow-text" : "text-destructive glow-text")}>
              {resultModal.success ? t("expedition.success") : t("expedition.failure")}
            </div>
            {resultModal.success && resultModal.rewards ? (
              <div className="space-y-2 text-sm font-pixel mb-4">
                <div className="text-rust">+{resultModal.rewards.scrap} Hurda</div>
                {resultModal.rewards.techPart > 0 && <div className="text-tech">+{resultModal.rewards.techPart} Tech-Part</div>}
                {resultModal.rewards.item && <div className="text-accent">🎁 {resultModal.rewards.item.name}</div>}
              </div>
            ) : (
              <div className="text-xs text-destructive font-pixel uppercase mb-4">
                {t("expedition.injuredUntil")}
              </div>
            )}
            <Button onClick={() => setResultModal(null)} className="pixel-button w-full bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-10">
              {t("common.close")}
            </Button>
          </PixelPanel>
        </div>
      )}
    </div>
  );
}
