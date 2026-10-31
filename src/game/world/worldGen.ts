import type { TileType } from '@/types/game';
import { getExtractedTile, EXTRACTED_W, EXTRACTED_H } from './mapDecoder';

/**
 * v5 (this pass) - full rewrite: the terrain now comes directly from the
 * dono do projeto's own drawing (mapa.jpg), pixel-traced into tiles (see
 * mapData.ts/mapDecoder.ts and docs/AUDIT.md for the extraction method),
 * not procedurally generated. He was right that "inspired by" isn't
 * "exactly like what I drew" - this is the actual shapes: the maze, the
 * islands, the coastlines, the paths, all traced from his art instead of
 * approximated by an algorithm.
 *
 * What's still authored on top (the drawing doesn't encode this): every
 * building (with a real door and interior), the statue/monument/igloo
 * points, and two bonus areas (the medieval camp + dog-family island)
 * that predate the reference drawings and don't appear in them, kept
 * reachable by ferry in a strip below the traced map so they don't
 * disturb the real geography.
 */

export const CHUNK_SIZE = 24; // tiles per chunk side (minimap granularity only now)
const BONUS_STRIP_H = 300;
export const WORLD_TILES_W = EXTRACTED_W;
export const WORLD_TILES_H = EXTRACTED_H + BONUS_STRIP_H;
export const WORLD_CHUNKS_W = Math.ceil(WORLD_TILES_W / CHUNK_SIZE);
export const WORLD_CHUNKS_H = Math.ceil(WORLD_TILES_H / CHUNK_SIZE);

export function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
function inRect(x: number, y: number, r: Rect) {
  return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}
function rectCenter(r: Rect) {
  return { x: Math.round((r.x0 + r.x1) / 2), y: Math.round((r.y0 + r.y1) / 2) };
}

// ---- bonus strip (camp + dog island - predate the reference drawings, see header) ----
const STRIP_Y0 = EXTRACTED_H;
const CAMP_TILES: Rect = { x0: 260, y0: STRIP_Y0 + 60, x1: 540, y1: STRIP_Y0 + 220 };
const DOGISLAND_TILES: Rect = { x0: 1050, y0: STRIP_Y0 + 40, x1: 1400, y1: STRIP_Y0 + 260 };
export { CAMP_TILES, DOGISLAND_TILES };

function bonusStripTile(tx: number, ty: number): TileType {
  const h = hash2(tx, ty);
  if (inRect(tx, ty, CAMP_TILES)) {
    const border = tx === CAMP_TILES.x0 || tx === CAMP_TILES.x1 || ty === CAMP_TILES.y0 || ty === CAMP_TILES.y1;
    const midX = Math.round((CAMP_TILES.x0 + CAMP_TILES.x1) / 2);
    if (border) return ty === CAMP_TILES.y1 && Math.abs(tx - midX) <= 8 ? 'path' : 'wall';
    return h < 0.88 ? 'stone' : 'path';
  }
  if (inRect(tx, ty, DOGISLAND_TILES)) {
    if (h < 0.2) return 'sand';
    if (h < 0.88) return 'grass';
    if (h < 0.96) return 'tree';
    return 'rock';
  }
  return 'water';
}

// ---- buildings (unchanged mechanics from before: 3-tile door, forced
// clear apron so lucky/unlucky terrain rolls never box one in) ----
export type BuildingType = 'shop' | 'house' | 'hall' | 'cave' | 'guild';
interface Building {
  id: string;
  rect: Rect;
  type: BuildingType;
  doorX: number;
  doorY: number;
}
function makeBuilding(id: string, cx: number, cy: number, w: number, h: number, type: BuildingType): Building {
  const x0 = cx - Math.floor(w / 2);
  const y0 = cy - Math.floor(h / 2);
  const x1 = x0 + w - 1;
  const y1 = y0 + h - 1;
  return { id, rect: { x0, y0, x1, y1 }, type, doorX: Math.round((x0 + x1) / 2), doorY: y1 };
}

