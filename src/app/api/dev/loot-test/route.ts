// GET /api/dev/loot-test
// Test: 10 rastgele eşya üret

import { NextResponse } from "next/server";
import { generateRandomItem } from "@/lib/game/loot";

export async function GET() {
  const items = Array.from({ length: 10 }, () => generateRandomItem());
  return NextResponse.json({ items });
}
