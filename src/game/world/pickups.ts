import { REGION_ANCHORS, PLAZA_SQUARE, IGLOO_TILE, STATUE_TILE, BUILDING_RECTS, MONUMENT_TILE, FRAG_B_TILE, CAVE_ECHO_1, CAVE_ECHO_2, MOUNTAIN_RESCUE_TILE, MOUNTAIN_SUMMIT_TILE } from './worldGen';

export interface PickupDef {
  id: string;
  x: number;
  y: number;
  coins?: number;
  itemId?: string;
  /** Collecting/discovering this also progresses a mission - see questState.ts. */
  questId?: string;
  /** For the 3-fragment backstory - see loreState.ts. */
  lorePiece?: 'fragA' | 'fragB' | 'fragC';
}

const caverna = BUILDING_RECTS.find((b) => b.id === 'caverna')!;
const salao = BUILDING_RECTS.find((b) => b.id === 'salao_geral')!;
const lojaAbandonada = BUILDING_RECTS.find((b) => b.id === 'loja_abandonada')!;

/**
 * Hand-placed, not randomly scattered: "esconderijos" (hiding spots)
 * implies deliberate placement worth finding, off the main road. Now
 * anchored to the real drawn landmarks instead of the old procedural
 * forest/mountain regions - see docs/AUDIT.md for the v5 map rewrite.
 * questId/lorePiece entries tie a find to mission progress (see
 * questState.ts and loreState.ts) instead of just handing out coins.
 */
export const WORLD_PICKUPS: PickupDef[] = [
  // Secreto: o baú ao lado da igreja da praça (missão sec_bau).
  { id: 'bau_igreja', x: 892, y: 928, coins: 50, itemId: 'meme_token' },
  { id: 'plaza_pickup_1', x: PLAZA_SQUARE.x + 10, y: PLAZA_SQUARE.y - 4, coins: 10 },
  { id: 'salao_pickup_1', x: salao.x0 - 6, y: salao.y1 + 8, coins: 15 },
  { id: 'statue_pickup_1', x: STATUE_TILE.x - 5, y: STATUE_TILE.y + 11, coins: 20 },
  { id: 'dock_pickup_1', x: REGION_ANCHORS.dock.x - 40, y: REGION_ANCHORS.dock.y - 3, coins: 10 },

  // Ecos na Caverna (collect 2, cave_echoes).
  { id: 'cave_echo_1', x: CAVE_ECHO_1.x, y: CAVE_ECHO_1.y, questId: 'cave_echoes', itemId: 'meme_token' },
  { id: 'cave_echo_2', x: CAVE_ECHO_2.x, y: CAVE_ECHO_2.y, questId: 'cave_echoes', itemId: 'meme_token' },

  // A Trilha Gelada / Resgate na Neve (mountain, discover-type).
  { id: 'mountain_trail_point', x: IGLOO_TILE.x - 40, y: IGLOO_TILE.y + 70, questId: 'mountain_trail' },
  { id: 'mountain_rescue_point', x: MOUNTAIN_RESCUE_TILE.x, y: MOUNTAIN_RESCUE_TILE.y, itemId: 'shield_charm' },

  { id: 'mountain_summit', x: MOUNTAIN_SUMMIT_TILE.x, y: MOUNTAIN_SUMMIT_TILE.y, questId: 'mountain_summit', itemId: 'summit_flag' },

  // The 3-fragment backstory (see loreState.ts for the combined text).
  { id: 'frag_c_monument', x: MONUMENT_TILE.x, y: MONUMENT_TILE.y, questId: 'frag_c_lore', lorePiece: 'fragC' },
  { id: 'frag_a_ruins', x: lojaAbandonada.x0 - 12, y: lojaAbandonada.y1 + 10, questId: 'frag_a_lore', lorePiece: 'fragA' },
  { id: 'frag_b_treasure', x: FRAG_B_TILE.x, y: FRAG_B_TILE.y, questId: 'frag_b_lore', lorePiece: 'fragB', itemId: 'old_coin' },
];


