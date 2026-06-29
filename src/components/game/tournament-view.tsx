"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FactionIcon } from "./faction-icon";
import { Loader2, Trophy, Users, Coins, Swords, Crown, Check, X, Play } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TournamentStatus {
  tournament: {
    id: string;
    week: string;
    name: string;
    status: string;
    currentRound: number;
    totalRounds: number;
    participantCount: number;
    maxParticipants: number;
    prizePool: number;
    entryFee: number;
    expiresAt: string;
  } | null;
  participation: { seed: number; eliminated: boolean; eliminatedRound: number; finalRank: number } | null;
  pendingMatch: { id: string; round: number; matchNumber: number; opponent: { id: string; name: string; faction: string; level: number } | null } | null;
  matches: { id: string; round: number; matchNumber: number; opponent: { name: string; faction: string; level: number } | null; won: boolean; status: string }[];
  allMatches: { id: string; round: number; matchNumber: number; playerA: { id: string; name: string; faction: string; level: number }; playerB: { id: string; name: string; faction: string; level: number } | null; winnerId: string | null; status: string }[];
}

export function TournamentView() {
  const { player } = useGameStore();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [status, setStatus] = useState<TournamentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tournament/current");
      const data = await res.json();
      setStatus(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshPlayer = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();
    if (meData.player) useGameStore.getState().setPlayer(meData.player);
  }, []);

  async function handleJoin() {
    setBusy(true);
    try {
      const res = await fetch("/api/tournament/join", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: locale === "tr" ? "Turnuvaya katıldın!" : "Joined tournament!" });
        await refreshPlayer();
        await load();
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handlePlay(matchId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/tournament/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        if (data.won) {
          toast({ title: "🏆 Kazandın!", description: locale === "tr" ? "Sonraki tura geçtin" : "Advanced to next round" });
        } else {
          toast({ title: "💀 Elendin", description: locale === "tr" ? "Turnuva bitti" : "Tournament over", variant: "destructive" });
        }
        await refreshPlayer();
        await load();
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  if (loading || !player) {
    return (
      <div className="p-4 text-center text-muted-foreground font-pixel uppercase text-xs">
        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
        {t("common.loading")}
      </div>
    );
  }

  if (!status?.tournament) {
    return (
      <div className="p-4 text-center text-muted-foreground font-pixel uppercase text-xs">
        {locale === "tr" ? "Turnuva bulunamadı" : "No tournament found"}
      </div>
    );
  }

  const tour = status.tournament;
  const isRegistered = !!status.participation;
  const isRegOpen = tour.status === "REGISTRATION";
  const isActive = tour.status === "ACTIVE";
  const isCompleted = tour.status === "COMPLETED";
  const isChampion = status.participation?.finalRank === 1;

  // Round isimleri
  const roundName = (round: number, total: number): string => {
    const remaining = total - round + 1;
    if (remaining === 1) return locale === "tr" ? "Final" : "Final";
    if (remaining === 2) return locale === "tr" ? "Yarı Final" : "Semifinal";
    if (remaining === 3) return locale === "tr" ? "Çeyrek Final" : "Quarterfinal";
    return locale === "tr" ? `Tur ${round}` : `Round ${round}`;
  };

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          {locale === "tr" ? "PvP Turnuvası" : "PvP Tournament"}
        </h2>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-pixel uppercase tracking-wider mt-1">
          {tour.name} · {tour.week}
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center p-2 border border-border bg-card/50">
            <Users className="w-3 h-3 mx-auto text-accent mb-1" />
            <div className="font-pixel text-sm font-bold text-accent">{tour.participantCount}/{tour.maxParticipants}</div>
            <div className="text-[8px] text-muted-foreground uppercase">{locale === "tr" ? "Katılımcı" : "Participants"}</div>
          </div>
          <div className="text-center p-2 border border-yellow-500/50 bg-yellow-500/5">
            <Coins className="w-3 h-3 mx-auto text-yellow-500 mb-1" />
            <div className="font-pixel text-sm font-bold text-yellow-500">{tour.prizePool}</div>
            <div className="text-[8px] text-muted-foreground uppercase">{locale === "tr" ? "Ödül Havuzu" : "Prize Pool"}</div>
          </div>
          <div className="text-center p-2 border border-border bg-card/50">
            <Swords className="w-3 h-3 mx-auto text-rust mb-1" />
            <div className="font-pixel text-sm font-bold text-rust">{tour.currentRound}/{tour.totalRounds}</div>
            <div className="text-[8px] text-muted-foreground uppercase">{locale === "tr" ? "Tur" : "Round"}</div>
          </div>
        </div>

        {/* Status badge */}
        <div className="text-center mt-3">
          <span className={cn(
            "inline-block px-3 py-1 border-2 font-pixel text-[10px] uppercase tracking-wider",
            isRegOpen ? "border-accent text-accent bg-accent/10" :
            isActive ? "border-rust text-rust bg-rust/10 animate-pulse" :
            "border-muted-foreground text-muted-foreground"
          )}>
            {isRegOpen ? (locale === "tr" ? "● Kayıt Açık" : "● Registration Open") :
             isActive ? (locale === "tr" ? "● Aktif" : "● Active") :
             (locale === "tr" ? "● Tamamlandı" : "● Completed")}
          </span>
        </div>
      </PixelPanel>

      {/* Şampiyon rozeti */}
      {isCompleted && isChampion && (
        <PixelPanel glow="radiation" className="p-4 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 1 }}
          >
            <Crown className="w-12 h-12 mx-auto text-yellow-400 mb-2" style={{ filter: "drop-shadow(0 0 10px gold)" }} />
          </motion.div>
          <div className="font-pixel text-lg font-bold text-yellow-400 glow-text">
            {locale === "tr" ? "🏆 ŞAMPİYON! 🏆" : "🏆 CHAMPION! 🏆"}
          </div>
          <div className="text-[10px] text-muted-foreground font-pixel mt-1">
            {locale === "tr" ? "Ödülün verildi!" : "Prize awarded!"}
          </div>
        </PixelPanel>
      )}

      {/* Kayıt / Katılım */}
      {isRegOpen && !isRegistered && (
        <PixelPanel className="p-4 text-center">
          <p className="text-xs text-muted-foreground font-pixel uppercase mb-3">
            {locale === "tr" ? "Turnuvaya katıl ve ödül havuzu için savaş!" : "Join and fight for the prize pool!"}
          </p>
          <div className="text-[10px] font-pixel mb-3">
            <span className="text-muted-foreground uppercase">{locale === "tr" ? "Katılım Ücreti" : "Entry Fee"}:</span>{" "}
            <span className="text-rust font-bold">{tour.entryFee} Hurda</span>
            <span className="text-muted-foreground ml-3">{locale === "tr" ? "Cüzdan" : "Wallet"}:</span>{" "}
            <span className={player.scrap >= tour.entryFee ? "text-accent" : "text-destructive"}>{player.scrap} Hurda</span>
          </div>
          <Button
            onClick={handleJoin}
            disabled={busy || player.scrap < tour.entryFee || tour.participantCount >= tour.maxParticipants}
            className="pixel-button w-full bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-11"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
            {locale === "tr" ? "Turnuvaya Katıl" : "Join Tournament"}
          </Button>
        </PixelPanel>
      )}

      {/* Bekleyen maç */}
      {isActive && status.pendingMatch && !status.participation?.eliminated && (
        <PixelPanel glow="blood" className="p-3">
          <h3 className="font-pixel text-xs font-bold text-rust uppercase mb-2 flex items-center gap-2">
            <Swords className="w-4 h-4" />
            {locale === "tr" ? "Sıradaki Maçın" : "Your Next Match"}
          </h3>
          <div className="text-[10px] font-pixel text-muted-foreground mb-2 uppercase">
            {roundName(status.pendingMatch.round, tour.totalRounds)} · {locale === "tr" ? "Maç" : "Match"} #{status.pendingMatch.matchNumber}
          </div>
          {status.pendingMatch.opponent && (
            <div className="flex items-center gap-2 p-2 border border-border bg-card/30 mb-2">
              <FactionIcon faction={status.pendingMatch.opponent.faction} size="sm" />
              <div className="flex-1">
                <div className="font-pixel text-xs font-bold">{status.pendingMatch.opponent.name}</div>
                <div className="text-[9px] text-muted-foreground uppercase">Sv {status.pendingMatch.opponent.level}</div>
              </div>
            </div>
          )}
          <Button
            onClick={() => handlePlay(status.pendingMatch!.id)}
            disabled={busy}
            className="pixel-button w-full bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-11"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {locale === "tr" ? "Savaş!" : "Fight!"}
          </Button>
        </PixelPanel>
      )}

      {/* Eleme durumu */}
      {status.participation?.eliminated && !isCompleted && (
        <PixelPanel className="p-4 text-center border-destructive">
          <Skull className="w-8 h-8 mx-auto text-destructive mb-2" />
          <div className="font-pixel text-sm text-destructive uppercase">
            {locale === "tr" ? "Elendin" : "Eliminated"}
          </div>
          <div className="text-[10px] text-muted-foreground font-pixel mt-1">
            {locale === "tr" ? `${roundName(status.participation.eliminatedRound, tour.totalRounds)} turunda elendin` : `Eliminated in ${roundName(status.participation.eliminatedRound, tour.totalRounds)}`}
          </div>
        </PixelPanel>
      )}

      {/* Bracket (tüm maçlar) */}
      {tour.status !== "REGISTRATION" && status.allMatches.length > 0 && (
        <PixelPanel className="p-3">
          <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{locale === "tr" ? "Turnuva Ağacı" : "Bracket"}</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {/* Round'lar halinde grupla */}
            {Array.from({ length: tour.totalRounds }, (_, i) => i + 1).map((round) => {
              const roundMatches = status.allMatches.filter((m) => m.round === round);
              if (roundMatches.length === 0) return null;
              return (
                <div key={round} className="border border-border p-2">
                  <div className="text-[10px] font-pixel text-muted-foreground uppercase mb-1">
                    {roundName(round, tour.totalRounds)}
                  </div>
                  <div className="space-y-1">
                    {roundMatches.map((m) => {
                      const isPlayerMatch = m.playerA.id === player.id || m.playerB?.id === player.id;
                      const playerWon = m.winnerId === player.id;
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex items-center gap-1 p-1.5 border text-[9px] font-pixel",
                            isPlayerMatch ? "border-accent bg-accent/5" : "border-border bg-card/30"
                          )}
                        >
                          <div className={cn("flex-1 truncate", m.winnerId === m.playerA.id && "text-accent font-bold")}>
                            {m.playerA.name}
                          </div>
                          <span className="text-muted-foreground">vs</span>
                          <div className={cn("flex-1 truncate text-right", m.winnerId === m.playerB?.id && "text-accent font-bold")}>
                            {m.playerB?.name ?? "BYE"}
                          </div>
                          {m.status === "COMPLETED" && (
                            <Check className="w-3 h-3 text-accent flex-shrink-0" />
                          )}
                          {isPlayerMatch && playerWon && (
                            <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </PixelPanel>
      )}

      {/* Senin maçların */}
      {status.matches.length > 0 && (
        <PixelPanel className="p-3">
          <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{locale === "tr" ? "Maçların" : "Your Matches"}</h3>
          <div className="space-y-1">
            {status.matches.map((m) => (
              <div key={m.id} className="flex items-center gap-2 p-1.5 border border-border bg-card/30 text-[10px] font-pixel">
                <span className="text-muted-foreground uppercase w-20">{roundName(m.round, tour.totalRounds)}</span>
                <span className="flex-1 truncate">{m.opponent?.name ?? "BYE"}</span>
                {m.status === "COMPLETED" ? (
                  m.won ? (
                    <Check className="w-3 h-3 text-accent" />
                  ) : (
                    <X className="w-3 h-3 text-destructive" />
                  )
                ) : (
                  <span className="text-muted-foreground">{locale === "tr" ? "Bekliyor" : "Pending"}</span>
                )}
              </div>
            ))}
          </div>
        </PixelPanel>
      )}

      {/* Ödül dağılımı */}
      <PixelPanel className="p-3">
        <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{locale === "tr" ? "Ödül Dağılımı" : "Prize Distribution"}</h3>
        <div className="space-y-1 text-[10px] font-pixel">
          <div className="flex justify-between">
            <span className="text-yellow-400">🏆 {locale === "tr" ? "Şampiyon" : "Champion"}</span>
            <span className="text-yellow-400">{Math.floor(tour.prizePool * 0.50)} Hurda (50%)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">🥈 {locale === "tr" ? "Finalist" : "Finalist"}</span>
            <span className="text-gray-300">{Math.floor(tour.prizePool * 0.25)} Hurda (25%)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-orange-400">🥉 {locale === "tr" ? "Yarı Final" : "Semifinal"}</span>
            <span className="text-orange-400">{Math.floor(tour.prizePool * 0.10)} Hurda (10%)</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{locale === "tr" ? "Çeyrek Final" : "Quarterfinal"}</span>
            <span>{Math.floor(tour.prizePool * 0.025)} Hurda (2.5%)</span>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}

function Skull({ className }: { className?: string }) {
  return <span className={className}>💀</span>;
}