/** Same as makeBuilding, but the footprint grows UPWARD from the door row:
 * `bottomY` is the row of the door, `h` the full height of the art. Tall
 * facades (the hall, guild, casino tower, 6-tall shops) used to overhang
 * walkable tiles above a shorter footprint, so the player could walk "on
 * top of" the building - now the solid footprint covers the whole art. */
function makeTallBuilding(id: string, cx: number, bottomY: number, w: number, h: number, type: BuildingType): Building {
  const x0 = cx - Math.floor(w / 2);
  const x1 = x0 + w - 1;
  const y1 = bottomY;
  const y0 = y1 - h + 1;
  return { id, rect: { x0, y0, x1, y1 }, type, doorX: Math.round((x0 + x1) / 2), doorY: y1 };
}

// Coordinates below are the real drawing's building centroids (found by
// colour-blob detection on mapa.jpg, source-pixel space) times MAP_SCALE
// (2) - see docs/AUDIT.md. Not eyeballed: measured off the actual art.
const buildings: Building[] = [
  // Main island plaza cluster ("4 estruturas" from the brief). Centroids
  // compressed to ~half their originally-measured spread (see
  // docs/AUDIT.md): the buildings themselves were already a sensible
  // size, it was the DISTANCE between them (and PLAZA_CLEARING below)
  // that made the village read as an oversized, mostly-empty lot.
  // COMPACT VILLAGE (v6): the old plaza spread its 4 buildings ~30 tiles
  // apart; now they sit in a 2x2 block with a 2-tile gap between
  // neighbours (so the player can still squeeze between houses) and a
  // 3-tile alley between the two rows. Same idea for the other multi-
  // building villages below (volcano pair, hall + guild). Footprints now
  // match the facade art (BuildingSprite.tsx) so there are no invisible
  // walls beside a house: 5x5 houses, 5x5 shops (art is 6 tall).
  makeBuilding('casa_dogge', 872, 930, 5, 5, 'house'),
  makeBuilding('casa_gadigago', 879, 930, 5, 5, 'house'),
  makeTallBuilding('plaza_shop', 872, 940, 5, 6, 'shop'),
  makeBuilding('casa_iracema', 879, 938, 5, 5, 'house'),
  // Main island landmarks.
  makeBuilding('caverna', 518, 830, 10, 7, 'cave'),
  makeTallBuilding('salao_geral', 1228, 683, 8, 11, 'hall'),
  makeTallBuilding('guilda', 1236, 683, 4, 9, 'guild'),
  // Snow mountain.
  makeBuilding('casa_montanha', 100, 976, 6, 4, 'house'),
  // The red/blue pair of the drawing: the cabin plus the ice-island shop.
  makeTallBuilding('loja_gelo', 114, 977, 5, 6, 'shop'),
  // The refuge on top of the snow mountain (where the igloo clearing is).
  makeBuilding('casa_pico', 200, 555, 5, 5, 'house'),
  // Casino (Ilha Misteriosa).
  makeTallBuilding('loja_misteriosa', 1128, 172, 5, 8, 'shop'),
  // Vulcao.
  makeTallBuilding('loja_vulcao', 1888, 308, 5, 6, 'shop'),
  makeBuilding('descanso_vulcao', 1881, 306, 5, 5, 'house'),
  // Fragment islands.
  makeBuilding('loja_abandonada', 1690, 994, 5, 5, 'shop'),
  // Bonus strip.
  makeBuilding('salao_camp', 400, STRIP_Y0 + 170, 5, 5, 'house'),
];

/**
 * Torre dos Desafios (Parte 36): prédio de verdade nas Ilhas Fragmentadas, na
 * clareira de grama a leste da praia do cais oeste (âncora 1568,1039; ~33
 * passos). Não é um prédio com interior (não entra em `buildings`): a porta
 * mostra o botão ENTRAR, que abre a tela da torre. O retângulo é sólido e há
 * um chão de caminho em frente à porta. Validado por busca em largura no grid.
 */
