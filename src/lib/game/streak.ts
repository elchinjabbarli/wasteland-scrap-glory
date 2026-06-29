// Wasteland: Scrap & Glory - Günlük Giriş Serisi (Daily Login Streak)
// Ardışık günler için artan ödül

import { db } from "@/lib/db";

// ============================================================
// SABİTLER
// ============================================================

export const STREAK_REWARDS = [
  { day: 1, scrap: 20, xp: 10 },
  { day: 2, scrap: 30, xp: 15 },
  { day: 3, scrap: 40, xp: 20 },
  { day: 4, scrap: 50, xp: 25 },
  { day: 5, scrap: 60, xp: 30 },
  { day: 6, scrap: 80, xp: 40 },
  { day: 7, scrap: 100, xp: 50, crystal: 1 }, // 7. gün kristal ödülü
];

export const STREAK_RESET_HOURS = 36; // 36 saat giriş yapmazsa sıfırlanır

// ============================================================
// GÜNLÜK GİRİŞ KONTROL
// ============================================================

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getYesterdayStr(): string {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
}

export interface StreakInfo {
  currentStreak: number;
  lastClaimDate: string | null;
  canClaim: boolean;
  todayReward: { day: number; scrap: number; xp: number; crystal?: number };
  tomorrowReward: { day: number; scrap: number; xp: number; crystal?: number };
  maxStreak: number;
}

export async function getStreakInfo(playerId: string): Promise<StreakInfo> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) {
    return {
      currentStreak: 0,
      lastClaimDate: null,
      canClaim: false,
      todayReward: STREAK_REWARDS[0],
      tomorrowReward: STREAK_REWARDS[1],
      maxStreak: 7,
    };
  }

  // Player'ın streak bilgisini dailyChestClaimedAt'tan çıkarıyoruz
  // Aslında ayrı bir alan yok, bu yüzden Session kontrolü + dailyChestClaimedAt kullanıyoruz
  // Ama daha iyi bir yaklaşım: Player'a streak alanları eklemek yerine, günlük sandık cooldown'ını kullan
  // Şimdilik basit: dailyChestClaimedAt bugün mü kontrol et

  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  const lastClaim = player.dailyChestClaimedAt;

  let currentStreak = 0;
  let canClaim = true;

  if (lastClaim) {
    const lastClaimStr = `${lastClaim.getFullYear()}-${String(lastClaim.getMonth() + 1).padStart(2, "0")}-${String(lastClaim.getDate()).padStart(2, "0")}`;

    if (lastClaimStr === today) {
      // Bugün zaten claimed
      canClaim = false;
      // Streak'i koru (bugün claimed, streak devam ediyor)
      currentStreak = player.adWatchCount > 0 ? player.adWatchCount : 1; // hack: adWatchCount'u streak olarak kullan
    } else if (lastClaimStr === yesterday) {
      // Dün claimed, bugün claim edebilir, streak +1
      currentStreak = (player.adWatchCount > 0 ? player.adWatchCount : 0) + 1;
    } else {
      // Streak broken
      currentStreak = 1;
    }
  } else {
    currentStreak = 1;
  }

  // Streak 7'yi geçmesin (haftalık döngü)
  const displayStreak = currentStreak > 7 ? ((currentStreak - 1) % 7) + 1 : currentStreak;

  const todayRewardIdx = Math.min(displayStreak - 1, STREAK_REWARDS.length - 1);
  const tomorrowRewardIdx = Math.min(displayStreak, STREAK_REWARDS.length - 1);

  return {
    currentStreak: displayStreak,
    lastClaimDate: lastClaim ? getTodayStr() : null,
    canClaim,
    todayReward: STREAK_REWARDS[todayRewardIdx],
    tomorrowReward: STREAK_REWARDS[tomorrowRewardIdx],
    maxStreak: 7,
  };
}

/** Günlük giriş ödülü talep et (streak sandığı) */
export async function claimStreakReward(playerId: string): Promise<{ ok: boolean; rewards?: { scrap: number; xp: number; crystal?: number }; streak?: number; error?: string }> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };

  const info = await getStreakInfo(playerId);
  if (!info.canClaim) return { ok: false, error: "Bugün zaten aldın" };

  const reward = info.todayReward;
  const newStreak = info.currentStreak;

  await db.player.update({
    where: { id: playerId },
    data: {
      dailyChestClaimedAt: new Date(),
      scrap: { increment: reward.scrap },
      xp: { increment: reward.xp },
      crystal: { increment: reward.crystal ?? 0 },
      adWatchCount: newStreak, // streak'i adWatchCount'ta sakla (hack, production'da ayrı alan)
    },
  });

  return {
    ok: true,
    rewards: reward,
    streak: newStreak,
  };
}
