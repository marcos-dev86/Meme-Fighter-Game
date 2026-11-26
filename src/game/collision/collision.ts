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

/* ------------------------------------------------------------------ */
/* Corpos sólidos (NPCs, inimigos, chefes), pulo útil e uma direção só */
/* ------------------------------------------------------------------ */

/** Obstáculos que o pulo consegue atravessar: pedras e troncos/árvores. */
const JUMPABLE_TILES = new Set<string>(['rock', 'tree']);

/**
 * Obstáculo FINO: uma pedra ou árvore com chão livre dos dois lados em algum eixo (uma pedra no caminho, um tronco
 * isolado, uma cerca de uma fileira só). Paredões, montanhas e florestas fechadas têm vizinhos sólidos e continuam intransponíveis.
 */
export function isThinObstacle(map: MapDef, tileX: number, tileY: number): boolean {
  const type = map.getTile(tileX, tileY);
  if (!type || !JUMPABLE_TILES.has(type)) return false;
  const free = (x: number, y: number) => !isTileSolid(map, x, y);
  return (free(tileX - 1, tileY) && free(tileX + 1, tileY)) || (free(tileX, tileY - 1) && free(tileX, tileY + 1));
}

/** Como isAreaSolid, mas no ar os obstáculos finos não bloqueiam. */
export function isAreaSolidAirborne(map: MapDef, box: AABB): boolean {
  const left = Math.floor(box.x / map.tileSize);
  const right = Math.floor((box.x + box.width - 0.01) / map.tileSize);
  const top = Math.floor(box.y / map.tileSize);
  const bottom = Math.floor((box.y + box.height - 0.01) / map.tileSize);
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (isTileSolid(map, tx, ty) && !isThinObstacle(map, tx, ty)) return true;
    }
  }
  return false;
}

/**
 * Anda como resolveMove, com duas regras a mais:
 *  - `bodies`: corpos sólidos livres (NPCs, inimigos, chefes). Ninguém atravessa ninguém; um corpo que JÁ encosta no jogador
 *    é ignorado, para ele sempre conseguir se afastar (nunca fica preso);
 *  - `airborne`: no pulo, passa por cima dos corpos e dos obstáculos finos.
 */
export function resolveMoveSolid(map: MapDef, position: Vector2, size: Vector2, delta: Vector2, bodies: AABB[], airborne: boolean): MoveResult {
  let { x, y } = position;
  let blockedX = false;
  let blockedY = false;
  const here = { x, y, width: size.x, height: size.y };
  const active = airborne ? [] : bodies.filter((b) => !boxesOverlap(here, b));
  const blocked = (bx: number, by: number) => {
    const box = { x: bx, y: by, width: size.x, height: size.y };
    return (airborne ? isAreaSolidAirborne(map, box) : isAreaSolid(map, box)) || active.some((b) => boxesOverlap(box, b));
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
 * Ao terminar o pulo: se o jogador pousou dentro de uma pedra/árvore, empurra para o chão livre mais perto (olhando primeiro
 * para a frente, na direção em que andava); se não achar, volta ao último ponto seguro.
 */
export function landFromJump(map: MapDef, position: Vector2, size: Vector2, facing: Vector2, lastSafe: Vector2): Vector2 {
  const fits = (p: Vector2) => !isAreaSolid(map, { x: p.x, y: p.y, width: size.x, height: size.y });
  if (fits(position)) return position;
  const ts = map.tileSize;
  const fx = Math.sign(facing.x);
  const fy = Math.sign(facing.y);
  for (let k = 1; k <= 6; k++) {
    const d = (ts / 4) * k;
    const tries: Vector2[] = [
      { x: position.x + fx * d, y: position.y + fy * d },
      { x: position.x - fx * d, y: position.y - fy * d },
      { x: position.x + d, y: position.y }, { x: position.x - d, y: position.y },
      { x: position.x, y: position.y + d }, { x: position.x, y: position.y - d },
    ];
    for (const t of tries) if (fits(t)) return t;
  }
  return lastSafe;
}

/**
 * UMA direção por vez (sem diagonal). Se duas direções de eixos diferentes estão apertadas, vale a que foi apertada por
 * último (`lastAxis`); quem chama guarda o eixo novo devolvido para o próximo quadro.
 */
export function singleAxisInput(
  input: { left: boolean; right: boolean; up: boolean; down: boolean },
  prev: { x: boolean; y: boolean },
  lastAxis: 'x' | 'y',
): { dx: number; dy: number; axis: 'x' | 'y'; held: { x: boolean; y: boolean } } {
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const held = { x: dx !== 0, y: dy !== 0 };
  let axis = lastAxis;
  if (held.x && !prev.x) axis = 'x';
  if (held.y && !prev.y) axis = 'y';
  if (dx !== 0 && dy !== 0) {
    if (axis === 'x') dy = 0;
    else dx = 0;
  } else if (dx !== 0) axis = 'x';
  else if (dy !== 0) axis = 'y';
  return { dx, dy, axis, held };
}

/** Caixa do corpo de um NPC/inimigo/chefe: ~0,7 bloco de largura por ~0,5 de altura, com o centro dos pés em (cx, cy). */
export function bodyBox(cx: number, cy: number, tileSize: number): AABB {
  const w = tileSize * 0.7;
  const h = tileSize * 0.5;
  return { x: cx - w / 2, y: cy - h, width: w, height: h };
}
