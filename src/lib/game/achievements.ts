// Wasteland: Scrap & Glory - Başarımlar Sistemi
// 4 kategori, otomatik tetiklenme, puan sistemi

import { db } from "@/lib/db";
import { type Rarity } from "./constants";

// ============================================================
// BAŞARIM TANIMLARI
// ============================================================

export type AchievementCategory = "BATTLE" | "EXPLORATION" | "ECONOMY" | "SOCIAL";

export interface AchievementDef {
  code: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  category: AchievementCategory;
  points: number;
  rarity: Rarity;
  condition: {
    type: "battles_total" | "battles_won" | "kills" | "expeditions_completed" | "items_crafted" | "market_sales" | "prestige" | "level" | "scrap" | "clan" | "friends_count" | "revenge_wins" | "boss_kills" | "items_owned" | "clan_wars";
    target: number;
  };
  icon: string;
}

// 15+ başarım (GDD'den esinlenilmiş)
export const ACHIEVEMENTS: AchievementDef[] = [
  // BATTLE
  {
    code: "first_blood",
    name: { tr: "İlk Kan", en: "First Blood" },
    description: { tr: "İlk savaşını kazan", en: "Win your first battle" },
    category: "BATTLE",
    points: 10,
    rarity: "COMMON",
    condition: { type: "battles_won", target: 1 },
    icon: "Droplet",
  },
  {
    code: "veteran",
    name: { tr: "Gaziler", en: "Veteran" },
    description: { tr: "10 savaş kazan", en: "Win 10 battles" },
    category: "BATTLE",
    points: 25,
    rarity: "RARE",
    condition: { type: "battles_won", target: 10 },
    icon: "Medal",
  },
  {
    code: "serial_killer",
    name: { tr: "Seri Katil", en: "Serial Killer" },
    description: { tr: "50 rakip öldür", en: "Kill 50 opponents" },
    category: "BATTLE",
    points: 50,
    rarity: "EPIC",
    condition: { type: "kills", target: 50 },
    icon: "Skull",
  },
  {
    code: "warlord",
    name: { tr: "Savaş Beyi", en: "Warlord" },
    description: { tr: "100 savaş kazan", en: "Win 100 battles" },
    category: "BATTLE",
    points: 100,
    rarity: "LEGENDARY",
    condition: { type: "battles_won", target: 100 },
    icon: "Crown",
  },
  // EXPLORATION
  {
    code: "traveler",
    name: { tr: "Gezgin", en: "Traveler" },
    description: { tr: "5 sefer tamamla", en: "Complete 5 expeditions" },
    category: "EXPLORATION",
    points: 10,
    rarity: "COMMON",
    condition: { type: "expeditions_completed", target: 5 },
    icon: "Map",
  },
  {
    code: "survivor",
    name: { tr: "Hayatta Kalan", en: "Survivor" },
    description: { tr: "25 sefer tamamla", en: "Complete 25 expeditions" },
    category: "EXPLORATION",
    points: 25,
    rarity: "RARE",
    condition: { type: "expeditions_completed", target: 25 },
    icon: "Camp",
  },
  {
    code: "treasure_hunter",
    name: { tr: "Hazine Avcısı", en: "Treasure Hunter" },
    description: { tr: "100 sefer tamamla", en: "Complete 100 expeditions" },
    category: "EXPLORATION",
    points: 100,
    rarity: "LEGENDARY",
    condition: { type: "expeditions_completed", target: 100 },
    icon: "Gem",
  },
  // ECONOMY
  {
    code: "merchant",
    name: { tr: "Tüccar", en: "Merchant" },
    description: { tr: "10 pazar satışı yap", en: "Make 10 market sales" },
    category: "ECONOMY",
    points: 25,
    rarity: "RARE",
    condition: { type: "market_sales", target: 10 },
    icon: "ShoppingCart",
  },
  {
    code: "craftsman",
    name: { tr: "Üretici", en: "Craftsman" },
    description: { tr: "5 eşya üret", en: "Craft 5 items" },
    category: "ECONOMY",
    points: 10,
    rarity: "COMMON",
    condition: { type: "items_crafted", target: 5 },
    icon: "Hammer",
  },
  {
    code: "master_crafter",
    name: { tr: "Usta Üretici", en: "Master Crafter" },
    description: { tr: "25 eşya üret", en: "Craft 25 items" },
    category: "ECONOMY",
    points: 50,
    rarity: "EPIC",
    condition: { type: "items_crafted", target: 25 },
    icon: "Wrench",
  },
  {
    code: "tycoon",
    name: { tr: "Milyoner", en: "Tycoon" },
    description: { tr: "1000 Hurda biriktir", en: "Accumulate 1000 scrap" },
    category: "ECONOMY",
    points: 25,
    rarity: "RARE",
    condition: { type: "scrap", target: 1000 },
    icon: "Coins",
  },
  // SOCIAL / PROGRESSION
  {
    code: "level_10",
    name: { tr: "Acemi", en: "Rookie" },
    description: { tr: "Seviye 10'a ulaş", en: "Reach level 10" },
    category: "SOCIAL",
    points: 10,
    rarity: "COMMON",
    condition: { type: "level", target: 10 },
    icon: "Star",
  },
  {
    code: "level_50",
    name: { tr: "Deneyimli", en: "Experienced" },
    description: { tr: "Seviye 50'ye ulaş", en: "Reach level 50" },
    category: "SOCIAL",
    points: 50,
    rarity: "EPIC",
    condition: { type: "level", target: 50 },
    icon: "Star",
  },
  {
    code: "first_prestige",
    name: { tr: "Yeniden Doğuş", en: "Rebirth" },
    description: { tr: "İlk prestij yap", en: "Perform your first prestige" },
    category: "SOCIAL",
    points: 100,
    rarity: "LEGENDARY",
    condition: { type: "prestige", target: 1 },
    icon: "Sparkles",
  },
  {
    code: "prestige_5",
    name: { tr: "Ebedi", en: "Eternal" },
    description: { tr: "5. prestije ulaş", en: "Reach prestige 5" },
    category: "SOCIAL",
    points: 100,
    rarity: "LEGENDARY",
    condition: { type: "prestige", target: 5 },
    icon: "Infinity",
  },
  // FAZ 7: GDD'de sayılan eksik başarımlar
  {
    code: "avenger",
    name: { tr: "İntikamcı", en: "Avenger" },
    description: { tr: "1 intikam savaşı kazan", en: "Win 1 revenge battle" },
    category: "BATTLE",
    points: 25,
    rarity: "RARE",
    condition: { type: "revenge_wins", target: 1 },
    icon: "Swords",
  },
  {
    code: "boss_killer",
    name: { tr: "Boss Katili", en: "Boss Killer" },
    description: { tr: "1 raid boss öldür", en: "Defeat 1 raid boss" },
    category: "BATTLE",
    points: 50,
    rarity: "EPIC",
    condition: { type: "boss_kills", target: 1 },
    icon: "Skull",
  },
  {
    code: "collector",
    name: { tr: "Koleksiyoncu", en: "Collector" },
    description: { tr: "50 eşya topla", en: "Collect 50 items" },
    category: "ECONOMY",
    points: 25,
    rarity: "RARE",
    condition: { type: "items_owned", target: 50 },
    icon: "Package",
  },
  {
    code: "leader",
    name: { tr: "Lider", en: "Leader" },
    description: { tr: "Bir klan kur", en: "Create a clan" },
    category: "SOCIAL",
    points: 25,
    rarity: "RARE",
    condition: { type: "clan", target: 1 },
    icon: "Users",
  },
  {
    code: "friendly",
    name: { tr: "Dost Canlısı", en: "Friendly" },
    description: { tr: "5 arkadaş edin", en: "Make 5 friends" },
    category: "SOCIAL",
    points: 25,
    rarity: "RARE",
    condition: { type: "friends_count", target: 5 },
    icon: "Heart",
  },
  {
    code: "clan_warrior",
    name: { tr: "Klan Savaşçısı", en: "Clan Warrior" },
    description: { tr: "1 klan savaşına katıl", en: "Join 1 clan war" },
    category: "SOCIAL",
    points: 50,
    rarity: "EPIC",
    condition: { type: "clan_wars", target: 1 },
    icon: "Shield",
  },
];

