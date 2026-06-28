import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";

// GET — mevcut tutorial step
export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ step: player.tutorialStep });
}

// POST — tutorial step güncelle
export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const step = Math.max(0, Math.min(5, parseInt(body.step ?? "0")));

    const updated = await db.player.update({
      where: { id: player.id },
      data: { tutorialStep: step },
    });

    // Tutorial tamamlandı (step 5) → 100 Hurda ödül
    if (step === 5 && player.tutorialStep < 5) {
      await db.player.update({
        where: { id: player.id },
        data: { scrap: { increment: 100 } },
      });
      return NextResponse.json({ ok: true, step: updated.tutorialStep, reward: { scrap: 100 } });
    }

    return NextResponse.json({ ok: true, step: updated.tutorialStep });
  } catch (err) {
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
