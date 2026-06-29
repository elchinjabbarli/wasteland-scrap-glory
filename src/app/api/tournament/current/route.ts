import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getPlayerTournamentStatus } from "@/lib/game/tournament";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = await getPlayerTournamentStatus(player.id);
  return NextResponse.json(status ?? { tournament: null });
}
