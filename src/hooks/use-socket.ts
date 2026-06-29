"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

// Tek bir socket connection reuse edilir
let socketInstance: Socket | null = null;

interface UseSocketOptions {
  playerId?: string;
  playerName?: string;
  faction?: string;
  clanId?: string | null;
}

export function useSocket(opts: UseSocketOptions) {
  const [connected, setConnected] = useState(false);
  const [clanMessage, setClanMessage] = useState<null | {
    id: string;
    senderId: string;
    senderName: string;
    senderFaction: string;
    content: string;
    timestamp: string;
  }>(null);
  const [raidUpdate, setRaidUpdate] = useState<null | {
    raidId: string;
    currentHp: number;
    maxHp: number;
    defeated: boolean;
  }>(null);
  const [raidAttack, setRaidAttack] = useState<null | {
    raidId: string;
    playerName: string;
    damage: number;
    timestamp: string;
  }>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!opts.playerId) return;

    // Socket zaten bağlıysa reuse et
    if (!socketInstance) {
      socketInstance = io("/?XTransformPort=3003", {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });
    }
    socketRef.current = socketInstance;

    const socket = socketInstance;

    // Mevcut durumu yansıt (callback içinde set et)
    const onConnect = () => {
      setConnected(true);
      socket.emit("auth", {
        playerId: opts.playerId,
        playerName: opts.playerName,
        faction: opts.faction,
        clanId: opts.clanId,
      });
    };
    if (socket.connected) {
      onConnect();
    } else {
      socket.on("connect", onConnect);
    }

    socket.on("disconnect", () => setConnected(false));
    socket.on("auth-ok", () => setConnected(true));

    socket.on("clan-message", (msg) => setClanMessage(msg));
    socket.on("clan-message-echo", (msg) => setClanMessage(msg));
    socket.on("raid-boss-update", (data) => setRaidUpdate(data));
    socket.on("raid-attack", (data) => setRaidAttack(data));

    return () => {
      socket.off("clan-message");
      socket.off("clan-message-echo");
      socket.off("raid-boss-update");
      socket.off("raid-attack");
      socket.off("connect", onConnect);
      socket.off("disconnect");
      socket.off("auth-ok");
    };
  }, [opts.playerId, opts.playerName, opts.faction, opts.clanId]);

  const joinClanRoom = (clanId: string) => {
    socketRef.current?.emit("clan-join", { clanId });
  };

  const leaveClanRoom = () => {
    socketRef.current?.emit("clan-leave");
  };

  const sendClanMessage = (content: string) => {
    socketRef.current?.emit("clan-message", { content });
  };

  const joinRaidRoom = (raidId: string) => {
    socketRef.current?.emit("raid-join", { raidId });
  };

  const emitRaidAttack = (raidId: string, damage: number, playerName: string) => {
    socketRef.current?.emit("raid-attack", { raidId, damage, playerName });
  };

  return {
    connected,
    clanMessage,
    raidUpdate,
    raidAttack,
    joinClanRoom,
    leaveClanRoom,
    sendClanMessage,
    joinRaidRoom,
    emitRaidAttack,
  };
}
