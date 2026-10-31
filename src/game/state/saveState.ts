import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPlayerStateSnapshot, restorePlayerState, resetPlayerState, type EquipSlots } from './playerState';
import type { UpgradeStat } from '@/game/items/upgrades';
import { getQuestStateSnapshot, restoreQuestState, resetQuestState, getMissionCounts, getStoryCharacterId, type QuestSaveData } from './questState';
import { DEFAULT_CHARACTER_ID, getStoryCharacter } from '@/game/story/characters';
import { getLoreStateSnapshot, restoreLoreState, type LorePieceId } from './loreState';
import { isDifficulty, setStoryDifficulty, type Difficulty } from './difficulty';
import { beginSession, getSession, getPlayTimeMs } from './session';
import { getExploredSnapshot, resetExplored, restoreExplored } from './exploredState';
import type { Direction } from '@/types/game';
import { resetExts, restoreExts, snapshotExts } from './saveExt';
import './registerExts';

/**
 * Local save system: up to 3 story worlds ("slots"), on-device only
 * (AsyncStorage - unencrypted key/value storage; no server, no account,
 * nothing leaves the phone). Pinned to the exact version Expo Go 57
 * bundles natively (`2.2.0` in package.json): a mismatched JS/native
 * version is a known way for this package to fail at runtime.
 *
 * Each slot is its own key and holds a whole world: name, difficulty,
 * creation date, play time, position, coins/bag, quests and lore.
 * SAVE_VERSION 2 = the slot format; the old single-save format (v1, key
 * `meme_fighter_save_v1`) is migrated into slot 1 the first time the slot
 * list is read, so nobody loses their old progress.
 */

export const SLOT_COUNT = 3;
const SLOT_KEY = (i: number) => `meme_fighter_slot_${i + 1}_v2`;
const LEGACY_KEY = 'meme_fighter_save_v1';
const SAVE_VERSION = 2;

export interface SaveData {
  version: number;
  name: string;
  difficulty: Difficulty;
  /** Which story character this world was created with (older saves = the default one). */
  characterId?: string;
  createdAt: number;
  savedAt: number;
  playTimeMs: number;
  /** null = brand-new world that hasn't been saved in-game yet (starts at the village spawn). */
  player: { x: number; y: number; facing: Direction } | null;
  playerState: {
    coins: number;
    inventory: Record<string, number>;
    collected: string[];
    equipped?: EquipSlots;
    upgrades: Record<UpgradeStat, number>;
    /** XP system (older saves: absent = level 1). */
    xp?: number;
    level?: number;
    statPoints?: number;
  };
  quest: QuestSaveData;
  lore: Record<LorePieceId, boolean>;
  /** Map exploration (fog of war), see exploredState.ts. Absent in older saves = nothing explored yet. */
  explored?: string;
  /** Per-module extension data (see saveExt.ts); absent in older saves. */
  ext?: Record<string, unknown>;
}

/** Small summary shown on a slot card. */
export function summarize(data: SaveData) {
  const list = getStoryCharacter(data.characterId).missions;
  const missionsDone = list.filter((m) => data.quest.quests[m.id] === 'completed').length;
  return {
    coins: data.playerState.coins,
    missionsDone,
    missionsTotal: list.length,
  };
}

function parse(raw: string | null): SaveData | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as SaveData;
    if (d.version !== SAVE_VERSION) return null;
    if (!isDifficulty(d.difficulty)) d.difficulty = 'medium';
    return d;
  } catch {
    return null; // corrupted save - treat the slot as empty rather than crash
  }
}

