// Wasteland: Scrap & Glory - Raid Boss Sistemi
// GDD: Boss HP = üye_sayısı * 10000, 24 saat sürer

import { db } from "@/lib/db";
import { compilePlayerStats } from "./player-stats";
import { simulateCombat, type CombatResult } from "./combat";
import { generateMockOpponent } from "./player-stats";
import { raidRewardBonus } from "./stats";

// ============================================================
// RAID BOSS TANIMLARI
// ============================================================

export interface RaidBossDef {
  code: string;
  name: string;
  description: { tr: string; en: string };
  hpMultiplier: number; // base = üye_sayısı * 10000, bu çarpan ile scale
  icon: string;
  color: string;
  minClanLevel: number;
}

export const RAID_BOSSES: Record<string, RaidBossDef> = {
  mutant_titan: {
    code: "mutant_titan",
    name: "Mutant Titan",
    description: { tr: "Devasa mutant. Yüksek HP, orta hasar.", en: "Massive mutant. High HP, medium damage." },
    hpMultiplier: 1.0,
    icon: "Skull",
    color: "#84cc16",
    minClanLevel: 1,
  },
  radyasyon_demon: {
    code: "radyasyon_demon",
    name: "Radyasyon Şeytanı",
    description: { tr: "Radyasyonla bozulmuş iblis. Element saldırıları.", en: "Radiation-corrupted demon. Elemental attacks." },
    hpMultiplier: 1.5,
    icon: "Radiation",
    color: "#facc15",
    minClanLevel: 2,
  },
  nuklear_dev: {
    code: "nuklear_dev",
    name: "Nükleer Dev",
    description: { tr: "Nükleer santralin koruyucusu. En yüksek HP.", en: "Guardian of the nuclear plant. Highest HP." },
    hpMultiplier: 2.0,
    icon: "Zap",
    color: "#ef4444",
    minClanLevel: 3,
  },
};

export const RAID_DURATION_HOURS = 24;
export const RAID_ATTACK_COOLDOWN_SEC = 60; // her raid için 1 dakika cooldown

// ============================================================
// RAID BAŞLATMA
// ============================================================

export interface StartRaidResult {
  ok: boolean;
  raid?: { id: string; bossName: string; maxHp: number; expiresAt: Date };
  error?: string;
}

export async function startRaid(playerId: string, bossCode: string): Promise<StartRaidResult> {
  const bossDef = RAID_BOSSES[bossCode];
  if (!bossDef) return { ok: false, error: "Geçersiz boss" };

  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };
  if (!player.clanId) return { ok: false, error: "Klan gerekli" };

  // Klan bilgisini al
  const clan = await db.clan.findUnique({
    where: { id: player.clanId },
    include: { _count: { select: { members: true } } },
  });
  if (!clan) return { ok: false, error: "Klan bulunamadı" };
  if (clan._count.members < 5) return { ok: false, error: "Raid için en az 5 üye gerekli" };
  if (clan.level < bossDef.minClanLevel) return { ok: false, error: `Klan seviyesi ${bossDef.minClanLevel} gerekli` };

  // Aktif raid var mı?
  const activeRaid = await db.raidBoss.findFirst({
    where: { clanId: clan.id, status: "ACTIVE" },
  });
  if (activeRaid) return { ok: false, error: "Zaten aktif raid var" };

  // Boss HP = üye_sayısı * 10000 * hpMultiplier
  const maxHp = Math.floor(clan._count.members * 10000 * bossDef.hpMultiplier);
  const expiresAt = new Date(Date.now() + RAID_DURATION_HOURS * 60 * 60 * 1000);

  const raid = await db.raidBoss.create({
    data: {
      clanId: clan.id,
      code: bossCode,
      name: bossDef.name,
      maxHp,
      currentHp: maxHp,
      expiresAt,
      status: "ACTIVE",
    },
  });

  return {
    ok: true,
    raid: {
      id: raid.id,
      bossName: raid.name,
      maxHp,
      expiresAt,
    },
  };
}

// ============================================================
// RAID SALDIRI
// ============================================================

export interface AttackRaidResult {
  ok: boolean;
  damage?: number;
  defeated?: boolean;
  newCurrentHp?: number;
  reward?: { xp: number; scrap: number; item?: { name: string; rarity: string } };
  error?: string;
}

