// Wasteland: Scrap & Glory - Seed Data
// ItemTemplate'leri ve demo player'ları DB'ye yazar

import { db } from "@/lib/db";
import { ITEM_SEEDS } from "@/lib/game/loot";
import { FACTIONS, type Faction } from "@/lib/game/constants";

/** ItemTemplate'leri seed'le (idempotent) */
export async function seedItemTemplates() {
  let created = 0;
  for (const seed of ITEM_SEEDS) {
    const existing = await db.itemTemplate.findUnique({ where: { code: seed.templateCode } });
    if (existing) continue;

    await db.itemTemplate.create({
      data: {
        code: seed.templateCode,
        name: seed.baseName,
        slot: seed.slot,
        element: "PHYSICAL",
        tier: "COMMON",
        description: `${seed.baseName} - ${seed.slot}`,
        baseDamageMin: seed.damageRange?.[0] ?? 0,
        baseDamageMax: seed.damageRange?.[1] ?? 0,
        baseArmorMin: seed.armorRange?.[0] ?? 0,
        baseArmorMax: seed.armorRange?.[1] ?? 0,
        baseHpBonusMin: seed.hpBonusRange?.[0] ?? 0,
        baseHpBonusMax: seed.hpBonusRange?.[1] ?? 0,
        attackSpeed: seed.attackSpeed ?? 1.0,
        companionHp: seed.companionHp ?? 0,
        companionDamage: seed.companionDamage ?? 0,
        effectType: seed.effectType ?? null,
        effectChance: seed.effectChance ?? 0,
        effectDuration: seed.effectDuration ?? 0,
        icon: seed.icon,
        faction: seed.faction ?? null,
      },
    });
    created++;
  }
  return created;
}

/** Fraksiyon başlangıç eşyasını player'a ver */
export async function giveStartingItem(playerId: string, faction: Faction) {
  const factionData = FACTIONS[faction];
  const templateCode = factionData.startingWeaponCode;
  const template = await db.itemTemplate.findUnique({ where: { code: templateCode } });
  if (!template) return null;

  // Prosedürel üretim (Common rarity garanti)
  const seed = ITEM_SEEDS.find((s) => s.templateCode === templateCode);
  if (!seed) return null;

  // Basit başlangıç eşyası — prosedürel etiketler olmadan, common rarity
  const item = await db.item.create({
    data: {
      templateId: template.id,
      ownerId: playerId,
      name: seed.baseName,
      prefix: null,
      suffix: null,
      rarity: "COMMON",
      element: "PHYSICAL",
      baseDamage: seed.damageRange ? Math.floor((seed.damageRange[0] + seed.damageRange[1]) / 2) : 0,
      baseArmor: seed.armorRange ? Math.floor((seed.armorRange[0] + seed.armorRange[1]) / 2) : 0,
      baseHpBonus: seed.hpBonusRange ? Math.floor((seed.hpBonusRange[0] + seed.hpBonusRange[1]) / 2) : 0,
      attackSpeed: seed.attackSpeed ?? 1.0,
      companionHp: seed.companionHp ?? 0,
      companionDamage: seed.companionDamage ?? 0,
      effectType: seed.effectType ?? null,
      effectChance: seed.effectChance ?? 0,
      effectDuration: seed.effectDuration ?? 0,
      upgradeLevel: 0,
      durability: 100,
      state: "IN_INVENTORY",
      protected: true, // başlangıç eşyası korumalı
      icon: seed.icon,
    },
  });

  return item;
}

/** Player için boş loadout oluştur */
export async function ensureLoadout(playerId: string) {
  const existing = await db.loadout.findUnique({ where: { playerId } });
  if (existing) return existing;
  return db.loadout.create({ data: { playerId } });
}
