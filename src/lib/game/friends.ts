// Wasteland: Scrap & Glory - Arkadaşlık Sistemi

import { db } from "@/lib/db";

// ============================================================
// SABİTLER
// ============================================================

export const DAILY_GIFT_COOLDOWN_HOURS = 20;
export const DAILY_GIFT_SCRAP = 30;
export const DAILY_GIFT_XP = 50;

// ============================================================
// ARKADAŞ EKLEME
// ============================================================

export interface SendRequestResult {
  ok: boolean;
  requestId?: string;
  error?: string;
}

export async function sendFriendRequest(playerId: string, targetId: string): Promise<SendRequestResult> {
  if (playerId === targetId) return { ok: false, error: "Kendini ekleyemezsin" };

  const target = await db.player.findUnique({ where: { id: targetId } });
  if (!target) return { ok: false, error: "Oyuncu bulunamadı" };

  // Zaten istek var mı?
  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { playerId, friendId: targetId },
        { playerId: targetId, friendId: playerId },
      ],
    },
  });
  if (existing) {
    if (existing.status === "ACCEPTED") return { ok: false, error: "Zaten arkadaşsınız" };
    if (existing.status === "PENDING") return { ok: false, error: "Bekleyen istek var" };
  }

  const friendship = await db.friendship.create({
    data: {
      playerId,
      friendId: targetId,
      status: "PENDING",
    },
  });

  return { ok: true, requestId: friendship.id };
}

export async function acceptFriendRequest(playerId: string, requestId: string): Promise<{ ok: boolean; error?: string }> {
  const req = await db.friendship.findUnique({ where: { id: requestId } });
  if (!req) return { ok: false, error: "İstek bulunamadı" };
  if (req.friendId !== playerId) return { ok: false, error: "Bu istek sana değil" };
  if (req.status !== "PENDING") return { ok: false, error: "İstek zaten sonuçlanmış" };

  await db.friendship.update({
    where: { id: requestId },
    data: { status: "ACCEPTED", resolvedAt: new Date() },
  });

  // Ters yönde de friendship oluştur ( Friendship çift yönlü)
  // Aslında unique constraint [playerId, friendId] var, çift kayıt gerekmez
  // Sorgularda OR ile iki yönü de kontrol ederiz

  return { ok: true };
}

export async function rejectFriendRequest(playerId: string, requestId: string): Promise<{ ok: boolean; error?: string }> {
  const req = await db.friendship.findUnique({ where: { id: requestId } });
  if (!req) return { ok: false, error: "İstek bulunamadı" };
  if (req.friendId !== playerId) return { ok: false, error: "Bu istek sana değil" };

  await db.friendship.update({
    where: { id: requestId },
    data: { status: "REJECTED", resolvedAt: new Date() },
  });

  return { ok: true };
}

export async function removeFriend(playerId: string, friendId: string): Promise<{ ok: boolean; error?: string }> {
  // İki yönü de sil
  await db.friendship.deleteMany({
    where: {
      OR: [
        { playerId, friendId },
        { playerId: friendId, friendId: playerId },
      ],
    },
  });
  return { ok: true };
}

// ============================================================
// ARKADAŞ LİSTESİ
// ============================================================

export async function getFriends(playerId: string) {
  const friendships = await db.friendship.findMany({
    where: {
      OR: [{ playerId }, { friendId: playerId }],
      status: "ACCEPTED",
    },
    include: {
      player: { select: { id: true, name: true, faction: true, level: true, prestige: true, state: true, lastFlagAt: true } },
      friend: { select: { id: true, name: true, faction: true, level: true, prestige: true, state: true, lastFlagAt: true } },
    },
  });

  return friendships.map((f) => {
    const friend = f.playerId === playerId ? f.friend : f.player;
    const lastGiftReceived = f.playerId === playerId ? f.lastGiftFromFriend : f.lastGiftFromPlayer;
    const lastGiftSent = f.playerId === playerId ? f.lastGiftFromPlayer : f.lastGiftFromFriend;
    return {
      friendshipId: f.id,
      friend: {
        id: friend.id,
        name: friend.name,
        faction: friend.faction,
        level: friend.level,
        prestige: friend.prestige,
        state: friend.state,
      },
      lastGiftReceived,
      lastGiftSent,
      canSendGift: !lastGiftSent || (Date.now() - lastGiftSent.getTime()) > DAILY_GIFT_COOLDOWN_HOURS * 60 * 60 * 1000,
    };
  });
}

