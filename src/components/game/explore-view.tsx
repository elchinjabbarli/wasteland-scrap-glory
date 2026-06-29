"use client";

import { useGameStore, type GameView } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import {
  MapPin, Globe, Trophy, Gift, Skull, Backpack, Hammer, Sparkles, Store, Users,
} from "lucide-react";

export function ExploreView() {
  const { setView, player } = useGameStore();
  const { locale } = useI18n();

  const items = [
    { key: "expedition" as GameView, icon: MapPin, label: locale === "tr" ? "Sefer" : "Expedition", desc: locale === "tr" ? "Bölge keşfet, ödül al" : "Explore zones, get rewards", color: "#84cc16" },
    { key: "globalBoss" as GameView, icon: Globe, label: locale === "tr" ? "Global Boss" : "Global Boss", desc: locale === "tr" ? "Haftalık boss, Legendary ödül" : "Weekly boss, Legendary reward", color: "#ef4444" },
    { key: "tournament" as GameView, icon: Trophy, label: locale === "tr" ? "Turnuva" : "Tournament", desc: locale === "tr" ? "Haftalık PvP eleme" : "Weekly PvP bracket", color: "#f59e0b" },
    { key: "quests" as GameView, icon: Gift, label: locale === "tr" ? "Günlük Görevler" : "Daily Quests", desc: locale === "tr" ? "3 görev = 5 Kristal" : "3 quests = 5 Crystals", color: "#06b6d4" },
    { key: "raid" as GameView, icon: Skull, label: locale === "tr" ? "Klan Raid" : "Clan Raid", desc: locale === "tr" ? "Klanınla boss kes" : "Boss with your clan", color: "#a855f7", hide: !player?.clanId },
    { key: "inventory" as GameView, icon: Backpack, label: locale === "tr" ? "Envanter" : "Inventory", desc: locale === "tr" ? "Eşyalarını yönet" : "Manage your items", color: "#9ca3af" },
    { key: "crafting" as GameView, icon: Hammer, label: locale === "tr" ? "Üretim" : "Crafting", desc: locale === "tr" ? "Eşya üret" : "Craft items", color: "#f97316" },
    { key: "upgrade" as GameView, icon: Sparkles, label: locale === "tr" ? "Yükselt & Tamir" : "Upgrade & Repair", desc: locale === "tr" ? "Eşya güçlendir" : "Enhance items", color: "#3b82f6" },
    { key: "market" as GameView, icon: Store, label: locale === "tr" ? "Karaborsa" : "Black Market", desc: locale === "tr" ? "Al, sat, takas" : "Buy, sell, trade", color: "#10b981" },
    { key: "clan" as GameView, icon: Users, label: locale === "tr" ? "Klan" : "Clan", desc: locale === "tr" ? "Klan kur/katıl" : "Create/join clan", color: "#ec4899" },
  ].filter((it) => !it.hide);

  return (
    <div className="p-3 max-w-2xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-4 text-center">
        <h2 className="text-lg font-bold text-rust">
          {locale === "tr" ? "🧭 Keşfet" : "🧭 Explore"}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {locale === "tr" ? "Wasteland'de ne yapmak istiyorsun?" : "What do you want to do in the Wasteland?"}
        </p>
      </PixelPanel>

      <div className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => setView(it.key)}
            className="flex flex-col items-center gap-2 p-3 border-2 border-border bg-card/50 rounded-xl hover:border-accent transition-all min-h-[100px]"
          >
            <div
              className="w-12 h-12 flex items-center justify-center rounded-xl border-2"
              style={{ borderColor: it.color, backgroundColor: `${it.color}22` }}
            >
              <it.icon className="w-6 h-6" style={{ color: it.color }} />
            </div>
            <div className="text-center">
              <div className="text-sm font-bold" style={{ color: it.color }}>
                {it.label}
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {it.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
