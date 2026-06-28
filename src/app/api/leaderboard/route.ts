import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getLeaderboard, type LeaderboardCategory } from "@/lib/game/leaderboard";

export async function GET(req: NextRequest) {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = (searchParams.get("category") as LeaderboardCategory) ?? "level";
  const limit = parseInt(searchParams.get("limit") ?? "100");

  if (!["level", "wins", "kills", "achievements"].includes(category)) {
    return NextResponse.json({ error: "Geçersiz kategori" }, { status: 400 });
  }

  const result = await getLeaderboard(category, player.id, limit);
  return NextResponse.json(result);
}
