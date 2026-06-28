import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { watchAd } from "@/lib/game/rewards";

export async function POST() {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await watchAd(player.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error, remainingWatches: result.remainingWatches }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[rewards/ad-watch] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
