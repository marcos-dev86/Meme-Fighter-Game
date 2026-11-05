import { GELO_STOCK } from '@/game/items/itemDefs';
import { GELO_BAGS } from '@/game/items/bags';

export type InteriorTemplate = 'shop' | 'cozyHome' | 'humbleHome' | 'loft' | 'basement' | 'casino';

export interface ChestDef {
  id: string;
  coins?: number;
  itemId?: string;
}

export interface FloorContent {
  label: string;
  template: InteriorTemplate;
  npcId?: string;
  /** A second resident standing on the same floor as npcId - e.g. Marina
   * and Maximilian both work out of the same shop (see docs/AUDIT.md:
   * shops stay single-floor, so he stands next to her rather than
   * getting his own floor). Positioned at its own spot, not stacked on
   * npcId - see NPC_POS/NPC2_POS in InteriorOverlay.tsx. */
  npcId2?: string;
  chest?: ChestDef;
  casino?: boolean;
  cosmetics?: boolean;
}

export interface BuildingContent {
  label: string;
  template: InteriorTemplate;
  npcId?: string;
  npcId2?: string;
  chest?: ChestDef;
  /** Item ids sold by this building's shop (defaults to the plaza stock). */
  stock?: string[];
  /** Bag ids sold by this building's shop (see bags.ts). */
  bags?: string[];
  /** Opens the casino games (CasinoOverlay) from this building. */
  casino?: boolean;
  /** Costureira: abre a loja de cosméticos (CosmeticShopOverlay) a partir deste prédio. */
  cosmetics?: boolean;
  /** Extra floors (see docs/AUDIT.md - "mais andares/subsolo, não
   * precisa ser todas"): optional, most buildings have neither. Stairs
   * render automatically in InteriorOverlay whenever these are set - no
   * per-building stairs wiring needed beyond listing the floor here. */
  upstairs?: FloorContent;
  basement?: FloorContent;
}

/**
 * Each of the 6 buildings gets its own name, its own resident (or none),
 * and its own loot: that's what actually makes a structure feel like
 * "its own place" (see docs/AUDIT.md: the wall layout still comes from a
 * small set of templates by type, real per-building bespoke floor plans
 * are future work, but who's inside and what's inside is unique to each
 * one right now, not shared).
 *
 * v2 (this pass): 3 of the 6 get a second floor - not all of them, per
 * the brief ("não precisa ser todas"), picked for where an extra floor
 * actually makes narrative sense rather than spread evenly:
 * - Marina lives above her own shop (classic shopkeeper layout).
 * - Brasa's forge has a basement for stock/storage.
 * - The "Casa Trancada" being LOCKED is the whole joke of that building -
 *   a hidden basement is exactly what a locked house implies.
 */
