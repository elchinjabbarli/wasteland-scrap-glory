import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getActiveListings } from "@/lib/game/market";

export async function GET(req: NextRequest) {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = {
    slot: searchParams.get("slot") || undefined,
    rarity: searchParams.get("rarity") || undefined,
    currency: searchParams.get("currency") || undefined,
    minPrice: searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined,
    maxPrice: searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined,
    sortBy: (searchParams.get("sortBy") as "price_asc" | "price_desc" | "newest" | "rarity") || "newest",
    limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 30,
    offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0,
  };

  const result = await getActiveListings(filter);
  return NextResponse.json(result);
}
