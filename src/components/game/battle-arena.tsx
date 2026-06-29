"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGameStore, type OpponentData, type BattleResult, type BattleRound } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { FactionIcon } from "./faction-icon";
import { ElementBadge } from "./element-badge";
import { StatBar } from "./stat-bar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { FACTIONS, ELEMENTS } from "@/lib/game/constants";
import { maxHp } from "@/lib/game/stats";
import { pushNotification } from "./notification-overlay";
import { PixelAvatar } from "./pixel-avatar";

type Phase = "loadout" | "match" | "sim" | "result";

export function BattleArena() {
  const { player, battlePhase, setBattlePhase, selectedOpponent, setSelectedOpponent, setLastBattle, lastBattle, setView } = useGameStore();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  if (!player) return null;

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto">
      {battlePhase === "loadout" && <LoadoutPhase />}
      {battlePhase === "match" && <MatchPhase />}
      {battlePhase === "sim" && <SimPhase />}
      {battlePhase === "result" && lastBattle && <ResultPhase />}
    </div>
  );
}

// ============================================================
// LOADOUT PHASE
// ============================================================

function LoadoutPhase() {
  const { player, setBattlePhase } = useGameStore();
  const { t } = useI18n();

  if (!player?.loadout) return null;

  const slots = [
    { key: "weapon", label: t("battle.weaponSlot"), icon: "Sword", item: player.loadout.weapon },
    { key: "armor", label: t("battle.armorSlot"), icon: "Shield", item: player.loadout.armor },
    { key: "sideTool", label: t("battle.sideToolSlot"), icon: "Zap", item: player.loadout.sideTool },
    { key: "companion", label: t("battle.companionSlot"), icon: "PawPrint", item: player.loadout.companion },
  ] as const;

  return (
    <div className="space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text mb-1">
          {t("battle.title")}
        </h2>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mb-3">
          {t("battle.loadoutTitle")}
        </p>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {slots.map((s) => {
            const Icon = (Icons[s.icon as keyof typeof Icons] ?? Icons.Sword) as React.ComponentType<{ className?: string }>;
            const item = s.item as { name?: string; rarity?: string; element?: string; baseDamage?: number; baseArmor?: number } | null;
            return (
              <button
                key={s.key}
                onClick={() => {
                  // Inventory'ye yönlendir
                  setBattlePhase("loadout");
                  useGameStore.getState().setView("inventory");
                }}
                className="pixel-panel p-3 text-left hover:border-accent transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-pixel">{s.label}</span>
                </div>
                {item ? (
                  <div>
                    <div className="font-pixel text-xs font-bold truncate" style={{ color: `var(--rarity-${(item.rarity ?? "common").toLowerCase()})` }}>
                      {item.name}
                    </div>
                    {item.element && <ElementBadge element={item.element} className="mt-1" />}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground/50 italic font-pixel uppercase">{t("battle.empty")}</div>
                )}
              </button>
            );
          })}
        </div>

        {!player.loadout.weapon && (
          <div className="mt-3 p-2 border border-destructive bg-destructive/10 text-center">
            <p className="text-xs text-destructive font-pixel uppercase tracking-wider">
              {t("battle.noWeapon")}
            </p>
            <Button
              onClick={() => useGameStore.getState().setView("inventory")}
              className="mt-2 pixel-button bg-card text-foreground border-2 border-border font-pixel uppercase text-xs h-8"
            >
              {t("battle.goToInventory")}
            </Button>
          </div>
        )}

        <Button
          onClick={() => setBattlePhase("match")}
          disabled={!player.loadout.weapon}
          className="pixel-button w-full mt-3 bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase tracking-wider h-12"
        >
          {t("battle.selectOpponent")}
        </Button>
      </PixelPanel>
    </div>
  );
}

// ============================================================
// MATCH PHASE
// ============================================================

