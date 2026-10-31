import type { MapDef } from '@/types/game';
import { FERRY_DOCKS } from './worldGen';
import { realIslandOf, type IslandId, type RealIslandId } from '@/game/state/islandState';

/** Every ferry stop: a dock of the drawing (or an authored pier) per stop. */
export const FERRY_STOPS: { id: IslandId; island: RealIslandId; anchor: { x: number; y: number } }[] = (Object.keys(FERRY_DOCKS) as IslandId[]).map((id) => ({
  id,
  island: realIslandOf(id),
  anchor: FERRY_DOCKS[id].anchor,
}));

/**
 * Which island a tile belongs to. Computed once (lazily) by flood-filling
 * the land on a coarse grid (BLOCK x BLOCK tiles per cell, a cell is land
 * if any tile in it isn't water - that closes rivers and keeps islands
 * apart, since the sea gaps between them are much wider). Each ferry stop's
 * anchor names the island its cell belongs to. Used by the mission arrow
 * (point to the ferry when the target is on another island).
 */
const BLOCK = 8;
let labels: Int32Array | null = null;
let cols = 0;
let rows = 0;
let labelToIsland: Map<number, RealIslandId> | null = null;

function build(map: MapDef) {
  cols = Math.ceil(map.width / BLOCK);
  rows = Math.ceil(map.height / BLOCK);
  const land = new Uint8Array(cols * rows);
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      let isLand = false;
      for (let oy = 0; oy < BLOCK && !isLand; oy += 2) {
        for (let ox = 0; ox < BLOCK; ox += 2) {
          const t = map.getTile(bx * BLOCK + ox, by * BLOCK + oy);
          if (t !== 'water') {
            isLand = true;
            break;
          }
        }
      }
      land[by * cols + bx] = isLand ? 1 : 0;
    }
  }
  const lab = new Int32Array(cols * rows);
  let next = 0;
  const stack: number[] = [];
  for (let i = 0; i < land.length; i++) {
    if (!land[i] || lab[i]) continue;
    next++;
    lab[i] = next;
    stack.push(i);
    while (stack.length) {
      const c = stack.pop()!;
      const x = c % cols;
      const y = (c - x) / cols;
      if (x > 0 && land[c - 1] && !lab[c - 1]) { lab[c - 1] = next; stack.push(c - 1); }
      if (x < cols - 1 && land[c + 1] && !lab[c + 1]) { lab[c + 1] = next; stack.push(c + 1); }
      if (y > 0 && land[c - cols] && !lab[c - cols]) { lab[c - cols] = next; stack.push(c - cols); }
      if (y < rows - 1 && land[c + cols] && !lab[c + cols]) { lab[c + cols] = next; stack.push(c + cols); }
    }
  }
  labels = lab;
  labelToIsland = new Map();
  for (const stop of FERRY_STOPS) {
    const l = cellLabel(stop.anchor.x, stop.anchor.y);
    if (l) labelToIsland.set(l, stop.island);
  }
}

function cellLabel(tx: number, ty: number): number {
  const bx = Math.min(cols - 1, Math.max(0, Math.floor(tx / BLOCK)));
  const by = Math.min(rows - 1, Math.max(0, Math.floor(ty / BLOCK)));
  return labels![by * cols + bx];
}

/** Island id of a tile, or null over open water / unknown land. */
export function getIslandAt(map: MapDef, tx: number, ty: number): RealIslandId | null {
  if (!labels) build(map);
  const l = cellLabel(tx, ty);
  return (l && labelToIsland!.get(l)) || null;
}

/** The ferry stop of `island` closest to a tile (islands like the main one have two). */
export function nearestStopOf(island: RealIslandId, tx: number, ty: number) {
  let best: (typeof FERRY_STOPS)[number] | null = null;
  let bestD = Infinity;
  for (const st of FERRY_STOPS) {
    if (st.island !== island) continue;
    const d = Math.hypot(st.anchor.x - tx, st.anchor.y - ty);
    if (d < bestD) {
      bestD = d;
      best = st;
    }
  }
  return best;
}
