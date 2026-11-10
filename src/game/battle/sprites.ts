import type { CharacterKey } from './Fighter';
import { ASPECTS_V2, SOURCES_V2 } from './spritesV2';

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

/**
 * Quadros dos lutadores: SO os sprites novos (assets/sprites-v2, recortados das folhas do dono por tools/import_sheets.py e
 * registrados em spritesV2.ts). Os desenhos antigos (legacy-sprites) foram apagados.
 */
const SOURCES = SOURCES_V2 as Record<CharacterKey, Record<string, number>>;
export const SPRITE_ASPECTS = ASPECTS_V2 as Record<CharacterKey, Record<string, number>>;

/** Quadros alternativos quando o personagem nao tem aquele quadro (folha antiga nao traz hurt/ko/charge/cast). */
const POSE_FALLBACK: Record<string, string> = { cast: 'dash', walk5: 'walk1', walk4: 'walk1' };

export function hasPose(character: CharacterKey, poseKey: string): boolean {
  return SOURCES[character][poseKey] !== undefined;
}

/** Quadro que de fato existe para o personagem: o pedido, ou o alternativo, ou idle. */
export function resolvePose(character: CharacterKey, poseKey: string): string {
  if (hasPose(character, poseKey)) return poseKey;
  const alt = POSE_FALLBACK[poseKey];
  if (alt && hasPose(character, alt)) return alt;
  return 'idle';
}

/** Quadros do andar: os walkN que o personagem tem (minimo 3). */
export function walkFrames(character: CharacterKey): string[] {
  const n = [1, 2, 3, 4, 5].filter((i) => hasPose(character, `walk${i}`)).length;
  return Array.from({ length: Math.max(3, n) }, (_, i) => `walk${i + 1}`);
}

export function getSprite(character: CharacterKey, poseKey: string): number {
  return SOURCES[character][resolvePose(character, poseKey)];
}

export function getIdleAspect(character: CharacterKey): number {
  return SPRITE_ASPECTS[character].idle ?? 1;
}

/**
 * Proporção usada SÓ para dimensionar o lutador (altura de referência = drawWidth / proporção, ver
 * Fighter.getReferenceHeight). São as proporções do desenho original de cada lutador: mantêm todos com a MESMA altura em tela
 * de antes de os sprites novos entrarem. O sprite em si é desenhado com a proporção real do PNG (SPRITE_ASPECTS).
 * Os dragões ficam de fora: usam a proporção do próprio quadro idle (voo), ver V2_LAYOUT_FROM_IDLE.
 */
const LAYOUT_ASPECTS: Partial<Record<CharacterKey, number>> = {
  dogge: 146 / 164,
  gadigago: 237 / 359,
  orc: 27 / 23,
  soldier: 21 / 26,
  dogking: 110 / 118,
  tank: 124 / 122,
  ninja: 172 / 240,
  mystic: 158 / 300,
  cara_tranquilo: 134 / 235,
  troll_face: 170 / 337,
  sahur: 92 / 186,
  sahur_god: 170 / 216,
  sahur_evil: 160 / 224,
};

/**
 * Dragões: o quadro idle (voo) é bem mais largo que o desenho antigo; usar a proporção dele como referência mantém a PEGADA em
 * tela (largura visível = drawWidth, o hitbox e o alcance) igual à de antes; só a altura fica menor, porque o voo é mais achatado.
 */
const V2_LAYOUT_FROM_IDLE: CharacterKey[] = ['ice_dragon', 'green_dragon', 'shadow_dragon'];

export function getLayoutAspect(character: CharacterKey): number {
  if (V2_LAYOUT_FROM_IDLE.includes(character)) return SPRITE_ASPECTS[character].idle ?? 1;
  return LAYOUT_ASPECTS[character] ?? SPRITE_ASPECTS[character].idle ?? 1;
}