const TOWER_CX = 1591;
const TOWER_BOTTOM_Y = 1030;
const TOWER_W = 4;
const TOWER_H = 6;
const towerX0 = TOWER_CX - Math.floor(TOWER_W / 2);
export const TOWER = {
  id: 'torre_desafios',
  rect: { x0: towerX0, y0: TOWER_BOTTOM_Y - TOWER_H + 1, x1: towerX0 + TOWER_W - 1, y1: TOWER_BOTTOM_Y } as Rect,
  doorX: Math.round((towerX0 + towerX0 + TOWER_W - 1) / 2),
  doorY: TOWER_BOTTOM_Y,
};
/**
 * Estruturas decorativas da praça (Parte 38): igreja, lanchonete, prédios de tijolo, casas, barraca de feira e
 * carrinho de sorvete. Sólidas (como o corpo de um prédio), sem interior. `fp` é o retângulo sólido em tiles;
 * `art` é o nome da imagem em assets/buildings (ver SceneryLayer) e `h` a altura do desenho em tiles (a arte
 * pode passar por cima de tiles acima do retângulo, como nos prédios altos). Posições validadas por busca em
 * largura: todas as portas, cais e a Torre continuam alcançáveis do ponto de partida.
 */
export interface SceneryDef {
  id: string;
  art: string;
  fp: Rect;
  h: number;
}
/** Chão sob as estruturas decorativas (índice ty*largura+tx -> tipo de tile), para o renderizador não pintar um bloco cinza. */
export const SCENERY_GROUND = new Map<number, TileType>();
export const SCENERY: SceneryDef[] = [
  { id: 'igreja', art: 'nb_igreja', fp: { x0: 886, y0: 926, x1: 890, y1: 929 }, h: 9 },
  { id: 'lanchonete', art: 'nb_lanchonete', fp: { x0: 886, y0: 947, x1: 891, y1: 950 }, h: 4.6 },
  { id: 'predio_tijolo_1', art: 'nb_tijolo1', fp: { x0: 845, y0: 928, x1: 849, y1: 931 }, h: 7.4 },
  { id: 'predio_tijolo_2', art: 'nb_tijolo2', fp: { x0: 853, y0: 928, x1: 858, y1: 931 }, h: 7.2 },
  { id: 'casa_vermelha', art: 'nb_casa_vermelha', fp: { x0: 836, y0: 936, x1: 841, y1: 939 }, h: 4.4 },
  { id: 'casa_pequena', art: 'nb_casa_pequena1', fp: { x0: 856, y0: 936, x1: 860, y1: 938 }, h: 3.6 },
  { id: 'barraca_feira', art: 'nb_barraca', fp: { x0: 889, y0: 935, x1: 891, y1: 936 }, h: 2.6 },
  { id: 'carrinho_sorvete', art: 'nb_sorvete', fp: { x0: 887, y0: 943, x1: 888, y1: 944 }, h: 3 },
  { id: 'casa_madeira', art: 'nb_madeira', fp: { x0: 838, y0: 943, x1: 842, y1: 945 }, h: 5 },
];

/** Ponto andável bem na frente da porta da torre (o botão ENTRAR aparece perto dele). */
export const TOWER_APPROACH = { x: TOWER.doorX, y: TOWER.doorY + 2 };

export const doorPositions = buildings.map((b) => ({ id: b.id, x: b.doorX, y: b.doorY, type: b.type }));
export function getBuildingAtDoor(x: number, y: number) {
  return buildings.find((b) => Math.abs(x - b.doorX) <= 1 && y === b.doorY) ?? null;
}
/** Door tile of every building (arrow targets / missions). */
export const BUILDING_DOORS: Record<string, { x: number; y: number }> = Object.fromEntries(buildings.map((b) => [b.id, { x: b.doorX, y: b.doorY }]));
export const BUILDING_RECTS = buildings.map((b) => ({ id: b.id, type: b.type, ...b.rect }));

// Spawn just south of Dogge's house door - the reference brief's "starts
// with a cutscene inside Dogge's house" (cutscene itself not built yet,
// see docs/AUDIT.md).
const doggeHouse = buildings.find((b) => b.id === 'casa_dogge')!;
const SPAWN_ANCHOR = { x: doggeHouse.doorX + 3, y: doggeHouse.doorY + 2 }; // in the alley between the two rows, at the N-S gap
/** The open square just south of the village's bottom row: NPCs/pickups cluster here. */
export const PLAZA_SQUARE = { x: doggeHouse.doorX + 3, y: doggeHouse.doorY + 14 };
export const SPAWN_TILE = SPAWN_ANCHOR;

