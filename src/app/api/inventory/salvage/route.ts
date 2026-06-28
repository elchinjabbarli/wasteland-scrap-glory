// POST /api/inventory/salvage
// { itemId } → eşyayı parçala, malzeme ver
// Common → Hurda, Rare → Elektronik, Epic → Tech-Part, Legendary → Kristal Tozu

import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const item = await db.item.findFirst({
      where: { id: itemId, ownerId: player.id },
    });
    if (!item) {
      return NextResponse.json({ error: "Eşya bulunamadı" }, { status: 404 });
    }
    if (item.state === "EQUIPPED") {
      return NextResponse.json({ error: "Önce eşyayı çıkar" }, { status: 400 });
    }
    if (item.state === "LISTED" || item.state === "LOCKED") {
      return NextResponse.json({ error: "Bu eşya kilitli/satılık" }, { status: 400 });
    }
    if (item.protected) {
      return NextResponse.json({ error: "Korumalı eşya parçalanamaz" }, { status: 400 });
    }

    // Malzeme ödülü rarity'ye göre
    const rewards: Record<string, { scrap?: number; electronic?: number; techPart?: number; crystalDust?: number }> = {
      COMMON: { scrap: 20 },
      RARE: { scrap: 10, electronic: 5 },
      EPIC: { electronic: 10, techPart: 2 },
      LEGENDARY: { techPart: 5, crystalDust: 1 },
    };
    const reward = rewards[item.rarity] ?? { scrap: 10 };

    // Transaction: eşyayı sil + malzemeleri artır
    await db.$transaction([
      db.item.delete({ where: { id: itemId } }),
      db.player.update({
        where: { id: player.id },
        data: {
          scrap: { increment: reward.scrap ?? 0 },
          electronic: { increment: reward.electronic ?? 0 },
          techPart: { increment: reward.techPart ?? 0 },
          crystalDust: { increment: reward.crystalDust ?? 0 },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, rewards: reward });
  } catch (err) {
    console.error("[inventory/salvage] error", err);
    return NextResponse.json({ error: "Parçalanamadı", detail: String(err) }, { status: 500 });
  }
}
