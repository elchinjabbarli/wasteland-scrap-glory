import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getActiveRevengeLinks } from "@/lib/game/revenge";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const links = await getActiveRevengeLinks(player.id);
  return NextResponse.json({ links });
}
