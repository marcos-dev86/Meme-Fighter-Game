/**
 * Shared types for the RPG world layer.
 *
 * These are intentionally broader than what Phase 1 uses (e.g. NpcDef,
 * MapExit) so Phase 2+ (NPCs, quests, transitions) can build on the same
 * MapDef shape instead of changing it later. Phase 1 only ever populates
 * `npcs`/`exits`/`objects` with empty arrays.
 */

export interface Vector2 {
  x: number;
  y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Mirrors section 6 of the design doc. Phase 1 only actually drives
 * 'idle' and 'walking': the rest exist so BattleScene/DialogueScene
 * integration (later phases) has a stable enum to target instead of
 * inventing one per feature.
 */
export type PlayerState =
  | 'idle'
  | 'walking'
  | 'running'
  | 'interacting'
  | 'dialogue'
  | 'battle'
  | 'cutscene'
  | 'menu'
  | 'dead'
  | 'transitioning';

export type TileType =
  | 'grass'
  | 'path'
  | 'water'
  | 'tree'
  | 'rock'
  | 'wall'
  | 'sand'
  | 'flower'
  | 'stone'
  | 'dock'
  | 'lava'
  | 'ash'
  | 'snow'
  | 'cliff'
  | 'shop'
  | 'house'
  | 'door';

export interface SpawnPoint {
  id: string;
  x: number; // tile column
  y: number; // tile row
}

export interface MapExit {
  id: string;
  x: number; // tile column
  y: number; // tile row
  targetMapId: string;
  targetSpawnId: string;
}

export interface NpcDef {
  id: string;
  x: number; // tile column
  y: number; // tile row
  spriteKey: string;
  dialogueId?: string;
}

export interface MapObjectDef {
  id: string;
  x: number; // tile column
  y: number; // tile row
  solid: boolean;
}

export interface MapDef {
  id: string;
  name: string;
  tileSize: number;
  width: number; // tiles
  height: number; // tiles
  /** Queried on demand instead of a materialized 2D array: the world is
   * too large (hundreds of thousands of tiles) to hold in memory as a
   * literal grid, so tiles are generated deterministically per-coordinate.
   * See src/game/world/worldGen.ts. */
  getTile: (x: number, y: number) => TileType;
  spawns: SpawnPoint[];
  exits: MapExit[];
  npcs: NpcDef[];
  objects: MapObjectDef[];
  music?: string;
}