export async function getPendingRequests(playerId: string) {
  const requests = await db.friendship.findMany({
    where: { friendId: playerId, status: "PENDING" },
    include: {
      player: { select: { id: true, name: true, faction: true, level: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return requests.map((r) => ({
    id: r.id,
    from: {
      id: r.player.id,
      name: r.player.name,
      faction: r.player.faction,
      level: r.player.level,
    },
    createdAt: r.createdAt,
  }));
}

// ============================================================
// GÜNLÜK HEDİYE
// ============================================================

export interface GiftResult {
  ok: boolean;
  rewards?: { scrap: number; xp: number };
  error?: string;
}

export async function sendDailyGift(playerId: string, friendId: string): Promise<GiftResult> {
  // Friendship kaydını bul (iki yön)
  const friendship = await db.friendship.findFirst({
    where: {
      OR: [
        { playerId, friendId },
        { playerId: friendId, friendId: playerId },
      ],
      status: "ACCEPTED",
    },
  });
  if (!friendship) return { ok: false, error: "Arkadaşlık bulunamadı" };

  // Cooldown kontrol (playerId → friendId yönü)
  const lastGift = friendship.playerId === playerId ? friendship.lastGiftFromPlayer : friendship.lastGiftFromFriend;
  if (lastGift && (Date.now() - lastGift.getTime()) < DAILY_GIFT_COOLDOWN_HOURS * 60 * 60 * 1000) {
    const remaining = Math.ceil((DAILY_GIFT_COOLDOWN_HOURS * 60 * 60 * 1000 - (Date.now() - lastGift.getTime())) / (60 * 60 * 1000));
    return { ok: false, error: `Cooldown: ${remaining}sa kaldı` };
  }

  // Hediye: friend'e scrap+xp ver, player'dan da biraz scrap düş (gönderme maliyeti)
  const giftScrap = DAILY_GIFT_SCRAP;
  const giftXp = DAILY_GIFT_XP;
  const sendCost = 10; // gönderen 10 hurda öder

  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player || player.scrap < sendCost) {
    return { ok: false, error: "Göndermek için 10 Hurda gerekli" };
  }

  // Update friendship — lastGift alanını doğru yöne set et
  const updateData = friendship.playerId === playerId
    ? { lastGiftFromPlayer: new Date() }
    : { lastGiftFromFriend: new Date() };

  await db.$transaction([
    db.player.update({ where: { id: playerId }, data: { scrap: { decrement: sendCost } } }),
    db.player.update({ where: { id: friendId }, data: { scrap: { increment: giftScrap }, xp: { increment: giftXp } } }),
    db.friendship.update({ where: { id: friendship.id }, data: updateData }),
  ]);

  return {
    ok: true,
    rewards: { scrap: giftScrap, xp: giftXp },
  };
}

// ============================================================
// OYUNCU ARA (ID ile)
// ============================================================

export async function findPlayerByIdOrName(query: string) {
  // ID olarak dene
  const byId = await db.player.findUnique({
    where: { id: query },
    select: { id: true, name: true, faction: true, level: true, prestige: true },
  });
  if (byId) return byId;

  // İsim olarak dene
  const byName = await db.player.findFirst({
    where: { name: { contains: query } },
    select: { id: true, name: true, faction: true, level: true, prestige: true },
    take: 5,
  });
  return byName;
}
