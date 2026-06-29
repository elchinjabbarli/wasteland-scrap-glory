"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { PixelPanel } from "./pixel-panel";
import { FactionIcon } from "./faction-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Skull, Swords, Users, UserPlus, Check, X, Gift, Search } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RevengeLink {
  id: string;
  killer: { id: string; name: string; faction: string; level: number };
  itemName: string;
  itemRarity: string;
  expiresAt: string;
  remainingMs: number;
}

interface Friend {
  friendshipId: string;
  friend: { id: string; name: string; faction: string; level: number; prestige: number; state: string };
  canSendGift: boolean;
}

interface PendingRequest {
  id: string;
  from: { id: string; name: string; faction: string; level: number };
  createdAt: string;
}

type Tab = "revenge" | "friends" | "requests";

export function SocialView() {
  const { player } = useGameStore();
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("revenge");
  const [revengeLinks, setRevengeLinks] = useState<RevengeLink[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; faction: string; level: number }[]>([]);

  const refreshPlayer = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();
    if (meData.player) useGameStore.getState().setPlayer(meData.player);
  }, []);

  const loadRevenge = useCallback(async () => {
    try {
      const res = await fetch("/api/revenge/links");
      const data = await res.json();
      setRevengeLinks(data.links ?? []);
    } catch {
      // ignore
    }
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/list");
      const data = await res.json();
      setFriends(data.friends ?? []);
    } catch {
      // ignore
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/requests");
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    if (tab === "revenge") loadRevenge();
    if (tab === "friends") loadFriends();
    if (tab === "requests") loadRequests();
  }, [tab, loadRevenge, loadFriends, loadRequests]);

  async function handleSearch() {
    if (searchQuery.length < 2) return;
    try {
      const res = await fetch(`/api/friends/find?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch {
      // ignore
    }
  }

  async function handleAddFriend(targetId: string) {
    setBusy(targetId);
    try {
      const res = await fetch("/api/friends/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: "İstek gönderildi" });
        setSearchResults([]);
        setSearchQuery("");
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleAcceptRequest(reqId: string) {
    setBusy(reqId);
    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: reqId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: "Arkadaş eklendi" });
        await loadRequests();
        await loadFriends();
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleRejectRequest(reqId: string) {
    setBusy(reqId);
    try {
      const res = await fetch("/api/friends/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: reqId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        await loadRequests();
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleGift(friendId: string) {
    setBusy(friendId);
    try {
      const res = await fetch("/api/friends/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "🎁", description: `Hediye gönderildi! +${data.rewards.scrap} Hurda, +${data.rewards.xp} XP` });
        await refreshPlayer();
        await loadFriends();
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleRevenge(linkId: string) {
    if (!confirm("İntikam savaşı başlat? Kaybedersen link tüketilir.")) return;
    setBusy(linkId);
    try {
      const res = await fetch("/api/revenge/perform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else if (data.success) {
        toast({
          title: "⚔️ İNTİKAM ALINDI!",
          description: `${data.recoveredItem.name} geri alındı!${data.stolenItem ? ` + ${data.stolenItem.name} çalındı!` : ""}`,
        });
        await refreshPlayer();
        await loadRevenge();
      } else {
        toast({ title: "💀 Yenildin", description: "İntikam başarısız, link tükendi", variant: "destructive" });
        await loadRevenge();
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  if (!player) return null;

  return (
    <div className="p-3 sm:p-4 max-w-2xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text flex items-center gap-2">
          <Users className="w-5 h-5" />
          {t("social.title")}
        </h2>

        <div className="grid grid-cols-3 gap-1 mt-3">
          {([
            { key: "revenge", label: t("social.revenge"), icon: Skull },
            { key: "friends", label: t("social.friends"), icon: Users },
            { key: "requests", label: t("social.requests"), icon: UserPlus },
          ] as const).map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={cn(
                "pixel-button px-1 py-2 text-[10px] font-pixel uppercase tracking-wider border-2 flex flex-col items-center gap-1",
                tab === tb.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
              )}
            >
              <tb.icon className="w-3 h-3" />
              <span className="truncate w-full text-center">{tb.label}</span>
            </button>
          ))}
        </div>
      </PixelPanel>

      {/* REVENGE */}
      {tab === "revenge" && (
        <PixelPanel className="p-3">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground font-pixel uppercase text-xs">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              {t("common.loading")}
            </div>
          ) : revengeLinks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
              {t("social.noRevenge")}
            </div>
          ) : (
            <div className="space-y-2">
              {revengeLinks.map((link) => {
                const remainMin = Math.floor(link.remainingMs / 60000);
                const remainHr = Math.floor(remainMin / 60);
                return (
                  <motion.div
                    key={link.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pixel-panel p-3"
                    style={{ borderColor: "var(--blood)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Skull className="w-4 h-4 text-destructive" />
                      <FactionIcon faction={link.killer.faction} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-pixel text-xs font-bold text-destructive">{link.killer.name}</div>
                        <div className="text-[9px] text-muted-foreground font-pixel uppercase">Sv {link.killer.level}</div>
                      </div>
                      <div className="text-[9px] text-yellow-500 font-pixel">
                        {remainHr > 0 ? `${remainHr}sa` : `${remainMin}dk`}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-pixel mb-2">
                      Kaybettiğin: <span className="text-rust">{link.itemName}</span> ({link.itemRarity})
                    </div>
                    <Button
                      onClick={() => handleRevenge(link.id)}
                      disabled={busy === link.id}
                      className="pixel-button w-full bg-destructive text-white hover:bg-destructive/90 font-pixel uppercase h-9 text-xs"
                    >
                      {busy === link.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Swords className="w-3 h-3" />}
                      {t("social.takeRevenge")}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </PixelPanel>
      )}

      {/* FRIENDS */}
      {tab === "friends" && (
        <>
          <PixelPanel className="p-3">
            <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{t("social.addFriend")}</h3>
            <div className="flex gap-1 mb-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={t("social.searchPlaceholder")}
                className="font-pixel bg-card border-2 h-9 text-xs"
              />
              <Button onClick={handleSearch} className="pixel-button bg-primary text-primary-foreground font-pixel uppercase h-9 px-3">
                <Search className="w-3 h-3" />
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-1 mt-2">
                {searchResults.filter((r) => r.id !== player.id).map((r) => (
                  <div key={r.id} className="flex items-center gap-2 p-1.5 border border-border bg-card/30">
                    <FactionIcon faction={r.faction} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-pixel text-xs font-bold truncate">{r.name}</div>
                      <div className="text-[9px] text-muted-foreground font-pixel uppercase">Sv {r.level}</div>
                    </div>
                    <Button
                      onClick={() => handleAddFriend(r.id)}
                      disabled={busy === r.id}
                      className="pixel-button bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-7 text-[10px] px-2"
                    >
                      {busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                      Ekle
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </PixelPanel>

          <PixelPanel className="p-3">
            <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{t("social.friendsList")} ({friends.length})</h3>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground font-pixel uppercase text-xs">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
                {t("social.noFriends")}
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin">
                {friends.map((f) => (
                  <div key={f.friendshipId} className="flex items-center gap-2 p-1.5 border border-border bg-card/30">
                    <FactionIcon faction={f.friend.faction} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-pixel text-xs font-bold truncate">{f.friend.name}</div>
                      <div className="text-[9px] text-muted-foreground font-pixel uppercase">
                        Sv {f.friend.level}{f.friend.prestige > 0 && ` · P${f.friend.prestige}`}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleGift(f.friend.id)}
                      disabled={busy === f.friend.id || !f.canSendGift}
                      className={cn(
                        "pixel-button font-pixel uppercase h-7 text-[10px] px-2",
                        f.canSendGift ? "bg-accent text-accent-foreground hover:bg-accent/90" : "bg-card text-muted-foreground border-2 border-border"
                      )}
                    >
                      {busy === f.friend.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
                      {t("social.gift")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </PixelPanel>
        </>
      )}

      {/* REQUESTS */}
      {tab === "requests" && (
        <PixelPanel className="p-3">
          <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{t("social.requests")} ({requests.length})</h3>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground font-pixel uppercase text-xs">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground font-pixel uppercase text-xs">
              {t("social.noRequests")}
            </div>
          ) : (
            <div className="space-y-1">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center gap-2 p-1.5 border border-border bg-card/30">
                  <FactionIcon faction={r.from.faction} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-pixel text-xs font-bold truncate">{r.from.name}</div>
                    <div className="text-[9px] text-muted-foreground font-pixel uppercase">Sv {r.from.level}</div>
                  </div>
                  <Button
                    onClick={() => handleAcceptRequest(r.id)}
                    disabled={busy === r.id}
                    className="pixel-button bg-accent text-accent-foreground hover:bg-accent/90 font-pixel uppercase h-7 text-[10px] px-2"
                  >
                    {busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </Button>
                  <Button
                    onClick={() => handleRejectRequest(r.id)}
                    disabled={busy === r.id}
                    className="pixel-button bg-destructive text-white hover:bg-destructive/90 font-pixel uppercase h-7 text-[10px] px-2"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      )}
    </div>
  );
}
