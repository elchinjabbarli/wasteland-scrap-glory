import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getCurrentGlobalBoss } from "@/lib/game/global-boss";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const boss = await getCurrentGlobalBoss();
  return NextResponse.json({ boss });
}
