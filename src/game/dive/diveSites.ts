/**
 * LOCAIS DE MERGULHO: recifes, naufrágios, cavernas, ruínas, a cidade submersa e as TRAVESSIAS entre ilhas.
 * Cada local é uma grade de tiles (TILE px) montada a partir de dados: salas escavadas na rocha, bolsões de ar, baús,
 * criaturas, NPCs, portões para outros locais e paredes secretas. Dados puros: nada de React aqui.
 * Os mapas são validados por testes (todo baú e portão alcançável, bordas fechadas, travessias possíveis com os recursos normais).
 */
import type { IslandId } from '@/game/state/islandState';

export const TILE = 32;
/** Velocidade de nado do jogador (px/s): a base de todos os cálculos de travessia. */
export const SWIM_SPEED = 256 / 3; // 2,67 tiles por segundo

export interface Pt {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DiveChest {
  id: string;
  x: number;
  y: number;
  /** Escondido atrás de parede secreta ou em lugar difícil (recompensa Secret). */
  hidden?: boolean;
  coins?: number;
  xp?: number;
  items?: Record<string, number>;
  armor?: string;
  /** Bandeira da história acionada ao abrir (alimenta missões). */
  flag?: string;
}
export interface DiveSpawn extends Pt {
  creature: string;
}
export interface DiveNpc extends Pt {
  /** Id do NPC aquático (diveNpcs.ts). */
  npc: string;
}
export interface DiveGate extends Pt {
  /** Local de destino. */
  to: string;
  /** Portão de chegada no destino. */
  toGate: string;
  id: string;
}
export interface DiveSite {
  id: string;
  name: string;
  /** Ilha cujo cais dá acesso ao local (a entrada fica no mar, junto ao cais). */
  island?: IslandId;
  kind: 'hub';
  w: number;
  h: number;
  /** Salas e corredores de água (todo o resto é rocha). */
  rooms: Rect[];
  /** Pilares de rocha dentro das salas. */
  rocks?: Rect[];
  /** Saída para o mar aberto (respirável): volta ao portal de onde o jogador entrou. */
  exit: Pt;
  /** Bolsões de ar (respiráveis). */
  air: Pt[];
  chests?: DiveChest[];
  spawns?: DiveSpawn[];
  npcs?: DiveNpc[];
  gates?: DiveGate[];
  /** Paredes secretas: parecem rocha até serem descobertas (botão de interagir por perto). */
  hidden?: { id: string; x: number; y: number }[];
  /** Zona profunda: pressão. */
  deep?: Rect[];
  /** Fumarolas: dano de fogo. */
  vents?: Rect[];
  /** Água gelada: dano de frio. */
  cold?: Rect[];
  /** Correntes: empurram o jogador (px/s). */
  currents?: { rect: Rect; dx: number; dy: number }[];
  /** Bandeira da história necessária para entrar (sem ela, a entrada diz o que falta). */
  requiresFlag?: string;
  /** Gatilho do chefe Sea Beast (só no abismo). */
  bossGate?: Pt;
  /** Primeira vez no local: cena curta (id em diveScenes.ts). */
  intro?: string;
  /** Dica de interface do ambiente. */
  mood: 'reef' | 'wreck' | 'cave' | 'ruins' | 'vent' | 'abyss' | 'lagoon' | 'city' | 'ice' | 'tunnel';
}

const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

export const SITES: Record<string, DiveSite> = {
  recife_pato: {
    id: 'recife_pato', name: 'Recife do Pato', island: 'main', kind: 'hub', mood: 'reef', w: 24, h: 13,
    rooms: [R(1, 1, 22, 11)],
    rocks: [R(6, 4, 2, 2), R(12, 7, 2, 2), R(17, 3, 2, 2), R(9, 9, 1, 2)],
    exit: { x: 2, y: 1 }, air: [{ x: 12, y: 2 }],
    chests: [
      { id: 'recife_bau_1', x: 20, y: 10, coins: 60, xp: 40, items: { bubble_potion: 2 }, flag: 'dive_first_chest' },
      { id: 'recife_bau_2', x: 4, y: 10, coins: 30, items: { sea_shell: 1, kelp_snack: 2 } },
    ],
    spawns: [
      { x: 8, y: 7, creature: 'clownfish' }, { x: 15, y: 5, creature: 'turtle' }, { x: 11, y: 4, creature: 'crab' },
      { x: 19, y: 7, creature: 'jelly_blue' }, { x: 5, y: 8, creature: 'anchovy' },
    ],
    npcs: [{ x: 3, y: 3, npc: 'instrutor_pato' }],
    intro: 'recife',
  },
  naufragio: {
    id: 'naufragio', name: 'Naufrágio do Capitão Meme', island: 'main_west', kind: 'hub', mood: 'wreck', w: 26, h: 14,
    rooms: [R(1, 1, 24, 4), R(1, 5, 5, 8), R(6, 8, 18, 4), R(19, 5, 6, 3), R(9, 5, 4, 2)],
    rocks: [R(10, 2, 1, 2), R(16, 2, 1, 2), R(12, 9, 1, 2)],
    exit: { x: 2, y: 1 }, air: [{ x: 22, y: 6 }],
    chests: [
      { id: 'naufragio_bau_1', x: 23, y: 10, coins: 120, xp: 60, items: { wreck_logbook: 1, sunken_coin: 2 }, flag: 'wreck_logbook_found' },
      { id: 'naufragio_cabine', x: 7, y: 6, hidden: true, coins: 200, xp: 150, items: { abyss_pearl: 1 }, flag: 'secret_cabin_found' },
    ],
    spawns: [
      { x: 8, y: 3, creature: 'moray' }, { x: 14, y: 10, creature: 'moray' }, { x: 20, y: 6, creature: 'jelly_pink' },
      { x: 5, y: 8, creature: 'cleaner' },
    ],
    npcs: [{ x: 11, y: 5, npc: 'fantasma_capitao' }],
    hidden: [{ id: 'h_cabine', x: 8, y: 6 }],
    intro: 'naufragio',
  },
  caverna: {
    id: 'caverna', name: 'Caverna das Águas-vivas', island: 'misteriosa', kind: 'hub', mood: 'cave', w: 24, h: 14,
    rooms: [R(1, 1, 8, 4), R(4, 5, 3, 6), R(1, 11, 12, 2), R(9, 3, 10, 3), R(14, 6, 3, 6), R(17, 9, 6, 3), R(19, 1, 4, 5)],
    rocks: [R(11, 4, 1, 1)],
    exit: { x: 2, y: 1 }, air: [{ x: 5, y: 8 }, { x: 21, y: 2 }],
    chests: [
      { id: 'caverna_bau_1', x: 21, y: 10, coins: 150, xp: 80, items: { air_flask: 1, coral_shard: 2 } },
      { id: 'caverna_bau_2', x: 2, y: 12, coins: 80, items: { pearl: 1 } },
    ],
    spawns: [
      { x: 6, y: 3, creature: 'jelly_blue' }, { x: 12, y: 4, creature: 'jelly_pink' }, { x: 15, y: 9, creature: 'jelly_blue' },
      { x: 9, y: 12, creature: 'octopus' }, { x: 21, y: 4, creature: 'cleaner' },
    ],
    intro: 'caverna',
  },
  ruinas: {
    id: 'ruinas', name: 'Ruínas dos Fragmentos', island: 'fragments', kind: 'hub', mood: 'ruins', w: 26, h: 14,
    rooms: [R(1, 1, 7, 6), R(8, 3, 4, 2), R(12, 1, 7, 6), R(19, 3, 5, 2), R(4, 7, 3, 5), R(4, 11, 18, 2), R(20, 7, 4, 5)],
    rocks: [R(14, 3, 2, 2)],
    exit: { x: 2, y: 1 }, air: [{ x: 16, y: 2 }],
    chests: [
      { id: 'ruinas_bau_1', x: 22, y: 9, coins: 180, xp: 120, items: { relic_tablet: 1 }, flag: 'ruins_tablet_found' },
      { id: 'ruinas_secreto', x: 8, y: 9, hidden: true, coins: 300, xp: 220, items: { leviathan_scale: 1 }, flag: 'secret_ruins_found' },
    ],
    spawns: [
      { x: 6, y: 4, creature: 'crab' }, { x: 16, y: 4, creature: 'moray' }, { x: 9, y: 11, creature: 'angler' }, { x: 21, y: 4, creature: 'angel' },
    ],
    npcs: [{ x: 10, y: 4, npc: 'pesquisadora_lia' }],
    hidden: [{ id: 'h_ruinas', x: 7, y: 9 }],
    intro: 'ruinas',
  },
  atlantis: {
    id: 'atlantis', name: 'Cidade Submersa de Atlântida', island: 'dogisland', kind: 'hub', mood: 'city', w: 28, h: 15,
    rooms: [R(1, 1, 26, 3), R(1, 4, 4, 9), R(23, 4, 4, 9), R(5, 7, 18, 3), R(8, 4, 12, 2), R(8, 10, 12, 3)],
    rocks: [R(10, 11, 2, 1), R(16, 11, 2, 1)],
    exit: { x: 2, y: 1 }, air: [{ x: 14, y: 2 }, { x: 14, y: 8 }],
    chests: [
      { id: 'atlantis_bau_1', x: 25, y: 12, coins: 250, xp: 160, items: { atlantis_key: 1, pearl: 2 }, flag: 'atlantis_key_found' },
      { id: 'atlantis_coracao', x: 21, y: 5, hidden: true, coins: 500, xp: 400, items: { atlantis_heart: 1 }, armor: 'armor_gills', flag: 'secret_heart_found' },
    ],
    spawns: [
      { x: 8, y: 8, creature: 'turtle' }, { x: 20, y: 8, creature: 'clownfish' }, { x: 14, y: 5, creature: 'anchovy' },
      { x: 3, y: 10, creature: 'whale' }, { x: 18, y: 12, creature: 'angler' },
    ],
    npcs: [
      { x: 6, y: 2, npc: 'guardiao_tritao' }, { x: 12, y: 8, npc: 'mercadora_sirena' }, { x: 21, y: 2, npc: 'cientista_nemo' }, { x: 24, y: 8, npc: 'sereio_meme' },
    ],
    hidden: [{ id: 'h_atlantis', x: 22, y: 5 }],
    intro: 'atlantis',
  },
  lagoa: {
    id: 'lagoa', name: 'Lagoa do Acampamento', island: 'camp', kind: 'hub', mood: 'lagoon', w: 22, h: 12,
    rooms: [R(1, 1, 20, 10)],
    rocks: [R(5, 3, 2, 2), R(14, 5, 2, 2), R(9, 8, 3, 1)],
    exit: { x: 2, y: 1 }, air: [{ x: 11, y: 2 }, { x: 18, y: 9 }],
    chests: [{ id: 'lagoa_bau_1', x: 19, y: 9, coins: 90, xp: 60, items: { diver_badge: 1, bubble_potion: 2 }, flag: 'lagoon_badge' }],
    spawns: [
      { x: 8, y: 5, creature: 'turtle' }, { x: 16, y: 3, creature: 'clownfish' }, { x: 11, y: 8, creature: 'angel' }, { x: 4, y: 9, creature: 'jelly_blue' },
    ],
    npcs: [{ x: 7, y: 2, npc: 'pescador_sereno' }, { x: 17, y: 7, npc: 'mercador_cardume' }],
    intro: 'lagoa',
  },
  fumarolas: {
    id: 'fumarolas', name: 'Fumarolas do Vulcão', island: 'vulcao', kind: 'hub', mood: 'vent', w: 24, h: 13,
    rooms: [R(1, 1, 22, 11)],
    rocks: [R(5, 3, 1, 3), R(10, 6, 3, 1), R(17, 3, 1, 4), R(8, 9, 2, 2)],
    vents: [R(12, 2, 3, 2), R(6, 8, 2, 2), R(18, 9, 3, 2)],
    exit: { x: 2, y: 1 }, air: [{ x: 3, y: 10 }, { x: 21, y: 6 }],
    chests: [{ id: 'fumarolas_bau_1', x: 20, y: 10, coins: 220, xp: 140, items: { diver_elixir: 1, coral_shard: 2 } }],
    spawns: [
      { x: 14, y: 7, creature: 'octopus' }, { x: 9, y: 4, creature: 'crab' }, { x: 19, y: 4, creature: 'moray' }, { x: 15, y: 10, creature: 'kraken' },
    ],
    intro: 'fumarolas',
  },
  gruta: {
    id: 'gruta', name: 'Gruta Gelada', island: 'gelo', kind: 'hub', mood: 'ice', w: 24, h: 13,
    rooms: [R(1, 1, 8, 5), R(9, 2, 4, 2), R(13, 1, 9, 6), R(2, 6, 3, 5), R(2, 10, 18, 2), R(17, 7, 5, 4)],
    cold: [R(13, 1, 9, 6)],
    exit: { x: 2, y: 1 }, air: [{ x: 5, y: 3 }, { x: 3, y: 8 }],
    chests: [{ id: 'gruta_bau_1', x: 19, y: 9, coins: 260, xp: 180, items: { air_flask: 2, pearl: 1 } }],
    spawns: [
      { x: 16, y: 4, creature: 'angler' }, { x: 10, y: 10, creature: 'jelly_pink' }, { x: 6, y: 3, creature: 'cleaner' },
    ],
    intro: 'gruta',
  },
  abismo: {
    id: 'abismo', name: 'Abismo Sombrio', island: 'trevas', kind: 'hub', mood: 'abyss', w: 26, h: 14,
    rooms: [R(1, 1, 5, 3), R(1, 4, 24, 9), R(6, 1, 19, 3)],
    rocks: [R(6, 6, 2, 2), R(12, 9, 2, 2), R(18, 6, 2, 3), R(10, 5, 1, 1), R(3, 9, 3, 3)],
    deep: [R(1, 4, 24, 9)],
    exit: { x: 2, y: 1 }, air: [{ x: 3, y: 2 }, { x: 23, y: 2 }],
    chests: [
      { id: 'abismo_bau_1', x: 22, y: 11, coins: 400, xp: 300, items: { relic_tablet: 1, air_flask: 2 }, armor: 'armor_coral' },
      { id: 'abismo_secreto', x: 4, y: 10, hidden: true, coins: 600, xp: 500, items: { leviathan_scale: 1 }, flag: 'secret_abyss_found' },
    ],
    spawns: [
      { x: 9, y: 8, creature: 'angler' }, { x: 15, y: 6, creature: 'octopus' }, { x: 20, y: 10, creature: 'jelly_violet' }, { x: 8, y: 11, creature: 'moray' }, { x: 21, y: 6, creature: 'angler_king' },
    ],
    hidden: [{ id: 'h_abismo', x: 5, y: 10 }],
    bossGate: { x: 23, y: 8 },
    requiresFlag: 'dive_abyss_open',
    intro: 'abismo',
  },
};

/** Parede secreta -> missão secreta que ela revela na lista (bandeira `found:<missão>`). */
export const SECRET_MISSION_OF_WALL: Record<string, string> = {
  h_cabine: 'sec_mar_cabine',
  h_ruinas: 'sec_mar_ruinas',
  h_atlantis: 'sec_mar_coracao',
  h_abismo: 'sec_mar_abismo',
};

// ---- Rotas entre ilhas (as antigas "travessias"): agora o mar é aberto, então uma travessia é mergulhar na costa de uma
// ilha e emergir na costa de OUTRA, num mesmo mergulho. As 8 rotas abaixo (ids estáveis) alimentam missões e conquistas.
export interface CrossingDef {
  id: string;
  /** Cais de partida e de chegada (chaves de FERRY_DOCKS), em qualquer ordem. */
  a: string;
  b: string;
}

export const CROSSINGS: CrossingDef[] = [
  { id: 'cross_recife_naufragio', a: 'main', b: 'main_west' },
  { id: 'cross_naufragio_caverna', a: 'main_west', b: 'misteriosa' },
  { id: 'cross_caverna_ruinas', a: 'misteriosa', b: 'fragments' },
  { id: 'cross_ruinas_atlantis', a: 'fragments', b: 'dogisland' },
  { id: 'cross_atlantis_lagoa', a: 'dogisland', b: 'camp' },
  { id: 'cross_lagoa_fumarolas', a: 'camp', b: 'vulcao' },
  { id: 'cross_fumarolas_gruta', a: 'vulcao', b: 'gelo' },
  { id: 'cross_gruta_abismo', a: 'gelo', b: 'trevas' },
];

/** A rota (se for uma das 8) feita ao sair de `from` e emergir em `to`. */
export function crossingFor(from: string, to: string): CrossingDef | null {
  return CROSSINGS.find((c) => (c.a === from && c.b === to) || (c.a === to && c.b === from)) ?? null;
}

export const ALL_SITES: Record<string, DiveSite> = SITES;

/** Local de mergulho aberto pelo cais de cada ilha. */
export function siteForIsland(island: IslandId): DiveSite | null {
  return Object.values(SITES).find((s) => s.island === island) ?? null;
}

// ---- Grade ------------------------------------------------------------------------------------------------
/** '#' rocha, '.' água, ':' água funda, 'A' ar, 'U' superfície, 'H' parede secreta, '~' fumarola, 'k' gelo. */
export function buildGrid(site: DiveSite, revealed: ReadonlySet<string> = new Set()): string[][] {
  const g: string[][] = Array.from({ length: site.h }, () => Array.from({ length: site.w }, () => '#'));
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && y >= 0 && x < site.w && y < site.h) g[y][x] = c;
  };
  for (const r of site.rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(x, y, '.');
  for (const r of site.rocks ?? []) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(x, y, '#');
  for (const r of site.deep ?? []) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (g[y]?.[x] === '.') set(x, y, ':');
  for (const r of site.vents ?? []) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (g[y]?.[x] === '.') set(x, y, '~');
  for (const r of site.cold ?? []) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (g[y]?.[x] === '.') set(x, y, 'k');
  for (const a of site.air) set(a.x, a.y, 'A');
  if (site.exit.x >= 0) set(site.exit.x, site.exit.y, 'U');
  for (const h of site.hidden ?? []) set(h.x, h.y, revealed.has(h.id) ? '.' : 'H');
  // baús, criaturas, NPCs e portões ficam sempre em água aberta; garante isso
  const open = (p: Pt) => {
    if (g[p.y]?.[p.x] === '#') set(p.x, p.y, '.');
  };
  for (const c of site.chests ?? []) open(c);
  for (const s of site.spawns ?? []) open(s);
  for (const n of site.npcs ?? []) open(n);
  for (const gt of site.gates ?? []) open(gt);
  return g;
}

