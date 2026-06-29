"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import * as Icons from "lucide-react";
import { Swords, Backpack, Hammer, MapPin, Check, X, ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TutorialStep {
  step: number;
  title: { tr: string; en: string };
  description: { tr: string; en: string };
  icon: React.ComponentType<{ className?: string }>;
  action?: { view: "battle" | "inventory" | "crafting" | "expedition"; label: { tr: string; en: string } };
}

const STEPS: TutorialStep[] = [
  {
    step: 1,
    title: { tr: "Hoş geldin!", en: "Welcome!" },
    description: { tr: "Wasteland'e hoş geldin. Hadi temelleri öğrenelim.", en: "Welcome to the Wasteland. Let's learn the basics." },
    icon: Sparkles,
  },
  {
    step: 2,
    title: { tr: "İlk Savaş", en: "First Battle" },
    description: { tr: "Savaş sekmesine git ve ilk PvP savaşını yap. Kazanırsan XP ve Hurda kazanırsın!", en: "Go to Battle tab and do your first PvP. Win to earn XP and Scrap!" },
    icon: Swords,
    action: { view: "battle", label: { tr: "Savaşa Git", en: "Go to Battle" } },
  },
  {
    step: 3,
    title: { tr: "Eşya Kuşan", en: "Equip Item" },
    description: { tr: "Envanterinden bir silah kuşan. Savaş gücün artar!", en: "Equip a weapon from your inventory. Your combat power increases!" },
    icon: Backpack,
    action: { view: "inventory", label: { tr: "Envantere Git", en: "Go to Inventory" } },
  },
  {
    step: 4,
    title: { tr: "Üretim Yap", en: "Craft Item" },
    description: { tr: "Üretim atölyesinde eşya üret. Malzeme yeterliyse başla!", en: "Craft an item in the workshop. Start if you have materials!" },
    icon: Hammer,
    action: { view: "crafting", label: { tr: "Üretime Git", en: "Go to Crafting" } },
  },
  {
    step: 5,
    title: { tr: "Sefer Başlat", en: "Start Expedition" },
    description: { tr: "Sefer merkezinden bir bölgeye git. Risk var ama ödül büyük!", en: "Go on an expedition from the center. Risky but rewarding!" },
    icon: MapPin,
    action: { view: "expedition", label: { tr: "Sefer Merkezine Git", en: "Go to Expedition" } },
  },
];

export function Tutorial() {
  const { player, setView } = useGameStore();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0); // 0 = not started, 1-5 = steps, 6 = done
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/player/tutorial");
      const data = await res.json();
      setCurrentStep(data.step);
      // Eğer tutorial tamamlanmadıysa (step < 5) ve player onboarding yapmışsa göster
      if (data.step < 5 && data.step >= 0) {
        setVisible(true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Sadece authenticated + onboarding sonrası göster
    if (player && player.name && !player.name.startsWith("Survivor")) {
      load();
    } else {
      setLoading(false);
    }
  }, [player, load]);

  async function updateStep(step: number) {
    try {
      const res = await fetch("/api/player/tutorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step }),
      });
      const data = await res.json();
      if (data.ok) {
        setCurrentStep(step);
        if (step === 5 && data.reward) {
          toast({ title: "🎁 Tutorial Tamamlandı!", description: `+${data.reward.scrap} Hurda kazandın!` });
          // Player refresh
          const meRes = await fetch("/api/auth/me");
          const meData = await meRes.json();
          if (meData.player) useGameStore.getState().setPlayer(meData.player);
        }
      }
    } catch {
      // ignore
    }
  }

  function handleNext() {
    const next = currentStep + 1;
    if (next <= 5) {
      updateStep(next);
      if (next === 5) {
        // Son adım — tamamlandı, kapat
        setTimeout(() => setVisible(false), 1500);
      }
    }
  }

  function handleSkip() {
    updateStep(5);
    setVisible(false);
  }

  function handleAction(view: "battle" | "inventory" | "crafting" | "expedition") {
    setView(view);
    setVisible(false);
  }

  if (loading || !visible || currentStep >= 5) return null;

  // currentStep 0 ise ilk adımı göster (step 1)
  const displayStep = currentStep === 0 ? 1 : currentStep + 1;
  const stepData = STEPS.find((s) => s.step === displayStep);
  if (!stepData) return null;

  const Icon = stepData.icon;
  const isLast = displayStep === 5;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-20 left-3 right-3 z-40 max-w-md mx-auto"
      >
        <PixelPanel glow="radiation" className="p-3 sm:p-4">
          <div className="flex items-start gap-2 mb-2">
            <div className="w-10 h-10 flex items-center justify-center border-2 border-accent bg-accent/10 flex-shrink-0">
              <Icon className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-pixel text-[9px] text-muted-foreground uppercase tracking-wider">
                  {displayStep} / 5
                </span>
                <div className="flex gap-0.5 flex-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={cn("h-1 flex-1", i <= displayStep ? "bg-accent" : "bg-muted")}
                    />
                  ))}
                </div>
              </div>
              <h3 className="font-pixel text-sm font-bold text-accent glow-text">
                {stepData.title[locale as "tr" | "en"]}
              </h3>
            </div>
            <button
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
              title={locale === "tr" ? "Atla" : "Skip"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3 leading-tight">
            {stepData.description[locale as "tr" | "en"]}
          </p>
          <div className="flex gap-1">
            {stepData.action ? (
              <Button
                onClick={() => handleAction(stepData.action!.view)}
                className="pixel-button flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-9 text-[10px]"
              >
                {stepData.action.label[locale as "tr" | "en"]}
                <ChevronRight className="w-3 h-3" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="pixel-button flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-9 text-[10px]"
              >
                {isLast ? (
                  <>
                    <Check className="w-3 h-3" />
                    {locale === "tr" ? "Tamamla" : "Finish"}
                  </>
                ) : (
                  <>
                    {locale === "tr" ? "Devam" : "Next"}
                    <ChevronRight className="w-3 h-3" />
                  </>
                )}
              </Button>
            )}
            {!stepData.action && !isLast && (
              <Button
                onClick={handleSkip}
                className="pixel-button bg-card text-muted-foreground border-2 border-border font-pixel uppercase h-9 text-[10px] px-2"
              >
                {locale === "tr" ? "Atla" : "Skip"}
              </Button>
            )}
          </div>
        </PixelPanel>
      </motion.div>
    </AnimatePresence>
  );
}
