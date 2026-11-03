import type { Rarity } from '@/game/items/rarity';
import type { IconName } from '@/game/ui/iconRegistry';

/**
 * Cosméticos: chapéus, capas e skins. Só visual (nenhum efeito de atributo), comprados SÓ com moedas
 * na costureira (Dona Iracema). Chapéus e capas usam os ícones do pacote de armaduras.
 */
export type CosmeticSlot = 'hat' | 'cape' | 'skin';

export interface CosmeticDef {
  id: string;
  slot: CosmeticSlot;
  /** Chapéus e capas: ícone pixel-art. Skins: null (usam `swatch`). */
  icon: IconName | null;
  /** Skins: cor de amostra. */
  swatch?: string;
  rarity: Rarity;
  price: number;
  /** Só se ganha como recompensa de missão (não aparece na loja). */
  exclusive?: boolean;
}

/** Preço por raridade (em Memecoins). */
export const COSMETIC_PRICE: Record<Rarity, number> = { common: 150, uncommon: 350, rare: 800, epic: 1800, legendary: 4000 };

const c = (id: string, slot: CosmeticSlot, icon: IconName | null, rarity: Rarity, swatch?: string): CosmeticDef => ({ id, slot, icon, swatch, rarity, price: COSMETIC_PRICE[rarity] });

export const COSMETICS: CosmeticDef[] = [
  // chapéus
  c('hat_leather', 'hat', 'hat_leather', 'common'),
  c('hat_fur', 'hat', 'hat_fur', 'common'),
  c('hat_leaf', 'hat', 'hat_leaf', 'uncommon'),
  c('hat_iron', 'hat', 'hat_iron', 'uncommon'),
  c('hat_hood', 'hat', 'hat_hood', 'rare'),
  c('hat_wizard', 'hat', 'hat_wizard', 'epic'),
  c('hat_knight', 'hat', 'hat_knight', 'epic'),
  c('hat_gold', 'hat', 'hat_gold', 'legendary'),
  { id: 'hat_crown', slot: 'hat', icon: 'crown', rarity: 'legendary', price: 0, exclusive: true }, // recompensa da missão secreta "Sem um Arranhão"
  // capas
  c('cape_brown', 'cape', 'cape_brown', 'common'),
  c('cape_red', 'cape', 'cape_red', 'uncommon'),
  c('cape_green', 'cape', 'cape_green', 'rare'),
  c('cape_blue', 'cape', 'cape_blue', 'rare'),
  c('cape_violet', 'cape', 'cape_violet', 'epic'),
  c('cape_gold', 'cape', 'cape_gold', 'legendary'),
  // skins (troca de tonalidade do sprite)
  c('skin_gelo', 'skin', null, 'uncommon', '#5bb8ff'),
  c('skin_floresta', 'skin', null, 'rare', '#45d34a'),
  c('skin_sombra', 'skin', null, 'epic', '#8a3fc4'),
  c('skin_ouro', 'skin', null, 'legendary', '#ffc21a'),
];

export const COSMETIC_BY_ID: Record<string, CosmeticDef> = Object.fromEntries(COSMETICS.map((x) => [x.id, x]));

export const COSMETIC_SLOTS: CosmeticSlot[] = ['hat', 'cape', 'skin'];

/** Meta do progresso: TODOS os cosméticos (inclui as skins e o exclusivo das missões secretas). */
export const COSMETIC_PROGRESS_TARGET = COSMETICS.length;

/** id da skin ('skin_gelo') -> nome da pasta dos sprites ('gelo'). */
export const skinFolder = (id: string) => id.replace(/^skin_/, '');
