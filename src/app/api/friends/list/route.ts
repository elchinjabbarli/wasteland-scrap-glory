import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getFriends } from "@/lib/game/friends";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const friends = await getFriends(player.id);
  return NextResponse.json({ friends });
}
