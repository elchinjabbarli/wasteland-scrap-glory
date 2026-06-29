import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { startRaid } from "@/lib/game/raid";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const result = await startRaid(player.id, body.bossCode);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
