"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Languages, X } from "lucide-react";
import { isSoundEnabled, setSoundEnabled, sfx } from "@/lib/audio";

/** Sabit ses sağlayıcı + header için dil menüsü */
export function SoundProvider() {
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      setEnabled(isSoundEnabled());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Telegram WebApp SDK script yükle
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("telegram-webapp-script")) return;
    const script = document.createElement("script");
    script.id = "telegram-webapp-script";
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  function toggle() {
    const newState = !enabled;
    setEnabled(newState);
    setSoundEnabled(newState);
    if (newState) sfx.uiClick();
  }

  if (!mounted) return null;

  const langs: { code: "tr" | "en" | "ru" | "fa" | "ar" | "es" | "pt"; label: string }[] = [
    { code: "tr", label: "TR" },
    { code: "en", label: "EN" },
  ];

  return (
    <>
      {/* Dil menüsü — açılır panel */}
      {langOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setLangOpen(false)}>
          <div className="absolute top-12 right-2 bg-wasteland-panel border-2 border-border rounded-xl p-2 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Dil / Language</span>
              <button onClick={() => setLangOpen(false)} className="text-muted-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {langs.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLocale(l.code); setLangOpen(false); }}
                  className={`px-3 py-2 text-xs font-bold rounded-lg ${locale === l.code ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sağ üst köşe — tek buton (ses aç/kapa + dil birlikte) */}
      <div className="fixed top-2 right-2 z-[60] flex items-center gap-1.5">
        <button
          onClick={() => setLangOpen(!langOpen)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-card/80 hover:border-accent transition-colors"
          title="Dil / Language"
        >
          <Languages className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-card/80 hover:border-accent transition-colors"
          title={enabled ? "Sesi Kapat" : "Sesi Aç"}
        >
          {enabled ? (
            <Volume2 className="w-4 h-4 text-accent" />
          ) : (
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </>
  );
}
