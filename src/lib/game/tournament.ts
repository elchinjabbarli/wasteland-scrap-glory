// Wasteland: Scrap & Glory - PvP Turnuva Sistemi
// Haftalık turnuva, eleme turu, ödül havuzu

import { db } from "@/lib/db";
import { compilePlayerStats, generateMockOpponent, type MockOpponent } from "./player-stats";
import { simulateCombat } from "./combat";

// ============================================================
// SABİTLER
// ============================================================

export const TOURNAMENT_ENTRY_FEE = 50;
export const TOURNAMENT_MAX_PARTICIPANTS = 16;
export const TOURNAMENT_REGISTRATION_DAYS = 5; // 5 gün kayıt, 2 gün mücadele
export const TOURNAMENT_TOTAL_ROUNDS = 4; // 16→8→4→2→1

// Ödül dağılımı (toplam havuzun %'si)
export const PRIZE_DISTRIBUTION = {
  1: 0.50, // Şampiyon: %50
  2: 0.25, // Finalist: %25
  3: 0.10, // Yarı final: %10
  4: 0.10, // Yarı final: %10
  5: 0.025, // Çeyrek final (4 kişi): %2.5
};

// ============================================================
// HAFTALIK TURNUVA ÜRET
// ============================================================

function getWeekStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getTournamentStartEnd(): { startsAt: Date; endsAt: Date } {
  const now = new Date();
  // Bu hafta Pazartesi başlat (kayıt), Pazar bitir
  const dayOfWeek = now.getDay(); // 0 = Pazar
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  sunday.setHours(23, 59, 59, 0);

  return { startsAt: monday, endsAt: sunday };
}

