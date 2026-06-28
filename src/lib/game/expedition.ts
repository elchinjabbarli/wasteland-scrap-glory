// Wasteland: Scrap & Glory - Sefer (Expedition) Sistemi
// 4 bölge, gerçek zamanlı süre, risk/ödül

import { db } from "@/lib/db";
import { generateRandomItem } from "./loot";
import { MAX_DURABILITY, type Rarity } from "./constants";
import { getDailyWeather, type WeatherInfo } from "./weather";

// ============================================================
// BÖLGE TANIMLARI (GDD'den)
// ============================================================

export type ZoneType = "RADIATION_VALLEY" | "ABANDONED_CITY" | "MOUNTAIN_BUNKER" | "NUCLEAR_PLANT";

export interface ZoneInfo {
  code: ZoneType;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  minLevel: number;
  maxLevel: number;
  riskPercent: number;
  durationMinutes: number;
  color: string;
  icon: string;
  // Risk tipi (lore)
  riskType: { tr: string; en: string };
}

export const ZONES: Record<ZoneType, ZoneInfo> = {
  RADIATION_VALLEY: {
    code: "RADIATION_VALLEY",
    name: { tr: "Radyasyon Vadisi", en: "Radiation Valley" },
    description: { tr: "Düşük seviyeli survivor'lar için. Hafif radyasyon riski.", en: "For low-level survivors. Mild radiation risk." },
    minLevel: 1,
    maxLevel: 30,
    riskPercent: 10,
    durationMinutes: 120,
    color: "#84cc16",
    icon: "Radiation",
    riskType: { tr: "Radyasyon Zehirlenmesi", en: "Radiation Poisoning" },
  },
  ABANDONED_CITY: {
    code: "ABANDONED_CITY",
    name: { tr: "Terk Edilmiş Şehir", en: "Abandoned City" },
    description: { tr: "Eski medeniyetin kalıntıları. Mutantlar var.", en: "Ruins of the old civilization. Mutants lurk." },
    minLevel: 30,
    maxLevel: 60,
    riskPercent: 20,
    durationMinutes: 240,
    color: "#9ca3af",
    icon: "Building2",
    riskType: { tr: "Mutant Saldırısı", en: "Mutant Attack" },
  },
  MOUNTAIN_BUNKER: {
    code: "MOUNTAIN_BUNKER",
    name: { tr: "Dağ Sığınağı", en: "Mountain Bunker" },
    description: { tr: "Yüksek irtifa. Ağır zırh ve mekanik yoldaşlar.", en: "High altitude. Heavy armor and mechanical companions." },
    minLevel: 60,
    maxLevel: 90,
    riskPercent: 30,
    durationMinutes: 360,
    color: "#06b6d4",
    icon: "Mountain",
    riskType: { tr: "Pusuya Düşme", en: "Ambush" },
  },
  NUCLEAR_PLANT: {
    code: "NUCLEAR_PLANT",
    name: { tr: "Nükleer Santral", en: "Nuclear Plant" },
    description: { tr: "En tehlikeli bölge. En yüksek ödüller.", en: "Most dangerous zone. Highest rewards." },
    minLevel: 90,
    maxLevel: 100,
    riskPercent: 50,
    durationMinutes: 480,
    color: "#ef4444",
    icon: "Zap",
    riskType: { tr: "Kritik Arıza", en: "Critical Failure" },
  },
};

// ============================================================
// SEFER İŞLEMLERİ
// ============================================================

export const FREE_EXPEDITION_SLOTS = 1;
export const PREMIUM_EXPEDITION_SLOTS = 3;

export interface StartExpeditionResult {
  ok: boolean;
  expedition?: {
    id: string;
    zoneType: string;
    startedAt: Date;
    finishesAt: Date;
    durationMinutes: number;
    riskPercent: number;
  };
  error?: string;
}

