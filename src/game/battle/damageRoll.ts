import type { AttackType } from './Fighter';

/**
 * Dano ALEATORIO por golpe e CRITICO (PURO: sem estado nem React, testavel no Node).
 *
 * Cada golpe causa o dano base do lutador variando de forma uniforme dentro de uma faixa:
 *   FLASH ±15%, FORTE ±10%, SUPER ±10% (ex.: dano base 10 no FLASH => 9 a 11, na pratica 8,5 a 11,5 antes de arredondar).
 * Depois sorteia o critico: todo lutador tem 5% de base (a arvore de habilidades e as armas afiadas somam por cima,
 * limite 90%) e o critico multiplica o dano por 1,75 (a arvore de habilidades pode somar a esse multiplicador).
 * A mesma conta vale para o jogador e para o oponente.
 */
export const DAMAGE_SPREAD: Record<AttackType, number> = { flash: 0.15, strong: 0.1, ultimate: 0.1 };
export const BASE_CRIT_CHANCE = 0.05;
export const BASE_CRIT_MULT = 1.75;
export const MAX_CRIT_CHANCE = 0.9;

export type Rng = () => number;

/** Multiplicador sorteado do golpe: de (1 - faixa) a (1 + faixa), uniforme. */
export function spreadMult(type: AttackType, rnd: Rng = Math.random): number {
  const s = DAMAGE_SPREAD[type] ?? 0;
  return 1 - s + 2 * s * rnd();
}

/** Menor e maior dano possiveis (sem critico) de um golpe com este dano base. */
export function damageRange(base: number, type: AttackType): { min: number; max: number } {
  const s = DAMAGE_SPREAD[type] ?? 0;
  return { min: base * (1 - s), max: base * (1 + s) };
}

export interface HitRoll {
  damage: number;
  crit: boolean;
}

/**
 * Dano final de UM acerto: base (ja com bonus de arma/status etc.) x faixa aleatoria x critico.
 * `critChance` ja deve conter tudo (base + habilidades + arma); aqui so se aplica o limite.
 */
export function rollHit(opts: { base: number; type: AttackType; critChance: number; critMult: number; rnd?: Rng }): HitRoll {
  const rnd = opts.rnd ?? Math.random;
  const chance = Math.max(0, Math.min(MAX_CRIT_CHANCE, opts.critChance));
  let damage = opts.base * spreadMult(opts.type, rnd);
  const crit = chance > 0 && rnd() < chance;
  if (crit) damage *= opts.critMult;
  return { damage, crit };
}
