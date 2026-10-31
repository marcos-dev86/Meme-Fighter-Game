import type { MapDef } from '@/types/game';

/**
 * Sea route for the ferry animation: a path over open water between two
 * boat spots (tile coordinates), found with A* on a coarse grid (4x4 tiles
 * per cell, so ~180k cells) and then "string pulled" so the boat sails in
 * long straight legs instead of staircase zig-zags. If no water path is
 * found the route is just the straight line.
 */
export interface SeaPoint {
  x: number;
  y: number;
}

const G = 4;

function isWater(map: MapDef, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false;
  return map.getTile(tx, ty) === 'water';
}

function clearLine(map: MapDef, a: SeaPoint, b: SeaPoint): boolean {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(dist / 0.75));
  for (let i = 0; i <= steps; i++) {
    const x = a.x + ((b.x - a.x) * i) / steps;
    const y = a.y + ((b.y - a.y) * i) / steps;
    // A little margin (boat is ~3 tiles wide): the tile and its 4 neighbours must be water.
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (!(isWater(map, tx, ty) && isWater(map, tx + 1, ty) && isWater(map, tx - 1, ty) && isWater(map, tx, ty + 1) && isWater(map, tx, ty - 1))) return false;
  }
  return true;
}

export function findSeaRoute(map: MapDef, from: SeaPoint, to: SeaPoint): SeaPoint[] {
  const cw = Math.ceil(map.width / G);
  const ch = Math.ceil(map.height / G);
  const waterCell = (cx: number, cy: number) => {
    if (cx < 0 || cy < 0 || cx >= cw || cy >= ch) return false;
    const x = cx * G;
    const y = cy * G;
    return isWater(map, x + 1, y + 1) && isWater(map, x + 2, y + 1) && isWater(map, x + 1, y + 2) && isWater(map, x + 2, y + 2) && isWater(map, x, y) && isWater(map, x + 3, y + 3);
  };
  const cellOf = (p: SeaPoint) => ({ cx: Math.floor(p.x / G), cy: Math.floor(p.y / G) });
  const snap = (p: SeaPoint) => {
    const c = cellOf(p);
    if (waterCell(c.cx, c.cy)) return c;
    for (let r = 1; r <= 8; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (waterCell(c.cx + dx, c.cy + dy)) return { cx: c.cx + dx, cy: c.cy + dy };
        }
      }
    }
    return null;
  };
  const s = snap(from);
  const e = snap(to);
  if (!s || !e) return [from, to];

  const idx = (cx: number, cy: number) => cy * cw + cx;
  const gScore = new Float32Array(cw * ch).fill(Infinity);
  const prev = new Int32Array(cw * ch).fill(-1);
  const closed = new Uint8Array(cw * ch);
  const water = new Int8Array(cw * ch); // 0 unknown, 1 water, -1 land
  const wc = (cx: number, cy: number) => {
    if (cx < 0 || cy < 0 || cx >= cw || cy >= ch) return false;
    const i = idx(cx, cy);
    if (water[i] === 0) water[i] = waterCell(cx, cy) ? 1 : -1;
    return water[i] === 1;
  };
  // Binary heap of [f, index].
  const heap: [number, number][] = [];
  const push = (f: number, i: number) => {
    heap.push([f, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };

  const si = idx(s.cx, s.cy);
  const ei = idx(e.cx, e.cy);
  gScore[si] = 0;
  push(Math.hypot(e.cx - s.cx, e.cy - s.cy), si);
  const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let found = false;
  while (heap.length) {
    const [, cur] = pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === ei) {
      found = true;
      break;
    }
    const cx = cur % cw;
    const cy = (cur / cw) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!wc(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && !(wc(cx + dx, cy) && wc(cx, cy + dy))) continue;
      const ni = idx(nx, ny);
      if (closed[ni]) continue;
      const cost = gScore[cur] + (dx !== 0 && dy !== 0 ? 1.4142 : 1);
      if (cost < gScore[ni]) {
        gScore[ni] = cost;
        prev[ni] = cur;
        push(cost + Math.hypot(e.cx - nx, e.cy - ny), ni);
      }
    }
  }
  if (!found) return [from, to];

  // Rebuild cell path -> tile-center points.
  const cells: SeaPoint[] = [];
  for (let i = ei; i !== -1; i = prev[i]) cells.push({ x: (i % cw) * G + G / 2, y: Math.floor(i / cw) * G + G / 2 });
  cells.reverse();
  const pts: SeaPoint[] = [from, ...cells.slice(1, -1), to];

  // String pulling: from each point jump to the farthest one still in clear sight.
  const out: SeaPoint[] = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !clearLine(map, pts[i], pts[j])) j--;
    out.push(pts[j]);
    i = j;
  }
  return out;
}

/** Total length (tiles) of a route. */
export function routeLength(route: SeaPoint[]): number {
  let t = 0;
  for (let i = 1; i < route.length; i++) t += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
  return t;
}
