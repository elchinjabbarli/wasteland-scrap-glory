// GET /api/inventory
// Oyuncunun tüm eşyaları ve malzemeleri

import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db.item.findMany({
    where: { ownerId: player.id },
    include: { template: true },
    orderBy: [{ rarity: "desc" }, { upgradeLevel: "desc" }, { createdAt: "desc" }],
  });

  const loadout = await db.loadout.findUnique({
    where: { playerId: player.id },
    include: {
      weaponItem: true,
      armorItem: true,
      sideToolItem: true,
      companionItem: true,
    },
  });

  return NextResponse.json({
    items: items.map((it) => ({
      id: it.id,
      name: it.name,
      prefix: it.prefix,
      suffix: it.suffix,
      rarity: it.rarity,
      element: it.element,
      slot: it.template?.slot ?? "WEAPON",
      baseDamage: it.baseDamage,
      baseArmor: it.baseArmor,
      baseHpBonus: it.baseHpBonus,
      attackSpeed: it.attackSpeed,
      companionHp: it.companionHp,
      companionDamage: it.companionDamage,
      effectType: it.effectType,
      effectChance: it.effectChance,
      effectDuration: it.effectDuration,
      upgradeLevel: it.upgradeLevel,
      durability: it.durability,
      state: it.state,
      protected: it.protected,
      icon: it.icon,
      templateCode: it.templateId,
    })),
    materials: {
      scrap: player.scrap,
      techPart: player.techPart,
      crystal: player.crystal,
      electronic: player.electronic,
      crystalDust: player.crystalDust,
    },
    loadout: loadout
      ? {
          weapon: loadout.weaponItem,
          armor: loadout.armorItem,
          sideTool: loadout.sideToolItem,
          companion: loadout.companionItem,
        }
      : null,
  });
}
