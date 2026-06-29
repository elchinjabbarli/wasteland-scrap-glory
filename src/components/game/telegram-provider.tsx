"use client";

import { useEffect, useState } from "react";

// Telegram WebApp SDK — dinamik import (SSR güvenli)
interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      username: string;
      first_name: string;
      last_name?: string;
      photo_url?: string;
      language_code?: string;
    };
    start_param?: string;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  themeParams: Record<string, string>;
  colorScheme: "light" | "dark";
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    setText: (text: string) => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export function useTelegramSDK() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Telegram SDK yüklü mü? (callback içinde set et)
    const checkTelegram = () => {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        setWebApp(tg);
        setIsTelegram(true);
      }
    };

    // Script yüklendikten sonra kontrol et
    const timer = setTimeout(checkTelegram, 100);
    return () => clearTimeout(timer);
  }, []);

  return { webApp, isTelegram };
}

/** Haptic feedback (titreşim) — Telegram'da çalışır */
export function haptic(type: "light" | "medium" | "heavy" | "success" | "error" | "warning" = "light") {
  if (typeof window === "undefined") return;
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  if (type === "success" || type === "error" || type === "warning") {
    tg.HapticFeedback?.notificationOccurred(type);
  } else {
    tg.HapticFeedback?.impactOccurred(type);
  }
}
