import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { createTradeOffer } from "@/lib/game/market";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { toPlayerId, offeredItemIds, requestedItemIds } = body;

    if (!toPlayerId) return NextResponse.json({ error: "toPlayerId gerekli" }, { status: 400 });
    if (!Array.isArray(offeredItemIds) || !Array.isArray(requestedItemIds)) {
      return NextResponse.json({ error: "offeredItemIds ve requestedItemIds array olmalı" }, { status: 400 });
    }

    const result = await createTradeOffer(player.id, toPlayerId, offeredItemIds, requestedItemIds);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[market/trade/offer] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
