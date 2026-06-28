// Wasteland: Scrap & Glory - Eşya Yükseltme & Tamir Sistemi
// +1 → +10, +7+ kırılma riski

import { db } from "@/lib/db";
import { MAX_UPGRADE_LEVEL, MAX_DURABILITY, type Slot } from "./constants";

// ============================================================
// YÜKSELTME MALİYET HESABI
// ============================================================

export interface UpgradeCost {
  scrap: number;
  electronic: number;
  techPart: number;
}

/** Yükseltme maliyeti: upgradeLevel * (10 Hurda + 1 Elektronik) + upgradeLevel^1.5 Tech-Part */
export function getUpgradeCost(currentUpgradeLevel: number): UpgradeCost {
  const next = currentUpgradeLevel + 1;
  return {
    scrap: next * 10,
    electronic: next * 1,
    techPart: Math.floor(Math.pow(next, 1.5)),
  };
}

/** Başarı şansı: +1-6 = %100, +7 = %80, +8 = %60, +9 = %40, +10 = %20 */
export function getUpgradeSuccessChance(currentUpgradeLevel: number): number {
  const next = currentUpgradeLevel + 1;
  if (next <= 6) return 1.0;
  if (next === 7) return 0.80;
  if (next === 8) return 0.60;
  if (next === 9) return 0.40;
  if (next === 10) return 0.20;
  return 0;
}

/** Kırılma riski: +7+ başarısızlıkta %30 */
export function getBreakChance(currentUpgradeLevel: number): number {
  const next = currentUpgradeLevel + 1;
  if (next < 7) return 0;
  return 0.30;
}

// ============================================================
// YÜKSELTME İŞLEMİ
// ============================================================

export interface UpgradeResult {
  ok: boolean;
  success?: boolean;
  broken?: boolean;
  newUpgradeLevel?: number;
  error?: string;
  cost?: UpgradeCost;
}

export async function upgradeItem(playerId: string, itemId: string): Promise<UpgradeResult> {
  const item = await db.item.findFirst({
    where: { id: itemId, ownerId: playerId },
  });
  if (!item) return { ok: false, error: "Eşya bulunamadı" };
  if (item.state === "BROKEN") return { ok: false, error: "Kırık eşya yükseltilemez" };
  if (item.state === "EQUIPPED") return { ok: false, error: "Önce eşyayı çıkar" };
  if (item.state === "LISTED" || item.state === "LOCKED") return { ok: false, error: "Kilitli eşya yükseltilemez" };
  if (item.upgradeLevel >= MAX_UPGRADE_LEVEL) return { ok: false, error: "Maksimum seviyeye ulaşmış" };

  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };

  const cost = getUpgradeCost(item.upgradeLevel);
  if (player.scrap < cost.scrap || player.electronic < cost.electronic || player.techPart < cost.techPart) {
    return { ok: false, error: "Yetersiz malzeme" };
  }

  const successChance = getUpgradeSuccessChance(item.upgradeLevel);
  const breakChance = getBreakChance(item.upgradeLevel);

  // Malzemeleri düş
  await db.player.update({
    where: { id: playerId },
    data: {
      scrap: { decrement: cost.scrap },
      electronic: { decrement: cost.electronic },
      techPart: { decrement: cost.techPart },
    },
  });

  // Başarı roll
  const success = Math.random() < successChance;

  if (success) {
    const updated = await db.item.update({
      where: { id: itemId },
      data: { upgradeLevel: { increment: 1 } },
    });
    return {
      ok: true,
      success: true,
      broken: false,
      newUpgradeLevel: updated.upgradeLevel,
      cost,
    };
  } else {
    // Başarısız — kırılma riski
    const broken = Math.random() < breakChance;
    if (broken) {
      await db.item.update({
        where: { id: itemId },
        data: {
          state: "BROKEN",
          durability: 0,
          upgradeLevel: 0, // upgrade sıfırlanır
        },
      });
      return { ok: true, success: false, broken: true, newUpgradeLevel: 0, cost };
    } else {
      // Sadece başarısız, kırılmadı — upgrade level aynı kalır
      return { ok: true, success: false, broken: false, newUpgradeLevel: item.upgradeLevel, cost };
    }
  }
}

// ============================================================
// TAMİR İŞLEMİ
// ============================================================

export interface RepairCost {
  techPart: number;
}

/** Tamir maliyeti: (100 - durability) / 10 Tech-Part (min 1) */
export function getRepairCost(currentDurability: number): RepairCost {
  const lost = MAX_DURABILITY - currentDurability;
  return { techPart: Math.max(1, Math.ceil(lost / 10)) };
}

export interface RepairResult {
  ok: boolean;
  newDurability?: number;
  cost?: RepairCost;
  error?: string;
}

export async function repairItem(playerId: string, itemId: string): Promise<RepairResult> {
  const item = await db.item.findFirst({ where: { id: itemId, ownerId: playerId } });
  if (!item) return { ok: false, error: "Eşya bulunamadı" };
  if (item.durability >= MAX_DURABILITY) return { ok: false, error: "Eşya zaten tamirli" };

  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };

  const cost = getRepairCost(item.durability);
  if (player.techPart < cost.techPart) {
    return { ok: false, error: "Yetersiz Tech-Part" };
  }

  await db.player.update({
    where: { id: playerId },
    data: { techPart: { decrement: cost.techPart } },
  });

  const updated = await db.item.update({
    where: { id: itemId },
    data: {
      durability: MAX_DURABILITY,
      state: item.state === "BROKEN" ? "IN_INVENTORY" : item.state,
    },
  });

  return {
    ok: true,
    newDurability: updated.durability,
    cost,
  };
}

// ============================================================
// YÜKSELTME ÖNİZLEME
// ============================================================

export interface UpgradePreview {
  current: {
    upgradeLevel: number;
    damage: number;
    armor: number;
    hpBonus: number;
    companionHp: number;
    companionDamage: number;
  };
  next: {
    upgradeLevel: number;
    damage: number;
    armor: number;
    hpBonus: number;
    companionHp: number;
    companionDamage: number;
  };
  cost: UpgradeCost;
  successChance: number;
  breakChance: number;
}

export function getUpgradePreview(item: {
  upgradeLevel: number;
  baseDamage: number;
  baseArmor: number;
  baseHpBonus: number;
  companionHp: number;
  companionDamage: number;
}): UpgradePreview {
  const cur = item.upgradeLevel;
  const next = cur + 1;
  const curMul = 1 + cur * 0.05;
  const nextMul = 1 + next * 0.05;

  return {
    current: {
      upgradeLevel: cur,
      damage: Math.floor(item.baseDamage * curMul),
      armor: Math.floor(item.baseArmor * curMul),
      hpBonus: Math.floor(item.baseHpBonus * curMul),
      companionHp: Math.floor(item.companionHp * curMul),
      companionDamage: Math.floor(item.companionDamage * curMul),
    },
    next: {
      upgradeLevel: next,
      damage: Math.floor(item.baseDamage * nextMul),
      armor: Math.floor(item.baseArmor * nextMul),
      hpBonus: Math.floor(item.baseHpBonus * nextMul),
      companionHp: Math.floor(item.companionHp * nextMul),
      companionDamage: Math.floor(item.companionDamage * nextMul),
    },
    cost: getUpgradeCost(cur),
    successChance: getUpgradeSuccessChance(cur),
    breakChance: getBreakChance(cur),
  };
}
