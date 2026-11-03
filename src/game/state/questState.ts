import { useEffect, useState } from 'react';
import { addCoins, addItem, addXp, getCoins, getLevel, getUpgradeLevels, isCollected, itemCount, removeItem } from './playerState';
import { itemName } from '@/game/items/itemDefs';
import { getChoice, hasFlag, noteCasinoGame, setFlag, subscribeStory } from './storyFlags';
import { grantCosmetic } from './cosmeticsState';
import { allLorePiecesFound } from './loreState';
import { getStoryCharacter } from '@/game/story/characters';
import { unlockCharacters } from './profileState';
import type { ChainStep, MissionDef, MissionType } from '@/game/story/missionTypes';
import { MISSIONS_ALL } from '@/game/story/allMissions';

export type { MissionDef, MissionType };
export type QuestStatus = 'unstarted' | 'offered' | 'active' | 'completed';

/**
 * Mission engine (same shared-singleton pattern as playerState.ts, for the
 * same reason: progress has to survive navigating world -> battle -> world,
 * and is saved per slot by saveState.ts).
 *
 * How it works:
 *  - Each story character has an ordered mission list (src/game/story).
 *  - A mission is AVAILABLE when everything in `requires` is completed (a
 *    `final` mission needs every other mission).
 *  - Non-battle objectives are checked against persistent "stats" (kills,
 *    purchases, NPCs talked to, buildings entered, islands visited, items
 *    picked up, coins...) - so a mission completes the moment it becomes
 *    available if the player already did it. Battle missions complete when
 *    the fight screen reports the win.
 *  - Call evaluateMissions() after anything that can change the stats (the
 *    world screen also does it on a short timer as a safety net).
 */

interface Stats {
  kills: number;
  killsByType: Record<string, number>;
  purchases: number;
  boughtItems: string[];
  upgrades: number;
  /** Status points spent in total (for "gaste N pontos" missions). */
  pointsSpent: number;
  /** Casino rounds won (net profit). */
  casinoWins: number;
  talked: string[];
  entered: string[];
  visited: string[];
  reached: string[]; // mission ids whose 'reach' area was entered
}

function freshStats(): Stats {
  return { kills: 0, killsByType: {}, purchases: 0, boughtItems: [], upgrades: 0, pointsSpent: 0, casinoWins: 0, talked: [], entered: [], visited: ['main'], reached: [] };
}

let characterId = 'dogge';
const quests: Record<string, QuestStatus> = {};
const questProgress: Record<string, number> = {};
let stats: Stats = freshStats();

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

/* ------------------------------------------------------------------ */
/* Definitions                                                         */
/* ------------------------------------------------------------------ */

/** The mission list of the active story character. */
export function getMissionList(): MissionDef[] {
  // Missões de caminho só existem depois de a escolha correspondente ter sido feita com a opção certa.
  return getStoryCharacter(characterId).missions.filter((m) => !m.branch || getChoice(m.branch.choice) === m.branch.option);
}

/** Id -> def for the DEFAULT story (kept for screens that only need titles/types). */
export const MISSION_DEFS: Record<string, MissionDef> = Object.fromEntries(MISSIONS_ALL.map((m) => [m.id, m]));

export function getMissionDef(id: string): MissionDef | undefined {
  return getMissionList().find((m) => m.id === id) ?? MISSION_DEFS[id];
}

/** What accepting each battle mission launches - read by the world (who to
 * fight, which offer text) and by the battle screen (the coin prize on a
 * win), so they can't drift apart. Built from the missions themselves. */
export const QUEST_BATTLE_DEFS: Record<string, { opponent: import('@/game/battle/Fighter').CharacterKey; stageKey: string; reward: number; offerTitleKey: string; giver: string }> = Object.fromEntries(
  MISSIONS_ALL.filter((m) => m.objective.kind === 'battle').map((m) => {
    const o = m.objective as Extract<MissionDef['objective'], { kind: 'battle' }>;
    return [m.id, { opponent: o.opponent, stageKey: o.stageKey, reward: o.reward, offerTitleKey: o.offerTitleKey, giver: o.giver }];
  })
);

/* ------------------------------------------------------------------ */
/* Status / progress                                                   */
/* ------------------------------------------------------------------ */