export const BUILDING_CONTENT: Record<string, BuildingContent> = {
  plaza_shop: {
    label: 'Loja da Marina',
    template: 'shop',
    npcId: 'marina',
    // Maximilian stands right next to her - one floor, two vendors (see
    // docs/AUDIT.md). Marina's shop (common items) and Maximilian's
    // shop (battle items, both ShopOverlay) are two separate "talk to open" triggers, keyed
    // off npcId/npcId2 in InteriorOverlay, not off the room template.
    npcId2: 'maximilian',
  },
  plaza_house_1: {
    label: 'Casa Vazia',
    template: 'humbleHome',
    chest: { id: 'chest_plaza_house_1', coins: 25 },
  },
  plaza_house_2: {
    label: 'Casa da Dona Iracema',
    template: 'cozyHome',
    npcId: 'iracema',
    cosmetics: true,
  },
  plaza_house_3: {
    label: 'Casa Trancada',
    template: 'humbleHome',
    chest: { id: 'chest_plaza_house_3', itemId: 'old_coin' },
    basement: {
      label: 'Porão Trancado',
      template: 'basement',
      chest: { id: 'chest_plaza_house_3_basement', itemId: 'map_fragment' },
    },
  },
  fire_house_1: {
    label: 'Forja do Brasa',
    template: 'humbleHome',
    npcId: 'brasa',
    basement: {
      label: 'Depósito da Forja',
      template: 'basement',
      chest: { id: 'chest_fire_house_1_basement', itemId: 'power_brew' },
    },
  },
  fire_house_2: {
    label: 'Casa Abandonada',
    template: 'humbleHome',
    chest: { id: 'chest_fire_house_2', coins: 30 },
  },

  // ---- the REAL building ids from worldGen.ts. (The keys above were left
  // over from an earlier naming - only plaza_shop ever matched, so every
  // other building opened as an anonymous empty room.)
  casa_dogge: {
    label: 'Casa do Dogge',
    template: 'cozyHome',
    chest: { id: 'chest_casa_dogge', coins: 25 },
  },
  casa_gadigago: {
    label: 'Casa do Gadigago',
    template: 'humbleHome',
    chest: { id: 'chest_casa_gadigago', itemId: 'old_coin' },
    basement: {
      label: 'Porão do Gadigago',
      template: 'basement',
      chest: { id: 'chest_casa_gadigago_basement', itemId: 'map_fragment' },
    },
  },
  casa_iracema: {
    label: 'Casa da Dona Iracema',
    template: 'cozyHome',
    npcId: 'iracema',
    // Dona Iracema é a costureira da praça: aqui se compram chapéus, capas e skins.
    cosmetics: true,
  },
  loja_misteriosa: {
    label: 'Cassino Misterioso',
    template: 'casino',
    npcId: 'croupier',
    casino: true,
    // O cassino gigante tem 3 andares (casinoLayout.ts / CasinoInterior.tsx). Aqui ficam só os baús, para o contador de
    // coletáveis e as setas de missão (a planta de cada andar vem do casinoLayout).
    upstairs: { label: 'Mezanino VIP', template: 'casino', chest: { id: 'chest_cassino_mezanino', coins: 120 } },
    basement: { label: 'Subsolo Secreto', template: 'basement', chest: { id: 'chest_cassino_cofre', coins: 500, itemId: 'power_brew' } },
  },
  loja_vulcao: {
    label: 'Forja do Brasa',
    template: 'humbleHome',
    npcId: 'brasa',
    basement: {
      label: 'Depósito da Forja',
      template: 'basement',
      chest: { id: 'chest_loja_vulcao_basement', itemId: 'power_brew' },
    },
  },
  descanso_vulcao: {
    label: 'Casa de Descanso',
    template: 'humbleHome',
    chest: { id: 'chest_descanso_vulcao', coins: 30 },
  },
  loja_abandonada: {
    label: 'Loja Abandonada',
    template: 'humbleHome',
    chest: { id: 'chest_loja_abandonada', coins: 20 },
  },
  casa_montanha: {
    label: 'Cabana da Montanha',
    template: 'humbleHome',
    chest: { id: 'chest_casa_montanha', itemId: 'chili' },
  },
  salao_geral: {
    label: 'Salão Geral',
    template: 'loft',
    chest: { id: 'chest_salao_geral', coins: 40 },
  },
  guilda: {
    label: 'Guilda',
    template: 'loft',
    npcId: 'mestre_guilda',
    chest: { id: 'chest_guilda', itemId: 'w_dagger' },
  },
  caverna: {
    label: 'Caverna',
    template: 'basement',
    npcId: 'eremita',
    chest: { id: 'chest_caverna', coins: 30 },
    basement: {
      label: 'Galeria Profunda',
      template: 'basement',
      chest: { id: 'chest_caverna_deep', itemId: 'potion_guard' },
    },
  },
  casa_pico: {
    label: 'Refúgio do Pico',
    template: 'cozyHome',
    chest: { id: 'chest_casa_pico', itemId: 'power_brew' },
  },
  loja_gelo: {
    label: 'Loja do Gelo',
    template: 'shop',
    npcId: 'mercador_gelo',
    stock: GELO_STOCK,
    bags: GELO_BAGS,
  },
  salao_camp: {
    label: 'Salão do Acampamento',
    template: 'humbleHome',
    chest: { id: 'chest_salao_camp', coins: 35 },
  },
};
