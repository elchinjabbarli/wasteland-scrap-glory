"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, Info, Coins, Zap, Calendar, Award, Trophy, Swords, MapPin, Hammer, Store, Users, Globe, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsData {
  stats: {
    totalItems: number;
    totalCrafts: number;
    totalExpeditions: number;
    totalMarketSales: number;
    totalAchievements: number;
    totalBadges: number;
    totalTitles: number;
    accountAge: number;
  };
  player: {
    id: string;
    name: string;
    faction: string;
    level: number;
    prestige: number;
    createdAt: string;
  };
  version: string;
}

export function SettingsView() {
  const { setView } = useGameStore();
  const { t, locale } = useI18n();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground font-pixel uppercase text-xs">
        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
        {t("common.loading")}
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { icon: Coins, label: locale === "tr" ? "Toplam Eşya" : "Total Items", value: data.stats.totalItems, color: "var(--rust)" },
    { icon: Hammer, label: locale === "tr" ? "Üretim" : "Crafts", value: data.stats.totalCrafts, color: "var(--accent)" },
    { icon: MapPin, label: locale === "tr" ? "Seferler" : "Expeditions", value: data.stats.totalExpeditions, color: "#06b6d4" },
    { icon: Store, label: locale === "tr" ? "Pazar Satışı" : "Market Sales", value: data.stats.totalMarketSales, color: "var(--scrap)" },
    { icon: Trophy, label: locale === "tr" ? "Başarımlar" : "Achievements", value: data.stats.totalAchievements, color: "#f59e0b" },
    { icon: Award, label: locale === "tr" ? "Rozetler" : "Badges", value: data.stats.totalBadges, color: "#a855f7" },
    { icon: Star, label: locale === "tr" ? "Unvanlar" : "Titles", value: data.stats.totalTitles, color: "#ec4899" },
    { icon: Calendar, label: locale === "tr" ? "Hesap Yaşı (gün)" : "Account Age (days)", value: data.stats.accountAge, color: "var(--tech)" },
  ];

  return (
    <div className="p-3 sm:p-4 max-w-2xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text flex items-center gap-2">
          <Settings className="w-5 h-5" />
          {locale === "tr" ? "Ayarlar & İstatistikler" : "Settings & Stats"}
        </h2>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mt-1">
          {locale === "tr" ? "Hesap bilgilerin ve oyun istatistiklerin" : "Your account info and game stats"}
        </p>
      </PixelPanel>

      {/* Hesap bilgisi */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{locale === "tr" ? "Hesap" : "Account"}</h3>
        <div className="space-y-1 text-[10px] font-pixel">
          <div className="flex justify-between">
            <span className="text-muted-foreground uppercase">{locale === "tr" ? "Oyuncu ID" : "Player ID"}</span>
            <span className="text-foreground truncate ml-2">{data.player.id.slice(-12)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground uppercase">{locale === "tr" ? "İsim" : "Name"}</span>
            <span className="text-foreground">{data.player.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground uppercase">{locale === "tr" ? "Fraksiyon" : "Faction"}</span>
            <span className="text-foreground">{data.player.faction}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground uppercase">{locale === "tr" ? "Seviye" : "Level"}</span>
            <span className="text-accent">{data.player.level}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground uppercase">{locale === "tr" ? "Prestij" : "Prestige"}</span>
            <span className="text-rust">{data.player.prestige}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground uppercase">{locale === "tr" ? "Kayıt" : "Registered"}</span>
            <span className="text-foreground">{new Date(data.player.createdAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}</span>
          </div>
        </div>
      </PixelPanel>

      {/* İstatistikler grid */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-3">{locale === "tr" ? "Oyun İstatistikleri" : "Game Stats"}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="text-center p-2 border border-border bg-card/50">
                <Icon className="w-3 h-3 mx-auto mb-1" style={{ color: s.color }} />
                <div className="font-pixel text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[8px] text-muted-foreground uppercase tracking-wider leading-tight mt-0.5">{s.label}</div>
              </div>
            );
          })}
        </div>
      </PixelPanel>

      {/* Hakkında */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          {locale === "tr" ? "Hakkında" : "About"}
        </h3>
        <div className="text-[10px] font-pixel text-muted-foreground space-y-2">
          <p>
            <span className="text-rust font-bold">Wasteland: Scrap & Glory</span> v{data.version}
          </p>
          <p className="leading-tight">
            {locale === "tr"
              ? "Post-apokaliptik Telegram Mini App RPG. Hayatta kal, savaş, çöplüğü fethet. Pixel-art tema, 7 dil, gerçek zamanlı klan sistemi."
              : "Post-apocalyptic Telegram Mini App RPG. Survive, fight, conquer the wasteland. Pixel-art theme, 7 languages, real-time clan system."}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-accent">⚡ Next.js 16</span>
            <span className="text-rust">⚙️ Prisma + SQLite</span>
            <span className="text-tech">🔌 Socket.io</span>
            <span className="text-yellow-500">🎨 Pixel Art</span>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-[9px] text-muted-foreground/60">
              {locale === "tr" ? "Tüm sistemler GDD'ye göre implement edildi." : "All systems implemented per GDD."}
            </p>
          </div>
        </div>
      </PixelPanel>

      {/* Hızlı erişim */}
      <PixelPanel className="p-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => setView("badges")}
            className="pixel-button bg-card text-foreground border-2 border-border font-pixel uppercase h-9 text-[10px]"
          >
            <Award className="w-3 h-3" />
            {t("badges.badges")}
          </Button>
          <Button
            onClick={() => setView("achievements")}
            className="pixel-button bg-card text-foreground border-2 border-border font-pixel uppercase h-9 text-[10px]"
          >
            <Trophy className="w-3 h-3" />
            {t("nav.achievements")}
          </Button>
        </div>
      </PixelPanel>
    </div>
  );
}
