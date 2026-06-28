// POST /api/inventory/unequip
// { slot } → o slot'taki eşyayı çıkar

import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";
import { type Slot } from "@/lib/game/constants";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const slot = String(body.slot ?? "") as Slot;

    const slotFieldMap: Record<Slot, "weaponItemId" | "armorItemId" | "sideToolItemId" | "companionItemId"> = {
      WEAPON: "weaponItemId",
      ARMOR: "armorItemId",
      SIDE_TOOL: "sideToolItemId",
      COMPANION: "companionItemId",
    };

    if (!slotFieldMap[slot]) {
      return NextResponse.json({ error: "Geçersiz slot" }, { status: 400 });
    }

    const loadout = await db.loadout.findUnique({ where: { playerId: player.id } });
    if (!loadout) {
      return NextResponse.json({ error: "Loadout yok" }, { status: 404 });
    }

    const slotField = slotFieldMap[slot];
    const equippedId = loadout[slotField];
    if (!equippedId) {
      return NextResponse.json({ error: "Bu slot zaten boş" }, { status: 400 });
    }

    await db.item.update({
      where: { id: equippedId },
      data: { state: "IN_INVENTORY" },
    });
    await db.loadout.update({
      where: { id: loadout.id },
      data: { [slotField]: null },
    });

    return NextResponse.json({ ok: true, slot });
  } catch (err) {
    console.error("[inventory/unequip] error", err);
    return NextResponse.json({ error: "Çıkarılamadı", detail: String(err) }, { status: 500 });
  }
}