// ---- special single-point / area features, positioned the same way
// (measured off the drawing, times MAP_SCALE) ----
export const STATUE_TILE = { x: 1016, y: 826 };
export const TRAINING_FIELD = { cx: 1230, cy: 560, rx: 60, ry: 34 };
function isTrainingField(tx: number, ty: number): boolean {
  const dx = (tx - TRAINING_FIELD.cx) / TRAINING_FIELD.rx;
  const dy = (ty - TRAINING_FIELD.cy) / TRAINING_FIELD.ry;
  return dx * dx + dy * dy <= 1;
}
export const MONUMENT_TILE = { x: 1618, y: 1088 };
export const FRAG_B_TILE = { x: 1814, y: 1072 };
const cavernaRect = buildings.find((b) => b.id === 'caverna')!.rect;
export const CAVE_ECHO_1 = { x: cavernaRect.x0 - 22, y: cavernaRect.y0 + 8 };
export const CAVE_ECHO_2 = { x: cavernaRect.x1 + 26, y: cavernaRect.y1 - 12 };
export const CAVE_GUARDIAN_SPOT = { x: cavernaRect.x1 + 12, y: cavernaRect.y1 + 4 };
export const IGLOO_TILE = { x: 200, y: 560 };
export const MOUNTAIN_RESCUE_TILE = { x: IGLOO_TILE.x + 28, y: IGLOO_TILE.y + 30 };
/** Top of the snow mountain (the climb's reward). */
export const MOUNTAIN_SUMMIT_TILE = { x: IGLOO_TILE.x - 15, y: IGLOO_TILE.y - 15 };
const IGLOO_CLEARING: Rect = { x0: IGLOO_TILE.x - 3, y0: IGLOO_TILE.y - 3, x1: IGLOO_TILE.x + 3, y1: IGLOO_TILE.y + 3 };
// The 4-building plaza cluster sits in the tightest, most detailed part
// of the source art (overlapping roof/window colours at close range) -
// forced to plain walkable ground so the buildings are reliably
// connected to each other and to the rest of the island, the same fix
// as IGLOO_CLEARING above just sized for a cluster instead of one point.
const PLAZA_CLEARING: Rect = { x0: 858, y0: 922, x1: 896, y1: 954 };
// Same treatment for the other multi-building villages: a forced-walkable
// apron so the gaps between buildings (and the doors' approach) never
// roll onto rock/trees in the traced art.
const VILLAGE_CLEARINGS: { rect: Rect; tile: TileType }[] = [
  { rect: { x0: 1217, y0: 668, x1: 1252, y1: 692 }, tile: 'stone' }, // hall + guild
  { rect: { x0: 1870, y0: 296, x1: 1898, y1: 318 }, tile: 'ash' }, // volcano pair
  { rect: { x0: 90, y0: 962, x1: 124, y1: 984 }, tile: 'stone' }, // ice-island village (cabin + shop)
];

// ---- the snow mountain: a sealed plateau, climbable only through one icy
// cliff face (tile 'cliff', passable only with the piolet item - see
// collision.ts / cliff.ts). The ring seals every other way in. ----
const GATE_TRAIL: Rect = { x0: 76, y0: 773, x1: 92, y1: 776 }; // ground at the foot of the cliff
const GATE_CLIFF: Rect = { x0: 88, y0: 748, x1: 92, y1: 772 }; // the climb itself
export const MOUNTAIN_GATE_FOOT = { x: 84, y: 775 };

