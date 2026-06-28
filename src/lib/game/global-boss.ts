// Wasteland: Scrap & Glory - Haftalık Global Boss
// GDD: HP: 1.000.000, ilk 100 hasarcıya Legendary eşya

import { db } from "@/lib/db";
import { MAX_DURABILITY } from "./constants";
import { generateRandomItem } from "./loot";

// ============================================================
// GLOBAL BOSS TANIMLARI
// ============================================================

export interface GlobalBossDef {
  code: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  maxHp: number;
  icon: string;
  color: string;
}

export const GLOBAL_BOSSES: GlobalBossDef[] = [
  {
    code: "wasteland_tyrant",
    name: { tr: "Çorak Tyran", en: "Wasteland Tyrant" },
    description: { tr: "Çorak arazinin efendisi. 1M HP.", en: "Master of the wasteland. 1M HP." },
    maxHp: 1_000_000,
    icon: "Skull",
    color: "#ef4444",
  },
  {
    code: "radyasyon_colossus",
    name: { tr: "Radyasyon Kolosus", en: "Radiation Colossus" },
    description: { tr: "Devasa radyasyon canavarı.", en: "Massive radiation beast." },
    maxHp: 1_500_000,
    icon: "Radiation",
    color: "#84cc16",
  },
];

export const GLOBAL_BOSS_TOP_REWARD_COUNT = 100; // ilk 100'e Legendary
export const GLOBAL_BOSS_ATTACK_COOLDOWN_SEC = 30;

// ============================================================
// HAFTALIK BOSS ÜRET
// ============================================================

function getWeekStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getNextSundayMidnight(): Date {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysUntilSunday);
  sunday.setHours(24, 0, 0, 0);
  if (sunday <= now) {
    sunday.setDate(sunday.getDate() + 7);
  }
  return sunday;
}

export async function getCurrentGlobalBoss() {
  const week = getWeekStr();
  let boss = await db.globalBoss.findUnique({
    where: { week },
    include: {
      contributions: {
        include: {
          player: { select: { id: true, name: true, faction: true, level: true } },
        },
        orderBy: { damage: "desc" },
        take: 100,
      },
    },
  });

  if (!boss) {
    // Yeni boss oluştur — haftalık rotasyon
    const bossDef = GLOBAL_BOSSES[Object.keys({ week }).length % GLOBAL_BOSSES.length] ?? GLOBAL_BOSSES[0];
    const expiresAt = getNextSundayMidnight();
    boss = await db.globalBoss.create({
      data: {
        week,
        code: bossDef.code,
        name: bossDef.name.tr,
        maxHp: bossDef.maxHp,
        currentHp: bossDef.maxHp,
        expiresAt,
        status: "ACTIVE",
      },
      include: { contributions: true },
    }).catch(async () => {
      // Race condition — yeniden getir
      return await db.globalBoss.findUnique({
        where: { week },
        include: {
          contributions: {
            include: {
              player: { select: { id: true, name: true, faction: true, level: true } },
            },
            orderBy: { damage: "desc" },
            take: 100,
          },
        },
      });
    });
  }

  if (!boss) return null;

  // Süre dolmuş ama hala ACTIVE ise → EXPIRED yap
  if (boss.status === "ACTIVE" && boss.expiresAt < new Date()) {
    await db.globalBoss.update({
      where: { id: boss.id },
      data: { status: "EXPIRED", resolvedAt: new Date() },
    });
    boss.status = "EXPIRED";
  }

  return {
    id: boss.id,
    week: boss.week,
    code: boss.code,
    name: boss.name,
    maxHp: boss.maxHp,
    currentHp: boss.currentHp,
    startedAt: boss.startedAt,
    expiresAt: boss.expiresAt,
    status: boss.status,
    remainingMs: Math.max(0, boss.expiresAt.getTime() - Date.now()),
    progress: ((boss.maxHp - boss.currentHp) / boss.maxHp) * 100,
    topContributors: (boss.contributions ?? []).map((c, i) => ({
      rank: i + 1,
      playerId: c.player.id,
      name: c.player.name,
      faction: c.player.faction,
      level: c.player.level,
      damage: c.damage,
      attacks: c.attacks,
    })),
  };
}

// ============================================================
// SALDIRI
// ============================================================

export interface AttackGlobalBossResult {
  ok: boolean;
  damage?: number;
  defeated?: boolean;
  newCurrentHp?: number;
  reward?: { xp: number; scrap: number; item?: { name: string; rarity: string } };
  error?: string;
  rank?: number;
}

