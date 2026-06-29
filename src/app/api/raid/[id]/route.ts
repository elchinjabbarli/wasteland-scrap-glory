import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getRaid } from "@/lib/game/raid";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const raid = await getRaid(id);
  if (!raid) return NextResponse.json({ error: "Raid bulunamadı" }, { status: 404 });
  return NextResponse.json({ raid });
}
