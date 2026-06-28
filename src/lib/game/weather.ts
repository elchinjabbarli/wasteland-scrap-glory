// Wasteland: Scrap & Glory - Günlük Hava Olayı
// 3 tip: Asit Yağmuru, Radyasyon Fırtınası, Altın Saat

import { db } from "@/lib/db";

// ============================================================
// HAVA TİPLERİ
// ============================================================

export type WeatherType = "ACID_RAIN" | "RADIATION_STORM" | "GOLDEN_HOUR" | "CLEAR";

export interface WeatherInfo {
  type: WeatherType;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  multiplier: number; // ödül çarpanı
  combatMul: number; // hasar çarpanı
  dropMul: number; // drop şansı çarpanı
  durabilityLossMul: number; // dayanıklılık kaybı çarpanı
  craftingTimeMul: number; // crafting süre çarpanı
  color: string;
  icon: string;
  isPositive: boolean;
}

export const WEATHER_TYPES: Record<WeatherType, WeatherInfo> = {
  CLEAR: {
    type: "CLEAR",
    name: { tr: "Açık Hava", en: "Clear Weather" },
    description: { tr: "Normal koşullar.", en: "Normal conditions." },
    multiplier: 1.0,
    combatMul: 1.0,
    dropMul: 1.0,
    durabilityLossMul: 1.0,
    craftingTimeMul: 1.0,
    color: "#9ca3af",
    icon: "Sun",
    isPositive: true,
  },
  ACID_RAIN: {
    type: "ACID_RAIN",
    name: { tr: "Asit Yağmuru", en: "Acid Rain" },
    description: { tr: "Crafting süreleri %20 uzun. Eşya drop şansı %10 düşük.", en: "Crafting takes 20% longer. Item drop chance -10%." },
    multiplier: 1.0,
    combatMul: 1.0,
    dropMul: 0.9,
    durabilityLossMul: 1.0,
    craftingTimeMul: 1.20,
    color: "#84cc16",
    icon: "CloudRain",
    isPositive: false,
  },
  RADIATION_STORM: {
    type: "RADIATION_STORM",
    name: { tr: "Radyasyon Fırtınası", en: "Radiation Storm" },
    description: { tr: "PvP hasarı %15 yüksek. Eşya dayanıklılık %2 hızlı düşer.", en: "PvP damage +15%. Durability loss +20%." },
    multiplier: 1.0,
    combatMul: 1.15,
    dropMul: 1.0,
    durabilityLossMul: 1.20,
    craftingTimeMul: 1.0,
    color: "#facc15",
    icon: "CloudLightning",
    isPositive: false,
  },
  GOLDEN_HOUR: {
    type: "GOLDEN_HOUR",
    name: { tr: "Altın Saat", en: "Golden Hour" },
    description: { tr: "Tüm ödüller %50 fazla! Drop şansı %25 yüksek.", en: "All rewards +50%! Drop chance +25%." },
    multiplier: 1.50,
    combatMul: 1.0,
    dropMul: 1.25,
    durabilityLossMul: 1.0,
    craftingTimeMul: 1.0,
    color: "#f59e0b",
    icon: "Sparkles",
    isPositive: true,
  },
};

// ============================================================
// GÜNLÜK HAVA ÜRET
// ============================================================

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Bugünün hava olayını getir — yoksa üret (deterministik: tarih bazlı) */
export async function getDailyWeather(): Promise<WeatherInfo> {
  const day = getTodayStr();
  let weather = await db.weatherEvent.findUnique({ where: { day } });

  if (!weather) {
    // Tarih bazlı deterministik seçim (aynı gün herkes aynı hava görür)
    const dayNum = parseInt(day.replace(/-/g, ""), 10);
    const types: WeatherType[] = ["CLEAR", "ACID_RAIN", "RADIATION_STORM", "GOLDEN_HOUR"];
    const type = types[dayNum % types.length];
    const info = WEATHER_TYPES[type];

    weather = await db.weatherEvent.create({
      data: {
        type,
        day,
        multiplier: info.multiplier,
        combatMul: info.combatMul,
        dropMul: info.dropMul,
        durabilityLossMul: info.durabilityLossMul,
        craftingTimeMul: info.craftingTimeMul,
        description: info.description.tr,
      },
    }).catch(async () => {
      // Aynı gün eklendi (race condition), yeniden getir
      return await db.weatherEvent.findUnique({ where: { day } });
    });
  }

  if (!weather) return WEATHER_TYPES.CLEAR;
  return WEATHER_TYPES[weather.type as WeatherType] ?? WEATHER_TYPES.CLEAR;
}

/** Hava çarpanlarını stats için getir (crafting/loot tarafından kullanılır) */
export async function getWeatherMultipliers() {
  const w = await getDailyWeather();
  return {
    type: w.type,
    name: w.name,
    description: w.description,
    multiplier: w.multiplier,
    combatMul: w.combatMul,
    dropMul: w.dropMul,
    durabilityLossMul: w.durabilityLossMul,
    craftingTimeMul: w.craftingTimeMul,
    color: w.color,
    icon: w.icon,
    isPositive: w.isPositive,
  };
}
