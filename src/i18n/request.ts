"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import tr from "@/i18n/messages/tr.json";
import en from "@/i18n/messages/en.json";

export type Locale = "tr" | "en";

const MESSAGES: Record<Locale, unknown> = { tr, en };

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
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: "tr",
      setLocale: (l) => set({ locale: l }),
      t: (path, vars) => {
        const { locale } = get();
        const dict = MESSAGES[locale] as Dict;
        return interpolate(lookup(dict, path), vars);
      },
    }),
    { name: "wsg-locale" }
  )
);

/** Server-side tek seferlik çeviri (örn. metadata) */
export function translateServer(locale: Locale, path: string, vars?: Record<string, string | number>): string {
  const dict = MESSAGES[locale] as Dict;
  return interpolate(lookup(dict, path), vars);
}
