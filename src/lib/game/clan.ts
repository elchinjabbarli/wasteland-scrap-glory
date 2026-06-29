// Wasteland: Scrap & Glory - Klan Sistemi

import { db } from "@/lib/db";

// ============================================================
// KLAN SABİTLERİ
// ============================================================

export const CLAN_CREATE_COST_SCRAP = 1000;
export const CLAN_CREATE_COST_TECH = 100;
export const CLAN_MIN_MEMBERS = 5;
export const CLAN_MAX_MEMBERS = 50;
export const CLAN_MESSAGE_MAX_LENGTH = 500;

export type ClanRole = "LEADER" | "OFFICER" | "MEMBER";

// ============================================================
// KLAN OLUŞTURMA
// ============================================================

export interface CreateClanResult {
  ok: boolean;
  clan?: { id: string; name: string; description: string };
  error?: string;
}

export async function createClan(
  playerId: string,
  name: string,
  description: string = ""
): Promise<CreateClanResult> {
  // Validasyon
  if (name.length < 3 || name.length > 20) {
    return { ok: false, error: "Klan adı 3-20 karakter olmalı" };
  }
  if (!/^[a-zA-Z0-9ığüşöçİĞÜŞÖÇ _-]+$/.test(name)) {
    return { ok: false, error: "Geçersiz karakterler" };
  }

  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };

  // Zaten klanlı mı?
  if (player.clanId) return { ok: false, error: "Zaten bir klandasın" };

  // Yeterli para?
  if (player.scrap < CLAN_CREATE_COST_SCRAP || player.techPart < CLAN_CREATE_COST_TECH) {
    return { ok: false, error: `Yetersiz: ${CLAN_CREATE_COST_SCRAP} Hurda + ${CLAN_CREATE_COST_TECH} Tech-Part gerekli` };
  }

  // İsim unique mi?
  const existing = await db.clan.findUnique({ where: { name } });
  if (existing) return { ok: false, error: "Bu klan adı zaten alınmış" };

  // Transaction: para düş + klan oluştur + leader üye yap
  const clan = await db.$transaction(async (tx) => {
    await tx.player.update({
      where: { id: playerId },
      data: {
        scrap: { decrement: CLAN_CREATE_COST_SCRAP },
        techPart: { decrement: CLAN_CREATE_COST_TECH },
      },
    });

    const newClan = await tx.clan.create({
      data: {
        name,
        description: description.slice(0, 200),
        leaderId: playerId,
      },
    });

    await tx.clanMember.create({
      data: {
        clanId: newClan.id,
        playerId,
        role: "LEADER",
      },
    });

    await tx.player.update({
      where: { id: playerId },
      data: { clanId: newClan.id, clanJoinedAt: new Date() },
    });

    return newClan;
  });

  return { ok: true, clan: { id: clan.id, name: clan.name, description: clan.description } };
}

// ============================================================
// KLANA KATILMA
// ============================================================

export async function joinClan(playerId: string, clanId: string): Promise<{ ok: boolean; error?: string }> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadı" };
  if (player.clanId) return { ok: false, error: "Zaten bir klandasın" };

  const clan = await db.clan.findUnique({
    where: { id: clanId },
    include: { _count: { select: { members: true } } },
  });
  if (!clan) return { ok: false, error: "Klan bulunamadı" };
  if (clan._count.members >= CLAN_MAX_MEMBERS) {
    return { ok: false, error: `Klan dolu (${CLAN_MAX_MEMBERS}/${CLAN_MAX_MEMBERS})` };
  }

  await db.$transaction([
    db.clanMember.create({
      data: { clanId, playerId, role: "MEMBER" },
    }),
    db.player.update({
      where: { id: playerId },
      data: { clanId, clanJoinedAt: new Date() },
    }),
  ]);

  return { ok: true };
}

// ============================================================
// KLANDAN AYRILMA
// ============================================================

export async function leaveClan(playerId: string): Promise<{ ok: boolean; error?: string }> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player || !player.clanId) return { ok: false, error: "Klanda değilsin" };

  const membership = await db.clanMember.findUnique({
    where: { playerId },
    include: { clan: { include: { _count: { select: { members: true } } } } },
  });
  if (!membership) return { ok: false, error: "Üyelik bulunamadı" };

  // Leader ayrılıyorsa ve başka üye varsa, liderliği devret veya klanı sil
  if (membership.role === "LEADER") {
    if (membership.clan._count.members === 1) {
      // Tek üye leader → klanı sil
      await db.$transaction([
        db.clanMember.delete({ where: { playerId } }),
        db.player.update({ where: { id: playerId }, data: { clanId: null, clanJoinedAt: null } }),
        db.clan.delete({ where: { id: membership.clanId } }),
      ]);
    } else {
      // Liderliği en eski OFFICER'a devret, yoksa en eski MEMBER'a
      const nextLeader = await db.clanMember.findFirst({
        where: { clanId: membership.clanId, NOT: { playerId } },
        orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
      });
      if (nextLeader) {
        await db.$transaction([
          db.clanMember.delete({ where: { playerId } }),
          db.player.update({ where: { id: playerId }, data: { clanId: null, clanJoinedAt: null } }),
          db.clanMember.update({
            where: { id: nextLeader.id },
            data: { role: "LEADER" },
          }),
          db.clan.update({
            where: { id: membership.clanId },
            data: { leaderId: nextLeader.playerId },
          }),
        ]);
      }
    }
  } else {
    // Normal üye
    await db.$transaction([
      db.clanMember.delete({ where: { playerId } }),
      db.player.update({ where: { id: playerId }, data: { clanId: null, clanJoinedAt: null } }),
    ]);
  }

  return { ok: true };
}

