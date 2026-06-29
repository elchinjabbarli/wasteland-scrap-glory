import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { claimDailyChest, getDailyChestStatus } from "@/lib/game/rewards";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getDailyChestStatus(player.id);
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // GDD 13.1: Reklam ile 2x — body'den withAd parametresi al
    let withAd = false;
    try {
      const body = await req.json();
      withAd = body?.withAd === true;
    } catch {
      // body yoksa normal sandık
    }

    const result = await claimDailyChest(player.id, withAd);
    if (!result.ok) {
      return NextResponse.json({ error: result.error, nextClaimAt: result.nextClaimAt }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[rewards/daily-chest] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
