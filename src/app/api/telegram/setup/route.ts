// POST /api/telegram/setup
// Telegram bot webhook URL'ini ayarlar
// Production'da: curl -X POST https://yourapp.com/api/telegram/setup -H "Content-Type: application/json" -d '{"url":"https://yourapp.com"}'

import { NextRequest, NextResponse } from "next/server";
import { setWebhook, getBotInfo, getMiniAppUrl } from "@/lib/telegram-bot";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const baseUrl = body.url || process.env.MINI_APP_URL || getMiniAppUrl();
    const webhookUrl = `${baseUrl}/api/telegram/webhook`;

    const success = await setWebhook(webhookUrl);
    const botInfo = await getBotInfo();

    return NextResponse.json({
      ok: success,
      webhookUrl,
      bot: botInfo,
      miniAppUrl: baseUrl,
    });
  } catch (err) {
    return NextResponse.json({ error: "Setup failed", detail: String(err) }, { status: 500 });
  }
}

// GET — bot info
export async function GET() {
  const botInfo = await getBotInfo();
  return NextResponse.json({
    bot: botInfo,
    miniAppUrl: getMiniAppUrl(),
  });
}
