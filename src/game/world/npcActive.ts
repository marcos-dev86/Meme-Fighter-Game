import { getLight, getTotalMs } from '@/game/state/timeState';
import { isRainy, weatherAt } from '@/game/state/weatherState';
import type { OutdoorPlacement } from './npcs';

/** NPCs secretos só existem à noite ou na chuva (OutdoorPlacement.only). Os demais estão sempre lá. */
export function isPlacementActive(p: OutdoorPlacement): boolean {
  if (!p.only) return true;
  if (p.only === 'night') return getLight() < 0.4;
  return isRainy(weatherAt('main', getTotalMs()));
}
