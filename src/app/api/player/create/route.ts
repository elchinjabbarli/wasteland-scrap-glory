// POST /api/player/create
// Onboarding: { name, faction } → mevcut player'ı güncelle + başlangıç eşyası ver

import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";
import { FACTIONS, type Faction } from "@/lib/game/constants";
import { giveStartingItem, ensureLoadout, seedItemTemplates } from "@/lib/seed";

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json(
        { error: "Önce giriş yapmalısın", code: "NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const faction = String(body.faction ?? "").trim() as Faction;

    // Validasyon
    if (name.length < 3 || name.length > 20) {
      return NextResponse.json(
        { error: "İsim 3-20 karakter olmalı", code: "INVALID_NAME" },
        { status: 400 }
      );
    }
    if (!/^[a-zA-Z0-9ığüşöçİĞÜŞÖÇ _-]+$/.test(name)) {
      return NextResponse.json(
        { error: "İsim sadece harf, rakam, boşluk, _ ve - içerebilir", code: "INVALID_NAME_CHARS" },
        { status: 400 }
      );
    }
    if (!["BOZKIR", "COL", "FAVELA"].includes(faction)) {
      return NextResponse.json(
        { error: "Geçersiz fraksiyon", code: "INVALID_FACTION" },
        { status: 400 }
      );
    }

    // İsim unique mi?
    const existing = await db.player.findFirst({
      where: { name, NOT: { id: player.id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Bu isim zaten alınmış", code: "NAME_TAKEN" },
        { status: 409 }
      );
    }

    // Seed item templates (idempotent)
    await seedItemTemplates();

    // Player'ı güncelle
    const updated = await db.player.update({
      where: { id: player.id },
      data: {
        name,
        faction,
        // Currency reset (onboarding son başlangıç)
        scrap: 100,
      },
    });

    // Başlangıç eşyası ver
    const startItem = await giveStartingItem(updated.id, faction);

    // Loadout oluştur
    const loadout = await ensureLoadout(updated.id);

    // Başlangıç eşyasını otomatik kuşan
    if (startItem) {
      await db.item.update({
        where: { id: startItem.id },
        data: { state: "EQUIPPED" },
      });
      await db.loadout.update({
        where: { id: loadout.id },
        data: { weaponItemId: startItem.id },
      });
    }

    return NextResponse.json({
      ok: true,
      player: {
        id: updated.id,
        name: updated.name,
        faction: updated.faction,
        level: updated.level,
      },
      startingItem: startItem
        ? {
            id: startItem.id,
            name: startItem.name,
            rarity: startItem.rarity,
            slot: "WEAPON",
          }
        : null,
    });
  } catch (err) {
    console.error("[player/create] error", err);
    return NextResponse.json(
      { error: "Karakter oluşturulamadı", code: "INTERNAL", detail: String(err) },
      { status: 500 }
    );
  }
}
