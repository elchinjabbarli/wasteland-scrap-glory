import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { attackGlobalBoss } from "@/lib/game/global-boss";
import { checkAndUnlockAchievements } from "@/lib/game/achievements";

export async function POST() {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const result = await attackGlobalBoss(player.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    const ach = await checkAndUnlockAchievements(player.id);
    return NextResponse.json({ ...result, achievements: ach.unlocked.length > 0 ? ach.unlocked : undefined });
  } catch (err) {
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
