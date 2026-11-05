/**
 * Layout do CASSINO GIGANTE (interior da Ilha Misteriosa): TRES ANDARES - térreo, mezanino VIP (2º andar) e subsolo secreto (-1).
 * Módulo puro (sem React Native): os testes (tools/test-urgente3.mjs) carregam este arquivo direto no Node para provar que as
 * mesas não bloqueiam a porta/escadas, que todo NPC é alcançável e que não há nada hostil.
 *
 * Cada andar é uma sala de 28 x 20 tiles (ROOM_TILE 44 px = 1232 x 880 px), maior que a tela: a câmera segue o jogador.
 */
export const CASINO_W = 28;
export const CASINO_H = 20;
export const CASINO_TILE = 44;
export const CASINO_DOOR = { x: 14, y: 19 };
export const CASINO_BUILDING_ID = 'loja_misteriosa';
/** Bandeira da história que mostra a escada do subsolo (ver CasinoInterior e missionsCassino). */
export const CASINO_CELLAR_FLAG = 'cassino_porao';

export type FloorId = 'ground' | 'upper' | 'basement';
export const FLOOR_IDS: FloorId[] = ['ground', 'upper', 'basement'];
export type CasinoSprite = 'roulette' | 'dice' | 'cards' | 'flip' | 'slot' | 'bar' | 'bottles' | 'vase' | 'crate' | 'barrel' | 'vault';
export type CasinoGame = 'slots' | 'flip' | 'dice' | 'roulette' | 'cards';

export interface CasinoPiece {
  x: number;
  y: number;
  w: number;
  h: number;
  sprite: CasinoSprite;
  /** Peça repetida uma vez por tile (balcão, garrafas). */
  tile?: boolean;
}

/** Estação de jogo: o jogador chega perto e aparece o botão JOGAR (abre o CasinoOverlay naquele jogo). */
export interface CasinoStation {
  id: string;
  game: CasinoGame;
  /** Centro da estação em tiles (para a distância do botão JOGAR). */
  cx: number;
  cy: number;
  /** Chave i18n do nome mostrado no botão. */
  labelKey: string;
}

export interface CasinoNpcPlacement {
  npcId: string;
  x: number;
  y: number;
}

export interface FloorDef {
  id: FloorId;
  label: string;
  pieces: CasinoPiece[];
  stations: CasinoStation[];
  npcs: CasinoNpcPlacement[];
  /** Escadas deste andar (tile) e para onde levam. `hidden` = só aparece depois da bandeira CASINO_CELLAR_FLAG. */
  stairs: { x: number; y: number; to: FloorId; hidden?: boolean }[];
  chest?: { id: string; x: number; y: number; coins?: number; itemId?: string };
  /** Ponto de chegada ao entrar pela porta (térreo) ou pela escada. */
  start: { x: number; y: number };
}

type TableSpec = { sprite: CasinoSprite; game: CasinoGame; x: number; y: number; labelKey: string; id: string };
const stationsFromTables = (tables: TableSpec[]): CasinoStation[] => tables.map((t) => ({ id: t.id, game: t.game, cx: t.x + 1.5, cy: t.y + 1, labelKey: t.labelKey }));
const piecesFromTables = (tables: TableSpec[]): CasinoPiece[] => tables.map((t) => ({ x: t.x, y: t.y, w: 3, h: 2, sprite: t.sprite }));
const slotRow = (xs: number[], y: number, prefix: string) => ({
  pieces: xs.map((x) => ({ x, y, w: 1, h: 2, sprite: 'slot' as const })),
  stations: xs.map((x, i) => ({ id: `${prefix}_${i + 1}`, game: 'slots' as CasinoGame, cx: x + 0.5, cy: y + 1, labelKey: 'cas_station_slots' })),
});
const vase = (x: number, y: number): CasinoPiece => ({ x, y, w: 1, h: 1, sprite: 'vase' });

