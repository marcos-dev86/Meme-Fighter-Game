/**
 * Enemy art from the user's pack (RpgEnemies1 + the dark-characters sheet),
 * cropped and upscaled 4x with nearest-neighbour. `w`/`h` are the original
 * pixel size so the in-game size is a plain multiple of it.
 */
export interface EnemySprite {
  src: number;
  w: number;
  h: number;
}

export const BAT_FRAMES: EnemySprite[] = [
  { src: require('../../../assets/enemies/bat_0.png'), w: 37, h: 29 },
  { src: require('../../../assets/enemies/bat_1.png'), w: 37, h: 29 },
  { src: require('../../../assets/enemies/bat_2.png'), w: 37, h: 29 },
  { src: require('../../../assets/enemies/bat_3.png'), w: 37, h: 29 },
  { src: require('../../../assets/enemies/bat_4.png'), w: 37, h: 29 },
  { src: require('../../../assets/enemies/bat_5.png'), w: 37, h: 29 },
  { src: require('../../../assets/enemies/bat_6.png'), w: 37, h: 29 },
  { src: require('../../../assets/enemies/bat_7.png'), w: 37, h: 29 },
  { src: require('../../../assets/enemies/bat_8.png'), w: 37, h: 29 },
  { src: require('../../../assets/enemies/bat_9.png'), w: 37, h: 29 },
];

export const SLIME_FRAMES: EnemySprite[] = [
  { src: require('../../../assets/enemies/slime_0.png'), w: 38, h: 24 },
  { src: require('../../../assets/enemies/slime_1.png'), w: 38, h: 24 },
  { src: require('../../../assets/enemies/slime_2.png'), w: 38, h: 24 },
  { src: require('../../../assets/enemies/slime_3.png'), w: 38, h: 24 },
  { src: require('../../../assets/enemies/slime_4.png'), w: 38, h: 24 },
  { src: require('../../../assets/enemies/slime_5.png'), w: 38, h: 24 },
  { src: require('../../../assets/enemies/slime_6.png'), w: 38, h: 24 },
  { src: require('../../../assets/enemies/slime_7.png'), w: 38, h: 24 },
  { src: require('../../../assets/enemies/slime_8.png'), w: 38, h: 24 },
  { src: require('../../../assets/enemies/slime_9.png'), w: 38, h: 24 },
];

export const SPIDER: EnemySprite = { src: require('../../../assets/enemies/spider.png'), w: 31, h: 24 };

/** Variants of the shadow enemy (picked per spawn point). */
export const SHADOW_VARIANTS: EnemySprite[] = [
  { src: require('../../../assets/enemies/dark_00.png'), w: 27, h: 46 },
  { src: require('../../../assets/enemies/dark_02.png'), w: 34, h: 50 },
  { src: require('../../../assets/enemies/dark_04.png'), w: 40, h: 50 },
  { src: require('../../../assets/enemies/dark_05.png'), w: 27, h: 46 },
  { src: require('../../../assets/enemies/dark_06.png'), w: 33, h: 58 },
  { src: require('../../../assets/enemies/dark_09.png'), w: 42, h: 48 },
  { src: require('../../../assets/enemies/dark_10.png'), w: 28, h: 45 },
  { src: require('../../../assets/enemies/dark_11.png'), w: 48, h: 41 },
];
