import { useEffect, useState } from 'react';
import { getCasinoGamesWon, getChoices, getEnding, useStory } from './storyFlags';
import { CHOICE_COUNT } from '@/game/story/storyChoices';
import { useCosmetics } from './cosmeticsState';

/** Os 5 jogos do cassino. */
const CASINO_GAMES = 5;
import { getOwnedCount } from './cosmeticsState';
import { COSMETIC_PROGRESS_TARGET } from '@/game/cosmetics/cosmeticDefs';
import { getProgressStats, getMissionCounts, subscribeQuest } from './questState';
import { isCollected, getLevel, getUpgradeLevels, usePlayerState } from './playerState';
import { isExplored } from './exploredState';
import { OUTDOOR_NPCS } from '@/game/world/npcs';
import { WORLD_PICKUPS } from '@/game/world/pickups';
import { BUILDING_CONTENT } from '@/game/world/buildingContent';
import { BUILDING_DOORS, WORLD_CHUNKS_H, WORLD_CHUNKS_W, CHUNK_SIZE, getWorldTile } from '@/game/world/worldGen';
import { ISLANDS, realIslandOf } from './islandState';
import { SHOP_STOCK, BATTLE_STOCK, GELO_STOCK } from '@/game/items/itemDefs';
import { UPGRADE_POINT_COSTS, UPGRADE_STATS } from '@/game/items/upgrades';
import { MAX_PLAYER_LEVEL } from '@/game/items/levels';

/**
 * GAME COMPLETION ("progresso", 0% -> 100% = platina): everything you can
 * do in the game counts. Each category has a weight; the total is the
 * weighted sum. 100% needs EVERY category complete.
 */
export type ProgressCategoryId = 'missions' | 'map' | 'npcs' | 'chests' | 'islands' | 'buildings' | 'level' | 'points' | 'shop' | 'casino' | 'cosmetics' | 'monsters' | 'choices' | 'ending';

export interface ProgressCategory {
  id: ProgressCategoryId;
  have: number;
  total: number;
  weight: number;
  /** 0..1 */
  pct: number;
}

export interface ProgressInfo {
  /** 0-100; exactly 100 only when everything is done. */
  percent: number;
  categories: ProgressCategory[];
  platinum: boolean;
}

/** Level that counts as "done" for the level category: the level cap (99). Needed for the platinum. */
export const PROGRESS_LEVEL_TARGET = MAX_PLAYER_LEVEL;
const CASINO_TARGET = 5;
const MONSTER_TARGET = 300;
/** Points needed to max all four attributes (the "points" category). */
const ALL_STATS_POINTS = UPGRADE_STATS.length * UPGRADE_POINT_COSTS.reduce((a, b) => a + b, 0);
/** A land cell of the map counts as explored; 90% of the land cells = fully explored (the fog reveals a radius, edges are hard to reach). */
const MAP_FULL_FRACTION = 0.9;

let landCells: { cx: number; cy: number }[] | null = null;
function getLandCells() {
  if (landCells) return landCells;
  const out: { cx: number; cy: number }[] = [];
  for (let cy = 0; cy < WORLD_CHUNKS_H; cy++) {
    for (let cx = 0; cx < WORLD_CHUNKS_W; cx++) {
      let land = false;
      for (let k = 0; k < 25 && !land; k++) {
        const tx = cx * CHUNK_SIZE + 2 + (k % 5) * 5;
        const ty = cy * CHUNK_SIZE + 2 + Math.floor(k / 5) * 5;
        if (getWorldTile(tx, ty) !== 'water') land = true;
      }
      if (land) out.push({ cx, cy });
    }
  }
  landCells = out;
  return out;
}

let npcIds: string[] | null = null;
function getNpcIds() {
  if (npcIds) return npcIds;
  const set = new Set<string>(OUTDOOR_NPCS.map((p) => p.npcId));
  for (const [id, c] of Object.entries(BUILDING_CONTENT)) {
    if (!BUILDING_DOORS[id]) continue; // leftover keys of buildings that don't exist
    for (const n of [c.npcId, c.npcId2, c.upstairs?.npcId, c.basement?.npcId]) if (n) set.add(n);
  }
  npcIds = [...set];
  return npcIds;
}

