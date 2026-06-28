import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getCraftingJobs, getReadyJobs } from "@/lib/game/crafting";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await getCraftingJobs(player.id);
  const ready = await getReadyJobs(player.id);

  return NextResponse.json({
    jobs,
    readyCount: ready.length,
  });
}