export async function attackGlobalBoss(playerId: string): Promise<AttackGlobalBossResult> {
  const boss = await getCurrentGlobalBoss();
  if (!boss) return { ok: false, error: "Boss bulunamadı" };
  if (boss.status !== "ACTIVE") return { ok: false, error: "Boss aktif değil" };

  const player = await db.player.findUnique({
    where: { id: playerId },
    include: {
      loadout: {
        include: {
          weaponItem: true,
          armorItem: true,
          sideToolItem: true,
          companionItem: true,
        },
      },
    },
  });
  if (!player) return { ok: false, error: "Player bulunamadı" };
  if (!player.loadout?.weaponItem) return { ok: false, error: "Silah kuşan gerekli" };

  // Cooldown
  const existing = await db.globalBossContribution.findUnique({
    where: { globalBossId_playerId: { globalBossId: boss.id, playerId } },
  });
  if (existing) {
    const elapsed = Date.now() - existing.updatedAt.getTime();
    if (elapsed < GLOBAL_BOSS_ATTACK_COOLDOWN_SEC * 1000) {
      const remaining = Math.ceil((GLOBAL_BOSS_ATTACK_COOLDOWN_SEC * 1000 - elapsed) / 1000);
      return { ok: false, error: `Cooldown: ${remaining}sn` };
    }
  }

  // Damage = weapon damage * (1 + str * 0.05) * random(0.8, 1.2)
  const weapon = player.loadout.weaponItem;
  const baseDamage = weapon.baseDamage * (1 + player.str * 0.05);
  const damage = Math.floor(baseDamage * (0.8 + Math.random() * 0.4));

  const newHp = Math.max(0, boss.currentHp - damage);
  const defeated = newHp === 0;

  // Contribution güncelle
  if (existing) {
    await db.globalBossContribution.update({
      where: { id: existing.id },
      data: {
        damage: { increment: damage },
        attacks: { increment: 1 },
      },
    });
  } else {
    await db.globalBossContribution.create({
      data: {
        globalBossId: boss.id,
        playerId,
        damage,
        attacks: 1,
      },
    });
  }

  // Boss HP güncelle
  await db.globalBoss.update({
    where: { id: boss.id },
    data: {
      currentHp: newHp,
      status: defeated ? "DEFEATED" : "ACTIVE",
      resolvedAt: defeated ? new Date() : null,
    },
  });

  // XP ödülü
  const xpReward = 100 + Math.floor(damage / 50);
  const scrapReward = 50 + Math.floor(damage / 100);
  await db.player.update({
    where: { id: playerId },
    data: {
      xp: { increment: xpReward },
      scrap: { increment: scrapReward },
    },
  });

  // Eğer boss yenildiyse ve player top 100'deyse Legendary
  let rewardItem: { name: string; rarity: string } | undefined;
  let rank: number | undefined;
  if (defeated) {
    const topContribs = await db.globalBossContribution.findMany({
      where: { globalBossId: boss.id },
      orderBy: { damage: "desc" },
      take: GLOBAL_BOSS_TOP_REWARD_COUNT,
    });
    const playerRank = topContribs.findIndex((c) => c.playerId === playerId);
    if (playerRank >= 0) {
      rank = playerRank + 1;
      const generated = generateRandomItem(undefined, "LEGENDARY");
      let template = await db.itemTemplate.findUnique({ where: { code: generated.templateCode } });
      if (!template) {
        template = await db.itemTemplate.create({
          data: {
            code: generated.templateCode,
            name: generated.name,
            slot: generated.slot,
            element: generated.element,
            tier: generated.rarity,
            baseDamageMin: generated.baseDamage,
            baseDamageMax: generated.baseDamage,
            baseArmorMin: generated.baseArmor,
            baseArmorMax: generated.baseArmor,
            baseHpBonusMin: generated.baseHpBonus,
            baseHpBonusMax: generated.baseHpBonus,
            attackSpeed: generated.attackSpeed,
            companionHp: generated.companionHp,
            companionDamage: generated.companionDamage,
            effectType: generated.effectType,
            effectChance: generated.effectChance,
            effectDuration: generated.effectDuration,
            icon: generated.icon,
          },
        });
      }
      const newItem = await db.item.create({
        data: {
          templateId: template.id,
          ownerId: playerId,
          name: generated.name,
          prefix: generated.prefix,
          suffix: generated.suffix,
          rarity: generated.rarity,
          element: generated.element,
          baseDamage: generated.baseDamage,
          baseArmor: generated.baseArmor,
          baseHpBonus: generated.baseHpBonus,
          attackSpeed: generated.attackSpeed,
          companionHp: generated.companionHp,
          companionDamage: generated.companionDamage,
          effectType: generated.effectType,
          effectChance: generated.effectChance,
          effectDuration: generated.effectDuration,
          upgradeLevel: 0,
          durability: MAX_DURABILITY,
          state: "IN_INVENTORY",
          protected: true, // Legendary ödül korumalı
          icon: generated.icon,
        },
      });
      rewardItem = { name: newItem.name, rarity: newItem.rarity };
    }
  }

  return {
    ok: true,
    damage,
    defeated,
    newCurrentHp: newHp,
    rank,
    reward: {
      xp: xpReward,
      scrap: scrapReward,
      item: rewardItem,
    },
  };
}