function isDone(id: string): boolean {
  return quests[id] === 'completed';
}

export function isMissionAvailable(def: MissionDef): boolean {
  if (isDone(def.id)) return false;
  if (def.final) return getMissionList().every((m) => m.final || m.optional || isDone(m.id));
  return (def.requires ?? []).every(isDone);
}

export function getQuestStatus(id: string): QuestStatus {
  if (isDone(id)) return 'completed';
  const def = getMissionDef(id);
  if (!def) return quests[id] ?? 'unstarted';
  if (!isMissionAvailable(def)) return 'unstarted';
  if (def.objective.kind === 'battle') return quests[id] === 'offered' || quests[id] === 'active' ? quests[id] : 'unstarted';
  return 'active';
}

/** {have, total} for the HUD / list (total 1 for yes-or-no goals). */
export function getMissionProgress(def: MissionDef): { have: number; total: number } {
  const o = def.objective;
  switch (o.kind) {
    case 'pickups':
      return { have: o.ids.filter((id) => isCollected(id)).length, total: o.ids.length };
    case 'kills': {
      const have = o.enemy ? stats.killsByType[o.enemy] ?? 0 : stats.kills;
      return { have: Math.min(have, o.count), total: o.count };
    }
    case 'coins':
      return { have: Math.min(getCoins(), o.amount), total: o.amount };
    case 'level':
      return { have: Math.min(getLevel(), o.level), total: o.level };
    case 'casino':
      return { have: Math.min(stats.casinoWins, o.wins), total: o.wins };
    case 'flag':
      return { have: hasFlag(o.flag) ? 1 : 0, total: 1 };
    case 'hasItem':
      return { have: Math.min(itemCount(o.itemId), o.qty), total: o.qty };
    case 'upgrade':
      return o.count ? { have: Math.min(stats.pointsSpent, o.count), total: o.count } : { have: isDone(def.id) ? 1 : 0, total: 1 };
    case 'chain':
      return { have: isDone(def.id) ? o.steps.length : Math.min(chainIndex(def), o.steps.length), total: o.steps.length };
    default:
      return { have: isDone(def.id) ? 1 : 0, total: 1 };
  }
}

function isObjectiveMet(def: MissionDef): boolean {
  const o = def.objective;
  switch (o.kind) {
    case 'talk':
      return stats.talked.includes(o.npcId);
    case 'battle':
      return false; // completed by the fight screen
    case 'pickups':
      return o.ids.every((id) => isCollected(id));
    case 'visit':
      return stats.visited.includes(o.island);
    case 'enter':
      return stats.entered.includes(o.buildingId);
    case 'kills':
      return (o.enemy ? stats.killsByType[o.enemy] ?? 0 : stats.kills) >= o.count;
    case 'buy':
      return o.itemId ? stats.boughtItems.includes(o.itemId) : stats.purchases > 0;
    case 'upgrade':
      if (o.count) return stats.pointsSpent >= o.count;
      return stats.upgrades > 0 || Object.values(getUpgradeLevels()).some((lv) => lv > 1);
    case 'coins':
      return getCoins() >= o.amount;
    case 'level':
      return getLevel() >= o.level;
    case 'casino':
      return stats.casinoWins >= o.wins;
    case 'flag':
      return hasFlag(o.flag);
    case 'hasItem':
      return itemCount(o.itemId) >= o.qty;
    case 'chain':
      return false; // completed by advanceChainStep()
    case 'reach':
      return stats.reached.includes(def.id);
    case 'lore':
      return allLorePiecesFound();
  }
}

/* ------------------------------------------------------------------ */
/* Completion + notifications                                          */
/* ------------------------------------------------------------------ */

type CompletionListener = (def: MissionDef, reward: { coins: number; items: string[]; xp: number }) => void;
const completionListeners = new Set<CompletionListener>();
/** The world screen subscribes to show "Missão concluída" toasts. */
export function onMissionCompleted(fn: CompletionListener): () => void {
  completionListeners.add(fn);
  return () => {
    completionListeners.delete(fn);
  };
}

