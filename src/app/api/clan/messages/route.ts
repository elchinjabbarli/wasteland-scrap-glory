import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getClanMessages } from "@/lib/game/clan";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!player.clanId) return NextResponse.json({ messages: [] });
  const messages = await getClanMessages(player.clanId);
  return NextResponse.json({ messages });
}
