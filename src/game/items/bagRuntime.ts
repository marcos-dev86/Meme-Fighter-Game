import type { BagEffects } from './bags';

/** The equipped bag's effects, kept in a tiny module so itemDefs/playerState can both read them without importing each other. */
export const NEUTRAL_EFFECTS: BagEffects = { coinMult: 1, xpMult: 1, speedMult: 1, healMult: 1, weightMult: 1 };

let current: BagEffects = NEUTRAL_EFFECTS;

export function setBagEffects(e: BagEffects) {
  current = e;
}

export function getBagEffects(): BagEffects {
  return current;
}
