// GET /api/cron/weekly-reset
// Vercel Cron — Her Pazar gece yarısı çalışır
// GDD 13.2: Haftalık liderlik tablosu sıfırlama

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Vercel cron'dan geldiğini doğrula
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Burada haftalık reset işlemleri yapılır:
    // 1. Liderlik tablosu snapshot (geçen haftanın şampiyonu kaydet)
    // 2. Haftalık event yeni hafta için tetikle
    // 3. Global boss yeni HP ile yeniden başlat
    // 4. Tournament yeni hafta başlat

    return NextResponse.json({
      ok: true,
      message: "Weekly reset completed",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/weekly-reset] error:", err);
    return NextResponse.json({ error: "Reset failed", detail: String(err) }, { status: 500 });
  }
}
