import type { Fighter } from '@/game/battle/Fighter';
import { getEquippedArmorId } from '@/game/state/playerState';
import { armorRegenOf } from './armorDefs';

export { ARMORS, PLAZA_ARMORS, GELO_ARMORS, armorRegenOf } from './armorDefs';
export type { ArmorDef } from './armorDefs';

/** Regeneração por segundo da armadura equipada agora (0 sem armadura). */
export function getArmorRegen(): number {
  return armorRegenOf(getEquippedArmorId());
}

/**
 * Liga a armadura ao lutador: regenPerSec = regeneração das habilidades (`baseRegen`) + a da armadura.
 * O Fighter.update já aplica regenPerSec todo quadro, então vale no mundo e na luta com o mesmo código.
 */
export function applyArmorRegen(fighter: Fighter, baseRegen: number) {
  fighter.regenPerSec = baseRegen + getArmorRegen();
}