// ============================================================
// SEED: Başarımları DB'ye yaz (idempotent)
// ============================================================

export async function seedAchievements() {
  let created = 0;
  for (const ach of ACHIEVEMENTS) {
    const existing = await db.achievement.findUnique({ where: { code: ach.code } });
    if (existing) continue;
    await db.achievement.create({
      data: {
        code: ach.code,
        name: ach.name.tr,
        description: ach.description.tr,
        category: ach.category,
        points: ach.points,
        rarity: ach.rarity,
        condition: JSON.stringify(ach.condition),
        icon: ach.icon,
      },
    });
    created++;
  }
  return created;
}

// ============================================================
// BAŞARIM KONTROL
// ============================================================

export interface CheckResult {
  unlocked: { code: string; name: string; points: number; rarity: string }[];
  totalPoints: number;
}

/** Player'ın tüm stat'larına göre başarım kontrolü */
export async function checkAndUnlockAchievements(playerId: string): Promise<CheckResult> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { unlocked: [], totalPoints: 0 };

  // Player'ın kazandığı başarımlar
  const alreadyUnlocked = await db.playerAchievement.findMany({
    where: { playerId },
    select: { achievementCode: true },
  });
  const unlockedCodes = new Set(alreadyUnlocked.map((a) => a.achievementCode));

  // Toplam sefer sayısı
  const expeditionsCompleted = await db.expedition.count({
    where: { playerId, status: "COMPLETED" },
  });

  // Toplam crafting job
  const itemsCrafted = await db.craftingJob.count({
    where: { playerId, status: "COMPLETED" },
  });

  // Toplam pazar satışı
  const marketSales = await db.marketListing.count({
    where: { sellerId: playerId, status: "SOLD" },
  });

  // Yeni açılacak başarımları bul
  const newlyUnlocked: { code: string; name: string; points: number; rarity: string }[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (unlockedCodes.has(ach.code)) continue;

    let currentValue = 0;
    switch (ach.condition.type) {
      case "battles_total": currentValue = player.battlesTotal; break;
      case "battles_won": currentValue = player.battlesWon; break;
      case "kills": currentValue = player.kills; break;
      case "expeditions_completed": currentValue = expeditionsCompleted; break;
      case "items_crafted": currentValue = itemsCrafted; break;
      case "market_sales": currentValue = marketSales; break;
      case "prestige": currentValue = player.prestige; break;
      case "level": currentValue = player.level; break;
      case "scrap": currentValue = player.scrap; break;
    }

    if (currentValue >= ach.condition.target) {
      await db.playerAchievement.create({
        data: {
          playerId,
          achievementCode: ach.code,
        },
      }).catch(() => {}); // unique constraint es geç
      newlyUnlocked.push({
        code: ach.code,
        name: ach.name.tr,
        points: ach.points,
        rarity: ach.rarity,
      });
    }
  }

  // Toplam puanı güncelle
  const allUnlocked = await db.playerAchievement.findMany({
    where: { playerId },
    include: { achievement: true },
  });
  const totalPoints = allUnlocked.reduce((sum, a) => sum + (a.achievement?.points ?? 0), 0);

  if (newlyUnlocked.length > 0) {
    await db.player.update({
      where: { id: playerId },
      data: { achievementPoints: totalPoints },
    });
  }

  return { unlocked: newlyUnlocked, totalPoints };
}

