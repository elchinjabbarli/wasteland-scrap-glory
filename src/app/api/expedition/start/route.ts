import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { startExpedition, type ZoneType } from "@/lib/game/expedition";
import { checkRateLimit } from "@/lib/game/anticheat";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const zoneType = body.zoneType as ZoneType;

    // Rate limit
    const rl = await checkRateLimit(player.id, "EXPEDITION");
    if (!rl.allowed) return NextResponse.json({ error: rl.reason }, { status: 429 });

    const result = await startExpedition(player.id, zoneType);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[expedition/start] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
