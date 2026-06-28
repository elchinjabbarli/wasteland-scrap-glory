import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { checkPrestigeEligibility } from "@/lib/game/prestige";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eligibility = await checkPrestigeEligibility(player.id);
  return NextResponse.json(eligibility);
}