/** Short messages for the player (item received, new step...). The world and interiors show them as toasts. */
const noticeListeners = new Set<(text: string) => void>();
export function onQuestNotice(fn: (text: string) => void): () => void {
  noticeListeners.add(fn);
  return () => {
    noticeListeners.delete(fn);
  };
}
function emitNotice(text: string) {
  noticeListeners.forEach((fn) => fn(text));
}

/** XP a mission pays: explicit `reward.xp`, otherwise by kind. */
export function missionXp(def: MissionDef): number {
  if (def.reward?.xp !== undefined) return def.reward.xp;
  const o = def.objective;
  if (o.kind === 'battle') return def.final ? 250 : 80;
  if (o.kind === 'chain') return 40 + 15 * o.steps.length;
  return 25;
}

function complete(def: MissionDef) {
  if (isDone(def.id)) return;
  quests[def.id] = 'completed';
  let coins = 0;
  const items: string[] = [];
  // Battle prizes are paid by the fight screen; everything else here.
  if (def.objective.kind !== 'battle' && def.reward) {
    if (def.reward.coins) {
      coins = def.reward.coins;
      addCoins(coins);
    }
    for (const [itemId, qty] of Object.entries(def.reward.items ?? {})) {
      addItem(itemId, qty, true);
      items.push(`${itemId}×${qty}`);
    }
  } else if (def.objective.kind === 'battle') {
    coins = def.objective.reward;
  }
  const xp = missionXp(def);
  addXp(xp);
  if (def.reward?.cosmetic) grantCosmetic(def.reward.cosmetic);
  if (def.final) unlockCharacters(getStoryCharacter(characterId).unlocks);
  completionListeners.forEach((fn) => fn(def, { coins, items, xp }));
}

/* ------------------------------------------------------------------ */
/* Chain missions (several ordered steps)                              */
/* ------------------------------------------------------------------ */

function chainSteps(def: MissionDef): ChainStep[] | null {
  return def.objective.kind === 'chain' ? def.objective.steps : null;
}
function chainIndex(def: MissionDef): number {
  return questProgress[def.id] ?? 0;
}
function chainCounter(def: MissionDef): number {
  return questProgress[`${def.id}#c`] ?? 0;
}

/** The step a chain mission is on right now (null if it isn't a chain, is locked, or finished). */
export function getChainStep(def: MissionDef): ChainStep | null {
  const steps = chainSteps(def);
  if (!steps || isDone(def.id) || !isMissionAvailable(def)) return null;
  return steps[chainIndex(def)] ?? null;
}

/** What the HUD/list should say for a mission: the current step's hint for chains (with a counter for kill/casino steps). */
export function getMissionHint(def: MissionDef): string {
  const step = getChainStep(def);
  if (!step) return def.hint;
  if (step.kind === 'kills') return `${step.hint} (${Math.min(chainCounter(def), step.count)}/${step.count})`;
  if (step.kind === 'casino') return `${step.hint} (${Math.min(chainCounter(def), step.wins)}/${step.wins})`;
  return step.hint;
}

function advanceChainStep(def: MissionDef) {
  const steps = chainSteps(def)!;
  const next = chainIndex(def) + 1;
  questProgress[def.id] = next;
  delete questProgress[`${def.id}#c`];
  if (next >= steps.length) complete(def);
  else setTimeout(() => emitNotice(steps[next].hint), 1800); // after any "item received" notice
}

function stepStateMet(step: ChainStep): boolean {
  if (step.kind === 'pickups') return step.ids.every((id) => isCollected(id));
  if (step.kind === 'level') return getLevel() >= step.level;
  if (step.kind === 'flag') return hasFlag(step.flag);
  return false;
}

type ChainEvent =
  | { type: 'talk'; npcId: string }
  | { type: 'enter'; buildingId: string }
  | { type: 'kill'; enemy: string }
  | { type: 'reach'; tx: number; ty: number }
  | { type: 'casino' };

function itemList(rec: Record<string, number>): string {
  return Object.entries(rec).map(([id, q]) => (q > 1 ? `${itemName(id)} ×${q}` : itemName(id))).join(', ');
}

