"use client";

import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { useQuery } from "@tanstack/react-query";
import { PixelPanel } from "./pixel-panel";
import { FactionIcon } from "./faction-icon";
import { StatBar } from "./stat-bar";
import { CurrencyDisplay } from "./currency-display";
import { FACTIONS } from "@/lib/game/constants";
import { maxHp, critChance, evasionChance, attackSpeedMultiplier } from "@/lib/game/stats";
import { Loader2, Trophy, Skull, Swords } from "lucide-react";

interface HistoryEntry {
  id: string;
  opponentName: string;
  opponentFaction: string;
  opponentLevel: number;
  won: boolean;
  totalRounds: number;
  xpGained: number;
  scrapGained: number;
  techPartGained: number;
  createdAt: string;
}

export function ProfileView() {
  const { player } = useGameStore();
  const { t, locale } = useI18n();

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["combat-history"],
    queryFn: async () => {
      const res = await fetch("/api/combat/history");
      return res.json();
    },
  });

  if (!player) return null;

  const faction = FACTIONS[player.faction as keyof typeof FACTIONS] ?? FACTIONS.BOZKIR;
  const hp = maxHp(player.end) + ((player.loadout?.armor as { baseHpBonus?: number } | null)?.baseHpBonus ?? 0);
  const crit = critChance(player.lck);
  const evasion = evasionChance(player.agi);
  const atkSpeed = attackSpeedMultiplier(player.agi);
  const xpForNext = Math.floor(100 * Math.pow(player.level, 1.5));

  const stats = [
    { key: "str", label: t("profile.str"), value: player.str, color: "var(--rust)" },
    { key: "agi", label: t("profile.agi"), value: player.agi, color: "var(--accent)" },
    { key: "end", label: t("profile.end"), value: player.end, color: "var(--tech)" },
    { key: "int", label: t("profile.int"), value: player.int, color: "#a855f7" },
    { key: "lck", label: t("profile.lck"), value: player.lck, color: "#f59e0b" },
    { key: "chr", label: t("profile.chr"), value: player.chr, color: "#ec4899" },
  ];

  const combatStats = [
    { label: t("profile.maxHp"), value: hp, color: "var(--accent)" },
    { label: t("profile.critChance"), value: `${(crit * 100).toFixed(1)}%`, color: "var(--rust)" },
    { label: t("profile.evasionChance"), value: `${(evasion * 100).toFixed(1)}%`, color: "var(--tech)" },
    { label: t("profile.attackSpeed"), value: `${atkSpeed.toFixed(2)}x`, color: "#a855f7" },
  ];

  const history: HistoryEntry[] = historyData?.history ?? [];

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">
      {/* Karakter kartı */}
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <FactionIcon faction={player.faction} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="font-pixel text-base sm:text-xl font-bold text-foreground truncate">{player.name}</h2>
            <div className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mt-0.5">
              {faction.name[locale as "tr" | "en"]} · {faction.archetype[locale as "tr" | "en"]}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] sm:text-xs font-pixel">
              <div>
                <span className="text-muted-foreground uppercase">{t("profile.level")}:</span>{" "}
                <span className="text-accent font-bold">{player.level}</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase">{t("profile.prestige")}:</span>{" "}
                <span className="text-rust font-bold">{player.prestige}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <StatBar
            label={t("dashboard.xp")}
            value={player.xp}
            max={xpForNext}
            color="var(--accent)"
            size="sm"
          />
        </div>
      </PixelPanel>

      {/* Stats */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs sm:text-sm font-bold text-accent uppercase tracking-wider mb-3">
          {t("profile.stats")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.key}>
              <StatBar
                label={s.label}
                value={s.value}
                max={50}
                color={s.color}
                size="sm"
                showValue
              />
            </div>
          ))}
        </div>
      </PixelPanel>

      {/* Combat Stats */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs sm:text-sm font-bold text-accent uppercase tracking-wider mb-3">
          {t("profile.combatStats")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {combatStats.map((cs) => (
            <div key={cs.label} className="text-center p-2 border border-border bg-card/50">
              <div className="font-pixel text-base sm:text-lg font-bold" style={{ color: cs.color }}>
                {cs.value}
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                {cs.label}
              </div>
            </div>
          ))}
        </div>
      </PixelPanel>

      {/* Currency */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs sm:text-sm font-bold text-accent uppercase tracking-wider mb-3">
          {t("profile.currency")}
        </h3>
        <CurrencyDisplay
          scrap={player.scrap}
          techPart={player.techPart}
          crystal={player.crystal}
          electronic={player.electronic}
          crystalDust={player.crystalDust}
        />
      </PixelPanel>

      {/* Battle history */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs sm:text-sm font-bold text-accent uppercase tracking-wider mb-3">
          {t("profile.battleHistory")}
        </h3>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground font-pixel uppercase text-xs">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            {t("common.loading")}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
            {t("profile.noBattles")}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 p-2 border border-border bg-card/30 text-[10px] sm:text-xs"
              >
                <div className="flex-shrink-0">
                  {h.won ? (
                    <Trophy className="w-3.5 h-3.5 text-accent" />
                  ) : (
                    <Skull className="w-3.5 h-3.5 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-pixel font-bold truncate" style={{ color: h.won ? "var(--accent)" : "var(--destructive)" }}>
                    {h.won ? t("profile.won") : t("profile.lost")} {t("battle.vs")} {h.opponentName}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-pixel uppercase">
                    Sv {h.opponentLevel} · {h.totalRounds} tur · +{h.xpGained} XP · +{h.scrapGained} hurda
                  </div>
                </div>
                <div className="text-[9px] text-muted-foreground/60 font-pixel">
                  {new Date(h.createdAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </PixelPanel>

      {/* Toplam istatistikler */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs sm:text-sm font-bold text-accent uppercase tracking-wider mb-3">
          {t("dashboard.stats")}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 border border-border bg-card/50">
            <Swords className="w-3 h-3 mx-auto text-rust mb-1" />
            <div className="font-pixel text-base font-bold text-foreground">{player.battlesTotal}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{t("dashboard.battlesTotal")}</div>
          </div>
          <div className="text-center p-2 border border-border bg-card/50">
            <Trophy className="w-3 h-3 mx-auto text-accent mb-1" />
            <div className="font-pixel text-base font-bold text-accent">{player.battlesWon}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{t("dashboard.battlesWon")}</div>
          </div>
          <div className="text-center p-2 border border-border bg-card/50">
            <Skull className="w-3 h-3 mx-auto text-destructive mb-1" />
            <div className="font-pixel text-base font-bold text-destructive">{player.kills}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{t("dashboard.kills")}</div>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
