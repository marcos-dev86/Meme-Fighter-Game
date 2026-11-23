/**
 * EFEITOS DO MAR (lógica pura, sem imagens): QUANDO e ONDE cada efeito de água / emoji do pacote `new-sea-assets` aparece.
 * Nada aqui é sorteado nem decorativo: cada efeito nasce de um evento real do mergulho (golpe que acerta, golpe do Sea Beast
 * que cai, mergulho/emersão, fôlego baixo, pressão das profundezas, correnteza). As imagens ficam em `SeaFxLayer.tsx`.
 * Os quadros vêm de `assets/sea/fx/index.json` (gerado por `tools/import_sea_fx.py`); `tests/unit/mar/efeitos-de-agua.test.mjs` confere as duas pontas.
 */
import type { BossPattern } from './diveCreatures';
import type { BreathEvent, BreathMods } from './breath';

export type SeaFxName = 'splash' | 'spike' | 'ball_impact' | 'ball_fly' | 'blast_end' | 'vortex' | 'bubble';

export interface SeaFxMeta {
  frames: number;
  w: number;
  h: number;
  /** duração de cada quadro (ms) */
  frameMs: number;
  /** se definido, ao chegar ao fim volta a este quadro e repete até o efeito ser removido (ex.: redemoinho do isca) */
  loopFrom?: number;
}

/** Tamanhos conferidos contra `assets/sea/fx/index.json` pelo teste. */
export const SEA_FX_META: Record<SeaFxName, SeaFxMeta> = {
  splash: { frames: 15, w: 66, h: 77, frameMs: 55 },
  spike: { frames: 20, w: 64, h: 64, frameMs: 50 },
  ball_impact: { frames: 13, w: 64, h: 64, frameMs: 45 },
  ball_fly: { frames: 21, w: 64, h: 64, frameMs: 50, loopFrom: 6 },
  blast_end: { frames: 8, w: 128, h: 128, frameMs: 80 },
  vortex: { frames: 11, w: 128, h: 128, frameMs: 90, loopFrom: 3 },
  bubble: { frames: 5, w: 16, h: 16, frameMs: 140 },
};

export type SeaEmojiName = 'stop' | 'skull' | 'shocked' | 'scream';
export const SEA_EMOJI_NAMES: SeaEmojiName[] = ['stop', 'skull', 'shocked', 'scream'];

export interface FxSpawn {
  name: SeaFxName;
  /** centro, em pixels do mundo do mergulho */
  x: number;
  y: number;
  /** largura de UM quadro na tela (px) */
  size: number;
  /** efeito em loop: some quando `untilMs` acabar */
  untilMs?: number;
  /** quanto mais cedo na lista, mais essencial: o AVISO do golpe do chefe nunca é cortado pelo MODO LEVE */
  essential: boolean;
  /** de que evento real veio (para teste e depuração) */
  cause: string;
}

export interface Pt { x: number; y: number }
export type StrikeKind = 'light' | 'heavy';

/** Golpe do jogador que ACERTOU uma criatura: gota (leve) ou coluna d'água (pesado); a morte levanta um respingo grande. */
export function fxForStrike(attack: StrikeKind, target: Pt, killed: boolean): FxSpawn[] {
  const out: FxSpawn[] = [];
  out.push(attack === 'heavy'
    ? { name: 'spike', x: target.x, y: target.y - 8, size: 84, essential: false, cause: 'strike_heavy' }
    : { name: 'ball_impact', x: target.x, y: target.y, size: 64, essential: false, cause: 'strike_light' });
  if (killed) out.push({ name: 'splash', x: target.x, y: target.y, size: 96, essential: false, cause: 'creature_killed' });
  return out;
}

