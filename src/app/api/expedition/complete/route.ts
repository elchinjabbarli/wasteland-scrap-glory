import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { completeExpedition } from "@/lib/game/expedition";
import { checkAndUnlockAchievements } from "@/lib/game/achievements";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const expeditionId = body.expeditionId;
    if (!expeditionId) return NextResponse.json({ error: "expeditionId gerekli" }, { status: 400 });

    const result = await completeExpedition(player.id, expeditionId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    // Başarım kontrolü (başarılıysa)
    if (result.success) {
      const ach = await checkAndUnlockAchievements(player.id);
      if (ach.unlocked.length > 0) {
        return NextResponse.json({ ...result, achievements: ach.unlocked });
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[expedition/complete] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
