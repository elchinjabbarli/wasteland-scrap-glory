// Wasteland: Scrap & Glory - Prosedürel Eşya Üretimi
// İsim = [Ön-Ek] + [Temel_Eşya] + [Son-Ek]

import {
  type Rarity,
  type Element,
  type Slot,
  RARITIES,
  ELEMENTS,
  SLOT_INFO,
} from "./constants";
import {
  rarityStatMultiplier,
  weightedChoice,
  rngInt,
  rng,
  type rng as rngType,
} from "./stats";

// ============================================================
// İSİM PARÇALARI
// ============================================================

const PREFIXES: Record<Rarity, string[]> = {
  COMMON: ["Paslı", "Eskimiş", "Yıpranmış", "Sıradan"],
  RARE: ["Keskin", "Sağlam", "Lanetli", "Onarılı"],
  EPIC: ["Kutsal", "Güçlendirilmiş", "Antik", "Radyasyonlu"],
  LEGENDARY: ["Efsanevi", "Kıyamet", "Tanrı Katliamı", "Büyük Çöküş"],
};

const SUFFIXES: Record<Rarity, string[]> = {
  COMMON: ["of the Wasteland", "+1", "Hurda"],
  RARE: ["of Fire", "of Ice", "of Poison", "+2"],
  EPIC: ["of the Survivor", "of Doom", "+3", "of the Old World"],
  LEGENDARY: ["of Apocalypse", "of Glory", "+5", "of the Chosen"],
};

// Element son-ekleri (suffix'ten önce eklenebilir)
const ELEMENT_SUFFIXES: Record<Element, string> = {
  PHYSICAL: "",
  FIRE: "of Fire",
  ICE: "of Ice",
  POISON: "of Poison",
};

// ============================================================
// EŞYA ŞABLONU (template'den değil, direkt üretim için)
// ============================================================

export interface ItemSeed {
  templateCode: string;
  baseName: string; // "Kılıç", "Çelik Zırh", "İlk Yardım Kiti", "Drone"
  slot: Slot;
  // temel değer aralıkları (Common baz)
  damageRange?: [number, number];
  armorRange?: [number, number];
  hpBonusRange?: [number, number];
  attackSpeed?: number;
  companionHp?: number;
  companionDamage?: number;
  effectType?: string;
  effectChance?: number;
  effectDuration?: number;
  icon: string;
  faction?: string;
}

