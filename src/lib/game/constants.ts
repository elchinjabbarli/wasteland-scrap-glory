// Wasteland: Scrap & Glory - Oyun Sabitleri
// Tüm enum ve sabit değerler burada

export type Faction = "BOZKIR" | "COL" | "FAVELA";
export type Slot = "WEAPON" | "ARMOR" | "SIDE_TOOL" | "COMPANION";
export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type Element = "PHYSICAL" | "FIRE" | "ICE" | "POISON";
export type StatusEffectType =
  | "POISON"
  | "BURN"
  | "FREEZE"
  | "STUN"
  | "HASTE"
  | "EMPOWER"
  | "SHIELD"
  | "REGEN";
export type PlayerState = "IDLE" | "IN_COMBAT" | "INJURED" | "IN_EXPEDITION" | "IN_MARKET" | "IN_CRAFTING";
export type ItemState = "IN_INVENTORY" | "EQUIPPED" | "LISTED" | "LOCKED" | "BROKEN";

export const FACTIONS: Record<Faction, {
  code: Faction;
  name: { tr: string; en: string };
  archetype: { tr: string; en: string };
  description: { tr: string; en: string };
  color: string;
  accent: string;
  startingWeaponCode: string;
  icon: string;
}> = {
  BOZKIR: {
    code: "BOZKIR",
    name: { tr: "Bozkır Nomadları", en: "Steppe Nomads" },
    archetype: { tr: "Demir Yürek", en: "Iron Heart" },
    description: {
      tr: "Orta Asya göçebeleri. Ağır zırhlar, yavaş ama güçlü silahlar.",
      en: "Central Asian nomads. Heavy armor, slow but powerful weapons.",
    },
    color: "#9ca3af",
    accent: "#a16207",
    startingWeaponCode: "steppe_club",
    icon: "Shield",
  },
  COL: {
    code: "COL",
    name: { tr: "Çöl Akıncıları", en: "Desert Raiders" },
    archetype: { tr: "Kum Fırtınası", en: "Sand Storm" },
    description: {
      tr: "Çölde hayatta kalma uzmanları. Hızlı saldırı, zehir ve durum etkileri.",
      en: "Desert survival experts. Fast attacks, poison and status effects.",
    },
    color: "#d4a574",
    accent: "#65a30d",
    startingWeaponCode: "desert_dagger",
    icon: "Wind",
  },
  FAVELA: {
    code: "FAVELA",
    name: { tr: "Favela Hayatta Kalanları", en: "Favela Survivors" },
    archetype: { tr: "Hack'çi", en: "Hacker" },
    description: {
      tr: "Şehir kalıntılarında yaşayan gençler. Teknoloji, tuzaklar, drone yoldaşlar.",
      en: "Youth in city ruins. Tech, traps, drone companions.",
    },
    color: "#ec4899",
    accent: "#06b6d4",
    startingWeaponCode: "favela_pipewrench",
    icon: "Cpu",
  },
};

export const RARITIES: Record<Rarity, {
  code: Rarity;
  name: { tr: string; en: string };
  color: string;
  dropChance: number;
  statRange: [number, number];
  order: number;
}> = {
  COMMON: {
    code: "COMMON",
    name: { tr: "Yaygın", en: "Common" },
    color: "#9ca3af",
    dropChance: 60,
    statRange: [0.8, 1.0],
    order: 0,
  },
  RARE: {
    code: "RARE",
    name: { tr: "Nadir", en: "Rare" },
    color: "#3b82f6",
    dropChance: 25,
    statRange: [1.0, 1.3],
    order: 1,
  },
  EPIC: {
    code: "EPIC",
    name: { tr: "Destansı", en: "Epic" },
    color: "#a855f7",
    dropChance: 10,
    statRange: [1.3, 1.7],
    order: 2,
  },
  LEGENDARY: {
    code: "LEGENDARY",
    name: { tr: "Efsanevi", en: "Legendary" },
    color: "#f59e0b",
    dropChance: 5,
    statRange: [1.7, 2.5],
    order: 3,
  },
};

export const ELEMENTS: Record<Element, {
  code: Element;
  name: { tr: string; en: string };
  color: string;
  icon: string;
  strongAgainst: Element | null;
}> = {
  PHYSICAL: {
    code: "PHYSICAL",
    name: { tr: "Fiziksel", en: "Physical" },
    color: "#9ca3af",
    icon: "Circle",
    strongAgainst: null,
  },
  FIRE: {
    code: "FIRE",
    name: { tr: "Ateş", en: "Fire" },
    color: "#ef4444",
    icon: "Flame",
    strongAgainst: "ICE",
  },
  ICE: {
    code: "ICE",
    name: { tr: "Buz", en: "Ice" },
    color: "#38bdf8",
    icon: "Snowflake",
    strongAgainst: "FIRE",
  },
  POISON: {
    code: "POISON",
    name: { tr: "Zehir", en: "Poison" },
    color: "#84cc16",
    icon: "Skull",
    strongAgainst: "PHYSICAL",
  },
};

