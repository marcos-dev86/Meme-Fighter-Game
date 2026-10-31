/**
 * Item / weapon / bag rarity. Visual (name color, slot border) and economic
 * (stronger tiers appear later: boss drops, crafting, the tower).
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
