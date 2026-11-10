import type { CharacterKey } from './Fighter';
import { HAND_ANCHORS_V2 } from '@/game/cosmetics/wearV2';

/**
 * Where the (front) hand is in each sprite pose, as a fraction of that
 * pose's image (x from the left, y from the top; sprites face right).
 * The held weapon (see HeldWeapon.tsx) is pinned to this point, so it
 * follows the arm through the walk cycle and the punches instead of
 * floating next to the body.
 *
 * Dogge's points were measured from the sprites themselves (the red boxing
 * glove / the front fist); Gadigago's were read off a grid because his arm
 * hides in some walk frames. The other fighters already carry their own
 * weapon in their art (orc, soldier, tank, dogking), so they don't get one
 * more in hand - see canHoldWeapon().
 */
export type HandPoint = { x: number; y: number };

export function canHoldWeapon(character: CharacterKey): boolean {
  return !!HAND_ANCHORS_V2[character];
}

export function getHandAnchor(character: CharacterKey, poseKey: string): HandPoint | null {
  const set = HAND_ANCHORS_V2[character];
  if (!set) return null;
  return set[poseKey] ?? set.idle;
}
