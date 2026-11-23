import type { SceneKey } from './sceneArt';

/* eslint-disable @typescript-eslint/no-require-imports */
export const SCENE_IMAGES: Record<SceneKey, number> = {
  lava: require('../../../assets/scenes/scene_lava.webp'),
  ice: require('../../../assets/scenes/scene_ice.webp'),
  shadow: require('../../../assets/scenes/scene_shadow.webp'),
  tree: require('../../../assets/scenes/scene_tree.webp'),
  sunset: require('../../../assets/scenes/scene_sunset.webp'),
  trio: require('../../../assets/scenes/scene_trio.webp'),
  battle: require('../../../assets/scenes/scene_battle.webp'),
  city: require('../../../assets/scenes/scene_city.webp'),
  casino: require('../../../assets/scenes/scene_casino.webp'),
  cave: require('../../../assets/scenes/scene_cave.webp'),
  forest: require('../../../assets/scenes/scene_forest.webp'),
  duel: require('../../../assets/scenes/scene_duel.webp'),
  sea: require('../../../assets/scenes/scene_sea.webp'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

/* eslint-disable @typescript-eslint/no-require-imports */
/** Mares gerados (fundos das cutscenes submarinas). */
export const SEA_BG_IMAGES: Record<string, number> = {
  sea_abyss: require('../../../assets/scenes/bg_sea_abyss.webp'),
  sea_atlantis: require('../../../assets/scenes/bg_sea_atlantis.webp'),
  sea_open: require('../../../assets/scenes/bg_sea_open.webp'),
  sea_reef: require('../../../assets/scenes/bg_sea_reef.webp'),
  sea_ruins: require('../../../assets/scenes/bg_sea_ruins.webp'),
  sea_warm: require('../../../assets/scenes/bg_sea_warm.webp'),
  sea_wreck: require('../../../assets/scenes/bg_sea_wreck.webp'),
};
/* eslint-enable @typescript-eslint/no-require-imports */
