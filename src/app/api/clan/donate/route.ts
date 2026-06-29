import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { donateToClan } from "@/lib/game/clan";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const result = await donateToClan(player.id, parseInt(body.amount), body.currency);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
