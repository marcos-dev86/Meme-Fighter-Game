import type { AttackType, StatusKind, StatusProc } from '@/game/battle/Fighter';
import { rarityBonus, scaledGuard, scaledWeaponDamage, type Rarity } from './rarity';

/**
 * Parte PURA do equipamento (sem estado do jogador nem React): a tabela de
 * armas/escudo e a conta dos bônus finais, incluindo a RARIDADE. gear.ts
 * é a fachada que liga isto ao inventário equipado.
 *
 * Weapons and the shield are GEAR: while one sits in an equip slot the
 * character holds it in hand (see HeldGear.tsx) and its bonus applies on
 * its own - using it from the ITEM menu doesn't spend it. Everything else
 * (potions, food, bombs) is still a consumable.
 */

/** Status que uma arma pode aplicar ao acertar (a chance vem da RARIDADE da arma, ver rarity.ts). */
export interface GearProc {
  kind: StatusKind;
  ms: number;
  on: AttackType[];
}

export interface GearDef {
  id: string;
  kind: 'weapon' | 'shield';
  /** Longest side of the weapon, as a fraction of the character's height. */
  lengthFrac: number;
  /** Where the hand grips the item image (fractions of its width/height). */
  grip: { x: number; y: number };
  /** Direction from grip to tip in the image, degrees (0 = right, -90 = up). */
  axis: number;
  /** Multiplicador PRÓPRIO da arma (antes da raridade). */
  damageMult: number;
  /** Multiplicador PRÓPRIO do escudo sobre o dano recebido (antes da raridade). */
  guardMult: number;
  /** Status aplicado por armas de raridade rara ou superior. */
  proc?: GearProc;
  /** Lâmina AFIADA: soma a chance de crítico da raridade (rarity.ts `critChance`: 4% comum até 12% lendária) enquanto está equipada. */
  crit?: boolean;
}

const W = (id: string, lengthFrac: number, grip: { x: number; y: number }, axis: number, damageMult: number, proc?: GearProc, crit?: boolean): GearDef => ({
  id, kind: 'weapon', lengthFrac, grip, axis, damageMult, guardMult: 1, proc, crit,
});

/**
 * Qual status cada arma de raridade alta aplica (só tem efeito se a raridade
 * da arma tiver procChance > 0, ou seja, rara ou melhor):
 *  - Espada (rara): congelamento, nos golpes FLASH e FORTE.
 *  - Martelo (raro): atordoamento, no FORTE (pancada pesada).
 *  - Machado (épico): queimadura, nos golpes FLASH e FORTE.
 * Adaga, Sabre, Porrete e Escudo não têm status (são comuns/incomuns hoje).
 * Habilidade especial de CRÍTICO: Adaga e Sabre são lâminas afiadas (`crit`) e aumentam a chance de golpe crítico.
 */
export const GEAR: Record<string, GearDef> = {
  w_dagger: W('w_dagger', 0.3, { x: 0.15, y: 0.5 }, 0, 1.1, undefined, true),
  w_cutlass: W('w_cutlass', 0.36, { x: 0.13, y: 0.5 }, 0, 1.18, undefined, true),
  w_club: W('w_club', 0.42, { x: 0.12, y: 0.88 }, -46, 1.22),
  w_sword: W('w_sword', 0.5, { x: 0.13, y: 0.5 }, 0, 1.25, { kind: 'freeze', ms: 1800, on: ['flash', 'strong'] }),
  w_hammer: W('w_hammer', 0.4, { x: 0.1, y: 0.9 }, -48, 1.3, { kind: 'stun', ms: 800, on: ['strong'] }),
  w_axe: W('w_axe', 0.42, { x: 0.12, y: 0.9 }, -46, 1.35, { kind: 'burn', ms: 3500, on: ['flash', 'strong'] }),
  w_shield: { id: 'w_shield', kind: 'shield', lengthFrac: 0.42, grip: { x: 0.5, y: 0.5 }, axis: 0, damageMult: 1, guardMult: 0.7 },
};

export function isGear(itemId: string | null | undefined): boolean {
  return !!itemId && !!GEAR[itemId];
}

/** Marca dos procs que vêm do equipamento: permite não duplicá-los se o setup de luta rodar duas vezes. */
export const GEAR_PROC_SRC = 'gear';

export interface GearState {
  weapon: GearDef | null;
  shield: GearDef | null;
  /** Multiplier on the damage the player deals (arma × raridade da arma). */
  damageMult: number;
  /** Multiplier on the damage the player takes (escudo × raridade do escudo). */
  guardMult: number;
  /** Status que a arma equipada pode aplicar (vazio se a raridade não dá chance). */
  procs: StatusProc[];
  /** Chance de crítico que a arma equipada soma (0 se não for lâmina afiada). */
  critChance: number;
}

/**
 * Calcula o equipamento a partir dos ids equipados e de uma função que diz a
 * raridade de cada id. Só a PRIMEIRA arma e o PRIMEIRO escudo contam (como
 * sempre), então os bônus nunca se acumulam entre duas armas.
 */
export function computeGear(equipped: readonly (string | null | undefined)[], rarityOf: (id: string) => Rarity): GearState {
  let weapon: GearDef | null = null;
  let shield: GearDef | null = null;
  for (const id of equipped) {
    const g = id ? GEAR[id] : undefined;
    if (!g) continue;
    if (g.kind === 'weapon' && !weapon) weapon = g;
    if (g.kind === 'shield' && !shield) shield = g;
  }
  const procs: StatusProc[] = [];
  if (weapon?.proc) {
    const chance = rarityBonus(rarityOf(weapon.id)).procChance;
    if (chance > 0) procs.push({ kind: weapon.proc.kind, chance, ms: weapon.proc.ms, on: [...weapon.proc.on], src: GEAR_PROC_SRC });
  }
  return {
    weapon,
    shield,
    damageMult: weapon ? scaledWeaponDamage(weapon.damageMult, rarityOf(weapon.id)) : 1,
    guardMult: shield ? scaledGuard(shield.guardMult, rarityOf(shield.id)) : 1,
    procs,
    critChance: weapon?.crit ? rarityBonus(rarityOf(weapon.id)).critChance : 0,
  };
}
