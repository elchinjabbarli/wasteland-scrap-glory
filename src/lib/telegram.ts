// Wasteland: Scrap & Glory - Telegram WebApp Entegrasyon Hazırlığı
// Production'da gerçek Telegram initData validation yapılır
// Dev ortamında mock fallback

import { db } from "@/lib/db";
import { createHmac, timingSafeEqual } from "crypto";

// ============================================================
// TELEGRAM USER (mock veya gerçek)
// ============================================================

export interface TelegramUser {
  id: number;
  username: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
  language_code?: string;
}

export interface TelegramInitData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
  start_param?: string;
}

// ============================================================
// initData VALIDATION (production — gerçek HMAC-SHA256)
// ============================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Telegram initData validation
 * Production: gerçek HMAC-SHA256 hash kontrolü (BOT_TOKEN varsa)
 * Dev: mock kabul eder (BOT_TOKEN yoksa)
 *
 * Telegram algoritması:
 * 1. secret_key = HMAC-SHA256("WebAppData", BOT_TOKEN)
 * 2. data_check_string = sorted params (hash hariç) "key=value\n" formatında
 * 3. hash = HMAC-SHA256(data_check_string, secret_key)
 * 4. timingSafeEqual ile karşılaştır
 */
export function validateInitData(initDataRaw: string): TelegramInitData | null {
  try {
    const params = new URLSearchParams(initDataRaw);
    const userStr = params.get("user");
    const hash = params.get("hash");
    if (!userStr || !hash) return null;

    const user = JSON.parse(userStr) as TelegramUser;

    // Dev mode — BOT_TOKEN yoksa mock kabul
    if (!BOT_TOKEN) {
      return {
        user,
        auth_date: parseInt(params.get("auth_date") ?? "0", 10),
        hash,
        start_param: params.get("start_param") ?? undefined,
      };
    }

    // Production — gerçek HMAC-SHA256 validation
    // 1. secret_key = HMAC-SHA256("WebAppData", BOT_TOKEN)
    const secretKey = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();

    // 2. data_check_string — sorted params (hash hariç) "key=value\n"
    const dataCheckArr: string[] = [];
    for (const [key, value] of params.entries()) {
      if (key === "hash") continue;
      dataCheckArr.push(`${key}=${value}`);
    }
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join("\n");

    // 3. computed hash
    const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    // 4. timing-safe compare
    const hashBuf = Buffer.from(hash, "hex");
    const computedBuf = Buffer.from(computedHash, "hex");
    if (hashBuf.length !== computedBuf.length) return null;
    if (!timingSafeEqual(hashBuf, computedBuf)) return null;

    // Auth_date kontrol (24 saat geçerli)
    const authDate = parseInt(params.get("auth_date") ?? "0", 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return null; // 24 saat

    return {
      user,
      auth_date: authDate,
      hash,
      start_param: params.get("start_param") ?? undefined,
    };
  } catch {
    return null;
  }
}

// ============================================================
// MOCK FALLBACK (dev ortamı)
// ============================================================

export function createMockTelegramUser(devId?: string): TelegramUser {
  const id = devId ? parseInt(devId.replace(/\D/g, "").slice(0, 10) || "12345", 10) : Math.floor(Math.random() * 1000000);
  return {
    id,
    username: `Survivor${id}`,
    first_name: "Survivor",
    language_code: "tr",
  };
}

// ============================================================
// START PARAM PARSING (deep links)
// ============================================================

export interface StartParam {
  type: "revenge" | "join_clan" | "raid" | null;
  payload: string[];
}

export function parseStartParam(startParam?: string): StartParam {
  if (!startParam) return { type: null, payload: [] };

  // Format: revenge_KILLERID_ITEMID | join_clan_CLANID | raid_RAIDID
  const parts = startParam.split("_");
  if (parts.length < 2) return { type: null, payload: [] };

  const action = parts[0];
  const rest = parts.slice(1);

  switch (action) {
    case "revenge":
      return { type: "revenge", payload: rest };
    case "join":
      if (rest[0] === "clan") return { type: "join_clan", payload: rest.slice(1) };
      return { type: null, payload: [] };
    case "raid":
      return { type: "raid", payload: rest };
    default:
      return { type: null, payload: [] };
  }
}

// ============================================================
// TELEGRAM LOGIN FLOW (auth API tarafından kullanılır)
// ============================================================

export interface TelegramLoginResult {
  ok: boolean;
  telegramId: string;
  telegramUsername: string;
  telegramName: string;
  startParam?: StartParam;
  error?: string;
}

export async function loginWithTelegram(initDataRaw?: string): Promise<TelegramLoginResult> {
  // 1. initData varsa validate et
  if (initDataRaw) {
    const initData = validateInitData(initDataRaw);
    if (initData) {
      return {
        ok: true,
        telegramId: String(initData.user.id),
        telegramUsername: initData.user.username,
        telegramName: initData.user.first_name,
        startParam: parseStartParam(initData.start_param),
      };
    }
  }

  // 2. Mock fallback (dev)
  const mockUser = createMockTelegramUser();
  return {
    ok: true,
    telegramId: `mock_${mockUser.id}`,
    telegramUsername: mockUser.username,
    telegramName: mockUser.first_name,
  };
}
