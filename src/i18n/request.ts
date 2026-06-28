"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import tr from "@/i18n/messages/tr.json";
import en from "@/i18n/messages/en.json";
import ru from "@/i18n/messages/ru.json";
import fa from "@/i18n/messages/fa.json";
import ar from "@/i18n/messages/ar.json";
import es from "@/i18n/messages/es.json";
import pt from "@/i18n/messages/pt.json";

export type Locale = "tr" | "en" | "ru" | "fa" | "ar" | "es" | "pt";

const MESSAGES: Record<Locale, unknown> = { tr, en, ru, fa, ar, es, pt };

// RTL dilleri
export const RTL_LOCALES: Locale[] = ["ar", "fa"];

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

type Dict = Record<string, unknown>;

function lookup(dict: Dict, path: string): string {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Dict)) {
      cur = (cur as Dict)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

interface I18nState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: "tr",
      setLocale: (l) => set({ locale: l, dir: isRTL(l) ? "rtl" : "ltr" }),
      t: (path, vars) => {
        const { locale } = get();
        const dict = MESSAGES[locale] as Dict;
        return interpolate(lookup(dict, path), vars);
      },
      dir: "ltr",
    }),
    {
      name: "wsg-locale",
      // Persist sırasında dir'i de kaydet
      partialize: (state) => ({ locale: state.locale, dir: state.dir }),
    }
  )
);

/** Server-side tek seferlik çeviri */
export function translateServer(locale: Locale, path: string, vars?: Record<string, string | number>): string {
  const dict = MESSAGES[locale] as Dict;
  return interpolate(lookup(dict, path), vars);
}
