import type { AmbientKey } from './audioAssets';
import type { Weather } from '@/game/state/weatherState';
import type { InteriorTemplate } from '@/game/world/buildingContent';

/**
 * Mistura dos sons ambiente por região (Parte 3.1). Função PURA: dado o contexto do mundo devolve o nível alvo (0..1) de
 * cada loop. O audioManager faz a suavização (cross-fade) e aplica o volume AMBIENTE; aqui só se decide QUEM toca.
 *
 * Regras (testadas em tools/test-ambient.mjs):
 *  - no máximo UMA "cama" regional (pássaros, grilos, caverna, vulcão, cassino, loja, casa) + UMA camada de clima/água
 *    (chuva, vento ou ondas): nunca mais de dois loops ao mesmo tempo;
 *  - floresta: pássaros de dia, grilos de noite; chuva/tempestade calam os bichos;
 *  - caverna / subsolo: pingos e eco, sem clima; vulcão: ronco grave; gelo: vento; cassino e interiores têm ambiente próprio;
 *  - dentro de casa a chuva só chega abafada; vento e ondas não entram em interiores.
 */
export type InteriorKind = 'shop' | 'home' | 'cave' | 'casino';

export interface AmbientCtx {
  island: string | null;
  /** Tipo do interior onde o jogador está (null = ao ar livre). */
  interior: InteriorKind | null;
  sailing: boolean;
  night: boolean;
  weather: Weather;
  /** Quanto de água há em volta (0..0.7), já calculado pelo mundo. Ignorado em interiores. */
  water: number;
}

export type AmbientMix = Record<AmbientKey, number>;

export const ALL_AMBIENTS: readonly AmbientKey[] = ['birds', 'crickets', 'cave', 'volcano', 'casino', 'shop', 'home', 'rain', 'wind', 'waves'];
export const BED_KEYS: readonly AmbientKey[] = ['birds', 'crickets', 'cave', 'volcano', 'casino', 'shop', 'home'];
export const LAYER_KEYS: readonly AmbientKey[] = ['rain', 'wind', 'waves'];

const FOREST_ISLANDS = new Set(['main', 'main_west', 'misteriosa', 'fragments', 'camp', 'dogisland']);

/** Qual interior é este prédio? (cassino e caverna têm id próprio; o resto vem do modelo do cômodo). */
export function interiorKindOf(buildingId: string | null, template: InteriorTemplate | null | undefined, casinoId: string): InteriorKind | null {
  if (!buildingId) return null;
  if (buildingId === casinoId || template === 'casino') return 'casino';
  if (buildingId === 'caverna' || template === 'basement') return 'cave';
  if (template === 'cozyHome' || template === 'humbleHome' || template === 'loft') return 'home';
  return 'shop'; // lojas, guilda e salões: movimento de gente
}

export function emptyMix(): AmbientMix {
  const m = {} as AmbientMix;
  for (const k of ALL_AMBIENTS) m[k] = 0;
  return m;
}

const BED_BY_INTERIOR: Record<InteriorKind, AmbientKey> = { shop: 'shop', home: 'home', cave: 'cave', casino: 'casino' };

export function ambientMix(ctx: AmbientCtx): AmbientMix {
  const mix = emptyMix();
  const w = ctx.weather;
  const rainy = w === 'rain' || w === 'storm';
  const inside = ctx.interior !== null;

  // ---- cama regional (exclusiva)
  let bed: AmbientKey | null = null;
  let bedLevel = 0;
  if (inside) {
    bed = BED_BY_INTERIOR[ctx.interior as InteriorKind];
    bedLevel = ctx.interior === 'casino' ? 0.8 : ctx.interior === 'cave' ? 0.9 : 0.7;
  } else if (!ctx.sailing) {
    const isl = ctx.island ?? 'main';
    if (FOREST_ISLANDS.has(isl)) {
      if (!rainy && w !== 'blizzard' && w !== 'ash') {
        bed = ctx.night ? 'crickets' : 'birds';
        bedLevel = ctx.night ? 0.6 : 0.7;
        if (w === 'fog') bedLevel *= 0.6;
      }
    } else if (isl === 'vulcao') {
      bed = 'volcano';
      bedLevel = w === 'ash' ? 0.9 : 0.75;
    }
    // gelo e trevas: o vento é a própria ambientação (camada abaixo).
  }

  // ---- camada de clima / água (exclusiva: a mais forte vence)
  const layers: Partial<Record<AmbientKey, number>> = {};
  if (ctx.interior !== 'cave' && ctx.interior !== 'casino') {
    if (rainy) layers.rain = (w === 'storm' ? 1 : 0.62) * (inside ? 0.22 : 1);
  }
  if (!inside) {
    const wind = w === 'blizzard' ? 1 : w === 'storm' ? 0.5 : w === 'snow' ? 0.35 : w === 'ash' ? 0.3 : w === 'fog' ? 0.15 : 0;
    const isl = ctx.island ?? 'main';
    const base = !ctx.sailing && isl === 'gelo' ? 0.4 : !ctx.sailing && isl === 'trevas' ? 0.25 : 0;
    const level = Math.max(wind, base);
    if (level > 0) layers.wind = level;
    const waves = ctx.sailing ? 0.85 : ctx.water;
    if (waves > 0) layers.waves = Math.min(1, waves);
  }
  let layer: AmbientKey | null = null;
  let layerLevel = 0;
  for (const k of LAYER_KEYS) {
    const v = layers[k] ?? 0;
    if (v > layerLevel) {
      layer = k;
      layerLevel = v;
    }
  }

  // uma camada forte abafa a cama (nunca mais de dois loops audíveis)
  if (bed && layer && layerLevel >= 0.6 && !inside) bedLevel *= 0.45;
  if (bed) mix[bed] = bedLevel;
  if (layer) mix[layer] = layerLevel;
  return mix;
}