let collectibleIds: string[] | null = null;
function getCollectibleIds() {
  if (collectibleIds) return collectibleIds;
  const ids = WORLD_PICKUPS.map((p) => p.id);
  for (const [id, c] of Object.entries(BUILDING_CONTENT)) {
    if (!BUILDING_DOORS[id]) continue;
    for (const chest of [c.chest, c.upstairs?.chest, c.basement?.chest]) if (chest) ids.push(chest.id);
  }
  collectibleIds = ids;
  return ids;
}

function pointsSpent(): number {
  const lv = getUpgradeLevels();
  let sum = 0;
  for (const stat of UPGRADE_STATS) for (let l = 1; l < lv[stat]; l++) sum += UPGRADE_POINT_COSTS[l - 1] ?? 0;
  return sum;
}

export function computeProgress(): ProgressInfo {
  const st = getProgressStats();
  const missions = getMissionCounts();
  const land = getLandCells();
  const exploredLand = land.filter((c) => isExplored(c.cx, c.cy)).length;
  const mapNeeded = Math.ceil(land.length * MAP_FULL_FRACTION);
  const npcs = getNpcIds();
  const talked = npcs.filter((id) => st.talked.includes(id)).length;
  const coll = getCollectibleIds();
  const collected = coll.filter((id) => isCollected(id)).length;
  const islandsAll = Array.from(new Set(Object.values(ISLANDS).map((i) => realIslandOf(i.id))));
  const visited = islandsAll.filter((i) => st.visited.includes(i)).length;
  const doors = Object.keys(BUILDING_DOORS);
  const entered = doors.filter((id) => st.entered.includes(id)).length;
  const level = Math.min(getLevel(), PROGRESS_LEVEL_TARGET);
  const spent = Math.min(pointsSpent(), ALL_STATS_POINTS);
  const stock = Array.from(new Set([...SHOP_STOCK, ...BATTLE_STOCK, ...GELO_STOCK]));
  const bought = stock.filter((id) => st.boughtItems.includes(id)).length;

  const raw: Omit<ProgressCategory, 'pct'>[] = [
    { id: 'missions', have: missions.done, total: missions.total, weight: 26 },
    { id: 'map', have: Math.min(exploredLand, mapNeeded), total: mapNeeded, weight: 9 },
    { id: 'npcs', have: talked, total: npcs.length, weight: 9 },
    { id: 'chests', have: collected, total: coll.length, weight: 9 },
    { id: 'islands', have: visited, total: islandsAll.length, weight: 5 },
    { id: 'buildings', have: entered, total: doors.length, weight: 4 },
    { id: 'level', have: level, total: PROGRESS_LEVEL_TARGET, weight: 12 },
    { id: 'points', have: spent, total: ALL_STATS_POINTS, weight: 5 },
    { id: 'shop', have: bought, total: stock.length, weight: 4 },
    // 100% do cassino = ter VENCIDO nos 5 jogos (caça-níquel, cara ou coroa, dados, roleta e cartas)
    { id: 'casino', have: Math.min(getCasinoGamesWon().length, CASINO_GAMES), total: CASINO_GAMES, weight: 3 },
    { id: 'cosmetics', have: Math.min(getOwnedCount(), COSMETIC_PROGRESS_TARGET), total: COSMETIC_PROGRESS_TARGET, weight: 3 },
    { id: 'monsters', have: Math.min(st.kills, MONSTER_TARGET), total: MONSTER_TARGET, weight: 7 },
    { id: 'choices', have: Object.keys(getChoices()).length, total: CHOICE_COUNT, weight: 2 },
    { id: 'ending', have: getEnding() ? 1 : 0, total: 1, weight: 2 },
  ];
  const categories: ProgressCategory[] = raw.map((c) => ({ ...c, pct: c.total > 0 ? Math.min(1, c.have / c.total) : 0 }));
  const platinum = categories.every((c) => c.pct >= 1);
  const sum = categories.reduce((a, c) => a + c.weight * c.pct, 0);
  return { percent: platinum ? 100 : Math.min(99, Math.floor(sum)), categories, platinum };
}

/** Re-renders (and recomputes) when missions/stats or the player's bag/level change. */
export function useProgress(): ProgressInfo {
  'use no memo'; // module-level stores: the React Compiler must not cache what we read
  const [, setTick] = useState(0);
  usePlayerState();
  useStory();
  useCosmetics();
  useEffect(() => subscribeQuest(() => setTick((n) => n + 1)), []);
  return computeProgress();
}
