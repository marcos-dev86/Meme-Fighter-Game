import { createFighter, type CharacterKey } from '@/game/battle/Fighter';

/**
 * PREÇO EM DIAMANTES de cada lutador do VERSUS, calculado dos atributos reais de luta (createFighter).
 * Nota de força = vida x 0,5 + dano médio x 2,2 + velocidade x 6 + 4 por status que aplica + 3 se tem imunidade.
 * A nota é esticada linearmente entre duas âncoras fixas: o mais fraco do elenco original (Orc) = 30 💎 e o mais
 * forte (Dragão Sombrio) = 150 💎. Âncoras fixas (e não "min/max do elenco atual") para que um lutador novo e mais
 * forte passe de 150 sem mexer no preço de ninguém. O resultado é arredondado de 5 em 5 e nunca fica abaixo de 30.
 */
export interface PriceRaw {
  health: number;
  speed: number;
  /** média de FLASH, FORTE e SUPER */
  avgDamage: number;
  /** quantos status ele aplica com os golpes */
  procs: number;
  immune: number;
}

export const PRICE_MIN = 30;
export const PRICE_MAX = 150;
/** Nota do Orc e do Dragão Sombrio (ver cálculo acima). */
export const RATING_MIN = 93.97;
export const RATING_MAX = 197.33;

export function fighterRating(r: PriceRaw): number {
  return r.health * 0.5 + r.avgDamage * 2.2 + r.speed * 6 + r.procs * 4 + (r.immune > 0 ? 3 : 0);
}

export function priceFromRaw(r: PriceRaw): number {
  const p = PRICE_MIN + ((fighterRating(r) - RATING_MIN) / (RATING_MAX - RATING_MIN)) * (PRICE_MAX - PRICE_MIN);
  return Math.max(PRICE_MIN, Math.round(p / 5) * 5);
}

const cache: Partial<Record<CharacterKey, number>> = {};

/** Preço em diamantes para comprar o lutador depois de liberá-lo. */
export function fighterPrice(key: CharacterKey): number {
  const hit = cache[key];
  if (hit !== undefined) return hit;
  const f = createFighter(key, 1);
  const price = priceFromRaw({
    health: f.maxHealth,
    speed: f.speed,
    avgDamage: (f.flashDamage + f.strongDamage + f.ultimateDamage) / 3,
    procs: f.onHitStatus.length,
    immune: f.immune.length,
  });
  cache[key] = price;
  return price;
}
