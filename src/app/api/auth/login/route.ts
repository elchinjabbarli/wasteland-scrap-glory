// POST /api/auth/login
// Mock veya gerçek Telegram auth
// Body: { tgUserId, tgUsername, tgName } (mock) veya { initData: "user=...&hash=..." (gerçek)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, findOrCreatePlayerByTelegram, SESSION_COOKIE, SESSION_TTL_DAYS, type MockTelegramUser } from "@/lib/auth";
import { seedItemTemplates } from "@/lib/seed";
import { trackEvent } from "@/lib/game/analytics";
import { validateInitData } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let tgUser: MockTelegramUser;

    // Gerçek Telegram initData var mı?
    if (body.initData && typeof body.initData === "string") {
      const initData = validateInitData(body.initData);
      if (!initData) {
        return NextResponse.json(
          { error: "Geçersiz Telegram initData", code: "INVALID_INIT_DATA" },
          { status: 401 }
        );
      }
      tgUser = {
        tgUserId: String(initData.user.id),
        tgUsername: initData.user.username || `user_${initData.user.id}`,
        tgName: initData.user.first_name || "Survivor",
      };
    } else {
      // Mock auth (dev ortamı)
      const tgUserId = String(body.tgUserId ?? "").trim();
      const tgUsername = String(body.tgUsername ?? "").trim();
      const tgName = String(body.tgName ?? "").trim();

      if (!tgUserId || !tgUsername) {
        return NextResponse.json(
          { error: "tgUserId ve tgUsername zorunlu", code: "MISSING_FIELDS" },
          { status: 400 }
        );
      }
      tgUser = { tgUserId, tgUsername, tgName };
    }

    // Seed item templates (idempotent)
    await seedItemTemplates();

    // Player bul/oluştur
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
