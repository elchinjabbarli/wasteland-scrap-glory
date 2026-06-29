"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, setSoundEnabled, sfx } from "@/lib/audio";

/** Global ses sağlayıcı — header'da ses aç/kapa butonu + Telegram SDK script */
export function SoundProvider() {
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // defer to next tick to avoid set-state-in-effect warning
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
    if (newState) {
      sfx.uiClick();
    }
  }

  if (!mounted) return null;

  // Sabit konumlu ses butonu (sağ üst)
  return (
    <button
      onClick={toggle}
      className="fixed top-2 right-2 z-[60] w-7 h-7 flex items-center justify-center border-2 border-border bg-card/80 hover:border-accent transition-colors"
      title={enabled ? "Sesi Kapat" : "Sesi Aç"}
    >
      {enabled ? (
        <Volume2 className="w-3.5 h-3.5 text-accent" />
      ) : (
        <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </button>
  );
}
