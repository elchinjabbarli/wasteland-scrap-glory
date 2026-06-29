// Wasteland: Scrap & Glory - Ses Efektleri (Web Audio API)
// GDD Bölüm 10.4: Metalik silah sesleri, ağır zırh sesleri, retro 8-bit UI sesleri
// CC0 — oscillator tabanlı prosedürel ses (harici asset gerektirmez)

"use client";

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

// localStorage'dan ses ayarını yükle
if (typeof window !== "undefined") {
  const stored = localStorage.getItem("wsg-sound-enabled");
  if (stored !== null) {
    soundEnabled = stored === "true";
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (typeof window !== "undefined") {
    localStorage.setItem("wsg-sound-enabled", String(enabled));
  }
}

// ============================================================
// PROSEDÜREL SES ÜRETİMİ (oscillator)
// ============================================================

interface ToneOptions {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  sweep?: number; // frekans değişimi (hedef frekans)
  attack?: number;
  decay?: number;
}

function playTone(opts: ToneOptions): void {
  if (!soundEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(opts.frequency, ctx.currentTime);

  if (opts.sweep) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(0.01, opts.sweep),
      ctx.currentTime + opts.duration
    );
  }

  const vol = opts.volume ?? 0.15;
  const attack = opts.attack ?? 0.01;
  const decay = opts.decay ?? opts.duration;

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decay);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + decay + 0.1);
}

function playNoise(duration: number, volume: number = 0.1, filterFreq: number = 1000): void {
  if (!soundEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + duration);
}

// ============================================================
// SES EFEKTLERİ (GDD 10.4)
// ============================================================

export const sfx = {
  // Savaş sesleri
  swordHit: () => {
    playTone({ frequency: 200, sweep: 80, duration: 0.15, type: "sawtooth", volume: 0.12 });
    playNoise(0.1, 0.08, 2000);
  },
  crit: () => {
    playTone({ frequency: 400, sweep: 120, duration: 0.25, type: "square", volume: 0.18 });
    playNoise(0.15, 0.12, 3000);
  },
  evade: () => {
    playTone({ frequency: 800, sweep: 1200, duration: 0.1, type: "sine", volume: 0.1 });
  },
  win: () => {
    // 3 notalı fanfare
    playTone({ frequency: 523, duration: 0.12, type: "square", volume: 0.15 });
    setTimeout(() => playTone({ frequency: 659, duration: 0.12, type: "square", volume: 0.15 }), 120);
    setTimeout(() => playTone({ frequency: 784, duration: 0.2, type: "square", volume: 0.15 }), 240);
  },
  lose: () => {
    playTone({ frequency: 300, sweep: 100, duration: 0.4, type: "sawtooth", volume: 0.12 });
    setTimeout(() => playTone({ frequency: 200, sweep: 50, duration: 0.5, type: "sawtooth", volume: 0.1 }), 200);
  },
  // Crafting
  craftStart: () => {
    playTone({ frequency: 150, duration: 0.1, type: "square", volume: 0.1 });
  },
  craftSuccess: () => {
    playTone({ frequency: 600, duration: 0.1, type: "sine", volume: 0.12 });
    setTimeout(() => playTone({ frequency: 900, duration: 0.15, type: "sine", volume: 0.12 }), 100);
  },
  craftFail: () => {
    playTone({ frequency: 200, sweep: 80, duration: 0.3, type: "sawtooth", volume: 0.12 });
  },
  // Level up
  levelUp: () => {
    playTone({ frequency: 523, duration: 0.1, type: "square", volume: 0.15 });
    setTimeout(() => playTone({ frequency: 659, duration: 0.1, type: "square", volume: 0.15 }), 100);
    setTimeout(() => playTone({ frequency: 784, duration: 0.1, type: "square", volume: 0.15 }), 200);
    setTimeout(() => playTone({ frequency: 1047, duration: 0.25, type: "square", volume: 0.15 }), 300);
  },
  // UI sesleri (8-bit)
  uiClick: () => {
    playTone({ frequency: 600, duration: 0.04, type: "square", volume: 0.08 });
  },
  uiHover: () => {
    playTone({ frequency: 800, duration: 0.02, type: "square", volume: 0.04 });
  },
  uiTab: () => {
    playTone({ frequency: 400, duration: 0.05, type: "square", volume: 0.06 });
    setTimeout(() => playTone({ frequency: 600, duration: 0.05, type: "square", volume: 0.06 }), 30);
  },
  // Notification
  notification: () => {
    playTone({ frequency: 880, duration: 0.08, type: "sine", volume: 0.1 });
    setTimeout(() => playTone({ frequency: 1100, duration: 0.12, type: "sine", volume: 0.1 }), 80);
  },
  // Reward/chest
  reward: () => {
    playTone({ frequency: 660, duration: 0.1, type: "sine", volume: 0.12 });
    setTimeout(() => playTone({ frequency: 880, duration: 0.1, type: "sine", volume: 0.12 }), 100);
    setTimeout(() => playTone({ frequency: 1100, duration: 0.2, type: "sine", volume: 0.12 }), 200);
  },
  // Error
  error: () => {
    playTone({ frequency: 150, duration: 0.15, type: "sawtooth", volume: 0.1 });
  },
};

// ============================================================
// SES AÇMA/KAPAMA HOOK
// ============================================================

export function useSoundToggle() {
  const toggle = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    if (newState) {
      sfx.uiClick();
    }
    return newState;
  };

  return { enabled: soundEnabled, toggle };
}
