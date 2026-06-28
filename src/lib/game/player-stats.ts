// Wasteland: Scrap & Glory - Player & Loadout Stats Hesabı
// Player + Loadout → savaş için derlenmiş stats

import { db } from "@/lib/db";
import type { Player, Item, Loadout } from "@prisma/client";
import {
  type Element,
  type StatusEffectType,
} from "./constants";
import {
  physicalDamage,
  energyDamage,
  attackSpeedMultiplier,
  maxHp,
  critChance,
  evasionChance,
  prestigeMultiplier,
  upgradedStat,
} from "./stats";

// ============================================================
// LOADOUT DERLENMİŞ STATS
// ============================================================

export interface CompiledItemStats {
  itemId: string;
  name: string;
  slot: string;
  rarity: string;
  element: Element;
  damage: number;
  armor: number;
  hpBonus: number;
  attackSpeed: number;
  companionHp: number;
  companionDamage: number;
  effectType: StatusEffectType | null;
  effectChance: number;
  effectDuration: number;
  upgradeLevel: number;
  durability: number;
}

export interface CompiledPlayerStats {
  playerId: string;
  name: string;
  faction: string;
  level: number;
  prestige: number;

  // Base stats (player)
  str: number;
  agi: number;
  end: number;
  int: number;
  lck: number;
  chr: number;

  // Derived combat stats
  maxHp: number;
  currentHp: number;
  critChance: number; // 0-1
  evasionChance: number; // 0-1
  attackSpeed: number; // çarpan

  // Loadout
  weapon: CompiledItemStats | null;
  armor: CompiledItemStats | null;
  sideTool: CompiledItemStats | null;
  companion: CompiledItemStats | null;

  // Active element (weapon'dan)
  activeElement: Element;

  // Side tool effect (savaş başında tetiklenecek)
  sideToolEffect: {
    type: StatusEffectType;
    chance: number;
    duration: number;
  } | null;
}

function compileItem(item: Item | null, slot: string): CompiledItemStats | null {
  if (!item) return null;
  return {
    itemId: item.id,
    name: item.name,
    slot,
    rarity: item.rarity,
    element: item.element as Element,
    damage: upgradedStat(item.baseDamage, item.upgradeLevel),
    armor: upgradedStat(item.baseArmor, item.upgradeLevel),
    hpBonus: upgradedStat(item.baseHpBonus, item.upgradeLevel),
    attackSpeed: item.attackSpeed,
    companionHp: upgradedStat(item.companionHp, item.upgradeLevel),
    companionDamage: upgradedStat(item.companionDamage, item.upgradeLevel),
    effectType: (item.effectType as StatusEffectType) ?? null,
    effectChance: item.effectChance,
    effectDuration: item.effectDuration,
    upgradeLevel: item.upgradeLevel,
    durability: item.durability,
  };
}

/** Player + Loadout → CompiledPlayerStats (savaş için) */
export async function compilePlayerStats(
  player: Player,
  loadout: (Loadout & {
    weaponItem: Item | null;
    armorItem: Item | null;
    sideToolItem: Item | null;
    companionItem: Item | null;
  }) | null
): Promise<CompiledPlayerStats> {
  const weapon = compileItem(loadout?.weaponItem ?? null, "WEAPON");
  const armor = compileItem(loadout?.armorItem ?? null, "ARMOR");
  const sideTool = compileItem(loadout?.sideToolItem ?? null, "SIDE_TOOL");
  const companion = compileItem(loadout?.companionItem ?? null, "COMPANION");

  const prestMul = prestigeMultiplier(player.prestige);

  // HP = (base + armor hp bonus) * prestige
  const baseMaxHp = maxHp(player.end);
  const armorHpBonus = armor?.hpBonus ?? 0;
  const totalMaxHp = Math.floor((baseMaxHp + armorHpBonus) * prestMul);

  return {
    playerId: player.id,
    name: player.name,
    faction: player.faction,
    level: player.level,
    prestige: player.prestige,
    str: player.str,
    agi: player.agi,
    end: player.end,
    int: player.int,
    lck: player.lck,
    chr: player.chr,
    maxHp: totalMaxHp,
    currentHp: totalMaxHp, // savaş başında full HP
    critChance: critChance(player.lck),
    evasionChance: evasionChance(player.agi),
    attackSpeed: attackSpeedMultiplier(player.agi),
    weapon,
    armor,
    sideTool,
    companion,
    activeElement: weapon?.element ?? "PHYSICAL",
    sideToolEffect: sideTool?.effectType
      ? { type: sideTool.effectType, chance: sideTool.effectChance, duration: sideTool.effectDuration }
      : null,
  };
}

// ============================================================
// MOCK RAKIP STATS (PvE)
// ============================================================

export interface MockOpponent {
  id: string;
  name: string;
  faction: string;
  level: number;
  prestige: number;
  str: number;
  agi: number;
  end: number;
  int: number;
  lck: number;
  chr: number;
  maxHp: number;
  currentHp: number;
  critChance: number;
  evasionChance: number;
  attackSpeed: number;
  weapon: CompiledItemStats;
  armor: CompiledItemStats | null;
  sideTool: CompiledItemStats | null;
  companion: CompiledItemStats | null;
  activeElement: Element;
  sideToolEffect: { type: StatusEffectType; chance: number; duration: number } | null;
  isMock: true;
}

