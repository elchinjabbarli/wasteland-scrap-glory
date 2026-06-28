"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore, type ItemData } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { ItemCard } from "./item-card";
import { RarityBadge } from "./rarity-badge";
import { ElementBadge } from "./element-badge";
import { CurrencyDisplay } from "./currency-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Recycle, Cpu, Loader2, Search, Tag, User, ArrowLeftRight, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RARITIES } from "@/lib/game/constants";

type Tab = "browse" | "list" | "mine" | "trades";

interface MarketListingDTO {
  id: string;
  price: number;
  currency: string;
  listedAt: string;
  expiresAt: string;
  item: {
    id: string;
    name: string;
    rarity: string;
    element: string;
    slot: string;
    baseDamage: number;
    baseArmor: number;
    baseHpBonus: number;
    upgradeLevel: number;
    icon: string;
  };
  seller: { id: string; name: string; faction: string; level: number };
}

export function MarketView() {
  const { player } = useGameStore();
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("browse");

  if (!player) return null;

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text">
              {t("market.title")}
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mt-1">
              {t("market.subtitle")} · {t("market.feeInfo")}
            </p>
          </div>
          <CurrencyDisplay
            scrap={player.scrap}
            techPart={player.techPart}
            compact
          />
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-1 mt-3">
          {([
            { key: "browse", label: t("market.browseTab"), icon: Search },
            { key: "list", label: t("market.listTab"), icon: Tag },
            { key: "mine", label: t("market.myListingsTab"), icon: User },
            { key: "trades", label: t("market.tradesTab"), icon: ArrowLeftRight },
          ] as const).map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={cn(
                "pixel-button px-1 py-2 text-[10px] font-pixel uppercase tracking-wider border-2 flex flex-col items-center gap-1",
                tab === tb.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
              )}
            >
              <tb.icon className="w-3 h-3" />
              <span className="truncate w-full text-center">{tb.label}</span>
            </button>
          ))}
        </div>
      </PixelPanel>

      {tab === "browse" && <BrowseTab />}
      {tab === "list" && <ListTab />}
      {tab === "mine" && <MyListingsTab />}
      {tab === "trades" && <TradesTab />}
    </div>
  );
}

// ============================================================
// BROWSE
// ============================================================

