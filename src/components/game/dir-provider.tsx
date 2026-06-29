"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n, isRTL } from "@/i18n/request";

export function DirProvider() {
  const { locale } = useI18n();

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = isRTL(locale) ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
