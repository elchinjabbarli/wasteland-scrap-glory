"use client";

import { create } from "zustand";

export type GameView = "dashboard" | "battle" | "inventory" | "profile" | "crafting" | "upgrade" | "market" | "prestige" | "expedition" | "achievements" | "quests" | "leaderboard" | "stats" | "clan" | "raid" | "social" | "globalBoss" | "badges" | "settings" | "tournament";

export interface PlayerData {
  id: string;
  name: string;
  faction: string;
  level: number;
  xp: number;
  prestige: number;
  str: number;
  agi: number;
  end: number;
  int: number;
  lck: number;
  chr: number;
  statPoints: number;
  scrap: number;
  techPart: number;
  crystal: number;
  electronic: number;
  crystalDust: number;
  state: string;
  battlesTotal: number;
  battlesWon: number;
  battlesLost: number;
  kills: number;
  clanId: string | null;
  loadout: {
    weapon: unknown | null;
    armor: unknown | null;
    sideTool: unknown | null;
    companion: unknown | null;
  } | null;
}

export interface ItemData {
  id: string;
  name: string;
  prefix: string | null;
  suffix: string | null;
  rarity: string;
  element: string;
  slot?: string;
  baseDamage: number;
  baseArmor: number;
  baseHpBonus: number;
  attackSpeed: number;
  companionHp: number;
  companionDamage: number;
  effectType: string | null;
  effectChance: number;
  effectDuration: number;
  upgradeLevel: number;
  durability: number;
  state: string;
  protected: boolean;
  icon: string;
  templateCode?: string;
}

export interface OpponentData {
  id: string;
  name: string;
  faction: string;
  level: number;
  maxHp: number;
  weaponDamage: number;
  weaponElement: string;
  armor: number;
  hasCompanion: boolean;
  companionDamage: number;
  isMock: boolean;
}

export interface BattleRound {
  round: number;
  attackerId: string;
  defenderId: string;
  weaponName: string;
  element: string;
  baseDamage: number;
  critMultiplier: number;
  elementMultiplier: number;
  evasion: boolean;
  finalDamage: number;
  defenderHpAfter: number;
  effectsApplied: string[];
  effectsTicked: { type: string; damage: number }[];
  companionAttack?: { damage: number; targetHpAfter: number };
  logText: string;
}

export interface BattleResult {
  ok: boolean;
  combatId: string;
  result: {
    playerWon: boolean;
    winnerSide: string;
    totalRounds: number;
    durationMs: number;
    finalHpA: number;
    finalHpB: number;
    rounds: BattleRound[];
  };
  rewards: {
    xp: number;
    scrap: number;
    techPart: number;
    statPointsGained: number;
    leveledUp: boolean;
    newLevel: number;
    droppedItem: { name: string; templateCode: string } | null;
    lostItem: { name: string } | null;
  };
  opponent: {
    id: string;
    name: string;
    faction: string;
    level: number;
  };
}

interface GameState {
  view: GameView;
  setView: (v: GameView) => void;

  player: PlayerData | null;
  setPlayer: (p: PlayerData | null) => void;

  needsOnboarding: boolean;
  setNeedsOnboarding: (v: boolean) => void;

  isAuthenticated: boolean;
  setAuthenticated: (v: boolean) => void;

  authLoading: boolean;
  setAuthLoading: (v: boolean) => void;

  lastBattle: BattleResult | null;
  setLastBattle: (b: BattleResult | null) => void;

  // Battle arena state
  battlePhase: "loadout" | "match" | "sim" | "result";
  setBattlePhase: (p: "loadout" | "match" | "sim" | "result") => void;

  selectedOpponent: OpponentData | null;
  setSelectedOpponent: (o: OpponentData | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  view: "dashboard",
  setView: (v) => set({ view: v }),

  player: null,
  setPlayer: (p) => set({ player: p }),

  needsOnboarding: true,
  setNeedsOnboarding: (v) => set({ needsOnboarding: v }),

  isAuthenticated: false,
  setAuthenticated: (v) => set({ isAuthenticated: v }),

  authLoading: true,
  setAuthLoading: (v) => set({ authLoading: v }),

  lastBattle: null,
  setLastBattle: (b) => set({ lastBattle: b }),

  battlePhase: "loadout",
  setBattlePhase: (p) => set({ battlePhase: p }),

  selectedOpponent: null,
  setSelectedOpponent: (o) => set({ selectedOpponent: o }),
}));