function BrowseTab() {
  const { t } = useI18n();
  const { player } = useGameStore();
  const { toast } = useToast();
  const [listings, setListings] = useState<MarketListingDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSlot, setFilterSlot] = useState<string>("ALL");
  const [filterRarity, setFilterRarity] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [buying, setBuying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSlot !== "ALL") params.set("slot", filterSlot);
      if (filterRarity !== "ALL") params.set("rarity", filterRarity);
      params.set("sortBy", sortBy);
      const res = await fetch(`/api/market/listings?${params}`);
      const data = await res.json();
      setListings(data.listings ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterSlot, filterRarity, sortBy]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleBuy(l: MarketListingDTO) {
    if (!player) return;
    if (!confirm(t("market.buyConfirm", { name: l.item.name, price: l.price, currency: l.currency === "SCRAP" ? "Hurda" : "Tech-Part" }))) return;
    setBuying(l.id);
    try {
      const res = await fetch("/api/market/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: l.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: `${l.item.name} satın alındı` });
        // Player refresh
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (meData.player) useGameStore.getState().setPlayer(meData.player);
        await load();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setBuying(null);
    }
  }

  return (
    <PixelPanel className="p-3">
      {/* Filtreler */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Select value={filterSlot} onValueChange={setFilterSlot}>
          <SelectTrigger className="h-9 text-xs font-pixel uppercase bg-card border-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tümü</SelectItem>
            <SelectItem value="WEAPON">Silah</SelectItem>
            <SelectItem value="ARMOR">Zırh</SelectItem>
            <SelectItem value="SIDE_TOOL">Yan Araç</SelectItem>
            <SelectItem value="COMPANION">Yoldaş</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRarity} onValueChange={setFilterRarity}>
          <SelectTrigger className="h-9 text-xs font-pixel uppercase bg-card border-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tümü</SelectItem>
            <SelectItem value="COMMON">Yaygın</SelectItem>
            <SelectItem value="RARE">Nadir</SelectItem>
            <SelectItem value="EPIC">Destansı</SelectItem>
            <SelectItem value="LEGENDARY">Efsanevi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-9 text-xs font-pixel uppercase bg-card border-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("market.sortNewest")}</SelectItem>
            <SelectItem value="price_asc">{t("market.sortPriceAsc")}</SelectItem>
            <SelectItem value="price_desc">{t("market.sortPriceDesc")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
          {t("common.loading")}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
          {t("market.noListings")}
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
          {listings.map((l) => {
            const rarInfo = RARITIES[l.item.rarity as keyof typeof RARITIES] ?? RARITIES.COMMON;
            const currencyIcon = l.currency === "SCRAP" ? Recycle : Cpu;
            const currencyColor = l.currency === "SCRAP" ? "var(--scrap)" : "var(--tech)";
            const Icon = currencyIcon;
            return (
              <div key={l.id} className="pixel-panel p-2 flex items-center gap-2" style={{ borderColor: rarInfo.color }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap mb-1">
                    <span className="font-pixel text-xs font-bold truncate" style={{ color: rarInfo.color }}>
                      {l.item.name}
                    </span>
                    {l.item.upgradeLevel > 0 && (
                      <span className="font-pixel text-[10px] text-accent">+{l.item.upgradeLevel}</span>
                    )}
                    <RarityBadge rarity={l.item.rarity} />
                    <ElementBadge element={l.item.element} />
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-pixel uppercase">
                    <span>{l.item.slot}</span>
                    {l.item.baseDamage > 0 && <span className="text-rust">DMG {l.item.baseDamage}</span>}
                    {l.item.baseArmor > 0 && <span className="text-tech">ARM {l.item.baseArmor}</span>}
                    <span>·</span>
                    <span>{l.seller.name}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 font-pixel text-sm font-bold" style={{ color: currencyColor }}>
                    <Icon className="w-3 h-3" />
                    {l.price.toLocaleString()}
                  </div>
                  {player && l.seller.id !== player.id && (
                    <Button
                      onClick={() => handleBuy(l)}
                      disabled={buying === l.id}
                      className="pixel-button mt-1 bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-7 text-[10px] px-2"
                    >
                      {buying === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t("market.buy")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PixelPanel>
  );
}

// ============================================================
// LIST ITEM
// ============================================================

function ListTab() {
  const { player } = useGameStore();
  const { t } = useI18n();
  const { toast } = useToast();
  const [items, setItems] = useState<ItemData[]>([]);
  const [selected, setSelected] = useState<ItemData | null>(null);
  const [price, setPrice] = useState("100");
  const [currency, setCurrency] = useState<"SCRAP" | "TECH_PART">("SCRAP");
  const [duration, setDuration] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      const all: ItemData[] = (data.items ?? []).map((it: ItemData & { slot?: string }) => ({
        ...it,
        slot: it.slot ?? guessSlot(it),
      }));
      // Listlenebilir: IN_INVENTORY, kırık değil, korumalı değil
      setItems(all.filter((it) => it.state === "IN_INVENTORY" && !it.protected));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleList() {
    if (!selected) return;
    setListing(true);
    try {
      const res = await fetch("/api/market/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selected.id,
          price: parseInt(price),
          currency,
          durationHours: duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: "İlan verildi" });
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (meData.player) useGameStore.getState().setPlayer(meData.player);
        await load();
        setSelected(null);
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setListing(false);
    }
  }

  const feeRate = currency === "SCRAP" ? 0.05 : 0.03;
  const listingFee = Math.floor(parseInt(price || "0") * feeRate);
  const durationCost = duration === 1 ? 0 : duration === 4 ? 10 : duration === 12 ? 25 : 50;
  const totalScrapCost = (currency === "SCRAP" ? listingFee : 0) + durationCost;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <PixelPanel className="p-3">
        <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{t("upgrade.selectItem")}</h3>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground font-pixel uppercase text-xs">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            {t("common.loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
            Satılabilir eşya yok
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

      <PixelPanel glow={selected ? "rust" : "none"} className="p-3">
        {!selected ? (
          <div className="text-center py-12 text-muted-foreground font-pixel uppercase text-xs">
            {t("upgrade.selectItem")}
          </div>
        ) : (
          <div className="space-y-3">
            <ItemCard item={selected} compact />
            <div>
              <Label className="font-pixel text-xs uppercase mb-1 block">{t("market.price")}</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="font-pixel bg-card border-2 h-10"
              />
            </div>
            <div>
              <Label className="font-pixel text-xs uppercase mb-1 block">{t("market.currency")}</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as "SCRAP" | "TECH_PART")}>
                <SelectTrigger className="h-10 font-pixel uppercase bg-card border-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCRAP">Hurda</SelectItem>
                  <SelectItem value="TECH_PART">Tech-Part</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-pixel text-xs uppercase mb-1 block">{t("market.duration")}</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger className="h-10 font-pixel uppercase bg-card border-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 saat (ücretsiz)</SelectItem>
                  <SelectItem value="4">4 saat (10 Hurda)</SelectItem>
                  <SelectItem value="12">12 saat (25 Hurda)</SelectItem>
                  <SelectItem value="24">24 saat (50 Hurda)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border pt-2 space-y-1 text-[10px] font-pixel">
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase">{t("market.listingFee")}:</span>
                <span className="text-rust">{listingFee} {currency === "SCRAP" ? "Hurda" : "Tech-Part"}</span>
              </div>
              {durationCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase">Süre ücreti:</span>
                  <span className="text-rust">{durationCost} Hurda</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground uppercase">Toplam Hurda:</span>
                <span className={player && player.scrap >= totalScrapCost ? "text-foreground" : "text-destructive"}>
                  {totalScrapCost}
                </span>
              </div>
            </div>

            <Button
              onClick={handleList}
              disabled={listing || !player || player.scrap < totalScrapCost}
              className="pixel-button w-full bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-11"
            >
              {listing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
              {t("market.listItem")}
            </Button>
          </div>
        )}
      </PixelPanel>
    </div>
  );
}

// ============================================================
// MY LISTINGS
// ============================================================

function MyListingsTab() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [listings, setListings] = useState<MarketListingDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/market/my-listings");
      const data = await res.json();
      // Convert my-listings format
      const mine = (data.listings ?? []).map((l: { id: string; price: number; currency: string; expiresAt: string; item: { id: string; name: string; rarity: string; element: string; baseDamage: number; baseArmor: number; baseHpBonus: number; upgradeLevel: number; icon: string; template: { slot: string } } }) => ({
        id: l.id,
        price: l.price,
        currency: l.currency,
        listedAt: "",
        expiresAt: l.expiresAt,
        durationHours: 0,
        item: {
          id: l.item.id,
          name: l.item.name,
          rarity: l.item.rarity,
          element: l.item.element,
          slot: l.item.template?.slot ?? "WEAPON",
          baseDamage: l.item.baseDamage,
          baseArmor: l.item.baseArmor,
          baseHpBonus: l.item.baseHpBonus,
          upgradeLevel: l.item.upgradeLevel,
          icon: l.item.icon,
        },
        seller: { id: "", name: "", faction: "", level: 0 },
      }));
      setListings(mine);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(listingId: string) {
    if (!confirm("İlan iptal edilsin mi?")) return;
    try {
      const res = await fetch("/api/market/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: "İlan iptal edildi" });
        await load();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    }
  }

  return (
    <PixelPanel className="p-3">
      <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{t("market.yourListings")}</h3>
      {loading ? (
        <div className="text-center py-4 text-muted-foreground font-pixel uppercase text-xs">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
          {t("common.loading")}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
          {t("market.noListings")}
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map((l) => {
            const rarInfo = RARITIES[l.item.rarity as keyof typeof RARITIES] ?? RARITIES.COMMON;
            const Icon = l.currency === "SCRAP" ? Recycle : Cpu;
            return (
              <div key={l.id} className="pixel-panel p-2 flex items-center gap-2" style={{ borderColor: rarInfo.color }}>
                <div className="flex-1 min-w-0">
                  <span className="font-pixel text-xs font-bold truncate block" style={{ color: rarInfo.color }}>
                    {l.item.name} {l.item.upgradeLevel > 0 && `+${l.item.upgradeLevel}`}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <RarityBadge rarity={l.item.rarity} />
                    <span className="text-[9px] text-muted-foreground font-pixel uppercase">{l.item.slot}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-pixel text-sm font-bold" style={{ color: l.currency === "SCRAP" ? "var(--scrap)" : "var(--tech)" }}>
                  <Icon className="w-3 h-3" />
                  {l.price.toLocaleString()}
                </div>
                <Button
                  onClick={() => handleCancel(l.id)}
                  className="pixel-button bg-destructive text-white hover:bg-destructive/90 font-pixel uppercase h-7 text-[10px] px-2"
                >
                  {t("market.cancelListing")}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </PixelPanel>
  );
}

// ============================================================
// TRADES
// ============================================================

function TradesTab() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [incoming, setIncoming] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/market/trade/incoming");
      const data = await res.json();
      setIncoming(data.trades ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAccept(tradeId: string) {
    setBusy(tradeId);
    try {
      const res = await fetch("/api/market/trade/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: "Takas kabul edildi" });
        await load();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(tradeId: string) {
    setBusy(tradeId);
    try {
      const res = await fetch("/api/market/trade/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("errors.generic"), description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: "Reddedildi" });
        await load();
      }
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <PixelPanel className="p-3">
        <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{t("market.incomingTrades")}</h3>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground font-pixel uppercase text-xs">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            {t("common.loading")}
          </div>
        ) : incoming.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
            {t("market.noTrades")}
          </div>
        ) : (
          <div className="space-y-2">
            {incoming.map((tr) => {
              const trade = tr as { id: string; fromPlayer: { name: string; level: number }; items: { side: string; item: { name: string; rarity: string } }[] };
              const offered = trade.items.filter((i) => i.side === "OFFERED");
              const requested = trade.items.filter((i) => i.side === "REQUESTED");
              return (
                <div key={trade.id} className="pixel-panel p-2">
                  <div className="text-[10px] font-pixel text-muted-foreground uppercase mb-1">
                    {trade.fromPlayer.name} (Sv {trade.fromPlayer.level}) →
                  </div>
                  <div className="text-[10px] font-pixel mb-1">
                    <span className="text-accent">Veriyor:</span> {offered.map((o) => o.item.name).join(", ")}
                  </div>
                  <div className="text-[10px] font-pixel mb-2">
                    <span className="text-rust">İstiyor:</span> {requested.map((r) => r.item.name).join(", ")}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAccept(trade.id)}
                      disabled={busy === trade.id}
                      className="pixel-button flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-8 text-xs"
                    >
                      <Check className="w-3 h-3" />
                      {t("market.accept")}
                    </Button>
                    <Button
                      onClick={() => handleReject(trade.id)}
                      disabled={busy === trade.id}
                      className="pixel-button flex-1 bg-destructive text-white hover:bg-destructive/90 font-pixel uppercase h-8 text-xs"
                    >
                      <X className="w-3 h-3" />
                      {t("market.reject")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PixelPanel>

      <PixelPanel className="p-3">
        <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{t("market.tradeOffer")}</h3>
        <p className="text-[10px] text-muted-foreground font-pixel mb-2">
          Takas teklifi göndermek için envanterden eşya seç ve hedef oyuncunun ID'sini gir. (Bu sürümde sadece gelen teklifler gösterilir.)
        </p>
        <Input
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          placeholder={t("market.toPlayer")}
          className="font-pixel bg-card border-2 h-9 text-xs"
        />
      </PixelPanel>
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
