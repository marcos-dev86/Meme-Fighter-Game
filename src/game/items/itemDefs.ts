import type { ImageSourcePropType } from 'react-native';
import type { Fighter } from '@/game/battle/Fighter';
import { scaledEnergy, scaledHeal, type Rarity } from './rarity';
import { getBagEffects } from './bagRuntime';
import { iconSource, type IconName } from '@/game/ui/iconRegistry';

/**
 * Items are USED INSTANTLY from one of the 2 equip slots (see
 * playerState.ts / EquipMenu.tsx), in the world AND in battle:
 *  - heal / energy: instant refill.
 *  - damage / speed / shieldCost / guard: a buff that lasts until this
 *    Fighter is re-created (i.e. for the rest of the current fight or
 *    world session). The same item's buff doesn't stack with itself,
 *    but different buffs stack with each other.
 */
export type ItemEffect =
  | { kind: 'heal'; amount: number }
  | { kind: 'energy'; amount: number }
  | { kind: 'shieldCost'; mult: number }
  | { kind: 'damage'; mult: number }
  | { kind: 'speed'; mult: number }
  | { kind: 'guard'; mult: number } // multiplies damage TAKEN (0.75 = takes 25% less)
  | { kind: 'bomb'; amount: number } // thrown at the opponent: battle only
  | { kind: 'none' };

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  icon: IconName; // ícone pixel-art (usado se não houver `image`)
  image: ImageSourcePropType;
  price: number | null; // in Memecoins: null means not sold in the shop (find-only)
  effects: ItemEffect[];
  /** Tier: color/border in menus; stronger tiers come from bosses, crafting and the tower. */
  rarity: Rarity;
  /** Weight in kg (the bag has a weight limit, see bags.ts). */
  weight: number;
}

export const CURRENCY_NAME = 'Memecoin';
export const CURRENCY_ABBR = 'MC';

