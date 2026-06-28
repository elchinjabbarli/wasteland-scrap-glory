// Wasteland: Scrap & Glory - Haftalık Etkinlikler
// 4 tip: Çift XP, Boss Boost, Drop Festivali, Hızlı Crafting

import { db } from "@/lib/db";

// ============================================================
// ETİNLİK TANIMLARI
// ============================================================

export type WeeklyEventType = "DOUBLE_XP" | "BOSS_BOOST" | "DROP_FESTIVAL" | "FAST_CRAFT";

export interface WeeklyEventInfo {
  type: WeeklyEventType;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  xpMul: number;
  bossHpMul: number;
  bossRewardMul: number;
  dropMul: number;
  craftTimeMul: number;
  color: string;
  icon: string;
}

export const WEEKLY_EVENTS: Record<WeeklyEventType, WeeklyEventInfo> = {
  DOUBLE_XP: {
    type: "DOUBLE_XP",
    name: { tr: "Çift XP Haftası", en: "Double XP Week" },
    description: { tr: "Tüm XP ödülleri 2x!", en: "All XP rewards 2x!" },
    xpMul: 2.0,
    bossHpMul: 1.0,
    bossRewardMul: 1.0,
    dropMul: 1.0,
    craftTimeMul: 1.0,
    color: "#a855f7",
    icon: "TrendingUp",
  },
  BOSS_BOOST: {
    type: "BOSS_BOOST",
    name: { tr: "Boss Boost Haftası", en: "Boss Boost Week" },
    description: { tr: "Boss HP %20 az, ödüller %50 fazla!", en: "Boss HP -20%, rewards +50%!" },
    xpMul: 1.0,
    bossHpMul: 0.8,
    bossRewardMul: 1.5,
    dropMul: 1.0,
    craftTimeMul: 1.0,
    color: "#ef4444",
    icon: "Skull",
  },
  DROP_FESTIVAL: {
    type: "DROP_FESTIVAL",
    name: { tr: "Drop Festivali", en: "Drop Festival" },
    description: { tr: "Eşya drop şansı %50 yüksek!", en: "Item drop chance +50%!" },
    xpMul: 1.0,
    bossHpMul: 1.0,
    bossRewardMul: 1.0,
    dropMul: 1.5,
    craftTimeMul: 1.0,
    color: "#f59e0b",
    icon: "Gift",
  },
  FAST_CRAFT: {
    type: "FAST_CRAFT",
    name: { tr: "Hızlı Crafting", en: "Fast Crafting" },
    description: { tr: "Crafting süreleri yarıya iner!", en: "Crafting time halved!" },
    xpMul: 1.0,
    bossHpMul: 1.0,
    bossRewardMul: 1.0,
    dropMul: 1.0,
    craftTimeMul: 0.5,
    color: "#06b6d4",
    icon: "Hammer",
  },
};

// ============================================================
// HAFTALIK ETİNLİK ÜRET
// ============================================================

function getWeekStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getNextSundayMidnight(): Date {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysUntilSunday);
  sunday.setHours(24, 0, 0, 0);
  if (sunday <= now) {
    sunday.setDate(sunday.getDate() + 7);
  }
  return sunday;
}

export async function getCurrentWeeklyEvent(): Promise<WeeklyEventInfo | null> {
  const week = getWeekStr();
  let event = await db.weeklyEvent.findUnique({ where: { week } });

  if (!event) {
    // Yeni etkinlik — hafta numarasına göre rotasyon
    const weekNum = parseInt(week.split("-W")[1] ?? "1", 10);
    const types: WeeklyEventType[] = ["DOUBLE_XP", "BOSS_BOOST", "DROP_FESTIVAL", "FAST_CRAFT"];
    const type = types[weekNum % types.length];
    const info = WEEKLY_EVENTS[type];
    const expiresAt = getNextSundayMidnight();

    event = await db.weeklyEvent.create({
      data: {
        week,
        type,
        name: info.name.tr,
        description: info.description.tr,
        xpMul: info.xpMul,
        bossHpMul: info.bossHpMul,
        bossRewardMul: info.bossRewardMul,
        dropMul: info.dropMul,
        craftTimeMul: info.craftTimeMul,
        expiresAt,
      },
    }).catch(async () => {
      return await db.weeklyEvent.findUnique({ where: { week } });
    });
  }

  if (!event) return null;

  // Süre dolmuşsa null döndür (bir sonraki hafta yeni etkinlik oluşur)
  if (event.expiresAt < new Date()) return null;

  const info = WEEKLY_EVENTS[event.type as WeeklyEventType];
  if (!info) return null;

  return {
    ...info,
    xpMul: event.xpMul,
    bossHpMul: event.bossHpMul,
    bossRewardMul: event.bossRewardMul,
    dropMul: event.dropMul,
    craftTimeMul: event.craftTimeMul,
  };
}

/** Çarpanları stats için getir (combat/crafting/loot tarafından kullanılır) */
export async function getWeeklyMultipliers() {
  const event = await getCurrentWeeklyEvent();
  if (!event) {
    return {
      type: null,
      xpMul: 1.0,
      bossHpMul: 1.0,
      bossRewardMul: 1.0,
      dropMul: 1.0,
      craftTimeMul: 1.0,
    };
  }
  return {
    type: event.type,
    name: event.name,
    description: event.description,
    xpMul: event.xpMul,
    bossHpMul: event.bossHpMul,
    bossRewardMul: event.bossRewardMul,
    dropMul: event.dropMul,
    craftTimeMul: event.craftTimeMul,
    color: event.color,
    icon: event.icon,
  };
}
