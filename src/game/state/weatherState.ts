/**
 * Weather per island. Deterministic: the weather of an island only depends on
 * the game clock slot (3 game-minutes each), so it is stable while you stay
 * and nothing needs saving.
 */
import type { IconName } from '@/game/ui/iconRegistry';

export type Weather = 'clear' | 'rain' | 'storm' | 'fog' | 'snow' | 'blizzard' | 'ash';

export const WEATHER_SLOT_MS = 3 * 60 * 1000;

/** Jogo novo: nos primeiros minutos de jogo o tempo é SEMPRE limpo, em qualquer ilha. */
export const CLEAR_START_MS = 8 * 60 * 1000;

type Table = [Weather, number][];
const TABLES: Record<string, Table> = {
  main: [['clear', 52], ['rain', 18], ['storm', 8], ['fog', 22]],
  gelo: [['clear', 38], ['snow', 42], ['blizzard', 20]],
  misteriosa: [['clear', 28], ['fog', 50], ['rain', 22]],
  fragments: [['clear', 50], ['rain', 30], ['fog', 20]],
  vulcao: [['clear', 50], ['ash', 50]],
  trevas: [['clear', 20], ['fog', 42], ['rain', 22], ['storm', 16]],
  camp: [['clear', 60], ['rain', 25], ['fog', 15]],
  dogisland: [['clear', 58], ['rain', 28], ['fog', 14]],
};

function hash(a: number, b: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function islandSeed(island: string): number {
  let h = 7;
  for (let i = 0; i < island.length; i++) h = (Math.imul(h, 31) + island.charCodeAt(i)) | 0;
  return h;
}

export function weatherAt(island: string | null, totalMs: number): Weather {
  if (totalMs < CLEAR_START_MS) return 'clear';
  const table = TABLES[island ?? 'main'] ?? TABLES.main;
  const slot = Math.floor(totalMs / WEATHER_SLOT_MS);
  let r = hash(slot, islandSeed(island ?? 'main')) * 100;
  for (const [w, p] of table) {
    if (r < p) return w;
    r -= p;
  }
  return 'clear';
}

export const WEATHER_ICON: Record<Weather, IconName | null> = {
  clear: null,
  rain: 'weather_rain',
  storm: 'weather_storm',
  fog: 'weather_fog',
  snow: 'snow',
  blizzard: 'wind',
  ash: 'weather_ash',
};

export function isRainy(w: Weather): boolean {
  return w === 'rain' || w === 'storm';
}
