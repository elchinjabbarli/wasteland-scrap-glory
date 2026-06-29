import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { buyListing } from "@/lib/game/market";
import { trackEvent } from "@/lib/game/analytics";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { listingId } = body;
    if (!listingId) return NextResponse.json({ error: "listingId gerekli" }, { status: 400 });

    const result = await buyListing(player.id, listingId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // GDD 15.2: market_purchase event
    trackEvent({
      playerId: player.id,
      eventType: "market_purchase",
      data: { totalPaid: result.totalPaid, item: result.item?.name },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[market/buy] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
