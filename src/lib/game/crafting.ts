// Wasteland: Scrap & Glory - Crafting Sistemi
// 4 rarity tarif, gerçek zamanlı süre, başarı şansı

import { db } from "@/lib/db";
import { CRAFTING_RECIPES, type CraftingRecipe } from "./stats";
import { type Rarity, type Slot } from "./constants";
import { generateItem, ITEM_SEEDS, type GeneratedItem } from "./loot";

// ============================================================
// CRAFTING TARİF BİLGİSİ
// ============================================================

export interface CraftingRecipeInfo extends CraftingRecipe {
  canCraft: (player: { scrap: number; electronic: number; techPart: number; crystalDust: number }) => boolean;
  missingMaterials: (player: { scrap: number; electronic: number; techPart: number; crystalDust: number }) => Partial<{ scrap: number; electronic: number; techPart: number; crystalDust: number }>;
}

export function getRecipeInfo(rarity: Rarity): CraftingRecipeInfo {
  const recipe = CRAFTING_RECIPES[rarity];
  return {
    ...recipe,
    canCraft: (p) =>
      p.scrap >= recipe.scrapCost &&
      p.electronic >= recipe.electronicCost &&
      p.techPart >= recipe.techPartCost &&
      p.crystalDust >= recipe.crystalDustCost,
    missingMaterials: (p) => {
      const missing: Partial<{ scrap: number; electronic: number; techPart: number; crystalDust: number }> = {};
      if (p.scrap < recipe.scrapCost) missing.scrap = recipe.scrapCost - p.scrap;
      if (p.electronic < recipe.electronicCost) missing.electronic = recipe.electronicCost - p.electronic;
      if (p.techPart < recipe.techPartCost) missing.techPart = recipe.techPartCost - p.techPart;
      if (p.crystalDust < recipe.crystalDustCost) missing.crystalDust = recipe.crystalDust - p.crystalDust;
      return missing;
    },
  };
}

export function getAllRecipes(): Record<Rarity, CraftingRecipeInfo> {
  return {
    COMMON: getRecipeInfo("COMMON"),
    RARE: getRecipeInfo("RARE"),
    EPIC: getRecipeInfo("EPIC"),
    LEGENDARY: getRecipeInfo("LEGENDARY"),
  };
}

// ============================================================
// CRAFTING İŞLEMİ
// ============================================================

export interface StartCraftingResult {
  ok: boolean;
  job?: {
    id: string;
    recipeRarity: string;
    slot: string;
    startedAt: Date;
    finishesAt: Date;
    durationMinutes: number;
    successChance: number;
  };
  error?: string;
}

/** Crafting işi başlat — malzemeleri düş, job oluştur */
export async function startCrafting(
  playerId: string,
  rarity: Rarity,
  slotHint?: Slot
): Promise<StartCraftingResult> {
  const recipe = getRecipeInfo(rarity);
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };

  // Aktif iş limiti (max 3 aynı anda)
  const activeJobs = await db.craftingJob.count({
    where: { playerId, status: "IN_PROGRESS" },
  });
  if (activeJobs >= 3) {
    return { ok: false, error: "Aynı anda en fazla 3 üretim işi" };
  }

  // Malzeme kontrolü
  if (!recipe.canCraft(player)) {
    const missing = recipe.missingMaterials(player);
    return { ok: false, error: `Yetersiz malzeme: ${JSON.stringify(missing)}` };
  }

  // Slot seç (hint yoksa random)
  const possibleSlots: Slot[] = ["WEAPON", "ARMOR", "SIDE_TOOL", "COMPANION"];
  const slot = slotHint ?? possibleSlots[Math.floor(Math.random() * possibleSlots.length)];

  // Malzemeleri düş
  await db.player.update({
    where: { id: playerId },
    data: {
      scrap: { decrement: recipe.scrapCost },
      electronic: { decrement: recipe.electronicCost },
      techPart: { decrement: recipe.techPartCost },
      crystalDust: { decrement: recipe.crystalDustCost },
    },
  });

  // İş oluştur
  const now = new Date();
  const finishesAt = new Date(now.getTime() + recipe.durationMinutes * 60 * 1000);

  const job = await db.craftingJob.create({
    data: {
      playerId,
      recipeRarity: rarity,
      slot,
      startedAt: now,
      finishesAt,
      durationMinutes: recipe.durationMinutes,
      scrapCost: recipe.scrapCost,
      electronicCost: recipe.electronicCost,
      techPartCost: recipe.techPartCost,
      crystalDustCost: recipe.crystalDustCost,
      successChance: recipe.successChance,
      status: "IN_PROGRESS",
    },
  });

  return {
    ok: true,
    job: {
      id: job.id,
      recipeRarity: job.recipeRarity,
      slot: job.slot,
      startedAt: job.startedAt,
      finishesAt: job.finishesAt,
      durationMinutes: job.durationMinutes,
      successChance: job.successChance,
    },
  };
}