// Tüm olası eşya şablonları (seed data ile ItemTemplate'ler oluşturulur)
export const ITEM_SEEDS: ItemSeed[] = [
  // WEAPONS
  {
    templateCode: "rusty_blade",
    baseName: "Paslı Bıçak",
    slot: "WEAPON",
    damageRange: [8, 12],
    attackSpeed: 1.0,
    icon: "Sword",
  },
  {
    templateCode: "steppe_club",
    baseName: "Bozkır Sopası",
    slot: "WEAPON",
    damageRange: [12, 18],
    attackSpeed: 0.8,
    icon: "Hammer",
    faction: "BOZKIR",
  },
  {
    templateCode: "desert_dagger",
    baseName: "Çöl Hançeri",
    slot: "WEAPON",
    damageRange: [6, 10],
    attackSpeed: 1.5,
    icon: "Sword",
    faction: "COL",
    effectType: "POISON",
    effectChance: 0.15,
    effectDuration: 3,
  },
  {
    templateCode: "favela_pipewrench",
    baseName: "Favela Boru Anahtarı",
    slot: "WEAPON",
    damageRange: [10, 15],
    attackSpeed: 1.1,
    icon: "Wrench",
    faction: "FAVELA",
  },
  {
    templateCode: "iron_axe",
    baseName: "Demir Balta",
    slot: "WEAPON",
    damageRange: [15, 22],
    attackSpeed: 0.9,
    icon: "Axe",
  },
  {
    templateCode: "laser_rifle",
    baseName: "Lazer Tüfeği",
    slot: "WEAPON",
    damageRange: [20, 30],
    attackSpeed: 1.2,
    icon: "Crosshair",
  },
  {
    templateCode: "plasma_sword",
    baseName: "Plazma Kılıcı",
    slot: "WEAPON",
    damageRange: [25, 40],
    attackSpeed: 1.3,
    icon: "Sword",
  },
  {
    templateCode: "rocket_launcher",
    baseName: "Roketatar",
    slot: "WEAPON",
    damageRange: [40, 60],
    attackSpeed: 0.5,
    icon: "Rocket",
  },
  // ARMOR
  {
    templateCode: "leather_vest",
    baseName: "Deri Yelek",
    slot: "ARMOR",
    armorRange: [3, 6],
    hpBonusRange: [10, 20],
    icon: "Shirt",
  },
  {
    templateCode: "scrap_armor",
    baseName: "Hurda Zırh",
    slot: "ARMOR",
    armorRange: [5, 10],
    hpBonusRange: [20, 35],
    icon: "Shield",
  },
  {
    templateCode: "steel_plate",
    baseName: "Çelik Plaka",
    slot: "ARMOR",
    armorRange: [10, 18],
    hpBonusRange: [40, 60],
    icon: "Shield",
  },
  {
    templateCode: "power_armor",
    baseName: "Güç Zırhı",
    slot: "ARMOR",
    armorRange: [18, 30],
    hpBonusRange: [70, 100],
    icon: "Shield",
  },
  // SIDE TOOLS
  {
    templateCode: "medkit",
    baseName: "İlk Yardım Kiti",
    slot: "SIDE_TOOL",
    effectType: "REGEN",
    effectChance: 1.0,
    effectDuration: 5,
    icon: "Cross",
  },
  {
    templateCode: "energy_shield",
    baseName: "Enerji Kalkanı",
    slot: "SIDE_TOOL",
    effectType: "SHIELD",
    effectChance: 1.0,
    effectDuration: 999,
    icon: "Shield",
  },
  {
    templateCode: "stim_pack",
    baseName: "Stim Paketi",
    slot: "SIDE_TOOL",
    effectType: "HASTE",
    effectChance: 1.0,
    effectDuration: 3,
    icon: "Syringe",
  },
  {
    templateCode: "rage_vial",
    baseName: "Öfke İksiri",
    slot: "SIDE_TOOL",
    effectType: "EMPOWER",
    effectChance: 1.0,
    effectDuration: 3,
    icon: "FlaskConical",
  },
  {
    templateCode: "molotov",
    baseName: "Molotof",
    slot: "SIDE_TOOL",
    effectType: "BURN",
    effectChance: 0.8,
    effectDuration: 2,
    icon: "Flame",
  },
  {
    templateCode: "freeze_grenade",
    baseName: "Don Bombası",
    slot: "SIDE_TOOL",
    effectType: "FREEZE",
    effectChance: 0.7,
    effectDuration: 1,
    icon: "Snowflake",
  },
  {
    templateCode: "stun_grenade",
    baseName: "Şok Bombası",
    slot: "SIDE_TOOL",
    effectType: "STUN",
    effectChance: 0.6,
    effectDuration: 1,
    icon: "Zap",
  },
  // COMPANIONS
  {
    templateCode: "mutant_dog",
    baseName: "Mutant Köpek",
    slot: "COMPANION",
    companionHp: 50,
    companionDamage: 8,
    icon: "PawPrint",
  },
  {
    templateCode: "scrap_drone",
    baseName: "Hurda Drone",
    slot: "COMPANION",
    companionHp: 30,
    companionDamage: 12,
    icon: "Cpu",
  },
  {
    templateCode: "war_bot",
    baseName: "Savaş Botu",
    slot: "COMPANION",
    companionHp: 100,
    companionDamage: 18,
    icon: "Bot",
  },
];

// ============================================================
// ÜRETİM FONKSİYONLARI
// ============================================================

/** Rarity roll: %60/25/10/5 dağılımı */
export function rollRarity(seed?: { value: number }): Rarity {
  const rarities: Rarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
  const weights = rarities.map((r) => RARITIES[r].dropChance);
  return weightedChoice(rarities, weights, seed);
}

/** Element roll: %40 PHYSICAL, %20 FIRE, %20 ICE, %20 POISON */
export function rollElement(seed?: { value: number }): Element {
  const elements: Element[] = ["PHYSICAL", "FIRE", "ICE", "POISON"];
  const weights = [40, 20, 20, 20];
  return weightedChoice(elements, weights, seed);
}

