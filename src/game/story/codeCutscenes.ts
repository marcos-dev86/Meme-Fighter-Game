/**
 * Cutscenes feitas por CÓDIGO (sem vídeo): cada cena é uma lista de "quadros" (beats) com cenário, personagens, efeitos
 * e fala. Quem toca é o CodeCutscenePlayer. Pesa quase nada no APK: só texto. As do Dogge continuam em MP4 (otimizados).
 *
 * Este arquivo é PURO (sem React/RN) para os testes em Node: só tipos e funções de consulta. Os dados ficam nas campanhas
 * (story/campaigns/*.ts).
 */
import type { SceneKey } from '@/game/menu/sceneArt';

export type CodePose = 'idle' | 'walk' | 'dash' | 'flash' | 'strong' | 'shield' | 'charge' | 'hurt' | 'ko';
export type CodeEnter = 'left' | 'right' | 'bottom' | 'fade' | 'none';
export type CodeAnim = 'bob' | 'jump' | 'shake' | 'none';
export type CodeFx = 'flash' | 'shake' | 'darken' | 'zoom';

/**
 * Texto de cutscene: uma string em português ({player} vira o apelido do jogador) ou uma tupla [pt, en, es, fr, ja].
 * Texto só em português é traduzido pela tabela de cutsceneTexts.ts (chave = o próprio texto em português).
 */
export type Loc = string | [string, string, string, string, string];

/**
 * Fundos: os 13 cenários novos, as arenas antigas (`stage1`..`stage13`, com `_dusk`/`_night`) e os mares gerados
 * (`bg_sea_open`, `bg_sea_reef`...).
 */
export type CodeBg = SceneKey | string;

export type CodeActorKind = 'fig' | 'npc' | 'icon';

export interface CodeActor {
  /** fig: id do lutador. npc: id do NPC do pacote (c08...). icon: nome de um ícone do jogo. */
  char: string;
  kind?: CodeActorKind;
  /** Posição do pé (fração da tela). */
  x: number;
  y: number;
  /** fig/icon: altura (fração da tela). npc: escala do sprite original (como no mundo). */
  h: number;
  flip?: boolean;
  pose?: CodePose;
  enter?: CodeEnter;
  anim?: CodeAnim;
  opacity?: number;
  /** É o personagem do jogador: aparece com a skin, o chapéu e a capa que ele está vestindo. */
  player?: boolean;
  /** Direção do NPC (down, left, right, up). */
  dir?: 'down' | 'left' | 'right' | 'up';
}

export interface CodeIcon {
  /** Nome de um ícone do jogo (GameIcon). */
  name: string;
  x: number;
  y: number;
  size: number;
}

export interface CodeSfx {
  key: string;
  /** Atraso em ms depois do início do quadro. */
  at: number;
  vol?: number;
}

export interface CodeBeat {
  bg: CodeBg;
  /** Cor por cima da arte (rgba). */
  tint?: string;
  actors?: CodeActor[];
  icons?: CodeIcon[];
  /** Cartão de título grande no meio. */
  title?: Loc;
  subtitle?: Loc;
  speaker?: Loc;
  text?: Loc;
  fx?: CodeFx[];
  /** Duração em ms; se faltar, é calculada pelo tamanho do texto. */
  ms?: number;
  /** Primeiro quadro de uma tomada nova: entra com uma transição a partir do preto. */
  shot?: boolean;
  sfx?: CodeSfx[];
}

export interface CodeCutscene {
  id: string;
  /** Personagem de história dono da cena (as do Dogge e as curtas de sistema usam 'dogge'). */
  characterId: string;
  beats: CodeBeat[];
  /** Música de fundo durante a cena (chave de audio/music). Sem ela a cena toca em silêncio de música. */
  music?: string;
  /** Som ambiente (chave de audio/ambient). */
  ambient?: string;
}

/** Texto em português de um Loc (a primeira posição da tupla). */
export function locPt(x: Loc | undefined): string {
  return x === undefined ? '' : typeof x === 'string' ? x : x[0];
}

/** Tempo de leitura de um quadro: 1,8 s + 45 ms por letra, entre 2,6 s e 9 s (ou o `ms` do quadro). */
export function beatDuration(b: CodeBeat): number {
  if (b.ms) return b.ms;
  const n = (locPt(b.text) || locPt(b.title)).length;
  return Math.max(2600, Math.min(9000, 1800 + n * 45));
}

/** Tempo total aproximado de uma cena em segundos (sem toques). */
export function cutsceneSeconds(c: CodeCutscene): number {
  return Math.round(c.beats.reduce((sum, b) => sum + beatDuration(b), 0) / 1000);
}
