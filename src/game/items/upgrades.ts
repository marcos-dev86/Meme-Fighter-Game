import type { IconName } from '@/game/ui/iconRegistry';
import type { Fighter } from '@/game/battle/Fighter';

/**
 * Permanent stat upgrades (STATUS > Pontos de Poder, see docs/AUDIT.md) - different
 * from itemDefs.ts's potions/buffs: those are consumable, pre-battle-only
 * bonuses; these are permanent, leveled 1-10, raised with STATUS POINTS
 * (earned by levelling up, increasing cost per level), and apply to the player's Fighter every time one is
 * created (world AND battle - see applyUpgrades below, called from both
 * WorldScreen and BattleScreen).
 */

export type UpgradeStat = 'health' | 'aura' | 'speed' | 'force';

export const UPGRADE_STATS: UpgradeStat[] = ['health', 'aura', 'speed', 'force'];
export const MAX_LEVEL = 10;

/** Bonus per attribute level above 1 (raised in Part 34: the old values were too small to feel). At level 10: +108 vida, +135% aura, +36% velocidade, +90% dano. */
export const HEALTH_PER_LEVEL = 12;
export const AURA_PER_LEVEL = 0.15;
export const SPEED_PER_LEVEL = 0.04;
export const FORCE_PER_LEVEL = 0.1;

export const UPGRADE_META: Record<UpgradeStat, { name: string; icon: IconName; perLevel: string }> = {
  health: { name: 'Vida', icon: 'heart', perLevel: `+${HEALTH_PER_LEVEL} de vida máxima` },
  aura: { name: 'Aura', icon: 'bolt', perLevel: `+${Math.round(AURA_PER_LEVEL * 100)}% de velocidade ao farmar aura` },
  speed: { name: 'Velocidade', icon: 'wind', perLevel: `+${Math.round(SPEED_PER_LEVEL * 100)}% de velocidade de movimento` },
  force: { name: 'Força', icon: 'fist', perLevel: `+${Math.round(FORCE_PER_LEVEL * 100)}% de dano em todos os golpes` },
};

/** Walking-speed multiplier of the Velocidade attribute. */
export function upgradeSpeedMult(speedLevel: number): number {
  return 1 + (speedLevel - 1) * SPEED_PER_LEVEL;
}

/** STATUS POINTS (1 per player level, see levels.ts) needed to go FROM
 * attribute level (index+1) TO (index+2): 9 entries cover 1->2 through
 * 9->10. Each next level costs more points (maxing one attribute = 25). */
export const UPGRADE_POINT_COSTS = [1, 1, 2, 2, 3, 3, 4, 4, 5];

/** Status points to raise an attribute one level; null at MAX_LEVEL. */
export function costForNextLevel(level: number): number | null {
  if (level >= MAX_LEVEL) return null;
  return UPGRADE_POINT_COSTS[level - 1];
}

/** Applied once, right after a player Fighter is created - see
 * WorldScreen.tsx/BattleScreen.tsx (both apply this in a useEffect, never
 * inline during render - see docs/AUDIT.md for why that matters: doing
 * it during render was the exact bug the pre-battle item buffs had). */
export function applyUpgrades(fighter: Fighter, levels: Record<UpgradeStat, number>) {
  const hBonus = (levels.health - 1) * HEALTH_PER_LEVEL;
  fighter.maxHealth += hBonus;
  fighter.health = fighter.maxHealth;
  fighter.chargeRate *= 1 + (levels.aura - 1) * AURA_PER_LEVEL;
  const speedMult = upgradeSpeedMult(levels.speed);
  fighter.speed *= speedMult;
  fighter.dashSpeed *= speedMult;
  const forceMult = 1 + (levels.force - 1) * FORCE_PER_LEVEL;
  fighter.strongDamage *= forceMult;
  fighter.flashDamage *= forceMult;
  fighter.ultimateDamage *= forceMult;
}
