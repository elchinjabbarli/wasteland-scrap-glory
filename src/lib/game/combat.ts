// Wasteland: Scrap & Glory - Savaş Simülasyon Motoru
// Server-authoritative, round-bazlı auto-battler
// Tüm hesaplamalar burada; frontend sadece log'u oynatır

import {
  type Element,
  type StatusEffectType,
  MAX_COMBAT_ROUNDS,
} from "./constants";
import {
  physicalDamage,
  energyDamage,
  maxEnergy,
  critChance as calcCritChance,
  evasionChance as calcEvasion,
  elementMultiplier,
  prestigeMultiplier,
  rng,
  chanceCheck,
} from "./stats";
import type { CompiledPlayerStats, MockOpponent } from "./player-stats";

// ============================================================
// COMBAT STATES (GDD 17.2)
// ============================================================

export type CombatState =
  | "WAITING"
  | "ROUND_START"
  | "ATTACK_PHASE"
  | "DEFENSE_PHASE"
  | "STATUS_EFFECT_PHASE"
  | "ROUND_END"
  | "COMBAT_END";

export interface CombatStateLog {
  state: CombatState;
  round: number;
  description: string;
  timestamp: number;
}

// ============================================================
// TİPLER
// ============================================================

export interface ActiveStatusEffect {
  type: StatusEffectType;
  duration: number;
  appliedRound: number;
}

export interface CombatantState {
  id: string;
  name: string;
  faction: string;
  level: number;
  prestige: number;
  maxHp: number;
  currentHp: number;
  shieldHp: number;
  str: number;
  agi: number;
  int: number;
  lck: number;
  end: number;
  critChance: number;
  evasionChance: number;
  attackSpeed: number; // çarpan
  weaponDamage: number;
  weaponElement: Element;
  armorValue: number;
  companionHp: number;
  companionDamage: number;
  sideToolEffect: { type: StatusEffectType; chance: number; duration: number } | null;
  effects: ActiveStatusEffect[];
  isStunned: boolean;
  isFrozen: boolean;
  isPlayer: boolean;
  // GDD 2.2.1: Enerji sistemi — enerji silahları enerji tüketir
  maxEnergy: number;
  currentEnergy: number;
  isEnergyWeapon: boolean; // FIRE/ICE element silahlar enerji kullanır
  energyDepleted: boolean; // enerji 0'a düştü mü
}

export interface RoundLog {
  round: number;
  attackerId: string;
  defenderId: string;
  weaponName: string;
  element: Element;
  baseDamage: number;
  critMultiplier: number;
  elementMultiplier: number;
  evasion: boolean;
  finalDamage: number;
  defenderHpAfter: number;
  effectsApplied: StatusEffectType[];
  effectsTicked: { type: StatusEffectType; damage: number }[];
  companionAttack?: { damage: number; targetHpAfter: number };
  logText: string; // insan-okur metin
}

export interface CombatResult {
  winnerId: string;
  loserId: string;
  winnerSide: "A" | "B";
  totalRounds: number;
  durationMs: number;
  rounds: RoundLog[];
  stateLog: CombatStateLog[];
  finalHpA: number;
  finalHpB: number;
  playerWon: boolean;
}

// ============================================================
// COMBATANT HAZIRLIĞI
// ============================================================

function toCombatant(stats: CompiledPlayerStats, isPlayer: boolean): CombatantState {
  const isEnergyWeapon = ["FIRE", "ICE"].includes(stats.activeElement);
  return {
    id: stats.playerId,
    name: stats.name,
    faction: stats.faction,
    level: stats.level,
    prestige: stats.prestige,
    maxHp: stats.maxHp,
    currentHp: stats.currentHp,
    shieldHp: 0,
    str: stats.str,
    agi: stats.agi,
    int: stats.int,
    lck: stats.lck,
    end: stats.end,
    critChance: stats.critChance,
    evasionChance: stats.evasionChance,
    attackSpeed: stats.attackSpeed,
    weaponDamage: stats.weapon?.damage ?? 5,
    weaponElement: stats.activeElement,
    armorValue: stats.armor?.armor ?? 0,
    companionHp: stats.companion?.companionHp ?? 0,
    companionDamage: stats.companion?.companionDamage ?? 0,
    sideToolEffect: stats.sideToolEffect,
    effects: [],
    isStunned: false,
    isFrozen: false,
    isPlayer,
    maxEnergy: maxEnergy(stats.int),
    currentEnergy: maxEnergy(stats.int),
    isEnergyWeapon,
    energyDepleted: false,
  };
}

