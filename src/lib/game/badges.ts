// Wasteland: Scrap & Glory - Rozet & Unvan Sistemi

import { db } from "@/lib/db";

// ============================================================
// ROZET TANIMLARI
// ============================================================

export interface BadgeDef {
  code: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  icon: string;
  color: string;
  condition: {
    type: "battles_won" | "kills" | "prestige" | "level" | "expeditions" | "crafts" | "clan" | "raid_kills" | "gold";
    target: number;
  };
}

export const BADGES: BadgeDef[] = [
  {
    code: "first_blood_badge",
    name: { tr: "İlk Kan Rozeti", en: "First Blood Badge" },
    description: { tr: "İlk savaşını kazan", en: "Win your first battle" },
    icon: "Droplet",
    color: "#ef4444",
    condition: { type: "battles_won", target: 1 },
  },
  {
    code: "warrior_badge",
    name: { tr: "Savaşçı Rozeti", en: "Warrior Badge" },
    description: { tr: "10 savaş kazan", en: "Win 10 battles" },
    icon: "Swords",
    color: "#f59e0b",
    condition: { type: "battles_won", target: 10 },
  },
  {
    code: "killer_badge",
    name: { tr: "Katil Rozeti", en: "Killer Badge" },
    description: { tr: "50 rakip öldür", en: "Kill 50 opponents" },
    icon: "Skull",
    color: "#dc2626",
    condition: { type: "kills", target: 50 },
  },
  {
    code: "legend_badge",
    name: { tr: "Efsane Rozeti", en: "Legend Badge" },
    description: { tr: "100 savaş kazan", en: "Win 100 battles" },
    icon: "Crown",
    color: "#fbbf24",
    condition: { type: "battles_won", target: 100 },
  },
  {
    code: "explorer_badge",
    name: { tr: "Kaşif Rozeti", en: "Explorer Badge" },
    description: { tr: "10 sefer tamamla", en: "Complete 10 expeditions" },
    icon: "MapPin",
    color: "#06b6d4",
    condition: { type: "expeditions", target: 10 },
  },
  {
    code: "crafter_badge",
    name: { tr: "Üretici Rozeti", en: "Crafter Badge" },
    description: { tr: "10 eşya üret", en: "Craft 10 items" },
    icon: "Hammer",
    color: "#84cc16",
    condition: { type: "crafts", target: 10 },
  },
  {
    code: "prestige_badge",
    name: { tr: "Prestij Rozeti", en: "Prestige Badge" },
    description: { tr: "İlk prestij yap", en: "Perform first prestige" },
    icon: "Star",
    color: "#a855f7",
    condition: { type: "prestige", target: 1 },
  },
  {
    code: "eternal_badge",
    name: { tr: "Ebedi Rozeti", en: "Eternal Badge" },
    description: { tr: "5. prestije ulaş", en: "Reach prestige 5" },
    icon: "Infinity",
    color: "#ec4899",
    condition: { type: "prestige", target: 5 },
  },
  {
    code: "clan_leader_badge",
    name: { tr: "Klan Lideri Rozeti", en: "Clan Leader Badge" },
    description: { tr: "Bir klan kur", en: "Create a clan" },
    icon: "Users",
    color: "#3b82f6",
    condition: { type: "clan", target: 1 },
  },
  {
    code: "rich_badge",
    name: { tr: "Zengin Rozeti", en: "Tycoon Badge" },
    description: { tr: "5000 Hurda biriktir", en: "Accumulate 5000 scrap" },
    icon: "Coins",
    color: "#facc15",
    condition: { type: "gold", target: 5000 },
  },
];

// ============================================================
// UNVAN TANIMLARI
// ============================================================

export interface TitleDef {
  code: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  condition: {
    type: "level" | "battles_won" | "prestige" | "kills" | "clan_leader" | "raid_winner";
    target: number;
  };
  color: string;
}

export const TITLES: TitleDef[] = [
  {
    code: "rookie",
    name: { tr: "Çaylak", en: "Rookie" },
    description: { tr: "Başlangıç unvanı", en: "Starting title" },
    condition: { type: "level", target: 1 },
    color: "#9ca3af",
  },
  {
    code: "scout",
    name: { tr: "Gözcü", en: "Scout" },
    description: { tr: "Seviye 10'a ulaş", en: "Reach level 10" },
    condition: { type: "level", target: 10 },
    color: "#06b6d4",
  },
  {
    code: "warrior",
    name: { tr: "Savaşçı", en: "Warrior" },
    description: { tr: "Seviye 25'e ulaş", en: "Reach level 25" },
    condition: { type: "level", target: 25 },
    color: "#f59e0b",
  },
  {
    code: "veteran",
    name: { tr: "Gazi", en: "Veteran" },
    description: { tr: "Seviye 50'ye ulaş", en: "Reach level 50" },
    condition: { type: "level", target: 50 },
    color: "#a855f7",
  },
  {
    code: "champion",
    name: { tr: "Şampiyon", en: "Champion" },
    description: { tr: "100 savaş kazan", en: "Win 100 battles" },
    condition: { type: "battles_won", target: 100 },
    color: "#fbbf24",
  },
  {
    code: "legend",
    name: { tr: "Efsane", en: "Legend" },
    description: { tr: "Seviye 100'e ulaş", en: "Reach level 100" },
    condition: { type: "level", target: 100 },
    color: "#ec4899",
  },
  {
    code: "reborn",
    name: { tr: "Yeniden Doğmuş", en: "Reborn" },
    description: { tr: "İlk prestij", en: "First prestige" },
    condition: { type: "prestige", target: 1 },
    color: "#10b981",
  },
  {
    code: "slayer",
    name: { tr: "Katliamcı", en: "Slayer" },
    description: { tr: "200 rakip öldür", en: "Kill 200 opponents" },
    condition: { type: "kills", target: 200 },
    color: "#dc2626",
  },
  {
    code: "clan_lord",
    name: { tr: "Klan Beyi", en: "Clan Lord" },
    description: { tr: "Klan lideri ol", en: "Become a clan leader" },
    condition: { type: "clan_leader", target: 1 },
    color: "#3b82f6",
  },
];