// ---------------------------------------------------------------- térreo
const G_TABLES: TableSpec[] = [
  { id: 'mesa_roleta', sprite: 'roulette', game: 'roulette', x: 3, y: 7, labelKey: 'cas_station_roulette' },
  { id: 'mesa_dados', sprite: 'dice', game: 'dice', x: 9, y: 7, labelKey: 'cas_station_dice' },
  { id: 'mesa_cartas', sprite: 'cards', game: 'cards', x: 15, y: 7, labelKey: 'cas_station_cards' },
  { id: 'mesa_moeda', sprite: 'flip', game: 'flip', x: 21, y: 7, labelKey: 'cas_station_flip' },
  { id: 'mesa_cartas_vip', sprite: 'cards', game: 'cards', x: 15, y: 12, labelKey: 'cas_station_cards_vip' },
  { id: 'mesa_roleta_vip', sprite: 'roulette', game: 'roulette', x: 21, y: 12, labelKey: 'cas_station_roulette_vip' },
];
const G_SLOTS = slotRow([3, 4, 5, 6, 7, 8, 10, 11, 12], 12, 'slot');

const GROUND: FloorDef = {
  id: 'ground',
  label: 'Cassino Misterioso',
  pieces: [
    { x: 2, y: 1, w: 7, h: 1, sprite: 'bottles', tile: true },
    { x: 2, y: 3, w: 7, h: 1, sprite: 'bar', tile: true },
    ...piecesFromTables(G_TABLES),
    ...G_SLOTS.pieces,
    vase(1, 1), vase(26, 1), vase(10, 1), vase(18, 1), vase(2, 17), vase(25, 17), vase(1, 10), vase(26, 10),
  ],
  stations: [...stationsFromTables(G_TABLES), ...G_SLOTS.stations],
  npcs: [
    { npcId: 'barman_cassino', x: 5, y: 2 },
    { npcId: 'shiba_manso', x: 3, y: 5 },
    { npcId: 'apostador_azar', x: 8, y: 5 },
    { npcId: 'dealer_roleta', x: 4, y: 6 },
    { npcId: 'dealer_dados', x: 10, y: 6 },
    { npcId: 'dealer_cartas', x: 16, y: 6 },
    { npcId: 'dealer_moeda', x: 22, y: 6 },
    { npcId: 'croupier', x: 22, y: 2 },
    { npcId: 'rei_dourado', x: 25, y: 3 },
    { npcId: 'azulao', x: 19, y: 4 },
    { npcId: 'cara_tranquilo', x: 13, y: 3 },
    { npcId: 'gato_bocao', x: 15, y: 2 },
    { npcId: 'fichinha_cassino', x: 9, y: 13 },
    { npcId: 'dealer_cartas_vip', x: 16, y: 11 },
    { npcId: 'dealer_roleta_vip', x: 22, y: 11 },
    { npcId: 'sortudo_cassino', x: 13, y: 9 },
    { npcId: 'jogadora_sol', x: 19, y: 9 },
    { npcId: 'bento', x: 25, y: 8 },
    { npcId: 'contadora_cris', x: 2, y: 9 },
    { npcId: 'toinho', x: 8, y: 16 },
    { npcId: 'turista', x: 11, y: 16 },
    { npcId: 'seguranca_cassino', x: 12, y: 18 },
    { npcId: 'gato_arco_iris', x: 20, y: 16 },
    { npcId: 'vermelhao', x: 24, y: 15 },
    { npcId: 'velho_poker', x: 18, y: 14 },
    { npcId: 'pipoca', x: 3, y: 14 },
    { npcId: 'madame_dourada', x: 25, y: 13 },
  ],
  stairs: [
    { x: 26, y: 18, to: 'upper' },
    { x: 1, y: 18, to: 'basement', hidden: true },
  ],
  start: { x: CASINO_DOOR.x, y: CASINO_H - 2 },
};