/** İsim üretimi: [Ön-Ek] + [Temel] + [Son-Ek] */
export function generateItemName(
  baseName: string,
  rarity: Rarity,
  element: Element,
  upgradeLevel: number = 0,
  seed?: { value: number }
): { name: string; prefix: string | null; suffix: string | null } {
  const prefixPool = PREFIXES[rarity];
  const suffixPool = SUFFIXES[rarity];
  const prefix = prefixPool.length > 0 ? prefixPool[rngInt(0, prefixPool.length - 1, seed)] : null;

  let suffix: string | null = null;
  // %50 şansla element son-eki, %50 şansla rarity son-eki
  if (element !== "PHYSICAL" && rng(seed) < 0.5) {
    suffix = ELEMENT_SUFFIXES[element];
  } else if (suffixPool.length > 0) {
    suffix = suffixPool[rngInt(0, suffixPool.length - 1, seed)];
  }

  // Upgrade seviyesi son-ek olarak ekle (+1, +2, ...)
  if (upgradeLevel > 0) {
    suffix = `+${upgradeLevel}`;
  }

  const parts = [prefix, baseName, suffix].filter(Boolean);
  return {
    name: parts.join(" "),
    prefix,
    suffix,
  };
}

/** Bir ItemSeed'den konkret eşya üret */
export interface GeneratedItem {
  templateCode: string;
  name: string;
  prefix: string | null;
  suffix: string | null;
  rarity: Rarity;
  element: Element;
  slot: Slot;
  baseDamage: number;
  baseArmor: number;
  baseHpBonus: number;
  attackSpeed: number;
  companionHp: number;
  companionDamage: number;
  effectType: string | null;
  effectChance: number;
  effectDuration: number;
  icon: string;
}

export function generateItem(
  seed: ItemSeed,
  rarityHint?: Rarity,
  elementHint?: Element,
  upgradeLevel: number = 0,
  seedValue?: { value: number }
): GeneratedItem {
  const rarity = rarityHint ?? rollRarity(seedValue);
  const element = elementHint ?? rollElement(seedValue);

  const [statMin, statMax] = rarityStatMultiplier(rarity);

  const baseDamage = seed.damageRange
    ? Math.floor(((seed.damageRange[0] + seed.damageRange[1]) / 2) * rngInt(statMin * 100, statMax * 100, seedValue) / 100)
    : 0;
  const baseArmor = seed.armorRange
    ? Math.floor(((seed.armorRange[0] + seed.armorRange[1]) / 2) * rngInt(statMin * 100, statMax * 100, seedValue) / 100)
    : 0;
  const baseHpBonus = seed.hpBonusRange
    ? Math.floor(((seed.hpBonusRange[0] + seed.hpBonusRange[1]) / 2) * rngInt(statMin * 100, statMax * 100, seedValue) / 100)
    : 0;

  const { name, prefix, suffix } = generateItemName(seed.baseName, rarity, element, upgradeLevel, seedValue);

  return {
    templateCode: seed.templateCode,
    name,
    prefix,
    suffix,
    rarity,
    element,
    slot: seed.slot,
    baseDamage,
    baseArmor,
    baseHpBonus,
    attackSpeed: seed.attackSpeed ?? 1.0,
    companionHp: seed.companionHp ?? 0,
    companionDamage: seed.companionDamage ?? 0,
    effectType: seed.effectType ?? null,
    effectChance: seed.effectChance ?? 0,
    effectDuration: seed.effectDuration ?? 0,
    icon: seed.icon,
  };
}

/** Rastgele bir eşya üret (slot filtresi opsiyonel) */
export function generateRandomItem(
  slotFilter?: Slot,
  rarityHint?: Rarity,
  seedValue?: { value: number }
): GeneratedItem {
  const pool = slotFilter
    ? ITEM_SEEDS.filter((s) => s.slot === slotFilter)
    : ITEM_SEEDS;
  const chosen = pool[rngInt(0, pool.length - 1, seedValue)];
  return generateItem(chosen, rarityHint, undefined, 0, seedValue);
}
