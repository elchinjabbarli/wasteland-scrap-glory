import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getPendingRequests } from "@/lib/game/friends";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requests = await getPendingRequests(player.id);
  return NextResponse.json({ requests });
}
