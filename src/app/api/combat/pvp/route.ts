// POST /api/combat/pvp
// { opponentId, opponentData? } → savaş başlat, simüle et, sonucu kaydet

import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";
import { compilePlayerStats, generateMockOpponent, type MockOpponent } from "@/lib/game/player-stats";
import { simulateCombat } from "@/lib/game/combat";
import {
  xpReward,
  scrapReward,
  techPartDropChance,
  itemDropChanceOnLoss,
  chanceCheck,
} from "@/lib/game/stats";
import { generateRandomItem } from "@/lib/game/loot";
import { SLOT_INFO, MAX_DURABILITY } from "@/lib/game/constants";
import { getDailyWeather } from "@/lib/game/weather";
import { getWeeklyMultipliers } from "@/lib/game/weekly-event";
import { checkRateLimit } from "@/lib/game/anticheat";
import { updateQuestProgress } from "@/lib/game/quests";
import { checkAndUnlockAchievements } from "@/lib/game/achievements";
import { checkAndUnlockBadgesTitles } from "@/lib/game/badges";
import { trackEvent } from "@/lib/game/analytics";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: oyuncu son 1 saniyede savaşmış mı?
    const lastCombat = await db.combatLog.findFirst({
      where: { playerAId: player.id },
      orderBy: { createdAt: "desc" },
    });
    if (lastCombat && Date.now() - lastCombat.createdAt.getTime() < 1000) {
      return NextResponse.json(
        { error: "Çok hızlı! Biraz bekleyin", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    // Anti-cheat: saatlik limit
    const rl = await checkRateLimit(player.id, "PVP");
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.reason, code: "ANTI_CHEAT" }, { status: 429 });
    }

    // Yaralı mı?
    if (player.state === "INJURED" && player.injuredUntil && player.injuredUntil > new Date()) {
      return NextResponse.json(
        { error: "Yaralısın, PvP yapamazsın", code: "INJURED", injuredUntil: player.injuredUntil },
        { status: 400 }
      );
    }

    const body = await req.json();
    const opponentId = String(body.opponentId ?? "");

    if (!opponentId) {
      return NextResponse.json({ error: "opponentId gerekli" }, { status: 400 });
    }

    // Loadout'u çek (savaş için)
    const fullPlayer = await db.player.findUnique({
      where: { id: player.id },
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
    if (!fullPlayer) {
      return NextResponse.json({ error: "Player bulunamadı" }, { status: 404 });
    }

    // Silahı yoksa uyar
    if (!fullPlayer.loadout?.weaponItem) {
      return NextResponse.json(
        { error: "Savaşmak için silah kuşanmalısın", code: "NO_WEAPON" },
        { status: 400 }
      );
    }

    // Mock rakip üret (Faz 1: tüm rakipler mock)
    // opponentId format: mock_<level>_<index>_<timestamp>
    const parts = opponentId.split("_");
    const oppLevel = parseInt(parts[1] ?? "1", 10);
    const oppIndex = parseInt(parts[2] ?? "0", 10);
    const opponent: MockOpponent = generateMockOpponent(oppLevel || player.level, oppIndex);

    // Player stats derle
    const playerStats = await compilePlayerStats(fullPlayer, fullPlayer.loadout);

    // Savaş simülasyonu
    const result = simulateCombat(playerStats, opponent);

    // Ödüller
    const weather = await getDailyWeather();
    const weekly = await getWeeklyMultipliers();
    const rewardMul = weather.multiplier * weekly.xpMul; // ödül çarpanı (hava + haftalık XP)
    const dropMul = weather.dropMul * weekly.dropMul; // drop şansı çarpanı

    const xp = result.playerWon
      ? Math.floor((xpReward(player.level, opponent.level)) * rewardMul)
      : Math.floor((xpReward(player.level, opponent.level) * 0.1) * rewardMul); // %10 kaybedince
    const scrap = result.playerWon
      ? Math.floor((scrapReward(opponent.level)) * weather.multiplier) // hava çarpanı (XP hariç)
      : Math.floor((scrapReward(opponent.level) * 0.2) * weather.multiplier); // %20 kaybedince

    let techPartGain = 0;
    let droppedItemTemplateCode: string | null = null;
    let droppedItemName: string | null = null;
    let droppedItemId: string | null = null;

    if (result.playerWon) {
      // Tech-Part drop şansı (hava çarpanı ile)
      if (chanceCheck(techPartDropChance(opponent.level) * dropMul)) {
        techPartGain = 1;
      }

      // Eşya drop şansı (yeni eşya üretilip inventory'ye eklenir) — hava ile boost
      if (chanceCheck(0.30 * dropMul)) {
        const generated = generateRandomItem();
        // ItemTemplate bul veya oluştur
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
            ownerId: player.id,
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
        droppedItemTemplateCode = generated.templateCode;
        droppedItemName = generated.name;
        droppedItemId = newItem.id;
      }
    } else {
      // Kaybedince: eşya düşürme riski (permadeath)
      // Sadece korumasız eşyalardan biri düşebilir
      const armorUpgrade = fullPlayer.loadout?.armorItem?.upgradeLevel ?? 0;
      if (chanceCheck(itemDropChanceOnLoss(armorUpgrade))) {
        // Korumasız bir eşya seç
        const unprotectedItems = await db.item.findMany({
          where: {
            ownerId: player.id,
            protected: false,
            state: { in: ["IN_INVENTORY", "EQUIPPED"] },
          },
        });
        if (unprotectedItems.length > 0) {
          const lost = unprotectedItems[Math.floor(Math.random() * unprotectedItems.length)];
          // Eğer kuşanılıysa loadout'tan da çıkar
          if (lost.state === "EQUIPPED") {
            const loadout = await db.loadout.findUnique({ where: { playerId: player.id } });
            if (loadout) {
              const updates: Record<string, null> = {};
              if (loadout.weaponItemId === lost.id) updates.weaponItemId = null;
              if (loadout.armorItemId === lost.id) updates.armorItemId = null;
              if (loadout.sideToolItemId === lost.id) updates.sideToolItemId = null;
              if (loadout.companionItemId === lost.id) updates.companionItemId = null;
              if (Object.keys(updates).length > 0) {
                await db.loadout.update({ where: { id: loadout.id }, data: updates });
              }
            }
          }
          await db.item.delete({ where: { id: lost.id } });
          droppedItemName = lost.name; // log için
        }
      }
    }

    // Eşya dayanıklılığını azalt (kuşanılanlar için)
    if (fullPlayer.loadout) {
      const updates: Promise<unknown>[] = [];
      const equippedItems: { item: { id: string }; slot: keyof typeof SLOT_INFO }[] = [
        { item: fullPlayer.loadout.weaponItem as { id: string } | null, slot: "WEAPON" },
        { item: fullPlayer.loadout.armorItem as { id: string } | null, slot: "ARMOR" },
        { item: fullPlayer.loadout.sideToolItem as { id: string } | null, slot: "SIDE_TOOL" },
      ].filter((e) => e.item) as { item: { id: string }; slot: keyof typeof SLOT_INFO }[];

      for (const { item, slot } of equippedItems) {
        const loss = SLOT_INFO[slot].durabilityLossPerBattle;
        if (loss > 0) {
          // Yeni durability hesapla, 0 altına düşme
          updates.push(
            db.item.update({
              where: { id: item.id },
              data: {
                durability: { decrement: loss },
                state: "EQUIPPED", // aynı kalsın
              },
            }).then(async (updated) => {
              if (updated.durability <= 0) {
                await db.item.update({
                  where: { id: updated.id },
                  data: { durability: 0, state: "BROKEN" },
                });
              }
            })
          );
        }
      }
      await Promise.all(updates);

      // Faz 7 (GDD 4.1): Companion ölünce 24 saat yaralı
      // Companion HP 0'a düştüyse (combat'ta), player 24 saat INJURED olur
      if (fullPlayer.loadout.companionItem && result.finalHpA <= 0) {
        // Player öldüyse companion da ölür sayılır — 24 saat yaralı
        await db.player.update({
          where: { id: player.id },
          data: {
            state: "INJURED",
            injuredUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    // XP ve level güncellemesi
    const newXp = player.xp + xp;
    let newLevel = player.level;
    let statPointsGained = 0;

    // Level up kontrolü
    const levelFromXp = (totalXp: number) => {
      let lvl = 1;
      let remaining = totalXp;
      while (lvl < 100) {
        const need = Math.floor(100 * Math.pow(lvl, 1.5));
        if (remaining < need) break;
        remaining -= need;
        lvl++;
      }
      return { level: lvl, xpIntoLevel: remaining };
    };
    const levelInfo = levelFromXp(newXp);
    if (levelInfo.level > player.level) {
      statPointsGained = levelInfo.level - player.level;
      newLevel = levelInfo.level;
    }

    // Player güncelle
    await db.player.update({
      where: { id: player.id },
      data: {
        xp: newXp,
        level: newLevel,
        statPoints: { increment: statPointsGained },
        scrap: { increment: scrap },
        techPart: { increment: techPartGain },
        battlesTotal: { increment: 1 },
        battlesWon: { increment: result.playerWon ? 1 : 0 },
        battlesLost: { increment: result.playerWon ? 0 : 1 },
        kills: { increment: result.playerWon ? 1 : 0 },
      },
    });

    // Combat log kaydet
    const combatLog = await db.combatLog.create({
      data: {
        playerAId: player.id,
        playerBId: null, // mock rakip
        playerBName: opponent.name,
        playerBFaction: opponent.faction,
        playerBLevel: opponent.level,
        isPvP: true,
        winnerSide: result.winnerSide,
        roundsJson: JSON.stringify(result.rounds),
        xpGained: xp,
        scrapGained: scrap,
        techPartGained: techPartGain,
        itemDroppedId: droppedItemId,
        itemLostId: null,
        durationMs: result.durationMs,
        totalRounds: result.totalRounds,
      },
    });

    // Faz 3: Quest progress (sadece kazanırsa PVP_WINS)
    if (result.playerWon) {
      await updateQuestProgress(player.id, "PVP_WINS", 1);
    }

    // Faz 3: Başarım kontrolü
    const achResult = await checkAndUnlockAchievements(player.id);
    const newAchievements = achResult.unlocked.length > 0 ? achResult.unlocked : undefined;

    // Faz 5: Rozet & unvan kontrolü
    const badgeResult = await checkAndUnlockBadgesTitles(player.id);
    const newBadges = badgeResult.newBadges.length > 0 ? badgeResult.newBadges : undefined;
    const newTitles = badgeResult.newTitles.length > 0 ? badgeResult.newTitles : undefined;

    const response = NextResponse.json({
      ok: true,
      combatId: combatLog.id,
      result: {
        playerWon: result.playerWon,
        winnerSide: result.winnerSide,
        totalRounds: result.totalRounds,
        durationMs: result.durationMs,
        finalHpA: result.finalHpA,
        finalHpB: result.finalHpB,
        rounds: result.rounds,
      },
      rewards: {
        xp,
        scrap,
        techPart: techPartGain,
        statPointsGained,
        leveledUp: newLevel > player.level,
        newLevel,
        droppedItem: droppedItemName ? { name: droppedItemName, templateCode: droppedItemTemplateCode } : null,
        lostItem: droppedItemName && !result.playerWon ? { name: droppedItemName } : null,
        weather: weather.type !== "CLEAR" ? {
          type: weather.type,
          name: weather.name,
          bonusApplied: `${Math.round((rewardMul - 1) * 100)}% ödül`,
        } : null,
      },
      achievements: newAchievements,
      badges: newBadges,
      titles: newTitles,
      opponent: {
        id: opponent.id,
        name: opponent.name,
        faction: opponent.faction,
        level: opponent.level,
      },
    });

    // Faz 7: Analitik — battle_start & battle_end
    trackEvent({
      playerId: player.id,
      eventType: "battle_start",
      data: { opponentLevel: opponent.level, opponentFaction: opponent.faction },
    });
    trackEvent({
      playerId: player.id,
      eventType: "battle_end",
      data: {
        won: result.playerWon,
        rounds: result.totalRounds,
        xpGained: xp,
        scrapGained: scrap,
      },
    });

    return response;
  } catch (err) {
    console.error("[combat/pvp] error", err);
    return NextResponse.json(
      { error: "Savaş başlatılamadı", detail: String(err) },
      { status: 500 }
    );
  }
}
