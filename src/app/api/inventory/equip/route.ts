// POST /api/inventory/equip
// { itemId } → eşyayı slotuna kuşan (önceki kuşanılanı çıkart)

import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";
import { SLOT_INFO, type Slot } from "@/lib/game/constants";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const itemId = String(body.itemId ?? "");

    if (!itemId) {
      return NextResponse.json({ error: "itemId gerekli" }, { status: 400 });
    }

    // Eşyayı çek (sahip kontrolü)
    const item = await db.item.findFirst({
      where: { id: itemId, ownerId: player.id },
    });
    if (!item) {
      return NextResponse.json({ error: "Eşya bulunamadı" }, { status: 404 });
    }
    if (item.state === "BROKEN") {
      return NextResponse.json({ error: "Kırık eşya kuşanılamaz" }, { status: 400 });
    }
    if (item.state === "LISTED" || item.state === "LOCKED") {
      return NextResponse.json({ error: "Bu eşya kilitli/satılık" }, { status: 400 });
    }

    // Slot belirle — item template'inden slot bilgisini al
    const template = await db.itemTemplate.findUnique({ where: { id: item.templateId } });
    if (!template) {
      return NextResponse.json({ error: "Şablon bulunamadı" }, { status: 500 });
    }
    const slot = template.slot as Slot;
    if (!SLOT_INFO[slot]) {
      return NextResponse.json({ error: "Geçersiz slot" }, { status: 400 });
    }

    // Loadout'u al/oluştur
    const loadout = await db.loadout.upsert({
      where: { playerId: player.id },
      update: {},
      create: { playerId: player.id },
    });

    // Önce o slotta zaten kuşanılan varsa çıkart
    const slotFieldMap: Record<Slot, "weaponItemId" | "armorItemId" | "sideToolItemId" | "companionItemId"> = {
      WEAPON: "weaponItemId",
      ARMOR: "armorItemId",
      SIDE_TOOL: "sideToolItemId",
      COMPANION: "companionItemId",
    };
    const slotField = slotFieldMap[slot];
    const previouslyEquippedId = loadout[slotField];

    if (previouslyEquippedId && previouslyEquippedId !== itemId) {
      await db.item.update({
        where: { id: previouslyEquippedId },
        data: { state: "IN_INVENTORY" },
      });
    }

    // Yeni eşyayı kuşan
    await db.item.update({
      where: { id: itemId },
      data: { state: "EQUIPPED" },
    });
    await db.loadout.update({
      where: { id: loadout.id },
      data: { [slotField]: itemId },
    });

    return NextResponse.json({ ok: true, slot });
  } catch (err) {
    console.error("[inventory/equip] error", err);
    return NextResponse.json(
      { error: "Kuşanılamadı", detail: String(err) },
      { status: 500 }
    );
  }
}