export function getElementMultiplier(attackerElement: Element, defenderElement: Element): number {
  if (attackerElement === defenderElement) return 1.0;
  const atk = ELEMENTS[attackerElement];
  if (atk.strongAgainst === defenderElement) return 1.2;
  const def = ELEMENTS[defenderElement];
  if (def.strongAgainst === attackerElement) return 0.8;
  return 1.0;
}

export const STATUS_EFFECTS: Record<StatusEffectType, {
  code: StatusEffectType;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  isPositive: boolean;
  color: string;
  icon: string;
  defaultDuration: number;
}> = {
  POISON: {
    code: "POISON",
    name: { tr: "Zehir", en: "Poison" },
    description: { tr: "Her tur 5 HP azalır.", en: "Lose 5 HP each round." },
    isPositive: false,
    color: "#84cc16",
    icon: "Droplet",
    defaultDuration: 3,
  },
  BURN: {
    code: "BURN",
    name: { tr: "Yanma", en: "Burn" },
    description: { tr: "Her tur 8 HP azalır, saldırı hızı %10 düşer.", en: "Lose 8 HP each round, -10% attack speed." },
    isPositive: false,
    color: "#ef4444",
    icon: "Flame",
    defaultDuration: 2,
  },
  FREEZE: {
    code: "FREEZE",
    name: { tr: "Donma", en: "Freeze" },
    description: { tr: "1 tur saldırı yapılamaz.", en: "Cannot attack for 1 round." },
    isPositive: false,
    color: "#38bdf8",
    icon: "Snowflake",
    defaultDuration: 1,
  },
  STUN: {
    code: "STUN",
    name: { tr: "Sersemletme", en: "Stun" },
    description: { tr: "1 tur saldırı ve savunma yapılamaz.", en: "Cannot attack or defend for 1 round." },
    isPositive: false,
    color: "#facc15",
    icon: "Zap",
    defaultDuration: 1,
  },
  HASTE: {
    code: "HASTE",
    name: { tr: "Hızlanma", en: "Haste" },
    description: { tr: "Saldırı hızı %20 artar.", en: "+20% attack speed." },
    isPositive: true,
    color: "#22c55e",
    icon: "Gauge",
    defaultDuration: 3,
  },
  EMPOWER: {
    code: "EMPOWER",
    name: { tr: "Güçlendirme", en: "Empower" },
    description: { tr: "Hasar %15 artar.", en: "+15% damage." },
    isPositive: true,
    color: "#f97316",
    icon: "TrendingUp",
    defaultDuration: 3,
  },
  SHIELD: {
    code: "SHIELD",
    name: { tr: "Kalkan", en: "Shield" },
    description: { tr: "50 puanlık ek HP.", en: "+50 bonus HP." },
    isPositive: true,
    color: "#3b82f6",
    icon: "Shield",
    defaultDuration: 999,
  },
  REGEN: {
    code: "REGEN",
    name: { tr: "Rejenerasyon", en: "Regen" },
    description: { tr: "Her tur 10 HP yenilenir.", en: "Regen 10 HP each round." },
    isPositive: true,
    color: "#10b981",
    icon: "Heart",
    defaultDuration: 5,
  },
};

export const SLOT_INFO: Record<Slot, {
  code: Slot;
  name: { tr: string; en: string };
  icon: string;
  durabilityLossPerBattle: number;
}> = {
  WEAPON: {
    code: "WEAPON",
    name: { tr: "Ana Silah", en: "Primary Weapon" },
    icon: "Sword",
    durabilityLossPerBattle: 5,
  },
  ARMOR: {
    code: "ARMOR",
    name: { tr: "Zırh", en: "Armor" },
    icon: "Shield",
    durabilityLossPerBattle: 3,
  },
  SIDE_TOOL: {
    code: "SIDE_TOOL",
    name: { tr: "Yan Araç", en: "Side Tool" },
    icon: "Zap",
    durabilityLossPerBattle: 10,
  },
  COMPANION: {
    code: "COMPANION",
    name: { tr: "Yoldaş", en: "Companion" },
    icon: "PawPrint",
    durabilityLossPerBattle: 0,
  },
};

export const MAX_LEVEL = 100;
export const MAX_UPGRADE_LEVEL = 10;
export const MAX_DURABILITY = 100;
export const MAX_COMBAT_ROUNDS = 50;
export const STARTING_SCRAP = 100;
export const STARTING_STATS = 5;