export async function attackRaid(playerId: string, raidId: string): Promise<AttackRaidResult> {
  const raid = await db.raidBoss.findUnique({
    where: { id: raidId },
    include: { clan: true },
  });
  if (!raid) return { ok: false, error: "Raid bulunamadı" };
  if (raid.status !== "ACTIVE") return { ok: false, error: "Raid aktif değil" };
  if (raid.expiresAt < new Date()) {
    await db.raidBoss.update({ where: { id: raidId }, data: { status: "EXPIRED", resolvedAt: new Date() } });
    return { ok: false, error: "Raid süresi dolmuş" };
  }

  // Player bu klanda mı?
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };
  if (player.clanId !== raid.clanId) return { ok: false, error: "Bu raid senin klanının değil" };

  // Cooldown kontrol
  const existingContribution = await db.raidContribution.findUnique({
    where: { raidId_playerId: { raidId, playerId } },
  });
  if (existingContribution) {
    const elapsed = Date.now() - existingContribution.lastAttackAt.getTime();
    if (elapsed < RAID_ATTACK_COOLDOWN_SEC * 1000) {
      const remaining = Math.ceil((RAID_ATTACK_COOLDOWN_SEC * 1000 - elapsed) / 1000);
      return { ok: false, error: `Cooldown: ${remaining}sn kaldı` };
    }
  }

  // Loadout damage hesapla
  const fullPlayer = await db.player.findUnique({
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
  if (!fullPlayer) return { ok: false, error: "Player bulunamadı" };

  if (!fullPlayer.loadout?.weaponItem) {
    return { ok: false, error: "Silah kuşan gerekli" };
  }

  // Player stats derle
  const playerStats = await compilePlayerStats(fullPlayer, fullPlayer.loadout);

  // Mock boss rakip üret (raid boss savaşı simülasyonu)
  // Boss HP çok yüksek, tek saldırıda öldürülemez. 1 tur saldırı yap, hasar kaydet.
  const bossMock = generateMockOpponent(raid.clan.level + 10, 0);
  // Sadece 1 round simüle et
  const combatResult: CombatResult = simulateCombat(playerStats, bossMock);

  // Toplam hasar = player'ın yaptığı ortalama hasar (3 tur üzerinden)
  const sampleRounds = combatResult.rounds.slice(0, 3);
  const totalDamage = sampleRounds.reduce((sum, r) => sum + r.finalDamage + (r.companionAttack?.damage ?? 0), 0);

  if (totalDamage <= 0) {
    return { ok: false, error: "Hasar hesaplanamadı" };
  }

  // Boss HP düş
  const newHp = Math.max(0, raid.currentHp - totalDamage);
  const defeated = newHp === 0;

  // Contribution güncelle
  if (existingContribution) {
    await db.raidContribution.update({
      where: { id: existingContribution.id },
      data: {
        damage: { increment: totalDamage },
        attacks: { increment: 1 },
        lastAttackAt: new Date(),
      },
    });
  } else {
    await db.raidContribution.create({
      data: {
        raidId,
        playerId,
        damage: totalDamage,
        attacks: 1,
        lastAttackAt: new Date(),
      },
    });
  }

  // Raid güncelle
  await db.raidBoss.update({
    where: { id: raidId },
    data: {
      currentHp: newHp,
      status: defeated ? "DEFEATED" : "ACTIVE",
      resolvedAt: defeated ? new Date() : null,
    },
  });

  // XP ödülü (her saldırı) — GDD 2.2.2: CHR raid ödül bonusu
  const chrRaidBonus = raidRewardBonus(player.chr);
  const xpReward = Math.floor((50 + Math.floor(totalDamage / 100)) * (1 + chrRaidBonus));
  const scrapReward = Math.floor((20 + Math.floor(totalDamage / 200)) * (1 + chrRaidBonus));
  await db.player.update({
    where: { id: playerId },
    data: {
      xp: { increment: xpReward },
      scrap: { increment: scrapReward },
    },
  });

  let rewardItem: { name: string; rarity: string } | undefined;
  // Eğer boss yenildiyse ve player top 3 katkıda bulunansa özel ödül
  if (defeated) {
    const topContributors = await db.raidContribution.findMany({
      where: { raidId },
      orderBy: { damage: "desc" },
      take: 3,
    });
    const rank = topContributors.findIndex((c) => c.playerId === playerId);
    if (rank >= 0) {
      // Top 3: Epic eşya
      const { generateRandomItem } = await import("./loot");
      const generated = generateRandomItem(undefined, "EPIC");
      const { MAX_DURABILITY } = await import("./constants");
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
          protected: false,
          icon: generated.icon,
        },
      });
      rewardItem = { name: newItem.name, rarity: newItem.rarity };
    }
  }

  return {
    ok: true,
    damage: totalDamage,
    defeated,
    newCurrentHp: newHp,
    reward: {
      xp: xpReward,
      scrap: scrapReward,
      item: rewardItem,
    },
  };
}

// ============================================================
// RAID BİLGİSİ
// ============================================================

export async function getRaid(raidId: string) {
  const raid = await db.raidBoss.findUnique({
    where: { id: raidId },
    include: {
      contributions: {
        include: {
          player: { select: { id: true, name: true, faction: true, level: true } },
        },
        orderBy: { damage: "desc" },
        take: 20,
      },
    },
  });
  if (!raid) return null;

  return {
    id: raid.id,
    clanId: raid.clanId,
    bossCode: raid.code,
    bossName: raid.name,
    maxHp: raid.maxHp,
    currentHp: raid.currentHp,
    startedAt: raid.startedAt,
    expiresAt: raid.expiresAt,
    status: raid.status,
    resolvedAt: raid.resolvedAt,
    durationHours: RAID_DURATION_HOURS,
    remainingMs: Math.max(0, raid.expiresAt.getTime() - Date.now()),
    topContributors: raid.contributions.map((c, i) => ({
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

export async function getActiveRaidsForClan(clanId: string) {
  const raids = await db.raidBoss.findMany({
    where: { clanId, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
  });
  return raids.map((r) => ({
    id: r.id,
    bossName: r.name,
    bossCode: r.code,
    maxHp: r.maxHp,
    currentHp: r.currentHp,
    expiresAt: r.expiresAt,
    remainingMs: Math.max(0, r.expiresAt.getTime() - Date.now()),
    progress: ((r.maxHp - r.currentHp) / r.maxHp) * 100,
  }));
}
