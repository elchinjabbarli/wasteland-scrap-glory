// POST /api/auth/login
// Mock Telegram auth: { tgUserId, tgUsername, tgName } → session token

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, findOrCreatePlayerByTelegram, SESSION_COOKIE, SESSION_TTL_DAYS, type MockTelegramUser } from "@/lib/auth";
import { seedItemTemplates } from "@/lib/seed";
import { trackEvent } from "@/lib/game/analytics";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tgUserId = String(body.tgUserId ?? "").trim();
    const tgUsername = String(body.tgUsername ?? "").trim();
    const tgName = String(body.tgName ?? "").trim();

    if (!tgUserId || !tgUsername) {
      return NextResponse.json(
        { error: "tgUserId ve tgUsername zorunlu", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    // Seed item templates (idempotent)
    await seedItemTemplates();

    // Player bul/oluştur
    const tgUser: MockTelegramUser = { tgUserId, tgUsername, tgName };
    const player = await findOrCreatePlayerByTelegram(tgUser);

    // Session oluştur
    const token = await createSession(player.id, tgUser);

    const res = NextResponse.json({
      ok: true,
      player: {
        id: player.id,
        name: player.name,
        faction: player.faction,
        level: player.level,
        needsOnboarding: player.name.startsWith(`${player.telegramName}_`),
      },
    });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
      path: "/",
    });

    // Faz 7: Analitik — user_login event
    trackEvent({
      playerId: player.id,
      eventType: "user_login",
      data: { tgUsername: player.telegramName },
    });

    return res;
  } catch (err) {
    console.error("[auth/login] error", err);
    return NextResponse.json(
      { error: "Giriş yapılamadı", code: "INTERNAL", detail: String(err) },
      { status: 500 }
    );
  }
}
