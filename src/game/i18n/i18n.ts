import { useEffect, useState } from 'react';
import { STRINGS, type Lang } from './translations';

/** Same shared-singleton pattern as playerState.ts, for the same reason: survives navigating between screens. */
let currentLang: Lang = 'pt';
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang) {
  currentLang = lang;
  notify();
}

export function t(key: string): string {
  return STRINGS[currentLang][key] ?? STRINGS.pt[key] ?? key;
}

export function useI18n() {
  'use no memo'; // module-level store: the React Compiler must not cache what we read from it
  const [, setTick] = useState(0);
  useEffect(() => {
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
    function rerender() {
      setTick((n) => n + 1);
    }
  }, []);
  return { lang: currentLang, t };
}
