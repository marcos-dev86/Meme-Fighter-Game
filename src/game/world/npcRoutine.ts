import type { MapDef } from '@/types/game';
import { overworld } from './overworld';
import { CYCLE_MS, getCycleMs } from '@/game/state/timeState';
import type { OutdoorPlacement } from './npcs';

/**
 * Daily routine of the townsfolk: morning at their usual spot, afternoon a few
 * tiles away, evening/night at a third spot (some of them asleep).
 * They WALK between the spots (slowly, over about half a game hour), so the
 * villagers are never gone: mission NPCs can always be found, just somewhere
 * else, and the mission arrow follows them.
 */
const ROUTINE = new Set([
  'npc_padrao', 'toinho', 'pipoca', 'zeca', 'turista', 'tico', 'silvana', 'polen', 'violeta',
  'gemada', 'espinho', 'penumbra', 'alpinista', 'bento', 'iara', 'rocha', 'garoto_sombrio',
]);

const WALKABLE = new Set(['grass', 'path', 'sand', 'stone', 'snow', 'ash', 'flower']);

function hashStr(s: string): number {
  let h = 17;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return (h >>> 0) / 4294967296;
}

function freeSpot(map: MapDef, x: number, y: number): boolean {
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (!WALKABLE.has(map.getTile(x + ox, y + oy))) return false;
  return true;
}

interface Plan {
  a: { x: number; y: number };
  b: { x: number; y: number };
  c: { x: number; y: number };
  sleeps: boolean;
}
const plans = new Map<string, Plan>();

function planFor(p: OutdoorPlacement, map: MapDef): Plan | null {
  if (!ROUTINE.has(p.npcId)) return null;
  const key = `${p.npcId}_${p.x}_${p.y}`;
  const cached = plans.get(key);
  if (cached) return cached;
  const home = { x: p.x, y: p.y };
  const cands: { x: number; y: number }[] = [];
  for (let r = 3; r <= 7; r++) {
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
        if (freeSpot(map, p.x + ox, p.y + oy)) cands.push({ x: p.x + ox, y: p.y + oy });
      }
    }
  }
  const pick = (salt: string) => (cands.length ? cands[Math.floor(hashStr(key + salt) * cands.length)] : home);
  const plan: Plan = { a: home, b: pick('b'), c: pick('c'), sleeps: hashStr(key + 'z') > 0.45 };
  plans.set(key, plan);
  return plan;
}

export interface NpcPose {
  /** Tile coordinates (fractional while walking). */
  x: number;
  y: number;
  walking: boolean;
  /** 1 = looking right, -1 = left (only while walking). */
  dir: 1 | -1;
  asleep: boolean;
}

function smooth(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/** Where this NPC is right now (`cycleMs` = position in the 20-minute cycle; defaults to the live clock). */
export function npcPose(p: OutdoorPlacement, cycleMs: number = getCycleMs(), map: MapDef = overworld): NpcPose {
  const plan = planFor(p, map);
  if (!plan) return { x: p.x, y: p.y, walking: false, dir: 1, asleep: false };
  const t = 6 + (cycleMs / CYCLE_MS) * 24; // game hour 6..30
  const WALK = 0.6;
  const leg = (from: { x: number; y: number }, to: { x: number; y: number }, k: number): NpcPose => {
    const e = smooth(k);
    return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, walking: k > 0 && k < 1, dir: to.x >= from.x ? 1 : -1, asleep: false };
  };
  if (t < 13 - WALK) return { x: plan.a.x, y: plan.a.y, walking: false, dir: 1, asleep: false };
  if (t < 13) return leg(plan.a, plan.b, (t - (13 - WALK)) / WALK);
  if (t < 18 - WALK) return { x: plan.b.x, y: plan.b.y, walking: false, dir: 1, asleep: false };
  if (t < 18) return leg(plan.b, plan.c, (t - (18 - WALK)) / WALK);
  if (t < 30 - WALK) return { x: plan.c.x, y: plan.c.y, walking: false, dir: 1, asleep: plan.sleeps && t > 20 };
  return leg(plan.c, plan.a, (t - (30 - WALK)) / WALK);
}
