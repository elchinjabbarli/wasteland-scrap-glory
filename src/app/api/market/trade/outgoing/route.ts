import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getOutgoingTrades } from "@/lib/game/market";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trades = await getOutgoingTrades(player.id);
  return NextResponse.json({ trades });
}
