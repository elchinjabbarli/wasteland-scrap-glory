import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getPlayerBadgesTitles, checkAndUnlockBadgesTitles } from "@/lib/game/badges";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Otomatik kontrol (yeni rozet/unvan açılmış mı)
  await checkAndUnlockBadgesTitles(player.id);
  const result = await getPlayerBadgesTitles(player.id);
  return NextResponse.json(result);
}
