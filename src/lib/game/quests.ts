// Wasteland: Scrap & Glory - Günlük Görevler
// 3 tip, gece yarısı yenilenme, toplu ödül

import { db } from "@/lib/db";

// ============================================================
// GÖREV TİPLERİ
// ============================================================

export type QuestType = "PVP_WINS" | "EXPLORATION_COMPLETE" | "MARKET_TRANSACTION";

export interface QuestDef {
  type: QuestType;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  target: number;
  rewardScrap: number;
  rewardXp: number;
  icon: string;
}

export const QUEST_DEFS: QuestDef[] = [
  {
    type: "PVP_WINS",
    name: { tr: "Savaşçı", en: "Warrior" },
    description: { tr: "3 PvP savaşı kazan", en: "Win 3 PvP battles" },
    target: 3,
    rewardScrap: 50,
    rewardXp: 100,
    icon: "Swords",
  },
  {
    type: "EXPLORATION_COMPLETE",
    name: { tr: "Kaşif", en: "Explorer" },
    description: { tr: "1 sefer tamamla", en: "Complete 1 expedition" },
    target: 1,
    rewardScrap: 30,
    rewardXp: 50,
    icon: "Map",
  },
  {
    type: "MARKET_TRANSACTION",
    name: { tr: "Tüccar", en: "Trader" },
    description: { tr: "1 pazar işlemi yap (al veya sat)", en: "Make 1 market transaction" },
    target: 1,
    rewardScrap: 40,
    rewardXp: 50,
    icon: "ShoppingCart",
  },
];

export const ALL_QUESTS_REWARD_CRYSTAL = 5;

// ============================================================
// GÖREV OLUŞTURMA
// ============================================================

function getTomorrowMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  return tomorrow;
}

function isToday(date: Date | null): boolean {
  if (!date) return false;
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

/** Oyuncunun günlük görevlerini getir — yoksa oluştur */
export async function getDailyQuests(playerId: string) {
  // Bugünün görevleri var mı?
  let quests = await db.dailyQuest.findMany({
    where: {
      playerId,
      expiresAt: { gt: new Date() },
    },
  });

  // Süresi dolmuş görevleri temizle
  const expired = await db.dailyQuest.findMany({
    where: { playerId, expiresAt: { lte: new Date() } },
  });
  if (expired.length > 0) {
    await db.dailyQuest.deleteMany({
      where: { playerId, expiresAt: { lte: new Date() } },
    });
  }

  if (quests.length === 0) {
    // Yeni görevler oluştur
    const expiresAt = getTomorrowMidnight();
    await db.dailyQuest.createMany({
      data: QUEST_DEFS.map((q) => ({
        playerId,
        type: q.type,
        target: q.target,
        progress: 0,
        completed: false,
        rewardScrap: q.rewardScrap,
        rewardXp: q.rewardXp,
        expiresAt,
      })),
    });
    quests = await db.dailyQuest.findMany({
      where: { playerId, expiresAt: { gt: new Date() } },
    });
  }

  const player = await db.player.findUnique({ where: { id: playerId } });
  const allCompleted = quests.every((q) => q.completed);
  const claimedToday = player?.questsClaimedAt ? isToday(player.questsClaimedAt) : false;

  return {
    quests: quests.map((q) => {
      const def = QUEST_DEFS.find((d) => d.type === q.type);
      return {
        id: q.id,
        type: q.type,
        name: def?.name ?? { tr: q.type, en: q.type },
        description: def?.description ?? { tr: "", en: "" },
        target: q.target,
        progress: q.progress,
        completed: q.completed,
        rewardScrap: q.rewardScrap,
        rewardXp: q.rewardXp,
        icon: def?.icon ?? "Circle",
        expiresAt: q.expiresAt,
      };
    }),
    allCompleted,
    claimedToday,
    rewardCrystal: ALL_QUESTS_REWARD_CRYSTAL,
  };
}

// ============================================================
// PROGRESS GÜNCELLEME
// ============================================================

export async function updateQuestProgress(playerId: string, type: QuestType | string, amount: number = 1): Promise<void> {
  const quests = await db.dailyQuest.findMany({
    where: {
      playerId,
      type,
      completed: false,
      expiresAt: { gt: new Date() },
    },
  });
  for (const q of quests) {
    const newProgress = Math.min(q.target, q.progress + amount);
    const completed = newProgress >= q.target;
    await db.dailyQuest.update({
      where: { id: q.id },
      data: { progress: newProgress, completed },
    });
  }
}

// ============================================================
// ÖDÜL TALEP
// ============================================================

export interface ClaimResult {
  ok: boolean;
  rewards?: {
    scrap: number;
    xp: number;
    crystal: number;
  };
  error?: string;
}

export async function claimAllQuests(playerId: string): Promise<ClaimResult> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };

  // Bugün zaten claimed mi?
  if (player.questsClaimedAt && isToday(player.questsClaimedAt)) {
    return { ok: false, error: "Bugün zaten ödül aldın" };
  }

  const { quests, allCompleted } = await getDailyQuests(playerId);
  if (!allCompleted) {
    return { ok: false, error: "Tüm görevleri tamamlamadın" };
  }

  // Toplam ödül
  const totalScrap = quests.reduce((s, q) => s + q.rewardScrap, 0);
  const totalXp = quests.reduce((s, q) => s + q.rewardXp, 0);
  const crystal = ALL_QUESTS_REWARD_CRYSTAL;

  await db.player.update({
    where: { id: playerId },
    data: {
      scrap: { increment: totalScrap },
      xp: { increment: totalXp },
      crystal: { increment: crystal },
      questsClaimedAt: new Date(),
    },
  });

  // Tüm görevleri claimed işaretle
  await db.dailyQuest.updateMany({
    where: { playerId, expiresAt: { gt: new Date() } },
    data: { claimedAt: new Date() },
  });

  return {
    ok: true,
    rewards: {
      scrap: totalScrap,
      xp: totalXp,
      crystal,
    },
  };
}
