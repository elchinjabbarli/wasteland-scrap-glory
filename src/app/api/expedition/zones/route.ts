import { NextResponse } from "next/server";
import { ZONES, type ZoneType } from "@/lib/game/expedition";

export async function GET() {
  const zones = Object.values(ZONES).map((z) => ({
    code: z.code,
    name: z.name,
    description: z.description,
    minLevel: z.minLevel,
    maxLevel: z.maxLevel,
    riskPercent: z.riskPercent,
    durationMinutes: z.durationMinutes,
    color: z.color,
    icon: z.icon,
    riskType: z.riskType,
  }));
  return NextResponse.json({ zones });
}
