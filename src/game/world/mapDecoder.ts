import { MAP_RLE, MAP_SCALE, MAP_SRC_W, MAP_SRC_H } from './mapData';
import type { TileType } from '@/types/game';

export const EXTRACTED_W = MAP_SRC_W * MAP_SCALE;
export const EXTRACTED_H = MAP_SRC_H * MAP_SCALE;

const CODE_TO_TILE: Record<string, TileType> = {
  W: 'water',
  G: 'grass',
  T: 'tree',
  S: 'sand',
  P: 'path',
  R: 'rock',
  K: 'wall',
  N: 'snow',
  L: 'lava',
  A: 'ash',
  O: 'stone',
};
const CODES = Object.keys(CODE_TO_TILE);
const CODE_INDEX: Record<string, number> = {};
CODES.forEach((c, i) => (CODE_INDEX[c] = i));
const TILE_BY_INDEX: TileType[] = CODES.map((c) => CODE_TO_TILE[c]);

/** Decoded once at module load into a flat lookup table - see mapData.ts
 * for the format. A Uint8Array of EXTRACTED_W*EXTRACTED_H is a couple MB,
 * fine to hold in memory; decoding uses TypedArray.fill() per run instead
 * of a per-tile loop so it stays fast even at ~2.3M tiles. */
function decode(): Uint8Array {
  const out = new Uint8Array(EXTRACTED_W * EXTRACTED_H);
  const rows = MAP_RLE.split('\n');
  for (let y = 0; y < rows.length; y++) {
    const runs = rows[y].split(',');
    let x = 0;
    const rowStart = y * EXTRACTED_W;
    for (const run of runs) {
      const code = run[0];
      const count = parseInt(run.slice(1), 10);
      out.fill(CODE_INDEX[code] ?? 0, rowStart + x, rowStart + x + count);
      x += count;
    }
  }
  return out;
}

let _grid: Uint8Array | null = null;
function grid(): Uint8Array {
  if (!_grid) _grid = decode();
  return _grid;
}

export function getExtractedTile(tx: number, ty: number): TileType {
  if (tx < 0 || ty < 0 || tx >= EXTRACTED_W || ty >= EXTRACTED_H) return 'water';
  return TILE_BY_INDEX[grid()[ty * EXTRACTED_W + tx]];
}