// ---------------------------------------------------------------- mezanino VIP (2º andar)
const U_TABLES: TableSpec[] = [
  { id: 'vip_roleta_a', sprite: 'roulette', game: 'roulette', x: 3, y: 5, labelKey: 'cas_station_roulette_vip' },
  { id: 'vip_dados_a', sprite: 'dice', game: 'dice', x: 9, y: 5, labelKey: 'cas_station_dice_vip' },
  { id: 'vip_cartas_a', sprite: 'cards', game: 'cards', x: 15, y: 5, labelKey: 'cas_station_cards_vip' },
  { id: 'vip_moeda_a', sprite: 'flip', game: 'flip', x: 21, y: 5, labelKey: 'cas_station_flip_vip' },
  { id: 'vip_cartas_b', sprite: 'cards', game: 'cards', x: 3, y: 10, labelKey: 'cas_station_cards_vip' },
  { id: 'vip_moeda_b', sprite: 'flip', game: 'flip', x: 9, y: 10, labelKey: 'cas_station_flip_vip' },
  { id: 'vip_roleta_b', sprite: 'roulette', game: 'roulette', x: 15, y: 10, labelKey: 'cas_station_roulette_vip' },
  { id: 'vip_dados_b', sprite: 'dice', game: 'dice', x: 21, y: 10, labelKey: 'cas_station_dice_vip' },
];
const U_SLOTS_L = slotRow([3, 4, 5, 6, 7, 8], 14, 'vslot_l');
const U_SLOTS_R = slotRow([19, 20, 21, 22, 23, 24], 14, 'vslot_r');

const UPPER: FloorDef = {
  id: 'upper',
  label: 'Mezanino VIP',
  pieces: [
    { x: 11, y: 1, w: 7, h: 1, sprite: 'bottles', tile: true },
    { x: 11, y: 3, w: 7, h: 1, sprite: 'bar', tile: true },
    ...piecesFromTables(U_TABLES),
    ...U_SLOTS_L.pieces,
    ...U_SLOTS_R.pieces,
    vase(1, 1), vase(26, 1), vase(1, 17), vase(13, 9), vase(14, 9), vase(26, 9), vase(1, 9), vase(12, 17), vase(16, 17),
  ],
  stations: [...stationsFromTables(U_TABLES), ...U_SLOTS_L.stations, ...U_SLOTS_R.stations],
  npcs: [
    { npcId: 'garcom_filipe', x: 14, y: 2 },
    { npcId: 'dealer_roleta', x: 4, y: 4 },
    { npcId: 'dealer_dados', x: 10, y: 4 },
    { npcId: 'dealer_moeda', x: 22, y: 4 },
    { npcId: 'dealer_cartas', x: 4, y: 9 },
    { npcId: 'dealer_moeda', x: 10, y: 9 },
    { npcId: 'dealer_roleta_vip', x: 16, y: 9 },
    { npcId: 'dealer_dados', x: 22, y: 9 },
    { npcId: 'gerente_vale', x: 2, y: 3 },
    { npcId: 'crooner_melo', x: 25, y: 2 },
    { npcId: 'dj_beat', x: 21, y: 2 },
    { npcId: 'dama_diamante', x: 12, y: 7 },
    { npcId: 'mago_sorte', x: 19, y: 8 },
    { npcId: 'hospede_sonolento', x: 7, y: 13 },
    { npcId: 'sortudo_cassino', x: 14, y: 14 },
    { npcId: 'jogadora_sol', x: 17, y: 13 },
    { npcId: 'gato_bocao', x: 8, y: 8 },
    { npcId: 'azulao', x: 25, y: 12 },
    { npcId: 'rei_dourado', x: 12, y: 15 },
    { npcId: 'shiba_manso', x: 15, y: 16 },
    { npcId: 'cara_tranquilo', x: 3, y: 17 },
    { npcId: 'bebe_risonho', x: 24, y: 17 },
    { npcId: 'contadora_cris', x: 9, y: 17 },
    { npcId: 'madame_dourada', x: 19, y: 17 },
    { npcId: 'gato_arco_iris', x: 5, y: 17 },
  ],
  stairs: [{ x: 26, y: 18, to: 'ground' }],
  chest: { id: 'chest_cassino_mezanino', x: 2, y: 18, coins: 120 },
  start: { x: 26, y: 17 },
};

