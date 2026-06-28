import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getDailyChestStatus, getAdWatchStatus, DAILY_CHEST_COOLDOWN_HOURS, MAX_DAILY_AD_WATCHES } from "@/lib/game/rewards";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chest = await getDailyChestStatus(player.id);
  const ad = await getAdWatchStatus(player.id);

  return NextResponse.json({
    dailyChest: chest,
    adWatch: ad,
    constants: {
      dailyChestCooldownHours: DAILY_CHEST_COOLDOWN_HOURS,
      maxDailyAdWatches: MAX_DAILY_AD_WATCHES,
    },
  });
}
