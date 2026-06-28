"use client";

import { useState, useEffect } from "react";
import { useGameStore, type ItemData } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { ItemCard } from "./item-card";
import { CurrencyDisplay } from "./currency-display";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { SLOT_INFO, type Slot } from "@/lib/game/constants";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type FilterKey = "ALL" | Slot;

export function InventoryView() {
  const { t } = useI18n();
  const { player } = useGameStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory");
      return res.json();
    },
  });

  async function refresh() {
    await refetch();
    qc.invalidateQueries({ queryKey: ["player"] });
    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();
    if (meData.player) useGameStore.getState().setPlayer(meData.player);
  }

  const items: ItemData[] = (data?.items ?? []).map((it: ItemData & { slot?: string }) => {
    // Slot bilgisini template'den almak için API zaten veriyor ama eski item'larda olmayabilir
    return it;
  });

  // Her item için slot bilgisini template'den çıkarmalıyız; API'nin vermediğini varsayalım
  // Aslında API template'den slot vermiyor. ItemCard'ta item.slot var. Backend'de ekleyelim.
  // Şimdilik varsayılan: WEAPON (frontend'de göstermek için)
  const itemsWithSlot = items.map((it) => ({
    ...it,
    slot: it.slot ?? guessSlot(it),
  }));

  const equippedIds = new Set<string>();
  if (player?.loadout) {
    const l = player.loadout;
    ["weapon", "armor", "sideTool", "companion"].forEach((k) => {
      const item = (l as Record<string, { id?: string } | null>)[k];
      if (item?.id) equippedIds.add(item.id);
    });
  }

  const filtered = filter === "ALL" ? itemsWithSlot : itemsWithSlot.filter((it) => it.slot === filter);

  const filters: { key: FilterKey; label: string }[] = [
    { key: "ALL", label: t("inventory.filterAll") },
    { key: "WEAPON", label: t("inventory.filterWeapon") },
    { key: "ARMOR", label: t("inventory.filterArmor") },
    { key: "SIDE_TOOL", label: t("inventory.filterSideTool") },
    { key: "COMPANION", label: t("inventory.filterCompanion") },
  ];

  async function handleEquip(item: ItemData) {
    setActionLoading(true);
    try {
      const res = await fetch("/api/inventory/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({ title: "✓", description: `${item.name} kuşanıldı` });
      setSelectedItem(null);
      await refresh();
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnequip(slot: Slot) {
    setActionLoading(true);
    try {
      const res = await fetch("/api/inventory/unequip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({ title: "✓", description: "Eşya çıkarıldı" });
      setSelectedItem(null);
      await refresh();
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSalvage(item: ItemData) {
    if (!confirm(t("inventory.salvageConfirm"))) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/inventory/salvage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({ title: "✓", description: `${item.name} parçalandı` });
      setSelectedItem(null);
      await refresh();
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground font-pixel uppercase text-xs">
        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text">
            {t("inventory.title")}
          </h2>
          {data?.materials && (
            <CurrencyDisplay
              scrap={data.materials.scrap}
              techPart={data.materials.techPart}
              crystal={data.materials.crystal}
              electronic={data.materials.electronic}
              crystalDust={data.materials.crystalDust}
              compact
            />
          )}
        </div>

        {/* Loadout görünümü */}
        <div className="mb-3 p-2 border border-border bg-card/30">
          <div className="text-[10px] text-muted-foreground font-pixel uppercase tracking-wider mb-2">
            {t("inventory.loadout")}
          </div>
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            {(["WEAPON", "ARMOR", "SIDE_TOOL", "COMPANION"] as Slot[]).map((slot) => {
              const slotInfo = SLOT_INFO[slot];
              const Icon = (Icons[slotInfo.icon as keyof typeof Icons] ?? Icons.Sword) as React.ComponentType<{ className?: string }>;
              const equippedId = player?.loadout
                ? ((player.loadout as Record<string, { id?: string; name?: string; rarity?: string } | null>)[
                    slot === "WEAPON" ? "weapon" : slot === "ARMOR" ? "armor" : slot === "SIDE_TOOL" ? "sideTool" : "companion"
                  ])
                : null;
              return (
                <div key={slot} className="pixel-panel p-1.5 sm:p-2 text-center min-h-[60px] flex flex-col items-center justify-center">
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground mb-1" />
                  <div className="text-[8px] sm:text-[9px] text-muted-foreground uppercase tracking-wider font-pixel">
                    {slotInfo.name.tr}
                  </div>
                  {equippedId ? (
                    <div className="text-[9px] sm:text-[10px] font-pixel font-bold truncate w-full mt-0.5" style={{ color: `var(--rarity-${(equippedId.rarity ?? "common").toLowerCase()})` }}>
                      {equippedId.name}
                    </div>
                  ) : (
                    <div className="text-[8px] text-muted-foreground/40 italic font-pixel uppercase mt-0.5">{t("battle.empty")}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Filtreler */}
        <div className="flex flex-wrap gap-1 mb-3">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "pixel-button px-2 py-1.5 text-[10px] sm:text-xs font-pixel uppercase tracking-wider border-2",
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Item grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground font-pixel uppercase text-xs">
            {t("inventory.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
            {filtered.map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                equipped={equippedIds.has(it.id)}
                onClick={() => setSelectedItem(it)}
              />
            ))}
          </div>
        )}
      </PixelPanel>

      {/* Item detail dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
        <DialogContent className="bg-wasteland-panel border-2 border-wasteland-border max-w-md">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="font-pixel text-base" style={{ color: `var(--rarity-${selectedItem.rarity.toLowerCase()})` }}>
                  {selectedItem.name}
                </DialogTitle>
              </DialogHeader>
              <div className="py-2">
                <ItemCard item={selectedItem} compact={false} />
              </div>
              <DialogFooter className="flex gap-2 flex-row">
                {equippedIds.has(selectedItem.id) ? (
                  <Button
                    onClick={() => handleUnequip((selectedItem.slot ?? guessSlot(selectedItem)) as Slot)}
                    disabled={actionLoading}
                    className="pixel-button flex-1 bg-card text-foreground border-2 border-border font-pixel uppercase h-10"
                  >
                    {t("inventory.unequip")}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleEquip(selectedItem)}
                    disabled={actionLoading || selectedItem.state === "BROKEN"}
                    className="pixel-button flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-10"
                  >
                    {t("inventory.equip")}
                  </Button>
                )}
                {!equippedIds.has(selectedItem.id) && !selectedItem.protected && (
                  <Button
                    onClick={() => handleSalvage(selectedItem)}
                    disabled={actionLoading}
                    className="pixel-button flex-1 bg-destructive text-white hover:bg-destructive/90 font-pixel uppercase h-10"
                  >
                    {t("inventory.salvage")}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
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
