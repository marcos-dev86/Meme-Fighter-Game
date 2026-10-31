/**
 * Itens do VERSUS: antes da luta cada lado recebe uma oferta SORTEADA de itens de batalha, e o jogador escolhe
 * 2 (a CPU, ou o jogador 2, recebe 2 sorteados). Na luta, o botão ITEM usa esses itens. Os itens do versus não
 * vêm da mochila (o versus não depende de save): são de uso único e só valem naquela luta.
 */
export const VERSUS_ITEM_POOL = [
  'potion_hp_s', 'health_potion', 'potion_hp_l',
  'potion_en_s', 'potion_en_l',
  'potion_guard', 'power_brew', 'energizante', 'chili',
  'w_bomb',
];
export const OFFER_SIZE = 4;
export const PICK_COUNT = 2;

export function drawOffer(rng: () => number = Math.random, size = OFFER_SIZE): string[] {
  const pool = [...VERSUS_ITEM_POOL];
  const out: string[] = [];
  while (out.length < size && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

export function drawRandomPair(rng: () => number = Math.random): string[] {
  return drawOffer(rng, PICK_COUNT);
}

export const encodeItems = (ids: string[]): string => ids.join(',');
export function decodeItems(s: string | undefined): (string | null)[] {
  const ids = (s ?? '').split(',').filter((x) => VERSUS_ITEM_POOL.includes(x));
  return [ids[0] ?? null, ids[1] ?? null];
}