const MOCK_NAMES = [
  "Çöpçü Vanya", "Paslı Kral", "Radyasyon Şamanı", "Kum Fırtınası", "Demir Pençe",
  "Mutant Borçlu", "Hurda Tacir", "Çöl İblisi", "Bozkır Kurdu", "Favela Çocuğu",
  "Kara Tüccar", "Sessiz Katil", "Zehirli Anne", "Eski Asker", "Yıkık Mühendis",
  "Radyasyon Çocuk", "Paslı Cellat", "Son Göçebe", "Antik Avucu", "Kıyamet Habercisi",
];

const FACTION_CODES = ["BOZKIR", "COL", "FAVELA"] as const;

/** Belirli seviye etrafında mock rakip üret */
export function generateMockOpponent(
  aroundLevel: number,
  index: number = 0,
  seedValue?: { value: number }
): MockOpponent {
  // ±3 seviye oynar
  const levelDelta = Math.floor((Math.random() - 0.5) * 6);
  const level = Math.max(1, Math.min(100, aroundLevel + levelDelta));

  const faction = FACTION_CODES[index % 3];
  const name = MOCK_NAMES[(index * 7 + level) % MOCK_NAMES.length];

  // Stats: seviyeye göre dağıtılır (her 5 seviyede 1 stat point)
  const statBudget = 30 + Math.floor(level / 5) * 5;
  const str = 5 + Math.floor(statBudget * 0.25);
  const agi = 5 + Math.floor(statBudget * 0.20);
  const end = 5 + Math.floor(statBudget * 0.20);
  const int = 5 + Math.floor(statBudget * 0.15);
  const lck = 5 + Math.floor(statBudget * 0.10);
  const chr = 5 + Math.floor(statBudget * 0.10);

  const baseMaxHp = 100 + end * 10;

  // Mock weapon: seviyeye göre güçlü
  const weaponDamage = Math.floor(8 + level * 1.5);
  const elements: Element[] = ["PHYSICAL", "FIRE", "ICE", "POISON"];
  const weaponElement = elements[index % 4];

  return {
    id: `mock_${level}_${index}_${Date.now()}`,
    name,
    faction,
    level,
    prestige: 0,
    str, agi, end, int, lck, chr,
    maxHp: baseMaxHp,
    currentHp: baseMaxHp,
    critChance: Math.min(lck * 0.003, 0.25),
    evasionChance: Math.min(agi * 0.005, 0.30),
    attackSpeed: 1 + agi * 0.03,
    weapon: {
      itemId: `mock_weapon_${index}`,
      name: `${faction === "BOZKIR" ? "Demir" : faction === "COL" ? "Kum" : "Neon"} Silahı`,
      slot: "WEAPON",
      rarity: level > 50 ? "EPIC" : level > 20 ? "RARE" : "COMMON",
      element: weaponElement,
      damage: weaponDamage,
      armor: 0,
      hpBonus: 0,
      attackSpeed: 1.0,
      companionHp: 0,
      companionDamage: 0,
      effectType: weaponElement === "POISON" ? "POISON" : weaponElement === "FIRE" ? "BURN" : null,
      effectChance: weaponElement === "PHYSICAL" ? 0 : 0.15,
      effectDuration: 3,
      upgradeLevel: 0,
      durability: 100,
    },
    armor: level > 10 ? {
      itemId: `mock_armor_${index}`,
      name: "Hurda Zırh",
      slot: "ARMOR",
      rarity: "COMMON",
      element: "PHYSICAL",
      damage: 0,
      armor: Math.floor(3 + level * 0.5),
      hpBonus: Math.floor(10 + level * 2),
      attackSpeed: 1.0,
      companionHp: 0,
      companionDamage: 0,
      effectType: null,
      effectChance: 0,
      effectDuration: 0,
      upgradeLevel: 0,
      durability: 100,
    } : null,
    sideTool: level > 15 ? {
      itemId: `mock_sidetool_${index}`,
      name: "Molotof",
      slot: "SIDE_TOOL",
      rarity: "COMMON",
      element: "PHYSICAL",
      damage: 0,
      armor: 0,
      hpBonus: 0,
      attackSpeed: 1.0,
      companionHp: 0,
      companionDamage: 0,
      effectType: "BURN",
      effectChance: 0.8,
      effectDuration: 2,
      upgradeLevel: 0,
      durability: 100,
    } : null,
    companion: level > 25 ? {
      itemId: `mock_companion_${index}`,
      name: "Mutant Köpek",
      slot: "COMPANION",
      rarity: "COMMON",
      element: "PHYSICAL",
      damage: 0,
      armor: 0,
      hpBonus: 0,
      attackSpeed: 1.0,
      companionHp: 30 + level * 2,
      companionDamage: Math.floor(5 + level * 0.5),
      effectType: null,
      effectChance: 0,
      effectDuration: 0,
      upgradeLevel: 0,
      durability: 100,
    } : null,
    activeElement: weaponElement,
    sideToolEffect: level > 15 ? { type: "BURN", chance: 0.8, duration: 2 } : null,
    isMock: true as const,
  };
}

/** 5 mock rakip üret */
export function generateOpponents(playerLevel: number, seedValue?: { value: number }): MockOpponent[] {
  const opponents: MockOpponent[] = [];
  for (let i = 0; i < 5; i++) {
    opponents.push(generateMockOpponent(playerLevel, i, seedValue));
  }
  return opponents;
}
