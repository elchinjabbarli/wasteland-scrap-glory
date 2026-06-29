import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getStreakInfo } from "@/lib/game/streak";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const info = await getStreakInfo(player.id);
  return NextResponse.json(info);
}
