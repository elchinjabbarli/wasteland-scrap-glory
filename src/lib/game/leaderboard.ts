// Wasteland: Scrap & Glory - Liderlik Tablosu
// 4 kategori, top 100, mock oyuncular

import { db } from "@/lib/db";

// ============================================================
// LİDERLİK KATEGORİLERİ
// ============================================================

export type LeaderboardCategory = "level" | "wins" | "kills" | "achievements";

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  faction: string;
  level: number;
  prestige: number;
  value: number;
  isYou?: boolean;
}

export interface LeaderboardResult {
  category: LeaderboardCategory;
  entries: LeaderboardEntry[];
  yourRank: number | null;
  totalPlayers: number;
}

// ============================================================
// MOCK OYUNCULAR (gerçek rakip hissi)
// ============================================================

const MOCK_NAMES = [
  "ÇelikPençe", "RadyasyonKralı", "KumFırtınası", "PaslıCellat", "MutantAvcısı",
  "BozkırKurdu", "Çölİblisi", "FavelaLideri", "DemirYürek", "SonSavaşçı",
  "AntikMühendis", "KaraTüccar", "NükleerŞamanı", "HurdaTacir", "SessizKatil",
  "YıkıkKraliçe", "RadyoAktif", "ÇelikBoru", "PaslıKılıç", "MutantKöpek",
  "ÇölYırtıcısı", "BozkırAvcısı", "FavelaÇocuğu", "KristalAvcı", "TeknolojiUstası",
];

const FACTION_CODES = ["BOZKIR", "COL", "FAVELA"];

interface MockPlayer {
  id: string;
  name: string;
  faction: string;
  level: number;
  prestige: number;
  battlesWon: number;
  kills: number;
  achievementPoints: number;
}

let mockPlayersCache: MockPlayer[] | null = null;

function getMockPlayers(): MockPlayer[] {
  if (mockPlayersCache) return mockPlayersCache;

  mockPlayersCache = MOCK_NAMES.map((name, i) => {
    const level = 10 + Math.floor(Math.random() * 90);
    const prestige = Math.random() < 0.2 ? Math.floor(Math.random() * 3) : 0;
    return {
      id: `mock_lb_${i}`,
      name,
      faction: FACTION_CODES[i % 3],
      level,
      prestige,
      battlesWon: Math.floor(level * (3 + Math.random() * 5)),
      kills: Math.floor(level * (1 + Math.random() * 3)),
      achievementPoints: Math.floor(level * (5 + Math.random() * 15)),
    };
  });
  return mockPlayersCache;
}

// ============================================================
// LİDERLİK GETİR
// ============================================================

export async function getLeaderboard(
  category: LeaderboardCategory,
  playerId: string,
  limit: number = 100
): Promise<LeaderboardResult> {
  // Gerçek oyuncuları getir
  const realPlayers = await db.player.findMany({
    where: {
      // Sadece onboarding yapmış (name telegram_xxxx formatında değil)
      NOT: {
        name: { startsWith: "Survivor" },
      },
    },
    select: {
      id: true,
      name: true,
      faction: true,
      level: true,
      prestige: true,
      battlesWon: true,
      kills: true,
      achievementPoints: true,
    },
  });

  // Mock oyuncuları ekle
  const mocks = getMockPlayers();

  type Row = {
    id: string;
    name: string;
    faction: string;
    level: number;
    prestige: number;
    battlesWon: number;
    kills: number;
    achievementPoints: number;
    isMock: boolean;
  };
  const all: Row[] = [
    ...realPlayers.map((p) => ({ ...p, isMock: false })),
    ...mocks.map((m) => ({ ...m, isMock: true })),
  ];

  // Kategoriye göre sırala
  const getValue = (p: Row): number => {
    switch (category) {
      case "level": return p.level + p.prestige * 100;
      case "wins": return p.battlesWon;
      case "kills": return p.kills;
      case "achievements": return p.achievementPoints;
    }
  };

  all.sort((a, b) => getValue(b) - getValue(a));

  // Top N
  const top = all.slice(0, limit);
  const entries: LeaderboardEntry[] = top.map((p, i) => ({
    rank: i + 1,
    playerId: p.id,
    name: p.name,
    faction: p.faction,
    level: p.level,
    prestige: p.prestige,
    value: getValue(p),
    isYou: p.id === playerId,
  }));

  // Oyuncunun sırası
  const yourIdx = all.findIndex((p) => p.id === playerId);
  const yourRank = yourIdx >= 0 ? yourIdx + 1 : null;

  return {
    category,
    entries,
    yourRank,
    totalPlayers: all.length,
  };
}
