/**
 * Cena de subir de nível: o fundo é um gradiente com as cores do PERSONAGEM, com uma aura saindo de trás dele, e o chão é
 * o do lugar onde ele estava (grama, areia, neve, pedra, lava, cinza, cais ou fundo do mar). PURO (sem React) para os testes.
 */

export type GroundKind = 'grass' | 'sand' | 'snow' | 'stone' | 'lava' | 'ash' | 'dock' | 'water' | 'underwater';
export const GROUND_KINDS: GroundKind[] = ['grass', 'sand', 'snow', 'stone', 'lava', 'ash', 'dock', 'water', 'underwater'];

/** Chão da animação a partir do tipo de bloco do mapa onde o jogador está (ou o fundo do mar, se estiver mergulhado). */
export function groundFromTile(tile: string, underwater = false): GroundKind {
  if (underwater) return 'underwater';
  switch (tile) {
    case 'sand': return 'sand';
    case 'snow': return 'snow';
    case 'stone': case 'path': case 'rock': case 'cliff': case 'wall': case 'door': case 'shop': case 'house': return 'stone';
    case 'lava': return 'lava';
    case 'ash': return 'ash';
    case 'dock': return 'dock';
    case 'water': return 'water';
    default: return 'grass'; // grama, flores, árvores
  }
}

let ground: GroundKind = 'grass';
/** Quem dispara o subir de nível avisa o chão antes de enfileirar a cena. */
export function setLevelUpGround(g: GroundKind) {
  ground = g;
}
export function getLevelUpGround(): GroundKind {
  return ground;
}

/** [centro da aura, meio, borda escura] de cada personagem de história. */
export const AURA_COLORS: Record<string, [string, string, string]> = {
  dogge: ['#ffd36b', '#ff9a2e', '#3a1a05'],
  gadigago: ['#ff8a9b', '#d6336c', '#2a0612'],
  orc: ['#a8e063', '#4c8c2b', '#0f240a'],
  soldier: ['#9fb3c8', '#4b6584', '#0d1520'],
  dogking: ['#ffd700', '#8e44ad', '#1d0a2e'],
  tank: ['#cfa97e', '#8a5a2b', '#1e1208'],
  ninja: ['#7d8cff', '#2d3a8c', '#05061a'],
  mystic: ['#d6a8ff', '#7a3fd1', '#14062a'],
  green_dragon: ['#7bed9f', '#27ae60', '#04200f'],
  ice_dragon: ['#bff0ff', '#3aa0e0', '#04162b'],
  shadow_dragon: ['#c39bff', '#5b2c83', '#0a0412'],
  troll_face: ['#ffffff', '#9aa5b1', '#1b1f24'],
  cara_tranquilo: ['#ffb36b', '#e17055', '#2b1409'],
  sahur: ['#ffe29a', '#e67e22', '#2e1805'],
  sahur_god: ['#fffbe0', '#ffd700', '#3a2a00'],
  sahur_evil: ['#ff7a5a', '#c0392b', '#1d0305'],
};

export function auraColors(characterId: string): [string, string, string] {
  return AURA_COLORS[characterId] ?? AURA_COLORS.dogge;
}

/** Cores do chão: [topo, base, detalhe]. */
export const GROUND_COLORS: Record<GroundKind, [string, string, string]> = {
  grass: ['#4caf50', '#2e7d32', '#81c784'],
  sand: ['#e6c98a', '#c9a15a', '#f3e2b3'],
  snow: ['#f4fbff', '#bcd6e8', '#ffffff'],
  stone: ['#8a8f98', '#555a63', '#b4bac4'],
  lava: ['#ff7a18', '#3a0d05', '#ffd166'],
  ash: ['#5c5c63', '#2b2b30', '#8d8d96'],
  dock: ['#a86f3c', '#6b4220', '#c8925a'],
  water: ['#3a8fd8', '#17508f', '#9fd3ff'],
  underwater: ['#e3cf9a', '#a68b52', '#f6ecc8'],
};