function landingPad(center: { x: number; y: number }, r = 3): Rect {
  return { x0: center.x - r, y0: center.y - r, x1: center.x + r, y1: center.y + r };
}
/** L-shaped forced-clear corridor from `from` to `to`, width `w`. Some
 * buildings (the cave, the hall, the mountain house) sit on naturally
 * rocky ground in the traced art with no guarantee of a clear route out
 * - rather than guess which direction happens to be open, this connects
 * them to a known-good point (spawn) by construction, same reasoning as
 * the fragment-island bridges and the mountain trail in the previous
 * version of this file. `vertFirst` picks which leg goes first - matters
 * when the straight approach would otherwise cut through the target
 * building's own wall instead of arriving at its door. */
function connector(from: { x: number; y: number }, to: { x: number; y: number }, w = 3, vertFirst = false): Rect[] {
  const half = Math.floor(w / 2);
  const legH: Rect = { x0: Math.min(from.x, to.x) - half, y0: (vertFirst ? to.y : from.y) - half, x1: Math.max(from.x, to.x) + half, y1: (vertFirst ? to.y : from.y) + half };
  const legV: Rect = { x0: (vertFirst ? from.x : to.x) - half, y0: Math.min(from.y, to.y) - half, x1: (vertFirst ? from.x : to.x) + half, y1: Math.max(from.y, to.y) + half };
  return [legH, legV];
}

// ---- ferry docks ----
// Every stop sits on one of the brown docks of the user's own drawing (or,
// for the three places the drawing has no dock - the fragment islands, the
// camp and the dog island - on a wooden pier authored here). `anchor` is
// where you arrive and where the BARCO button appears, `ferryman` is the
// Barqueiro NPC standing on the dock, `boat` is the (always water) tile the
// moored boat is drawn on. `island` is the real island a stop belongs to
// (the main island has two stops).
export interface FerryDock {
  island: string;
  anchor: { x: number; y: number };
  ferryman: { x: number; y: number };
  boat: { x: number; y: number };
}
export const FERRY_DOCKS: Record<string, FerryDock> = {
  main: { island: 'main', anchor: { x: 1522, y: 896 }, ferryman: { x: 1524, y: 891 }, boat: { x: 1541, y: 896 } },
  main_west: { island: 'main', anchor: { x: 391, y: 958 }, ferryman: { x: 389, y: 953 }, boat: { x: 373, y: 958 } },
  gelo: { island: 'gelo', anchor: { x: 384, y: 1085 }, ferryman: { x: 383, y: 1079 }, boat: { x: 401, y: 1085 } },
  misteriosa: { island: 'misteriosa', anchor: { x: 1170, y: 332 }, ferryman: { x: 1176, y: 330 }, boat: { x: 1193, y: 331 } },
  vulcao: { island: 'vulcao', anchor: { x: 1534, y: 278 }, ferryman: { x: 1532, y: 273 }, boat: { x: 1514, y: 278 } },
  trevas: { island: 'trevas', anchor: { x: 752, y: 308 }, ferryman: { x: 758, y: 305 }, boat: { x: 772, y: 308 } },
  fragments: { island: 'fragments', anchor: { x: 1568, y: 1039 }, ferryman: { x: 1570, y: 1038 }, boat: { x: 1558, y: 1039 } },
  camp: { island: 'camp', anchor: { x: 399, y: 1374 }, ferryman: { x: 402, y: 1371 }, boat: { x: 407, y: 1375 } },
  dogisland: { island: 'dogisland', anchor: { x: 1224, y: 1182 }, ferryman: { x: 1226, y: 1183 }, boat: { x: 1233, y: 1182 } },
};
/** Wooden piers the drawing doesn't have (they run out over the water). */
const PIERS: Rect[] = [
  { x0: 1562, y0: 1038, x1: 1573, y1: 1040 }, // fragments (west beach)
  { x0: 398, y0: 1369, x1: 402, y1: 1377 }, // camp (south of the gate)
  { x0: 1222, y0: 1178, x1: 1226, y1: 1187 }, // dog island (north beach)
];
/** The brown docks of the drawing: their stone/wall tiles become wooden planks. */
const DOCK_RECTS: Rect[] = [
  { x0: 1454, y0: 880, x1: 1531, y1: 911 }, // main, east
  { x0: 382, y0: 942, x1: 459, y1: 975 }, // main, west
  { x0: 326, y0: 1066, x1: 391, y1: 1103 }, // ice island
  { x0: 1158, y0: 300, x1: 1183, y1: 339 }, // casino island
  { x0: 1526, y0: 262, x1: 1609, y1: 293 }, // volcano
];
/** Sand strip that joins the dog island's pier to its inland. */
const DOG_LANDING: Rect = { x0: 1220, y0: 1188, x1: 1228, y1: 1191 };