/* eslint-disable @typescript-eslint/no-require-imports */
const IMG = {
  banana: require('../../../assets/items/banana.png'),
  chili: require('../../../assets/items/chili.png'),
  bread: require('../../../assets/items/bread.png'),
  mushroom: require('../../../assets/items/mushroom.png'),
  drumstick: require('../../../assets/items/drumstick.png'),
  honey: require('../../../assets/items/honey.png'),
  cherries: require('../../../assets/items/cherries.png'),
  milk: require('../../../assets/items/milk.png'),
  chocolate: require('../../../assets/items/chocolate.png'),
  pumpkin: require('../../../assets/items/pumpkin.png'),
  strawberry: require('../../../assets/items/strawberry.png'),
  pot_y_s: require('../../../assets/items/pot_y_s.png'),
  pot_y_m: require('../../../assets/items/pot_y_m.png'),
  pot_y_l: require('../../../assets/items/pot_y_l.png'),
  pot_r_s: require('../../../assets/items/pot_r_s.png'),
  pot_r_m: require('../../../assets/items/pot_r_m.png'),
  pot_r_l: require('../../../assets/items/pot_r_l.png'),
  pot_p_s: require('../../../assets/items/pot_p_s.png'),
  pot_p_m: require('../../../assets/items/pot_p_m.png'),
  w_dagger: require('../../../assets/items/w_dagger.png'),
  w_cutlass: require('../../../assets/items/w_cutlass.png'),
  w_sword: require('../../../assets/items/w_sword.png'),
  w_axe: require('../../../assets/items/w_axe.png'),
  w_hammer: require('../../../assets/items/w_hammer.png'),
  w_club: require('../../../assets/items/w_club.png'),
  w_shield: require('../../../assets/items/w_shield.png'),
  w_bomb: require('../../../assets/items/w_bomb.png'),
  pot_p_l: require('../../../assets/items/pot_p_l.png'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

/** Everything sold for Memecoins costs 40% more than the base prices written below (economy rebalance, XP update). */
export const PRICE_MULT = 1.4;

function def(
  id: string,
  name: string,
  description: string,
  icon: IconName,
  image: ImageSourcePropType | undefined,
  price: number | null,
  ...effects: ItemEffect[]
): ItemDef {
  return { id, name, description, icon, image: image ?? iconSource(icon), price: price === null ? null : Math.round(price * PRICE_MULT), effects, rarity: 'common', weight: 0.3 };
}

const list: ItemDef[] = [
  // Poções de vida (vermelhas): pequena / média / grande
  def('potion_hp_s', 'Poção de Vida P', 'Recupera 20 de vida.', 'dot', IMG.pot_r_s, 15, { kind: 'heal', amount: 20 }),
  def('health_potion', 'Poção de Vida M', 'Recupera 45 de vida.', 'dot', IMG.pot_r_m, 35, { kind: 'heal', amount: 45 }),
  def('potion_hp_l', 'Poção de Vida G', 'Recupera 80 de vida.', 'dot', IMG.pot_r_l, 70, { kind: 'heal', amount: 80 }),
  // Poções de energia (amarelas)
  def('potion_en_s', 'Poção de Energia P', 'Recupera 30 de energia.', 'dot', IMG.pot_y_s, 12, { kind: 'energy', amount: 30 }),
  def('energy_shard', 'Poção de Energia M', 'Recupera 60 de energia.', 'dot', IMG.pot_y_m, 28, { kind: 'energy', amount: 60 }),
  def('potion_en_l', 'Poção de Energia G', 'Enche a barra de energia (SUPER na hora!).', 'dot', IMG.pot_y_l, 55, { kind: 'energy', amount: 100 }),
  // Poções de buff (roxas)
  def('energizante', 'Poção de Velocidade', '+20% de velocidade de movimento e dash.', 'dot', IMG.pot_p_s, 25, { kind: 'speed', mult: 1.2 }),
  def('potion_guard', 'Poção de Guarda', 'Você recebe 25% menos dano.', 'dot', IMG.pot_p_m, 40, { kind: 'guard', mult: 0.75 }),
  def('power_brew', 'Poção de Fúria', '+30% de dano em todos os golpes.', 'dot', IMG.pot_p_l, 45, { kind: 'damage', mult: 1.3 }),
  // Comidas
  def('strawberry', 'Morango', 'Recupera 10 de vida.', 'dot', IMG.strawberry, 6, { kind: 'heal', amount: 10 }),
  def('milk', 'Leite', 'Recupera 12 de vida.', 'dot', IMG.milk, 8, { kind: 'heal', amount: 12 }),
  def('bread', 'Pão', 'Recupera 18 de vida.', 'dot', IMG.bread, 10, { kind: 'heal', amount: 18 }),
  def('drumstick', 'Coxa de Frango', 'Recupera 40 de vida.', 'dot', IMG.drumstick, 28, { kind: 'heal', amount: 40 }),
  def('banana', 'Banana', '+8 de vida e +10% de velocidade.', 'dot', IMG.banana, 14, { kind: 'heal', amount: 8 }, { kind: 'speed', mult: 1.1 }),
  def('mushroom', 'Cogumelo', 'Recupera 25 de energia.', 'dot', IMG.mushroom, 16, { kind: 'energy', amount: 25 }),
  def('chocolate', 'Chocolate', 'Recupera 35 de energia.', 'dot', IMG.chocolate, 20, { kind: 'energy', amount: 35 }),
  def('honey', 'Mel', '+20 de energia e +10 de vida.', 'dot', IMG.honey, 24, { kind: 'energy', amount: 20 }, { kind: 'heal', amount: 10 }),
  def('chili', 'Pimenta', '+15% de dano em todos os golpes.', 'dot', IMG.chili, 22, { kind: 'damage', mult: 1.15 }),
  def('shield_charm', 'Cerejas da Sorte', 'Escudo gasta 30% menos energia.', 'dot', IMG.cherries, 30, { kind: 'shieldCost', mult: 0.7 }),
  def('pumpkin', 'Abóbora Dura', 'Você recebe 15% menos dano.', 'dot', IMG.pumpkin, 26, { kind: 'guard', mult: 0.85 }),
  // Armas (buffs de dano pelo resto da luta; escudo de madeira e bomba)
  def('w_dagger', 'Adaga', 'Equipamento: fica na sua mão e dá +10% de dano.', 'dot', IMG.w_dagger, 25, { kind: 'damage', mult: 1.1 }),
  def('w_cutlass', 'Sabre', 'Equipamento: fica na sua mão e dá +18% de dano.', 'dot', IMG.w_cutlass, 40, { kind: 'damage', mult: 1.18 }),
  def('w_club', 'Porrete', 'Equipamento: fica na sua mão e dá +22% de dano.', 'dot', IMG.w_club, 50, { kind: 'damage', mult: 1.22 }),
  def('w_sword', 'Espada', 'Equipamento: fica na sua mão e dá +25% de dano.', 'dot', IMG.w_sword, 60, { kind: 'damage', mult: 1.25 }),
  def('w_hammer', 'Martelo', 'Equipamento: fica na sua mão e dá +30% de dano.', 'dot', IMG.w_hammer, 75, { kind: 'damage', mult: 1.3 }),
  def('w_axe', 'Machado', 'Equipamento: fica na sua mão e dá +35% de dano.', 'dot', IMG.w_axe, 90, { kind: 'damage', mult: 1.35 }),
  def('w_shield', 'Escudo de Madeira', 'Equipamento: você o carrega e recebe 30% menos dano.', 'dot', IMG.w_shield, 55, { kind: 'guard', mult: 0.7 }),
  def('w_bomb', 'Bomba', 'Arremessa no oponente: 25 de dano (só em luta; o escudo bloqueia).', 'dot', IMG.w_bomb, 35, { kind: 'bomb', amount: 25 }),
  // Só à venda à noite (ver shopCycle.ts)
  def('moonshroom', 'Cogumelo Lunar', 'Recupera 50 de energia. Só aparece nas lojas à noite.', 'moon', undefined, 32, { kind: 'energy', amount: 50 }),
  def('moon_elixir', 'Elixir da Lua', 'Recupera 70 de vida e 30 de energia. Só aparece nas lojas à noite.', 'potion_moon', undefined, 90, { kind: 'heal', amount: 70 }, { kind: 'energy', amount: 30 }),
  def('night_brew', 'Poção Noturna', '+40% de dano em todos os golpes. Só aparece nas lojas à noite.', 'potion_night', undefined, 120, { kind: 'damage', mult: 1.4 }),
  // Colecionáveis (sem efeito)
  def('piolet', 'Piolet', 'Ferramenta de escalada: deixa você subir as paredes de gelo da montanha.', 'pickaxe', undefined, 80, { kind: 'none' }),
  def('summit_flag', 'Bandeira do Pico', 'Prova de que você chegou ao topo da montanha de neve.', 'flag', undefined, null, { kind: 'none' }),
  def('guild_parcel', 'Pacote Lacrado', 'Entregue pelo Mestre da Guilda. Não abra: leve ao destinatário.', 'parcel', undefined, null, { kind: 'none' }),
  def('meme_token', 'Ficha Meme', 'Um colecionável bobo. Não faz nada, é só engraçado ter.', 'card', undefined, 5, { kind: 'none' }),
  def('old_coin', 'Moeda Antiga', 'Achada, não vendida. Parece ter uma história.', 'coin', undefined, null, { kind: 'none' }),
  def('map_fragment', 'Fragmento de Mapa', 'Achado, não vendido. Talvez aponte pra algo, um dia.', 'scroll', undefined, null, { kind: 'none' }),
];

/** rarity + weight (kg) per item id; anything missing stays common / 0.3 kg. */
const META: Record<string, [Rarity, number]> = {
  potion_hp_s: ['common', 0.3], health_potion: ['uncommon', 0.4], potion_hp_l: ['rare', 0.6],
  potion_en_s: ['common', 0.3], energy_shard: ['uncommon', 0.4], potion_en_l: ['rare', 0.6],
  energizante: ['uncommon', 0.3], potion_guard: ['uncommon', 0.4], power_brew: ['rare', 0.5],
  strawberry: ['common', 0.1], milk: ['common', 0.3], bread: ['common', 0.2], drumstick: ['common', 0.5],
  banana: ['common', 0.2], mushroom: ['common', 0.1], chocolate: ['uncommon', 0.1], honey: ['uncommon', 0.3],
  chili: ['uncommon', 0.1], shield_charm: ['rare', 0.1], pumpkin: ['uncommon', 1],
  w_dagger: ['common', 1], w_cutlass: ['uncommon', 2], w_club: ['uncommon', 3], w_sword: ['rare', 3],
  w_hammer: ['rare', 5], w_axe: ['epic', 5], w_shield: ['uncommon', 4], w_bomb: ['uncommon', 1],
  piolet: ['uncommon', 2], summit_flag: ['legendary', 0.5], guild_parcel: ['common', 0.5],
  moonshroom: ['uncommon', 0.1], moon_elixir: ['rare', 0.5], night_brew: ['epic', 0.5],
  meme_token: ['common', 0.1], old_coin: ['uncommon', 0.1], map_fragment: ['rare', 0.1],
};
for (const d of list) {
  const m = META[d.id];
  if (m) {
    d.rarity = m[0];
    d.weight = m[1];
  }
}

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(list.map((d) => [d.id, d]));

/** Order the shop shows its stock in. */
/** Stock of the ice-island shop (the piolet is only sold here). */
export const GELO_STOCK: string[] = ['piolet', 'potion_hp_s', 'health_potion', 'potion_en_s', 'honey', 'drumstick', 'pumpkin', 'w_shield', 'potion_guard'];

/** MARINA (praça): itens COMUNS, comidas e poções pequenas/médias. As mochilas ficam nesta mesma loja. */
export const SHOP_STOCK: string[] = [
  'potion_hp_s', 'health_potion',
  'potion_en_s', 'energy_shard',
  'strawberry', 'milk', 'bread', 'drumstick', 'banana', 'mushroom', 'chocolate', 'honey',
  'meme_token',
];

/** MAXIMILIAN (praça): itens de BATALHA: armas, escudo, bomba, poções fortes e buffs. */
export const BATTLE_STOCK: string[] = [
  'w_dagger', 'w_cutlass', 'w_club', 'w_sword', 'w_hammer', 'w_axe', 'w_shield', 'w_bomb',
  'potion_hp_l', 'potion_en_l',
  'energizante', 'potion_guard', 'power_brew', 'chili', 'shield_charm', 'pumpkin',
];

export function itemName(id: string): string {
  return ITEMS[id]?.name ?? id;
}

export function isUsable(id: string): boolean {
  const d = ITEMS[id];
  return !!d && d.effects.some((e) => e.kind !== 'none');
}

const appliedBuffs = new WeakMap<Fighter, Set<string>>();

/** Applies an item's effects straight onto a Fighter (world or battle).
 * Heals/energy always apply; a buff (damage/speed/guard/shield) only
 * applies once per item per Fighter, so eating 10 chilis can't stack. */
export function needsTarget(itemId: string): boolean {
  return !!ITEMS[itemId]?.effects.some((e) => e.kind === 'bomb');
}

export function applyItemEffect(fighter: Fighter, itemId: string, target?: Fighter) {
  const d = ITEMS[itemId];
  if (!d) return;
  let seen = appliedBuffs.get(fighter);
  if (!seen) {
    seen = new Set();
    appliedBuffs.set(fighter, seen);
  }
  const isBuff = (k: string) => k !== 'heal' && k !== 'energy' && k !== 'none' && k !== 'bomb';
  const alreadyBuffed = seen.has(itemId);
  for (const e of d.effects) {
    if (isBuff(e.kind) && alreadyBuffed) continue;
    switch (e.kind) {
      // Cura/energia: valor do item × bônus da mochila (só cura) × bônus de RARIDADE (ver rarity.ts).
      case 'heal':
        fighter.health = Math.min(fighter.maxHealth, fighter.health + scaledHeal(e.amount, d.rarity, getBagEffects().healMult));
        break;
      case 'energy':
        fighter.energy = Math.min(fighter.maxEnergy, fighter.energy + scaledEnergy(e.amount, d.rarity));
        break;
      case 'shieldCost':
        fighter.shieldCost = Math.min(fighter.shieldCost, fighter.shieldCost * e.mult);
        break;
      case 'damage':
        fighter.strongDamage *= e.mult;
        fighter.flashDamage *= e.mult;
        fighter.ultimateDamage *= e.mult;
        break;
      case 'speed':
        fighter.speed *= e.mult;
        fighter.dashSpeed *= e.mult;
        break;
      case 'bomb':
        target?.takeHit(e.amount);
        break;
      case 'guard':
        fighter.damageTakenMult *= e.mult;
        break;
    }
  }
  if (d.effects.some((e) => isBuff(e.kind))) seen.add(itemId);
}

/** Which SpriteEffect to play over the user when an item is used. */
export function itemEffectName(itemId: string): 'item_heal' | 'item_attack' | 'item_haste' | 'item_guard' | 'charge_up' | 'bomb' {
  const kinds = ITEMS[itemId]?.effects.map((e) => e.kind) ?? [];
  if (kinds.includes('bomb')) return 'bomb';
  if (kinds.includes('damage')) return 'item_attack';
  if (kinds.includes('speed')) return 'item_haste';
  if (kinds.includes('guard') || kinds.includes('shieldCost')) return 'item_guard';
  if (kinds.includes('energy') && !kinds.includes('heal')) return 'charge_up';
  return 'item_heal';
}