function toCombatantFromMock(mock: MockOpponent, isPlayer: boolean): CombatantState {
  const isEnergyWeapon = ["FIRE", "ICE"].includes(mock.activeElement);
  return {
    id: mock.id,
    name: mock.name,
    faction: mock.faction,
    level: mock.level,
    prestige: mock.prestige,
    maxHp: mock.maxHp,
    currentHp: mock.currentHp,
    shieldHp: 0,
    str: mock.str,
    agi: mock.agi,
    int: mock.int,
    lck: mock.lck,
    end: mock.end,
    critChance: mock.critChance,
    evasionChance: mock.evasionChance,
    attackSpeed: mock.attackSpeed,
    weaponDamage: mock.weapon.damage,
    weaponElement: mock.activeElement,
    armorValue: mock.armor?.armor ?? 0,
    companionHp: mock.companion?.companionHp ?? 0,
    companionDamage: mock.companion?.companionDamage ?? 0,
    sideToolEffect: mock.sideToolEffect,
    effects: [],
    isStunned: false,
    isFrozen: false,
    isPlayer,
    maxEnergy: maxEnergy(mock.int),
    currentEnergy: maxEnergy(mock.int),
    isEnergyWeapon,
    energyDepleted: false,
  };
}

// ============================================================
// ETKİ YÖNETİMİ
// ============================================================

function applyEffect(target: CombatantState, type: StatusEffectType, duration: number, round: number) {
  // Aynı etkiden varsa süreyi uzat (stackleme yok)
  const existing = target.effects.find((e) => e.type === type);
  if (existing) {
    existing.duration = Math.max(existing.duration, duration);
  } else {
    target.effects.push({ type, duration, appliedRound: round });
  }

  // Anlık etkiler
  if (type === "SHIELD") {
    target.shieldHp += 50;
  }
  if (type === "STUN") {
    target.isStunned = true;
  }
  if (type === "FREEZE") {
    target.isFrozen = true;
  }
}

function tickEffects(target: CombatantState, round: number): { type: StatusEffectType; damage: number }[] {
  const ticked: { type: StatusEffectType; damage: number }[] = [];
  for (const effect of target.effects) {
    let dmg = 0;
    switch (effect.type) {
      case "POISON":
        dmg = 5;
        break;
      case "BURN":
        dmg = 8;
        break;
      case "REGEN":
        dmg = -10; // negatif = iyileştirme
        break;
      default:
        break;
    }
    if (dmg !== 0) {
      if (dmg > 0) {
        // Hasar önce shield'ten düşer
        if (target.shieldHp > 0) {
          const absorbed = Math.min(target.shieldHp, dmg);
          target.shieldHp -= absorbed;
          dmg -= absorbed;
        }
        target.currentHp = Math.max(0, target.currentHp - dmg);
      } else {
        target.currentHp = Math.min(target.maxHp, target.currentHp - dmg);
      }
      ticked.push({ type: effect.type, damage: Math.abs(dmg) });
    }
  }

  // Süre azalt ve bitenleri kaldır
  target.effects = target.effects.filter((e) => {
    e.duration -= 1;
    if (e.duration <= 0) {
      // Biten etkilerin temizliği
      if (e.type === "STUN") target.isStunned = false;
      if (e.type === "FREEZE") target.isFrozen = false;
      return false;
    }
    return true;
  });

  return ticked;
}

function hasEffect(target: CombatantState, type: StatusEffectType): boolean {
  return target.effects.some((e) => e.type === type);
}

// ============================================================
// TUR SİMÜLASYONU
// ============================================================

