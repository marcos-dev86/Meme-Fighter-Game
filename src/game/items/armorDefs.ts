import type { IconName } from '@/game/ui/iconRegistry';
import type { Rarity } from './rarity';
import type { BreathMods } from '@/game/dive/breath';

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
  /** Efeito no mergulho (fôlego, pressão). Sem isto a armadura só regenera vida. */
  breath?: Partial<BreathMods>;
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
  armor_snorkel: {
    id: 'armor_snorkel',
    name: 'Snorkel do Pato',
    description: 'Um tubinho de respirar e uma boia em forma de pato. Não salva ninguém, mas dá uns segundos a mais.',
    icon: 'cape_blue',
    rarity: 'uncommon',
    regenPerSec: 0.3,
    price: 260,
    effectText: 'Recupera 0,3 de vida por segundo. +10 segundos de fôlego.',
    breath: { capacitySec: 10 },
  },
  armor_wetsuit: {
    id: 'armor_wetsuit',
    name: 'Traje de Mergulho Meme',
    description: 'Neoprene justo com um meme estampado nas costas. Quem nada nele gasta o ar mais devagar.',
    icon: 'cape_green',
    rarity: 'rare',
    regenPerSec: 0.6,
    price: 780,
    effectText: 'Recupera 0,6 de vida por segundo. +18 segundos de fôlego e gasta 15% menos ar.',
    breath: { capacitySec: 18, drainMult: 0.85 },
  },
  armor_coral: {
    id: 'armor_coral',
    name: 'Armadura de Coral',
    description: 'Coral vivo trançado em placas. Aguenta a pressão das profundezas como se fosse a própria casa.',
    icon: 'cape_red',
    rarity: 'epic',
    regenPerSec: 1.4,
    price: null,
    effectText: 'Recupera 1,4 de vida por segundo. +22 segundos de fôlego, gasta 25% menos ar e resiste à pressão.',
    breath: { capacitySec: 22, drainMult: 0.75, pressureSafe: true },
  },
  armor_leviathan: {
    id: 'armor_leviathan',
    name: 'Couraça do Leviatã',
    description: 'Escamas do próprio Sea Beast, ainda úmidas. O mar inteiro parece te respeitar.',
    icon: 'cape_violet',
    rarity: 'secret',
    regenPerSec: 3.4,
    price: null,
    effectText: 'Recupera 3,4 de vida por segundo. +20 segundos de fôlego, gasta 30% menos ar e resiste à pressão.',
    breath: { capacitySec: 20, drainMult: 0.7, pressureSafe: true },
  },
  armor_gills: {
    id: 'armor_gills',
    name: 'Brânquias de Atlântida',
    description: 'Relíquia secreta de uma civilização que nunca precisou subir para respirar. Enquanto vestida, o ar nunca acaba.',
    icon: 'cape_gold',
    rarity: 'secret',
    regenPerSec: 0.5,
    price: null,
    effectText: 'Recupera 0,5 de vida por segundo. Fôlego infinito enquanto estiver equipada.',
    breath: { infinite: true },
  },
};

export const PLAZA_ARMORS = ['armor_leather', 'armor_snorkel', 'armor_wetsuit'];
export const GELO_ARMORS = ['armor_iron'];

export function armorRegenOf(id: string | null | undefined): number {
  return (id && ARMORS[id]?.regenPerSec) || 0;
}

/** Efeito de mergulho da armadura equipada (nada, se não tiver). */
export function armorBreathOf(id: string | null | undefined): Partial<BreathMods> | undefined {
  return id ? ARMORS[id]?.breath : undefined;
}
