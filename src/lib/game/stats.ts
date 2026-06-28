// Wasteland: Scrap & Glory - Formül Motoru
// Tüm GDD formülleri burada. Saf fonksiyonlar, test edilebilir.

import { MAX_LEVEL, type Rarity, type Element } from "./constants";
import { RARITIES, ELEMENTS } from "./constants";

// ============================================================
// SEVİYE & XP
// ============================================================

/** Seviye başına gerekli XP: 100 * (level ^ 1.5) */
export function requiredXp(level: number): number {
  if (level <= 0) return 0;
  if (level >= MAX_LEVEL) return Infinity;
  return Math.floor(100 * Math.pow(level, 1.5));
}

/** Mevcut seviyeden toplam XP'ye göre hesaplanan level */
export function levelFromTotalXp(totalXp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  let level = 1;
  let remaining = totalXp;
  while (level < MAX_LEVEL) {
    const need = requiredXp(level);
    if (remaining < need) break;
    remaining -= need;
    level++;
  }
  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel: level >= MAX_LEVEL ? 0 : requiredXp(level),
  };
}

// ============================================================
// BİRİNCİL İSTATİSTİKLER
// ============================================================

/** Fiziksel hasar: base * (1 + STR * 0.05) */
export function physicalDamage(baseDamage: number, str: number): number {
  return Math.floor(baseDamage * (1 + str * 0.05));
}

/** Enerji hasarı: base * (1 + INT * 0.05) */
export function energyDamage(baseDamage: number, int: number): number {
  return Math.floor(baseDamage * (1 + int * 0.05));
}

/** Saldırı hızı çarpanı: 1 + AGI * 0.03 */
export function attackSpeedMultiplier(agi: number): number {
  return 1 + agi * 0.03;
}

/** Maksimum HP: 100 + END * 10 */
export function maxHp(end: number): number {
  return 100 + end * 10;
}

/** Maksimum enerji: 50 + INT * 5 */
export function maxEnergy(int: number): number {
  return 50 + int * 5;
}

// ============================================================
// İKİNCİL İSTATİSTİKLER
// ============================================================

/** Kritik vuruş şansı: min(LCK * 0.3%, 25%) → 0-1 arası oran döner */
export function critChance(lck: number): number {
  return Math.min(lck * 0.003, 0.25);
}

/** Nadir drop bonusu: LCK * 0.1% → 0-1 arası */
export function rareDropBonus(lck: number): number {
  return lck * 0.001;
}

/** Kaçış şansı: min(AGI * 0.5%, 30%) */
export function evasionChance(agi: number): number {
  return Math.min(agi * 0.005, 0.30);
}

/** Satış fiyatı bonusu: CHR * 0.2% */
export function sellPriceBonus(chr: number): number {
  return chr * 0.002;
}

/** Raid ödül bonusu: CHR * 0.5% */
export function raidRewardBonus(chr: number): number {
  return chr * 0.005;
}

// ============================================================
// PRESTIGE & YÜKSELTME
// ============================================================

/** Prestige bonus çarpanı: 1 + (prestige * 0.02) */
export function prestigeMultiplier(prestigeLevel: number): number {
  return 1 + prestigeLevel * 0.02;
}

/** Yükseltilmiş istatistik: base * (1 + upgradeLevel * 0.05) */
export function upgradedStat(baseStat: number, upgradeLevel: number): number {
  return Math.floor(baseStat * (1 + upgradeLevel * 0.05));
}

// ============================================================
// ELEMENT & RARITY HELPERS
// ============================================================

/** Element bonus hasar çarpanı */
export function elementMultiplier(attacker: Element, defender: Element): number {
  if (attacker === defender) return 1.0;
  const atk = ELEMENTS[attacker];
  if (atk.strongAgainst === defender) return 1.2;
  const def = ELEMENTS[defender];
  if (def.strongAgainst === attacker) return 0.8;
  return 1.0;
}

/** Rarity'ye göre stat çarpanı aralığı */
export function rarityStatMultiplier(rarity: Rarity): [number, number] {
  return RARITIES[rarity].statRange;
}

