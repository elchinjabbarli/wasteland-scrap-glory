// GET /api/combat/[id]
// Tek bir savaşın round-by-round detayı

import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const log = await db.combatLog.findFirst({
    where: { id, playerAId: player.id },
  });

  if (!log) {
    return NextResponse.json({ error: "Savaş bulunamadı" }, { status: 404 });
  }

  let rounds: unknown = [];
  try {
    rounds = JSON.parse(log.roundsJson);
  } catch {
    rounds = [];
  }

  return NextResponse.json({
    combat: {
      id: log.id,
      opponentName: log.playerBName,
      opponentFaction: log.playerBFaction,
      opponentLevel: log.playerBLevel,
      won: log.winnerSide === "A",
      totalRounds: log.totalRounds,
      durationMs: log.durationMs,
      xpGained: log.xpGained,
      scrapGained: log.scrapGained,
      techPartGained: log.techPartGained,
      itemDroppedId: log.itemDroppedId,
      rounds,
      createdAt: log.createdAt,
    },
  });
}
