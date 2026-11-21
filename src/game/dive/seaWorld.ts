/**
 * O MUNDO SUBMERSO (núcleo puro): o fundo do mar ESPELHA o mundo da superfície, tile por tile. Todo tile de água da
 * superfície é água navegável aqui embaixo; terra vira rocha. Dá para mergulhar de qualquer ponto da costa e emergir em
 * qualquer ponto da costa. Nada é sorteado a cada quadro: tudo sai de funções determinísticas (mesma semente = mesmo mundo).
 *
 * Camadas:
 *  - grade de códigos (`getSeaGrid`): rocha, água rasa, água funda, faixa de costa (superfície), bolsão de ar, pilar de rocha,
 *    fumarola e água gelada;
 *  - distância da costa (profundidade): define raso, meio e fundo (o fundo tem pressão);
 *  - bolsões de ar em malha: o oceano nunca fica sem lugar para respirar a uma distância absurda;
 *  - entradas (portais) para os 9 locais (naufrágio, caverna, ruínas, cidade...), junto ao cais de cada ilha;
 *  - baús e criaturas por região, gerados por área (chunks) quando o jogador chega perto.
 */
import { FERRY_DOCKS, REGION_ANCHORS, WORLD_TILES_H, WORLD_TILES_W, getWorldTile } from '@/game/world/worldGen';
import { SITES } from './diveSites';

export const SEA_W = WORLD_TILES_W;
export const SEA_H = WORLD_TILES_H;

/** Códigos da grade. */
export const SEA = { ROCK: 0, WATER: 1, DEEP: 2, SHORE: 3, AIR: 4, PILLAR: 5, VENT: 6, COLD: 7 } as const;
export type SeaCode = (typeof SEA)[keyof typeof SEA];

/** Caractere equivalente (o mesmo alfabeto dos locais de mergulho: '#' rocha, '.' água, ':' funda, 'U' costa, 'A' ar, '~' fumarola, 'k' gelo). */
export const SEA_CHAR: Record<number, string> = { 0: '#', 1: '.', 2: ':', 3: 'U', 4: 'A', 5: '#', 6: '~', 7: 'k' };

/** Limites de profundidade em tiles de distância da costa. */
export const DEPTH = { shallow: 14, mid: 44, deep: 44, abyss: 110 } as const;

export type SeaZone = 'shore' | 'shallow' | 'mid' | 'deep' | 'abyss';
export type SeaMood = 'open' | 'reef' | 'wreck' | 'cave' | 'ruins' | 'vent' | 'abyss' | 'lagoon' | 'city' | 'ice';

