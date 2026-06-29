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
import { SettingsView } from "@/components/game/settings-view";
import { StreakBanner } from "@/components/game/streak-banner";
import { TournamentView } from "@/components/game/tournament-view";
import { NavBar } from "@/components/game/nav-bar";
import { RewardsBar } from "@/components/game/rewards-bar";
import { WeatherBanner } from "@/components/game/weather-banner";
import { Button } from "@/components/ui/button";

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
      </div>
    );
  }

  // Stat allocation view ayrı açılır (profile'dan)
  if (showStats || view === "stats") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-40 bg-wasteland-panel/95 backdrop-blur-md border-b border-wasteland-border px-3 py-2">
          <Button onClick={() => { setShowStats(false); setView("profile"); }} className="bg-card text-foreground border-2 border-border font-bold uppercase h-9 text-xs rounded-lg">
            ← {t("common.back")}
          </Button>
        </header>
        <main className="flex-1 pb-2">
          <StatAllocationView />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Basit header — sadece logo + stat points */}
      <header className="sticky top-0 z-40 bg-wasteland-panel/95 backdrop-blur-md border-b border-wasteland-border px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center border-2 border-rust bg-card rounded-md">
            <span className="text-rust font-pixel font-bold text-[11px]">W</span>
          </div>
          {player && player.prestige > 0 && (
            <span className="font-pixel text-[10px] text-accent">⭐{player.prestige}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {player && player.statPoints > 0 && (
            <Button
              onClick={() => setShowStats(true)}
              className="bg-accent text-accent-foreground hover:bg-accent/80 font-bold uppercase h-8 text-[11px] px-3 rounded-lg"
            >
              +{player.statPoints} STAT
            </Button>
          )}
        </div>
      </header>

      {/* İçerik — alt nav için padding */}
      <main className="flex-1 pb-20 pt-2">
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
        {view === "settings" && <SettingsView />}
        {view === "tournament" && <TournamentView />}
        {view === "profile" && <ProfileView onAllocateClick={() => setShowStats(true)} />}
      </main>

      {/* Banners — sadece dashboard'da */}
      {view === "dashboard" && (
        <>
          <WeatherBanner />
          <WeeklyEventBanner />
          <StreakBanner />
          <RewardsBar />
          <Tutorial />
        </>
      )}

      <NavBar />
    </div>
  );
}


