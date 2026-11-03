import { useEffect, useState } from 'react';

/**
 * The 3-island backstory (see docs/AUDIT.md): an ancient battle split the
 * land into 3 fragment islands. A broken monument on Fragment C shows
 * the opening of an inscription; the rest is hidden on Fragments A and B
 * (B's piece is tied to the "useless treasure" find - see itemDefs.ts's
 * old_coin - so finding it means something later, without a physical
 * reward being the point of the exploration).
 */

export type LorePieceId = 'fragA' | 'fragB' | 'fragC';

export const LORE_PIECES: Record<LorePieceId, string> = {
  fragC: 'Quando a ilha foi partida,',
  fragA: 'o poder que a mantinha inteira se espalhou pelas três terras.',
  fragB: 'Só quem reunir as três partes vai entender o que realmente foi perdido.',
};

const ORDER: LorePieceId[] = ['fragC', 'fragA', 'fragB'];

const found: Record<LorePieceId, boolean> = { fragA: false, fragB: false, fragC: false };
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

export function markLorePieceFound(id: LorePieceId): boolean {
  if (found[id]) return false; // already had it
  found[id] = true;
  notify();
  return true;
}

export function isLorePieceFound(id: LorePieceId): boolean {
  return found[id];
}

export function allLorePiecesFound(): boolean {
  return ORDER.every((id) => found[id]);
}

export function combinedInscription(): string {
  return ORDER.map((id) => LORE_PIECES[id]).join(' ');
}

export function useLoreState() {
  'use no memo'; // module-level store: the React Compiler must not cache what we read from it
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return { found: { ...found }, allFound: allLorePiecesFound() };
}

/** For the save system (saveState.ts). */
export function getLoreStateSnapshot(): Record<LorePieceId, boolean> {
  return { ...found };
}

/** For the save system: overwrite this module's state from a loaded save. */
export function restoreLoreState(data: Record<LorePieceId, boolean>) {
  for (const id of ORDER) found[id] = data[id] ?? false;
  notify();
}
