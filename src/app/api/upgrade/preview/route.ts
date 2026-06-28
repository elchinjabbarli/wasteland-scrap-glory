import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUpgradePreview } from "@/lib/game/upgrade";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const itemId = body.itemId;
    if (!itemId) return NextResponse.json({ error: "itemId gerekli" }, { status: 400 });

    const item = await db.item.findFirst({ where: { id: itemId, ownerId: player.id } });
    if (!item) return NextResponse.json({ error: "Eşya bulunamadı" }, { status: 404 });

    const preview = getUpgradePreview({
      upgradeLevel: item.upgradeLevel,
      baseDamage: item.baseDamage,
      baseArmor: item.baseArmor,
      baseHpBonus: item.baseHpBonus,
      companionHp: item.companionHp,
      companionDamage: item.companionDamage,
    });

    return NextResponse.json({ preview, item: { id: item.id, name: item.name, durability: item.durability, state: item.state } });
  } catch (err) {
    console.error("[upgrade/preview] error", err);
    return NextResponse.json({ error: "İç hata", detail: String(err) }, { status: 500 });
  }
}
