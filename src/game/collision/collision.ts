import type { MapDef, Vector2 } from '@/types/game';
import { canClimbCliff } from '@/game/world/cliff';

/**
 * All collision in the game goes through this file (section 9 of the
 * design doc: "não utilizar colisões improvisadas espalhadas... centralizar
 * a lógica"). Nothing else should decide whether something can walk
 * somewhere.
 *
 * Works against MapDef.getTile(x, y) rather than a materialized array so
 * the same functions serve both a small hand-authored map and the
 * procedural overworld (hundreds of thousands of tiles: see
 * src/game/world/worldGen.ts).
 */

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SOLID_TILES = new Set<string>(['water', 'tree', 'rock', 'wall', 'lava', 'shop', 'house']);

export function isTileSolid(map: MapDef, tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) {
    return true; // map edges act as walls
  }
  const type = map.getTile(tileX, tileY);
  if (!type) return true;
  // Icy cliff faces: solid until the player owns the climbing item (piolet).
  if (type === 'cliff') return !canClimbCliff();
  return SOLID_TILES.has(type);
}

export function isAreaSolid(map: MapDef, box: AABB): boolean {
  const left = Math.floor(box.x / map.tileSize);
  const right = Math.floor((box.x + box.width - 0.01) / map.tileSize);
  const top = Math.floor(box.y / map.tileSize);
  const bottom = Math.floor((box.y + box.height - 0.01) / map.tileSize);

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (isTileSolid(map, tx, ty)) return true;
    }
  }
  return false;
}

export interface MoveResult {
  position: Vector2;
  blockedX: boolean;
  blockedY: boolean;
}

/**
 * Moves `size`-shaped box from `position` by `delta`, resolving X and Y
 * separately so walking diagonally into a wall slides along it instead of
 * fully stopping. Reports which axes were blocked so the caller can react
 * (bump feedback) instead of it failing silently.
 */
export function resolveMove(map: MapDef, position: Vector2, size: Vector2, delta: Vector2): MoveResult {
  let { x, y } = position;
  let blockedX = false;
  let blockedY = false;

  if (delta.x !== 0) {
    const nextX = x + delta.x;
    if (!isAreaSolid(map, { x: nextX, y, width: size.x, height: size.y })) {
      x = nextX;
    } else {
      blockedX = true;
    }
  }

  if (delta.y !== 0) {
    const nextY = y + delta.y;
    if (!isAreaSolid(map, { x, y: nextY, width: size.x, height: size.y })) {
      y = nextY;
    } else {
      blockedY = true;
    }
  }

  return { position: { x, y }, blockedX, blockedY };
}

function boxesOverlap(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Same as resolveMove, plus a list of free-standing solid rectangles (the
 * furniture of an interior: each one is exactly as big as its drawing, so
 * there are no invisible blocks - tiles can't express that).
 */
export function resolveMoveBoxes(map: MapDef, position: Vector2, size: Vector2, delta: Vector2, boxes: AABB[]): MoveResult {
  let { x, y } = position;
  let blockedX = false;
  let blockedY = false;
  const blocked = (bx: number, by: number) => {
    const box = { x: bx, y: by, width: size.x, height: size.y };
    return isAreaSolid(map, box) || boxes.some((b) => boxesOverlap(box, b));
  };
  if (delta.x !== 0) {
    if (!blocked(x + delta.x, y)) x += delta.x;
    else blockedX = true;
  }
  if (delta.y !== 0) {
    if (!blocked(x, y + delta.y)) y += delta.y;
    else blockedY = true;
  }
  return { position: { x, y }, blockedX, blockedY };
}

/**
 * Checks whether the entity's box currently overlaps a map exit tile.
 * Checked against the box center so brushing a corner doesn't trigger it.
 */
export function findExitAt(map: MapDef, box: AABB): import('@/types/game').MapExit | null {
  if (map.exits.length === 0) return null;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const tileX = Math.floor(cx / map.tileSize);
  const tileY = Math.floor(cy / map.tileSize);
  return map.exits.find((e) => e.x === tileX && e.y === tileY) ?? null;
}
