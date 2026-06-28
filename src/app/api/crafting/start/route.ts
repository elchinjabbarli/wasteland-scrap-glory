import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { startCrafting } from "@/lib/game/crafting";
import { type Rarity, type Slot } from "@/lib/game/constants";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const rarity = body.rarity as Rarity;
    const slot = body.slot as Slot | undefined;

    if (!["COMMON", "RARE", "EPIC", "LEGENDARY"].includes(rarity)) {
      return NextResponse.json({ error: "Geçersiz rarity" }, { status: 400 });
    }

    const result = await startCrafting(player.id, rarity, slot);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[crafting/start] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