// ============================================================
// SAVAŞ ÖDÜLLERİ
// ============================================================

/** Kazanılan XP: 50 + (rakipSeviye - oyuncuSeviye) * 10 (min 10) */
export function xpReward(playerLevel: number, opponentLevel: number): number {
  return Math.max(10, 50 + (opponentLevel - playerLevel) * 10);
}

/** Kazanılan Hurda: 20 + rakipSeviye * 5 */
export function scrapReward(opponentLevel: number): number {
  return 20 + opponentLevel * 5;
}

/** Tech-Part drop şansı: min(5% + rakipSeviye * 0.5%, 25%) */
export function techPartDropChance(opponentLevel: number): number {
  return Math.min(0.05 + opponentLevel * 0.005, 0.25);
}

/** Eşya düşme şansı (kaybedince): max(5% - zırhSeviyesi * 0.5%, 0%) */
export function itemDropChanceOnLoss(armorUpgradeLevel: number): number {
  return Math.max(0.05 - armorUpgradeLevel * 0.005, 0);
}

// ============================================================
// KARABORSA
// ============================================================

/** Karaborsa komisyonu: satışFiyatı * 0.05 (Hurda) */
export function marketFeeScrap(sellPrice: number): number {
  return Math.floor(sellPrice * 0.05);
}

/** Karaborsa komisyonu: satışFiyatı * 0.03 (Tech-Part) */
export function marketFeeTechPart(sellPrice: number): number {
  return Math.floor(sellPrice * 0.03);
}

/** Karaborsa komisyonu: takas * 0.01 */
export function marketFeeTrade(tradeValue: number): number {
  return Math.floor(tradeValue * 0.01);
}

// ============================================================
// CRAFTING
// ============================================================

export interface CraftingRecipe {
  rarity: Rarity;
  scrapCost: number;
  electronicCost: number;
  techPartCost: number;
  crystalDustCost: number;
  durationMinutes: number;
  successChance: number;
}

export const CRAFTING_RECIPES: Record<Rarity, CraftingRecipe> = {
  COMMON: {
    rarity: "COMMON",
    scrapCost: 100,
    electronicCost: 0,
    techPartCost: 0,
    crystalDustCost: 0,
    durationMinutes: 10,
    successChance: 1.0,
  },
  RARE: {
    rarity: "RARE",
    scrapCost: 50,
    electronicCost: 20,
    techPartCost: 0,
    crystalDustCost: 0,
    durationMinutes: 60,
    successChance: 0.8,
  },
  EPIC: {
    rarity: "EPIC",
    scrapCost: 0,
    electronicCost: 30,
    techPartCost: 10,
    crystalDustCost: 0,
    durationMinutes: 240,
    successChance: 0.5,
  },
  LEGENDARY: {
    rarity: "LEGENDARY",
    scrapCost: 0,
    electronicCost: 0,
    techPartCost: 50,
    crystalDustCost: 5,
    durationMinutes: 720,
    successChance: 0.2,
  },
};

// ============================================================
// RASTGELE & YARDIMCI
// ============================================================

/** 0-1 arası rastgele (seed'li test için opsiyonel) */
export function rng(seed?: { value: number }): number {
  if (seed) {
    // Deterministik LCG (Linear Congruential Generator)
    seed.value = (seed.value * 1664525 + 1013904223) % 4294967296;
    return seed.value / 4294967296;
  }
  return Math.random();
}

/** min-max arası rastgele tam sayı */
export function rngInt(min: number, max: number, seed?: { value: number }): number {
  return Math.floor(rng(seed) * (max - min + 1)) + min;
}

/** Şans yüzdesi kontrolü (0-1) */
export function chanceCheck(probability: number, seed?: { value: number }): boolean {
  return rng(seed) < probability;
}

/** Verilen ağırlıklı seçim */
export function weightedChoice<T>(items: T[], weights: number[], seed?: { value: number }): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng(seed) * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