/** Golpe do Sea Beast LIBERADO (o aviso acabou): onde e como a água cai. Tinta e invocação não têm efeito de água. */
export function fxForBossRelease(kind: BossPattern, at: Pt, radius: number): FxSpawn[] {
  switch (kind) {
    case 'sweep':
      return [
        { name: 'splash', x: at.x, y: at.y, size: Math.max(96, radius * 1.6), essential: true, cause: 'boss_sweep' },
        { name: 'ball_impact', x: at.x, y: at.y, size: radius * 1.2, essential: true, cause: 'boss_sweep' },
      ];
    case 'lure':
      return [{ name: 'blast_end', x: at.x, y: at.y, size: Math.max(96, radius * 1.4), essential: true, cause: 'boss_lure_end' }];
    case 'summon':
      return [{ name: 'splash', x: at.x, y: at.y, size: 72, essential: false, cause: 'boss_summon' }];
    default:
      return [];
  }
}

/** Durante o AVISO da isca (a luz que puxa o jogador): o redemoinho gira no chefe até o puxão acabar. */
export function fxForBossTelegraph(kind: BossPattern, at: Pt, radius: number, totalMs: number): FxSpawn[] {
  if (kind !== 'lure') return [];
  return [{ name: 'vortex', x: at.x, y: at.y - 24, size: Math.max(96, radius * 1.4), untilMs: totalMs, essential: true, cause: 'boss_lure' }];
}

/** Mergulhou na água / emergiu: respingo no jogador. */
export function fxForWaterTransition(kind: 'dive' | 'surface', at: Pt): FxSpawn[] {
  return [{ name: 'splash', x: at.x, y: at.y, size: 88, essential: false, cause: kind === 'dive' ? 'dive_enter' : 'dive_exit' }];
}

/** Soprou ar: bolhas sobem do jogador quando o fôlego fica baixo ou acaba (evento real do `stepBreath`). */
export function fxForBreathEvent(ev: BreathEvent, at: Pt): FxSpawn[] {
  if (ev !== 'low' && ev !== 'empty' && ev !== 'recovered') return [];
  const n = ev === 'empty' ? 4 : 2;
  const out: FxSpawn[] = [];
  for (let i = 0; i < n; i++) out.push({ name: 'bubble', x: at.x + (i - (n - 1) / 2) * 10, y: at.y - 18 - i * 9, size: 20, essential: false, cause: `breath_${ev}` });
  return out;
}

/** A correnteza arrasta o jogador: bolhas rastreiam a direção do empurrão. `push` em px/s. */
export function fxForCurrent(push: Pt, at: Pt, rng: () => number): FxSpawn[] {
  const mag = Math.hypot(push.x, push.y);
  if (mag < 1) return [];
  const ux = push.x / mag;
  const uy = push.y / mag;
  const a = (rng() - 0.5) * 60;
  return [{ name: 'bubble', x: at.x - ux * 30 - uy * a, y: at.y - uy * 30 + ux * a, size: 14, essential: false, cause: 'current' }];
}

/** A pressão esmaga? Mesma condição do `stepBreath` (fundo, fora de bolsão de ar, sem equipamento que resista). */
export function pressureSqueezing(ctx: { deep: boolean; breathable: boolean; mods: Pick<BreathMods, 'pressureSafe'> }): boolean {
  return ctx.deep && !ctx.breathable && !ctx.mods.pressureSafe;
}

/** No MODO LEVE só ficam os efeitos essenciais (avisos do chefe); os de enfeite de acerto/bolha saem. */
export function allowedInLightMode(fx: FxSpawn): boolean {
  return fx.essential;
}

/** Emoji de cada aviso do fôlego (a mesma frase continua escrita: o emoji só reforça). */
export function emojiForBreathEvent(ev: BreathEvent): SeaEmojiName | undefined {
  switch (ev) {
    case 'low': return 'shocked';
    case 'empty': return 'scream';
    case 'pressure': return 'stop';
    default: return undefined;
  }
}

/** Emoji da tela de morte e do golpe do chefe. */
export function emojiForBossPattern(kind: BossPattern): SeaEmojiName | undefined {
  return kind === 'sweep' || kind === 'lure' ? 'scream' : undefined;
}
export const EMOJI_DEATH: SeaEmojiName = 'skull';
export const EMOJI_BLOCKED: SeaEmojiName = 'stop';
export const EMOJI_SURPRISE: SeaEmojiName = 'shocked';
