import type { CharacterKey } from '@/game/battle/Fighter';
import type { MissionDef } from './missionTypes';
import { DOGGE_MISSIONS } from './missionsDogge';

/**
 * Story characters. EVERY system that is part of "the story" (missions,
 * their order/rewards, the player's start point, the unique ability) is
 * keyed by character id, so adding a new playable story character is:
 *   1. write its mission list (copy missionsDogge.ts - the LAST mission of
 *      every character is called FINAL_MISSION_TITLE),
 *   2. add an entry below (fighter, spawn tile, unique ability, who unlocks it),
 *   3. (optional) give it its own save point / start island via `spawn`.
 * A save file remembers which character it was created with, and the
 * profile (profileState.ts) remembers which characters the player has
 * unlocked - picking one on "new world" always starts a NEW save.
 */
export const FINAL_MISSION_TITLE = 'Meme Fighter';

export interface CharacterAbility {
  id: string;
  name: string;
  description: string;
}

export interface StoryCharacter {
  id: string;
  name: string;
  /** Which battle fighter this character plays as. */
  fighter: CharacterKey;
  /** Mission list this character's story uses. */
  missions: MissionDef[];
  /** Unique ability (hook: effects are applied by the world/battle code reading `ability.id`). */
  ability: CharacterAbility;
  /** Where a NEW save of this character starts (tile coords); omit = the village spawn. */
  spawn?: { x: number; y: number };
  /** Playable from the very first launch. */
  unlockedByDefault: boolean;
  /** Characters unlocked when this character finishes its final mission. */
  unlocks?: string[];
}

export const STORY_CHARACTERS: Record<string, StoryCharacter> = {
  dogge: {
    id: 'dogge',
    name: 'Dogge',
    fighter: 'dogge',
    missions: DOGGE_MISSIONS,
    ability: { id: 'dogge_stronk', name: 'Músculos de Meme', description: 'Dogge é o lutador equilibrado do reino: nenhum bônus, nenhum ponto fraco.' },
    unlockedByDefault: true,
    unlocks: [],
  },
};

export const DEFAULT_CHARACTER_ID = 'dogge';

export function getStoryCharacter(id: string | undefined | null): StoryCharacter {
  return (id && STORY_CHARACTERS[id]) || STORY_CHARACTERS[DEFAULT_CHARACTER_ID];
}
