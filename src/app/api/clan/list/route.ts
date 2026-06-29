import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { listClans } from "@/lib/game/clan";

export async function GET(req: NextRequest) {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const clans = await listClans(search);
  return NextResponse.json({ clans });
}
