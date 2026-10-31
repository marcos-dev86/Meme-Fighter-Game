/**
 * Player level / XP curve. XP comes from monsters, missions, bosses and the
 * challenge tower; every level gives STATUS POINTS (spent in STATUS > Power Points / Skill Tree on
 * Vida / Aura / Velocidade / Força and in the skill tree - see upgrades.ts).
 *
 * The level cap is 99 and reaching it is required for the platinum (100%).
 * Up to level 15 the curve is the original one (30, 50, 78, 114, ... about
 * 1k XP per level at 15); after that every level asks 55 XP more than the
 * last (about 5.7k at level 98, ~290k XP in total) - the tower is the main
 * place to farm that. Levels 2-50 give 1 status point, levels 51-99 give 2
 * (147 points in total: 100 max all four attributes, the rest go to the tree).
 */
export const MAX_PLAYER_LEVEL = 99;

/** XP needed to go from `level` to `level + 1` (0 at the level cap). */
export function xpToNext(level: number): number {
  if (level >= MAX_PLAYER_LEVEL) return 0;
  const n = Math.max(0, level - 1);
  if (n <= 14) return Math.round(30 + 16 * n + 4 * n * n);
  return 1038 + 55 * (n - 14);
}

/** Status points earned on reaching `level`. */
export function pointsForReaching(level: number): number {
  return level > 50 ? 2 : 1;
}

/** Total status points a player has earned by `level`. */
export function totalPointsAt(level: number): number {
  let sum = 0;
  for (let l = 2; l <= level; l++) sum += pointsForReaching(l);
  return sum;
}
