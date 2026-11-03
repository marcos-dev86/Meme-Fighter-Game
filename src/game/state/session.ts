import type { Direction } from '@/types/game';
import type { Difficulty } from './difficulty';

/**
 * The story world currently being played: which of the 3 save slots it
 * lives in, its name/difficulty/creation date, and the play-time clock.
 * Set by startSession() (saveState.ts) when a world is created or loaded
 * from the slots screen; WorldScreen reads the start position from here
 * and saveGame() writes back to the active slot.
 */
export interface SessionInfo {
  slot: number; // 0..2
  name: string;
  difficulty: Difficulty;
  /** Story character this world belongs to (see story/characters.ts). */
  characterId: string;
  createdAt: number;
  /** Where to place the player on boot (null = the village spawn). */
  startPos: { x: number; y: number; facing: Direction } | null;
}

let session: SessionInfo | null = null;
let playedBeforeMs = 0;
let clockStart = 0;
/** Quando o jogo está pausado o relógio de tempo jogado para. */
let pausedSince: number | null = null;

export function beginSession(info: SessionInfo, playedMs: number) {
  session = info;
  playedBeforeMs = playedMs;
  clockStart = Date.now();
  pausedSince = null;
}

/** Pausa/retoma o relógio de tempo jogado (chamado pelo pauseState). */
export function setSessionPaused(paused: boolean) {
  if (paused && pausedSince === null) pausedSince = Date.now();
  else if (!paused && pausedSince !== null) {
    clockStart += Date.now() - pausedSince;
    pausedSince = null;
  }
}

export function getSession(): SessionInfo | null {
  return session;
}

/** Total time played in this world, including time before this session. */
export function getPlayTimeMs(): number {
  return session ? playedBeforeMs + ((pausedSince ?? Date.now()) - clockStart) : 0;
}

export function formatPlayTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`;
}
