// GET /api/combat/history
// Oyuncunun son 20 savaşı

import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = await db.combatLog.findMany({
    where: { playerAId: player.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    history: logs.map((l) => ({
      id: l.id,
      opponentName: l.playerBName,
      opponentFaction: l.playerBFaction,
      opponentLevel: l.playerBLevel,
      won: l.winnerSide === "A",
      totalRounds: l.totalRounds,
      xpGained: l.xpGained,
      scrapGained: l.scrapGained,
      techPartGained: l.techPartGained,
      createdAt: l.createdAt,
    })),
  });
}
