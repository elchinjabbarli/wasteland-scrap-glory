import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { speedUpExpedition } from "@/lib/game/expedition";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { expeditionId, method } = body;
    if (!expeditionId) return NextResponse.json({ error: "expeditionId gerekli" }, { status: 400 });
    if (!["AD", "CRYSTAL"].includes(method)) return NextResponse.json({ error: "Geçersiz method" }, { status: 400 });

    const result = await speedUpExpedition(player.id, expeditionId, method);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[expedition/speedup] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
