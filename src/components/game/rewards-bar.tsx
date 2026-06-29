"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/request";
import { useGameStore } from "@/store/game-store";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Gift, Tv, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RewardsStatus {
  dailyChest: { canClaim: boolean; nextClaimAt: string | null; lastClaimAt?: string };
  adWatch: { remaining: number; resetAt: string | null };
  constants: { dailyChestCooldownHours: number; maxDailyAdWatches: number };
}

export function RewardsBar() {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState<RewardsStatus | null>(null);
  const [claimingChest, setClaimingChest] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/rewards/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000); // her dk refresh
    return () => clearInterval(interval);
  }, [load]);

  async function handleClaimChest(withAd: boolean = false) {
    setClaimingChest(true);
    try {
      if (withAd) {
        // Mock reklam: 1.5s bekle
        await new Promise((r) => setTimeout(r, 1500));
      }
      const res = await fetch("/api/rewards/daily-chest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withAd }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        const r = data.rewards;
        const doubledText = r.doubled ? " ⚡ 2x!" : "";
        toast({
          title: "🎁 " + t("rewards.dailyChest") + doubledText,
          description: `+${r.scrap} Hurda${r.electronic > 0 ? ` +${r.electronic} Elektronik` : ""}${r.techPart > 0 ? ` +${r.techPart} Tech-Part` : ""}${r.crystal > 0 ? ` +${r.crystal} Kristal` : ""}`,
        });
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (meData.player) useGameStore.getState().setPlayer(meData.player);
        qc.invalidateQueries({ queryKey: ["inventory"] });
        await load();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setClaimingChest(false);
    }
  }

  async function handleWatchAd() {
    setWatchingAd(true);
    try {
      // Mock reklam: 1.5s bekle
      await new Promise((r) => setTimeout(r, 1500));
      const res = await fetch("/api/rewards/ad-watch", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        const r = data.rewards;
        toast({
          title: "📺 " + t("rewards.adWatch"),
          description: t("rewards.adReward", { scrap: r.scrap, crystal: r.crystal > 0 ? ` +${r.crystal} Kristal` : "" }),
        });
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (meData.player) useGameStore.getState().setPlayer(meData.player);
        await load();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setWatchingAd(false);
    }
  }

  if (!status) return null;

  const chestHours = status.dailyChest.nextClaimAt
    ? Math.max(0, Math.ceil((new Date(status.dailyChest.nextClaimAt).getTime() - Date.now()) / (60 * 60 * 1000)))
    : 0;

  return (
    <div className="px-3 sm:px-4 max-w-4xl mx-auto pb-2">
      <div className={`grid ${status.dailyChest.canClaim ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
        {/* Günlük Sandık — Normal */}
        <Button
          onClick={() => handleClaimChest(false)}
          disabled={!status.dailyChest.canClaim || claimingChest}
          className={cn(
            "pixel-button h-12 font-pixel uppercase tracking-wider text-[10px]",
            status.dailyChest.canClaim
              ? "bg-accent text-accent-foreground hover:bg-accent/90"
              : "bg-card text-muted-foreground border-2 border-border"
          )}
        >
          {claimingChest ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Gift className="w-3 h-3" />
          )}
          {status.dailyChest.canClaim
            ? t("rewards.claimChest")
            : t("rewards.chestCooldown", { hours: chestHours })}
        </Button>

        {/* Günlük Sandık — Reklam 2x (GDD 13.1) */}
        {status.dailyChest.canClaim && (
          <Button
            onClick={() => handleClaimChest(true)}
            disabled={claimingChest}
            className="pixel-button h-12 font-pixel uppercase tracking-wider text-[10px] bg-yellow-500/20 text-yellow-500 border-2 border-yellow-500 hover:bg-yellow-500/30"
          >
            {claimingChest ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tv className="w-3 h-3" />}
            2x Reklam
          </Button>
        )}

        {/* Reklam İzle */}
        <Button
          onClick={handleWatchAd}
          disabled={status.adWatch.remaining === 0 || watchingAd}
          className={cn(
            "pixel-button h-12 font-pixel uppercase tracking-wider text-[10px]",
            status.adWatch.remaining > 0
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-card text-muted-foreground border-2 border-border"
          )}
        >
          {watchingAd ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Tv className="w-3 h-3" />
          )}
          {status.adWatch.remaining > 0
            ? t("rewards.watchAd", { n: status.adWatch.remaining })
            : t("rewards.noAdsLeft")}
        </Button>
      </div>
    </div>
  );
}
