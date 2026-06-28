// Wasteland: Scrap & Glory - Prestige & Stat Dağıtım Sistemi

import { db } from "@/lib/db";
import { MAX_LEVEL } from "./constants";

// ============================================================
// PRESTIGE
// ============================================================

export interface PrestigeEligibility {
  canPrestige: boolean;
  reason?: string;
  currentPrestige: number;
  bonusMultiplier: number;
  nextBonusMultiplier: number;
}

export async function checkPrestigeEligibility(playerId: string): Promise<PrestigeEligibility> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) {
    return { canPrestige: false, reason: "Player bulunamadı", currentPrestige: 0, bonusMultiplier: 1, nextBonusMultiplier: 1 };
  }

  const currentBonus = 1 + player.prestige * 0.02;
  const nextBonus = 1 + (player.prestige + 1) * 0.02;

  if (player.level < MAX_LEVEL) {
    return {
      canPrestige: false,
      reason: `Seviye ${MAX_LEVEL} gerekiyor (şu an ${player.level})`,
      currentPrestige: player.prestige,
      bonusMultiplier: currentBonus,
      nextBonusMultiplier: nextBonus,
    };
  }

  return {
    canPrestige: true,
    currentPrestige: player.prestige,
    bonusMultiplier: currentBonus,
    nextBonusMultiplier: nextBonus,
  };
}

export interface PrestigeResult {
  ok: boolean;
  newPrestige?: number;
  bonusMultiplier?: number;
  itemsLost?: number;
  scrapLost?: number;
  electronicLost?: number;
  error?: string;
}

/** Prestige yap — level=1, xp=0, Common/Rare eşyalar sil, Hurda/Elektronik sil, kalıcı bonus */
export async function performPrestige(playerId: string): Promise<PrestigeResult> {
  const eligibility = await checkPrestigeEligibility(playerId);
  if (!eligibility.canPrestige) {
    return { ok: false, error: eligibility.reason };
  }

  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };

  // Silinecek eşyalar: Common + Rare (Epic/Legendary kalır)
  const itemsToDelete = await db.item.findMany({
    where: {
      ownerId: playerId,
      rarity: { in: ["COMMON", "RARE"] },
    },
  });
  const itemsLost = itemsToDelete.length;

  // Loadout'taki silinecek eşyaları çıkar
  const loadout = await db.loadout.findUnique({ where: { playerId } });
  if (loadout) {
    const updates: Record<string, null> = {};
    for (const it of itemsToDelete) {
      if (loadout.weaponItemId === it.id) updates.weaponItemId = null;
      if (loadout.armorItemId === it.id) updates.armorItemId = null;
      if (loadout.sideToolItemId === it.id) updates.sideToolItemId = null;
      if (loadout.companionItemId === it.id) updates.companionItemId = null;
    }
    if (Object.keys(updates).length > 0) {
      await db.loadout.update({ where: { id: loadout.id }, data: updates });
    }
  }

  // Common/Rare eşyaları sil
  await db.item.deleteMany({
    where: {
      ownerId: playerId,
      rarity: { in: ["COMMON", "RARE"] },
    },
  });

  const scrapLost = player.scrap;
  const electronicLost = player.electronic;

  // Player'ı sıfırla
  await db.player.update({
    where: { id: playerId },
    data: {
      level: 1,
      xp: 0,
      prestige: { increment: 1 },
      scrap: 100, // başlangıç scrap'ı geri ver
      electronic: 0,
      statPoints: 0,
      // Tech-Part, crystal, crystalDust KORUNUR (GDD'ye göre)
    },
  });

  // PrestigeLog kaydet
  await db.prestigeLog.create({
    data: {
      playerId,
      prestigeLevel: player.prestige + 1,
      previousLevel: player.level,
      itemsLost,
      scrapLost,
      electronicLost,
    },
  });

  return {
    ok: true,
    newPrestige: player.prestige + 1,
    bonusMultiplier: 1 + (player.prestige + 1) * 0.02,
    itemsLost,
    scrapLost,
    electronicLost,
  };
}

// ============================================================
// STAT DAĞITIM
// ============================================================

export type StatKey = "str" | "agi" | "end" | "int" | "lck" | "chr";

export const STAT_KEYS: StatKey[] = ["str", "agi", "end", "int", "lck", "chr"];

export const STAT_INFO: Record<StatKey, { name: { tr: string; en: string }; desc: { tr: string; en: string }; color: string; icon: string }> = {
  str: {
    name: { tr: "Güç", en: "Strength" },
    desc: { tr: "Fiziksel silah hasarını artırır", en: "Increases physical weapon damage" },
    color: "var(--rust)",
    icon: "Dumbbell",
  },
  agi: {
    name: { tr: "Çeviklik", en: "Agility" },
    desc: { tr: "Saldırı hızı ve kaçış şansı", en: "Attack speed and evasion" },
    color: "var(--accent)",
    icon: "Wind",
  },
  end: {
    name: { tr: "Dayanıklılık", en: "Endurance" },
    desc: { tr: "Maks HP ve direnç", en: "Max HP and resistance" },
    color: "var(--tech)",
    icon: "Shield",
  },
  int: {
    name: { tr: "Zeka", en: "Intelligence" },
    desc: { tr: "Enerji silahı hasarı ve enerji", en: "Energy weapon damage and energy" },
    color: "#a855f7",
    icon: "Brain",
  },
  lck: {
    name: { tr: "Şans", en: "Luck" },
    desc: { tr: "Kritik vuruş ve nadir drop", en: "Crit chance and rare drops" },
    color: "#f59e0b",
    icon: "Clover",
  },
  chr: {
    name: { tr: "Karizma", en: "Charisma" },
    desc: { tr: "Satış fiyatı ve raid ödülü", en: "Sell price and raid rewards" },
    color: "#ec4899",
    icon: "Heart",
  },
};

export interface AllocateResult {
  ok: boolean;
  newStatValue?: number;
  remainingPoints?: number;
  error?: string;
}

export async function allocateStat(
  playerId: string,
  stat: StatKey,
  points: number = 1
): Promise<AllocateResult> {
  if (!STAT_KEYS.includes(stat)) return { ok: false, error: "Geçersiz stat" };
  if (points <= 0 || points > 10) return { ok: false, error: "1-10 point arası" };

  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };
  if (player.statPoints < points) {
    return { ok: false, error: `Yetersiz stat point (${player.statPoints}/${points})` };
  }

  const updated = await db.player.update({
    where: { id: playerId },
    data: {
      [stat]: { increment: points },
      statPoints: { decrement: points },
    },
  });

  return {
    ok: true,
    newStatValue: updated[stat],
    remainingPoints: updated.statPoints,
  };
}
