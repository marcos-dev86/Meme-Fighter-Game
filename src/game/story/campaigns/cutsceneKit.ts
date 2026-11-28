import type { CodeCutscene, CodeActor, CodeBeat, CodeBg, CodeCam, CodeEffect, CodeFx, CodeIcon, CodePose, CodePoseKey, CodeKey, CodeSfx, Loc } from '../codeCutscenes';

/**
 * Ferramentas para escrever cutscenes de campanha sem repetir JSON: pessoas em pé no chão do cenário, falas, títulos e
 * entradas com trajeto suave. Todo texto é uma tupla [pt, en, es, fr, ja]; {player} vira o apelido do jogador.
 * Sem travessão nos textos (hífen em palavras é permitido).
 */
export const FLOOR_Y = 0.743;
export const FIG_H = 0.472;

/** Texto em 5 idiomas. */
export const L = (pt: string, en: string, es: string, fr: string, ja: string): Loc => [pt, en, es, fr, ja];

/** Personagem em pé. `player: true` = o personagem do jogador (skin, chapéu e capa vestidos). */
export function fig(char: string, x: number, o: Partial<CodeActor> = {}): CodeActor {
  return { char, x, y: FLOOR_Y, h: FIG_H, anim: 'none', ...o };
}
/** O personagem do jogador, em pé. */
export function me(char: string, x: number, o: Partial<CodeActor> = {}): CodeActor {
  return fig(char, x, { player: true, ...o });
}
/** NPC do pacote de personagens (kind 'npc': sprite do mundo, c08...; h é a escala do sprite, como no mundo). */
export function npc(char: string, x: number, o: Partial<CodeActor> = {}): CodeActor {
  return { char, kind: 'npc', x, y: 0.7, h: 1.9, anim: 'none', dir: 'down', ...o };
}

/** Trajeto com dois pontos: anda de `x0` até `x1` em `ms` e fica parado até `hold`. */
export function walk(x0: number, x1: number, ms: number, hold = ms, y = FLOOR_Y): CodeKey[] {
  const p: CodeKey[] = [{ t: 0, x: x0, y }, { t: ms, x: x1, y }];
  if (hold > ms) p.push({ t: hold, x: x1, y });
  return p;
}
export const poses = (...p: [number, CodePose][]): CodePoseKey[] => p.map(([t, pose]) => ({ t, pose }));

export interface BeatOpts {
  tint?: string;
  fx?: CodeFx[];
  cam?: CodeCam;
  effects?: CodeEffect[];
  ms?: number;
  shot?: boolean;
  sfx?: CodeSfx[];
  textFor?: number;
  icons?: CodeIcon[];
}

/** Quadro com fala. */
export function say(bg: CodeBg, actors: CodeActor[], speaker: Loc, text: Loc, o: BeatOpts = {}): CodeBeat {
  return { bg, actors, speaker, text, cam: { z0: 1.0, z1: 1.04 }, ...(o.textFor && o.ms === undefined ? { ms: o.textFor + 800 } : {}), ...o };
}
/** Quadro sem fala (ação, entrada, silêncio). */
export function act(bg: CodeBg, actors: CodeActor[], ms: number, o: BeatOpts = {}): CodeBeat {
  return { bg, actors, ms, cam: { z0: 1.0, z1: 1.03 }, ...o };
}
/** Cartão de título no meio da tela. */
export function card(bg: CodeBg, actors: CodeActor[], title: Loc, subtitle?: Loc, o: BeatOpts = {}): CodeBeat {
  return { bg, actors, title, subtitle, ms: 5200, cam: { z0: 1.05, z1: 1.14 }, shot: true, tint: 'rgba(0,0,0,0.35)', ...o };
}

/**
 * Dá tempo de leitura a cada quadro de fala sem `ms` e garante a duração mínima (os finais precisam de 30 s ou mais): estica o
 * último quadro, que é sempre o cartão de título, se faltar.
 */
export function lengthen(c: CodeCutscene, minSec = 32): CodeCutscene {
  const beats = c.beats.map((b) => (b.ms === undefined ? { ...b, ms: Math.max(5600, (b.textFor ?? 0) + 800) } : b));
  const total = beats.reduce((a, b) => a + (b.ms ?? 3000), 0);
  if (total < minSec * 1000) {
    const last = beats[beats.length - 1];
    beats[beats.length - 1] = { ...last, ms: (last.ms ?? 3000) + (minSec * 1000 - total) };
  }
  return { ...c, beats };
}