// ---- hash determinístico --------------------------------------------------------------------------------------
export function hash2(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export interface SeaGrid {
  /** Código por tile (índice y * SEA_W + x). */
  code: Uint8Array;
  /** Distância da costa em 1/3 de tile (transformada de distância 3-4). */
  dist: Uint16Array;
  /** Bolsões de ar: centro de cada um. */
  pockets: { x: number; y: number }[];
}

let grid: SeaGrid | null = null;

/** Tile é água navegável do mar (não conta lagos fechados? conta: dá para mergulhar em lago também). */
function waterAt(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < SEA_W && y < SEA_H && getWorldTile(x, y) === 'water';
}

/** Tamanho das malhas de bolsão de ar: perto da costa mais denso, no fundo mais espaçado (o fundo exige planejamento). */
export const POCKET_CELL = { near: 36, far: 64 } as const;

const nearAnchor = (x: number, y: number, a: { x: number; y: number }, r: number) => Math.hypot(x - a.x, y - a.y) < r;

/** Mood da região do mar (muda a cor, os perigos e as criaturas). */
export function moodAt(x: number, y: number): SeaMood {
  const D = FERRY_DOCKS;
  if (nearAnchor(x, y, D.camp.boat, 130)) return 'lagoon';
  if (nearAnchor(x, y, D.dogisland.boat, 150)) return 'city';
  if (nearAnchor(x, y, D.gelo.boat, 140)) return 'ice';
  if (nearAnchor(x, y, D.trevas.boat, 170)) return 'abyss';
  if (nearAnchor(x, y, REGION_ANCHORS.vulcao, 170)) return 'vent';
  if (nearAnchor(x, y, D.misteriosa.boat, 130)) return 'cave';
  if (nearAnchor(x, y, D.fragments.boat, 140)) return 'ruins';
  if (nearAnchor(x, y, D.main_west.boat, 140)) return 'wreck';
  if (nearAnchor(x, y, D.main.boat, 150)) return 'reef';
  return 'open';
}

/** Constrói (uma vez) a grade do mar. ~0,2 s. */
export function getSeaGrid(): SeaGrid {
  if (grid) return grid;
  const N = SEA_W * SEA_H;
  const water = new Uint8Array(N);
  for (let y = 0; y < SEA_H; y++) for (let x = 0; x < SEA_W; x++) if (getWorldTile(x, y) === 'water') water[y * SEA_W + x] = 1;

  // distância da costa: chamfer 3-4 (duas passadas). Terra = 0.
  const INF = 60000;
  const dist = new Uint16Array(N);
  for (let i = 0; i < N; i++) dist[i] = water[i] ? INF : 0;
  for (let y = 0; y < SEA_H; y++) {
    for (let x = 0; x < SEA_W; x++) {
      const i = y * SEA_W + x;
      if (!water[i]) continue;
      let d = dist[i];
      if (x > 0) d = Math.min(d, dist[i - 1] + 3);
      if (y > 0) {
        d = Math.min(d, dist[i - SEA_W] + 3);
        if (x > 0) d = Math.min(d, dist[i - SEA_W - 1] + 4);
        if (x < SEA_W - 1) d = Math.min(d, dist[i - SEA_W + 1] + 4);
      }
      dist[i] = d;
    }
  }
  for (let y = SEA_H - 1; y >= 0; y--) {
    for (let x = SEA_W - 1; x >= 0; x--) {
      const i = y * SEA_W + x;
      if (!water[i]) continue;
      let d = dist[i];
      if (x < SEA_W - 1) d = Math.min(d, dist[i + 1] + 3);
      if (y < SEA_H - 1) {
        d = Math.min(d, dist[i + SEA_W] + 3);
        if (x < SEA_W - 1) d = Math.min(d, dist[i + SEA_W + 1] + 4);
        if (x > 0) d = Math.min(d, dist[i + SEA_W - 1] + 4);
      }
      dist[i] = d;
    }
  }
  // borda do mapa conta como terra (parede)
  const tiles = (d: number) => d / 3;

  const code = new Uint8Array(N);
  for (let y = 0; y < SEA_H; y++) {
    for (let x = 0; x < SEA_W; x++) {
      const i = y * SEA_W + x;
      if (!water[i]) continue;
      const t = tiles(dist[i]);
      if (x === 0 || y === 0 || x === SEA_W - 1 || y === SEA_H - 1) code[i] = SEA.ROCK;
      else if (t <= 3.4) code[i] = SEA.SHORE; // faixa de superfície: até ~3 tiles da terra
      else code[i] = t > DEPTH.deep ? SEA.DEEP : SEA.WATER;
    }
  }

  // fumarolas (região do vulcão) e água gelada (ilha do gelo): manchas 3x3 por hash
  for (let y = 2; y < SEA_H - 2; y += 3) {
    for (let x = 2; x < SEA_W - 2; x += 3) {
      const i = y * SEA_W + x;
      if (code[i] !== SEA.WATER && code[i] !== SEA.DEEP) continue;
      const mood = moodAt(x, y);
      const r = hash2(x, y, 11);
      if (mood === 'vent' && r < 0.045 && tiles(dist[i]) > 8) paint(code, x, y, 1, SEA.VENT);
      else if (mood === 'ice' && r < 0.05 && tiles(dist[i]) > 8) paint(code, x, y, 1, SEA.COLD);
    }
  }

  // pilares de rocha 2x2 (cobertura e obstáculo): fora da faixa de costa
  for (let y = 2; y < SEA_H - 3; y += 2) {
    for (let x = 2; x < SEA_W - 3; x += 2) {
      const i = y * SEA_W + x;
      if (code[i] !== SEA.WATER && code[i] !== SEA.DEEP) continue;
      if (tiles(dist[i]) < 9) continue;
      if (hash2(x, y, 5) < 0.012) {
        let ok = true;
        for (let dy = 0; dy < 2 && ok; dy++) for (let dx = 0; dx < 2; dx++) { const c = code[(y + dy) * SEA_W + x + dx]; if (c !== SEA.WATER && c !== SEA.DEEP) ok = false; }
        if (ok) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) code[(y + dy) * SEA_W + x + dx] = SEA.PILLAR;
      }
    }
  }

  // bolsões de ar: um por célula da malha (perto da costa: 36; no fundo: 64), 3x3, com margem para caber na célula
  const pockets: { x: number; y: number }[] = [];
  const place = (cell: number, deepCells: boolean) => {
    for (let cy = 0; cy * cell < SEA_H; cy++) {
      for (let cx = 0; cx * cell < SEA_W; cx++) {
        // tenta várias posições da célula até achar água livre para o bolsão 3x3 (uma célula só some se for toda terra/rocha)
        for (let attempt = 0; attempt < 10; attempt++) {
          const px = cx * cell + 2 + Math.floor(hash2(cx, cy, 21 + cell + attempt * 131) * (cell - 5));
          const py = cy * cell + 2 + Math.floor(hash2(cx, cy, 33 + cell + attempt * 137) * (cell - 5));
          if (px < 2 || py < 2 || px >= SEA_W - 2 || py >= SEA_H - 2) continue;
          const ci = py * SEA_W + px;
          if (code[ci] !== SEA.WATER && code[ci] !== SEA.DEEP) continue;
          if ((tiles(dist[ci]) > DEPTH.deep) !== deepCells) continue;
          let ok = true;
          for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) { const c = code[(py + dy) * SEA_W + px + dx]; if (c === SEA.ROCK || c === SEA.PILLAR || c === SEA.SHORE) ok = false; }
          if (!ok) continue;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) code[(py + dy) * SEA_W + px + dx] = SEA.AIR;
          pockets.push({ x: px, y: py });
          break;
        }
      }
    }
  };
  place(POCKET_CELL.near, false);
  place(POCKET_CELL.far, true);

  grid = { code, dist, pockets };
  return grid;
}

