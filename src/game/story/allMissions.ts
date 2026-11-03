import { STORY_CHARACTERS } from './characters';
import type { MissionDef } from './missionTypes';

/** Every mission of every story character (ids must be unique across characters). */
export const MISSIONS_ALL: MissionDef[] = Object.values(STORY_CHARACTERS).flatMap((c) => c.missions);
