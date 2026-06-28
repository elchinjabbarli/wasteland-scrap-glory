"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { LoginScreen } from "@/components/game/login-screen";
import { Onboarding } from "@/components/game/onboarding";
import { Dashboard } from "@/components/game/dashboard";
import { BattleArena } from "@/components/game/battle-arena";
import { InventoryView } from "@/components/game/inventory-view";
import { ProfileView } from "@/components/game/profile-view";
import { CraftingView } from "@/components/game/crafting-view";
import { UpgradeView } from "@/components/game/upgrade-view";
import { MarketView } from "@/components/game/market-view";
import { PrestigeView } from "@/components/game/prestige-view";
import { StatAllocationView } from "@/components/game/stat-allocation-view";
import { ExpeditionView } from "@/components/game/expedition-view";
import { AchievementsView } from "@/components/game/achievements-view";
import { QuestsView } from "@/components/game/quests-view";
import { LeaderboardView } from "@/components/game/leaderboard-view";
import { ClanView } from "@/components/game/clan-view";
import { RaidView } from "@/components/game/raid-view";
import { SocialView } from "@/components/game/social-view";
import { GlobalBossView } from "@/components/game/global-boss-view";
import { BadgesView } from "@/components/game/badges-view";
import { WeeklyEventBanner } from "@/components/game/weekly-event-banner";
import { Tutorial } from "@/components/game/tutorial";
import { NavBar } from "@/components/game/nav-bar";
import { RewardsBar } from "@/components/game/rewards-bar";
import { WeatherBanner } from "@/components/game/weather-banner";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export default function HomePage() {
  const {
    isAuthenticated,
    setAuthenticated,
    authLoading,
    setAuthLoading,
    player,
    setPlayer,
    needsOnboarding,
    setNeedsOnboarding,
    view,
    setView,
  } = useGameStore();
  const { locale, setLocale, t } = useI18n();
  const [showStats, setShowStats] = useState(false);

  // İlk açılışta auth kontrolü
  useEffect(() => {
    (async () => {
      setAuthLoading(true);
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.player) {
          setPlayer(data.player);
          setNeedsOnboarding(data.needsOnboarding);
          setAuthenticated(true);
        } else {
          // Auto-login as demo user
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tgUserId: `demo_auto_${Date.now()}`,
              tgUsername: `Survivor${Math.floor(Math.random() * 99999)}`,
              tgName: "Demo Survivor",
            }),
          });
          const loginData = await loginRes.json();
          if (loginData.ok) {
            const meRes = await fetch("/api/auth/me");
            const meData = await meRes.json();
            if (meData.player) {
              setPlayer(meData.player);
              setNeedsOnboarding(meData.needsOnboarding);
              setAuthenticated(true);
            }
          }
        }
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, [setAuthenticated, setAuthLoading, setPlayer, setNeedsOnboarding]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin text-4xl mb-3">⚙️</div>
          <p className="font-pixel text-xs text-muted-foreground uppercase tracking-wider">
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (needsOnboarding) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1">
          <Onboarding />
        </div>
        <LangToggle locale={locale} setLocale={setLocale} />
      </div>
    );
  }

  // Stat allocation view ayrı açılır (profile'dan)
  if (showStats || view === "stats") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-40 bg-wasteland-panel/95 backdrop-blur-sm border-b-2 border-wasteland-border px-3 py-2 flex items-center justify-between">
          <Button onClick={() => { setShowStats(false); setView("profile"); }} className="pixel-button bg-card text-foreground border-2 border-border font-pixel uppercase h-8 text-xs">
            ← {t("common.back")}
          </Button>
          <LangToggle locale={locale} setLocale={setLocale} compact />
        </header>
        <main className="flex-1 pb-2">
          <StatAllocationView />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 bg-wasteland-panel/95 backdrop-blur-sm border-b-2 border-wasteland-border px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center border-2 border-rust bg-card">
            <span className="text-rust font-pixel font-bold text-[10px]">W</span>
          </div>
          <span className="font-pixel text-[10px] sm:text-xs font-bold text-rust uppercase tracking-wider hidden sm:inline">
            {t("app.title")}
          </span>
          {player && player.prestige > 0 && (
            <span className="font-pixel text-[10px] text-accent glow-text">⭐{player.prestige}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {player && player.statPoints > 0 && (
            <Button
              onClick={() => setShowStats(true)}
              className="pixel-button bg-accent text-accent-foreground hover:bg-accent/90 font-pixel uppercase h-8 text-[10px] px-2"
            >
              +{player.statPoints} STAT
            </Button>
          )}
          <LangToggle locale={locale} setLocale={setLocale} compact />
        </div>
      </header>

      <main className="flex-1 pb-2">
        {view === "dashboard" && <Dashboard />}
        {view === "battle" && <BattleArena />}
        {view === "inventory" && <InventoryView />}
        {view === "crafting" && <CraftingView />}
        {view === "upgrade" && <UpgradeView />}
        {view === "market" && <MarketView />}
        {view === "prestige" && <PrestigeView />}
        {view === "expedition" && <ExpeditionView />}
        {view === "achievements" && <AchievementsView />}
        {view === "quests" && <QuestsView />}
        {view === "leaderboard" && <LeaderboardView />}
        {view === "clan" && <ClanView />}
        {view === "raid" && <RaidView />}
        {view === "social" && <SocialView />}
        {view === "globalBoss" && <GlobalBossView />}
        {view === "badges" && <BadgesView />}
        {view === "profile" && <ProfileView onAllocateClick={() => setShowStats(true)} />}
      </main>

      {/* Hava olayı banner — sadece dashboard'da */}
      {view === "dashboard" && <WeatherBanner />}

      {/* Haftalık etkinlik banner — sadece dashboard'da */}
      {view === "dashboard" && <WeeklyEventBanner />}

      {/* Rewards bar — sadece dashboard'da */}
      {view === "dashboard" && <RewardsBar />}

      {/* Tutorial — sadece dashboard'da */}
      {view === "dashboard" && <Tutorial />}

      <NavBar />
    </div>
  );
}

function LangToggle({ locale, setLocale, compact = false }: { locale: string; setLocale: (l: "tr" | "en" | "ru" | "fa" | "ar" | "es" | "pt") => void; compact?: boolean }) {
  const langs: { code: "tr" | "en" | "ru" | "fa" | "ar" | "es" | "pt"; label: string }[] = [
    { code: "tr", label: "TR" },
    { code: "en", label: "EN" },
    { code: "ru", label: "RU" },
    { code: "fa", label: "FA" },
    { code: "ar", label: "AR" },
    { code: "es", label: "ES" },
    { code: "pt", label: "PT" },
  ];
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {!compact && (
        <Languages className="w-3 h-3 text-muted-foreground mr-1" />
      )}
      {langs.map((l) => (
        <Button
          key={l.code}
          onClick={() => setLocale(l.code)}
          variant="ghost"
          size="sm"
          className={`px-1.5 py-0.5 h-6 font-pixel text-[8px] uppercase tracking-wider ${locale === l.code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {l.label}
        </Button>
      ))}
    </div>
  );
}
