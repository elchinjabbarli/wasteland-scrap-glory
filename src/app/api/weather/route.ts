import { NextResponse } from "next/server";
import { getDailyWeather } from "@/lib/game/weather";

export async function GET() {
  const weather = await getDailyWeather();
  return NextResponse.json({
    type: weather.type,
    name: weather.name,
    description: weather.description,
    multiplier: weather.multiplier,
    combatMul: weather.combatMul,
    dropMul: weather.dropMul,
    durabilityLossMul: weather.durabilityLossMul,
    craftingTimeMul: weather.craftingTimeMul,
    color: weather.color,
    icon: weather.icon,
    isPositive: weather.isPositive,
  });
}
