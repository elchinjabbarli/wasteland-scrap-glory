import { NextResponse } from "next/server";
import { getCurrentWeeklyEvent } from "@/lib/game/weekly-event";

export async function GET() {
  const event = await getCurrentWeeklyEvent();
  if (!event) return NextResponse.json({ event: null });
  return NextResponse.json({
    event: {
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
    },
  });
}
