"use client";

import { useState } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { Button } from "@/components/ui/button";
import { Skull, LogIn } from "lucide-react";

export function LoginScreen() {
  const { setAuthenticated } = useGameStore();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      // Mock: demo user ile login
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tgUserId: `demo_${Date.now()}`,
          tgUsername: `Survivor${Math.floor(Math.random() * 9999)}`,
          tgName: "Demo Survivor",
        }),
      });
      if (!res.ok) throw new Error("Login failed");
      setAuthenticated(true);
    } catch (err) {
      setError(t("auth.loginFailed"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <PixelPanel glow="rust" className="max-w-md w-full p-6 sm:p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 flex items-center justify-center border-4 border-rust bg-card" style={{ boxShadow: "0 0 25px var(--rust)" }}>
            <Skull className="w-10 h-10 text-rust" />
          </div>
        </div>
        <h1 className="font-pixel text-xl sm:text-2xl font-bold text-rust glow-text mb-2">
          {t("app.title")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6 font-pixel uppercase tracking-wider">
          {t("app.tagline")}
        </p>
        <Button
          onClick={handleLogin}
          disabled={loading}
          className="pixel-button w-full bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase tracking-wider h-12"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⚙️</span>
              {t("auth.loggingIn")}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              {t("auth.login")}
            </span>
          )}
        </Button>
        {error && (
          <p className="mt-3 text-xs text-destructive font-pixel uppercase">{error}</p>
        )}
        <p className="mt-4 text-[10px] text-muted-foreground/60 font-pixel">
          v2.0.0 · Telegram Mini App
        </p>
      </PixelPanel>
    </div>
  );
}
