"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore, type ItemData } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { ItemCard } from "./item-card";
import { CurrencyDisplay } from "./currency-display";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getUpgradePreview, type UpgradePreview, getRepairCost, type RepairCost } from "@/lib/game/upgrade";
import { ArrowUp, Wrench, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Tab = "upgrade" | "repair";

export function UpgradeView() {
  const { player } = useGameStore();
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("upgrade");
  const [items, setItems] = useState<ItemData[]>([]);
  const [selected, setSelected] = useState<ItemData | null>(null);
  const [preview, setPreview] = useState<UpgradePreview | null>(null);
  const [repairCost, setRepairCost] = useState<RepairCost | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refreshPlayer = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();
    if (meData.player) useGameStore.getState().setPlayer(meData.player);
    qc.invalidateQueries({ queryKey: ["inventory"] });
  }, [qc]);

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      const all: ItemData[] = (data.items ?? []).map((it: ItemData & { slot?: string }) => ({
        ...it,
        slot: it.slot ?? guessSlot(it),
      }));
      // Upgrade için: kırık olmayan, IN_INVENTORY olan, max level altındaki
      const upgradable = all.filter((it) => it.state === "IN_INVENTORY" && it.durability > 0 && it.upgradeLevel < 10);
      const repairable = all.filter((it) => it.durability < 100);
      setItems(tab === "upgrade" ? upgradable : repairable);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadItems();
    setSelected(null);
    setPreview(null);
    setRepairCost(null);
  }, [loadItems, tab]);

  useEffect(() => {
    if (!selected) {
      setPreview(null);
      setRepairCost(null);
      return;
    }
    if (tab === "upgrade") {
      setPreview(getUpgradePreview({
        upgradeLevel: selected.upgradeLevel,
        baseDamage: selected.baseDamage,
        baseArmor: selected.baseArmor,
        baseHpBonus: selected.baseHpBonus,
        companionHp: selected.companionHp,
        companionDamage: selected.companionDamage,
      }));
      setRepairCost(null);
    } else {
      setRepairCost(getRepairCost(selected.durability));
      setPreview(null);
    }
  }, [selected, tab]);

  async function handleUpgrade() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/upgrade/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else if (data.success) {
        toast({ title: "✓", description: t("upgrade.upgradeSuccess", { level: data.newUpgradeLevel }) });
        await refreshPlayer();
        await loadItems();
        setSelected(null);
      } else if (data.broken) {
        toast({ title: "✗", description: t("upgrade.itemBroken"), variant: "destructive" });
        await refreshPlayer();
        await loadItems();
        setSelected(null);
      } else {
        toast({ title: "✗", description: t("upgrade.upgradeFailed"), variant: "destructive" });
        await refreshPlayer();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleRepair() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/upgrade/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: t("upgrade.repairSuccess") });
        await refreshPlayer();
        await loadItems();
        setSelected(null);
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  if (!player) return null;

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {t("upgrade.title")}
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mt-1">
              {t("upgrade.subtitle")}
            </p>
          </div>
          <CurrencyDisplay
            scrap={player.scrap}
            techPart={player.techPart}
            electronic={player.electronic}
            compact
          />
        </div>

        {/* Tablar */}
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => setTab("upgrade")}
            className={cn(
              "pixel-button flex-1 px-3 py-2 text-xs font-pixel uppercase tracking-wider border-2",
              tab === "upgrade" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
            )}
          >
            <ArrowUp className="w-3 h-3 inline mr-1" />
            {t("upgrade.upgradeTab")}
          </button>
          <button
            onClick={() => setTab("repair")}
            className={cn(
              "pixel-button flex-1 px-3 py-2 text-xs font-pixel uppercase tracking-wider border-2",
              tab === "repair" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
            )}
          >
            <Wrench className="w-3 h-3 inline mr-1" />
            {t("upgrade.repairTab")}
          </button>
        </div>
      </PixelPanel>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Eşya listesi */}
        <PixelPanel className="p-3">
          <h3 className="font-pixel text-xs font-bold text-accent uppercase tracking-wider mb-2">
            {t("upgrade.selectItem")}
          </h3>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground font-pixel uppercase text-xs">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              {t("common.loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
              {t("upgrade.noItems")}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
              {items.map((it) => (
                <ItemCard
                  key={it.id}
                  item={it}
                  compact
                  onClick={() => setSelected(it)}
                  className={cn(selected?.id === it.id && "border-primary")}
                />
              ))}
            </div>
          )}
        </PixelPanel>

        {/* Önizleme & işlem */}
        <PixelPanel glow={selected ? "rust" : "none"} className="p-3">
          {!selected ? (
            <div className="text-center py-12 text-muted-foreground font-pixel uppercase text-xs">
              {t("upgrade.selectItem")}
            </div>
          ) : tab === "upgrade" && preview ? (
            <div className="space-y-3">
              <div>
                <h4 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{t("upgrade.currentStats")} (+{preview.current.upgradeLevel})</h4>
                <StatCompare stats={preview.current} />
              </div>
              <div className="text-center text-rust font-pixel text-lg">↓</div>
              <div>
                <h4 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{t("upgrade.nextStats")} (+{preview.next.upgradeLevel})</h4>
                <StatCompare stats={preview.next} highlight />
              </div>

              <div className="border-t border-border pt-2 space-y-1 text-[10px] font-pixel">
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase">{t("upgrade.upgradeCost")}:</span>
                  <span className="text-rust">{preview.cost.scrap} H · {preview.cost.electronic} E · {preview.cost.techPart} T</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase">{t("upgrade.successChance")}:</span>
                  <span className="text-accent">{Math.round(preview.successChance * 100)}%</span>
                </div>
                {preview.breakChance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-destructive uppercase">{t("upgrade.breakChance")}:</span>
                    <span className="text-destructive">{Math.round(preview.breakChance * 100)}%</span>
                  </div>
                )}
              </div>

              {preview.breakChance > 0 && (
                <div className="flex items-start gap-2 p-2 border border-yellow-500 bg-yellow-500/10">
                  <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-yellow-500 font-pixel uppercase">{t("upgrade.warningHighLevel")}</p>
                </div>
              )}

              <Button
                onClick={handleUpgrade}
                disabled={busy || player.scrap < preview.cost.scrap || player.electronic < preview.cost.electronic || player.techPart < preview.cost.techPart}
                className="pixel-button w-full bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-11"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                {t("upgrade.doUpgrade")}
              </Button>
            </div>
          ) : tab === "repair" && repairCost ? (
            <div className="space-y-3">
              <div>
                <h4 className="font-pixel text-xs font-bold text-accent uppercase mb-2">Seçili Eşya</h4>
                <ItemCard item={selected} compact />
              </div>
              <div className="border-t border-border pt-2 space-y-1 text-[10px] font-pixel">
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase">{t("inventory.durability")}:</span>
                  <span className={selected.durability < 25 ? "text-destructive" : "text-yellow-500"}>
                    {selected.durability}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase">{t("upgrade.repairCost")}:</span>
                  <span className="text-tech">{repairCost.techPart} Tech-Part</span>
                </div>
              </div>
              <Button
                onClick={handleRepair}
                disabled={busy || player.techPart < repairCost.techPart}
                className="pixel-button w-full bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-11"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                {t("upgrade.doRepair")}
              </Button>
            </div>
          ) : null}
        </PixelPanel>
      </div>
    </div>
  );
}