function performAttack(
  attacker: CombatantState,
  defender: CombatantState,
  round: number,
  weaponName: string,
  seed?: { value: number }
): RoundLog {
  // Stun/freeze kontrolü
  if (attacker.isStunned || attacker.isFrozen) {
    return {
      round,
      attackerId: attacker.id,
      defenderId: defender.id,
      weaponName,
      element: attacker.weaponElement,
      baseDamage: 0,
      critMultiplier: 1,
      elementMultiplier: 1,
      evasion: false,
      finalDamage: 0,
      defenderHpAfter: defender.currentHp,
      effectsApplied: [],
      effectsTicked: [],
      logText: `${attacker.name} ${attacker.isStunned ? "sersemledi" : "donmuş"} — saldıramıyor! (Tur ${round})`,
    };
  }

  // Base damage hesabı — GDD 2.2.1: Enerji silahları enerji tüketir
  // Enerji silahı (FIRE/ICE) ama enerji 0 ise → fiziksel hasara düş (zayıf yumruk)
  let actualIsEnergy = attacker.isEnergyWeapon && attacker.currentEnergy > 0;
  let energyCost = 0;

  if (actualIsEnergy) {
    // Her saldırıda 5 enerji tüket
    energyCost = Math.min(5, attacker.currentEnergy);
    attacker.currentEnergy = Math.max(0, attacker.currentEnergy - energyCost);
    if (attacker.currentEnergy === 0) {
      attacker.energyDepleted = true;
    }
  }

  const baseDmg = actualIsEnergy
    ? energyDamage(attacker.weaponDamage, attacker.int)
    : physicalDamage(attacker.weaponDamage, actualIsEnergy ? Math.floor(attacker.str * 0.5) : attacker.str); // enerji bitince zayıf fiziksel

  // Prestige bonus (sadece player için) — GDD 8.2: Kalıcı +%2 Hasar
  const prestMul = attacker.isPlayer ? prestigeMultiplier(attacker.prestige) : 1;
  let damage = Math.floor(baseDmg * prestMul);

  // Empower buff
  if (hasEffect(attacker, "EMPOWER")) {
    damage = Math.floor(damage * 1.15);
  }

  // Kritik kontrolü
  const isCrit = chanceCheck(attacker.critChance, seed);
  const critMul = isCrit ? 2 : 1;
  damage = Math.floor(damage * critMul);

  // Element çarpanı (defender'ın armor element'i yok, weapon element vs defender weapon element)
  const elMul = elementMultiplier(attacker.weaponElement, defender.weaponElement);
  damage = Math.floor(damage * elMul);

  // Evasion kontrolü (defender)
  const isEvaded = chanceCheck(defender.evasionChance, seed);

  let finalDamage = 0;
  if (!isEvaded) {
    // Armor reduction
    damage = Math.max(damage - defender.armorValue, 1);
    // Shield önce düşer
    if (defender.shieldHp > 0) {
      const absorbed = Math.min(defender.shieldHp, damage);
      defender.shieldHp -= absorbed;
      damage -= absorbed;
    }
    finalDamage = damage;
    defender.currentHp = Math.max(0, defender.currentHp - finalDamage);
  }

  // Side tool effect (ilk turda tetiklenir, %100 şans değilse her tur kontrol)
  const effectsApplied: StatusEffectType[] = [];
  if (attacker.sideToolEffect && chanceCheck(attacker.sideToolEffect.chance, seed)) {
    applyEffect(defender, attacker.sideToolEffect.type, attacker.sideToolEffect.duration, round);
    effectsApplied.push(attacker.sideToolEffect.type);
  }

  // Companion saldırısı (eğer hayattaysa)
  let companionAttack: { damage: number; targetHpAfter: number } | undefined;
  if (attacker.companionHp > 0 && attacker.companionDamage > 0 && !isEvaded) {
    const compDmg = Math.max(attacker.companionDamage - Math.floor(defender.armorValue / 2), 1);
    if (defender.shieldHp > 0) {
      const absorbed = Math.min(defender.shieldHp, compDmg);
      defender.shieldHp -= absorbed;
      const remain = compDmg - absorbed;
      if (remain > 0) defender.currentHp = Math.max(0, defender.currentHp - remain);
    } else {
      defender.currentHp = Math.max(0, defender.currentHp - compDmg);
    }
    companionAttack = { damage: compDmg, targetHpAfter: defender.currentHp };
  }

  // Log metni
  let logText = `Tur ${round}: ${attacker.name} ${weaponName} ile saldırıyor. `;
  if (attacker.energyDepleted && attacker.isEnergyWeapon) {
    logText += `⚡ Enerji tükendi! Zayıf fiziksel saldırı. `;
  }
  if (isEvaded) {
    logText += `${defender.name} saldırıyı boşalttı!`;
  } else {
    logText += `${finalDamage} hasar${isCrit ? " (KRİTİK!)" : ""}${elMul > 1 ? " (Element bonusu!)" : ""}`;
    if (companionAttack) logText += ` + ${companionAttack.damage} yoldaş hasarı`;
    if (effectsApplied.length > 0) logText += ` → ${effectsApplied.join(", ")}`;
  }

  return {
    round,
    attackerId: attacker.id,
    defenderId: defender.id,
    weaponName,
    element: attacker.weaponElement,
    baseDamage: baseDmg,
    critMultiplier: critMul,
    elementMultiplier: elMul,
    evasion: isEvaded,
    finalDamage,
    defenderHpAfter: defender.currentHp,
    effectsApplied,
    effectsTicked: [],
    companionAttack,
    logText,
  };
}

