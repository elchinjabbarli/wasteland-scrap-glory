"use client";

import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { FactionIcon } from "./faction-icon";
import { StatBar } from "./stat-bar";
import { CurrencyDisplay } from "./currency-display";
import { Button } from "@/components/ui/button";
import { Swords, Backpack, User, Zap, Heart, Crosshair, Shield as ShieldIcon } from "lucide-react";
import { maxHp, critChance, evasionChance, attackSpeedMultiplier } from "@/lib/game/stats";

export function Dashboard() {
  const { player, setView } = useGameStore();
  const { t, locale } = useI18n();

  if (!player) return null;

  const hp = maxHp(player.end) + (player.loadout?.armor ? ((player.loadout.armor as { baseHpBonus?: number }).baseHpBonus ?? 0) : 0);
  const crit = critChance(player.lck);
  const evasion = evasionChance(player.agi);
  const atkSpeed = attackSpeedMultiplier(player.agi);
  const weaponDmg = (player.loadout?.weapon as { baseDamage?: number } | null)?.baseDamage ?? 0;
  const combatPower = Math.floor(
    (hp * 0.5) + (weaponDmg * 5) + (crit * 100) + (evasion * 100) + (atkSpeed * 10) + (player.level * 20)
  );

  const winRate = player.battlesTotal > 0 ? Math.round((player.battlesWon / player.battlesTotal) * 100) : 0;

  // GDD: requiredXp(level) = 100 * level^1.5
  const xpForNext = Math.floor(100 * Math.pow(player.level, 1.5));
  const faction = player.faction as "BOZKIR" | "COL" | "FAVELA";

  return (
    <div className="space-y-3 p-3 sm:p-4 max-w-4xl mx-auto">
      {/* Üst bar: karakter */}
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <FactionIcon faction={faction} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="font-pixel text-base sm:text-xl font-bold text-foreground truncate">
              {player.name}
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mb-1">
              {t("dashboard.level", { level: player.level })} · {player.faction}
            </p>
            <div className="space-y-1">
              <StatBar
                label={t("dashboard.xp")}
                value={player.xp}
                max={xpForNext}
                color="var(--accent)"
                size="sm"
              />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <CurrencyDisplay
            scrap={player.scrap}
            techPart={player.techPart}
            crystal={player.crystal}
            electronic={player.electronic}
            crystalDust={player.crystalDust}
            compact
          />
        </div>
      </PixelPanel>

      {/* Combat Power */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <PixelPanel className="p-2 sm:p-3 text-center">
          <Zap className="w-4 h-4 mx-auto text-rust mb-1" />
          <div className="font-pixel text-base sm:text-lg font-bold text-rust glow-text">{combatPower}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{t("dashboard.combatPower")}</div>
        </PixelPanel>
        <PixelPanel className="p-2 sm:p-3 text-center">
          <Heart className="w-4 h-4 mx-auto text-green-500 mb-1" />
          <div className="font-pixel text-base sm:text-lg font-bold text-green-500">{hp}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{t("dashboard.hp")}</div>
        </PixelPanel>
        <PixelPanel className="p-2 sm:p-3 text-center">
          <Crosshair className="w-4 h-4 mx-auto text-rust mb-1" />
          <div className="font-pixel text-base sm:text-lg font-bold text-rust">{weaponDmg}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{t("inventory.damage")}</div>
        </PixelPanel>
        <PixelPanel className="p-2 sm:p-3 text-center">
          <ShieldIcon className="w-4 h-4 mx-auto text-tech mb-1" />
          <div className="font-pixel text-base sm:text-lg font-bold text-tech">{Math.round(crit * 100)}%</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{t("profile.critChance")}</div>
        </PixelPanel>
      </div>

      {/* Hızlı aksiyonlar */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs sm:text-sm font-bold text-accent uppercase tracking-wider mb-3">
          {t("dashboard.quickActions")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            onClick={() => setView("battle")}
            className="pixel-button h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase tracking-wider text-xs sm:text-sm"
          >
            <Swords className="w-4 h-4 mr-2" />
            {t("dashboard.startBattle")}
          </Button>
          <Button
            onClick={() => setView("inventory")}
            className="pixel-button h-14 bg-card text-foreground hover:bg-card/80 border-2 border-border font-pixel uppercase tracking-wider text-xs sm:text-sm"
          >
            <Backpack className="w-4 h-4 mr-2" />
            {t("dashboard.openInventory")}
          </Button>
          <Button
            onClick={() => setView("profile")}
            className="pixel-button h-14 bg-card text-foreground hover:bg-card/80 border-2 border-border font-pixel uppercase tracking-wider text-xs sm:text-sm"
          >
            <User className="w-4 h-4 mr-2" />
            {t("dashboard.viewProfile")}
          </Button>
        </div>
      </PixelPanel>

      {/* İstatistikler */}
      <PixelPanel className="p-3 sm:p-4">
        <h3 className="font-pixel text-xs sm:text-sm font-bold text-accent uppercase tracking-wider mb-3">
          {t("dashboard.stats")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatBox label={t("dashboard.battlesTotal")} value={player.battlesTotal} color="var(--foreground)" />
          <StatBox label={t("dashboard.battlesWon")} value={player.battlesWon} color="var(--accent)" />
          <StatBox label={t("dashboard.battlesLost")} value={player.battlesLost} color="var(--destructive)" />
          <StatBox label={t("dashboard.winRate")} value={`${winRate}%`} color="var(--rust)" />
        </div>
        {player.battlesTotal === 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground font-pixel uppercase tracking-wider">
            {t("dashboard.noBattlesYet")}
          </p>
        )}
      </PixelPanel>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="text-center p-2 border border-border bg-card/50">
      <div className="font-pixel text-lg sm:text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}
