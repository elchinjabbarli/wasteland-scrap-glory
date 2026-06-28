import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { claimAllQuests } from "@/lib/game/quests";

export async function POST() {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const result = await claimAllQuests(player.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[quests/claim] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