/** Feeds one world event to every available chain mission (each advances at most one step). Returns true if anything changed. */
function runChains(ev: ChainEvent): boolean {
  let any = false;
  for (const def of getMissionList()) {
    const step = getChainStep(def);
    if (!step) continue;
    switch (step.kind) {
      case 'talk': {
        if (ev.type !== 'talk' || ev.npcId !== step.npcId) break;
        if (step.take) {
          const missing = Object.entries(step.take).some(([id, q]) => itemCount(id) < q);
          if (missing) {
            emitNotice(`Falta: ${itemList(step.take)}`);
            break;
          }
          for (const [id, q] of Object.entries(step.take)) removeItem(id, q);
        }
        if (step.give) {
          for (const [id, q] of Object.entries(step.give)) addItem(id, q, true);
          emitNotice(itemList(step.give));
        }
        advanceChainStep(def);
        any = true;
        break;
      }
      case 'enter':
        if (ev.type === 'enter' && ev.buildingId === step.buildingId) {
          advanceChainStep(def);
          any = true;
        }
        break;
      case 'reach':
        if (ev.type === 'reach' && Math.hypot(ev.tx - step.x, ev.ty - step.y) <= step.r) {
          advanceChainStep(def);
          any = true;
        }
        break;
      case 'kills':
        if (ev.type === 'kill' && (!step.enemy || step.enemy === ev.enemy)) {
          const c = chainCounter(def) + 1;
          questProgress[`${def.id}#c`] = c;
          any = true;
          if (c >= step.count) advanceChainStep(def);
        }
        break;
      case 'casino':
        if (ev.type === 'casino') {
          const c = chainCounter(def) + 1;
          questProgress[`${def.id}#c`] = c;
          any = true;
          if (c >= step.wins) advanceChainStep(def);
        }
        break;
      default:
        break; // pickups / level: state based, handled by evaluateMissions
    }
  }
  if (any) {
    evaluateMissions();
    notify();
  }
  return any;
}

let evaluating = false;
/** Completes every available mission whose objective is already met (cascading). Returns the ones completed. */
export function evaluateMissions(): MissionDef[] {
  if (evaluating) return [];
  evaluating = true;
  const done: MissionDef[] = [];
  try {
    let changed = true;
    let guard = 0;
    while (changed && guard++ < 60) {
      changed = false;
      for (const def of getMissionList()) {
        if (isDone(def.id) || !isMissionAvailable(def)) continue;
        if (def.objective.kind === 'chain') {
          let step = getChainStep(def);
          while (step && stepStateMet(step)) {
            advanceChainStep(def);
            changed = true;
            step = getChainStep(def);
          }
          if (isDone(def.id)) done.push(def);
          continue;
        }
        if (isObjectiveMet(def)) {
          complete(def);
          done.push(def);
          changed = true;
        }
      }
    }
  } finally {
    evaluating = false;
  }
  if (done.length) notify();
  return done;
}

/** Re-checks every mission and refreshes anything showing mission progress (HUD counters...). */
export function refreshMissions() {
  evaluateMissions();
  notify();
}

/** Fight screen / debug: force a mission's status (battle flow uses offered -> active -> completed). */
export function setQuestStatus(id: string, status: QuestStatus) {
  if (status === 'completed') {
    const def = getMissionDef(id);
    if (def) complete(def);
    else quests[id] = 'completed';
    evaluateMissions();
  } else {
    quests[id] = status;
  }
  notify();
}

/* ------------------------------------------------------------------ */
/* Event reporters (called by the world / interiors / shops)           */
/* ------------------------------------------------------------------ */

function addUnique(list: string[], v: string): boolean {
  if (list.includes(v)) return false;
  list.push(v);
  return true;
}

/** As 5 primas do Doggo: falar com todas libera a missão secreta "Reunião de Família". */
const COUSINS = ['espinho', 'violeta', 'gemada', 'polen', 'penumbra'];

/** Uma missão secreta já foi descoberta (ou concluída)? Antes disso a lista mostra só "???". */
export function isMissionRevealed(def: MissionDef): boolean {
  if (!def.secret) return true;
  if (isDone(def.id) || def.branch || hasFlag(`found:${def.id}`)) return true;
  return def.objective.kind === 'chain' && chainIndex(def) > 0;
}

