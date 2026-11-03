import type { CharacterKey } from './Fighter';

/**
 * Sprite registry + aspect ratios for feet-anchored rendering (see
 * docs/AUDIT.md: this is what fixed the Gadigago-floating bug).
 *
 * v1 of this file computed aspect ratios at runtime via
 * Image.resolveAssetSource(). That works fine in a normal RN runtime, but
 * Expo Router's web build also evaluates every module during a Node.js
 * SSR pass (resolver.environment=node) to statically render each route : 
 * and in that Node context Image.resolveAssetSource doesn't exist at all,
 * which crashed the app with "Image.default.resolveAssetSource is not a
 * function" before a single screen ever rendered. Bundling successfully
 * (what I'd verified before) doesn't catch this, because the bundle is
 * only actually *evaluated*: including this module-load-time call: when
 * the server tries to render a page with it.
 *
 * Fix: don't ask the runtime for image dimensions at all. The real pixel
 * sizes were checked directly against the actual PNGs (PIL, not memory or
 * a guess) and hardcoded below. This is also just more correct than a
 * runtime lookup: these images never change size, so there's nothing to
 * compute.
 */

const SOURCES: Record<CharacterKey, Record<string, number>> = {
  dogge: {
    idle: require('../../../assets/legacy-sprites/dogge/idle.png'),
    walk1: require('../../../assets/legacy-sprites/dogge/walk1.png'),
    walk2: require('../../../assets/legacy-sprites/dogge/walk2.png'),
    walk3: require('../../../assets/legacy-sprites/dogge/walk3.png'),
    dash: require('../../../assets/legacy-sprites/dogge/dash.png'),
    flash: require('../../../assets/legacy-sprites/dogge/flash.png'),
    strong: require('../../../assets/legacy-sprites/dogge/strong.png'),
    ult: require('../../../assets/legacy-sprites/dogge/ult.png'),
  },
  gadigago: {
    idle: require('../../../assets/legacy-sprites/gadigago/idle.png'),
    walk1: require('../../../assets/legacy-sprites/gadigago/walk1.png'),
    walk2: require('../../../assets/legacy-sprites/gadigago/walk2.png'),
    walk3: require('../../../assets/legacy-sprites/gadigago/walk3.png'),
    dash: require('../../../assets/legacy-sprites/gadigago/dash.png'),
    flash: require('../../../assets/legacy-sprites/gadigago/flash.png'),
    strong: require('../../../assets/legacy-sprites/gadigago/strong.png'),
    ult: require('../../../assets/legacy-sprites/gadigago/ult.png'),
  },
  orc: {
    idle: require('../../../assets/legacy-sprites/orc/idle.png'),
    walk1: require('../../../assets/legacy-sprites/orc/walk1.png'),
    walk2: require('../../../assets/legacy-sprites/orc/walk2.png'),
    walk3: require('../../../assets/legacy-sprites/orc/walk3.png'),
    dash: require('../../../assets/legacy-sprites/orc/dash.png'),
    flash: require('../../../assets/legacy-sprites/orc/flash.png'),
    strong: require('../../../assets/legacy-sprites/orc/strong.png'),
    ult: require('../../../assets/legacy-sprites/orc/ult.png'),
  },
  soldier: {
    idle: require('../../../assets/legacy-sprites/soldier/idle.png'),
    walk1: require('../../../assets/legacy-sprites/soldier/walk1.png'),
    walk2: require('../../../assets/legacy-sprites/soldier/walk2.png'),
    walk3: require('../../../assets/legacy-sprites/soldier/walk3.png'),
    dash: require('../../../assets/legacy-sprites/soldier/dash.png'),
    flash: require('../../../assets/legacy-sprites/soldier/flash.png'),
    strong: require('../../../assets/legacy-sprites/soldier/strong.png'),
    ult: require('../../../assets/legacy-sprites/soldier/ult.png'),
  },
  dogking: {
    idle: require('../../../assets/legacy-sprites/dogking/idle.png'),
    walk1: require('../../../assets/legacy-sprites/dogking/walk1.png'),
    walk2: require('../../../assets/legacy-sprites/dogking/walk2.png'),
    walk3: require('../../../assets/legacy-sprites/dogking/walk3.png'),
    dash: require('../../../assets/legacy-sprites/dogking/dash.png'),
    flash: require('../../../assets/legacy-sprites/dogking/flash.png'),
    strong: require('../../../assets/legacy-sprites/dogking/strong.png'),
    ult: require('../../../assets/legacy-sprites/dogking/ult.png'),
  },
  tank: {
    idle: require('../../../assets/legacy-sprites/tank_fighter/idle.png'),
    walk1: require('../../../assets/legacy-sprites/tank_fighter/walk1.png'),
    walk2: require('../../../assets/legacy-sprites/tank_fighter/walk2.png'),
    walk3: require('../../../assets/legacy-sprites/tank_fighter/walk3.png'),
    dash: require('../../../assets/legacy-sprites/tank_fighter/dash.png'),
    flash: require('../../../assets/legacy-sprites/tank_fighter/flash.png'),
    strong: require('../../../assets/legacy-sprites/tank_fighter/strong.png'),
    ult: require('../../../assets/legacy-sprites/tank_fighter/ult.png'),
  },
  shadow_dragon: {
    idle: require('../../../assets/legacy-sprites/shadow_dragon/idle.png'),
    walk1: require('../../../assets/legacy-sprites/shadow_dragon/walk1.png'),
    walk2: require('../../../assets/legacy-sprites/shadow_dragon/walk2.png'),
    walk3: require('../../../assets/legacy-sprites/shadow_dragon/walk3.png'),
    dash: require('../../../assets/legacy-sprites/shadow_dragon/dash.png'),
    flash: require('../../../assets/legacy-sprites/shadow_dragon/flash.png'),
    strong: require('../../../assets/legacy-sprites/shadow_dragon/strong.png'),
    ult: require('../../../assets/legacy-sprites/shadow_dragon/ult.png'),
  },
  green_dragon: {
    idle: require('../../../assets/legacy-sprites/green_dragon/idle.png'),
    walk1: require('../../../assets/legacy-sprites/green_dragon/walk1.png'),
    walk2: require('../../../assets/legacy-sprites/green_dragon/walk2.png'),
    walk3: require('../../../assets/legacy-sprites/green_dragon/walk3.png'),
    dash: require('../../../assets/legacy-sprites/green_dragon/dash.png'),
    flash: require('../../../assets/legacy-sprites/green_dragon/flash.png'),
    strong: require('../../../assets/legacy-sprites/green_dragon/strong.png'),
    ult: require('../../../assets/legacy-sprites/green_dragon/ult.png'),
  },
  ice_dragon: {
    idle: require('../../../assets/legacy-sprites/ice_dragon/idle.png'),
    walk1: require('../../../assets/legacy-sprites/ice_dragon/walk1.png'),
    walk2: require('../../../assets/legacy-sprites/ice_dragon/walk2.png'),
    walk3: require('../../../assets/legacy-sprites/ice_dragon/walk3.png'),
    dash: require('../../../assets/legacy-sprites/ice_dragon/dash.png'),
    flash: require('../../../assets/legacy-sprites/ice_dragon/flash.png'),
    strong: require('../../../assets/legacy-sprites/ice_dragon/strong.png'),
    ult: require('../../../assets/legacy-sprites/ice_dragon/ult.png'),
  },
  ninja: {
    idle: require('../../../assets/legacy-sprites/ninja/idle.png'),
    walk1: require('../../../assets/legacy-sprites/ninja/walk1.png'),
    walk2: require('../../../assets/legacy-sprites/ninja/walk2.png'),
    walk3: require('../../../assets/legacy-sprites/ninja/walk3.png'),
    dash: require('../../../assets/legacy-sprites/ninja/dash.png'),
    flash: require('../../../assets/legacy-sprites/ninja/flash.png'),
    strong: require('../../../assets/legacy-sprites/ninja/strong.png'),
    ult: require('../../../assets/legacy-sprites/ninja/ult.png'),
  },
  mystic: {
    idle: require('../../../assets/legacy-sprites/mystic/idle.png'),
    walk1: require('../../../assets/legacy-sprites/mystic/walk1.png'),
    walk2: require('../../../assets/legacy-sprites/mystic/walk2.png'),
    walk3: require('../../../assets/legacy-sprites/mystic/walk3.png'),
    dash: require('../../../assets/legacy-sprites/mystic/dash.png'),
    flash: require('../../../assets/legacy-sprites/mystic/flash.png'),
    strong: require('../../../assets/legacy-sprites/mystic/strong.png'),
    ult: require('../../../assets/legacy-sprites/mystic/ult.png'),
  },
};

