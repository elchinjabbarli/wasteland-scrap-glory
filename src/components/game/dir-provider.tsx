"use client";

import { useEffect } from "react";
import { useI18n, isRTL } from "@/i18n/request";

/** Html dir/lang attribute'larını dinamik günceller */
export function DirProvider() {
  const { locale } = useI18n();

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = isRTL(locale) ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
