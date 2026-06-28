"use client";

import { SLOT_INFO, STATUS_EFFECTS, type Slot } from "@/lib/game/constants";
import { useI18n } from "@/i18n/request";
import { RarityBadge } from "./rarity-badge";
import { ElementBadge } from "./element-badge";
import { StatBar } from "./stat-bar";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItemData } from "@/store/game-store";

interface ItemCardProps {
  item: ItemData;
  equipped?: boolean;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

export function ItemCard({ item, equipped = false, onClick, className, compact = false }: ItemCardProps) {
  const { t, locale } = useI18n();
  const slotInfo = item.slot ? SLOT_INFO[item.slot as Slot] : null;
  const Icon = (Icons[item.icon as keyof typeof Icons] ?? Icons.Sword) as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  const rarityGlow = `rarity-glow-${item.rarity.toLowerCase()}`;

  return (
    <div
      onClick={onClick}
      className={cn(
        "pixel-panel p-2 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]",
        rarityGlow,
        onClick && "hover:border-primary",
        className
      )}
      style={{ borderColor: `var(--rarity-${item.rarity.toLowerCase()})` }}
    >
      <div className="flex items-start gap-2">
        <div
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center border-2"
          style={{ borderColor: `var(--rarity-${item.rarity.toLowerCase()})`, backgroundColor: `${`var(--rarity-${item.rarity.toLowerCase()})`}22` }}
        >
          <Icon className="w-5 h-5" style={{ color: `var(--rarity-${item.rarity.toLowerCase()})` }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-pixel font-bold text-xs truncate" style={{ color: `var(--rarity-${item.rarity.toLowerCase()})` }}>
              {item.name}
            </span>
            {item.upgradeLevel > 0 && (
              <span className="font-pixel text-[10px] text-accent glow-text">+{item.upgradeLevel}</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {slotInfo && (
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                {slotInfo.name[locale as "tr" | "en"]}
              </span>
            )}
            <ElementBadge element={item.element} />
            {equipped && (
              <span className="text-[9px] font-bold text-accent uppercase border border-accent px-1">
                {t("inventory.equipped")}
              </span>
            )}
            {item.protected && (
              <span className="text-[9px] font-bold text-yellow-500 uppercase border border-yellow-500 px-1">
                {t("inventory.protected")}
              </span>
            )}
            {item.state === "BROKEN" && (
              <span className="text-[9px] font-bold text-destructive uppercase border border-destructive px-1">
                {t("inventory.broken")}
              </span>
            )}
          </div>
        </div>
      </div>

      {!compact && (
        <div className="mt-2 space-y-1">
          {item.baseDamage > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground uppercase tracking-wider">{t("inventory.damage")}</span>
              <span className="font-pixel font-bold text-rust">
                {Math.floor(item.baseDamage * (1 + item.upgradeLevel * 0.05))}
              </span>
            </div>
          )}
          {item.baseArmor > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground uppercase tracking-wider">{t("inventory.armor")}</span>
              <span className="font-pixel font-bold text-tech">
                {Math.floor(item.baseArmor * (1 + item.upgradeLevel * 0.05))}
              </span>
            </div>
          )}
          {item.baseHpBonus > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground uppercase tracking-wider">{t("inventory.hpBonus")}</span>
              <span className="font-pixel font-bold text-green-500">
                +{Math.floor(item.baseHpBonus * (1 + item.upgradeLevel * 0.05))}
              </span>
            </div>
          )}
          {item.companionHp > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground uppercase tracking-wider">{t("inventory.companionHp")}</span>
              <span className="font-pixel font-bold text-green-500">
                {Math.floor(item.companionHp * (1 + item.upgradeLevel * 0.05))}
              </span>
            </div>
          )}
          {item.companionDamage > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground uppercase tracking-wider">{t("inventory.companionDamage")}</span>
              <span className="font-pixel font-bold text-rust">
                {Math.floor(item.companionDamage * (1 + item.upgradeLevel * 0.05))}
              </span>
            </div>
          )}
          {item.effectType && (
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground uppercase tracking-wider">{t("inventory.effect")}</span>
              <span className="font-pixel font-bold" style={{ color: STATUS_EFFECTS[item.effectType as keyof typeof STATUS_EFFECTS]?.color }}>
                {STATUS_EFFECTS[item.effectType as keyof typeof STATUS_EFFECTS]?.name[locale as "tr" | "en"]} ({Math.round(item.effectChance * 100)}%)
              </span>
            </div>
          )}
          {item.durability < 100 && (
            <div className="pt-1">
              <StatBar
                label={t("inventory.durability")}
                value={item.durability}
                max={100}
                color={item.durability < 25 ? "var(--destructive)" : item.durability < 50 ? "var(--rust)" : "var(--accent)"}
                size="sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
