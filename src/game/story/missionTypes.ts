import type { CharacterKey } from '@/game/battle/Fighter';
import type { RealIslandId } from '@/game/state/islandState';

/** Icon family shown in the HUD / list. */
export type MissionType = 'battle' | 'discover' | 'collect' | 'talk' | 'quest' | 'deliver';

/**
 * What has to happen for a mission to be completed. Everything except
 * 'battle' is derived from persistent counters/flags (see questState.ts
 * "stats"), so a mission completes the moment it becomes available if the
 * player had already done the thing - nobody has to repeat anything.
 */
export type Objective =
  | { kind: 'talk'; npcId: string }
  | { kind: 'battle'; giver: string; opponent: CharacterKey; stageKey: string; reward: number; offerTitleKey: string }
  | { kind: 'pickups'; ids: string[] }
  | { kind: 'visit'; island: RealIslandId }
  | { kind: 'enter'; buildingId: string }
  | { kind: 'kills'; count: number; enemy?: string }
  | { kind: 'buy'; itemId?: string }
  | { kind: 'upgrade'; /** status points spent in total (default: just one upgrade) */ count?: number }
  | { kind: 'coins'; amount: number }
  | { kind: 'reach'; x: number; y: number; r: number }
  | { kind: 'lore' }
  /** Reach player level N. */
  | { kind: 'level'; level: number }
  /** Win N casino rounds (any game, net profit). */
  | { kind: 'casino'; wins: number }
  /** Have N of an item in the bag right now. */
  | { kind: 'hasItem'; itemId: string; qty: number }
  /** Several steps, strictly in order (see ChainStep). */
  /** Completa quando uma bandeira da história é acionada (missões secretas e alternativas). */
  | { kind: 'flag'; flag: string }
  | { kind: 'chain'; steps: ChainStep[] };

/**
 * One step of a `chain` mission. Steps are EVENT based (talking, entering,
 * killing... counts only while the step is the current one) except
 * `pickups`/`level`, which just check state. `hint` replaces the mission
 * hint while the step is current; `lines` replace the NPC's dialogue for a
 * `talk` step; `give`/`take` hand items to / ask items from the player when
 * the conversation ends (a `take` step won't advance until the player has them).
 */
export type ChainStep = { hint: string } & (
  | { kind: 'talk'; npcId: string; lines?: string[]; give?: Record<string, number>; take?: Record<string, number> }
  | { kind: 'enter'; buildingId: string }
  | { kind: 'pickups'; ids: string[] }
  | { kind: 'kills'; count: number; enemy?: string }
  | { kind: 'reach'; x: number; y: number; r: number }
  | { kind: 'casino'; wins: number }
  | { kind: 'level'; level: number }
  /** Passo que só espera uma bandeira da história. */
  | { kind: 'flag'; flag: string }
);

export interface MissionReward {
  coins?: number;
  items?: Record<string, number>;
  /** XP granted on completion (default depends on the mission kind - see questState.ts). */
  xp?: number;
  /** Cosmético exclusivo dado ao concluir (ver cosmeticDefs.ts). */
  cosmetic?: string;
}

export interface MissionDef {
  id: string;
  title: string;
  hint: string;
  type: MissionType;
  /** Chapter label shown in the mission list. */
  chapter: string;
  objective: Objective;
  /** Mission ids that must be completed before this one unlocks. */
  requires?: string[];
  /** Granted on completion (battle missions pay their `reward` in the fight screen instead). */
  reward?: MissionReward;
  /** Optional NPC lines that replace the usual ones for the giver while this mission is current/done. */
  dialogue?: { unstarted: string[]; active: string[]; completed: string[] };
  /** True for the last mission of a story - always titled FINAL_MISSION_TITLE. */
  final?: boolean;
  /**
   * Missão de CAMINHO: só existe (conta na lista e no progresso) se a escolha importante `choice` foi feita
   * com a opção `option`. Antes da escolha ela não existe; escolhendo outra opção, nunca existe.
   */
  branch?: { choice: string; option: string };
  /** Opcional: não é exigida para liberar a missão final (secretas e de caminho). */
  optional?: boolean;
  /** Secreta: aparece como "???" na lista até ser descoberta. */
  secret?: boolean;
  /** Pontos que a missão soma para cada final quando concluída. */
  storyPts?: { u?: number; g?: number; p?: number };
}
