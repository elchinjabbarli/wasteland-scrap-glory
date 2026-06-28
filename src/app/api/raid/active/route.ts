import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getActiveRaidsForClan } from "@/lib/game/raid";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!player.clanId) return NextResponse.json({ raids: [] });
  const raids = await getActiveRaidsForClan(player.clanId);
  return NextResponse.json({ raids });
}
