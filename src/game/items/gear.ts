import { getEquippedItems } from '@/game/state/playerState';

/**
 * Weapons and the shield are GEAR: while one sits in an equip slot the
 * character holds it in hand (see HeldWeapon.tsx) and its bonus applies on
 * its own - using it from the ITEM menu doesn't spend it. Everything else
 * (potions, food, bombs) is still a consumable.
 */
export interface GearDef {
  id: string;
  kind: 'weapon' | 'shield';
  /** Longest side of the weapon, as a fraction of the character's height. */
  lengthFrac: number;
  /** Where the hand grips the item image (fractions of its width/height). */
  grip: { x: number; y: number };
  /** Direction from grip to tip in the image, degrees (0 = right, -90 = up). */
  axis: number;
  damageMult: number;
  guardMult: number;
}

const W = (id: string, lengthFrac: number, grip: { x: number; y: number }, axis: number, damageMult: number): GearDef => ({
  id, kind: 'weapon', lengthFrac, grip, axis, damageMult, guardMult: 1,
});

export const GEAR: Record<string, GearDef> = {
  w_dagger: W('w_dagger', 0.3, { x: 0.15, y: 0.5 }, 0, 1.1),
  w_cutlass: W('w_cutlass', 0.36, { x: 0.13, y: 0.5 }, 0, 1.18),
  w_club: W('w_club', 0.42, { x: 0.12, y: 0.88 }, -46, 1.22),
  w_sword: W('w_sword', 0.5, { x: 0.13, y: 0.5 }, 0, 1.25),
  w_hammer: W('w_hammer', 0.4, { x: 0.1, y: 0.9 }, -48, 1.3),
  w_axe: W('w_axe', 0.42, { x: 0.12, y: 0.9 }, -46, 1.35),
  w_shield: { id: 'w_shield', kind: 'shield', lengthFrac: 0.42, grip: { x: 0.5, y: 0.5 }, axis: 0, damageMult: 1, guardMult: 0.7 },
};

export function isGear(itemId: string | null | undefined): boolean {
  return !!itemId && !!GEAR[itemId];
}

export interface GearState {
  weapon: GearDef | null;
  shield: GearDef | null;
  /** Multiplier on the damage the player deals. */
  damageMult: number;
  /** Multiplier on the damage the player takes. */
  guardMult: number;
}

/** What the player is currently holding, from the two equip slots. */
export function getGear(): GearState {
  let weapon: GearDef | null = null;
  let shield: GearDef | null = null;
  for (const id of getEquippedItems()) {
    const g = id ? GEAR[id] : undefined;
    if (!g) continue;
    if (g.kind === 'weapon' && !weapon) weapon = g;
    if (g.kind === 'shield' && !shield) shield = g;
  }
  return {
    weapon,
    shield,
    damageMult: weapon?.damageMult ?? 1,
    guardMult: shield?.guardMult ?? 1,
  };
}