// ---- ferry anchors (old arrival spots, still used as region/NPC/door
// reference points; landing pads guarantee walkable ground there) ----
export const REGION_ANCHORS = {
  dock: FERRY_DOCKS.main.anchor,
  misteriosa: { x: 1128, y: 220 },
  vulcao: { x: 1888, y: 360 },
  trevas: { x: 90, y: 210 }, // just inside the maze's west opening
  fragA: { x: 1690, y: 1040 },
  camp: rectCenter(CAMP_TILES),
  dogisland: rectCenter(DOGISLAND_TILES),
};
const LANDING_PADS = [REGION_ANCHORS.misteriosa, REGION_ANCHORS.vulcao, REGION_ANCHORS.trevas, REGION_ANCHORS.fragA, REGION_ANCHORS.camp, REGION_ANCHORS.dogisland].map((c) =>
  landingPad(c)
);
// Small safety clearings for point-features on the fragment islands, same
// reasoning as the landing pads: guarantee walkable regardless of what
// the traced terrain rolled at that exact point.
const FEATURE_CLEARINGS = [MONUMENT_TILE, FRAG_B_TILE, CAVE_ECHO_1, CAVE_ECHO_2, CAVE_GUARDIAN_SPOT, MOUNTAIN_RESCUE_TILE].map((c) => landingPad(c, 2));

// Guaranteed routes from spawn to every building that sits on naturally
// rocky ground in the traced art (the cave, the hall, the guild, the
// mountain house) plus the igloo point - see connector() above.
function doorApproach(id: string) {
  const b = buildings.find((x) => x.id === id)!;
  return { x: b.doorX, y: b.doorY + 2 }; // +2 sits directly against the door's own +1 apron row, no gap
}
const CONNECTORS: Rect[] = [
  ...connector(SPAWN_ANCHOR, doorApproach('caverna')),
  ...connector(SPAWN_ANCHOR, doorApproach('salao_geral')),
  ...connector(SPAWN_ANCHOR, doorApproach('guilda')),
  // Quest points around the cave and on fragment B that the traced terrain
  // left in sealed pockets (cave echoes, the guardian, the treasure).
  ...connector(doorApproach('caverna'), CAVE_GUARDIAN_SPOT),
  ...connector(doorApproach('caverna'), CAVE_ECHO_1),
  ...connector(doorApproach('caverna'), CAVE_ECHO_2),
  ...connector(REGION_ANCHORS.fragA, FRAG_B_TILE),
  // Ferry landing -> shop/casino doors on the islands. These were MISSING:
  // the casino and both volcano doors sat in tiny walled-off pockets, so
  // arriving by ferry left them unreachable.
  ...connector(REGION_ANCHORS.misteriosa, doorApproach('loja_misteriosa'), 3, true),
  ...connector(REGION_ANCHORS.vulcao, doorApproach('loja_vulcao'), 3, true),
  ...connector(REGION_ANCHORS.vulcao, doorApproach('descanso_vulcao'), 3, true),
  // The volcano's dock side and its shop village were split by a lava river.
  ...connector({ x: 1913, y: 365 }, { x: 1917, y: 372 }),
  // The old plaza->igloo road also joined the plaza to the northern forest; keep that link.
  ...connector({ x: 871, y: 879 }, { x: 871, y: 894 }),
  // Ice-island village <-> the trail that runs down the west coast.
  ...connector({ x: 91, y: 934 }, { x: 91, y: 944 }),
];

