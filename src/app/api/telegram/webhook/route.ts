// POST /api/telegram/webhook
// Telegram Bot webhook handler — /start, /raid, /help komutları

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMessage, sendRaidButton, sendMiniAppButton, getMiniAppUrl, createDeepLink } from "@/lib/telegram-bot";
import { startRaid, RAID_BOSSES } from "@/lib/game/raid";
import { trackEvent } from "@/lib/game/analytics";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string; title?: string };
    from?: { id: number; username?: string; first_name?: string; language_code?: string };
    text?: string;
    successful_payment?: {
      invoice_payload: string;
      telegram_payment_charge_id: string;
      total_amount: number;
      currency: string;
    };
  };
  pre_checkout_query?: {
    id: string;
    from: { id: number; username?: string };
    invoice_payload: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();

    // Pre-checkout query (ödeme onayı)
    if (update.pre_checkout_query) {
      const BOT_TOKEN_LOCAL = process.env.TELEGRAM_BOT_TOKEN;
      const BOT_API_LOCAL = `https://api.telegram.org/bot${BOT_TOKEN_LOCAL}`;

      // Ödemeyi onayla
      await fetch(`${BOT_API_LOCAL}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pre_checkout_query_id: update.pre_checkout_query.id,
          ok: true,
        }),
      });
      return NextResponse.json({ ok: true });
    }

    // Başarılı ödeme
    if (update.message?.successful_payment) {
      const payload = JSON.parse(update.message.successful_payment.invoice_payload);
      const { packageId, playerId } = payload;

      const packages: Record<string, { scrap?: number; techPart?: number; crystal?: number }> = {
        scrap_small: { scrap: 100 },
        scrap_medium: { scrap: 550 },
        scrap_large: { scrap: 1200 },
        crystal_small: { crystal: 5 },
        crystal_large: { crystal: 22 },
        starter_pack: { scrap: 500, techPart: 2, crystal: 1 },
      };

      const pkg = packages[packageId];
      if (pkg && playerId) {
        await db.player.update({
          where: { id: playerId },
          data: {
            scrap: { increment: pkg.scrap ?? 0 },
            techPart: { increment: pkg.techPart ?? 0 },
            crystal: { increment: pkg.crystal ?? 0 },
          },
        });

        // Event tracking
        trackEvent({
          playerId,
          eventType: "iap_purchase",
          data: { packageId, amount: update.message.successful_payment.total_amount, currency: "XTR" },
        });

        await sendMessage(
          update.message.chat.id,
          `✅ <b>Ödeme Başarılı!</b>\n\nPaket: ${packageId}\nHurda: +${pkg.scrap ?? 0}\nTech-Part: +${pkg.techPart ?? 0}\nKristal: +${pkg.crystal ?? 0}`
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const chatType = update.message.chat.type;
    const text = update.message.text;
    const fromUser = update.message.from;

    // /start komutu (deep link ile)
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const startParam = parts[1];

      if (startParam) {
        // Deep link ile geldi — revenge, join_clan, raid
        if (startParam.startsWith("revenge_")) {
          // GDD 9.3: İntikam linki
          const appUrl = `${getMiniAppUrl()}/?start=${startParam}`;
          await sendMiniAppButton(
            chatId,
            "⚔️ <b>İntikam Zamanı!</b>\n\nÖldürüldüğün savaşın intikamını al!\nKazanırsan eşyan geri + 1 eşya daha çalarsın!",
            "💀 İntikam Al",
            appUrl
          );
        } else if (startParam.startsWith("join_clan_")) {
          const clanId = startParam.replace("join_clan_", "");
          const appUrl = `${getMiniAppUrl()}/?start=join_clan_${clanId}`;
          await sendMiniAppButton(
            chatId,
            "👥 <b>Klan Daveti!</b>\n\nBir klana davet edildin!",
            "🎮 Katıl",
            appUrl
          );
        } else if (startParam.startsWith("raid_")) {
          const raidId = startParam.replace("raid_", "");
          const appUrl = `${getMiniAppUrl()}/?start=raid_${raidId}`;
          await sendMiniAppButton(
            chatId,
            "⚔️ <b>Raid Daveti!</b>\n\nKlan raid'ine katıl!",
            "🎮 Savaşa Katıl",
            appUrl
          );
        }
      } else {
        // Normal /start — Mini App'i aç
        await sendMiniAppButton(
          chatId,
          "🏜️ <b>Wasteland: Scrap & Glory</b>\n\nPost-apokaliptik dünyada hayatta kal!\n\n⚔️ PvP savaş\n🔧 Crafting\n🏰 Klan raid\n🌍 Seferler\n\nAşağıdaki butona tıkla ve oyuna başla!",
          "🎮 Oyna",
          getMiniAppUrl()
        );
      }
      return NextResponse.json({ ok: true });
    }

    // /raid komutu (GDD 9.2 — Telegram gruplarında)
    if (text.startsWith("/raid") && chatType === "supergroup") {
      // Player'ı Telegram ID ile bul
      if (!fromUser?.id) {
        await sendMessage(chatId, "❌ Telegram kullanıcı bilgisi alınamadı.");
        return NextResponse.json({ ok: true });
      }

      const player = await db.player.findUnique({
        where: { telegramId: String(fromUser.id) },
        include: {
          clanMemberships: { include: { clan: true } },
        },
      });

      if (!player) {
        await sendMessage(chatId, "❌ Önce oyuna kayıt ol! @wasteland_scrap_bot'a tıkla.");
        return NextResponse.json({ ok: true });
      }

      if (!player.clanMemberships || player.clanMemberships.length === 0) {
        await sendMessage(chatId, "❌ Bir klanda değilsin! Önce klan kur veya katıl.");
        return NextResponse.json({ ok: true });
      }

      const clanMember = player.clanMemberships[0];
      if (!clanMember?.clan) {
        await sendMessage(chatId, "❌ Bir klanda değilsin! Önce klan kur veya katıl.");
        return NextResponse.json({ ok: true });
      }

      // Boss seç (parametre ile veya random)
      const parts = text.split(" ");
      const bossCode = parts[1] ?? "mutant_titan";
      const bossDef = RAID_BOSSES[bossCode] ?? RAID_BOSSES.mutant_titan;

      // Raid başlat
      const result = await startRaid(player.id, bossCode);
      if (!result.ok) {
        await sendMessage(chatId, `❌ ${result.error}`);
        return NextResponse.json({ ok: true });
      }

      // Gruba raid butonu gönder
      const appUrl = `${getMiniAppUrl()}/?start=raid_${result.raid!.id}`;
      await sendRaidButton(chatId, clanMember.clan.name, bossDef.name, appUrl);

      // Event tracking
      trackEvent({
        playerId: player.id,
        eventType: "raid_attack" as never,
        data: { bossCode, clanId: clanMember.clanId, fromTelegram: true },
      });

      return NextResponse.json({ ok: true });
    }

    // /help komutu
    if (text.startsWith("/help")) {
      await sendMessage(
        chatId,
        "🏜️ <b>Wasteland: Scrap & Glory</b>\n\n" +
        "Komutlar:\n" +
        "/start — Mini App'i aç\n" +
        "/raid [boss] — Klan raid başlat (sadece gruplarda)\n" +
        "  Boss: mutant_titan, radyasyon_demon, nuklear_dev\n" +
        "/help — Bu mesajı göster\n\n" +
        "Daha fazla: @wasteland_scrap_bot"
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram/webhook] error:", err);
    return NextResponse.json({ ok: true });
  }
}

// GET — webhook info
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Telegram webhook endpoint. POST Telegram updates here.",
    bot: "wasteland_scrap_bot",
  });
}