/** Sefer başlat */
export async function startExpedition(playerId: string, zoneType: ZoneType): Promise<StartExpeditionResult> {
  const zone = ZONES[zoneType];
  if (!zone) return { ok: false, error: "Geçersiz bölge" };

  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };

  // Banlı mı?
  if (player.bannedUntil && player.bannedUntil > new Date()) {
    return { ok: false, error: `Hesabın banlı (${player.bannedUntil.toLocaleString()})` };
  }

  // Level kontrolü
  if (player.level < zone.minLevel) {
    return { ok: false, error: `Bu bölge için Seviye ${zone.minLevel} gerekli (şu an ${player.level})` };
  }

  // Aktif sefer slot kontrolü
  const activeCount = await db.expedition.count({
    where: { playerId, status: "IN_PROGRESS" },
  });
  if (activeCount >= FREE_EXPEDITION_SLOTS) {
    return { ok: false, error: `Aktif sefer limiti (${FREE_EXPEDITION_SLOTS})` };
  }

  // Hava olayını uygula (craftingTimeMul → burada durationMul)
  const weather = await getDailyWeather();
  const durationMul = weather?.craftingTimeMul ?? 1.0;
  const durationMinutes = Math.floor(zone.durationMinutes * durationMul);

  const now = new Date();
  const finishesAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

  const expedition = await db.expedition.create({
    data: {
      playerId,
      zoneType,
      zoneLevel: zone.minLevel,
      riskPercent: zone.riskPercent,
      startedAt: now,
      finishesAt,
      durationMinutes,
      status: "IN_PROGRESS",
    },
  });

  return {
    ok: true,
    expedition: {
      id: expedition.id,
      zoneType: expedition.zoneType,
      startedAt: expedition.startedAt,
      finishesAt: expedition.finishesAt,
      durationMinutes: expedition.durationMinutes,
      riskPercent: expedition.riskPercent,
    },
  };
}

// ============================================================
// SEFER TAMAMLAMA
// ============================================================

export interface CompleteExpeditionResult {
  ok: boolean;
  success?: boolean;
  rewards?: {
    scrap: number;
    techPart: number;
    item?: { id: string; name: string; rarity: string };
  };
  injuredUntil?: Date;
  error?: string;
}

/** Seferi tamamla — süre dolmuşsa risk roll, ödül üret */
export async function completeExpedition(playerId: string, expeditionId: string): Promise<CompleteExpeditionResult> {
  const expedition = await db.expedition.findFirst({
    where: { id: expeditionId, playerId },
  });
  if (!expedition) return { ok: false, error: "Sefer bulunamadı" };
  if (expedition.status !== "IN_PROGRESS") return { ok: false, error: "Sefer zaten tamamlanmış" };

  const now = new Date();
  if (now < expedition.finishesAt) {
    const remainingMs = expedition.finishesAt.getTime() - now.getTime();
    return { ok: false, error: `Süre dolmadı (${Math.ceil(remainingMs / 60000)} dk kaldı)` };
  }

  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };

  // Hava olayı çarpanları
  const weather = await getDailyWeather();
  const dropMul = weather?.dropMul ?? 1.0;
  const rewardMul = weather?.multiplier ?? 1.0;

  // Risk roll
  const success = Math.random() * 100 >= expedition.riskPercent;

  if (success) {
    // Ödül hesapla (bölge level'e göre ölçekli)
    const zoneBase = expedition.zoneLevel;
    const scrapReward = Math.floor((50 + zoneBase * 10) * rewardMul);
    const techPartReward = Math.random() < (0.20 * dropMul) ? Math.floor(1 + zoneBase / 30) : 0;

    // Eşya drop
    let droppedItem: { id: string; name: string; rarity: string } | undefined;
    if (Math.random() < 0.50 * dropMul) {
      // Bölge level'ına göre rarity bias
      let rarityHint: Rarity = "COMMON";
      const roll = Math.random();
      if (zoneBase >= 60 && roll < 0.10) rarityHint = "LEGENDARY";
      else if (zoneBase >= 30 && roll < 0.25) rarityHint = "EPIC";
      else if (roll < 0.40) rarityHint = "RARE";

      const generated = generateRandomItem(undefined, rarityHint);
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
      droppedItem = { id: newItem.id, name: newItem.name, rarity: newItem.rarity };
    }

    // XP ödülü (bölge level * 5)
    const xpReward = Math.floor((100 + zoneBase * 5) * rewardMul);

    await db.$transaction([
      db.player.update({
        where: { id: playerId },
        data: {
          scrap: { increment: scrapReward },
          techPart: { increment: techPartReward },
          xp: { increment: xpReward },
        },
      }),
      db.expedition.update({
        where: { id: expeditionId },
        data: {
          status: "COMPLETED",
          success: true,
          resolvedAt: now,
          scrapReward,
          techPartReward,
          itemDroppedId: droppedItem?.id,
        },
      }),
    ]);

    // Günlük görev progress (EXPLORATION)
    await updateQuestProgress(playerId, "EXPLORATION_COMPLETE", 1);

    return {
      ok: true,
      success: true,
      rewards: {
        scrap: scrapReward,
        techPart: techPartReward,
        item: droppedItem,
      },
    };
  } else {
    // Başarısız — yaralı (24 saat)
    const injuredUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await db.$transaction([
      db.player.update({
        where: { id: playerId },
        data: {
          state: "INJURED",
          injuredUntil,
        },
      }),
      db.expedition.update({
        where: { id: expeditionId },
        data: {
          status: "FAILED",
          success: false,
          resolvedAt: now,
          injuredUntil,
        },
      }),
    ]);
    return {
      ok: true,
      success: false,
      injuredUntil,
    };
  }
}

