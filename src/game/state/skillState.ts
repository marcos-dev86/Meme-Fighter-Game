import { useEffect, useState } from 'react';
import { registerSaveExt } from './saveExt';
import { getStoryCharacterId } from './questState';
import { getCoins, spendCoins, spendStatPoints, addStatPoints, getStatPoints } from './playerState';
import { SKILL_TREES, skillById, type SkillDef } from '@/game/items/skills';

/** Skills learned in this world (they belong to the save's character). */
const learned = new Set<string>();
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

export const RESPEC_COST = 500;

export function getLearned(): string[] {
  return [...learned];
}
export function hasSkill(id: string): boolean {
  return learned.has(id);
}
export function skillPointsSpent(): number {
  const ch = getStoryCharacterId();
  let n = 0;
  for (const id of learned) n += skillById(ch, id)?.cost ?? 0;
  return n;
}

export function canLearn(sk: SkillDef): 'ok' | 'owned' | 'locked' | 'points' {
  if (learned.has(sk.id)) return 'owned';
  if (!sk.requires.every((r) => learned.has(r))) return 'locked';
  if (getStatPoints() < sk.cost) return 'points';
  return 'ok';
}

export function learnSkill(id: string): boolean {
  const sk = skillById(getStoryCharacterId(), id);
  if (!sk || canLearn(sk) !== 'ok') return false;
  if (!spendStatPoints(sk.cost)) return false;
  learned.add(id);
  notify();
  return true;
}

/** Forgets every skill and refunds the points, for a fee in coins. */
export function respec(): boolean {
  const refund = skillPointsSpent();
  if (refund <= 0) return false;
  if (getCoins() < RESPEC_COST || !spendCoins(RESPEC_COST)) return false;
  learned.clear();
  addStatPoints(refund);
  notify();
  return true;
}

export function useSkills(): string[] {
  'use no memo'; // module-level store
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return [...learned];
}

registerSaveExt({
  key: 'skills',
  snapshot: () => ({ learned: [...learned] }),
  restore: (d) => {
    learned.clear();
    const arr = (d as { learned?: unknown } | undefined)?.learned;
    // Saves antigos (antes da Parte 36): a habilidade final antiga ('d_c' / 'g_c', custo 4) não
    // existe mais. Ela sai da lista e os pontos voltam.
    let refund = 0;
    if (Array.isArray(arr)) {
      for (const v of arr) {
        if (typeof v !== 'string') continue;
        const exists = Object.values(SKILL_TREES).some((tr) => tr.skills.some((sk) => sk.id === v));
        if (exists) learned.add(v);
        else if (v === 'd_c' || v === 'g_c') refund += 4;
      }
    }
    if (refund > 0) addStatPoints(refund);
    notify();
  },
  reset: () => {
    learned.clear();
    notify();
  },
});