export async function getCurrentTournament() {
  const week = getWeekStr();
  let tournament = await db.tournament.findUnique({
    where: { week },
    include: {
      participants: {
        include: {
          player: { select: { id: true, name: true, faction: true, level: true, prestige: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      matches: {
        include: {
          playerA: { select: { id: true, name: true, faction: true, level: true } },
          playerB: { select: { id: true, name: true, faction: true, level: true } },
        },
        orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
      },
      _count: { select: { participants: true } },
    },
  });

  if (!tournament) {
    // Yeni turnuva oluştur
    const { startsAt, endsAt } = getTournamentStartEnd();
    tournament = await db.tournament.create({
      data: {
        week,
        type: "WEEKLY_PVP",
        name: `Haftalık PvP Turnuvası ${week}`,
        description: "16 kişilik eleme turnuvası. Kazanan ödül havuzunun %50'sini alır!",
        entryFee: TOURNAMENT_ENTRY_FEE,
        entryCurrency: "SCRAP",
        maxParticipants: TOURNAMENT_MAX_PARTICIPANTS,
        totalRounds: TOURNAMENT_TOTAL_ROUNDS,
        expiresAt: endsAt,
        status: "REGISTRATION",
      },
      include: {
        participants: { include: { player: { select: { id: true, name: true, faction: true, level: true, prestige: true } } } },
        matches: { include: { playerA: { select: { id: true, name: true, faction: true, level: true } }, playerB: { select: { id: true, name: true, faction: true, level: true } } } },
        _count: { select: { participants: true } },
      },
    }).catch(async () => {
      return await db.tournament.findUnique({
        where: { week },
        include: {
          participants: { include: { player: { select: { id: true, name: true, faction: true, level: true, prestige: true } } } },
          matches: { include: { playerA: { select: { id: true, name: true, faction: true, level: true } }, playerB: { select: { id: true, name: true, faction: true, level: true } } } },
          _count: { select: { participants: true } },
        },
      });
    });
  }

  if (!tournament) return null;

  // Süre dolmuşsa ve hala REGISTRATION ise → başlat
  if (tournament.status === "REGISTRATION" && tournament.expiresAt < new Date()) {
    await startTournament(tournament.id);
    tournament = await db.tournament.findUnique({
      where: { id: tournament.id },
      include: {
        participants: { include: { player: { select: { id: true, name: true, faction: true, level: true, prestige: true } } } },
        matches: { include: { playerA: { select: { id: true, name: true, faction: true, level: true } }, playerB: { select: { id: true, name: true, faction: true, level: true } } } },
        _count: { select: { participants: true } },
      },
    });
  }

  return tournament;
}

// ============================================================
// KAYIT (JOIN)
// ============================================================

export async function joinTournament(playerId: string): Promise<{ ok: boolean; error?: string }> {
  const tournament = await getCurrentTournament();
  if (!tournament) return { ok: false, error: "Turnuva bulunamadı" };
  if (tournament.status !== "REGISTRATION") return { ok: false, error: "Kayıt süresi bitti" };

  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player bulunamadu" };

  // Zaten katıldı mı?
  const existing = tournament.participants.find((p) => p.playerId === playerId);
  if (existing) return { ok: false, error: "Zaten kayıtlısın" };

  // Dolu mu?
  if (tournament.participants.length >= tournament.maxParticipants) {
    return { ok: false, error: "Turnuva dolu" };
  }

  // Ücret kontrol
  if (player.scrap < tournament.entryFee) {
    return { ok: false, error: `Yetersiz Hurda (${tournament.entryFee} gerekli)` };
  }

  await db.$transaction([
    db.player.update({
      where: { id: playerId },
      data: { scrap: { decrement: tournament.entryFee } },
    }),
    db.tournamentParticipant.create({
      data: {
        tournamentId: tournament.id,
        playerId,
        seed: tournament.participants.length + 1,
      },
    }),
    db.tournament.update({
      where: { id: tournament.id },
      data: { prizePool: { increment: tournament.entryFee } },
    }),
  ]);

  return { ok: true };
}

// ============================================================
// TURNUVA BAŞLAT (bracket oluştur)
// ============================================================

async function startTournament(tournamentId: string): Promise<void> {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    include: { participants: { orderBy: { seed: "asc" } } },
  });
  if (!tournament || tournament.participants.length < 2) {
    // Yeterli katılım yok → iptal
    await db.tournament.update({
      where: { id: tournamentId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return;
  }

  // Round 1 maçları oluştur
  const participants = tournament.participants;
  const matchCount = Math.floor(participants.length / 2);

  for (let i = 0; i < matchCount; i++) {
    const playerA = participants[i * 2];
    const playerB = participants[i * 2 + 1];
    if (playerA && playerB) {
      await db.tournamentMatch.create({
        data: {
          tournamentId,
          round: 1,
          matchNumber: i + 1,
          playerAId: playerA.playerId,
          playerBId: playerB.playerId,
          status: "PENDING",
        },
      });
    }
  }

  // Eğer tek kalan varsa (bye) → otomatik geç
  if (participants.length % 2 === 1) {
    const bye = participants[participants.length - 1];
    if (bye) {
      await db.tournamentMatch.create({
        data: {
          tournamentId,
          round: 1,
          matchNumber: matchCount + 1,
          playerAId: bye.playerId,
          playerBId: null, // bye
          winnerId: bye.playerId,
          status: "COMPLETED",
          playedAt: new Date(),
        },
      });
    }
  }

  await db.tournament.update({
    where: { id: tournamentId },
    data: {
      status: "ACTIVE",
      currentRound: 1,
      startedAt: new Date(),
    },
  });
}

// ============================================================
// MAÇ OYNA
// ============================================================

export interface PlayMatchResult {
  ok: boolean;
  won?: boolean;
  scoreA?: number;
  scoreB?: number;
  advanced?: boolean;
  error?: string;
}

export async function playTournamentMatch(playerId: string, matchId: string): Promise<PlayMatchResult> {
  const match = await db.tournamentMatch.findUnique({
    where: { id: matchId },
    include: { tournament: true },
  });
  if (!match) return { ok: false, error: "Maç bulunamadı" };
  if (match.status === "COMPLETED") return { ok: false, error: "Maç zaten oynandı" };

  // Player bu maçta mı?
  const isPlayerA = match.playerAId === playerId;
  const isPlayerB = match.playerBId === playerId;
  if (!isPlayerA && !isPlayerB) return { ok: false, error: "Bu maçta değilsin" };

  const player = await db.player.findUnique({
    where: { id: playerId },
    include: {
      loadout: {
        include: { weaponItem: true, armorItem: true, sideToolItem: true, companionItem: true },
      },
    },
  });
  if (!player) return { ok: false, error: "Player bulunamadu" };
  if (!player.loadout?.weaponItem) return { ok: false, error: "Silah kuşan gerekli" };

  // Rakip: gerçek player (PvP) veya mock (eğer gerçek player ID yoksa)
  const opponentId = isPlayerA ? match.playerBId : match.playerAId;
  let opponent: MockOpponent;
  let opponentRealPlayer: { id: string; level: number; name: string; faction: string; str: number; agi: number; end: number; int: number; lck: number; chr: number } | null = null;

  if (opponentId) {
    // Gerçek rakip — mock opponent üret (level bazlı)
    const opp = await db.player.findUnique({ where: { id: opponentId } });
    if (opp) {
      opponentRealPlayer = opp;
      opponent = generateMockOpponent(opp.level, 0);
      opponent.name = opp.name;
      opponent.faction = opp.faction;
    } else {
      opponent = generateMockOpponent(player.level, 0);
    }
  } else {
    // Bye (olmamalı, ama fallback)
    return { ok: false, error: "Geçersiz maç" };
  }

  // Player stats derle
  const playerStats = await compilePlayerStats(player, player.loadout);

  // Savaş simülasyonu (best of 1)
  const result = simulateCombat(playerStats, opponent);

  // Skor güncelle
  const newScoreA = isPlayerA ? (result.playerWon ? 1 : 0) : (result.playerWon ? 0 : 1);
  const newScoreB = isPlayerA ? (result.playerWon ? 0 : 1) : (result.playerWon ? 1 : 0);
  const winnerId = result.playerWon ? playerId : opponentId;

  await db.tournamentMatch.update({
    where: { id: matchId },
    data: {
      scoreA: newScoreA,
      scoreB: newScoreB,
      winnerId,
      status: "COMPLETED",
      playedAt: new Date(),
    },
  });

  // Kaybedeni ele
  const loserId = result.playerWon ? opponentId : playerId;
  await db.tournamentParticipant.updateMany({
    where: { tournamentId: match.tournamentId, playerId: loserId },
    data: { eliminated: true, eliminatedRound: match.round },
  });

  // Player stats güncelle (savaş istatistiği)
  await db.player.update({
    where: { id: playerId },
    data: {
      battlesTotal: { increment: 1 },
      battlesWon: { increment: result.playerWon ? 1 : 0 },
      battlesLost: { increment: result.playerWon ? 0 : 1 },
      kills: { increment: result.playerWon ? 1 : 0 },
    },
  });

  // Bu round tamamlandı mı kontrol et, sonraki round oluştur
  await checkRoundComplete(match.tournamentId, match.round);

  return {
    ok: true,
    won: result.playerWon,
    scoreA: newScoreA,
    scoreB: newScoreB,
  };
}

// ============================================================
// ROUND TAMAMLANMA KONTROL
// ============================================================

async function checkRoundComplete(tournamentId: string, round: number): Promise<void> {
  const matches = await db.tournamentMatch.findMany({
    where: { tournamentId, round },
  });
  const allCompleted = matches.every((m) => m.status === "COMPLETED");
  if (!allCompleted) return;

  const winners = matches.map((m) => m.winnerId).filter((w): w is string => w !== null);

  // Turnuva bitti mi?
  if (winners.length === 1) {
    await completeTournament(tournamentId, winners[0]);
    return;
  }

  // Sonraki round maçları oluştur
  const nextRound = round + 1;
  const matchCount = Math.floor(winners.length / 2);

  for (let i = 0; i < matchCount; i++) {
    const playerA = winners[i * 2];
    const playerB = winners[i * 2 + 1];
    if (playerA && playerB) {
      await db.tournamentMatch.create({
        data: {
          tournamentId,
          round: nextRound,
          matchNumber: i + 1,
          playerAId: playerA,
          playerBId: playerB,
          status: "PENDING",
        },
      });
    }
  }

  // Bye
  if (winners.length % 2 === 1) {
    const bye = winners[winners.length - 1];
    await db.tournamentMatch.create({
      data: {
        tournamentId,
        round: nextRound,
        matchNumber: matchCount + 1,
        playerAId: bye,
        playerBId: null,
        winnerId: bye,
        status: "COMPLETED",
        playedAt: new Date(),
      },
    });
  }

  await db.tournament.update({
    where: { id: tournamentId },
    data: { currentRound: nextRound },
  });
}

// ============================================================
// TURNUVA TAMAMLA + ÖDÜL DAĞIT
// ============================================================

async function completeTournament(tournamentId: string, championId: string): Promise<void> {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      participants: {
        include: { player: { select: { id: true } } },
        orderBy: { eliminatedRound: "desc" },
      },
    },
  });
  if (!tournament) return;

  // Finalist bul (son round'da kaybeden)
  const finalMatch = await db.tournamentMatch.findFirst({
    where: { tournamentId, round: tournament.totalRounds },
  });
  const finalistId = finalMatch?.winnerId === championId ? finalMatch.playerBId : finalMatch?.playerAId;

  // Yarı finalistler (round totalRounds - 1'de elenenler)
  const semifinalists = tournament.participants.filter(
    (p) => p.eliminatedRound === tournament.totalRounds - 1 && !p.eliminated === false
  );

  // Ödüller dağıt
  const prizePool = tournament.prizePool;
  const championPrize = Math.floor(prizePool * PRIZE_DISTRIBUTION[1]);
  const finalistPrize = Math.floor(prizePool * PRIZE_DISTRIBUTION[2]);
  const semifinalistPrize = Math.floor(prizePool * PRIZE_DISTRIBUTION[3]);

  if (championId) {
    await db.player.update({
      where: { id: championId },
      data: { scrap: { increment: championPrize } },
    });
  }
  if (finalistId) {
    await db.player.update({
      where: { id: finalistId },
      data: { scrap: { increment: finalistPrize } },
    });
  }
  for (const sf of semifinalists) {
    if (sf.playerId !== championId && sf.playerId !== finalistId) {
      await db.player.update({
        where: { id: sf.playerId },
        data: { scrap: { increment: semifinalistPrize } },
      });
    }
  }

  // Final rank güncelle
  await db.tournamentParticipant.updateMany({
    where: { tournamentId, playerId: championId },
    data: { finalRank: 1 },
  });
  if (finalistId) {
    await db.tournamentParticipant.updateMany({
      where: { tournamentId, playerId: finalistId },
      data: { finalRank: 2 },
    });
  }

  await db.tournament.update({
    where: { id: tournamentId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

// ============================================================
// PLAYER'IN TURNUVA DURUMU
// ============================================================

export async function getPlayerTournamentStatus(playerId: string) {
  const tournament = await getCurrentTournament();
  if (!tournament) return null;

  const participation = tournament.participants.find((p) => p.playerId === playerId);
  const playerMatches = tournament.matches.filter(
    (m) => m.playerAId === playerId || m.playerBId === playerId
  );
  const pendingMatch = playerMatches.find((m) => m.status === "PENDING" && (m.playerAId === playerId || m.playerBId === playerId));

  return {
    tournament: {
      id: tournament.id,
      week: tournament.week,
      name: tournament.name,
      status: tournament.status,
      currentRound: tournament.currentRound,
      totalRounds: tournament.totalRounds,
      participantCount: tournament.participants.length,
      maxParticipants: tournament.maxParticipants,
      prizePool: tournament.prizePool,
      entryFee: tournament.entryFee,
      expiresAt: tournament.expiresAt,
    },
    participation: participation
      ? {
          seed: participation.seed,
          eliminated: participation.eliminated,
          eliminatedRound: participation.eliminatedRound,
          finalRank: participation.finalRank,
        }
      : null,
    pendingMatch: pendingMatch
      ? {
          id: pendingMatch.id,
          round: pendingMatch.round,
          matchNumber: pendingMatch.matchNumber,
          opponent: pendingMatch.playerAId === playerId ? pendingMatch.playerB : pendingMatch.playerA,
        }
      : null,
    matches: playerMatches.map((m) => ({
      id: m.id,
      round: m.round,
      matchNumber: m.matchNumber,
      opponent: m.playerAId === playerId ? m.playerB : m.playerA,
      won: m.winnerId === playerId,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      status: m.status,
    })),
    allMatches: tournament.matches.map((m) => ({
      id: m.id,
      round: m.round,
      matchNumber: m.matchNumber,
      playerA: m.playerA,
      playerB: m.playerB,
      winnerId: m.winnerId,
      status: m.status,
    })),
  };
}
