// GET /api/auth/me

import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ player: null, needsOnboarding: false }, { status: 200 });
  }

  // Loadout + items ile birlikte dön
  const fullPlayer = await db.player.findUnique({
    where: { id: player.id },
    include: {
      loadout: {
        include: {
          weaponItem: true,
          armorItem: true,
          sideToolItem: true,
          companionItem: true,
        },
      },
    },
  });

  if (!fullPlayer) {
    return NextResponse.json({ player: null, needsOnboarding: false }, { status: 200 });
  }

  const needsOnboarding = fullPlayer.name.startsWith(`${fullPlayer.telegramName}_`);

  return NextResponse.json({
    player: {
      id: fullPlayer.id,
      name: fullPlayer.name,
      faction: fullPlayer.faction,
      level: fullPlayer.level,
      xp: fullPlayer.xp,
      prestige: fullPlayer.prestige,
      str: fullPlayer.str,
      agi: fullPlayer.agi,
      end: fullPlayer.end,
      int: fullPlayer.int,
      lck: fullPlayer.lck,
      chr: fullPlayer.chr,
      statPoints: fullPlayer.statPoints,
      scrap: fullPlayer.scrap,
      techPart: fullPlayer.techPart,
      crystal: fullPlayer.crystal,
      electronic: fullPlayer.electronic,
      crystalDust: fullPlayer.crystalDust,
      state: fullPlayer.state,
      battlesTotal: fullPlayer.battlesTotal,
      battlesWon: fullPlayer.battlesWon,
      battlesLost: fullPlayer.battlesLost,
      kills: fullPlayer.kills,
      loadout: fullPlayer.loadout
        ? {
            weapon: fullPlayer.loadout.weaponItem,
            armor: fullPlayer.loadout.armorItem,
            sideTool: fullPlayer.loadout.sideToolItem,
            companion: fullPlayer.loadout.companionItem,
          }
        : null,
    },
    needsOnboarding,
  });
}