function paint(code: Uint8Array, cx: number, cy: number, r: number, v: number) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const i = (cy + dy) * SEA_W + cx + dx;
    if (code[i] === SEA.WATER || code[i] === SEA.DEEP) code[i] = v;
  }
}

/** Código do tile (fora do mapa = rocha). */
export function seaCode(x: number, y: number): number {
  if (x < 0 || y < 0 || x >= SEA_W || y >= SEA_H) return SEA.ROCK;
  return getSeaGrid().code[y * SEA_W + x];
}

/** Caractere do tile no alfabeto dos locais de mergulho. */
export function seaChar(x: number, y: number): string {
  return SEA_CHAR[seaCode(x, y)];
}

export function isSeaSolid(x: number, y: number): boolean {
  const c = seaCode(x, y);
  return c === SEA.ROCK || c === SEA.PILLAR;
}

/** Distância da costa em tiles. */
export function coastTiles(x: number, y: number): number {
  if (x < 0 || y < 0 || x >= SEA_W || y >= SEA_H) return 0;
  return getSeaGrid().dist[y * SEA_W + x] / 3;
}

export function zoneAt(x: number, y: number): SeaZone {
  const c = seaCode(x, y);
  if (c === SEA.SHORE) return 'shore';
  const t = coastTiles(x, y);
  return t > DEPTH.abyss ? 'abyss' : t > DEPTH.deep ? 'deep' : t > DEPTH.shallow ? 'mid' : 'shallow';
}

/** Respirável (superfície ou bolsão de ar). */
export function isBreathableSea(x: number, y: number): boolean {
  const c = seaCode(x, y);
  return c === SEA.SHORE || c === SEA.AIR;
}

// ---- começar e terminar o mergulho --------------------------------------------------------------------------------
const SURFACE_WALKABLE = new Set(['grass', 'path', 'sand', 'stone', 'snow', 'ash', 'dock']);

/** Tile de água mais perto para começar o mergulho a partir de um ponto da superfície (null se não há mar por perto). */
export function nearestSeaStart(tx: number, ty: number, radius = 3): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bd = 1e9;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = tx + dx;
      const y = ty + dy;
      if (!waterAt(x, y) || isSeaSolid(x, y)) continue;
      const d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; best = { x, y }; }
    }
  }
  return best;
}

/** Perto do mar (dá para mergulhar daqui)? */
export function canDiveFrom(tx: number, ty: number): boolean {
  return nearestSeaStart(tx, ty, 2) !== null;
}