// ---------------------------------------------------------------- subsolo secreto (-1)
const B_TABLES: TableSpec[] = [
  { id: 'sub_cartas', sprite: 'cards', game: 'cards', x: 17, y: 8, labelKey: 'cas_station_cards_secret' },
  { id: 'sub_dados', sprite: 'dice', game: 'dice', x: 5, y: 12, labelKey: 'cas_station_dice_secret' },
];
const BASEMENT: FloorDef = {
  id: 'basement',
  label: 'Subsolo Secreto',
  pieces: [
    { x: 2, y: 1, w: 7, h: 1, sprite: 'crate', tile: true },
    { x: 19, y: 1, w: 6, h: 1, sprite: 'barrel', tile: true },
    { x: 1, y: 4, w: 1, h: 5, sprite: 'barrel', tile: true },
    { x: 11, y: 1, w: 2, h: 2, sprite: 'vault' },
    ...piecesFromTables(B_TABLES),
    { x: 25, y: 5, w: 1, h: 3, sprite: 'crate', tile: true },
    { x: 8, y: 16, w: 3, h: 1, sprite: 'crate', tile: true },
    { x: 19, y: 15, w: 3, h: 1, sprite: 'barrel', tile: true },
  ],
  stations: stationsFromTables(B_TABLES),
  npcs: [
    { npcId: 'guardiao_cofre', x: 14, y: 3 },
    { npcId: 'contrabandista_ruy', x: 5, y: 6 },
    { npcId: 'arquivista_sombra', x: 22, y: 3 },
    { npcId: 'velho_poker', x: 17, y: 11 },
    { npcId: 'cara_tranquilo', x: 9, y: 10 },
    { npcId: 'corvao', x: 21, y: 6 },
    { npcId: 'seis_sete', x: 13, y: 13 },
    { npcId: 'seguranca_cassino', x: 4, y: 15 },
    { npcId: 'vermelhao', x: 22, y: 12 },
  ],
  stairs: [{ x: 1, y: 18, to: 'ground' }],
  chest: { id: 'chest_cassino_cofre', x: 13, y: 5, coins: 500, itemId: 'power_brew' },
  start: { x: 2, y: 17 },
};

export const CASINO_FLOORS: Record<FloorId, FloorDef> = { ground: GROUND, upper: UPPER, basement: BASEMENT };

// Compatibilidade: o térreo continua exportado com os nomes antigos.
export const CASINO_PIECES = GROUND.pieces;
export const CASINO_STATIONS = GROUND.stations;
export const CASINO_NPC_PLACEMENTS = GROUND.npcs;

/** Para o mapa de missões: todo NPC que mora no cassino leva à porta dele. */
export const CASINO_NPC_IDS: ReadonlySet<string> = new Set(FLOOR_IDS.flatMap((f) => CASINO_FLOORS[f].npcs.map((p) => p.npcId)));

/** Retângulos sólidos em px (a arte visível, encolhida 2 px para não agarrar). */
export function casinoSolidBoxes(floor: FloorId = 'ground'): { x: number; y: number; width: number; height: number }[] {
  const out: { x: number; y: number; width: number; height: number }[] = [];
  for (const p of CASINO_FLOORS[floor].pieces) {
    out.push({ x: p.x * CASINO_TILE + 2, y: p.y * CASINO_TILE + 2, width: p.w * CASINO_TILE - 4, height: p.h * CASINO_TILE - 4 });
  }
  return out;
}

/** Tiles ocupados por peças sólidas. */
export function casinoSolidTiles(floor: FloorId = 'ground'): Set<string> {
  const s = new Set<string>();
  for (const p of CASINO_FLOORS[floor].pieces) for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) s.add(`${x},${y}`);
  return s;
}

/** Tile de parede/porta (bordas da sala). */
export function casinoWallTile(x: number, y: number, floor: FloorId = 'ground'): 'wall' | 'door' | 'floor' {
  if (x < 0 || y < 0 || x >= CASINO_W || y >= CASINO_H) return 'wall';
  if (x === 0 || y === 0 || x === CASINO_W - 1 || y === CASINO_H - 1) return floor === 'ground' && y === CASINO_H - 1 && x === CASINO_DOOR.x ? 'door' : 'wall';
  return 'floor';
}
