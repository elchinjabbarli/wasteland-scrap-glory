// Wasteland: Scrap & Glory - Telegram Bot API Helper
// Bot token ile mesaj gönderme, webhook ayarlama, /raid komutu

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ============================================================
// MESAJ GÖNDERME
// ============================================================

export async function sendMessage(chatId: number | string, text: string, keyboard?: unknown): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };
    if (keyboard) {
      body.reply_markup = JSON.stringify(keyboard);
    }
    await fetch(`${BOT_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[telegram] sendMessage error:", err);
  }
}

/** Mini App butonlu mesaj gönder */
export async function sendMiniAppButton(chatId: number | string, text: string, buttonText: string, appUrl: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${BOT_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: JSON.stringify({
          inline_keyboard: [[
            { text: buttonText, web_app: { url: appUrl } },
          ]],
        }),
      }),
    });
  } catch (err) {
    console.error("[telegram] sendMiniAppButton error:", err);
  }
}

/** Gruba raid başlatma butonu gönder */
export async function sendRaidButton(chatId: number | string, clanName: string, bossName: string, appUrl: string): Promise<void> {
  await sendMiniAppButton(
    chatId,
    `⚔️ <b>Klan Raid Başlatıldı!</b>\n\n🎯 Klan: <b>${clanName}</b>\n👹 Boss: <b>${bossName}</b>\n\nMini App'e gidip saldır!`,
    "🎮 Savaşa Katıl",
    appUrl
  );
}

// ============================================================
// WEBHOOK AYARI
// ============================================================

export async function setWebhook(webhookUrl: string): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const res = await fetch(`${BOT_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function deleteWebhook(): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const res = await fetch(`${BOT_API}/deleteWebhook`, { method: "POST" });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function getBotInfo(): Promise<{ username?: string; first_name?: string } | null> {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`${BOT_API}/getMe`);
    const data = await res.json();
    return data.ok ? data.result : null;
  } catch {
    return null;
  }
}

// ============================================================
// BOT USERNAME
// ============================================================

export function getBotUsername(): string {
  return "wasteland_scrap_bot";
}

/** Deep link URL oluştur (GDD 9.3: revenge link) */
export function createDeepLink(startParam: string): string {
  return `https://t.me/${getBotUsername()}?start=${startParam}`;
}

/** Mini App URL (production'da Vercel domain) */
export function getMiniAppUrl(): string {
  return process.env.MINI_APP_URL || "http://localhost:3000";
}