/**
 * Onde o jogador pisa ao emergir: o tile de terra andável mais perto do ponto onde subiu (anéis crescentes até 14 tiles).
 * Nunca devolve tile sólido; se não achar nada, null (quem chama volta ao ponto de partida do mergulho).
 */
export function findLanding(tx: number, ty: number, maxRing = 14): { x: number; y: number } | null {
  for (let r = 1; r <= maxRing; r++) {
    let best: { x: number; y: number } | null = null;
    let bd = 1e9;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = tx + dx;
        const y = ty + dy;
        if (x < 1 || y < 1 || x >= SEA_W - 1 || y >= SEA_H - 1) continue;
        if (!SURFACE_WALKABLE.has(getWorldTile(x, y))) continue;
        // precisa ter pelo menos um vizinho andável (não é uma pedrinha isolada) e o tile não pode estar cercado por sólido
        let free = 0;
        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (SURFACE_WALKABLE.has(getWorldTile(x + ax, y + ay))) free++;
        if (free < 2) continue;
        const d = Math.hypot(dx, dy);
        if (d < bd) { bd = d; best = { x, y }; }
      }
    }
    if (best) return best;
  }
  return null;
}

// ---- ilha da costa (para as travessias: mergulhou de uma ilha e emergiu em outra) -------------------------------------
/** Ilha (real) mais perto de um ponto da costa. Id do cais (ex.: 'main_west' conta como 'main'). */
export function islandNear(tx: number, ty: number): string {
  let best = 'main';
  let bd = 1e9;
  for (const [key, d] of Object.entries(FERRY_DOCKS)) {
    const dd = Math.hypot(tx - d.anchor.x, ty - d.anchor.y);
    if (dd < bd) { bd = dd; best = key; }
  }
  return best;
}

// ---- entradas dos locais -----------------------------------------------------------------------------------------
export interface Portal {
  siteId: string;
  x: number;
  y: number;
  /** Ilha do cais (id do FERRY_DOCKS). */
  dock: string;
}

let portals: Portal[] | null = null;

/** Portais dos 9 locais, a ~14 a 30 tiles do cais da ilha, em água aberta e sem rocha em volta. */
export function getPortals(): Portal[] {
  if (portals) return portals;
  const g = getSeaGrid();
  const out: Portal[] = [];
  for (const site of Object.values(SITES)) {
    if (!site.island) continue;
    const dock = FERRY_DOCKS[site.island] ?? FERRY_DOCKS[Object.keys(FERRY_DOCKS).find((k) => FERRY_DOCKS[k].island === site.island) ?? 'main'];
    const key = Object.keys(FERRY_DOCKS).find((k) => FERRY_DOCKS[k] === dock) ?? site.island;
    let found: { x: number; y: number } | null = null;
    for (let r = 14; r <= 60 && !found; r++) {
      for (let a = 0; a < 48 && !found; a++) {
        const ang = (a / 48) * Math.PI * 2 + hash2(r, key.length, 3) * 0.5;
        const x = Math.round(dock.boat.x + Math.cos(ang) * r);
        const y = Math.round(dock.boat.y + Math.sin(ang) * r);
        if (x < 4 || y < 4 || x >= SEA_W - 4 || y >= SEA_H - 4) continue;
        let clear = true;
        for (let dy = -2; dy <= 2 && clear; dy++) for (let dx = -2; dx <= 2; dx++) { const c = g.code[(y + dy) * SEA_W + x + dx]; if (c !== SEA.WATER && c !== SEA.DEEP) clear = false; }
        if (clear && g.dist[y * SEA_W + x] / 3 >= 6) found = { x, y };
      }
    }
    if (found) out.push({ siteId: site.id, x: found.x, y: found.y, dock: key });
  }
  portals = out;
  return out;
}

export function portalAt(x: number, y: number, radius = 1.6): Portal | null {
  for (const p of getPortals()) if (Math.hypot(p.x - x, p.y - y) <= radius) return p;
  return null;
}

// ---- onde reaparecer (nunca dentro da parede) -------------------------------------------------------------------------
/** O tile e os vizinhos a até `margin` tiles não são rocha nem pilar? (margin 0 = só o próprio tile.) */
function openWithMargin(x: number, y: number, margin: number): boolean {
  for (let dy = -margin; dy <= margin; dy++) for (let dx = -margin; dx <= margin; dx++) if (isSeaSolid(x + dx, y + dy)) return false;
  return true;
}

