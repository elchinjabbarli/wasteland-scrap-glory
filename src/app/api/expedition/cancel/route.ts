import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { cancelExpedition } from "@/lib/game/expedition";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const expeditionId = body.expeditionId;
    if (!expeditionId) return NextResponse.json({ error: "expeditionId gerekli" }, { status: 400 });

    const result = await cancelExpedition(player.id, expeditionId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[expedition/cancel] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
