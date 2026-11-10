import type { EnemyTypeId } from './enemyDefs';

/**
 * INIMIGOS DE ELITE (Parte 2.3). Nada de sprite novo: um elite é um inimigo comum que já existe em `enemySpawns.ts`
 * "promovido" depois de uma missão (mesmo sprite, maior, com aura dourada e coroa). Usa o mesmo motor de inimigos do mundo
 * (`EnemyManager`): mesma perseguição, mesmo golpe do jogador, mesmo respawn (mais lento), mesmos itens.
 * Regras (conferidas em tools/test-elites.mjs): vida e dano sempre maiores que o comum; a recompensa cresce mais que a vida
 * (vale o risco); cada elite fica sobre um ponto de spawn que existe de verdade.
 */
export interface EliteDef {
  id: string;
  /** Spawn que vira elite: [tipo, tileX, tileY] idêntico a uma linha de ENEMY_SPAWNS. */
  spawn: [EnemyTypeId, number, number];
  /** Missão que, ao terminar, faz o elite aparecer. */
  gate: string;
  /** Multiplicadores sobre o inimigo comum do mesmo spawn. */
  hp: number;
  dmg: number;
  speed: number;
  aggro: number;
  scale: number;
  /** Moedas e XP: multiplicam o que o comum daria. */
  coins: number;
  xp: number;
  /** Prêmio da 1ª derrota (item existente). */
  firstDrop: { id: string; n: number };
}

export const ELITES: EliteDef[] = [
  { id: 'elite_slime', spawn: ['slime', 770, 758], gate: 'kills_5', hp: 3.5, dmg: 1.5, speed: 1.15, aggro: 1.15, scale: 1.3, coins: 5, xp: 6, firstDrop: { id: 'potion_hp_l', n: 1 } },
  { id: 'elite_bat', spawn: ['bat', 900, 581], gate: 'kills_12', hp: 4, dmg: 1.6, speed: 1.15, aggro: 1.15, scale: 1.3, coins: 5, xp: 6, firstDrop: { id: 'potion_hp_l', n: 2 } },
  { id: 'elite_spider', spawn: ['spider', 1346, 1040], gate: 'camp_showdown', hp: 4.5, dmg: 1.7, speed: 1.1, aggro: 1.2, scale: 1.35, coins: 6, xp: 7, firstDrop: { id: 'power_brew', n: 1 } },
  { id: 'elite_shadow', spawn: ['shadow', 711, 189], gate: 'island_boss', hp: 5, dmg: 1.8, speed: 1.1, aggro: 1.2, scale: 1.35, coins: 6, xp: 8, firstDrop: { id: 'power_brew', n: 2 } },
  { id: 'elite_spider_2', spawn: ['spider', 1818, 1031], gate: 'lore_complete', hp: 5.5, dmg: 1.9, speed: 1.1, aggro: 1.25, scale: 1.4, coins: 7, xp: 9, firstDrop: { id: 'moon_elixir', n: 2 } },
  { id: 'elite_shadow_2', spawn: ['shadow', 175, 290], gate: 'vulcao_boss', hp: 6, dmg: 2, speed: 1.1, aggro: 1.25, scale: 1.4, coins: 8, xp: 10, firstDrop: { id: 'night_brew', n: 2 } },
];

export const ELITE_BY_ID: Record<string, EliteDef> = Object.fromEntries(ELITES.map((e) => [e.id, e]));
export const ELITE_RESPAWN_MULT = 3;

/** O elite que ocupa esse ponto de spawn, se houver. */
export function eliteAt(type: EnemyTypeId, tx: number, ty: number): EliteDef | null {
  return ELITES.find((e) => e.spawn[0] === type && e.spawn[1] === tx && e.spawn[2] === ty) ?? null;
}

export function isEliteOpen(def: EliteDef, isMissionDone: (id: string) => boolean): boolean {
  return isMissionDone(def.gate);
}
