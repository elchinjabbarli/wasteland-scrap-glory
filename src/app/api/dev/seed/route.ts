// POST /api/dev/seed
// Manual seed trigger

import { NextResponse } from "next/server";
import { seedItemTemplates } from "@/lib/seed";

export async function POST() {
  const created = await seedItemTemplates();
  return NextResponse.json({ ok: true, created });
}
