/**
 * Personalização do PERFIL (ícone, fundo e moldura). Arquivo PURO.
 *  - Ícone: o retrato de um lutador. Dogge (padrão) e Gadigago são de graça; os outros precisam do lutador liberado
 *    (rosterState) E de Diamond Meme.
 *  - Fundo: qualquer cor lisa é de graça; os fundos com efeito/animação são comprados com diamantes.
 *  - Moldura: a padrão é de graça (borda simples); as outras são compradas com diamantes.
 * `kind` diz ao ProfileBadge como desenhar (tudo em plain RN, sem sprites novos).
 */
import type { Rarity } from '@/game/items/rarity';
import { PROFILE_PRICES } from './accountConfig';
import { AVATAR_BY_ID } from './avatarList';

export const FREE_AVATARS = ['dogge', 'gadigago'];
export const DEFAULT_AVATAR = 'dogge';

/** Preço em Diamond Meme de um ícone (0 = grátis). Id desconhecido = 0 (nunca é vendido). */
export function avatarPrice(id: string): number {
  if (FREE_AVATARS.includes(id)) return 0;
  return PROFILE_PRICES.avatarOverride[id] ?? AVATAR_BY_ID[id]?.price ?? 0;
}
/** Personagem jogável: precisa estar liberado para comprar o ícone. Amigos e memes não jogáveis compram direto. */
export function avatarNeedsUnlock(id: string): boolean {
  return AVATAR_BY_ID[id]?.kind === 'fighter';
}

export interface BgDef {
  id: string;
  /** solid = grátis; os demais = efeitos */
  kind: 'solid' | 'gradient' | 'stars' | 'aurora' | 'rain' | 'pulse' | 'rainbow';
  rarity: Rarity;
  price: number;
  /** cores usadas pelo efeito (a primeira é a base) */
  colors: string[];
}

const solid = (id: string, color: string): BgDef => ({ id, kind: 'solid', rarity: 'common', price: 0, colors: [color] });
const fx = (id: string, kind: BgDef['kind'], rarity: Rarity, colors: string[]): BgDef => ({ id, kind, rarity, price: PROFILE_PRICES.background[rarity], colors });

export const BACKGROUNDS: BgDef[] = [
  solid('solid_gold', '#C79A3C'),
  solid('solid_red', '#B33A3A'),
  solid('solid_orange', '#D9772B'),
  solid('solid_green', '#3E9B4F'),
  solid('solid_teal', '#2A9D9D'),
  solid('solid_blue', '#3A6FC4'),
  solid('solid_violet', '#7B4FC4'),
  solid('solid_pink', '#D56AA5'),
  solid('solid_gray', '#6B6F78'),
  solid('solid_dark', '#22242B'),
  fx('fx_sunset', 'gradient', 'uncommon', ['#FF8A3C', '#C2306B', '#3B1C6B']),
  fx('fx_ocean', 'gradient', 'uncommon', ['#2AB5E8', '#1B5FA8', '#0B2A5C']),
  fx('fx_stars', 'stars', 'rare', ['#0B1030', '#FFFFFF', '#FFE08A']),
  fx('fx_matrix', 'rain', 'rare', ['#04130A', '#37E26B', '#B6FFCB']),
  fx('fx_aurora', 'aurora', 'epic', ['#08122B', '#35E0A1', '#7B5CFF']),
  fx('fx_pulse', 'pulse', 'epic', ['#2A0A1A', '#FF4D6D', '#FFB3C1']),
  fx('fx_rainbow', 'rainbow', 'legendary', ['#FF4D4D', '#FFC21A', '#45D34A', '#3A9BFF', '#B05CFF']),
];
export const DEFAULT_BG = 'solid_gold';
export const BG_BY_ID: Record<string, BgDef> = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b]));

export interface FrameDef {
  id: string;
  kind: 'plain' | 'solid' | 'double' | 'glow' | 'rainbow' | 'pixel';
  rarity: Rarity;
  price: number;
  colors: string[];
}
const fr = (id: string, kind: FrameDef['kind'], rarity: Rarity, colors: string[]): FrameDef => ({ id, kind, rarity, price: PROFILE_PRICES.frame[rarity], colors });

export const FRAMES: FrameDef[] = [
  { id: 'frame_default', kind: 'plain', rarity: 'common', price: 0, colors: ['#3A2A12'] },
  fr('frame_silver', 'solid', 'common', ['#D8DCE3']),
  fr('frame_gold', 'solid', 'uncommon', ['#FFC21A']),
  fr('frame_double', 'double', 'rare', ['#FFC21A', '#3A2A12']),
  fr('frame_pixel', 'pixel', 'rare', ['#4DA6FF', '#1B3F73']),
  fr('frame_neon', 'glow', 'epic', ['#37E2FF']),
  fr('frame_fire', 'glow', 'epic', ['#FF6A1A']),
  fr('frame_rainbow', 'rainbow', 'legendary', ['#FF4D4D', '#FFC21A', '#45D34A', '#3A9BFF', '#B05CFF']),
];
export const DEFAULT_FRAME = 'frame_default';
export const FRAME_BY_ID: Record<string, FrameDef> = Object.fromEntries(FRAMES.map((f) => [f.id, f]));
