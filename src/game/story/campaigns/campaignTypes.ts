import type { MissionDef } from '../missionTypes';
import type { CodeCutscene } from '../codeCutscenes';
import type { Ending } from '@/game/state/storyFlags';
import type { CharacterKey } from '@/game/battle/Fighter';

/**
 * Formato de uma CAMPANHA (um arquivo por personagem em campaigns/<id>.ts). PURO: só tipos, sem React nem estado do jogo,
 * para que characters.ts possa importar as missões sem criar ciclos.
 */
export type Five = [string, string, string, string, string];

/** Escolha importante de uma campanha (mesma forma das escolhas do Dogge, mas vinculada a uma missão que precisa estar concluída). */
export interface CampaignChoiceOption {
  id: string;
  label: string;
  lines: string[];
  coins?: number;
  items?: Record<string, number>;
  xp?: number;
  /** Bandeiras ligadas por esta opção (as de final e as que mudam falas de NPCs). */
  flags?: string[];
}
export interface CampaignChoice {
  id: string;
  npcId: string;
  /** Missão que precisa estar concluída para a escolha aparecer. */
  afterMission: string;
  intro: string[];
  options: CampaignChoiceOption[];
}

/** Um final da campanha: cutscene de final + 5 falas + título (EndingScreen) e a bandeira que o seleciona. */
export interface CampaignEnding {
  id: string;
  /** Bandeira (ligada por uma opção da escolha final) que escolhe este final. */
  flag: string;
  /** Qual "tipo" de final conta no registro do save (união, glória ou poder). */
  kind: Ending;
  cutsceneId: string;
  title: Five;
  lines: Five[];
}

/** Regra de fala de um NPC nesta campanha: a primeira cuja condição vale substitui a fala normal. */
export interface CampaignNpcRule {
  when: (c: { done: (missionId: string) => boolean; flag: (f: string) => boolean }) => boolean;
  lines: string[];
}

/** Mudanças de NPC valem só nesta campanha: nome, papel, sprite e falas. */
export interface CampaignNpcOverride {
  name?: string;
  role?: string;
  fighterSprite?: CharacterKey;
  sheetChar?: string;
  kind?: 'friendly' | 'enemy' | 'meme';
  /** Falas padrão (quando nenhuma regra vale). */
  dialogue?: string[];
  rules?: CampaignNpcRule[];
}

/** NPC extra posto no mundo só nesta campanha (e só depois de uma missão, se `afterMission`). */
export interface CampaignPlacement {
  npcId: string;
  x: number;
  y: number;
  afterMission?: string;
  /** Some quando essa missão é concluída (ex.: o espião que foge depois da luta). */
  hideAfterMission?: string;
}

export interface CampaignDef {
  /** Id do personagem de história (igual a STORY_CHARACTERS). */
  id: string;
  missions: MissionDef[];
  choices: CampaignChoice[];
  endings: CampaignEnding[];
  cutscenes: CodeCutscene[];
  npcOverrides: Record<string, CampaignNpcOverride>;
  /** NPCs que, nesta campanha, aparecem sempre (ignoram `only: night/rain`). */
  alwaysActive: string[];
  extraPlacements: CampaignPlacement[];
  /** Resumo da história para a seleção de personagem e o Status (pt, en, es, fr, ja). */
  summary: Five;
  /** Quem este personagem enfrenta no final (curto, para a UI). */
  tagline: Five;
}
