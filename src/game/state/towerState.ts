import { useEffect, useState } from 'react';
import { setFlag } from './storyFlags';
import { unlockByEvent } from './rosterState';
import { registerSaveExt } from './saveExt';

/**
 * Tower of Challenges: endless floors of growing enemies, one round each.
 * Local ranking (best runs of this world). Online ranking comes later.
 */
export interface RankEntry {
  name: string;
  floor: number;
  level: number;
  at: number;
}

let bestFloor = 0;
let ranking: RankEntry[] = [];
let claimed: string[] = []; // one-time milestone rewards already taken
/** The run in progress (not saved: leaving the app ends it). */
let run: { start: number; cleared: number; hpPct: number } | null = null;
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

export const MAX_RANKING = 10;

export function getBestFloor() {
  return bestFloor;
}
export function getRanking(): RankEntry[] {
  return ranking.slice();
}
export function isClaimed(id: string) {
  return claimed.includes(id);
}
export function claim(id: string): boolean {
  if (claimed.includes(id)) return false;
  claimed.push(id);
  notify();
  return true;
}

export function getRun() {
  return run;
}
/** Starts a run at `floor` (1 = from the bottom, 11/21/... = checkpoint). */
export function startRun(floor: number) {
  run = { start: floor, cleared: 0, hpPct: 1 };
  notify();
}
export function floorCleared(floor: number, hpPct: number) {
  if (!run) run = { start: floor, cleared: 0, hpPct: 1 };
  run.cleared = Math.max(run.cleared, floor - run.start + 1);
  run.hpPct = Math.min(1, Math.max(0.35, hpPct + 0.35)); // a bit of rest between floors
  if (floor > bestFloor) bestFloor = floor;
  // Segredo: chegar ao andar do rival, lá no alto (missão "Mais Alto na Torre").
  unlockByEvent({ floor }); // elenco do VERSUS: andar 10 libera o Orc
  if (floor >= 10) setFlag('found:sec_torre25');
  if (floor >= 25) setFlag('tower_25');
  notify();
}

/** Ends the run (defeat or leaving) and records it in the ranking if it climbed at least one floor. */
export function endRun(name: string, level: number): RankEntry | null {
  const r = run;
  run = null;
  if (!r || r.cleared <= 0) {
    notify();
    return null;
  }
  const entry: RankEntry = { name, floor: r.start + r.cleared - 1, level, at: Date.now() };
  ranking = [...ranking, entry].sort((a, b) => b.floor - a.floor || a.at - b.at).slice(0, MAX_RANKING);
  notify();
  return entry;
}

/** First floor of the checkpoint the player can resume from (every 10 floors). */
export function checkpointFloor(): number {
  return Math.floor(bestFloor / 10) * 10 + 1;
}

export function useTower(): { best: number; ranking: RankEntry[] } {
  'use no memo'; // module-level store
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return { best: bestFloor, ranking };
}

registerSaveExt({
  key: 'tower',
  snapshot: () => ({ bestFloor, ranking, claimed }),
  restore: (d) => {
    const x = d as { bestFloor?: number; ranking?: RankEntry[]; claimed?: string[] } | undefined;
    bestFloor = typeof x?.bestFloor === 'number' ? x.bestFloor : 0;
    ranking = Array.isArray(x?.ranking) ? x!.ranking!.filter((e) => e && typeof e.floor === 'number').slice(0, MAX_RANKING) : [];
    claimed = Array.isArray(x?.claimed) ? x!.claimed!.filter((c) => typeof c === 'string') : [];
    run = null;
    notify();
  },
  reset: () => {
    bestFloor = 0;
    ranking = [];
    claimed = [];
    run = null;
    notify();
  },
});
