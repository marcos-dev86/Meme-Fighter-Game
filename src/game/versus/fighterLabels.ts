import type { CharacterKey } from '@/game/battle/Fighter';
import { ROSTER } from '@/game/state/rosterState';

/** Nomes de tela dos lutadores (VERSUS, tela VS). */
export const CHAR_LABEL: Record<CharacterKey, string> = {
  dogge: 'DOGGE',
  gadigago: 'GADIGAGO',
  orc: 'ORC',
  soldier: 'SOLDADO',
  dogking: 'REI DOS CÃES',
  tank: 'TANK',
  ninja: 'SOMBRA',
  mystic: 'ENCAPUZADO',
  ice_dragon: 'DRAGÃO DO GELO',
  green_dragon: 'DRAGÃO DA FLORESTA',
  shadow_dragon: 'DRAGÃO SOMBRIO',
  cara_tranquilo: 'CARA TRANQUILO',
  troll_face: 'TROLL FACE',
  sahur: 'TOCÃO',
  sahur_god: 'SAHUR GOD',
  sahur_evil: 'SAHUR EVIL',
};

/** Ordem da grade de seleção (a do ROSTER). */
export const ALL_CHARACTERS: CharacterKey[] = ROSTER.map((r) => r.key);