// ---- everything above this line only describes WHERE things go; the
// actual per-tile terrain is baked into one flat lookup the first time
// it's needed (not computed fresh on every call). The old version did a
// dozen inRect()/array-scan checks on every single getWorldTile() call,
// and the renderer calls that for every visible tile, every frame - fine
// on a fast machine, but a real per-frame cost on an actual phone (see
// docs/AUDIT.md, this is the fix for the freeze/ANR the dono do projeto
// hit). Baking once means gameplay is a single array read per tile. */
let _grid: TileType[] | null = null;

function stampRect(grid: TileType[], r: Rect, tile: TileType, skipIf?: (cur: TileType) => boolean) {
  const x0 = Math.max(0, r.x0);
  const x1 = Math.min(WORLD_TILES_W - 1, r.x1);
  const y0 = Math.max(0, r.y0);
  const y1 = Math.min(WORLD_TILES_H - 1, r.y1);
  for (let ty = y0; ty <= y1; ty++) {
    const row = ty * WORLD_TILES_W;
    for (let tx = x0; tx <= x1; tx++) {
      if (skipIf && skipIf(grid[row + tx])) continue;
      grid[row + tx] = tile;
    }
  }
}


/** Seals the snow plateau (the flood-filled snow around the igloo) inside a
 * 2-tile rock wall and opens ONE way in: the icy cliff (see GATE_CLIFF). */
function sealMountain(grid: TileType[]) {
  const W = WORLD_TILES_W;
  const start = IGLOO_TILE.y * W + IGLOO_TILE.x;
  if (grid[start] !== 'snow') return;
  const inP = new Uint8Array(grid.length);
  const stack = [start];
  inP[start] = 1;
  while (stack.length) {
    const c = stack.pop()!;
    const x = c % W;
    const y = (c - x) / W;
    const nb = [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, y > 0 ? c - W : -1, y < WORLD_TILES_H - 1 ? c + W : -1];
    for (const i of nb) {
      if (i >= 0 && !inP[i] && grid[i] === 'snow') {
        inP[i] = 1;
        stack.push(i);
      }
    }
  }
  const wall: number[] = [];
  for (let i = 0; i < inP.length; i++) {
    if (!inP[i]) continue;
    const x = i % W;
    const y = (i - x) / W;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= WORLD_TILES_H) continue;
        const j = ny * W + nx;
        if (!inP[j] && grid[j] !== 'water') wall.push(j);
      }
    }
  }
  for (const j of wall) grid[j] = 'rock';
  stampRect(grid, GATE_TRAIL, 'path');
  stampRect(grid, GATE_CLIFF, 'cliff', (cur) => cur === 'snow');
}