export function reportTalk(npcId: string) {
  if (COUSINS.includes(npcId)) {
    setFlag(`met_${npcId}`);
    if (COUSINS.filter((c) => hasFlag(`met_${c}`)).length >= 2) setFlag('found:sec_primas');
    if (COUSINS.every((c) => hasFlag(`met_${c}`))) setFlag('cousins_reunion');
  }
  if (npcId === 'mercador_noturno' || npcId === 'cantora_chuva') setFlag(`found:${npcId === 'mercador_noturno' ? 'sec_madrugada' : 'sec_chuva'}`);
  const first = addUnique(stats.talked, npcId);
  if (!runChains({ type: 'talk', npcId }) && first) evaluateMissions();
}
export function reportEnter(buildingId: string) {
  const first = addUnique(stats.entered, buildingId);
  if (!runChains({ type: 'enter', buildingId }) && first) evaluateMissions();
}
export function reportVisit(island: string) {
  if (addUnique(stats.visited, island)) evaluateMissions();
}
export function reportKill(enemyType: string) {
  stats.kills += 1;
  stats.killsByType[enemyType] = (stats.killsByType[enemyType] ?? 0) + 1;
  runChains({ type: 'kill', enemy: enemyType });
  evaluateMissions();
  notify(); // kill counters show in the HUD
}
export function reportPurchase(itemId: string) {
  stats.purchases += 1;
  addUnique(stats.boughtItems, itemId);
  evaluateMissions();
}
export function reportUpgrade(points = 1) {
  stats.upgrades += 1;
  stats.pointsSpent += points;
  evaluateMissions();
}
/** A casino round ended with a net profit. */
export function reportCasinoWin(game?: string) {
  stats.casinoWins += 1;
  if (game) noteCasinoGame(game);
  if (!runChains({ type: 'casino' })) evaluateMissions();
}
/** Player stands at tile (tx, ty): completes any available 'reach' mission whose area contains it. */
export function reportReach(tx: number, ty: number) {
  let any = false;
  for (const def of getMissionList()) {
    if (def.objective.kind !== 'reach' || isDone(def.id) || !isMissionAvailable(def)) continue;
    const o = def.objective;
    if (Math.hypot(tx - o.x, ty - o.y) <= o.r && addUnique(stats.reached, def.id)) any = true;
  }
  if (any) evaluateMissions();
  runChains({ type: 'reach', tx, ty });
}

/* ------------------------------------------------------------------ */
/* Current mission / NPC quests                                        */
/* ------------------------------------------------------------------ */

/** The mission shown in the HUD (and pointed at by the arrow): the first available unfinished one. */
export function getCurrentMissionId(): string | null {
  const avail = getMissionList().filter((m) => isMissionAvailable(m));
  // O HUD guia pela história principal; opcionais só aparecem quando não sobra outra.
  return (avail.find((m) => !m.optional) ?? avail[0])?.id ?? null;
}

/** The quest an NPC is currently involved in (talk or battle giver), with its status; falls back to the latest finished one. */
export function getNpcQuest(npcId: string): { id: string; status: QuestStatus; def: MissionDef } | null {
  const mine = getMissionList().filter((m) => (m.objective.kind === 'talk' && m.objective.npcId === npcId) || (m.objective.kind === 'battle' && m.objective.giver === npcId));
  const open = mine.find((m) => isMissionAvailable(m));
  if (open) return { id: open.id, status: getQuestStatus(open.id), def: open };
  const finished = [...mine].reverse().find((m) => isDone(m.id));
  return finished ? { id: finished.id, status: 'completed', def: finished } : null;
}

/** Lines an NPC says while a chain mission is waiting for a conversation with them (null = nothing special). */
export function getChainNpcLines(npcId: string): string[] | null {
  for (const def of getMissionList()) {
    const step = getChainStep(def);
    if (step && step.kind === 'talk' && step.npcId === npcId && step.lines?.length) return step.lines;
  }
  return null;
}

export function isStoryComplete(): boolean {
  return getMissionList().every((m) => isDone(m.id));
}

export function getMissionCounts(): { done: number; total: number } {
  const list = getMissionList();
  return { done: list.filter((m) => isDone(m.id)).length, total: list.length };
}

