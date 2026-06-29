// POST /api/iap/stars
// Telegram Stars ile ödeme — sendInvoice
// GDD 15.2: iap_purchase event tracking

import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { trackEvent } from "@/lib/game/analytics";
import { db } from "@/lib/db";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Satın alınabilecek paketler
const IAP_PACKAGES = [
  { id: "scrap_small", title: "100 Hurda", description: "100 Hurda paketi", price: 10, scrap: 100 },
  { id: "scrap_medium", title: "500 Hurda", description: "500 Hurda paketi (+10% bonus)", price: 45, scrap: 550 },
  { id: "scrap_large", title: "1000 Hurda", description: "1000 Hurda paketi (+20% bonus)", price: 80, scrap: 1200 },
  { id: "crystal_small", title: "5 Antik Kristal", description: "5 Antik Kristal", price: 50, crystal: 5 },
  { id: "crystal_large", title: "20 Antik Kristal", description: "20 Antik Kristal (+10% bonus)", price: 180, crystal: 22 },
  { id: "starter_pack", title: "Başlangıç Paketi", description: "500 Hurda + 2 Tech-Part + 1 Kristal", price: 100, scrap: 500, techPart: 2, crystal: 1 },
];

export async function POST(req: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { packageId, chatId } = body;

    const pkg = IAP_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return NextResponse.json({ error: "Geçersiz paket" }, { status: 400 });
    if (!BOT_TOKEN) return NextResponse.json({ error: "Bot token yok" }, { status: 500 });

    // Telegram Stars ile fatura gönder
    const invoiceRes = await fetch(`${BOT_API}/sendInvoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId || player.telegramId,
        title: pkg.title,
        description: pkg.description,
        payload: JSON.stringify({ packageId: pkg.id, playerId: player.id }),
        currency: "XTR", // Telegram Stars
        prices: [{ label: pkg.title, amount: pkg.price }],
      }),
    });

    const invoiceData = await invoiceRes.json();

    if (!invoiceData.ok) {
      return NextResponse.json({ error: "Fatura gönderilemedi", detail: invoiceData.description }, { status: 400 });
    }

    // Event tracking
    trackEvent({
      playerId: player.id,
      eventType: "iap_purchase",
      data: { packageId: pkg.id, price: pkg.price, currency: "XTR" },
    });

    return NextResponse.json({
      ok: true,
      invoice: invoiceData.result,
      package: pkg,
    });
  } catch (err) {
    return NextResponse.json({ error: "IAP hatası", detail: String(err) }, { status: 500 });
  }
}

// GET — paket listesi
export async function GET() {
  return NextResponse.json({ packages: IAP_PACKAGES });
}
