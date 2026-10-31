/**
 * Difficulty levels (INICIANTE / FÁCIL / MÉDIO / DIFÍCIL / HARDCORE).
 *  - Quick fight vs CPU: picked on its own step BEFORE character select.
 *  - Story mode: picked when the world is created (see saveState.ts /
 *    SaveSlotsScreen) and stored with that save.
 * It only changes the CPU opponent (its reaction speed, how often it
 * shields/attacks, its health and damage) and the story coin rewards -
 * the player's own stats never change.
 */
export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'hardcore';

export const DIFFICULTIES: Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'hardcore'];

export interface DifficultyParams {
  /** CPU decision interval (ms): lower = reacts faster. */
  reactMin: number;
  reactMax: number;
  /** Chance per frame-check to raise the shield when the player attacks. */
  shieldChance: number;
  /** Chance that a decision at close range is an attack (vs. moving). */
  attackChance: number;
  /** Chance to use a full-energy ultimate when in range. */
  ultChance: number;
  /** Farms aura (charges energy) when the player is far away. */
  farmsAura: boolean;
  /** Multipliers on the CPU fighter. */
  cpuHealth: number;
  cpuDamage: number;
  /** Multiplier on story quest coin rewards. */
  color: string;
}

export const DIFFICULTY_PARAMS: Record<Difficulty, DifficultyParams> = {
  beginner: { reactMin: 800, reactMax: 1300, shieldChance: 0.05, attackChance: 0.35, ultChance: 0.4, farmsAura: false, cpuHealth: 0.7, cpuDamage: 0.6, color: '#8BC34A' },
  easy: { reactMin: 550, reactMax: 900, shieldChance: 0.18, attackChance: 0.55, ultChance: 0.7, farmsAura: false, cpuHealth: 0.85, cpuDamage: 0.8, color: '#26C6DA' },
  medium: { reactMin: 300, reactMax: 600, shieldChance: 0.35, attackChance: 0.7, ultChance: 1, farmsAura: false, cpuHealth: 1, cpuDamage: 1, color: '#FFD700' },
  hard: { reactMin: 200, reactMax: 420, shieldChance: 0.5, attackChance: 0.85, ultChance: 1, farmsAura: true, cpuHealth: 1.2, cpuDamage: 1.15, color: '#FF7A00' },
  hardcore: { reactMin: 110, reactMax: 260, shieldChance: 0.72, attackChance: 0.95, ultChance: 1, farmsAura: true, cpuHealth: 1.5, cpuDamage: 1.4, color: '#E23C14' },
};

export function isDifficulty(v: unknown): v is Difficulty {
  return typeof v === 'string' && (DIFFICULTIES as string[]).includes(v);
}

// The difficulty of the story world currently loaded (set by the save-slot
// flow; WorldScreen/BattleScreen read it for quest fights).
let storyDifficulty: Difficulty = 'medium';
export function getStoryDifficulty(): Difficulty {
  return storyDifficulty;
}
export function setStoryDifficulty(d: Difficulty) {
  storyDifficulty = d;
}
