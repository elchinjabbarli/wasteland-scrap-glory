import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getPlayerAchievements, seedAchievements } from "@/lib/game/achievements";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Seed achievements (idempotent)
  await seedAchievements();

  const result = await getPlayerAchievements(player.id);
  return NextResponse.json(result);
}
