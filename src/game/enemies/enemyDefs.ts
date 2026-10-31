import { BAT_FRAMES, SLIME_FRAMES, SPIDER, SHADOW_VARIANTS, type EnemySprite } from './enemySprites';

export type EnemyTypeId = 'bat' | 'slime' | 'spider' | 'shadow';

export interface EnemyDef {
  id: EnemyTypeId;
  name: string;
  hp: number;
  /** Contact damage at level 1. */
  damage: number;
  /** Walking speed, px/s (the player walks at 190). */
  speed: number;
  /** Starts chasing when the player is closer than this (px). */
  aggro: number;
  /** Collision size (px). */
  w: number;
  h: number;
  /** Bats fly over water and lava. */
  fly: boolean;
  /** On-screen size relative to the sprite's original pixel size. */
  scale: number;
  frameMs: number;
  coins: [number, number];
  /** XP at level 1 (scaled by the enemy level, see enemySim.ts). */
  xp: number;
  drops: { id: string; chance: number }[];
}

export const ENEMY_DEFS: Record<EnemyTypeId, EnemyDef> = {
  bat: {
    id: 'bat', name: 'Morcego', hp: 18, damage: 6, speed: 125, aggro: 270, w: 26, h: 20, fly: true, scale: 1.25, frameMs: 90,
    xp: 5, coins: [1, 3], drops: [{ id: 'mushroom', chance: 0.08 }],
  },
  slime: {
    id: 'slime', name: 'Slime', hp: 42, damage: 9, speed: 58, aggro: 210, w: 30, h: 22, fly: false, scale: 1.3, frameMs: 110,
    xp: 10, coins: [3, 6], drops: [{ id: 'strawberry', chance: 0.18 }, { id: 'milk', chance: 0.08 }],
  },
  spider: {
    id: 'spider', name: 'Aranha', hp: 30, damage: 8, speed: 150, aggro: 250, w: 28, h: 20, fly: false, scale: 1.3, frameMs: 130,
    xp: 8, coins: [2, 5], drops: [{ id: 'bread', chance: 0.1 }],
  },
  shadow: {
    id: 'shadow', name: 'Sombra', hp: 85, damage: 14, speed: 100, aggro: 300, w: 30, h: 40, fly: false, scale: 1.3, frameMs: 140,
    xp: 22, coins: [8, 14], drops: [{ id: 'potion_hp_s', chance: 0.2 }, { id: 'potion_en_s', chance: 0.15 }],
  },
};

/** The sprite a given enemy shows this animation tick. */
export function enemySprite(type: EnemyTypeId, variant: number, tick: number): EnemySprite {
  switch (type) {
    case 'bat':
      return BAT_FRAMES[tick % BAT_FRAMES.length];
    case 'slime':
      return SLIME_FRAMES[tick % SLIME_FRAMES.length];
    case 'spider':
      return SPIDER;
    default:
      return SHADOW_VARIANTS[variant % SHADOW_VARIANTS.length];
  }
}
