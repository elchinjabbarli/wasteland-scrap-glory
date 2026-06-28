import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getClan } from "@/lib/game/clan";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!player.clanId) return NextResponse.json({ clan: null });
  const clan = await getClan(player.clanId);
  return NextResponse.json({ clan });
}
