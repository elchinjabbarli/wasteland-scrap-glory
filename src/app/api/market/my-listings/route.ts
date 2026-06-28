import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getMyListings, FREE_LISTING_LIMIT } from "@/lib/game/market";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listings = await getMyListings(player.id);
  return NextResponse.json({
    listings,
    activeCount: listings.length,
    limit: FREE_LISTING_LIMIT,
  });
}