/**
 * Tile de mar livre mais perto de (x, y), a pelo menos `minDist` tiles dele (anéis crescentes até `maxRing`).
 * Serve para o jogador reaparecer no mar sem nascer dentro de um pilar de rocha (ficaria preso: toda direção bloqueada).
 */
export function clearSeaTile(x: number, y: number, opt: { minDist?: number; margin?: number; maxRing?: number } = {}): { x: number; y: number } | null {
  const minDist = opt.minDist ?? 0;
  const margin = opt.margin ?? 0;
  const maxRing = opt.maxRing ?? 24;
  for (let r = Math.max(0, Math.floor(minDist)); r <= maxRing; r++) {
    let best: { x: number; y: number } | null = null;
    let bd = 1e9;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (r > 0 && Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const d = Math.hypot(dx, dy);
        if (d < minDist || d >= bd) continue;
        if (!openWithMargin(x + dx, y + dy, margin)) continue;
        best = { x: x + dx, y: y + dy };
        bd = d;
      }
    }
    if (best) return best;
  }
  return null;
}

/**
 * Onde o jogador volta ao mar depois de sair de um local: 3 tiles abaixo da entrada (fora do alcance do botão de entrar) quando
 * esse tile está livre; senão o tile livre mais perto que fique fora desse alcance. Nunca devolve tile sólido.
 */
export function seaReturnTile(portal: { x: number; y: number }): { x: number; y: number } {
  const pref = { x: portal.x, y: portal.y + 3 };
  if (openWithMargin(pref.x, pref.y, 1)) return pref;
  return clearSeaTile(portal.x, portal.y, { minDist: 2.5, margin: 1 }) ?? clearSeaTile(portal.x, portal.y, { minDist: 2.5 }) ?? { x: portal.x, y: portal.y };
}

// ---- baús do mar aberto ----------------------------------------------------------------------------------------------
export const CHEST_CELL = 48;

export interface SeaChest {
  id: string;
  x: number;
  y: number;
  coins: number;
  xp: number;
  items: Record<string, number>;
}

const CHEST_LOOT: Record<'shallow' | 'mid' | 'deep', Record<string, number>[]> = {
  shallow: [{ kelp_snack: 2 }, { bubble_potion: 1 }, { sea_shell: 1 }, { bubble_potion: 2 }],
  mid: [{ coral_shard: 1 }, { sunken_coin: 2 }, { air_flask: 1 }, { bubble_potion: 2, pearl: 1 }],
  deep: [{ pearl: 1 }, { air_flask: 2 }, { diver_elixir: 1 }, { coral_shard: 2, pearl: 1 }],
};

/** Baú da célula (ou null). Determinístico: mesma célula, mesmo baú, com o mesmo id. */
export function chestInCell(cx: number, cy: number): SeaChest | null {
  if (hash2(cx, cy, 71) > 0.55) return null;
  const x = cx * CHEST_CELL + 3 + Math.floor(hash2(cx, cy, 73) * (CHEST_CELL - 6));
  const y = cy * CHEST_CELL + 3 + Math.floor(hash2(cx, cy, 79) * (CHEST_CELL - 6));
  const c = seaCode(x, y);
  if (c !== SEA.WATER && c !== SEA.DEEP) return null;
  if (coastTiles(x, y) < 5) return null;
  const z = coastTiles(x, y) > DEPTH.deep ? 'deep' : coastTiles(x, y) > DEPTH.shallow ? 'mid' : 'shallow';
  const loot = CHEST_LOOT[z];
  const items = loot[Math.min(loot.length - 1, Math.floor(hash2(cx, cy, 83) * loot.length))];
  const scale = z === 'deep' ? 2.2 : z === 'mid' ? 1.4 : 1;
  return { id: `w_${cx}_${cy}`, x, y, coins: Math.round((25 + hash2(cx, cy, 89) * 55) * scale), xp: Math.round(20 * scale), items };
}

