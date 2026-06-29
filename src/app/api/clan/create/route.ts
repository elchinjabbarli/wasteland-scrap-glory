import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { createClan } from "@/lib/game/clan";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const result = await createClan(player.id, body.name, body.description ?? "");
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[clan/create] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
