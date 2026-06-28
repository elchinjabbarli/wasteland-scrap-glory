import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { claimDailyChest, getDailyChestStatus } from "@/lib/game/rewards";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getDailyChestStatus(player.id);
  return NextResponse.json(status);
}

export async function POST() {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await claimDailyChest(player.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error, nextClaimAt: result.nextClaimAt }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[rewards/daily-chest] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
