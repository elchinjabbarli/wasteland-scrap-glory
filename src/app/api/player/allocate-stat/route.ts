import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { allocateStat, STAT_KEYS, type StatKey } from "@/lib/game/prestige";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const stat = body.stat as StatKey;
    const points = body.points ? parseInt(body.points) : 1;

    if (!STAT_KEYS.includes(stat)) {
      return NextResponse.json({ error: "Geçersiz stat" }, { status: 400 });
    }

    const result = await allocateStat(player.id, stat, points);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[player/allocate-stat] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
