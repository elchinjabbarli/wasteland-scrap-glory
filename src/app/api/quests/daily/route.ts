import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getDailyQuests } from "@/lib/game/quests";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await getDailyQuests(player.id);
  return NextResponse.json(result);
}