/** Tüm başarımlar + oyuncunun kazandıkları */
export async function getPlayerAchievements(playerId: string) {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { achievements: [], totalPoints: 0, unlockedCount: 0 };

  // Player'ın kazandığı başarımlar
  const unlocked = await db.playerAchievement.findMany({
    where: { playerId },
    select: { achievementCode: true, unlockedAt: true },
  });
  const unlockedMap = new Map(unlocked.map((u) => [u.achievementCode, u.unlockedAt]));

  // Stat'lar (progress hesabı için)
  const expeditionsCompleted = await db.expedition.count({
    where: { playerId, status: "COMPLETED" },
  });
  const itemsCrafted = await db.craftingJob.count({
    where: { playerId, status: "COMPLETED" },
  });
  const marketSales = await db.marketListing.count({
    where: { sellerId: playerId, status: "SOLD" },
  });

  const achievements = ACHIEVEMENTS.map((ach) => {
    const isUnlocked = unlockedMap.has(ach.code);
    let currentValue = 0;
    switch (ach.condition.type) {
      case "battles_total": currentValue = player.battlesTotal; break;
      case "battles_won": currentValue = player.battlesWon; break;
      case "kills": currentValue = player.kills; break;
      case "expeditions_completed": currentValue = expeditionsCompleted; break;
      case "items_crafted": currentValue = itemsCrafted; break;
      case "market_sales": currentValue = marketSales; break;
      case "prestige": currentValue = player.prestige; break;
      case "level": currentValue = player.level; break;
      case "scrap": currentValue = player.scrap; break;
    }
    return {
      code: ach.code,
      name: ach.name,
      description: ach.description,
      category: ach.category,
      points: ach.points,
      rarity: ach.rarity,
      icon: ach.icon,
      isUnlocked,
      unlockedAt: unlockedMap.get(ach.code) ?? null,
      progress: Math.min(ach.condition.target, currentValue),
      target: ach.condition.target,
    };
  });

  return {
    achievements,
    totalPoints: player.achievementPoints,
    unlockedCount: unlocked.length,
  };
}
