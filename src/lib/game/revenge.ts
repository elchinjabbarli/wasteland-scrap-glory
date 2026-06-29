// Wasteland: Scrap & Glory - İntikam Sistemi
// GDD: t.me/[BotUsername]?start=revenge_[KillerID]_[ItemID]
// Kazanılırsa kaybedilen eşya geri alınır + katilden 1 eşya daha çalınır

import { db } from "@/lib/db";
import { MAX_DURABILITY, type Rarity } from "./constants";
import { compilePlayerStats, generateMockOpponent } from "./player-stats";
import { simulateCombat } from "./combat";
import { generateRandomItem } from "./loot";
import { xpReward, scrapReward } from "./stats";

// ============================================================
// SABİTLER
// ============================================================

export const REVENGE_LINK_DURATION_HOURS = 24;
export const REVENGE_DROP_CHANCE = 0.05; // PvP kaybedince %5 şans

// ============================================================
// REVENGE LINK OLUŞTURMA
// ============================================================

export interface CreateRevengeLinkResult {
  ok: boolean;
  linkId?: string;
  error?: string;
}

/** PvP kaybedince — eşya düştüyse RevengeLink oluştur */
export async function createRevengeLink(
  victimId: string,
  killerId: string,
  lostItem: {
    name: string;
    rarity: string;
    templateCode?: string | null;
    baseDamage: number;
    baseArmor: number;
    baseHpBonus: number;
    element: string;
    slot: string;
    icon: string;
  }
): Promise<CreateRevengeLinkResult> {
  // Eğer killer bir mock ise (gerçek player değil), intikam olmaz
  // Mock killer ID format: mock_X_Y_Z
  if (killerId.startsWith("mock_")) {
    return { ok: false, error: "Mock rakiplerden intikam alınamaz" };
  }

  const killer = await db.player.findUnique({ where: { id: killerId } });
  if (!killer) return { ok: false, error: "Killer bulunamadı" };

  const expiresAt = new Date(Date.now() + REVENGE_LINK_DURATION_HOURS * 60 * 60 * 1000);

  const link = await db.revengeLink.create({
    data: {
      victimId,
      killerId,
      itemName: lostItem.name,
      itemRarity: lostItem.rarity,
      itemTemplateCode: lostItem.templateCode ?? null,
      itemDamage: lostItem.baseDamage,
      itemArmor: lostItem.baseArmor,
      itemHpBonus: lostItem.baseHpBonus,
      itemElement: lostItem.element,
      itemSlot: lostItem.slot,
      itemIcon: lostItem.icon,
      expiresAt,
    },
  });

  return { ok: true, linkId: link.id };
}

// ============================================================
// REVENGE LİNK BİLGİSİ
// ============================================================

export async function getRevengeLink(linkId: string, victimId: string) {
  const link = await db.revengeLink.findFirst({
    where: { id: linkId, victimId },
    include: {
      killer: { select: { id: true, name: true, faction: true, level: true, prestige: true } },
    },
  });
  if (!link) return null;

  return {
    id: link.id,
    killer: link.killer,
    itemName: link.itemName,
    itemRarity: link.itemRarity,
    itemDamage: link.itemDamage,
    itemArmor: link.itemArmor,
    itemHpBonus: link.itemHpBonus,
    itemElement: link.itemElement,
    itemSlot: link.itemSlot,
    itemIcon: link.itemIcon,
    expiresAt: link.expiresAt,
    used: link.used,
    result: link.result,
    expired: link.expiresAt < new Date(),
    remainingMs: Math.max(0, link.expiresAt.getTime() - Date.now()),
  };
}

/** Victim'ın aktif intikam linkleri */
export async function getActiveRevengeLinks(victimId: string) {
  const links = await db.revengeLink.findMany({
    where: {
      victimId,
      used: false,
      expiresAt: { gt: new Date() },
    },
    include: {
      killer: { select: { id: true, name: true, faction: true, level: true } },
    },
    orderBy: { expiresAt: "asc" },
  });
  return links.map((l) => ({
    id: l.id,
    killer: l.killer,
    itemName: l.itemName,
    itemRarity: l.itemRarity,
    expiresAt: l.expiresAt,
    remainingMs: Math.max(0, l.expiresAt.getTime() - Date.now()),
  }));
}

// ============================================================
// İNTİKAM SAVAŞI
// ============================================================

export interface PerformRevengeResult {
  ok: boolean;
  success?: boolean;
  recoveredItem?: { id: string; name: string; rarity: string };
  stolenItem?: { name: string; rarity: string } | null;
  rewards?: { xp: number; scrap: number };
  error?: string;
}

