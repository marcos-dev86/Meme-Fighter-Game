import { useEffect, useState } from 'react';
import { getQuestStatus } from './questState';

/**
 * Which distant islands the ferry will sail to. Per the brief: only the
 * islands "beside the main island" start unlocked (Ilha Misteriosa and
 * the 3-fragment cluster read as close/adjacent in the reference
 * drawings); Vulcao and Ilha das Trevas gate behind story progress.
 *
 * Real per-island unlock missions (defeat the Vulcao boss, etc.) don't
 * exist yet - see docs/AUDIT.md - so for now these reuse the existing
 * camp/island quest completions as honest placeholder gates rather than
 * a fake "always unlocked" state, until the real content is built.
 */
export type IslandId = 'main' | 'main_west' | 'misteriosa' | 'fragments' | 'vulcao' | 'trevas' | 'camp' | 'dogisland' | 'gelo';
/** The REAL islands (what missions/arrow talk about). 'main_west' is only a second dock of the main island. */
export type RealIslandId = Exclude<IslandId, 'main_west'>;
/** Island a ferry stop belongs to. */
export function realIslandOf(id: IslandId): RealIslandId {
  return id === 'main_west' ? 'main' : id;
}

export interface IslandDef {
  id: IslandId;
  fare: number;
  unlockedFromStart: boolean;
  /** Quest that must be completed to unlock this island, if not from the start. */
  unlockQuestId?: string;
}

export const ISLANDS: Record<IslandId, IslandDef> = {
  main: { id: 'main', fare: 0, unlockedFromStart: true },
  main_west: { id: 'main_west', fare: 4, unlockedFromStart: true },
  misteriosa: { id: 'misteriosa', fare: 7, unlockedFromStart: true },
  fragments: { id: 'fragments', fare: 7, unlockedFromStart: true },
  camp: { id: 'camp', fare: 7, unlockedFromStart: true },
  dogisland: { id: 'dogisland', fare: 11, unlockedFromStart: true },
  // The ice island is only reachable by boat, and the sailors only go there once the three fragments are read.
  gelo: { id: 'gelo', fare: 21, unlockedFromStart: false, unlockQuestId: 'lore_complete' },
  vulcao: { id: 'vulcao', fare: 17, unlockedFromStart: false, unlockQuestId: 'camp_showdown' },
  trevas: { id: 'trevas', fare: 28, unlockedFromStart: false, unlockQuestId: 'vulcao_boss' },
};

export function isIslandUnlocked(id: IslandId): boolean {
  const def = ISLANDS[id];
  if (def.unlockedFromStart) return true;
  if (def.unlockQuestId) return getQuestStatus(def.unlockQuestId) === 'completed';
  return false;
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

/** Re-renders on quest-state changes too, since unlock status derives from it. */
export function useIslandUnlocks() {
  'use no memo'; // module-level store: the React Compiler must not cache what we read from it
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return Object.values(ISLANDS).map((def) => ({ ...def, unlocked: isIslandUnlocked(def.id) }));
}

/** Call after any quest completes so ferry screens re-render immediately. */
export function refreshIslandUnlocks() {
  notify();
}
