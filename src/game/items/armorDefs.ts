import type { IconName } from '@/game/ui/iconRegistry';
import type { Rarity } from './rarity';

/**
 * ARMADURAS: equipamento que REGENERA VIDA aos poucos, o tempo todo (no mundo E dentro da luta).
 * Uma armadura por vez (slot próprio, separado das armas/escudo e das 2 casas de itens). Você pode ter várias e trocar
 * no inventário. A cura é "por segundo" e soma com a regeneração das habilidades (skills.ts).
 * Os ícones são PROVISÓRIOS (reaproveitam capas/elmo existentes): troque em `icon` quando houver arte nova.
 */
export interface ArmorDef {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  rarity: Rarity;
  /** Vida (em pontos de 100) recuperada por segundo, em qualquer situação (mundo, luta, fora de combate). */
  regenPerSec: number;
  /** Preço em Memecoins; null = não vende (chefe / torre / segredo). */
  price: number | null;
  effectText: string;
}

export const ARMORS: Record<string, ArmorDef> = {
  armor_leather: {
    id: 'armor_leather',
    name: 'Colete de Couro',
    description: 'Couro curtido e remendado. Não impressiona, mas cicatriza as bobagens.',
    icon: 'cape_brown',
    rarity: 'uncommon',
    regenPerSec: 0.5,
    price: 320,
    effectText: 'Recupera 0,5 de vida por segundo.',
  },
  armor_iron: {
    id: 'armor_iron',
    name: 'Armadura de Ferro',
    description: 'Pesada, fria e teimosa. O metal "lembra" o formato do corpo e ajuda a fechar os machucados.',
    icon: 'hat_iron',
    rarity: 'rare',
    regenPerSec: 1,
    price: 850,
    effectText: 'Recupera 1 de vida por segundo.',
  },
  armor_arcane: {
    id: 'armor_arcane',
    name: 'Manto Arcano',
    description: 'Tecido com fios de luz do vulcão. Esquenta nas lutas longas.',
    icon: 'cape_violet',
    rarity: 'epic',
    regenPerSec: 1.7,
    price: null,
    effectText: 'Recupera 1,7 de vida por segundo.',
  },
  armor_phoenix: {
    id: 'armor_phoenix',
    name: 'Armadura da Fênix',
    description: 'Lendária. Quem a veste renasce das cinzas, um pouquinho a cada segundo.',
    icon: 'cape_red',
    rarity: 'legendary',
    regenPerSec: 2.6,
    price: null,
    effectText: 'Recupera 2,6 de vida por segundo.',
  },
};

export const PLAZA_ARMORS = ['armor_leather'];
export const GELO_ARMORS = ['armor_iron'];

export function armorRegenOf(id: string | null | undefined): number {
  return (id && ARMORS[id]?.regenPerSec) || 0;
}
