import { getEquippedItems } from '@/game/state/playerState';
import { ITEMS } from '@/game/items/itemDefs';
import { computeGear, type GearState } from './gearDefs';

/**
 * Fachada do equipamento: liga a parte pura (gearDefs.ts: tabela de armas,
 * escudo e a conta dos bônus com RARIDADE) ao que o jogador tem nos 2 slots
 * equipados agora. Mantém os mesmos nomes exportados de antes.
 */
export { GEAR, GEAR_PROC_SRC, computeGear, isGear } from './gearDefs';
export type { GearDef, GearProc, GearState } from './gearDefs';

/** What the player is currently holding, from the two equip slots. */
export function getGear(): GearState {
  return computeGear(getEquippedItems(), (id) => ITEMS[id]?.rarity ?? 'common');
}