function MatchPhase() {
  const { setBattlePhase, setSelectedOpponent, player } = useGameStore();
  const { t, locale } = useI18n();
  const [opponents, setOpponents] = useState<OpponentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/matchmaking/opponents")
      .then((r) => r.json())
      .then((d) => {
        setOpponents(d.opponents ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function selectOpp(op: OpponentData) {
    setSelectedOpponent(op);
    setBattlePhase("sim");
  }

  return (
    <PixelPanel glow="radiation" className="p-3 sm:p-4">
      <h2 className="font-pixel text-base sm:text-xl font-bold text-accent glow-text mb-1">
        {t("battle.selectOpponent")}
      </h2>
      <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mb-3">
        {t("battle.opponents")}
      </p>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground font-pixel uppercase text-xs">
          {t("common.loading")}
        </div>
      ) : (
        <div className="space-y-2">
          {opponents.map((op) => {
            const faction = FACTIONS[op.faction as keyof typeof FACTIONS] ?? FACTIONS.BOZKIR;
            const power = op.maxHp + op.weaponDamage * 5 + op.armor * 3;
            return (
              <button
                key={op.id}
                onClick={() => selectOpp(op)}
                className="pixel-panel w-full p-3 flex items-center gap-3 hover:border-accent hover:scale-[1.01] transition-all text-left"
              >
                <FactionIcon faction={op.faction} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-pixel font-bold text-sm text-foreground truncate">{op.name}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-pixel uppercase">
                      {t("battle.opponentLevel", { level: op.level })}
                    </span>
                    <ElementBadge element={op.weaponElement} />
                    {op.hasCompanion && <Icons.PawPrint className="w-3 h-3 text-accent" />}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-pixel font-bold text-sm text-rust">{power}</div>
                  <div className="text-[9px] text-muted-foreground uppercase">{t("battle.opponentPower", { power: "" }).replace(":", "")}</div>
                </div>
                <Icons.ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}

      <Button
        onClick={() => setBattlePhase("loadout")}
        className="pixel-button w-full mt-3 bg-card text-foreground border-2 border-border font-pixel uppercase tracking-wider h-10"
      >
        {t("common.back")}
      </Button>
    </PixelPanel>
  );
}

// ============================================================
// SIM PHASE
// ============================================================

function SimPhase() {
  const { player, selectedOpponent, setBattlePhase, setLastBattle } = useGameStore();
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [fighting, setFighting] = useState(true);
  const [rounds, setRounds] = useState<BattleRound[]>([]);
  const [currentRound, setCurrentRound] = useState(-1);
  const [hpA, setHpA] = useState(player ? maxHp(player.end) : 100);
  const [hpB, setHpB] = useState(selectedOpponent?.maxHp ?? 100);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [showLog, setShowLog] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxHpA = player ? maxHp(player.end) + ((player.loadout?.armor as { baseHpBonus?: number } | null)?.baseHpBonus ?? 0) : 100;
  const maxHpB = selectedOpponent?.maxHp ?? 100;

  const startBattle = useCallback(async () => {
    if (!selectedOpponent || !player) return;
    setFighting(true);
    try {
      const res = await fetch("/api/combat/pvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId: selectedOpponent.id, opponentData: selectedOpponent }),
      });
      const data: BattleResult = await res.json();
      if (!res.ok || !data.ok) {
        toast({ title: t("errors.generic"), description: data.error || "Combat failed", variant: "destructive" });
        setBattlePhase("loadout");
        return;
      }
      setResult(data);
      setRounds(data.result.rounds);

      // Round-by-round animasyon
      let i = 0;
      let curHpA = maxHpA;
      let curHpB = maxHpB;
      setHpA(curHpA);
      setHpB(curHpB);
      setCurrentRound(-1);

      const playNext = () => {
        if (i >= data.result.rounds.length) {
          setFighting(false);
          setLastBattle(data);
          // Player data yenile
          qc.invalidateQueries({ queryKey: ["player"] });
          const meRes = fetch("/api/auth/me").then(r => r.json()).then(d => {
            if (d.player) useGameStore.getState().setPlayer(d.player);
          });
          qc.invalidateQueries({ queryKey: ["inventory"] });
          setBattlePhase("result");

          // Faz 5: Notification overlay — level up, achievements, badges
          if (data.rewards?.leveledUp) {
            pushNotification({
              type: "levelup",
              title: `⭐ Seviye ${data.rewards.newLevel}!`,
              description: data.rewards.statPointsGained > 0 ? `+${data.rewards.statPointsGained} Stat Point` : undefined,
            });
          }
          if (data.achievements) {
            for (const ach of data.achievements) {
              pushNotification({
                type: "achievement",
                title: `🏆 ${ach.name}`,
                description: `+${ach.points} puan`,
              });
            }
          }
          if (data.badges) {
            for (const badge of data.badges) {
              pushNotification({
                type: "badge",
                title: `🎖️ ${badge.name.tr}`,
                description: "Yeni rozet!",
                color: badge.color,
              });
            }
          }
          if (data.titles) {
            for (const title of data.titles) {
              pushNotification({
                type: "title",
                title: `👑 ${title.name.tr}`,
                description: "Yeni unvan açıldı!",
                color: title.color,
              });
            }
          }
          return;
        }
        const r = data.result.rounds[i];
        setCurrentRound(i);
        // HP güncelle (defender'ın HP'si round kaydında)
        if (r.defenderId === player.id) {
          curHpA = r.defenderHpAfter;
          setHpA(curHpA);
        } else {
          curHpB = r.defenderHpAfter;
          setHpB(curHpB);
        }
        if (r.companionAttack) {
          // Companion saldırısı hedefin HP'sini azaltır
          // Aynı defender zaten hesaplandı
        }
        i++;
        timerRef.current = setTimeout(playNext, 900);
      };
      timerRef.current = setTimeout(playNext, 600);
    } catch (err) {
      toast({ title: t("errors.generic"), description: String(err), variant: "destructive" });
      setBattlePhase("loadout");
    }
  }, [selectedOpponent, player, maxHpA, maxHpB, setBattlePhase, setLastBattle, toast, t, qc]);

  useEffect(() => {
    startBattle();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startBattle]);

  function skip() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (result) {
      setHpA(result.result.finalHpA);
      setHpB(result.result.finalHpB);
      setFighting(false);
      setLastBattle(result);
      setBattlePhase("result");
      qc.invalidateQueries({ queryKey: ["player"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      fetch("/api/auth/me").then(r => r.json()).then(d => {
        if (d.player) useGameStore.getState().setPlayer(d.player);
      });
    }
  }

  if (!player || !selectedOpponent) return null;

  const playerFaction = FACTIONS[player.faction as keyof typeof FACTIONS] ?? FACTIONS.BOZKIR;
  const oppFaction = FACTIONS[selectedOpponent.faction as keyof typeof FACTIONS] ?? FACTIONS.BOZKIR;

  const lastRound = currentRound >= 0 ? rounds[currentRound] : null;

  return (
    <div className="space-y-3">
      <PixelPanel glow="blood" className="p-3 sm:p-4">
        {/* VS Header */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 items-center mb-4">
          {/* Player */}
          <div className="text-center">
            <PixelAvatar faction={player.faction} size="lg" state={hpA <= 0 ? "death" : hpA < maxHpA * 0.3 ? "damage" : "idle"} />
            <div className="font-pixel font-bold text-xs sm:text-sm text-foreground truncate mt-1">{player.name}</div>
            <div className="text-[9px] text-muted-foreground uppercase">Sv {player.level}</div>
            <div className="mt-1">
              <StatBar label="HP" value={hpA} max={maxHpA} color="var(--accent)" size="sm" />
            </div>
          </div>

          <div className="font-pixel text-xl sm:text-2xl font-bold text-rust glow-text">VS</div>

          {/* Opponent */}
          <div className="text-center">
            <PixelAvatar faction={selectedOpponent.faction} size="lg" state={hpB <= 0 ? "death" : hpB < maxHpB * 0.3 ? "damage" : "idle"} />
            <div className="font-pixel font-bold text-xs sm:text-sm text-foreground truncate mt-1">{selectedOpponent.name}</div>
            <div className="text-[9px] text-muted-foreground uppercase">Sv {selectedOpponent.level}</div>
            <div className="mt-1">
              <StatBar label="HP" value={hpB} max={maxHpB} color="var(--destructive)" size="sm" />
            </div>
          </div>
        </div>

        {/* Round indicator */}
        <div className="text-center mb-2">
          <span className="font-pixel text-xs text-muted-foreground uppercase tracking-wider">
            {fighting ? t("battle.round", { n: currentRound + 1 }) : "..."}
          </span>
        </div>

        {/* Combat log */}
        <div className="bg-card/50 border border-border p-2 h-32 sm:h-40 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {rounds.slice(Math.max(0, currentRound - 4), currentRound + 1).map((r, i) => (
              <motion.div
                key={`${r.round}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "text-[10px] sm:text-xs py-1 border-b border-border/50 last:border-0",
                  r.evasion && "text-muted-foreground italic",
                  r.critMultiplier > 1 && "text-rust font-bold",
                  r.effectsApplied.length > 0 && "text-accent"
                )}
              >
                <span className="text-muted-foreground font-pixel">[{r.round}]</span> {r.logText}
              </motion.div>
            ))}
          </AnimatePresence>
          {currentRound === -1 && (
            <div className="text-center text-muted-foreground text-xs font-pixel uppercase py-4">
              {t("battle.simulating")}
            </div>
          )}
        </div>

        {/* Last action highlight */}
        {lastRound && !lastRound.evasion && lastRound.finalDamage > 0 && (
          <div className="mt-2 text-center">
            <motion.span
              key={currentRound}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "font-pixel text-2xl sm:text-3xl font-bold inline-block",
                lastRound.critMultiplier > 1 ? "text-rust glow-text" : "text-foreground"
              )}
            >
              -{lastRound.finalDamage}
              {lastRound.critMultiplier > 1 && " KRİTİK!"}
            </motion.span>
          </div>
        )}

        {fighting && (
          <Button
            onClick={skip}
            className="pixel-button w-full mt-3 bg-card text-foreground border-2 border-border font-pixel uppercase tracking-wider h-9 text-xs"
          >
            {t("battle.skipAnimation")}
          </Button>
        )}
      </PixelPanel>
    </div>
  );
}

// ============================================================
// RESULT PHASE
// ============================================================

function ResultPhase() {
  const { lastBattle, setBattlePhase, setView, player } = useGameStore();
  const { t } = useI18n();
  if (!lastBattle) return null;

  const won = lastBattle.result.playerWon;
  const r = lastBattle.rewards;

  return (
    <PixelPanel glow={won ? "radiation" : "blood"} className="p-4 sm:p-6 text-center">
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className={cn(
          "font-pixel text-3xl sm:text-5xl font-bold mb-4",
          won ? "text-accent glow-text" : "text-destructive glow-text"
        )}
      >
        {won ? t("battle.youWon") : t("battle.youLost")}
      </motion.div>

      <div className="mb-4 text-xs text-muted-foreground font-pixel uppercase tracking-wider">
        {t("battle.vs")} {lastBattle.opponent.name} (Sv {lastBattle.opponent.level})
      </div>

      {/* Ödüller */}
      <div className="bg-card/50 border border-border p-3 mb-4 space-y-2">
        <h3 className="font-pixel text-sm font-bold text-accent uppercase tracking-wider mb-2">
          {t("battle.rewards")}
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs font-pixel">
          <RewardItem label="XP" value={`+${r.xp}`} color="var(--accent)" />
          <RewardItem label="Hurda" value={`+${r.scrap}`} color="var(--scrap)" />
          {r.techPart > 0 && <RewardItem label="Tech-Part" value={`+${r.techPart}`} color="var(--tech)" />}
          {r.droppedItem && <div className="col-span-2 text-rust font-bold">🎁 {t("battle.itemDropped", { name: r.droppedItem.name })}</div>}
          {r.lostItem && <div className="col-span-2 text-destructive font-bold">💀 {t("battle.itemLost", { name: r.lostItem.name })}</div>}
        </div>
      </div>

      {r.leveledUp && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-4 p-3 border-2 border-accent bg-accent/10"
        >
          <div className="font-pixel text-base sm:text-lg font-bold text-accent glow-text uppercase">
            ⭐ {t("battle.leveledUp", { level: r.newLevel })}
          </div>
          {r.statPointsGained > 0 && (
            <div className="text-[10px] text-muted-foreground mt-1 font-pixel uppercase">
              +{r.statPointsGained} Stat Point
            </div>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => {
            setBattlePhase("match");
          }}
          className="pixel-button bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase tracking-wider h-12 text-xs sm:text-sm"
        >
          {t("battle.fightAgain")}
        </Button>
        <Button
          onClick={() => {
            setView("dashboard");
            setBattlePhase("loadout");
          }}
          className="pixel-button bg-card text-foreground border-2 border-border font-pixel uppercase tracking-wider h-12 text-xs sm:text-sm"
        >
          {t("battle.backToBase")}
        </Button>
      </div>
    </PixelPanel>
  );
}

function RewardItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between p-2 border border-border bg-background/50">
      <span className="text-muted-foreground uppercase tracking-wider text-[10px]">{label}</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
