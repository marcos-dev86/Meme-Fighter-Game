import { useEffect, useState } from 'react';
import { registerSaveExt } from './saveExt';
import { getQuestStatus } from './questState';
import type { CharacterKey } from '@/game/battle/Fighter';

/**
 * One boss per island. Five are new world bosses you challenge where they
 * stand (main, misteriosa, fragments, gelo, trevas); the other three are the
 * story fights that already existed (camp captain, dog king, volcano tank):
 * they count as the boss of their island once the mission is done.
 * Every boss changes pattern at 50% health (Fighter.enterPhase2).
 */
export interface BossDef {
  id: string;
  island: string;
  name: string;
  character: CharacterKey;
  stageKey: string;
  /** Tile where the boss waits (null = story boss, fought through its mission). */
  spot: { x: number; y: number } | null;
  /** Mission that is this boss's fight (story bosses). */
  storyMission?: string;
  /** Duelo amigavel (ex.: Cara Tranquilo): o marcador no mapa nao leva a caveira de chefe. */
  friendly?: boolean;
  /** Suggested level (just a hint on the challenge prompt). */
  level: number;
  hpMult: number;
  dmgMult: number;
  reward: { coins: number; xp: number; items?: Record<string, number>; bag?: string };
}

export const BOSSES: BossDef[] = [
  { id: 'boss_main', island: 'main', name: 'Sombra Ladra-Memes', character: 'ninja', stageKey: 'stage_2', spot: { x: 875, y: 871 }, level: 8, hpMult: 1, dmgMult: 1, reward: { coins: 150, xp: 300, items: { moon_elixir: 2 } } },
  { id: 'boss_misteriosa', island: 'misteriosa', name: 'Encapuzado Misterioso', character: 'mystic', stageKey: 'stage_1', spot: { x: 1128, y: 220 }, level: 18, hpMult: 1.3, dmgMult: 1.1, reward: { coins: 200, xp: 500, items: { power_brew: 2 } } },
  { id: 'boss_fragments', island: 'fragments', name: 'Dragão da Floresta', character: 'green_dragon', stageKey: 'stage_3', spot: { x: 1690, y: 1040 }, level: 28, hpMult: 1.6, dmgMult: 1.2, reward: { coins: 250, xp: 650, items: { potion_hp_l: 3 } } },
  { id: 'boss_gelo', island: 'gelo', name: 'Dragão do Gelo', character: 'ice_dragon', stageKey: 'stage_1', spot: { x: 138, y: 498 }, level: 40, hpMult: 2, dmgMult: 1.35, reward: { coins: 300, xp: 800, bag: 'bag_arcane' } },
  { id: 'boss_trevas', island: 'trevas', name: 'Dragão Sombrio', character: 'shadow_dragon', stageKey: 'stage_2', spot: { x: 113, y: 236 }, level: 55, hpMult: 2.6, dmgMult: 1.5, reward: { coins: 500, xp: 1500, items: { night_brew: 2 } } },
  { id: 'boss_troll', island: 'misteriosa', name: 'Troll Face', character: 'troll_face', stageKey: 'stage_3', spot: { x: 1128, y: 178 }, level: 20, hpMult: 1.2, dmgMult: 1, reward: { coins: 200, xp: 400, items: { power_brew: 1 } } },
  { id: 'boss_chill', island: 'main', name: 'Cara Tranquilo', character: 'cara_tranquilo', stageKey: 'stage_1', spot: { x: 880, y: 950 }, friendly: true, level: 6, hpMult: 0.9, dmgMult: 0.8, reward: { coins: 60, xp: 120 } },
  { id: 'boss_chill_2', island: 'fragments', name: 'Cara Tranquilo', character: 'cara_tranquilo', stageKey: 'stage_3', spot: { x: 1690, y: 1043 }, friendly: true, level: 30, hpMult: 1.6, dmgMult: 1.2, reward: { coins: 180, xp: 450, items: { potion_hp_l: 2 } } },
  { id: 'boss_camp', island: 'camp', name: 'Capitão Ferro', character: 'soldier', stageKey: 'stage_2', spot: null, storyMission: 'camp_showdown', level: 22, hpMult: 1, dmgMult: 1, reward: { coins: 0, xp: 0 } },
  { id: 'boss_dogisland', island: 'dogisland', name: 'Rei dos Cães', character: 'dogking', stageKey: 'stage_3', spot: null, storyMission: 'island_boss', level: 32, hpMult: 1, dmgMult: 1, reward: { coins: 0, xp: 0 } },
  { id: 'boss_vulcao', island: 'vulcao', name: 'Guardião do Vulcão', character: 'tank', stageKey: 'stage_2', spot: null, storyMission: 'vulcao_boss', level: 45, hpMult: 1, dmgMult: 1, reward: { coins: 0, xp: 0 } },
];

export const BOSS_BY_ID: Record<string, BossDef> = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

const defeated = new Set<string>();
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

export function isBossDefeated(id: string): boolean {
  const b = BOSS_BY_ID[id];
  if (!b) return false;
  if (b.storyMission) return getQuestStatus(b.storyMission) === 'completed';
  return defeated.has(id);
}

/** Marks a world boss as beaten; returns true the first time. */
export function markBossDefeated(id: string): boolean {
  if (defeated.has(id)) return false;
  defeated.add(id);
  notify();
  return true;
}

export function defeatedBossCount(): number {
  return BOSSES.filter((b) => isBossDefeated(b.id)).length;
}

export function useBosses(): number {
  'use no memo'; // module-level store
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return defeatedBossCount();
}

registerSaveExt({
  key: 'bosses',
  snapshot: () => ({ defeated: [...defeated] }),
  restore: (d) => {
    defeated.clear();
    const arr = (d as { defeated?: unknown } | undefined)?.defeated;
    if (Array.isArray(arr)) for (const v of arr) if (typeof v === 'string' && BOSS_BY_ID[v]) defeated.add(v);
    notify();
  },
  reset: () => {
    defeated.clear();
    notify();
  },
});