function StatCompare({ stats, highlight }: { stats: { damage: number; armor: number; hpBonus: number; companionHp: number; companionDamage: number }, highlight?: boolean }) {
  return (
    <div className="space-y-1 text-[10px] font-pixel">
      {stats.damage > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground uppercase">Hasar</span>
          <span className={highlight ? "text-accent glow-text" : "text-foreground"}>{stats.damage}</span>
        </div>
      )}
      {stats.armor > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground uppercase">Zırh</span>
          <span className={highlight ? "text-accent glow-text" : "text-foreground"}>{stats.armor}</span>
        </div>
      )}
      {stats.hpBonus > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground uppercase">HP</span>
          <span className={highlight ? "text-accent glow-text" : "text-foreground"}>+{stats.hpBonus}</span>
        </div>
      )}
      {stats.companionHp > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground uppercase">Yoldaş HP</span>
          <span className={highlight ? "text-accent glow-text" : "text-foreground"}>{stats.companionHp}</span>
        </div>
      )}
      {stats.companionDamage > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground uppercase">Yoldaş Hasar</span>
          <span className={highlight ? "text-accent glow-text" : "text-foreground"}>{stats.companionDamage}</span>
        </div>
      )}
    </div>
  );
}

function guessSlot(item: ItemData): string {
  if (item.baseDamage > 0) return "WEAPON";
  if (item.baseArmor > 0 || item.baseHpBonus > 0) return "ARMOR";
  if (item.effectType && item.companionHp === 0) return "SIDE_TOOL";
  if (item.companionHp > 0 || item.companionDamage > 0) return "COMPANION";
  return "WEAPON";
}
