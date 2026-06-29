import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { watchAd } from "@/lib/game/rewards";
import { trackEvent } from "@/lib/game/analytics";

export async function POST() {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await watchAd(player.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error, remainingWatches: result.remainingWatches }, { status: 400 });
    }

    // GDD 15.2: ad_watched event
    trackEvent({
      playerId: player.id,
      eventType: "ad_watched",
      data: { scrap: result.rewards?.scrap, crystal: result.rewards?.crystal },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[rewards/ad-watch] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