export function isSolidChar(c: string | undefined): boolean {
  return c === undefined || c === '#' || c === 'H';
}

/** Tile ao redor do ponto em px. */
export function tileAt(px: number, py: number): Pt {
  return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) };
}

/** Região respirável (superfície ou bolsão de ar)? */
export function isBreathableChar(c: string | undefined): boolean {
  return c === 'A' || c === 'U';
}

// ---- Análise de rotas (para planejar e testar travessias) -------------------------------------------------
/** Caminho mais curto (em passos de tiles) entre dois pontos por tiles não sólidos. -1 se não houver. */
export function pathLength(grid: string[][], from: Pt, to: Pt, treatHiddenAsOpen = false): number {
  const h = grid.length;
  const w = grid[0].length;
  const open = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && (!isSolidChar(grid[y][x]) || (treatHiddenAsOpen && grid[y][x] === 'H'));
  if (!open(from.x, from.y) || !open(to.x, to.y)) return -1;
  const dist = new Map<number, number>();
  const key = (x: number, y: number) => y * w + x;
  const q: Pt[] = [from];
  dist.set(key(from.x, from.y), 0);
  while (q.length) {
    const p = q.shift()!;
    const d = dist.get(key(p.x, p.y))!;
    if (p.x === to.x && p.y === to.y) return d;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (open(nx, ny) && !dist.has(key(nx, ny))) {
        dist.set(key(nx, ny), d + 1);
        q.push({ x: nx, y: ny });
      }
    }
  }
  return -1;
}

/** Segundos de nado para andar `tiles` passos. */
export function swimSeconds(tiles: number): number {
  return (tiles * TILE) / SWIM_SPEED;
}
