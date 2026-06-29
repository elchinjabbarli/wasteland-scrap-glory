// Wasteland: Scrap & Glory - Oyuncu Raporlama Sistemi
// GDD Bölüm 14.3: 3 rapor alan hesap otomatik inceleme moduna alınır

import { db } from "@/lib/db";

// ============================================================
// SABİTLER
// ============================================================

export const REPORT_THRESHOLD = 3; // 3 rapor = inceleme
export const REPORT_REASONS = ["CHEATING", "HARASSMENT", "SPAM", "OTHER"] as const;
export type ReportReason = typeof REPORT_REASONS[number];

// ============================================================
// RAPOR OLUŞTUR
// ============================================================

export interface ReportResult {
  ok: boolean;
  error?: string;
  underReview?: boolean;
}

export async function reportPlayer(
  reporterId: string,
  reportedId: string,
  reason: ReportReason,
  description: string = ""
): Promise<ReportResult> {
  if (reporterId === reportedId) return { ok: false, error: "Kendini raporlayamazsın" };
  if (!REPORT_REASONS.includes(reason)) return { ok: false, error: "Geçersiz sebep" };

  const reported = await db.player.findUnique({ where: { id: reportedId } });
  if (!reported) return { ok: false, error: "Oyuncu bulunamadı" };

  // Aynı reporter, aynı reported için tekrar raporlama (24 saat)
  const existing = await db.playerReport.findFirst({
    where: {
      reporterId,
      reportedId,
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (existing) return { ok: false, error: "Bu oyuncuyu son 24 saatte zaten raporladın" };

  // Raporu oluştur
  await db.playerReport.create({
    data: { reporterId, reportedId, reason, description: description.slice(0, 500) },
  });

  // reported'ın report count'unu artır
  const newCount = reported.reportCount + 1;
  const underReview = newCount >= REPORT_THRESHOLD;

  await db.player.update({
    where: { id: reportedId },
    data: {
      reportCount: newCount,
      underReview,
    },
  });

  return { ok: true, underReview };
}

/** Player'ın rapor durumu */
export async function getReportStatus(playerId: string) {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return null;

  return {
    reportCount: player.reportCount,
    underReview: player.underReview,
    threshold: REPORT_THRESHOLD,
  };
}

/** Admin: Bekleyen raporlar */
export async function getPendingReports(limit: number = 20) {
  const reports = await db.playerReport.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return reports;
}
