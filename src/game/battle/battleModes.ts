import type { CharacterKey, StatusProc } from './Fighter';
import { BOSS_BY_ID, markBossDefeated, type BossDef } from '@/game/state/bossState';
import { setFlag } from '@/game/state/storyFlags';
import { FIGHTER_NAME, unlockByEvent } from '@/game/state/rosterState';
import { addCoins, addItem, addXp, giveBag } from '@/game/state/playerState';
import { BAGS } from '@/game/items/bags';
import { itemName } from '@/game/items/itemDefs';
import { addRivalWin, rivalReward, rivalScale, getRivalWins } from '@/game/state/rivalState';
import { claim, floorCleared } from '@/game/state/towerState';

/**
 * What a battle IS, resolved from the route params: a plain/quest fight, a
 * world boss, a tower floor or a rival rematch. Keeps BattleScreen free of
 * mode details (who the opponent is, how strong, what you win).
 */
export type BattleKind = 'free' | 'quest' | 'boss' | 'tower' | 'rival';

export interface BattleSetup {
  kind: BattleKind;
  opponent: CharacterKey;
  stageKey: string;
  hpMult: number;
  dmgMult: number;
  roundsToWin: number;
  roundMs: number;
  /** Plays the boss theme and announces the opponent. */
  bossFight: boolean;
  title?: string;
  floor?: number;
  boss?: BossDef;
  extraProcs: StatusProc[];
}

export interface BattleParams {
  p2?: string;
  stageKey?: string;
  questId?: string;
  bossId?: string;
  tower?: string;
  rival?: string;
}

const STAGES = ['stage_1', 'stage_2', 'stage_3'];

