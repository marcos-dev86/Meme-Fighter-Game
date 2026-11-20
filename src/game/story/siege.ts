import type { Difficulty } from '@/game/state/difficulty';

/**
 * CERCO DOS ORCS no acampamento: várias batalhas SEGUIDAS contra orcs para vencer a missão. A quantidade de ondas vem da
 * dificuldade do mundo (3 a 6). Perder uma batalha derrota o cerco (volta ao checkpoint e recomeça da onda 1); a vida do
 * jogador segue entre as ondas (vida persistente da história), então dá para se desgastar. Estado só da sessão: se fechar o
 * jogo no meio, o cerco recomeça (por isso não vai para o save). Módulo puro, testado em tools/test-acampamento.mjs.
 */
export const SIEGE_WAVES: Record<Difficulty, number> = { beginner: 3, easy: 3, medium: 4, hard: 5, hardcore: 6 };

export function siegeWavesFor(d: Difficulty): number {
  return SIEGE_WAVES[d] ?? 4;
}

export interface SiegeRun {
  questId: string;
  /** Onda em andamento (1 a total). */
  wave: number;
  total: number;
}

let run: SiegeRun | null = null;

export function getSiege(): SiegeRun | null {
  return run;
}

/** Começa o cerco na onda 1, com o número de ondas da dificuldade. */
export function startSiege(questId: string, d: Difficulty): SiegeRun {
  run = { questId, wave: 1, total: siegeWavesFor(d) };
  return { ...run };
}

export interface SiegeStep {
  /** O cerco acabou: todas as ondas vencidas. */
  done: boolean;
  /** Próxima onda (a mesma, se acabou). */
  wave: number;
  total: number;
}

/** O jogador venceu a onda atual. */
export function siegeWin(): SiegeStep {
  if (!run) return { done: true, wave: 1, total: 1 };
  if (run.wave >= run.total) {
    const out = { done: true, wave: run.wave, total: run.total };
    run = null;
    return out;
  }
  run = { ...run, wave: run.wave + 1 };
  return { done: false, wave: run.wave, total: run.total };
}

/** Perdeu ou desistiu: o cerco recomeça do zero na próxima vez. */
export function siegeLose() {
  run = null;
}

/**
 * Força dos orcs por onda: cada onda é um pouco mais forte, e a última é a do chefe orc (mais vida e dano). Valores baixos
 * de propósito: o desgaste vem de lutar várias vezes SEM curar, não de números absurdos.
 */
export function siegeWaveScale(wave: number, total: number): { hp: number; dmg: number; boss: boolean } {
  const t = total <= 1 ? 1 : (wave - 1) / (total - 1);
  const boss = wave >= total && total > 1;
  return { hp: 0.85 + 0.3 * t + (boss ? 0.35 : 0), dmg: 0.9 + 0.2 * t + (boss ? 0.2 : 0), boss };
}

// ---- O SOLDADO AJUDA ---------------------------------------------------------------------------------------------
/**
 * O Soldado do acampamento luta ao seu lado no cerco, de dois jeitos:
 *  1. APOIO NA LUTA: a partir da onda 2 ele arremessa uma lança no orc de tempos em tempos (a cada 9 s; 7 s na onda final).
 *     Cada lança tira 5% da vida do orc, mas NUNCA mata: o último golpe é sempre seu.
 *  2. ITENS ENTRE AS ONDAS: toda onda vencida rende uma Poção de Vida P do Soldado, e antes da onda final ele ainda passa uma
 *     Poção de Fúria. Assim o cerco desgasta, mas dá para se segurar.
 */
export const SIEGE_ALLY = { firstWave: 2, everyMs: 9000, finalEveryMs: 7000, damageFrac: 0.05 } as const;

/** Intervalo entre as lanças do Soldado nesta onda, ou 0 se ele ainda não ajuda. */
export function allyIntervalMs(wave: number, total: number): number {
  if (wave < SIEGE_ALLY.firstWave) return 0;
  return wave >= total ? SIEGE_ALLY.finalEveryMs : SIEGE_ALLY.everyMs;
}

/** Dano da lança, sem nunca deixar o orc com menos de 1 de vida. */
export function allySpearDamage(enemyMaxHp: number, enemyHp: number): number {
  return Math.max(0, Math.min(Math.max(4, enemyMaxHp * SIEGE_ALLY.damageFrac), enemyHp - 1));
}

/** Itens que o Soldado entrega por uma onda VENCIDA (`cleared` = a onda que acabou de ser vencida; `total` = ondas do cerco). */
export function allyGifts(cleared: number, total: number): Record<string, number> {
  const gifts: Record<string, number> = { potion_hp_s: 1 };
  if (cleared === total - 1) gifts.power_brew = 1; // antes da onda final
  return gifts;
}
