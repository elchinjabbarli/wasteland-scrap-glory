// Wasteland: Scrap & Glory - Günlük Ödüller & Reklam Sistemi

import { db } from "@/lib/db";

// ============================================================
// GÜNLÜK SANDIK
// ============================================================

export const DAILY_CHEST_COOLDOWN_HOURS = 20;
export const DAILY_CHEST_AD_DOUBLE = true; // GDD 13.1: Reklam ile 2x yapılabilir

export interface DailyChestResult {
  ok: boolean;
  rewards?: {
    scrap: number;
    electronic: number;
    techPart: number;
    crystal: number;
    doubled?: boolean; // reklam ile 2x
  };
  nextClaimAt?: Date;
  error?: string;
}

/** Sandık aç — withAd parametresi ile 2x ödül (GDD 13.1) */
export async function claimDailyChest(playerId: string, withAd: boolean = false): Promise<DailyChestResult> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };

  // Cooldown kontrolü
  if (player.dailyChestClaimedAt) {
    const cooldownMs = DAILY_CHEST_COOLDOWN_HOURS * 60 * 60 * 1000;
    const elapsed = Date.now() - player.dailyChestClaimedAt.getTime();
    if (elapsed < cooldownMs) {
      const remaining = cooldownMs - elapsed;
      return {
        ok: false,
        error: `Sandık ${Math.ceil(remaining / (60 * 60 * 1000))} saat sonra hazır`,
        nextClaimAt: new Date(player.dailyChestClaimedAt.getTime() + cooldownMs),
      };
    }
  }

  // Ödül rastgele (level'e ölçekli)
  const level = player.level;
  let rewards = {
    scrap: 50 + level * 5 + Math.floor(Math.random() * 50),
    electronic: Math.floor(level / 5) + Math.floor(Math.random() * 3),
    techPart: Math.random() < 0.3 ? 1 : 0, // %30 şans
    crystal: Math.random() < 0.1 ? 1 : 0, // %10 şans
    doubled: false,
  };

  // GDD 13.1: Reklam ile 2x
  if (withAd && DAILY_CHEST_AD_DOUBLE) {
    rewards = {
      scrap: rewards.scrap * 2,
      electronic: rewards.electronic * 2,
      techPart: rewards.techPart * 2,
      crystal: rewards.crystal * 2,
      doubled: true,
    };
  }

  await db.player.update({
    where: { id: playerId },
    data: {
      dailyChestClaimedAt: new Date(),
      scrap: { increment: rewards.scrap },
      electronic: { increment: rewards.electronic },
      techPart: { increment: rewards.techPart },
      crystal: { increment: rewards.crystal },
    },
  });

  return { ok: true, rewards };
}

export async function getDailyChestStatus(playerId: string) {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { canClaim: false };

  if (!player.dailyChestClaimedAt) return { canClaim: true, nextClaimAt: null };

  const cooldownMs = DAILY_CHEST_COOLDOWN_HOURS * 60 * 60 * 1000;
  const elapsed = Date.now() - player.dailyChestClaimedAt.getTime();
  const canClaim = elapsed >= cooldownMs;
  return {
    canClaim,
    nextClaimAt: canClaim ? null : new Date(player.dailyChestClaimedAt.getTime() + cooldownMs),
    lastClaimAt: player.dailyChestClaimedAt,
  };
}

// ============================================================
// REKLAM İZLEME ÖDÜLÜ
// ============================================================

export const MAX_DAILY_AD_WATCHES = 3;

export interface AdWatchResult {
  ok: boolean;
  rewards?: {
    scrap: number;
    crystal: number;
  };
  remainingWatches?: number;
  error?: string;
}

export async function watchAd(playerId: string): Promise<AdWatchResult> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };

  // Günlük reset
  const now = new Date();
  if (!player.adWatchResetAt || player.adWatchResetAt < now) {
    // Yeni gün — reset
    const nextReset = new Date(now);
    nextReset.setHours(24, 0, 0, 0); // gece yarısı
    await db.player.update({
      where: { id: playerId },
      data: { adWatchCount: 0, adWatchResetAt: nextReset },
    });
    player.adWatchCount = 0;
  }

  if (player.adWatchCount >= MAX_DAILY_AD_WATCHES) {
    return {
      ok: false,
      error: `Günlük limit dolu (${MAX_DAILY_AD_WATCHES}/${MAX_DAILY_AD_WATCHES})`,
      remainingWatches: 0,
    };
  }

  // Ödül
  const rewards = {
    scrap: 30 + player.level * 3 + Math.floor(Math.random() * 20),
    crystal: Math.random() < 0.2 ? 1 : 0, // %20 şans
  };

  await db.player.update({
    where: { id: playerId },
    data: {
      adWatchCount: { increment: 1 },
      scrap: { increment: rewards.scrap },
      crystal: { increment: rewards.crystal },
    },
  });

  return {
    ok: true,
    rewards,
    remainingWatches: MAX_DAILY_AD_WATCHES - player.adWatchCount - 1,
  };
}

export async function getAdWatchStatus(playerId: string) {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { remaining: 0, resetAt: null };

  const now = new Date();
  if (!player.adWatchResetAt || player.adWatchResetAt < now) {
    return { remaining: MAX_DAILY_AD_WATCHES, resetAt: null };
  }
  return {
    remaining: Math.max(0, MAX_DAILY_AD_WATCHES - player.adWatchCount),
    resetAt: player.adWatchResetAt,
  };
}
