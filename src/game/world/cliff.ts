import { getInventory } from '@/game/state/playerState';

/** The item that lets the player climb the icy cliff faces ('cliff' tiles). */
export const CLIMB_ITEM = 'piolet';

export function canClimbCliff(): boolean {
  return (getInventory()[CLIMB_ITEM] ?? 0) > 0;
}