// ============================================================
// ÜYE KOVMA
// ============================================================

export async function kickMember(leaderId: string, memberId: string): Promise<{ ok: boolean; error?: string }> {
  const leader = await db.clanMember.findUnique({ where: { playerId: leaderId } });
  if (!leader || leader.role !== "LEADER") return { ok: false, error: "Sadece leader kovabilir" };

  const member = await db.clanMember.findUnique({ where: { playerId: memberId } });
  if (!member || member.clanId !== leader.clanId) return { ok: false, error: "Üye bulunamadı" };
  if (member.role === "LEADER") return { ok: false, error: "Leader kovanamaz" };

  await db.$transaction([
    db.clanMember.delete({ where: { playerId: memberId } }),
    db.player.update({ where: { id: memberId }, data: { clanId: null, clanJoinedAt: null } }),
  ]);

  return { ok: true };
}

// ============================================================
// KLAN BİLGİSİ
// ============================================================

export async function getClan(clanId: string) {
  const clan = await db.clan.findUnique({
    where: { id: clanId },
    include: {
      members: {
        include: {
          player: {
            select: { id: true, name: true, faction: true, level: true, prestige: true, state: true },
          },
        },
        orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
      },
      _count: { select: { members: true } },
    },
  });
  if (!clan) return null;

  return {
    id: clan.id,
    name: clan.name,
    description: clan.description,
    leaderId: clan.leaderId,
    level: clan.level,
    treasury: clan.treasury,
    treasuryTechPart: clan.treasuryTechPart,
    memberCount: clan._count.members,
    maxMembers: CLAN_MAX_MEMBERS,
    createdAt: clan.createdAt,
    members: clan.members.map((m) => ({
      id: m.id,
      playerId: m.player.id,
      name: m.player.name,
      faction: m.player.faction,
      level: m.player.level,
      prestige: m.player.prestige,
      state: m.player.state,
      role: m.role,
      joinedAt: m.joinedAt,
      totalDonated: m.totalDonated,
    })),
  };
}

/** Klan listesi (aranabilir) */
export async function listClans(search?: string, limit: number = 20) {
  const where = search
    ? { name: { contains: search } }
    : {};
  const clans = await db.clan.findMany({
    where,
    include: {
      _count: { select: { members: true } },
      members: { where: { role: "LEADER" }, select: { player: { select: { name: true } } }, take: 1 },
    },
    orderBy: { level: "desc" },
    take: limit,
  });
  return clans.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    level: c.level,
    memberCount: c._count.members,
    maxMembers: CLAN_MAX_MEMBERS,
    leaderName: c.members[0]?.player.name ?? "Unknown",
  }));
}

// ============================================================
// KLAN SOHBETİ
// ============================================================

export async function sendClanMessage(playerId: string, content: string): Promise<{ ok: boolean; error?: string; message?: unknown }> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player || !player.clanId) return { ok: false, error: "Klanda değilsin" };
  if (!content || content.trim().length === 0) return { ok: false, error: "Boş mesaj" };
  if (content.length > CLAN_MESSAGE_MAX_LENGTH) return { ok: false, error: `Mesaj çok uzun (max ${CLAN_MESSAGE_MAX_LENGTH})` };

  const msg = await db.clanMessage.create({
    data: {
      clanId: player.clanId,
      senderId: playerId,
      content: content.trim(),
    },
  });

  return {
    ok: true,
    message: {
      id: msg.id,
      senderId: playerId,
      senderName: player.name,
      senderFaction: player.faction,
      content: msg.content,
      timestamp: msg.createdAt,
    },
  };
}

export async function getClanMessages(clanId: string, limit: number = 50) {
  const messages = await db.clanMessage.findMany({
    where: { clanId },
    include: {
      sender: { select: { name: true, faction: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return messages.reverse().map((m) => ({
    id: m.id,
    senderId: m.senderId,
    senderName: m.sender.name,
    senderFaction: m.sender.faction,
    content: m.content,
    timestamp: m.createdAt,
  }));
}

// ============================================================
// KLAN HAZNESİNE BAĞIŞ
// ============================================================

export async function donateToClan(playerId: string, amount: number, currency: "SCRAP" | "TECH_PART"): Promise<{ ok: boolean; error?: string }> {
  if (amount <= 0 || amount > 100000) return { ok: false, error: "Geçersiz miktar" };

  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player || !player.clanId) return { ok: false, error: "Klanda değilsin" };

  if (currency === "SCRAP") {
    if (player.scrap < amount) return { ok: false, error: "Yetersiz Hurda" };
    await db.$transaction([
      db.player.update({ where: { id: playerId }, data: { scrap: { decrement: amount } } }),
      db.clan.update({ where: { id: player.clanId }, data: { treasury: { increment: amount } } }),
      db.clanMember.update({ where: { playerId }, data: { totalDonated: { increment: amount } } }),
    ]);
  } else {
    if (player.techPart < amount) return { ok: false, error: "Yetersiz Tech-Part" };
    await db.$transaction([
      db.player.update({ where: { id: playerId }, data: { techPart: { decrement: amount } } }),
      db.clan.update({ where: { id: player.clanId }, data: { treasuryTechPart: { increment: amount } } }),
      db.clanMember.update({ where: { playerId }, data: { totalDonated: { increment: amount } } }),
    ]);
  }

  return { ok: true };
}
