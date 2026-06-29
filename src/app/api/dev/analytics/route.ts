import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getAnalyticsSummary } from "@/lib/game/analytics";

export async function GET(req: NextRequest) {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "7");

  const summary = await getAnalyticsSummary(days);
  return NextResponse.json(summary);
}