function h(n: number, salt = 0): number {
  let x = (Math.imul(n + 1, 374761393) + Math.imul(salt + 7, 668265263)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

const TOWER_BOSSES: CharacterKey[] = ['ninja', 'mystic', 'green_dragon', 'ice_dragon', 'shadow_dragon'];

export function isTowerBossFloor(floor: number) {
  return floor % 10 === 0;
}
export function isTowerRivalFloor(floor: number) {
  return floor % 25 === 0 && floor % 10 !== 0;
}

/** Who waits on a tower floor. */
export function towerOpponent(floor: number): { character: CharacterKey; boss: boolean; rival: boolean } {
  if (isTowerBossFloor(floor)) return { character: TOWER_BOSSES[(floor / 10 - 1) % TOWER_BOSSES.length], boss: true, rival: false };
  if (isTowerRivalFloor(floor)) return { character: 'gadigago', boss: false, rival: true };
  let pool: CharacterKey[];
  if (floor <= 4) pool = ['orc', 'soldier'];
  else if (floor <= 9) pool = ['gadigago', 'soldier', 'ninja'];
  else if (floor <= 19) pool = ['soldier', 'ninja', 'tank', 'gadigago'];
  else if (floor <= 39) pool = ['tank', 'dogking', 'mystic', 'ninja'];
  else pool = ['dogking', 'mystic', 'green_dragon', 'ice_dragon', 'tank'];
  return { character: pool[Math.floor(h(floor) * pool.length)], boss: false, rival: false };
}

export function towerScale(floor: number, boss: boolean) {
  return { hp: 1 + floor * 0.07 + (boss ? 0.5 : 0), dmg: 1 + floor * 0.035 + (boss ? 0.15 : 0) };
}

function rivalProcs(): StatusProc[] {
  const w = getRivalWins();
  const out: StatusProc[] = [];
  if (w >= 1) out.push({ kind: 'freeze', chance: 0.2, ms: 2000, on: ['flash'] });
  if (w >= 3) out.push({ kind: 'poison', chance: 0.25, ms: 5000, on: ['strong'] });
  if (w >= 5) out.push({ kind: 'stun', chance: 0.18, ms: 900, on: ['strong'] });
  return out;
}

export function resolveSetup(p: BattleParams, opts: { questOpponent?: CharacterKey } = {}): BattleSetup {
  const base = { roundsToWin: 2, roundMs: 120000, hpMult: 1, dmgMult: 1, bossFight: false, extraProcs: [] as StatusProc[] };
  if (p.bossId && BOSS_BY_ID[p.bossId]) {
    const b = BOSS_BY_ID[p.bossId];
    return { ...base, kind: 'boss', opponent: b.character, stageKey: b.stageKey, hpMult: b.hpMult, dmgMult: b.dmgMult, bossFight: true, title: b.name, boss: b };
  }
  if (p.tower) {
    const floor = Math.max(1, parseInt(p.tower, 10) || 1);
    const o = towerOpponent(floor);
    const sc = o.rival ? { hp: rivalScale().hp * (1 + floor * 0.02), dmg: rivalScale().dmg * (1 + floor * 0.01) } : towerScale(floor, o.boss);
    return {
      ...base,
      kind: 'tower',
      opponent: o.character,
      stageKey: STAGES[floor % STAGES.length],
      hpMult: sc.hp,
      dmgMult: sc.dmg,
      roundsToWin: 1,
      roundMs: 90000,
      bossFight: o.boss || o.rival,
      floor,
      title: o.rival ? 'RIVAL' : undefined,
      extraProcs: o.rival ? rivalProcs() : [],
    };
  }
  if (p.rival) {
    const sc = rivalScale();
    return { ...base, kind: 'rival', opponent: 'gadigago', stageKey: STAGES[getRivalWins() % STAGES.length], hpMult: sc.hp, dmgMult: sc.dmg, roundsToWin: 2, bossFight: true, title: 'RIVAL', extraProcs: rivalProcs() };
  }
  if (p.questId) {
    return { ...base, kind: 'quest', opponent: opts.questOpponent ?? ((p.p2 as CharacterKey) || 'gadigago'), stageKey: p.stageKey || 'stage_1', bossFight: p.questId === 'final_meme_fighter' };
  }
  return { ...base, kind: 'free', opponent: (p.p2 as CharacterKey) || 'gadigago', stageKey: p.stageKey || 'stage_1' };
}

export interface Granted {
  coins: number;
  xp: number;
  lines: string[];
}

/** Gives the prizes of a won fight (boss, tower floor, rival). */
export function grantVictory(s: BattleSetup, hpPct: number, flawless = false): Granted {
  const g: Granted = { coins: 0, xp: 0, lines: [] };
  const give = (coins: number, xp: number) => {
    if (coins > 0) {
      addCoins(coins);
      g.coins += coins;
    }
    if (xp > 0) {
      addXp(xp);
      g.xp += xp;
    }
  };
  if (s.kind === 'boss' && s.boss) {
    const first = markBossDefeated(s.boss.id);
    // Elenco do VERSUS: o lutador desse chefe é liberado na conta.
    for (const k of unlockByEvent({ boss: s.boss.id })) g.lines.push(`Novo lutador no VERSUS: ${FIGHTER_NAME[k] ?? k}`);
    // Segredo: derrotar um chefe sem tomar nenhum golpe (missão "Sem um Arranhão").
    setFlag('found:sec_sem_arranhao');
    if (flawless) setFlag('flawless_boss');
    if (first) {
      give(s.boss.reward.coins, s.boss.reward.xp);
      for (const [id, n] of Object.entries(s.boss.reward.items ?? {})) {
        addItem(id, n, true);
        g.lines.push(`${itemName(id)} ×${n}`);
      }
      if (s.boss.reward.bag && giveBag(s.boss.reward.bag)) g.lines.push(BAGS[s.boss.reward.bag].name);
    } else {
      give(Math.round(s.boss.reward.coins * 0.2), Math.round(s.boss.reward.xp * 0.2)); // rematch: a small prize
    }
  } else if (s.kind === 'rival') {
    const r = rivalReward();
    addRivalWin();
    give(r.coins, r.xp);
  } else if (s.kind === 'tower' && s.floor) {
    const f = s.floor;
    floorCleared(f, hpPct);
    give(10 + f * 4 + (f % 5 === 0 ? (10 + f * 4) * 2 : 0), Math.round(25 + f * 8 + f * f * 0.15));
    if (f === 10 && claim('tower_10')) {
      addItem('moon_elixir', 2, true);
      g.lines.push(`${itemName('moon_elixir')} ×2`);
    }
    if (f === 25 && claim('tower_25') && giveBag('bag_king')) g.lines.push(BAGS.bag_king.name);
    if (f === 50 && claim('tower_50')) {
      addItem('night_brew', 3, true);
      g.lines.push(`${itemName('night_brew')} ×3`);
    }
  }
  return g;
}