/** Baús das células ao redor de um ponto (raio em células). */
export function chestsNear(tx: number, ty: number, cells = 1): SeaChest[] {
  const out: SeaChest[] = [];
  const cx0 = Math.floor(tx / CHEST_CELL);
  const cy0 = Math.floor(ty / CHEST_CELL);
  for (let cy = cy0 - cells; cy <= cy0 + cells; cy++) for (let cx = cx0 - cells; cx <= cx0 + cells; cx++) { const c = chestInCell(cx, cy); if (c) out.push(c); }
  return out;
}

// ---- criaturas por região (chunks) -------------------------------------------------------------------------------------
export const CHUNK = 32;

export interface SeaSpawn {
  creature: string;
  /** Posição em tiles. */
  x: number;
  y: number;
}

type Table = [string, number][];
const SHALLOW_T: Table = [['clownfish', 20], ['turtle', 10], ['cleaner', 8], ['angel', 18], ['anchovy', 18], ['crab', 12], ['jelly_blue', 14]];
const MID_T: Table = [['crab', 14], ['jelly_blue', 14], ['angel', 10], ['anchovy', 10], ['moray', 14], ['jelly_pink', 14], ['octopus', 8], ['turtle', 6], ['cleaner', 6]];
const DEEP_T: Table = [['angler', 20], ['octopus', 16], ['moray', 12], ['jelly_pink', 10]];

function pickWeighted(t: Table, r: number, extra?: Table): string {
  const all = extra ? [...t, ...extra] : t;
  const total = all.reduce((s, e) => s + e[1], 0);
  let v = r * total;
  for (const [id, w] of all) { v -= w; if (v <= 0) return id; }
  return all[all.length - 1][0];
}

/** Criaturas de um chunk (determinístico). `questWhale`: a baleia só aparece depois da missão que a chama. */
export function chunkSpawns(cx: number, cy: number, opt: { questWhale?: boolean } = {}): SeaSpawn[] {
  const out: SeaSpawn[] = [];
  const n = 1 + Math.floor(hash2(cx, cy, 91) * 3); // 1 a 3
  for (let i = 0; i < n; i++) {
    const x = cx * CHUNK + 2 + Math.floor(hash2(cx * 7 + i, cy, 97) * (CHUNK - 4));
    const y = cy * CHUNK + 2 + Math.floor(hash2(cx, cy * 7 + i, 101) * (CHUNK - 4));
    const c = seaCode(x, y);
    if (c !== SEA.WATER && c !== SEA.DEEP && c !== SEA.VENT && c !== SEA.COLD) continue;
    const t = coastTiles(x, y);
    const mood = moodAt(x, y);
    const r = hash2(x, y, 103 + i);
    let id: string;
    if (t > DEPTH.deep) {
      const extra: Table = [];
      if (t > 70) extra.push(['jelly_violet', 8]);
      if (opt.questWhale && t > 60) extra.push(['whale', 3]);
      id = pickWeighted(DEEP_T, r, extra);
      if (mood === 'abyss' && hash2(x, y, 107) < 0.25) id = 'angler';
    } else if (t > DEPTH.shallow) {
      id = pickWeighted(MID_T, r, mood === 'vent' ? [['octopus', 10]] : mood === 'wreck' ? [['moray', 8]] : mood === 'cave' ? [['jelly_pink', 8], ['jelly_blue', 8]] : undefined);
    } else {
      id = pickWeighted(SHALLOW_T, r);
    }
    out.push({ creature: id, x, y });
  }
  return out;
}

/** Quem espera na entrada: o chefe do abismo e os mini-chefes ficam nos locais, não no mar aberto. */
export const SEA_ONLY_IN_SITES = ['kraken', 'angler_king', 'octopus_baby'] as const;

/** Nome da região do mar, para o aviso de morte e a interface ("Mar do Recife", "Abismo das Trevas"...). */
export const SEA_REGION_NAME: Record<SeaMood, string> = {
  open: 'Mar Aberto',
  reef: 'Mar do Recife',
  wreck: 'Águas do Naufrágio',
  cave: 'Águas da Caverna',
  ruins: 'Águas das Ruínas',
  vent: 'Mar das Fumarolas',
  abyss: 'Abismo das Trevas',
  lagoon: 'Águas do Acampamento',
  city: 'Águas de Atlântida',
  ice: 'Mar Gelado',
};

export function regionNameAt(x: number, y: number): string {
  return SEA_REGION_NAME[moodAt(x, y)];
}
