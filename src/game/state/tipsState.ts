import { useEffect, useState } from 'react';
import { getSettings } from './settingsState';
import { registerSaveExt } from './saveExt';

/**
 * Contextual tips: shown the first time something happens (first night, first
 * rain, first shop...), once per save. The player can skip one or turn all
 * tips off ("DICAS NO JOGO" in the options). Texts are translation keys `tip_<id>`.
 */
const seen = new Set<string>();
const queue: string[] = [];
let current: string | null = null;
const listeners = new Set<() => void>();
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  listeners.forEach((fn) => fn());
}

function next() {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
  current = queue.shift() ?? null;
  if (current) hideTimer = setTimeout(dismissTip, 9000);
  notify();
}

/** Offers a tip; ignored if tips are off or this one was already shown. */
export function tip(id: string) {
  if (!getSettings().tips || seen.has(id)) return;
  seen.add(id);
  if (current) queue.push(id);
  else {
    current = id;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(dismissTip, 9000);
    notify();
  }
}

export function dismissTip() {
  next();
}

/** Drops the pending tips (tips turned off from the banner). */
export function clearTips() {
  queue.length = 0;
  next();
}

export function getCurrentTip(): string | null {
  return current;
}

export function useCurrentTip(): string | null {
  'use no memo'; // module-level store
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return current;
}

registerSaveExt({
  key: 'tips',
  snapshot: () => ({ seen: [...seen] }),
  restore: (d) => {
    seen.clear();
    const arr = (d as { seen?: unknown } | undefined)?.seen;
    if (Array.isArray(arr)) for (const v of arr) if (typeof v === 'string') seen.add(v);
  },
  reset: () => {
    seen.clear();
  },
});
