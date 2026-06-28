import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getActiveExpeditions } from "@/lib/game/expedition";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const expeditions = await getActiveExpeditions(player.id);
  return NextResponse.json({ expeditions });
}
