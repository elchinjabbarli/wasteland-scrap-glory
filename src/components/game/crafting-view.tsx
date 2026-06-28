"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { RarityBadge } from "./rarity-badge";
import { CurrencyDisplay } from "./currency-display";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CRAFTING_RECIPES } from "@/lib/game/stats";
import { type Rarity, RARITIES } from "@/lib/game/constants";
import { Hammer, Clock, CheckCircle, XCircle, Loader2, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CraftingJob {
  id: string;
  recipeRarity: string;
  slot: string;
  startedAt: string;
  finishesAt: string;
  durationMinutes: number;
  successChance: number;
  status: string;
  remainingMs: number;
}

export function CraftingView() {
  const { player } = useGameStore();
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [jobs, setJobs] = useState<CraftingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [crafting, setCrafting] = useState<string | null>(null);
  const [collecting, setCollecting] = useState<string | null>(null);

  const refreshPlayer = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();
    if (meData.player) useGameStore.getState().setPlayer(meData.player);
    qc.invalidateQueries({ queryKey: ["inventory"] });
  }, [qc]);

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/crafting/jobs");
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 3000); // her 3sn refresh
    return () => clearInterval(interval);
  }, [loadJobs]);

  async function handleCraft(rarity: Rarity) {
    setCrafting(rarity);
    try {
      const res = await fetch("/api/crafting/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rarity }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        toast({ title: t("crafting.craftingStarted"), description: `${rarity} - ${t(`crafting.slot${data.job?.slot.charAt(0)}${data.job?.slot.slice(1).toLowerCase()}`)}` });
        await loadJobs();
        await refreshPlayer();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setCrafting(null);
    }
  }

  async function handleCollect(jobId: string) {
    setCollecting(jobId);
    try {
      const res = await fetch("/api/crafting/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else if (data.success) {
        toast({ title: "✓", description: t("crafting.craftSuccess", { name: data.item?.name }) });
        await loadJobs();
        await refreshPlayer();
      } else {
        toast({ title: "✗", description: t("crafting.craftFailed"), variant: "destructive" });
        await loadJobs();
        await refreshPlayer();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setCollecting(null);
    }
  }

  async function handleCancel(jobId: string) {
    if (!confirm("İptal et? %50 malzeme iade edilir.")) return;
    try {
      const res = await fetch("/api/crafting/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        toast({ title: "İptal edildi" });
        await loadJobs();
        await refreshPlayer();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    }
  }

  if (!player) return null;

  const rarities: Rarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text flex items-center gap-2">
              <Hammer className="w-5 h-5" />
              {t("crafting.title")}
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mt-1">
              {t("crafting.subtitle")}
            </p>
          </div>
          <CurrencyDisplay
            scrap={player.scrap}
            techPart={player.techPart}
            electronic={player.electronic}
            crystalDust={player.crystalDust}
            compact
          />
        </div>
        {jobs.length >= 3 && (
          <div className="mt-2 p-2 border border-yellow-500 bg-yellow-500/10 text-center">
            <p className="text-xs text-yellow-500 font-pixel uppercase">{t("crafting.jobLimit")}</p>
          </div>
        )}
      </PixelPanel>

      {/* Aktif işler */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs sm:text-sm font-bold text-accent uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {t("crafting.activeJobs")} ({jobs.length}/3)
        </h3>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground font-pixel uppercase text-xs">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            {t("common.loading")}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
            {t("crafting.noActiveJobs")}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {jobs.map((job) => {
                const ready = job.remainingMs <= 0;
                const progress = ready ? 100 : Math.min(100, ((job.durationMinutes * 60 * 1000 - job.remainingMs) / (job.durationMinutes * 60 * 1000)) * 100);
                const remainingSec = Math.ceil(job.remainingMs / 1000);
                const remainingMin = Math.floor(remainingSec / 60);
                const remainingSecRemainder = remainingSec % 60;
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="pixel-panel p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <RarityBadge rarity={job.recipeRarity} />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-pixel">
                          {t(`crafting.slot${job.slot.charAt(0)}${job.slot.slice(1).toLowerCase()}`)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-pixel">
                          {Math.round(job.successChance * 100)}%
                        </span>
                      </div>
                      <span className={cn("text-xs font-pixel font-bold", ready ? "text-accent glow-text" : "text-muted-foreground")}>
                        {ready ? t("crafting.ready") : `${remainingMin}:${String(remainingSecRemainder).padStart(2, "0")}`}
                      </span>
                    </div>
                    <div className="w-full bg-muted border border-border h-2 overflow-hidden mb-2">
                      <motion.div
                        className="h-full"
                        style={{ backgroundColor: ready ? "var(--accent)" : "var(--rust)" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleCollect(job.id)}
                        disabled={!ready || collecting === job.id}
                        className="pixel-button flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-9 text-xs"
                      >
                        {collecting === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                        {t("crafting.collect")}
                      </Button>
                      <Button
                        onClick={() => handleCancel(job.id)}
                        disabled={collecting === job.id}
                        className="pixel-button bg-card text-foreground border-2 border-border font-pixel uppercase h-9 text-xs"
                      >
                        {t("crafting.cancel")}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </PixelPanel>

      {/* Tarifler */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs sm:text-sm font-bold text-accent uppercase tracking-wider mb-3">
          {t("crafting.recipes")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {rarities.map((rarity) => {
            const recipe = CRAFTING_RECIPES[rarity];
            const rarInfo = RARITIES[rarity];
            const canCraft =
              player.scrap >= recipe.scrapCost &&
              player.electronic >= recipe.electronicCost &&
              player.techPart >= recipe.techPartCost &&
              player.crystalDust >= recipe.crystalDustCost;
            const durationLabel = recipe.durationMinutes >= 60
              ? t("crafting.durationHours", { hours: Math.floor(recipe.durationMinutes / 60) })
              : t("crafting.duration", { min: recipe.durationMinutes });

            return (
              <div
                key={rarity}
                className="pixel-panel p-3"
                style={{ borderColor: rarInfo.color }}
              >
                <div className="flex items-center justify-between mb-2">
                  <RarityBadge rarity={rarity} size="md" />
                  <span className="text-[10px] text-muted-foreground font-pixel uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {durationLabel}
                  </span>
                </div>
                <div className="space-y-1 text-[10px] font-pixel mb-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground uppercase">Hurda</span>
                    <span className={cn(player.scrap >= recipe.scrapCost ? "text-foreground" : "text-destructive")}>
                      {recipe.scrapCost}
                    </span>
                  </div>
                  {recipe.electronicCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground uppercase">Elektronik</span>
                      <span className={cn(player.electronic >= recipe.electronicCost ? "text-foreground" : "text-destructive")}>
                        {recipe.electronicCost}
                      </span>
                    </div>
                  )}
                  {recipe.techPartCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground uppercase">Tech-Part</span>
                      <span className={cn(player.techPart >= recipe.techPartCost ? "text-foreground" : "text-destructive")}>
                        {recipe.techPartCost}
                      </span>
                    </div>
                  )}
                  {recipe.crystalDustCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground uppercase">Kristal Tozu</span>
                      <span className={cn(player.crystalDust >= recipe.crystalDustCost ? "text-foreground" : "text-destructive")}>
                        {recipe.crystalDustCost}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-border">
                    <span className="text-muted-foreground uppercase">{t("crafting.successRate").replace(": {chance}%", "")}</span>
                    <span className="text-accent font-bold">{Math.round(recipe.successChance * 100)}%</span>
                  </div>
                </div>
                <Button
                  onClick={() => handleCraft(rarity)}
                  disabled={!canCraft || crafting === rarity || jobs.length >= 3}
                  className="pixel-button w-full font-pixel uppercase h-9 text-xs"
                  style={{
                    backgroundColor: canCraft ? rarInfo.color : undefined,
                    color: canCraft ? "#000" : undefined,
                  }}
                >
                  {crafting === rarity ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : canCraft ? (
                    <Hammer className="w-3 h-3" />
                  ) : null}
                  {canCraft ? t("crafting.startCrafting") : t("crafting.cannotCraft")}
                </Button>
              </div>
            );
          })}
        </div>
      </PixelPanel>
    </div>
  );
}