// ============================================================
// KONTROL VE AÇMA
// ============================================================

export interface CheckResult {
  newBadges: { code: string; name: { tr: string; en: string }; color: string }[];
  newTitles: { code: string; name: { tr: string; en: string }; color: string }[];
}

export async function checkAndUnlockBadgesTitles(playerId: string): Promise<CheckResult> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { newBadges: [], newTitles: [] };

  // Stat'ları topla
  const expeditions = await db.expedition.count({ where: { playerId, status: "COMPLETED" } });
  const crafts = await db.craftingJob.count({ where: { playerId, status: "COMPLETED" } });
  const isClanLeader = await db.clanMember.findFirst({
    where: { playerId, role: "LEADER" },
  });

  // Mevcut rozetler
  const existingBadges = await db.playerBadge.findMany({
    where: { playerId },
    select: { badgeCode: true },
  });
  const badgeSet = new Set(existingBadges.map((b) => b.badgeCode));

  // Mevcut unvanlar
  const existingTitles = await db.playerTitle.findMany({
    where: { playerId },
    select: { titleCode: true },
  });
  const titleSet = new Set(existingTitles.map((t) => t.titleCode));

  const newBadges: { code: string; name: { tr: string; en: string }; color: string }[] = [];
  const newTitles: { code: string; name: { tr: string; en: string }; color: string }[] = [];

  // Rozet kontrolü
  for (const badge of BADGES) {
    if (badgeSet.has(badge.code)) continue;
    let cur = 0;
    switch (badge.condition.type) {
      case "battles_won": cur = player.battlesWon; break;
      case "kills": cur = player.kills; break;
      case "prestige": cur = player.prestige; break;
      case "level": cur = player.level; break;
      case "expeditions": cur = expeditions; break;
      case "crafts": cur = crafts; break;
      case "clan": cur = isClanLeader ? 1 : 0; break;
      case "gold": cur = player.scrap; break;
    }
    if (cur >= badge.condition.target) {
      await db.playerBadge.create({
        data: { playerId, badgeCode: badge.code },
      }).catch(() => {});
      newBadges.push({ code: badge.code, name: badge.name, color: badge.color });
    }
  }

  // Unvan kontrolü
  for (const title of TITLES) {
    if (titleSet.has(title.code)) continue;
    let cur = 0;
    switch (title.condition.type) {
      case "level": cur = player.level; break;
      case "battles_won": cur = player.battlesWon; break;
      case "prestige": cur = player.prestige; break;
      case "kills": cur = player.kills; break;
      case "clan_leader": cur = isClanLeader ? 1 : 0; break;
    }
    if (cur >= title.condition.target) {
      await db.playerTitle.create({
        data: { playerId, titleCode: title.code },
      }).catch(() => {});
      newTitles.push({ code: title.code, name: title.name, color: title.color });
    }
  }

  // Eğer aktif unvan yoksa ve "rookie" açıksa, varsayılan yap
  if (!player.activeTitle && newTitles.length > 0) {
    const rookie = newTitles.find((t) => t.code === "rookie") ?? newTitles[0];
    await db.player.update({
      where: { id: playerId },
      data: { activeTitle: rookie.code },
    });
  }

  return { newBadges, newTitles };
}

// ============================================================
// GETİRME
// ============================================================

export async function getPlayerBadgesTitles(playerId: string) {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return null;

  const [unlockedBadges, unlockedTitles] = await Promise.all([
    db.playerBadge.findMany({ where: { playerId }, select: { badgeCode: true, unlockedAt: true } }),
    db.playerTitle.findMany({ where: { playerId }, select: { titleCode: true, unlockedAt: true } }),
  ]);
  const badgeSet = new Set(unlockedBadges.map((b) => b.badgeCode));
  const titleSet = new Set(unlockedTitles.map((t) => t.titleCode));

  return {
    badges: BADGES.map((b) => ({
      ...b,
      isUnlocked: badgeSet.has(b.code),
      unlockedAt: unlockedBadges.find((ub) => ub.badgeCode === b.code)?.unlockedAt ?? null,
    })),
    titles: TITLES.map((t) => ({
      ...t,
      isUnlocked: titleSet.has(t.code),
      unlockedAt: unlockedTitles.find((ut) => ut.titleCode === t.code)?.unlockedAt ?? null,
    })),
    activeTitle: player.activeTitle,
  };
}

export async function setActiveTitle(playerId: string, titleCode: string): Promise<{ ok: boolean; error?: string }> {
  const titleDef = TITLES.find((t) => t.code === titleCode);
  if (!titleDef) return { ok: false, error: "Geçersiz unvan" };

  const owned = await db.playerTitle.findUnique({
    where: { playerId_titleCode: { playerId, titleCode } },
  });
  if (!owned) return { ok: false, error: "Bu unvana sahip değilsin" };

  await db.player.update({
    where: { id: playerId },
    data: { activeTitle: titleCode },
  });

  return { ok: true };
}