/** Seferi iptal et — time wasted, %30 malzeme iade yok (sefer başlamadan önce de malzeme yok) */
export async function cancelExpedition(playerId: string, expeditionId: string): Promise<{ ok: boolean; error?: string }> {
  const expedition = await db.expedition.findFirst({ where: { id: expeditionId, playerId } });
  if (!expedition) return { ok: false, error: "Sefer bulunamadı" };
  if (expedition.status !== "IN_PROGRESS") return { ok: false, error: "Sefer zaten tamamlanmış" };

  await db.expedition.update({
    where: { id: expeditionId },
    data: { status: "CANCELLED", resolvedAt: new Date() },
  });
  return { ok: true };
}

/** Seferi hızlandır — reklam (%50) veya Antik Kristal (%100) */
export async function speedUpExpedition(
  playerId: string,
  expeditionId: string,
  method: "AD" | "CRYSTAL"
): Promise<{ ok: boolean; error?: string; newFinishesAt?: Date }> {
  const expedition = await db.expedition.findFirst({ where: { id: expeditionId, playerId } });
  if (!expedition) return { ok: false, error: "Sefer bulunamadı" };
  if (expedition.status !== "IN_PROGRESS") return { ok: false, error: "Sefer zaten tamamlanmış" };

  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };

  if (method === "CRYSTAL") {
    if (player.crystal < 1) return { ok: false, error: "Yetersiz Antik Kristal" };
    await db.player.update({
      where: { id: playerId },
      data: { crystal: { decrement: 1 } },
    });
    // Süreyi tamamen bitir
    const newFinishesAt = new Date();
    await db.expedition.update({
      where: { id: expeditionId },
      data: { finishesAt: newFinishesAt },
    });
    return { ok: true, newFinishesAt };
  } else {
    // AD — %50 azalt
    const remainingMs = expedition.finishesAt.getTime() - Date.now();
    if (remainingMs <= 0) return { ok: false, error: "Süre zaten dolmuş" };
    const newFinishesAt = new Date(Date.now() + remainingMs * 0.5);
    await db.expedition.update({
      where: { id: expeditionId },
      data: { finishesAt: newFinishesAt },
    });
    return { ok: true, newFinishesAt };
  }
}

/** Aktif seferleri getir */
export async function getActiveExpeditions(playerId: string) {
  const expeditions = await db.expedition.findMany({
    where: { playerId, status: "IN_PROGRESS" },
    orderBy: { finishesAt: "asc" },
  });
  return expeditions.map((e) => ({
    id: e.id,
    zoneType: e.zoneType,
    zoneLevel: e.zoneLevel,
    riskPercent: e.riskPercent,
    startedAt: e.startedAt,
    finishesAt: e.finishesAt,
    durationMinutes: e.durationMinutes,
    status: e.status,
    remainingMs: Math.max(0, e.finishesAt.getTime() - Date.now()),
  }));
}

// ============================================================
// GÜNLÜK GÖREV PROGRESS (Quests modülünden çağrılır, döngüsüz)
// ============================================================

async function updateQuestProgress(playerId: string, type: string, amount: number) {
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
