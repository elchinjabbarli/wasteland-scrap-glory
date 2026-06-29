import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { reportPlayer, REPORT_REASONS, type ReportReason } from "@/lib/game/reports";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { reportedId, reason, description } = body;

    if (!reportedId) return NextResponse.json({ error: "reportedId gerekli" }, { status: 400 });
    if (!REPORT_REASONS.includes(reason)) return NextResponse.json({ error: "Geçersiz sebep" }, { status: 400 });

    const result = await reportPlayer(player.id, reportedId, reason as ReportReason, description ?? "");
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
