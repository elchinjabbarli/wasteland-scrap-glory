import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { checkAndUnlockAchievements } from "@/lib/game/achievements";

export async function POST() {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await checkAndUnlockAchievements(player.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[achievements/check] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
