import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { sendDailyGift } from "@/lib/game/friends";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const result = await sendDailyGift(player.id, body.friendId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