// width/height, verified directly against the PNG files (assets/sprite/*/*.png), not estimated.
export const SPRITE_ASPECTS: Record<CharacterKey, Record<string, number>> = {
  dogge: {
    idle: 146 / 164,
    walk1: 140 / 159,
    walk2: 137 / 164,
    walk3: 143 / 164,
    dash: 149 / 156,
    flash: 143 / 156,
    strong: 157 / 158,
    ult: 488 / 242,
  },
  gadigago: {
    idle: 237 / 359,
    walk1: 83 / 146,
    walk2: 55 / 143,
    walk3: 72 / 116,
    dash: 101 / 113,
    flash: 85 / 124,
    strong: 92 / 112,
    ult: 364 / 346,
  },
  // Sliced from the medieval villain pack (see docs/AUDIT.md) - measured
  // straight from the saved PNGs the same way as above, not estimated.
  orc: {
    idle: 304 / 248,
    walk1: 304 / 248,
    walk2: 304 / 248,
    walk3: 304 / 248,
    dash: 304 / 248,
    flash: 304 / 248,
    strong: 304 / 248,
    ult: 450 / 420,
  },
  soldier: {
    idle: 304 / 268,
    walk1: 304 / 268,
    walk2: 304 / 268,
    walk3: 304 / 268,
    dash: 304 / 268,
    flash: 304 / 268,
    strong: 304 / 268,
    ult: 286 / 319,
  },
  // Sliced from the "evil dog family" pack, upscaled 4x with nearest-
  // neighbour so the boss reads as deliberately chunky retro pixel art
  // instead of a blurry tiny sprite.
  dogking: {
    idle: 112 / 136,
    walk1: 192 / 136,
    walk2: 192 / 136,
    walk3: 192 / 136,
    dash: 192 / 136,
    flash: 152 / 136,
    strong: 264 / 136,
    ult: 336 / 324,
  },
  tank: {
    idle: 120 / 148,
    walk1: 120 / 148,
    walk2: 120 / 148,
    walk3: 120 / 148,
    dash: 208 / 148,
    flash: 120 / 148,
    strong: 304 / 148,
    ult: 465 / 420,
  },
  shadow_dragon: {
    idle: 576 / 416,
    walk1: 576 / 416,
    walk2: 576 / 416,
    walk3: 576 / 416,
    dash: 576 / 416,
    flash: 576 / 416,
    strong: 576 / 416,
    ult: 418 / 297,
  },
  green_dragon: {
    idle: 178 / 202,
    walk1: 178 / 202,
    walk2: 178 / 202,
    walk3: 178 / 202,
    dash: 428 / 202,
    flash: 178 / 202,
    strong: 270 / 202,
    ult: 418 / 297,
  },
  ice_dragon: {
    idle: 178 / 202,
    walk1: 178 / 202,
    walk2: 178 / 202,
    walk3: 178 / 202,
    dash: 428 / 202,
    flash: 178 / 202,
    strong: 270 / 202,
    ult: 418 / 297,
  },
  ninja: {
    idle: 108 / 184,
    walk1: 144 / 184,
    walk2: 108 / 184,
    walk3: 134 / 184,
    dash: 272 / 184,
    flash: 216 / 184,
    strong: 324 / 184,
    ult: 418 / 297,
  },
  mystic: {
    idle: 228 / 270,
    walk1: 228 / 270,
    walk2: 228 / 270,
    walk3: 228 / 270,
    dash: 228 / 270,
    flash: 228 / 270,
    strong: 228 / 270,
    ult: 418 / 297,
  },
};

export function getSprite(character: CharacterKey, poseKey: string): number {
  return SOURCES[character][poseKey] ?? SOURCES[character].idle;
}

export function getIdleAspect(character: CharacterKey): number {
  return SPRITE_ASPECTS[character].idle ?? 1;
}

/**
 * Proporção usada SÓ para dimensionar o lutador (altura de referência = drawWidth / proporção, ver
 * Fighter.getReferenceHeight). Quando a pasta legacy-sprites foi recriada (tools/make_legacy_sprites.py) os quadros
 * ganharam recortes diferentes dos originais; estes valores são os do desenho original e mantêm cada lutador com a
 * MESMA altura em tela de antes. O sprite em si continua sendo desenhado com a proporção real do PNG (SPRITE_ASPECTS).
 * Dogge e Gadigago não entram: os quadros deles são os originais.
 */
const LAYOUT_ASPECTS: Partial<Record<CharacterKey, number>> = {
  orc: 27 / 23,
  soldier: 21 / 26,
  dogking: 110 / 118,
  tank: 124 / 122,
  ninja: 172 / 240,
  mystic: 158 / 300,
};

export function getLayoutAspect(character: CharacterKey): number {
  return LAYOUT_ASPECTS[character] ?? getIdleAspect(character);
}
