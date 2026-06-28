"use client";

import { useState } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { FactionIcon } from "./faction-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FACTIONS, type Faction } from "@/lib/game/constants";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Onboarding() {
  const { setPlayer, setNeedsOnboarding } = useGameStore();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [faction, setFaction] = useState<Faction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const factions = Object.values(FACTIONS);

  async function handleSubmit() {
    if (name.length < 3) {
      toast({ title: "Hata", description: "İsim 3-20 karakter olmalı", variant: "destructive" });
      return;
    }
    if (!faction) {
      toast({ title: "Hata", description: "Fraksiyon seç", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/player/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, faction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({ title: t("onboarding.welcome", { name }), description: `${FACTIONS[faction].name[locale as "tr" | "en"]}` });
      // Player'ı yeniden çek
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.player) {
        setPlayer(meData.player);
        setNeedsOnboarding(false);
        qc.invalidateQueries({ queryKey: ["inventory"] });
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 flex items-center justify-center">
      <PixelPanel glow="radiation" className="max-w-2xl w-full p-4 sm:p-6">
        <h1 className="font-pixel text-lg sm:text-2xl font-bold text-accent glow-text text-center mb-1">
          {t("onboarding.title")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground text-center mb-5 font-pixel uppercase tracking-wider">
          {t("onboarding.subtitle")}
        </p>

        {/* İsim */}
        <div className="mb-5">
          <Label htmlFor="name" className="font-pixel text-xs uppercase tracking-wider text-foreground mb-2 block">
            {t("onboarding.nameLabel")}
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("onboarding.namePlaceholder")}
            maxLength={20}
            className="font-pixel text-sm bg-card border-2 border-border focus:border-accent h-11"
          />
        </div>

        {/* Fraksiyon seçimi */}
        <div className="mb-5">
          <Label className="font-pixel text-xs uppercase tracking-wider text-foreground mb-2 block">
            {t("onboarding.factionLabel")}
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {factions.map((f) => {
              const selected = faction === f.code;
              return (
                <button
                  key={f.code}
                  onClick={() => setFaction(f.code)}
                  className={cn(
                    "pixel-panel p-3 text-left transition-all hover:scale-[1.02]",
                    selected ? "border-2" : "opacity-80 hover:opacity-100"
                  )}
                  style={selected ? { borderColor: f.accent, boxShadow: `0 0 15px ${f.accent}66` } : undefined}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FactionIcon faction={f.code} size="md" />
                    <div className="flex flex-col">
                      <span className="font-pixel font-bold text-xs" style={{ color: f.accent }}>
                        {f.name[locale as "tr" | "en"]}
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                        {f.archetype[locale as "tr" | "en"]}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {f.description[locale as "tr" | "en"]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || name.length < 3 || !faction}
          className="pixel-button w-full bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase tracking-wider h-12 text-sm"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("onboarding.submitting")}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {t("onboarding.submit")}
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </PixelPanel>
    </div>
  );
}
