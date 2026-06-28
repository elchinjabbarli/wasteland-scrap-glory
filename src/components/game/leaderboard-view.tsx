"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { FactionIcon } from "./faction-icon";
import { Loader2, Trophy, Medal, Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Category = "level" | "wins" | "kills" | "achievements";

interface LBEntry {
  rank: number;
  playerId: string;
  name: string;
  faction: string;
  level: number;
  prestige: number;
  value: number;
  isYou?: boolean;
}

export function LeaderboardView() {
  const { player } = useGameStore();
  const { t } = useI18n();
  const [category, setCategory] = useState<Category>("level");
  const [entries, setEntries] = useState<LBEntry[]>([]);
  const [yourRank, setYourRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/leaderboard?category=${category}&limit=100`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setEntries(d.entries ?? []);
        setYourRank(d.yourRank ?? null);
        setTotalPlayers(d.totalPlayers ?? 0);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [category]);

  const categories: { key: Category; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "level", label: t("leaderboard.level"), icon: Star },
    { key: "wins", label: t("leaderboard.wins"), icon: Trophy },
    { key: "kills", label: t("leaderboard.kills"), icon: Medal },
    { key: "achievements", label: t("leaderboard.achievements"), icon: Crown },
  ];

  const valueLabel = (cat: Category, v: number): string => {
    switch (cat) {
      case "level": return `Sv ${v > 100 ? Math.floor(v / 100) : v}${v > 100 ? `+P${Math.floor(v / 100)}` : ""}`;
      case "wins": return `${v}`;
      case "kills": return `${v}`;
      case "achievements": return `${v}p`;
    }
  };

  return (
    <div className="p-3 sm:p-4 max-w-2xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          {t("leaderboard.title")}
        </h2>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mt-1">
          {t("leaderboard.subtitle")} · {t("leaderboard.totalPlayers", { n: totalPlayers })}
        </p>
      </PixelPanel>

      {/* Kategori tabları */}
      <PixelPanel className="p-2">
        <div className="grid grid-cols-4 gap-1">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={cn(
                "pixel-button px-1 py-2 text-[10px] font-pixel uppercase tracking-wider border-2 flex flex-col items-center gap-1",
                category === c.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              )}
            >
              <c.icon className="w-3 h-3" />
              <span className="truncate w-full text-center">{c.label}</span>
            </button>
          ))}
        </div>
      </PixelPanel>

      {/* Senin sıran */}
      <PixelPanel glow="radiation" className="p-3 text-center">
        <div className="text-[10px] text-muted-foreground font-pixel uppercase tracking-wider mb-1">
          {t("leaderboard.yourRank")}
        </div>
        {yourRank ? (
          <div className="font-pixel text-3xl font-bold text-accent glow-text">
            #{yourRank}
          </div>
        ) : (
          <div className="font-pixel text-sm text-muted-foreground uppercase">
            {t("leaderboard.notRanked")}
          </div>
        )}
      </PixelPanel>

      {/* Liderlik listesi */}
      <PixelPanel className="p-2">
        {loading ? (
          <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            {t("common.loading")}
          </div>
        ) : (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {entries.map((e, i) => (
              <div
                key={`${e.playerId}-${i}`}
                className={cn(
                  "flex items-center gap-2 p-2 border",
                  e.isYou
                    ? "border-accent bg-accent/10"
                    : i < 3
                    ? "border-rust/50 bg-card/30"
                    : "border-border bg-card/20"
                )}
              >
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center font-pixel font-bold text-xs flex-shrink-0",
                  e.rank === 1 && "text-yellow-400",
                  e.rank === 2 && "text-gray-300",
                  e.rank === 3 && "text-orange-400",
                  e.rank > 3 && "text-muted-foreground"
                )}>
                  {e.rank <= 3 ? (
                    <Medal className="w-5 h-5" />
                  ) : (
                    `#${e.rank}`
                  )}
                </div>
                <FactionIcon faction={e.faction} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-pixel text-xs font-bold truncate">
                    {e.name}
                    {e.isYou && <span className="text-accent ml-1">({t("leaderboard.you")})</span>}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-pixel uppercase">
                    Sv {e.level}{e.prestige > 0 && ` · P${e.prestige}`}
                  </div>
                </div>
                <div className="font-pixel text-sm font-bold text-rust">
                  {valueLabel(category, e.value)}
                </div>
              </div>
            ))}
          </div>
        )}
      </PixelPanel>
    </div>
  );
}
