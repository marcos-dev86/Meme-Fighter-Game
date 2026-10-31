import type { MapDef } from '@/types/game';
import { CHUNK_SIZE, SPAWN_TILE, WORLD_CHUNKS_H, WORLD_CHUNKS_W, WORLD_TILES_H, WORLD_TILES_W, getWorldTile, hash2 } from './worldGen';

export { CHUNK_SIZE, WORLD_CHUNKS_W, WORLD_CHUNKS_H, hash2 };

export const TILE_SIZE = 32;

/**
 * The whole explorable world as a single MapDef. Praça Central lives at
 * its center; forests, the fire village and the sea sit around it (see
 * worldGen.ts for the actual layout). No exits yet (it's one continuous
 * map) and no missions/obstacles yet: "colocarei obstáculos, missões,
 * npcs... futuramente" is respected literally, none are placed here.
 */
export const overworld: MapDef = {
  id: 'overworld',
  name: 'Reino de Meme-Fighter',
  tileSize: TILE_SIZE,
  width: WORLD_TILES_W,
  height: WORLD_TILES_H,
  getTile: getWorldTile,
  spawns: [{ id: 'default', x: SPAWN_TILE.x, y: SPAWN_TILE.y }],
  exits: [],
  npcs: [],
  objects: [],
};
