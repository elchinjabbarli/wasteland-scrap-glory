import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { createListing, LISTING_DURATIONS } from "@/lib/game/market";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { itemId, price, currency, durationHours } = body;

    if (!itemId) return NextResponse.json({ error: "itemId gerekli" }, { status: 400 });
    if (!price || price <= 0) return NextResponse.json({ error: "Geçerli fiyat gerekli" }, { status: 400 });
    if (!["SCRAP", "TECH_PART"].includes(currency)) return NextResponse.json({ error: "Geçersiz currency" }, { status: 400 });
    if (!LISTING_DURATIONS.find((d) => d.hours === durationHours)) {
      return NextResponse.json({ error: "Geçersiz süre" }, { status: 400 });
    }

    const result = await createListing(player.id, itemId, parseInt(price), currency, parseInt(durationHours));
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[market/list] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
