import { Easing, cancelAnimation, makeMutable, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

/**
 * Shared animation clocks for the sea: `waveT` loops 0..1 every WAVE_MS (the
 * foam washes in and out) and `tide` (0 = low tide, 1 = high tide) follows
 * the day clock, so the washes reach further at high tide.
 */
export const WAVE_MS = 4800;
export const waveT = makeMutable(0);
export const tide = makeMutable(0.5);

let started = false;
export function startWaves() {
  if (started) return;
  started = true;
  waveT.value = withRepeat(withTiming(1, { duration: WAVE_MS, easing: Easing.linear }), -1, false);
}

/** Pausa/retoma o vai e vem das ondas (pausa de verdade). */
export function setWavesPaused(paused: boolean) {
  if (!started) return;
  if (paused) {
    cancelAnimation(waveT);
    return;
  }
  const rem = Math.max(30, WAVE_MS * (1 - Math.min(1, Math.max(0, waveT.value))));
  waveT.value = withSequence(
    withTiming(1, { duration: rem, easing: Easing.linear }),
    withTiming(0, { duration: 0 }),
    withRepeat(withTiming(1, { duration: WAVE_MS, easing: Easing.linear }), -1, false),
  );
}

/** Two tides per 20-minute day/night cycle. */
export function tideLevelAt(cycleMs: number, cycleLen: number): number {
  return 0.5 + 0.5 * Math.sin((cycleMs / cycleLen) * Math.PI * 4);
}
