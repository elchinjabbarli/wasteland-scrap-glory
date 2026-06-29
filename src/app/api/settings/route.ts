// GET /api/settings — oyun ayarları ve istatistikleri

import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Toplam istatistikler
  const totalItems = await db.item.count({ where: { ownerId: player.id } });
  const totalCrafts = await db.craftingJob.count({ where: { playerId: player.id } });
  const totalExpeditions = await db.expedition.count({ where: { playerId: player.id } });
  const totalMarketSales = await db.marketListing.count({ where: { sellerId: player.id, status: "SOLD" } });
  const totalAchievements = await db.playerAchievement.count({ where: { playerId: player.id } });
  const totalBadges = await db.playerBadge.count({ where: { playerId: player.id } });
  const totalTitles = await db.playerTitle.count({ where: { playerId: player.id } });

  return NextResponse.json({
    stats: {
      totalItems,
      totalCrafts,
      totalExpeditions,
      totalMarketSales,
      totalAchievements,
      totalBadges,
      totalTitles,
      accountAge: Math.floor((Date.now() - player.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    },
    player: {
      id: player.id,
      name: player.name,
      faction: player.faction,
      level: player.level,
      prestige: player.prestige,
      createdAt: player.createdAt,
    },
    version: "2.0.0",
  });
}
