"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skull, Sparkles, TrendingUp, AlertTriangle, Loader2, Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MAX_LEVEL } from "@/lib/game/constants";

interface PrestigeEligibility {
  canPrestige: boolean;
  reason?: string;
  currentPrestige: number;
  bonusMultiplier: number;
  nextBonusMultiplier: number;
}

export function PrestigeView() {
  const { player } = useGameStore();
  const { t } = useI18n();
  const { toast } = useToast();

  const [eligibility, setEligibility] = useState<PrestigeEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [prestiging, setPrestiging] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/prestige/check");
      const data = await res.json();
      setEligibility(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handlePrestige() {
    setConfirmOpen(false);
    setPrestiging(true);
    try {
      const res = await fetch("/api/prestige/perform", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        toast({
          title: "⭐ " + t("prestige.prestigeSuccess", { level: data.newPrestige, bonus: Math.round((data.bonusMultiplier - 1) * 100) }),
          description: t("prestige.itemsLost", { n: data.itemsLost }),
        });
        // Player refresh
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (meData.player) useGameStore.getState().setPlayer(meData.player);
        await load();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setPrestiging(false);
    }
  }

  if (!player || loading || !eligibility) {
    return (
      <div className="p-4 text-center text-muted-foreground font-pixel uppercase text-xs">
        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
        {t("common.loading")}
      </div>
    );
  }

  const currentBonusPct = Math.round((eligibility.bonusMultiplier - 1) * 100);
  const nextBonusPct = Math.round((eligibility.nextBonusMultiplier - 1) * 100);

  return (
    <div className="p-3 sm:p-4 max-w-2xl mx-auto space-y-3">
      <PixelPanel glow={eligibility.canPrestige ? "radiation" : "rust"} className="p-4 sm:p-6 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex justify-center mb-3"
        >
          <div className="w-20 h-20 flex items-center justify-center border-4 border-rust bg-card" style={{ boxShadow: "0 0 30px var(--rust)" }}>
            <Skull className="w-10 h-10 text-rust" />
          </div>
        </motion.div>
        <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text mb-1">
          {t("prestige.title")}
        </h2>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider">
          {t("prestige.subtitle")}
        </p>
      </PixelPanel>

      {/* Mevcut prestij */}
      <PixelPanel className="p-3 sm:p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="font-pixel text-2xl font-bold text-rust glow-text">{eligibility.currentPrestige}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-pixel mt-1">{t("prestige.currentPrestige")}</div>
          </div>
          <div>
            <div className="font-pixel text-2xl font-bold text-accent glow-text">+{currentBonusPct}%</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-pixel mt-1">{t("prestige.currentBonus")}</div>
          </div>
          <div>
            <div className="font-pixel text-2xl font-bold text-accent glow-text">+{nextBonusPct}%</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-pixel mt-1">{t("prestige.nextBonus")}</div>
          </div>
        </div>
      </PixelPanel>

      {/* Durum */}
      <PixelPanel glow={eligibility.canPrestige ? "radiation" : "none"} className="p-3 sm:p-4">
        {eligibility.canPrestige ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Star className="w-5 h-5 text-accent glow-text" />
              <span className="font-pixel text-sm font-bold text-accent uppercase">{t("prestige.canPrestige")}</span>
            </div>
          </div>
        ) : (
          <div className="text-center p-3 border border-yellow-500 bg-yellow-500/10">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-xs text-yellow-500 font-pixel uppercase">
              {t("prestige.cannotPrestige", { level: player.level })}
            </p>
            <div className="mt-2">
              <div className="w-full bg-muted border border-border h-2 overflow-hidden">
                <div className="h-full bg-rust" style={{ width: `${Math.min(100, (player.level / MAX_LEVEL) * 100)}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground font-pixel mt-1">
                {player.level} / {MAX_LEVEL}
              </div>
            </div>
          </div>
        )}
      </PixelPanel>

      {/* Kayıp & Kazanç */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PixelPanel className="p-3 border-destructive">
          <h3 className="font-pixel text-xs font-bold text-destructive uppercase mb-2 flex items-center gap-1">
            <Skull className="w-3 h-3" />
            {t("prestige.youWillLose")}
          </h3>
          <ul className="space-y-1 text-[10px] font-pixel text-muted-foreground">
            <li className="flex items-start gap-1"><span className="text-destructive">✗</span> {t("prestige.loseCommonRare")}</li>
            <li className="flex items-start gap-1"><span className="text-destructive">✗</span> {t("prestige.loseScrapElectronic")}</li>
            <li className="flex items-start gap-1"><span className="text-destructive">✗</span> {t("prestige.loseLevel")}</li>
          </ul>
        </PixelPanel>
        <PixelPanel className="p-3 border-accent">
          <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {t("prestige.youWillGain")}
          </h3>
          <ul className="space-y-1 text-[10px] font-pixel text-muted-foreground">
            <li className="flex items-start gap-1"><span className="text-accent">✓</span> {t("prestige.gainBonus", { bonus: nextBonusPct })}</li>
            <li className="flex items-start gap-1"><span className="text-accent">✓</span> {t("prestige.gainBadge")}</li>
            <li className="flex items-start gap-1"><span className="text-accent">✓</span> Tech-Part & Crystal korunur</li>
          </ul>
        </PixelPanel>
      </div>

      {/* Buton */}
      <Button
        onClick={() => setConfirmOpen(true)}
        disabled={!eligibility.canPrestige || prestiging}
        className={cn(
          "pixel-button w-full font-pixel uppercase tracking-wider h-14 text-sm sm:text-base",
          eligibility.canPrestige
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-card text-muted-foreground border-2 border-border"
        )}
      >
        {prestiging ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        {t("prestige.prestigeButton")}
      </Button>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-wasteland-panel border-2 border-wasteland-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixel text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {t("prestige.confirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs font-pixel text-muted-foreground">
              {t("prestige.confirmDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 flex-row">
            <Button
              onClick={() => setConfirmOpen(false)}
              className="pixel-button flex-1 bg-card text-foreground border-2 border-border font-pixel uppercase h-10"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handlePrestige}
              className="pixel-button flex-1 bg-destructive text-white hover:bg-destructive/90 font-pixel uppercase h-10"
            >
              {t("prestige.confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
