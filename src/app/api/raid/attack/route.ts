import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { attackRaid } from "@/lib/game/raid";
import { checkAndUnlockAchievements } from "@/lib/game/achievements";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const result = await attackRaid(player.id, body.raidId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    // Başarım kontrolü
    const ach = await checkAndUnlockAchievements(player.id);
    return NextResponse.json({ ...result, achievements: ach.unlocked.length > 0 ? ach.unlocked : undefined });
  } catch (err) {
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
