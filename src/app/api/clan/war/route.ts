import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getClanWarStatus } from "@/lib/game/clan-war";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = await getClanWarStatus(player.id);
  return NextResponse.json(status);
}