// ============================================================
// CRAFTING TAMAMLAMA
// ============================================================

export interface CompleteCraftingResult {
  ok: boolean;
  success?: boolean;
  item?: { id: string; name: string; rarity: string; element: string };
  error?: string;
  refundedMaterials?: { scrap: number; electronic: number; techPart: number; crystalDust: number };
}

/** Crafting işini tamamla — süre dolmuşsa eşya üret, başarı şansı uygula */
export async function completeCrafting(playerId: string, jobId: string): Promise<CompleteCraftingResult> {
  const job = await db.craftingJob.findFirst({
    where: { id: jobId, playerId },
  });
  if (!job) return { ok: false, error: "İş bulunamadı" };
  if (job.status !== "IN_PROGRESS") return { ok: false, error: "İş zaten tamamlanmış" };

  const now = new Date();
  if (now < job.finishesAt) {
    const remainingMs = job.finishesAt.getTime() - now.getTime();
    return { ok: false, error: `Süre dolmadı (${Math.ceil(remainingMs / 1000)}s kaldı)` };
  }

  // Başarı şansı roll
  const success = Math.random() < job.successChance;

  if (success) {
    // Eşya üret
    const slotSeeds = ITEM_SEEDS.filter((s) => s.slot === job.slot);
    const seed = slotSeeds.length > 0
      ? slotSeeds[Math.floor(Math.random() * slotSeeds.length)]
      : ITEM_SEEDS[Math.floor(Math.random() * ITEM_SEEDS.length)];

    const generated: GeneratedItem = generateItem(seed, job.recipeRarity as Rarity);

    // Template bul/oluştur
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
        durability: 100,
        state: "IN_INVENTORY",
        protected: false,
        icon: generated.icon,
      },
    });

    await db.craftingJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        resultItemId: newItem.id,
        completedAt: now,
      },
    });

    return {
      ok: true,
      success: true,
      item: {
        id: newItem.id,
        name: newItem.name,
        rarity: newItem.rarity,
        element: newItem.element,
      },
    };
  } else {
    // Başarısız — %50 malzeme iade
    const refund = {
      scrap: Math.floor(job.scrapCost * 0.5),
      electronic: Math.floor(job.electronicCost * 0.5),
      techPart: Math.floor(job.techPartCost * 0.5),
      crystalDust: Math.floor(job.crystalDustCost * 0.5),
    };
    await db.player.update({
      where: { id: playerId },
      data: {
        scrap: { increment: refund.scrap },
        electronic: { increment: refund.electronic },
        techPart: { increment: refund.techPart },
        crystalDust: { increment: refund.crystalDust },
      },
    });
    await db.craftingJob.update({
      where: { id: jobId },
      data: { status: "FAILED", completedAt: now },
    });
    return { ok: true, success: false, refundedMaterials: refund };
  }
}

/** Crafting işini iptal et — %50 malzeme iade */
export async function cancelCrafting(playerId: string, jobId: string): Promise<CompleteCraftingResult> {
  const job = await db.craftingJob.findFirst({ where: { id: jobId, playerId } });
  if (!job) return { ok: false, error: "İş bulunamadı" };
  if (job.status !== "IN_PROGRESS") return { ok: false, error: "İş zaten tamamlanmış" };

  const refund = {
    scrap: Math.floor(job.scrapCost * 0.5),
    electronic: Math.floor(job.electronicCost * 0.5),
    techPart: Math.floor(job.techPartCost * 0.5),
    crystalDust: Math.floor(job.crystalDustCost * 0.5),
  };
  await db.player.update({
    where: { id: playerId },
    data: {
      scrap: { increment: refund.scrap },
      electronic: { increment: refund.electronic },
      techPart: { increment: refund.techPart },
      crystalDust: { increment: refund.crystalDust },
    },
  });
  await db.craftingJob.update({
    where: { id: jobId },
    data: { status: "CANCELLED", completedAt: new Date() },
  });
  return { ok: true, refundedMaterials: refund };
}

/** Oyuncunun aktif crafting işlerini getir (frontend progress için) */
export async function getCraftingJobs(playerId: string) {
  const jobs = await db.craftingJob.findMany({
    where: { playerId, status: "IN_PROGRESS" },
    orderBy: { finishesAt: "asc" },
  });
  return jobs.map((j) => ({
    id: j.id,
    recipeRarity: j.recipeRarity,
    slot: j.slot,
    startedAt: j.startedAt,
    finishesAt: j.finishesAt,
    durationMinutes: j.durationMinutes,
    successChance: j.successChance,
    status: j.status,
    remainingMs: Math.max(0, j.finishesAt.getTime() - Date.now()),
  }));
}

/** Süresi dolmuş ama toplanmamış işleri bul */
export async function getReadyJobs(playerId: string) {
  const jobs = await db.craftingJob.findMany({
    where: {
      playerId,
      status: "IN_PROGRESS",
      finishesAt: { lte: new Date() },
    },
  });
  return jobs;
}
