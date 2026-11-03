import type { CharacterKey } from './Fighter';

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

export const HAND_ANCHORS: Partial<Record<CharacterKey, Record<string, HandPoint>>> = {
  dogge: {
    idle: { x: 0.859, y: 0.545 },
    walk1: { x: 0.853, y: 0.549 },
    walk2: { x: 0.88, y: 0.562 },
    walk3: { x: 0.89, y: 0.421 },
    dash: { x: 0.886, y: 0.386 },
    flash: { x: 0.893, y: 0.293 },
    strong: { x: 0.898, y: 0.201 },
  },
  gadigago: {
    idle: { x: 0.8, y: 0.62 },
    walk1: { x: 0.87, y: 0.53 },
    walk2: { x: 0.7, y: 0.6 },
    walk3: { x: 0.68, y: 0.55 },
    dash: { x: 0.9, y: 0.33 },
    flash: { x: 0.8, y: 0.33 },
    strong: { x: 0.82, y: 0.36 },
  },
};

export function canHoldWeapon(character: CharacterKey): boolean {
  return !!HAND_ANCHORS[character];
}

export function getHandAnchor(character: CharacterKey, poseKey: string): HandPoint | null {
  const set = HAND_ANCHORS[character];
  if (!set) return null;
  return set[poseKey] ?? set.idle;
}