/** Old single-slot save -> slot 1 (only if slot 1 is empty). */
async function migrateLegacy() {
  try {
    const legacyRaw = await AsyncStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) return;
    const slot1 = await AsyncStorage.getItem(SLOT_KEY(0));
    if (!slot1) {
      const old = JSON.parse(legacyRaw);
      if (old && old.version === 1 && old.playerState && old.quest && old.lore) {
        const data: SaveData = {
          version: SAVE_VERSION,
          name: 'Meu Mundo',
          difficulty: 'medium',
          createdAt: old.savedAt ?? Date.now(),
          savedAt: old.savedAt ?? Date.now(),
          playTimeMs: 0,
          player: old.player ?? null,
          playerState: old.playerState,
          quest: old.quest,
          lore: old.lore,
        };
        await AsyncStorage.setItem(SLOT_KEY(0), JSON.stringify(data));
      }
    }
    await AsyncStorage.removeItem(LEGACY_KEY);
  } catch {
    // best-effort
  }
}

/** The 3 slots, null where empty. */
export async function listSlots(): Promise<(SaveData | null)[]> {
  await migrateLegacy();
  const out: (SaveData | null)[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    try {
      out.push(parse(await AsyncStorage.getItem(SLOT_KEY(i))));
    } catch {
      out.push(null);
    }
  }
  return out;
}

async function writeSlot(slot: number, data: SaveData): Promise<boolean> {
  try {
    await AsyncStorage.setItem(SLOT_KEY(slot), JSON.stringify(data));
    return true;
  } catch {
    return false; // disk full / storage unavailable - the caller shows the failure
  }
}

/** Makes a brand-new world in a slot (fresh coins/quests/lore) and returns it. */
export async function createWorld(slot: number, name: string, difficulty: Difficulty, characterId: string = DEFAULT_CHARACTER_ID): Promise<SaveData | null> {
  const character = getStoryCharacter(characterId);
  resetPlayerState();
  resetQuestState(character.id);
  restoreLoreState({ fragA: false, fragB: false, fragC: false });
  resetExplored();
  resetExts();
  const now = Date.now();
  const data: SaveData = {
    version: SAVE_VERSION,
    name: name.trim().slice(0, 18) || 'Meu Mundo',
    difficulty,
    characterId: character.id,
    createdAt: now,
    savedAt: now,
    playTimeMs: 0,
    player: character.spawn ? { x: character.spawn.x * 32, y: character.spawn.y * 32, facing: 'down' } : null,
    playerState: getPlayerStateSnapshot(),
    quest: getQuestStateSnapshot(),
    lore: getLoreStateSnapshot(),
    explored: getExploredSnapshot(),
    ext: snapshotExts(),
  };
  return (await writeSlot(slot, data)) ? data : null;
}

/** Applies a world to every module's in-memory state and makes it the
 * active session. WorldScreen then just reads the start position. */
export function startSession(slot: number, data: SaveData) {
  restorePlayerState(data.playerState);
  restoreQuestState(data.quest, data.characterId ?? DEFAULT_CHARACTER_ID);
  restoreLoreState(data.lore);
  restoreExplored(data.explored);
  restoreExts(data.ext);
  setStoryDifficulty(data.difficulty);
  beginSession(
    { slot, name: data.name, difficulty: data.difficulty, characterId: data.characterId ?? DEFAULT_CHARACTER_ID, createdAt: data.createdAt, startPos: data.player },
    data.playTimeMs
  );
}

/** Saves the running world into its slot (position passed in - it lives in
 * a plain ref inside WorldScreen, not a module singleton). */
export async function saveGame(player: { x: number; y: number; facing: Direction }): Promise<boolean> {
  const s = getSession();
  if (!s) return false;
  const data: SaveData = {
    version: SAVE_VERSION,
    name: s.name,
    difficulty: s.difficulty,
    characterId: getStoryCharacterId(),
    createdAt: s.createdAt,
    savedAt: Date.now(),
    playTimeMs: getPlayTimeMs(),
    player,
    playerState: getPlayerStateSnapshot(),
    quest: getQuestStateSnapshot(),
    lore: getLoreStateSnapshot(),
    explored: getExploredSnapshot(),
    ext: snapshotExts(),
  };
  return writeSlot(s.slot, data);
}

export async function deleteSlot(slot: number): Promise<void> {
  try {
    await AsyncStorage.removeItem(SLOT_KEY(slot));
  } catch {
    // best-effort
  }
}
