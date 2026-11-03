import { useEffect, useState } from 'react';
import { registerSaveExt } from './saveExt';

/**
 * Day / night cycle: 10 real minutes of day + 10 of night (20-minute cycle),
 * with ~45 s of dusk and ~45 s of dawn blended into each side. The clock only
 * runs while the world screen is open and not paused. Game clock: the day half
 * covers 06:00-18:00, the night half 18:00-06:00.
 */
export const DAY_MS = 10 * 60 * 1000;
export const NIGHT_MS = 10 * 60 * 1000;
export const CYCLE_MS = DAY_MS + NIGHT_MS;
export const TRANSITION_MS = 45 * 1000;

/** A new world starts in the morning (about 07:30). */
const START_MS = 0.06 * CYCLE_MS;

let timeMs = START_MS;
let dayCount = 1;
const listeners = new Set<() => void>();
let lastKey = '';

function smooth(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/** Daylight 1 (full day) .. 0 (full night), eased across dusk and dawn. */
export function lightAt(ms: number): number {
  const p = ((ms % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  if (p < DAY_MS - TRANSITION_MS) return 1;
  if (p < DAY_MS) return 1 - smooth((p - (DAY_MS - TRANSITION_MS)) / TRANSITION_MS);
  if (p < CYCLE_MS - TRANSITION_MS) return 0;
  return smooth((p - (CYCLE_MS - TRANSITION_MS)) / TRANSITION_MS);
}

export function getLight(): number {
  return lightAt(timeMs);
}
export function isNight(): boolean {
  return getLight() < 0.5;
}
export function getDayCount(): number {
  return dayCount;
}
/** Position in the 20-minute cycle (0 = 06:00). */
export function getCycleMs(): number {
  return ((timeMs % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
}
/** Total game time elapsed in ms (monotonic): used to roll weather and shop stock. */
export function getTotalMs(): number {
  return (dayCount - 1) * CYCLE_MS + getCycleMs();
}

export function clockString(ms = timeMs): string {
  const p = ((ms % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  const hours = (6 + (p / CYCLE_MS) * 24) % 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function key(): string {
  // Re-render only when the light changed visibly or the displayed minute changes.
  return `${Math.round(getLight() * 50)}|${clockString().slice(0, 4)}`;
}

export function advanceTime(dtMs: number) {
  if (dtMs <= 0) return;
  const before = Math.floor(timeMs / CYCLE_MS);
  timeMs += dtMs;
  const after = Math.floor(timeMs / CYCLE_MS);
  if (after > before) dayCount += after - before;
  timeMs = ((timeMs % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  const k = key();
  if (k !== lastKey) {
    lastKey = k;
    listeners.forEach((fn) => fn());
  }
}

export function setTimeOfDay(ms: number) {
  timeMs = ((ms % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  lastKey = '';
  advanceTime(0.001);
}

export function subscribeTime(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export interface TimeOfDay {
  light: number;
  night: boolean;
  clock: string;
  day: number;
}

export function useTimeOfDay(): TimeOfDay {
  'use no memo'; // module-level store
  const [, setTick] = useState(0);
  useEffect(() => subscribeTime(() => setTick((n) => n + 1)), []);
  const light = getLight();
  return { light, night: light < 0.5, clock: clockString(), day: dayCount };
}

registerSaveExt({
  key: 'time',
  snapshot: () => ({ timeMs, dayCount }),
  restore: (d) => {
    const x = d as { timeMs?: number; dayCount?: number } | undefined;
    timeMs = typeof x?.timeMs === 'number' ? ((x.timeMs % CYCLE_MS) + CYCLE_MS) % CYCLE_MS : START_MS;
    dayCount = typeof x?.dayCount === 'number' && x.dayCount >= 1 ? Math.floor(x.dayCount) : 1;
    lastKey = '';
  },
  reset: () => {
    timeMs = START_MS;
    dayCount = 1;
    lastKey = '';
  },
});
