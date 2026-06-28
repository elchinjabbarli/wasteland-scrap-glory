// GET /api/matchmaking/opponents
// Oyuncunun seviyesine göre 5 mock rakip üretir

import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { generateOpponents } from "@/lib/game/player-stats";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const opponents = generateOpponents(player.level);

  return NextResponse.json({
    opponents: opponents.map((o) => ({
      id: o.id,
      name: o.name,
      faction: o.faction,
      level: o.level,
      maxHp: o.maxHp,
      weaponDamage: o.weapon.damage,
      weaponElement: o.weapon.element,
      armor: o.armor?.armor ?? 0,
      hasCompanion: !!o.companion,
      companionDamage: o.companion?.companionDamage ?? 0,
      isMock: true,
    })),
  });
}