/** Read-only copy of the persistent counters (for the game-completion screen, progressState.ts). */
export function getProgressStats() {
  return {
    kills: stats.kills,
    casinoWins: stats.casinoWins,
    talked: [...stats.talked],
    entered: [...stats.entered],
    visited: [...stats.visited],
    boughtItems: [...stats.boughtItems],
  };
}

/** Subscribes to any mission/stat change (re-render hooks). Returns the unsubscribe function. */
export function subscribeQuest(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** The "PLATINA 100%" celebration is shown once per save (flag kept in the saved questProgress map). */
export function isPlatinumAnnounced(): boolean {
  return (questProgress.__platinum ?? 0) === 1;
}
export function markPlatinumAnnounced() {
  questProgress.__platinum = 1;
}

export function getKillCount(): number {
  return stats.kills;
}

export function useCurrentMission() {
  'use no memo'; // module-level store: the React Compiler must not cache what we read from it
  const [, setTick] = useState(0);
  useEffect(() => {
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
    function rerender() {
      setTick((n) => n + 1);
    }
  }, []);
  const id = getCurrentMissionId();
  if (!id) return null;
  const def = getMissionDef(id);
  if (!def) return null;
  return { ...def, hint: getMissionHint(def), status: getQuestStatus(id), progress: getMissionProgress(def) };
}

/** Re-renders on any mission change and returns a fresh list (title screen of "MISSÕES"). */
export function useMissionList() {
  'use no memo';
  const [, setTick] = useState(0);
  useEffect(() => {
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
    function rerender() {
      setTick((n) => n + 1);
    }
  }, []);
  const currentId = getCurrentMissionId();
  return getMissionList().map((def) => ({
    def,
    done: isDone(def.id),
    available: isMissionAvailable(def),
    current: def.id === currentId,
    hint: getMissionHint(def),
    progress: getMissionProgress(def),
  }));
}

export function useQuestState(id: string): QuestStatus {
  'use no memo';
  const [, setTick] = useState(0);
  useEffect(() => {
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
    function rerender() {
      setTick((n) => n + 1);
    }
  }, []);
  return getQuestStatus(id);
}

/* ------------------------------------------------------------------ */
/* Save / load                                                         */
/* ------------------------------------------------------------------ */

export function getStoryCharacterId(): string {
  return characterId;
}

export function getQuestStateSnapshot() {
  return {
    quests: { ...quests },
    questProgress: { ...questProgress },
    currentMissionId: getCurrentMissionId(),
    stats: { ...stats, killsByType: { ...stats.killsByType }, boughtItems: [...stats.boughtItems], talked: [...stats.talked], entered: [...stats.entered], visited: [...stats.visited], reached: [...stats.reached] },
  };
}

export interface QuestSaveData {
  quests: Record<string, QuestStatus>;
  questProgress: Record<string, number>;
  currentMissionId: string | null;
  stats?: Partial<Stats>;
}

/** Overwrites this module's state from a loaded save (and picks the story character the save belongs to). */
export function restoreQuestState(data: QuestSaveData, character?: string) {
  characterId = character ?? 'dogge';
  for (const key of Object.keys(quests)) delete quests[key];
  Object.assign(quests, data.quests);
  for (const key of Object.keys(questProgress)) delete questProgress[key];
  Object.assign(questProgress, data.questProgress);
  const s = data.stats ?? {};
  stats = {
    ...freshStats(),
    ...s,
    killsByType: { ...(s.killsByType ?? {}) },
    boughtItems: [...(s.boughtItems ?? [])],
    talked: [...(s.talked ?? [])],
    entered: [...(s.entered ?? [])],
    visited: Array.from(new Set(['main', ...(s.visited ?? [])])),
    reached: [...(s.reached ?? [])],
  };
  notify();
}

/** Brand-new world for a story character: every mission back to its starting state. */
export function resetQuestState(character = 'dogge') {
  characterId = character;
  for (const key of Object.keys(quests)) delete quests[key];
  for (const key of Object.keys(questProgress)) delete questProgress[key];
  stats = freshStats();
  notify();
}

// Uma bandeira da história mudou (escolha feita, segredo achado...): reavalia as missões.
subscribeStory(() => evaluateMissions());
