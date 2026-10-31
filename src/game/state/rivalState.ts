import { registerSaveExt } from './saveExt';
import { getLevel } from './playerState';

/**
 * The rival (Gadigago) comes back for rematches and grows stronger: each win
 * (and each level you gain) makes the next duel harder and better paid.
 */
let wins = 0;

export function getRivalWins() {
  return wins;
}
export function addRivalWin() {
  wins += 1;
}

/** Health / damage multipliers of the next rival duel. */
export function rivalScale(): { hp: number; dmg: number } {
  const lv = getLevel();
  return { hp: 1 + lv * 0.045 + wins * 0.12, dmg: 1 + lv * 0.02 + wins * 0.06 };
}

export function rivalReward(): { coins: number; xp: number } {
  return { coins: 40 + wins * 30, xp: 120 + wins * 80 + getLevel() * 6 };
}

registerSaveExt({
  key: 'rival',
  snapshot: () => ({ wins }),
  restore: (d) => {
    const w = (d as { wins?: number } | undefined)?.wins;
    wins = typeof w === 'number' && w >= 0 ? Math.floor(w) : 0;
  },
  reset: () => {
    wins = 0;
  },
});
