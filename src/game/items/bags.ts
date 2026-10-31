import type { IconName } from '@/game/ui/iconRegistry';
import type { Rarity } from './rarity';

/**
 * Bags ("mochilas"): the bag limits how many different items (slots) and how
 * much weight (kg) you carry, and each rarity tier adds a special effect.
 * You can own several and swap in the inventory screen. Cloth is the free
 * starter; leather and explorer are sold in shops; arcane and the legendary
 * one are rewards (boss / tower / secrets).
 */
export interface BagEffects {
  coinMult: number; // coins from kills, pickups, missions
  xpMult: number;
  speedMult: number; // world walking speed
  healMult: number; // potions/food that heal
  weightMult: number; // items weigh this much of their normal weight
}

export interface BagDef {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  rarity: Rarity;
  slots: number;
  maxWeight: number;
  effects: Partial<BagEffects>;
  /** Shop price in Memecoins; null = not sold. */
  price: number | null;
  /** Short text of the special effect (shown in shop/inventory). */
  effectText: string;
}

export const DEFAULT_BAG = 'bag_cloth';
export const MAX_STACK = 99;

export const BAGS: Record<string, BagDef> = {
  bag_cloth: {
    id: 'bag_cloth',
    name: 'Mochila de Pano',
    description: 'A mochila simples de quem está começando a jornada.',
    icon: 'backpack',
    rarity: 'common',
    slots: 10,
    maxWeight: 15,
    effects: {},
    price: null,
    effectText: 'Sem efeito especial.',
  },
  bag_leather: {
    id: 'bag_leather',
    name: 'Mochila de Couro',
    description: 'Costurada à mão, aguenta bem mais coisa.',
    icon: 'backpack',
    rarity: 'uncommon',
    slots: 16,
    maxWeight: 25,
    effects: { coinMult: 1.05 },
    price: 280,
    effectText: '+5% de moedas ganhas.',
  },
  bag_explorer: {
    id: 'bag_explorer',
    name: 'Mochila de Explorador',
    description: 'Leve, cheia de alças e bolsos. Feita para quem anda muito.',
    icon: 'backpack',
    rarity: 'rare',
    slots: 22,
    maxWeight: 40,
    effects: { speedMult: 1.05 },
    price: 750,
    effectText: 'Passos Leves: +5% de velocidade ao andar.',
  },
  bag_arcane: {
    id: 'bag_arcane',
    name: 'Mochila Arcana',
    description: 'Por dentro é maior do que por fora. Dizem que um mago a esqueceu na forja.',
    icon: 'backpack',
    rarity: 'epic',
    slots: 30,
    maxWeight: 60,
    effects: { weightMult: 0.7, healMult: 1.15 },
    price: null,
    effectText: 'Bolso Mágico: itens pesam 30% menos e poções curam +15%.',
  },
  bag_king: {
    id: 'bag_king',
    name: 'Mochila do Rei Meme',
    description: 'Lendária. Quem a carrega nunca fica sem sorte nem sem espaço.',
    icon: 'backpack',
    rarity: 'legendary',
    slots: 40,
    maxWeight: 90,
    effects: { coinMult: 1.1, xpMult: 1.1, speedMult: 1.05, weightMult: 0.6 },
    price: null,
    effectText: 'Sorte Real: +10% de XP e moedas, +5% de velocidade, itens pesam 40% menos.',
  },
};

export function bagEffectsOf(id: string): BagEffects {
  const e = BAGS[id]?.effects ?? {};
  return { coinMult: e.coinMult ?? 1, xpMult: e.xpMult ?? 1, speedMult: e.speedMult ?? 1, healMult: e.healMult ?? 1, weightMult: e.weightMult ?? 1 };
}

/** Bags sold in the plaza shop / the ice-island shop. */
export const PLAZA_BAGS = ['bag_leather'];
export const GELO_BAGS = ['bag_explorer'];
