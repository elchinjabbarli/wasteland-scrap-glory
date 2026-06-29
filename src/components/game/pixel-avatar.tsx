"use client";

import { motion } from "framer-motion";
import { type Faction } from "@/lib/game/constants";
import { FACTIONS } from "@/lib/game/constants";
import { cn } from "@/lib/utils";

interface PixelAvatarProps {
  faction: Faction | string;
  size?: "sm" | "md" | "lg" | "xl";
  state?: "idle" | "attack" | "damage" | "death";
  className?: string;
}

// Pixel grid boyutları
const SIZES: Record<string, { px: number; grid: number }> = {
  sm: { px: 32, grid: 8 },
  md: { px: 48, grid: 8 },
  lg: { px: 64, grid: 8 },
  xl: { px: 128, grid: 8 },
};

// Her fraksiyon için renk şeması
const FACTION_COLORS: Record<string, { primary: string; secondary: string; accent: string; skin: string; hair: string }> = {
  BOZKIR: {
    primary: "#9ca3af",   // metalik gri
    secondary: "#6b7280", // koyu gri
    accent: "#a16207",    // paslı altın
    skin: "#d4a574",      // ten rengi
    hair: "#451a03",      // koyu kahve
  },
  COL: {
    primary: "#d4a574",   // kum
    secondary: "#b8860b", // koyu kum
    accent: "#65a30d",    // zehir yeşili
    skin: "#c89968",      // koyu ten
    hair: "#1c1917",      // siyah
  },
  FAVELA: {
    primary: "#ec4899",   // neon magenta
    secondary: "#831843", // koyu magenta
    accent: "#06b6d4",    // neon mavi
    skin: "#c89968",      // ten
    hair: "#166534",      // koyu yeşil (dyed)
  },
};

export function PixelAvatar({ faction, size = "md", state = "idle", className }: PixelAvatarProps) {
  const f = FACTION_COLORS[faction as string] ?? FACTION_COLORS.BOZKIR;
  const { px, grid } = SIZES[size];
  const cellSize = px / grid;

  // Animation variants
  const animations = {
    idle: {
      animate: { y: [0, -2, 0] },
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
    },
    attack: {
      animate: { x: [0, 8, 0], rotate: [0, 15, 0] },
      transition: { duration: 0.4, repeat: Infinity },
    },
    damage: {
      animate: { x: [0, -3, 3, 0], opacity: [1, 0.5, 1] },
      transition: { duration: 0.3, repeat: Infinity },
    },
    death: {
      animate: { rotate: [0, 90], opacity: [1, 0.3], y: [0, 10] },
      transition: { duration: 1, repeat: Infinity },
    },
  };

  const anim = animations[state];

  // Pixel grid: 8x8 karakter tasarımı
  // 0 = transparent, 1 = primary, 2 = secondary, 3 = accent, 4 = skin, 5 = hair, 6 = eyes
  const SPRITE: Record<string, number[][]> = {
    BOZKIR: [
      [0, 0, 5, 5, 5, 5, 0, 0], // hair
      [0, 5, 4, 4, 4, 4, 5, 0], // forehead
      [5, 4, 6, 4, 4, 6, 4, 5], // eyes
      [5, 4, 4, 4, 4, 4, 4, 5], // cheeks
      [0, 4, 4, 4, 4, 4, 4, 0], // chin
      [0, 1, 1, 3, 3, 1, 1, 0], // armor chest
      [1, 1, 2, 3, 3, 2, 1, 1], // armor belt
      [1, 1, 0, 0, 0, 0, 1, 1], // legs
    ],
    COL: [
      [0, 0, 5, 5, 5, 5, 0, 0],
      [0, 5, 4, 4, 4, 4, 5, 0],
      [5, 4, 6, 4, 4, 6, 4, 5],
      [0, 4, 4, 4, 4, 4, 4, 0],
      [0, 0, 4, 4, 4, 4, 0, 0],
      [0, 1, 1, 3, 3, 1, 1, 0],
      [0, 1, 0, 2, 2, 0, 1, 0],
      [0, 1, 0, 0, 0, 0, 1, 0],
    ],
    FAVELA: [
      [0, 0, 5, 5, 5, 5, 0, 0],
      [0, 5, 4, 4, 4, 4, 5, 0],
      [5, 4, 6, 4, 4, 6, 4, 5],
      [5, 4, 4, 4, 4, 4, 4, 5],
      [0, 4, 4, 4, 4, 4, 4, 0],
      [3, 1, 1, 3, 3, 1, 1, 3],
      [3, 1, 1, 2, 2, 1, 1, 3],
      [0, 1, 1, 0, 0, 1, 1, 0],
    ],
  };

  const sprite = SPRITE[faction as string] ?? SPRITE.BOZKIR;
  const colors: Record<number, string> = {
    0: "transparent",
    1: f.primary,
    2: f.secondary,
    3: f.accent,
    4: f.skin,
    5: f.hair,
    6: "#ef4444", // eyes — kırmızı (post-apokaliptik)
  };

  return (
    <motion.div
      animate={anim.animate}
      transition={anim.transition}
      className={cn("inline-block", className)}
      style={{
        width: px,
        height: px,
        imageRendering: "pixelated",
        display: "grid",
        gridTemplateColumns: `repeat(${grid}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${grid}, ${cellSize}px)`,
      }}
    >
      {sprite.flat().map((cell, i) => (
        <div
          key={i}
          style={{
            backgroundColor: colors[cell],
            width: cellSize,
            height: cellSize,
          }}
        />
      ))}
    </motion.div>
  );
}

/** Savaş sahnesi için 2 karakterli pixel avatar ekranı */
export function BattlePixelScene({
  playerFaction,
  opponentFaction,
  playerHp,
  opponentHp,
  maxPlayerHp,
  maxOpponentHp,
}: {
  playerFaction: string;
  opponentFaction: string;
  playerHp: number;
  opponentHp: number;
  maxPlayerHp: number;
  maxOpponentHp: number;
}) {
  const playerState = playerHp <= 0 ? "death" : playerHp < maxPlayerHp * 0.3 ? "damage" : "idle";
  const opponentState = opponentHp <= 0 ? "death" : opponentHp < maxOpponentHp * 0.3 ? "damage" : "idle";

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      {/* Player */}
      <div className="flex flex-col items-center gap-2">
        <PixelAvatar faction={playerFaction as Faction} size="lg" state={playerState} />
        <div className="text-[9px] font-pixel uppercase text-accent">YOU</div>
      </div>

      {/* VS */}
      <div className="font-pixel text-xl font-bold text-rust glow-text">VS</div>

      {/* Opponent */}
      <div className="flex flex-col items-center gap-2">
        <PixelAvatar faction={opponentFaction as Faction} size="lg" state={opponentState} />
        <div className="text-[9px] font-pixel uppercase text-destructive">ENEMY</div>
      </div>
    </div>
  );
}