export async function performRevenge(victimId: string, linkId: string): Promise<PerformRevengeResult> {
  const link = await db.revengeLink.findFirst({
    where: { id: linkId, victimId, used: false },
    include: { killer: true },
  });
  if (!link) return { ok: false, error: "Link bulunamadı veya zaten kullanılmış" };
  if (link.expiresAt < new Date()) return { ok: false, error: "Link süresi dolmuş" };

  const victim = await db.player.findUnique({
    where: { id: victimId },
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
  if (!victim) return { ok: false, error: "Player bulunamadı" };

  if (!victim.loadout?.weaponItem) {
    return { ok: false, error: "Silah kuşan gerekli" };
  }

  // Killer'ı mock opponent olarak hazırla (gerçek killer'ın level'ı ile)
  const killerMock = generateMockOpponent(link.killer.level, 0);
  killerMock.name = link.killer.name;
  killerMock.faction = link.killer.faction;

  // Player stats derle
  const playerStats = await compilePlayerStats(victim, victim.loadout);

  // Savaş simülasyonu
  const result = simulateCombat(playerStats, killerMock);

  // Link'i used işaretle
  await db.revengeLink.update({
    where: { id: linkId },
    data: {
      used: true,
      usedAt: new Date(),
      result: result.playerWon ? "WIN" : "LOSS",
    },
  });

  if (result.playerWon) {
    // Kazandı: kaybedilen eşyayı geri al
    let template = link.itemTemplateCode
      ? await db.itemTemplate.findUnique({ where: { code: link.itemTemplateCode } })
      : null;
    if (!template) {
      // Template yoksa generic oluştur
      template = await db.itemTemplate.create({
        data: {
          code: `recovered_${linkId}_${Date.now()}`,
          name: link.itemName,
          slot: link.itemSlot,
          element: link.itemElement,
          tier: link.itemRarity,
          baseDamageMin: link.itemDamage,
          baseDamageMax: link.itemDamage,
          baseArmorMin: link.itemArmor,
          baseArmorMax: link.itemArmor,
          baseHpBonusMin: link.itemHpBonus,
          baseHpBonusMax: link.itemHpBonus,
          icon: link.itemIcon,
        },
      });
    }
    const recoveredItem = await db.item.create({
      data: {
        templateId: template.id,
        ownerId: victimId,
        name: link.itemName,
        rarity: link.itemRarity,
        element: link.itemElement,
        baseDamage: link.itemDamage,
        baseArmor: link.itemArmor,
        baseHpBonus: link.itemHpBonus,
        attackSpeed: 1.0,
        upgradeLevel: 0,
        durability: MAX_DURABILITY,
        state: "IN_INVENTORY",
        protected: true, // geri alınan eşya korumalı
        icon: link.itemIcon,
      },
    });

    // Katilden 1 eşya daha çal (kiler'ın korumasız bir eşyası)
    let stolenItem: { name: string; rarity: string } | null = null;
    const killerUnprotectedItems = await db.item.findMany({
      where: {
        ownerId: link.killerId,
        protected: false,
        state: { in: ["IN_INVENTORY", "EQUIPPED"] },
      },
    });
    if (killerUnprotectedItems.length > 0) {
      const stolen = killerUnprotectedItems[Math.floor(Math.random() * killerUnprotectedItems.length)];
      // Eğer kuşanılıysa loadout'tan çıkar
      if (stolen.state === "EQUIPPED") {
        const killerLoadout = await db.loadout.findUnique({ where: { playerId: link.killerId } });
        if (killerLoadout) {
          const updates: Record<string, null> = {};
          if (killerLoadout.weaponItemId === stolen.id) updates.weaponItemId = null;
          if (killerLoadout.armorItemId === stolen.id) updates.armorItemId = null;
          if (killerLoadout.sideToolItemId === stolen.id) updates.sideToolItemId = null;
          if (killerLoadout.companionItemId === stolen.id) updates.companionItemId = null;
          if (Object.keys(updates).length > 0) {
            await db.loadout.update({ where: { id: killerLoadout.id }, data: updates });
          }
        }
      }
      // Çalınan eşyayı victim'a transfer et
      await db.item.update({
        where: { id: stolen.id },
        data: { ownerId: victimId, state: "IN_INVENTORY" },
      });
      stolenItem = { name: stolen.name, rarity: stolen.rarity };
    }

    // Ödül XP/Scrap
    const xp = xpReward(victim.level, link.killer.level) * 2; // intikam bonusu
    const scrap = scrapReward(link.killer.level) * 2;
    await db.player.update({
      where: { id: victimId },
      data: {
        xp: { increment: xp },
        scrap: { increment: scrap },
        battlesTotal: { increment: 1 },
        battlesWon: { increment: 1 },
        kills: { increment: 1 },
      },
    });

    return {
      ok: true,
      success: true,
      recoveredItem: { id: recoveredItem.id, name: recoveredItem.name, rarity: recoveredItem.rarity },
      stolenItem,
      rewards: { xp, scrap },
    };
  } else {
    // Kaybetti — link consumed, ekstra ceza yok
    await db.player.update({
      where: { id: victimId },
      data: {
        battlesTotal: { increment: 1 },
        battlesLost: { increment: 1 },
      },
    });
    return { ok: true, success: false };
  }
}
