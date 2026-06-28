// Wasteland: Scrap & Glory - Mock Telegram Auth Helper
// Gerçek bot olmadan geliştirme için. Production'da Telegram WebApp API ile değiştirilecek.

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export const SESSION_COOKIE = "wsg_session";
export const SESSION_TTL_DAYS = 30;

export interface MockTelegramUser {
  tgUserId: string;
  tgUsername: string;
  tgName: string;
}

/** Cookie'den session token oku → player döndür (server-side) */
export async function getCurrentPlayer() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { player: { include: { loadout: true } } },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.player;
}

/** Session oluştur ve cookie'ye yaz */
export async function createSession(playerId: string, tgUser: MockTelegramUser): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await db.session.create({
    data: {
      token,
      playerId,
      telegramId: tgUser.tgUserId,
      telegramName: tgUser.tgUsername,
      expiresAt,
    },
  });

  return token;
}

/** Telegram ID'den veya yeni oluşturarak player bul/oluştur (auth-only, karakter oluşturma ayrı) */
export async function findOrCreatePlayerByTelegram(tgUser: MockTelegramUser) {
  // Önce session ile eşleşen player var mı kontrol et
  const existing = await db.player.findUnique({
    where: { telegramId: tgUser.tgUserId },
  });

  if (existing) return existing;

  // Yeni player oluştur (henüz karakter oluşturmamış — name = tg username)
  // Aslında player creation ayrı API; burada sadece minimal kayıt
  const newPlayer = await db.player.create({
    data: {
      telegramId: tgUser.tgUserId,
      telegramName: tgUser.tgUsername,
      name: `${tgUser.tgUsername}_${tgUser.tgUserId.slice(-4)}`, // geçici unique isim
      faction: "BOZKIR", // default; kullanıcı onboarding'de değiştirir
      level: 1,
      xp: 0,
      str: 5,
      agi: 5,
      end: 5,
      int: 5,
      lck: 5,
      chr: 5,
      scrap: 100,
    },
  });

  return newPlayer;
}

/** Player'ın karakter oluşturma yapıp yapmadığını kontrol et (onboarding gerekli mi?) */
export function needsOnboarding(player: {
  faction: string;
  name: string;
  telegramName: string;
}): boolean {
  // Eğer name hala "tguser_xxxx" formatındaysa onboarding gerekli
  // Veya faction default'tan değişmemişse ve oyuncu henüz onboarding yapmamışsa
  // Basit yaklaşım: name telegramName değilse onboarding yapılmış demektir
  return player.name.startsWith(`${player.telegramName}_`);
}
