import { registerSaveExt } from './saveExt';
import { getLevel } from './playerState';
import type { StatusProc } from '@/game/battle/Fighter';

/**
 * The rival (Gadigago) comes back for rematches and grows stronger: each win
 * (and each level you gain) makes the next duel harder and better paid.
 */
let wins = 0;

export function getRivalWins() {
  return wins;
}
export function addRivalWin() {
  wins += 1;
}

/** Health / damage multipliers of the next rival duel. */
export function rivalScale(): { hp: number; dmg: number } {
  const lv = getLevel();
  return { hp: 1 + lv * 0.045 + wins * 0.12, dmg: 1 + lv * 0.02 + wins * 0.06 };
}

export function rivalReward(): { coins: number; xp: number } {
  return { coins: 40 + wins * 30, xp: 120 + wins * 80 + getLevel() * 6 };
}

/**
 * 5 APARIÇÕES ESPECIAIS do rival durante a história (Parte 2.2). Opcionais: nunca bloqueiam a missão principal. Cada uma abre quando
 * a missão-gatilho termina e só depois de vencer a anterior; fica mais forte a cada aparição, com o nível do jogador e com as
 * vitórias anteriores (`wins`), e traz mais status (congelar -> veneno -> atordoar -> queimar). A revanche livre (REVANCHE) continua
 * existindo depois das 5 e segue usando `rivalScale()`.
 */
export interface RivalEncounter {
  /** 1..5 */
  n: number;
  /** Missão que precisa estar concluída para o rival aparecer. */
  gate: string;
  stageKey: string;
  /** Multiplicadores-base de vida e dano (antes do nível e das vitórias). */
  hp: number;
  dmg: number;
  procs: StatusProc[];
  reward: { coins: number; xp: number; items?: Record<string, number> };
}

export const RIVAL_ENCOUNTERS: RivalEncounter[] = [
  { n: 1, gate: 'kills_12', stageKey: 'stage_1', hp: 1.1, dmg: 1.0, procs: [{ kind: 'freeze', chance: 0.2, ms: 2000, on: ['flash'] }], reward: { coins: 120, xp: 300 } },
  { n: 2, gate: 'camp_showdown', stageKey: 'stage_3', hp: 1.35, dmg: 1.12, procs: [{ kind: 'freeze', chance: 0.22, ms: 2200, on: ['flash'] }, { kind: 'poison', chance: 0.25, ms: 5000, on: ['strong'] }], reward: { coins: 220, xp: 520, items: { potion_hp_l: 1 } } },
  { n: 3, gate: 'island_boss', stageKey: 'stage_5', hp: 1.6, dmg: 1.25, procs: [{ kind: 'freeze', chance: 0.24, ms: 2400, on: ['flash'] }, { kind: 'poison', chance: 0.3, ms: 5500, on: ['strong'] }, { kind: 'stun', chance: 0.15, ms: 900, on: ['strong'] }], reward: { coins: 340, xp: 800, items: { power_brew: 1 } } },
  { n: 4, gate: 'lore_complete', stageKey: 'stage_7', hp: 1.8, dmg: 1.38, procs: [{ kind: 'freeze', chance: 0.25, ms: 2500, on: ['flash'] }, { kind: 'poison', chance: 0.3, ms: 6000, on: ['strong'] }, { kind: 'stun', chance: 0.18, ms: 1000, on: ['strong'] }, { kind: 'burn', chance: 0.25, ms: 4000, on: ['flash'] }], reward: { coins: 480, xp: 1100, items: { potion_hp_l: 2 } } },
  { n: 5, gate: 'vulcao_boss', stageKey: 'stage_4', hp: 2.0, dmg: 1.5, procs: [{ kind: 'freeze', chance: 0.28, ms: 2600, on: ['flash'] }, { kind: 'poison', chance: 0.32, ms: 6500, on: ['strong'] }, { kind: 'stun', chance: 0.2, ms: 1100, on: ['strong'] }, { kind: 'burn', chance: 0.3, ms: 4500, on: ['flash', 'strong'] }, { kind: 'burn', chance: 1, ms: 6000, on: ['ultimate'] }], reward: { coins: 700, xp: 1600, items: { power_brew: 2 } } },
];

export const RIVAL_HP_CAP = 5;
export const RIVAL_DMG_CAP = 2.4;

let defeatedEnc = new Set<number>();

export function getRivalEncounterParam(n: number): string {
  return `r${n}`;
}
export function rivalEncounterFromParam(p: string | undefined): RivalEncounter | null {
  const m = /^r([1-5])$/.exec(p ?? '');
  return m ? RIVAL_ENCOUNTERS[Number(m[1]) - 1] : null;
}
export function isRivalEncounterDefeated(n: number): boolean {
  return defeatedEnc.has(n);
}
export function rivalEncountersDefeated(): number {
  return defeatedEnc.size;
}
export function markRivalEncounterDefeated(n: number): boolean {
  if (defeatedEnc.has(n)) return false;
  defeatedEnc = new Set(defeatedEnc).add(n);
  return true;
}

/** A próxima aparição liberada (a primeira que falta vencer, se a missão-gatilho já terminou); null se nenhuma. */
export function nextRivalEncounter(isDone: (missionId: string) => boolean): RivalEncounter | null {
  const e = RIVAL_ENCOUNTERS.find((x) => !defeatedEnc.has(x.n));
  return e && isDone(e.gate) ? e : null;
}

/** Força da aparição: base do degrau x nível do jogador x vitórias anteriores, com teto (nunca fica impossível). */
export function rivalEncounterScale(enc: RivalEncounter, level: number = getLevel(), previousWins: number = wins): { hp: number; dmg: number } {
  const hp = enc.hp * (1 + 0.025 * level) * (1 + 0.04 * previousWins);
  const dmg = enc.dmg * (1 + 0.01 * level) * (1 + 0.02 * previousWins);
  return { hp: Math.min(RIVAL_HP_CAP, hp), dmg: Math.min(RIVAL_DMG_CAP, dmg) };
}

export function rivalEncounterReward(enc: RivalEncounter): { coins: number; xp: number; items?: Record<string, number> } {
  return { coins: enc.reward.coins + wins * 10, xp: enc.reward.xp + getLevel() * 6, items: enc.reward.items };
}

registerSaveExt({
  key: 'rival',
  snapshot: () => ({ wins, encounters: [...defeatedEnc] }),
  restore: (d) => {
    const x = d as { wins?: number; encounters?: unknown } | undefined;
    const w = x?.wins;
    wins = typeof w === 'number' && w >= 0 ? Math.floor(w) : 0;
    // Saves antigos não têm `encounters`: começam sem nenhuma aparição vencida (padrão seguro).
    defeatedEnc = new Set(Array.isArray(x?.encounters) ? (x!.encounters as unknown[]).filter((n): n is number => typeof n === 'number' && n >= 1 && n <= RIVAL_ENCOUNTERS.length) : []);
  },
  reset: () => {
    wins = 0;
    defeatedEnc = new Set();
  },
});
