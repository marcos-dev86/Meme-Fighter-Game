/**
 * Item / weapon / bag rarity. Visual (name color, slot border), economic
 * (stronger tiers appear later: boss drops, the tower) E MECÂNICA: a raridade
 * agora muda números de verdade no combate (ver RARITY_BONUS).
 *
 * Este arquivo é PURO (sem imports de estado ou React): assim a matemática dos
 * bônus pode ser testada fora do app (tools/test-parte01.mjs) e usada por
 * gear.ts, itemDefs.ts e pelos textos de descrição sem ciclos de importação.
 */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#C8C8C8',
  uncommon: '#5CD65C',
  rare: '#4DA6FF',
  epic: '#C07BFF',
  legendary: '#FFB020',
};

/** Translation key of a rarity's display name. */
export function rarityKey(r: Rarity): string {
  return `rarity_${r}`;
}

/**
 * Bônus MECÂNICOS por raridade. Todos são multiplicadores aplicados POR CIMA
 * do valor próprio do item (ex.: o Machado continua dando +35% de dano; sendo
 * épico, esse dano ainda é multiplicado por `weaponDamage`). Itens comuns têm
 * tudo neutro (1), então nada que já existia muda para eles.
 *
 * - weaponDamage: multiplica o dano causado por quem segura a arma.
 * - guard: multiplica o dano RECEBIDO de quem carrega o escudo (< 1 = menos dano).
 * - heal / energy: multiplicam a cura e a energia de poções e comidas.
 * - procChance: chance base de a arma aplicar um status ao acertar (0 = nunca).
 *   Só raridades altas têm; o status em si é definido por arma (gear.ts).
 */
export interface RarityBonus {
  weaponDamage: number;
  guard: number;
  heal: number;
  energy: number;
  procChance: number;
}

export const RARITY_BONUS: Record<Rarity, RarityBonus> = {
  common: { weaponDamage: 1, guard: 1, heal: 1, energy: 1, procChance: 0 },
  uncommon: { weaponDamage: 1.03, guard: 0.97, heal: 1.05, energy: 1.05, procChance: 0 },
  rare: { weaponDamage: 1.06, guard: 0.94, heal: 1.1, energy: 1.1, procChance: 0.08 },
  epic: { weaponDamage: 1.1, guard: 0.9, heal: 1.15, energy: 1.15, procChance: 0.12 },
  legendary: { weaponDamage: 1.15, guard: 0.85, heal: 1.2, energy: 1.2, procChance: 0.18 },
};

/** Bônus de uma raridade (cai em `common` se vier algo desconhecido, ex.: save/dado antigo). */
export function rarityBonus(r: Rarity | undefined): RarityBonus {
  return (r && RARITY_BONUS[r]) || RARITY_BONUS.common;
}

/** Cura final de um item: valor base × bônus da mochila × bônus de raridade (arredondado). */
export function scaledHeal(base: number, rarity: Rarity | undefined, bagHealMult = 1): number {
  return Math.round(base * bagHealMult * rarityBonus(rarity).heal);
}

/** Energia final de um item: valor base × bônus de raridade (arredondado). */
export function scaledEnergy(base: number, rarity: Rarity | undefined): number {
  return Math.round(base * rarityBonus(rarity).energy);
}

/** Multiplicador final de dano de uma arma: o da arma × o da raridade. */
export function scaledWeaponDamage(baseMult: number, rarity: Rarity | undefined): number {
  return baseMult * rarityBonus(rarity).weaponDamage;
}

/** Multiplicador final de dano recebido de um escudo: o do escudo × o da raridade. */
export function scaledGuard(baseMult: number, rarity: Rarity | undefined): number {
  return baseMult * rarityBonus(rarity).guard;
}

/** Percentual inteiro de um multiplicador > 1 (1.06 -> 6) e de um < 1 (0.94 -> 6). */
export const bonusPct = (mult: number): number => Math.round((mult - 1) * 100);
export const reductionPct = (mult: number): number => Math.round((1 - mult) * 100);
