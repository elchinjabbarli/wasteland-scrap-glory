// Wasteland: Scrap & Glory - Anti-Cheat
// Rate limit, anormal kazanç tespit, otomatik ban

import { db } from "@/lib/db";

// ============================================================
// LIMITLER (GDD'den)
// ============================================================

export const RATE_LIMITS = {
  PVP_PER_HOUR: 100, // 1 saatte 100+ PvP = flag
  SCRAP_PER_HOUR: 10000, // 1 saatte 10x normal = flag
  MARKET_LISTINGS_PER_HOUR: 50, // 1 saatte 50+ ilan = pazar yasağı
  CRAFT_PER_HOUR: 30,
  EXPEDITION_PER_HOUR: 10,
};

export const FLAG_BAN_THRESHOLD = 3; // 3 flag = 24 saat ban
export const BAN_DURATION_HOURS = 24;

// ============================================================
// RATE LIMIT KONTROL
// ============================================================

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  flagged?: boolean;
}

/** Player'ın son 1 saatteki aksiyon sayısını kontrol et */
export async function checkRateLimit(
  playerId: string,
  action: "PVP" | "SCRAP_GAIN" | "MARKET_LISTING" | "CRAFT" | "EXPEDITION",
  amount: number = 1
): Promise<RateLimitResult> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { allowed: false, reason: "Player bulunamadı" };

  // Banlı mı?
  if (player.bannedUntil && player.bannedUntil > new Date()) {
    return {
      allowed: false,
      reason: `Hesabın banlı (${player.bannedUntil.toLocaleString()})`,
    };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Aksiyona göre count
  let count = 0;
  switch (action) {
    case "PVP":
      count = await db.combatLog.count({
        where: { playerAId: playerId, createdAt: { gt: oneHourAgo } },
      });
      if (count + amount > RATE_LIMITS.PVP_PER_HOUR) {
        await flagPlayer(playerId, `Hızlı savaş: ${count + amount}/sa (limit ${RATE_LIMITS.PVP_PER_HOUR})`);
        return { allowed: false, reason: "Çok hızlı savaş! Flag atıldı.", flagged: true };
      }
      break;
    case "MARKET_LISTING":
      count = await db.marketListing.count({
        where: { sellerId: playerId, createdAt: { gt: oneHourAgo } },
      });
      if (count + amount > RATE_LIMITS.MARKET_LISTINGS_PER_HOUR) {
        await flagPlayer(playerId, `Karaborsa manipülasyonu: ${count + amount}/sa (limit ${RATE_LIMITS.MARKET_LISTINGS_PER_HOUR})`);
        return { allowed: false, reason: "Pazar yasağı! Çok hızlı ilan.", flagged: true };
      }
      break;
    case "CRAFT":
      count = await db.craftingJob.count({
        where: { playerId, createdAt: { gt: oneHourAgo } },
      });
      if (count + amount > RATE_LIMITS.CRAFT_PER_HOUR) {
        return { allowed: false, reason: "Çok hızlı üretim" };
      }
      break;
    case "EXPEDITION":
      count = await db.expedition.count({
        where: { playerId, createdAt: { gt: oneHourAgo } },
      });
      if (count + amount > RATE_LIMITS.EXPEDITION_PER_HOUR) {
        return { allowed: false, reason: "Çok hızlı sefer" };
      }
      break;
    case "SCRAP_GAIN":
      // Player'ın son 1 saatteki scrap kazanımını CombatLog + Expedition'tan hesapla
      const recentCombats = await db.combatLog.aggregate({
        where: { playerAId: playerId, createdAt: { gt: oneHourAgo } },
        _sum: { scrapGained: true },
      });
      const recentExpeditions = await db.expedition.aggregate({
        where: { playerId, status: "COMPLETED", resolvedAt: { gt: oneHourAgo } },
        _sum: { scrapReward: true },
      });
      count = (recentCombats._sum.scrapGained ?? 0) + (recentExpeditions._sum.scrapReward ?? 0);
      if (count + amount > RATE_LIMITS.SCRAP_PER_HOUR) {
        await flagPlayer(playerId, `Anormal kazanç: ${count + amount} hurda/sa (limit ${RATE_LIMITS.SCRAP_PER_HOUR})`);
        // İzin ver ama flag at (inceleme için)
        return { allowed: true, flagged: true };
      }
      break;
  }

  return { allowed: true };
}

// ============================================================
// FLAG & BAN
// ============================================================

export async function flagPlayer(playerId: string, reason: string): Promise<void> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return;

  const newFlagCount = player.flagCount + 1;
  const now = new Date();

  // 3 flag = 24 saat ban
  if (newFlagCount >= FLAG_BAN_THRESHOLD) {
    const bannedUntil = new Date(now.getTime() + BAN_DURATION_HOURS * 60 * 60 * 1000);
    await db.player.update({
      where: { id: playerId },
      data: {
        flagCount: 0, // ban sonrası sıfırla
        bannedUntil,
        lastFlagAt: now,
      },
    });
    console.warn(`[ANTI-CHEAT] Player ${playerId} banned for ${BAN_DURATION_HOURS}h. Reason: ${reason}`);
  } else {
    await db.player.update({
      where: { id: playerId },
      data: {
        flagCount: newFlagCount,
        lastFlagAt: now,
      },
    });
    console.warn(`[ANTI-CHEAT] Player ${playerId} flagged (${newFlagCount}/${FLAG_BAN_THRESHOLD}). Reason: ${reason}`);
  }
}

/** Ban durumunu kontrol et — API middleware'lerde kullanılabilir */
export async function checkBanStatus(playerId: string): Promise<{ banned: boolean; bannedUntil?: Date; reason?: string }> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { banned: false };
  if (player.bannedUntil && player.bannedUntil > new Date()) {
    return { banned: true, bannedUntil: player.bannedUntil };
  }
  return { banned: false };
}
