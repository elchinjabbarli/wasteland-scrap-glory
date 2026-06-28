import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { findPlayerByIdOrName } from "@/lib/game/friends";

export async function GET(req: NextRequest) {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  const result = await findPlayerByIdOrName(q);
  return NextResponse.json({ results: result ? (Array.isArray(result) ? result : [result]) : [] });
}