function buildGrid(): TileType[] {
  const grid: TileType[] = new Array(WORLD_TILES_W * WORLD_TILES_H);
  for (let ty = 0; ty < WORLD_TILES_H; ty++) {
    const row = ty * WORLD_TILES_W;
    const useStrip = ty >= STRIP_Y0;
    for (let tx = 0; tx < WORLD_TILES_W; tx++) {
      grid[row + tx] = useStrip ? bonusStripTile(tx, ty) : getExtractedTile(tx, ty);
    }
  }

  // Training field (ellipse, not a rect).
  const tf = TRAINING_FIELD;
  for (let ty = Math.max(0, tf.cy - tf.ry); ty <= Math.min(WORLD_TILES_H - 1, tf.cy + tf.ry); ty++) {
    for (let tx = Math.max(0, tf.cx - tf.rx); tx <= Math.min(WORLD_TILES_W - 1, tf.cx + tf.rx); tx++) {
      if (!isTrainingField(tx, ty)) continue;
      grid[ty * WORLD_TILES_W + tx] = 'stone';
    }
  }

  stampRect(grid, IGLOO_CLEARING, 'snow');
  stampRect(grid, PLAZA_CLEARING, 'path');
  for (const v of VILLAGE_CLEARINGS) stampRect(grid, v.rect, v.tile);
  for (const seg of CONNECTORS) stampRect(grid, seg, 'path', (cur) => cur === 'snow');
  sealMountain(grid);
  for (const r of DOCK_RECTS) stampRect(grid, r, 'dock', (cur) => cur !== 'stone' && cur !== 'wall');
  for (const pr of PIERS) stampRect(grid, pr, 'dock');
  stampRect(grid, DOG_LANDING, 'sand');
  for (const pad of LANDING_PADS) stampRect(grid, pad, 'sand');
  for (const c of FEATURE_CLEARINGS) stampRect(grid, c, 'sand');

  // O chão por baixo de cada estrutura decorativa é o do tile logo à frente dela (a arte tem cantos transparentes).
  for (const sc of SCENERY) {
    const ground = grid[(sc.fp.y1 + 1) * WORLD_TILES_W + sc.fp.x0];
    for (let ty = sc.fp.y0; ty <= sc.fp.y1; ty++) for (let tx = sc.fp.x0; tx <= sc.fp.x1; tx++) SCENERY_GROUND.set(ty * WORLD_TILES_W + tx, ground);
    stampRect(grid, sc.fp, 'house');
  }

  // Torre dos Desafios: corpo sólido + chão de caminho na frente da porta.
  stampRect(grid, TOWER.rect, 'house');
  stampRect(grid, { x0: TOWER.doorX - 2, y0: TOWER.doorY + 1, x1: TOWER.doorX + 2, y1: TOWER.doorY + 2 }, 'path');

  for (const b of buildings) {
    stampRect(grid, b.rect, 'house');
    stampRect(grid, { x0: b.doorX - 1, y0: b.doorY, x1: b.doorX + 1, y1: b.doorY }, 'door');
    stampRect(grid, { x0: b.doorX - 2, y0: b.doorY + 1, x1: b.doorX + 2, y1: b.doorY + 1 }, 'path');
  }

  return grid;
}

export function getWorldTile(tx: number, ty: number): TileType {
  if (tx < 0 || ty < 0 || tx >= WORLD_TILES_W || ty >= WORLD_TILES_H) return 'water';
  if (!_grid) _grid = buildGrid();
  return _grid[ty * WORLD_TILES_W + tx];
}

export function isWithinWorld(tx: number, ty: number): boolean {
  return tx >= 0 && ty >= 0 && tx < WORLD_TILES_W && ty < WORLD_TILES_H;
}

// ---- minimap: sample the real terrain instead of a fixed per-chunk type ----
type Region = 'plains' | 'forest' | 'mountain' | 'sea' | 'plaza' | 'trevas' | 'misteriosa' | 'vulcao' | 'camp' | 'dogisland';
export const REGION_COLORS: Record<Region, string> = {
  plains: '#6fae5f',
  forest: '#1f5c33',
  mountain: '#c7d3da',
  sea: '#3a72c4',
  plaza: '#c9a24a',
  trevas: '#4a4a52',
  misteriosa: '#c9924a',
  vulcao: '#8a1f1f',
  camp: '#8a7a6b',
  dogisland: '#d9c47a',
};
export function getRegionAtChunk(chunkX: number, chunkY: number): Region {
  const tx = chunkX * CHUNK_SIZE + CHUNK_SIZE / 2;
  const ty = chunkY * CHUNK_SIZE + CHUNK_SIZE / 2;
  if (inRect(tx, ty, CAMP_TILES)) return 'camp';
  if (inRect(tx, ty, DOGISLAND_TILES)) return 'dogisland';
  if (Math.hypot(tx - REGION_ANCHORS.trevas.x, ty - REGION_ANCHORS.trevas.y) < 220) return 'trevas';
  if (Math.hypot(tx - REGION_ANCHORS.misteriosa.x, ty - REGION_ANCHORS.misteriosa.y) < 150) return 'misteriosa';
  if (Math.hypot(tx - REGION_ANCHORS.vulcao.x, ty - REGION_ANCHORS.vulcao.y) < 220) return 'vulcao';
  const t = getWorldTile(Math.round(tx), Math.round(ty));
  if (t === 'water' || t === 'dock') return 'sea';
  if (t === 'tree') return 'forest';
  if (t === 'rock' || t === 'snow' || t === 'cliff') return 'mountain';
  if (t === 'stone' || t === 'house' || t === 'door') return 'plaza';
  return 'plains';
}
