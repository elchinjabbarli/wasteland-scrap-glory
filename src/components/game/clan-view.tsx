"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGameStore } from "@/store/game-store";
import { useI18n } from "@/i18n/request";
import { useSocket } from "@/hooks/use-socket";
import { PixelPanel } from "./pixel-panel";
import { FactionIcon } from "./faction-icon";
import { CurrencyDisplay } from "./currency-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, MessageSquare, Send, Crown, Coins, LogOut, UserPlus, Shield, Swords } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ClanMember {
  id: string;
  playerId: string;
  name: string;
  faction: string;
  level: number;
  prestige: number;
  state: string;
  role: string;
  joinedAt: string;
  totalDonated: number;
}

interface ClanInfo {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  level: number;
  treasury: number;
  treasuryTechPart: number;
  memberCount: number;
  maxMembers: number;
  createdAt: string;
  members: ClanMember[];
}

interface ClanListItem {
  id: string;
  name: string;
  description: string;
  level: number;
  memberCount: number;
  maxMembers: number;
  leaderName: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderFaction: string;
  content: string;
  timestamp: string;
}

export function ClanView() {
  const { player } = useGameStore();
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [clan, setClan] = useState<ClanInfo | null>(null);
  const [clanList, setClanList] = useState<ClanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"my" | "list" | "create">("my");
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [busy, setBusy] = useState(false);

  // Socket.io hook
  const socket = useSocket({
    playerId: player?.id,
    playerName: player?.name,
    faction: player?.faction,
    clanId: player?.clanId ?? null,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshPlayer = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();
    if (meData.player) useGameStore.getState().setPlayer(meData.player);
    qc.invalidateQueries({ queryKey: ["inventory"] });
  }, [qc]);

  const loadClan = useCallback(async () => {
    try {
      const res = await fetch("/api/clan/mine");
      const data = await res.json();
      setClan(data.clan);
      if (data.clan) {
        // Mesajları yükle
        const msgRes = await fetch("/api/clan/messages");
        const msgData = await msgRes.json();
        setMessages(msgData.messages ?? []);
        // Socket.io odaya katıl
        socket.joinClanRoom(data.clan.id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [socket]);

  const loadClanList = useCallback(async () => {
    try {
      const res = await fetch("/api/clan/list");
      const data = await res.json();
      setClanList(data.clans ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadClan();
  }, [loadClan]);

  useEffect(() => {
    if (view === "list") loadClanList();
  }, [view, loadClanList]);

  // Socket'ten gelen mesajları dinle
  useEffect(() => {
    if (socket.clanMessage) {
      setMessages((prev) => {
        // Dedupe (id bazlı)
        if (prev.some((m) => m.id === socket.clanMessage!.id)) return prev;
        return [...prev, socket.clanMessage!].slice(-100);
      });
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [socket.clanMessage]);

  async function handleCreate() {
    if (createName.length < 3) {
      toast({ title: "Hata", description: "Klan adı 3-20 karakter", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/clan/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName, description: createDesc }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: `${data.clan.name} kuruldu!` });
        setCreateName("");
        setCreateDesc("");
        await refreshPlayer();
        await loadClan();
        setView("my");
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(clanId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/clan/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clanId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: "Katıldın!" });
        await refreshPlayer();
        await loadClan();
        setView("my");
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    if (!confirm("Klandan ayrıl?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/clan/leave", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: "Ayrıldın" });
        socket.leaveClanRoom();
        await refreshPlayer();
        await loadClan();
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleKick(memberId: string) {
    if (!confirm("Üyeyi kov?")) return;
    try {
      const res = await fetch("/api/clan/kick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: "Kovuldu" });
        await loadClan();
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    }
  }

  async function handleDonate(amount: number, currency: "SCRAP" | "TECH_PART") {
    setBusy(true);
    try {
      const res = await fetch("/api/clan/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✓", description: `${amount} ${currency === "SCRAP" ? "Hurda" : "Tech-Part"} bağışlandı` });
        await refreshPlayer();
        await loadClan();
      }
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    const content = newMessage.trim();
    setNewMessage("");
    // Optimistic: socket ile gönder
    socket.sendClanMessage(content);
    // API'ye kaydet
    try {
      await fetch("/api/clan/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    } catch {
      // ignore — socket zaten yayınladı
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

  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">
      <PixelPanel glow="rust" className="p-3 sm:p-4">
        <h2 className="font-pixel text-base sm:text-xl font-bold text-rust glow-text flex items-center gap-2">
          <Users className="w-5 h-5" />
          {t("clan.title")}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn("text-[10px] font-pixel uppercase", socket.connected ? "text-accent" : "text-muted-foreground")}>
            {socket.connected ? "● Çevrimiçi" : "○ Bağlanıyor..."}
          </span>
          {clan && (
            <span className="text-[10px] text-muted-foreground font-pixel">· {clan.name}</span>
          )}
        </div>

        {/* Tablar */}
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => setView("my")}
            className={cn("pixel-button flex-1 px-2 py-1.5 text-[10px] font-pixel uppercase border-2", view === "my" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border")}
          >
            <Users className="w-3 h-3 inline mr-1" />
            {t("clan.myClan")}
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("pixel-button flex-1 px-2 py-1.5 text-[10px] font-pixel uppercase border-2", view === "list" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border")}
          >
            <UserPlus className="w-3 h-3 inline mr-1" />
            {t("clan.browse")}
          </button>
          {!clan && (
            <button
              onClick={() => setView("create")}
              className={cn("pixel-button flex-1 px-2 py-1.5 text-[10px] font-pixel uppercase border-2", view === "create" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border")}
            >
              <Crown className="w-3 h-3 inline mr-1" />
              {t("clan.create")}
            </button>
          )}
        </div>
      </PixelPanel>

      {/* MY CLAN */}
      {view === "my" && (
        <>
          {!clan ? (
            <PixelPanel className="p-6 text-center">
              <p className="text-xs text-muted-foreground font-pixel uppercase mb-3">{t("clan.noClan")}</p>
              <Button onClick={() => setView("create")} className="pixel-button bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-10">
                <Crown className="w-4 h-4" />
                {t("clan.create")}
              </Button>
            </PixelPanel>
          ) : (
            <>
              {/* Klan bilgisi */}
              <PixelPanel glow="radiation" className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-pixel text-base font-bold text-accent glow-text">{clan.name}</div>
                    <div className="text-[10px] text-muted-foreground font-pixel uppercase">Sv {clan.level} · {clan.memberCount}/{clan.maxMembers} üye</div>
                  </div>
                  <CurrencyDisplay scrap={clan.treasury} techPart={clan.treasuryTechPart} compact />
                </div>
                {clan.description && (
                  <p className="text-[10px] text-muted-foreground mb-2 italic">{clan.description}</p>
                )}
                <div className="flex gap-1 mt-2">
                  <Button
                    onClick={() => handleDonate(50, "SCRAP")}
                    disabled={busy || (player.scrap ?? 0) < 50}
                    className="pixel-button flex-1 bg-card text-foreground border-2 border-border font-pixel uppercase h-8 text-[10px]"
                  >
                    <Coins className="w-3 h-3" />
                    +50 Hurda
                  </Button>
                  <Button
                    onClick={() => handleDonate(5, "TECH_PART")}
                    disabled={busy || (player.techPart ?? 0) < 5}
                    className="pixel-button flex-1 bg-card text-foreground border-2 border-border font-pixel uppercase h-8 text-[10px]"
                  >
                    <Coins className="w-3 h-3" />
                    +5 Tech
                  </Button>
                  <Button
                    onClick={handleLeave}
                    disabled={busy}
                    className="pixel-button bg-destructive text-white hover:bg-destructive/90 font-pixel uppercase h-8 text-[10px] px-2"
                  >
                    <LogOut className="w-3 h-3" />
                  </Button>
                </div>
              </PixelPanel>

              {/* Üyeler */}
              <PixelPanel className="p-3">
                <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{t("clan.members")} ({clan.members.length})</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                  {clan.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 p-1.5 border border-border bg-card/30">
                      <FactionIcon faction={m.faction} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-pixel text-xs font-bold truncate">{m.name}</div>
                        <div className="text-[9px] text-muted-foreground font-pixel uppercase">
                          Sv {m.level}{m.prestige > 0 && ` · P${m.prestige}`} · Bağış: {m.totalDonated}
                        </div>
                      </div>
                      {m.role === "LEADER" ? (
                        <Crown className="w-3 h-3 text-yellow-500" />
                      ) : m.role === "OFFICER" ? (
                        <Shield className="w-3 h-3 text-tech" />
                      ) : null}
                      {m.role !== "LEADER" && clan.leaderId === player.id && (
                        <button
                          onClick={() => handleKick(m.playerId)}
                          className="text-destructive hover:text-red-400 text-[10px] font-pixel uppercase"
                        >
                          Kov
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </PixelPanel>

              {/* Sohbet */}
              <PixelPanel className="p-3">
                <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {t("clan.chat")}
                </h3>
                <div className="bg-card/30 border border-border p-2 h-64 overflow-y-auto scrollbar-thin mb-2 space-y-1">
                  <AnimatePresence>
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground font-pixel uppercase text-[10px] py-8">
                        {t("clan.noMessages")}
                      </div>
                    ) : (
                      messages.map((m) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "text-[10px] font-pixel p-1",
                            m.senderId === player.id && "bg-accent/10"
                          )}
                        >
                          <span className="font-bold" style={{ color: m.senderFaction === "BOZKIR" ? "#9ca3af" : m.senderFaction === "COL" ? "#d4a574" : "#ec4899" }}>
                            {m.senderName}:
                          </span>{" "}
                          <span className="text-foreground">{m.content}</span>
                          <div ref={messagesEndRef} />
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex gap-1">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder={t("clan.typeMessage")}
                    maxLength={500}
                    className="font-pixel bg-card border-2 h-9 text-xs"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="pixel-button bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-9 px-3"
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </PixelPanel>
            </>
          )}
        </>
      )}

      {/* LIST */}
      {view === "list" && (
        <PixelPanel className="p-3">
          <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-2">{t("clan.browse")} ({clanList.length})</h3>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {clanList.map((c) => (
              <div key={c.id} className="pixel-panel p-2 flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-pixel text-xs font-bold truncate text-accent">{c.name}</div>
                  <div className="text-[9px] text-muted-foreground font-pixel uppercase">
                    Sv {c.level} · {c.memberCount}/{c.maxMembers} · Lider: {c.leaderName}
                  </div>
                </div>
                <Button
                  onClick={() => handleJoin(c.id)}
                  disabled={busy || !!player.clanId || c.memberCount >= c.maxMembers}
                  className="pixel-button bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-8 text-[10px] px-2"
                >
                  <UserPlus className="w-3 h-3" />
                  {t("clan.join")}
                </Button>
              </div>
            ))}
          </div>
        </PixelPanel>
      )}

      {/* CREATE */}
      {view === "create" && (
        <PixelPanel glow="rust" className="p-4">
          <h3 className="font-pixel text-xs font-bold text-accent uppercase mb-3">{t("clan.create")}</h3>
          <div className="space-y-3">
            <div>
              <Label className="font-pixel text-xs uppercase mb-1 block">{t("clan.name")}</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                maxLength={20}
                placeholder="örn. Çelik Pençe"
                className="font-pixel bg-card border-2 h-10"
              />
            </div>
            <div>
              <Label className="font-pixel text-xs uppercase mb-1 block">{t("clan.description")}</Label>
              <Input
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                maxLength={200}
                placeholder="Klan açıklaması..."
                className="font-pixel bg-card border-2 h-10"
              />
            </div>
            <div className="p-2 border border-border bg-card/30 text-[10px] font-pixel">
              <div className="text-muted-foreground uppercase mb-1">{t("clan.cost")}:</div>
              <div className="text-rust">1000 Hurda + 100 Tech-Part</div>
              <div className={cn("mt-1", (player.scrap ?? 0) >= 1000 && (player.techPart ?? 0) >= 100 ? "text-accent" : "text-destructive")}>
                Senin: {player.scrap} Hurda · {player.techPart} Tech-Part
              </div>
            </div>
            <Button
              onClick={handleCreate}
              disabled={busy || createName.length < 3 || (player.scrap ?? 0) < 1000 || (player.techPart ?? 0) < 100}
              className="pixel-button w-full bg-primary text-primary-foreground hover:bg-primary/90 font-pixel uppercase h-11"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
              {t("clan.create")}
            </Button>
          </div>
        </PixelPanel>
      )}
    </div>
  );
}
