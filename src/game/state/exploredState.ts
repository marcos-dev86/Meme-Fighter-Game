import { useSyncExternalStore } from 'react';
import { WORLD_CHUNKS_H, WORLD_CHUNKS_W } from '@/game/world/worldGen';

/**
 * Exploration ("fog of war") for the world map: one flag per minimap cell
 * (= one 24x24-tile chunk). Walking reveals every cell within
 * REVEAL_RADIUS cells of the player; everything else stays grey on the map.
 * Saved with the world (SaveData.explored, a hex string) so it persists per
 * save slot. Not used on HARDCORE (no map there at all).
 */
export const REVEAL_RADIUS = 3; // in cells (chunks); 1 cell = 24 tiles

const W = WORLD_CHUNKS_W;
const H = WORLD_CHUNKS_H;

let explored = new Uint8Array(W * H);
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  listeners.forEach((fn) => fn());
}

export function isExplored(cx: number, cy: number): boolean {
  return cx >= 0 && cy >= 0 && cx < W && cy < H && explored[cy * W + cx] === 1;
}

export function getExploredVersion(): number {
  return version;
}

/** Marks the cells around the player as discovered. Only notifies if something new was revealed. */
export function revealAround(cx: number, cy: number, radius = REVEAL_RADIUS): boolean {
  let changed = false;
  const r2 = radius * radius + 1;
  for (let y = Math.max(0, cy - radius); y <= Math.min(H - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(W - 1, cx + radius); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      const i = y * W + x;
      if (explored[i] === 0) {
        explored[i] = 1;
        changed = true;
      }
    }
  }
  if (changed) notify();
  return changed;
}

export function resetExplored() {
  explored = new Uint8Array(W * H);
  notify();
}

/** Compact save string: 4 cells per hex digit. */
export function getExploredSnapshot(): string {
  let out = '';
  for (let i = 0; i < explored.length; i += 4) {
    const n = (explored[i] << 3) | ((explored[i + 1] ?? 0) << 2) | ((explored[i + 2] ?? 0) << 1) | (explored[i + 3] ?? 0);
    out += n.toString(16);
  }
  return out;
}

export function restoreExplored(snapshot: string | undefined) {
  const next = new Uint8Array(W * H);
  if (typeof snapshot === 'string') {
    for (let k = 0; k < snapshot.length; k++) {
      const n = parseInt(snapshot[k], 16);
      if (Number.isNaN(n)) continue;
      const i = k * 4;
      if (i < next.length) next[i] = (n >> 3) & 1;
      if (i + 1 < next.length) next[i + 1] = (n >> 2) & 1;
      if (i + 2 < next.length) next[i + 2] = (n >> 1) & 1;
      if (i + 3 < next.length) next[i + 3] = n & 1;
    }
  }
  explored = next;
  notify();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Re-renders the caller whenever new ground is discovered; returns the version (use it as a memo key). */
export function useExploredVersion(): number {
  return useSyncExternalStore(subscribe, getExploredVersion, getExploredVersion);
}
