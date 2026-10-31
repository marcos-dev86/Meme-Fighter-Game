import { OUTDOOR_NPCS } from './npcs';
import { npcPose } from './npcRoutine';
import { WORLD_PICKUPS } from './pickups';
import { BUILDING_DOORS } from './worldGen';
import { BUILDING_CONTENT } from './buildingContent';
import { FERRY_STOPS } from './islandMap';
import { isCollected } from '@/game/state/playerState';
import { getChainStep, getMissionDef } from '@/game/state/questState';
import type { ChainStep, Objective } from '@/game/story/missionTypes';

/**
 * Where a mission wants the player to go - used by the mission arrow.
 * Derived from the mission's objective, so every mission (and every future
 * character's story) gets an arrow with no special code. Coordinates are
 * tiles. `MISSION_TARGET_OVERRIDES` can pin a mission to fixed spots.
 */
export interface TileTarget {
  x: number;
  y: number;
}

export const MISSION_TARGET_OVERRIDES: Record<string, TileTarget[]> = {};

/** Where an NPC can be found: outdoors, or at the door of the building they live in. */
function npcSpots(npcId: string): TileTarget[] {
  const out: TileTarget[] = OUTDOOR_NPCS.filter((p) => p.npcId === npcId && !p.only).map((p) => {
    const pose = npcPose(p);
    return { x: Math.round(pose.x), y: Math.round(pose.y) };
  });
  if (out.length) return out;
  for (const [buildingId, content] of Object.entries(BUILDING_CONTENT)) {
    const lives = content.npcId === npcId || content.npcId2 === npcId || content.upstairs?.npcId === npcId || content.basement?.npcId === npcId;
    const door = BUILDING_DOORS[buildingId];
    if (lives && door) out.push({ x: door.x, y: door.y });
  }
  return out;
}

/** Door of the building whose chest has this id (chests inside buildings are "pickups" too). */
function chestDoor(chestId: string): TileTarget | null {
  for (const [buildingId, c] of Object.entries(BUILDING_CONTENT)) {
    const has = c.chest?.id === chestId || c.upstairs?.chest?.id === chestId || c.basement?.chest?.id === chestId;
    const door = BUILDING_DOORS[buildingId];
    if (has && door) return { x: door.x, y: door.y };
  }
  return null;
}

function pickupTargets(ids: string[]): TileTarget[] {
  const out: TileTarget[] = [];
  for (const id of ids) {
    if (isCollected(id)) continue;
    const p = WORLD_PICKUPS.find((w) => w.id === id);
    if (p) out.push({ x: p.x, y: p.y });
    else {
      const d = chestDoor(id);
      if (d) out.push(d);
    }
  }
  return out;
}

function targetsFor(o: Objective | ChainStep): TileTarget[] {
  switch (o.kind) {
    case 'talk':
      return npcSpots(o.npcId);
    case 'battle':
      return npcSpots(o.giver);
    case 'pickups':
      return pickupTargets(o.ids);
    case 'lore':
      return WORLD_PICKUPS.filter((p) => p.lorePiece && !isCollected(p.id)).map((p) => ({ x: p.x, y: p.y }));
    case 'visit': {
      return FERRY_STOPS.filter((s) => s.id === o.island).map((s) => s.anchor);
    }
    case 'enter': {
      const d = BUILDING_DOORS[o.buildingId];
      return d ? [d] : [];
    }
    case 'buy':
    case 'upgrade': {
      // The piolet is only sold in the ice-island shop; everything else at the plaza.
      const d = o.kind === 'buy' && o.itemId === 'piolet' ? BUILDING_DOORS.loja_gelo : BUILDING_DOORS.plaza_shop;
      return d ? [d] : [];
    }
    case 'casino': {
      const d = BUILDING_DOORS.loja_misteriosa;
      return d ? [d] : [];
    }
    case 'reach':
      return [{ x: o.x, y: o.y }];
    default:
      return []; // kills / coins / level / items: no single place
  }
}

export function getMissionTargets(missionId: string): TileTarget[] {
  const override = MISSION_TARGET_OVERRIDES[missionId];
  if (override?.length) return override;
  const def = getMissionDef(missionId);
  if (!def) return [];
  if (def.objective.kind === 'chain') {
    const step = getChainStep(def);
    return step ? targetsFor(step) : [];
  }
  return targetsFor(def.objective);
}
