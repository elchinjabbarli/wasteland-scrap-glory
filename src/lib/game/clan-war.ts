// Wasteland: Scrap & Glory - Haftalık Klan Savaşları
// GDD 9.4 & 13.2: Haftalık klan savaşı, 48 saat, "Haftanın Şampiyonu" rozeti

import { db } from "@/lib/db";

// ============================================================
// SABİTLER
// ============================================================

export const CLAN_WAR_DURATION_HOURS = 48;
export const CLAN_WAR_SCORE_PER_WIN = 100;
export const CLAN_WAR_SCORE_PER_KILL = 50;

// ============================================================
// CLAN WAR MODEL (Prisma'ya eklenmedi, runtime'da takip)
// Production'da Prisma'ya eklenebilir
// ============================================================

interface ClanWar {
  id: string;
  clanAId: string;
  clanBId: string;
  clanAName: string;
  clanBName: string;
  scoreA: number;
  scoreB: number;
  startedAt: Date;
  expiresAt: Date;
  status: "ACTIVE" | "COMPLETED";
  winnerClanId?: string;
}

// In-memory storage (production'da DB'ye taşınacak)
const activeWars = new Map<string, ClanWar>();

// ============================================================
// HAFTALIK KLAN SAVAŞI BAŞLAT
// ============================================================

function getWeekStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export async function startWeeklyClanWar(): Promise<ClanWar | null> {
  const week = getWeekStr();
  const warId = `clanwar_${week}`;

  // Zaten aktif war var mı?
  if (activeWars.has(warId)) {
    const existing = activeWars.get(warId)!;
    if (existing.expiresAt > new Date()) return existing;
  }

  // En yüksek seviyeli 2 klanı seç
  const clans = await db.clan.findMany({
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { level: "desc" },
    take: 2,
  });

  if (clans.length < 2) return null;

  const war: ClanWar = {
    id: warId,
    clanAId: clans[0].id,
    clanBId: clans[1].id,
    clanAName: clans[0].name,
    clanBName: clans[1].name,
    scoreA: 0,
    scoreB: 0,
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + CLAN_WAR_DURATION_HOURS * 60 * 60 * 1000),
    status: "ACTIVE",
  };

  activeWars.set(warId, war);
  return war;
}

/** Aktif klan savaşı getir */
export async function getActiveClanWar(): Promise<ClanWar | null> {
  const week = getWeekStr();
  const warId = `clanwar_${week}`;

  if (activeWars.has(warId)) {
    const war = activeWars.get(warId)!;
    if (war.expiresAt > new Date()) return war;
    // Süre doldu → tamamla
    war.status = "COMPLETED";
    war.winnerClanId = war.scoreA >= war.scoreB ? war.clanAId : war.clanBId;
  }

  // Otomatik başlat (haftalık)
  return startWeeklyClanWar();
}

/** Klan savaşına katkı (PvP kazanma) */
export async function contributeToClanWar(playerId: string, won: boolean, kills: number): Promise<void> {
  const war = await getActiveClanWar();
  if (!war || war.status !== "ACTIVE") return;

  const player = await db.player.findUnique({
    where: { id: playerId },
    select: { clanId: true },
  });
  if (!player?.clanId) return;

  if (player.clanId === war.clanAId) {
    war.scoreA += won ? CLAN_WAR_SCORE_PER_WIN : 0;
    war.scoreA += kills * CLAN_WAR_SCORE_PER_KILL;
  } else if (player.clanId === war.clanBId) {
    war.scoreB += won ? CLAN_WAR_SCORE_PER_WIN : 0;
    war.scoreB += kills * CLAN_WAR_SCORE_PER_KILL;
  }
}

/** Klan savaşı durumu */
export async function getClanWarStatus(playerId: string) {
  const war = await getActiveClanWar();
  if (!war) return { active: false };

  const player = await db.player.findUnique({
    where: { id: playerId },
    select: { clanId: true },
  });

  const playerClanInWar = player?.clanId === war.clanAId || player?.clanId === war.clanBId;

  return {
    active: war.status === "ACTIVE",
    playerClanInWar,
    clanA: { name: war.clanAName, score: war.scoreA },
    clanB: { name: war.clanBName, score: war.scoreB },
    expiresAt: war.expiresAt,
    remainingMs: Math.max(0, war.expiresAt.getTime() - Date.now()),
    durationHours: CLAN_WAR_DURATION_HOURS,
  };
}
