// Wasteland: Scrap & Glory - Analitik / Event Tracking
// GDD Bölüm 15: user_login, battle_start, battle_end, item_crafted, market_listing, market_purchase, ad_watched, iap_purchase

import { db } from "@/lib/db";

// ============================================================
// EVENT TİPLERİ (GDD 15.2)
// ============================================================

export type EventType =
  | "user_login"
  | "battle_start"
  | "battle_end"
  | "item_crafted"
  | "market_listing"
  | "market_purchase"
  | "ad_watched"
  | "iap_purchase"
  | "expedition_start"
  | "expedition_complete"
  | "prestige_perform"
  | "clan_create"
  | "clan_join"
  | "raid_attack"
  | "global_boss_attack"
  | "tutorial_complete";

export interface TrackEventOptions {
  playerId?: string;
  eventType: EventType;
  data?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/** Event logla — fire and forget, hata vermez */
export async function trackEvent(opts: TrackEventOptions): Promise<void> {
  try {
    await db.eventLog.create({
      data: {
        playerId: opts.playerId ?? null,
        eventType: opts.eventType,
        dataJson: JSON.stringify(opts.data ?? {}),
        ipAddress: opts.ipAddress ?? null,
        userAgent: opts.userAgent ?? null,
      },
    });
  } catch (err) {
    // Analitik hatası ana akışı bozmamalı
    console.error("[analytics] trackEvent error:", err);
  }
}

/** Analitik özet — admin dashboard için */
export async function getAnalyticsSummary(days: number = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await db.eventLog.findMany({
    where: { createdAt: { gt: since } },
    select: { eventType: true, createdAt: true, playerId: true },
  });

  // Event type bazında sayım
  const byType: Record<string, number> = {};
  const uniquePlayers = new Set<string>();
  const dailyActive: Record<string, Set<string>> = {};

  for (const e of events) {
    byType[e.eventType] = (byType[e.eventType] ?? 0) + 1;
    if (e.playerId) {
      uniquePlayers.add(e.playerId);
      const dayKey = e.createdAt.toISOString().split("T")[0];
      if (!dailyActive[dayKey]) dailyActive[dayKey] = new Set();
      dailyActive[dayKey].add(e.playerId);
    }
  }

  // DAU (Daily Active Users)
  const dau = Object.entries(dailyActive).map(([day, players]) => ({
    day,
    count: players.size,
  })).sort((a, b) => a.day.localeCompare(b.day));

  return {
    totalEvents: events.length,
    uniquePlayers: uniquePlayers.size,
    byType,
    dau,
    days,
  };
}

/** Belirli event'in player için sayısı */
export async function getPlayerEventCount(playerId: string, eventType: EventType): Promise<number> {
  return db.eventLog.count({
    where: { playerId, eventType },
  });
}
