import type { BagEffects } from './bags';
import { carryWeightMult } from '@/game/story/abilities';

/** The equipped bag's effects, kept in a tiny module so itemDefs/playerState can both read them without importing each other. */
export const NEUTRAL_EFFECTS: BagEffects = { coinMult: 1, xpMult: 1, speedMult: 1, healMult: 1, weightMult: 1 };

let current: BagEffects = NEUTRAL_EFFECTS;

export function setBagEffects(e: BagEffects) {
  current = e;
}

export function getBagEffects(): BagEffects {
  // Costas Largas (Orc): o peso dos itens conta menos, somado ao efeito da mochila equipada. Só valores calculados, nada gravado.
  const w = carryWeightMult();
  return w === 1 ? current : { ...current, weightMult: current.weightMult * w };
}