// ============================================================
// ANA SİMÜLASYON
// ============================================================

export function simulateCombat(
  playerStats: CompiledPlayerStats,
  opponent: CompiledPlayerStats | MockOpponent,
  seed?: { value: number }
): CombatResult {
  const startTime = Date.now();

  const combatantA = toCombatant(playerStats, true);
  const combatantB = "isMock" in opponent
    ? toCombatantFromMock(opponent, false)
    : toCombatant(opponent, false);

  // İlk turda side tool effect'ler uygulanabilir (oyuncu için shield/haste vs kendine)
  // GDD'ye göre side tool "kullanıldığında" tetiklenir. Savaş başında kendine uygulansın:
  if (combatantA.sideToolEffect) {
    const positiveEffects: StatusEffectType[] = ["HASTE", "EMPOWER", "SHIELD", "REGEN"];
    if (positiveEffects.includes(combatantA.sideToolEffect.type)) {
      applyEffect(combatantA, combatantA.sideToolEffect.type, combatantA.sideToolEffect.duration, 0);
    }
  }
  if (combatantB.sideToolEffect) {
    const positiveEffects: StatusEffectType[] = ["HASTE", "EMPOWER", "SHIELD", "REGEN"];
    if (positiveEffects.includes(combatantB.sideToolEffect.type)) {
      applyEffect(combatantB, combatantB.sideToolEffect.type, combatantB.sideToolEffect.duration, 0);
    }
  }

  const rounds: RoundLog[] = [];
  const stateLog: CombatStateLog[] = [];
  let round = 1;
  let lastAttackerId: string | null = null;

  stateLog.push({ state: "WAITING", round: 0, description: "Savaş bekleniyor...", timestamp: Date.now() });

  while (round <= MAX_COMBAT_ROUNDS && combatantA.currentHp > 0 && combatantB.currentHp > 0) {
    stateLog.push({ state: "ROUND_START", round, description: `Tur ${round} başlıyor`, timestamp: Date.now() });
    // Hız kontrolü: attackSpeed yüksek olan önce saldırır
    const aSpeed = combatantA.attackSpeed * (hasEffect(combatantA, "HASTE") ? 1.2 : 1) * (hasEffect(combatantA, "BURN") ? 0.9 : 1);
    const bSpeed = combatantB.attackSpeed * (hasEffect(combatantB, "HASTE") ? 1.2 : 1) * (hasEffect(combatantB, "BURN") ? 0.9 : 1);

    let attacker: CombatantState;
    let defender: CombatantState;
    let attackerSide: "A" | "B";

    if (aSpeed > bSpeed) {
      attacker = combatantA;
      defender = combatantB;
      attackerSide = "A";
    } else if (bSpeed > aSpeed) {
      attacker = combatantB;
      defender = combatantA;
      attackerSide = "B";
    } else {
      // Beraberlikse sıra değişir
      if (lastAttackerId === combatantA.id) {
        attacker = combatantB;
        defender = combatantA;
        attackerSide = "B";
      } else {
        attacker = combatantA;
        defender = combatantB;
        attackerSide = "A";
      }
    }
    lastAttackerId = attacker.id;

    // Side tool effect (negative effects düşmana her tur %chance ile uygulanır)
    // Positive effects savaş başında uygulandı, tekrar uygulama
    // Negative: POISON, BURN, FREEZE, STUN — sadece ilk turda %100 şansla uygula (side tool = tek kullanımlık)
    // Aslında GDD'ye göre side tool "kullanıldığında" tetiklenir. İlk turda bir kez negative effect uygula.
    const attackerWeaponName = attacker.name === combatantA.name
      ? (playerStats.weapon?.name ?? "Yumruk")
      : (opponent.weapon?.name ?? "Yumruk");

    // İlk turda negative side tool effect'i uygula
    if (round === 1 && attacker.sideToolEffect) {
      const negativeEffects: StatusEffectType[] = ["POISON", "BURN", "FREEZE", "STUN"];
      if (negativeEffects.includes(attacker.sideToolEffect.type) && chanceCheck(attacker.sideToolEffect.chance, seed)) {
        applyEffect(defender, attacker.sideToolEffect.type, attacker.sideToolEffect.duration, round);
      }
    }

    // Status effect tick (tur başında)
    stateLog.push({ state: "STATUS_EFFECT_PHASE", round, description: "Durum etkileri işleniyor", timestamp: Date.now() });
    const aTicks = tickEffects(combatantA, round);
    const bTicks = tickEffects(combatantB, round);

    // Saldırı
    stateLog.push({ state: "ATTACK_PHASE", round, description: `${attacker.name} saldırıyor`, timestamp: Date.now() });
    const attackLog = performAttack(attacker, defender, round, attackerWeaponName, seed);
    attackLog.effectsTicked = attackerSide === "A" ? bTicks : aTicks;

    stateLog.push({ state: "DEFENSE_PHASE", round, description: `${defender.name} savunuyor`, timestamp: Date.now() });

    rounds.push(attackLog);

    // Karşı taraf hala hayattaysa, o da saldırsın (sıra değişimi) — bunu hız kontrolü zaten yapıyor
    // Ama her round'da sadece 1 saldırı olsun (hızlı tempolu)

    stateLog.push({ state: "ROUND_END", round, description: `Tur ${round} bitti`, timestamp: Date.now() });
    round++;

    // Companion ölüm kontrolü (her round)
    // Not: companion HP şu an basitçe azalmıyor; Faz 2'de kompleks hale gelir
  }

  stateLog.push({ state: "COMBAT_END", round, description: "Savaş bitti", timestamp: Date.now() });

  // Sonuç
  const playerWon = combatantB.currentHp <= 0 && combatantA.currentHp > 0;
  const winnerSide: "A" | "B" = playerWon ? "A" : "B";
  const winnerId = playerWon ? combatantA.id : combatantB.id;
  const loserId = playerWon ? combatantB.id : combatantA.id;

  // Edge case: round limitine ulaşıldıysa, daha çok HP olan kazanır
  if (round > MAX_COMBAT_ROUNDS && combatantA.currentHp > 0 && combatantB.currentHp > 0) {
    if (combatantA.currentHp >= combatantB.currentHp) {
      // Player wins tie
      return {
        winnerId: combatantA.id,
        loserId: combatantB.id,
        winnerSide: "A",
        totalRounds: round - 1,
        durationMs: Date.now() - startTime,
        rounds,
        stateLog,
        finalHpA: combatantA.currentHp,
        finalHpB: combatantB.currentHp,
        playerWon: true,
      };
    } else {
      return {
        winnerId: combatantB.id,
        loserId: combatantA.id,
        winnerSide: "B",
        totalRounds: round - 1,
        durationMs: Date.now() - startTime,
        rounds,
        stateLog,
        finalHpA: combatantA.currentHp,
        finalHpB: combatantB.currentHp,
        playerWon: false,
      };
    }
  }

  return {
    winnerId,
    loserId,
    winnerSide,
    totalRounds: round - 1,
    durationMs: Date.now() - startTime,
    rounds,
    stateLog,
    finalHpA: combatantA.currentHp,
    finalHpB: combatantB.currentHp,
    playerWon,
  };
}
