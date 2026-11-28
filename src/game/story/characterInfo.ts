import { getLang } from '@/game/i18n/i18n';
import type { Lang } from '@/game/i18n/translations';
import { SKILL_TREES, type SkillDef } from '@/game/items/skills';
import { STORY_CHARACTERS } from './characters';
import { getCampaign } from './campaigns/registry';
import type { Five } from './campaigns/campaignTypes';

/**
 * Dados do PAINEL DE PERSONAGEM (seleção de personagem e tela Status): resumo da história, "título" curto, total de missões e
 * informações da árvore individual. PURO (sem React): os testes conferem os dados e a interface só mostra.
 */
const LANG_INDEX: Record<Lang, number> = { pt: 0, en: 1, es: 2, fr: 3, ja: 4 };
export const pick5 = (f: Five): string => f[LANG_INDEX[getLang()] ?? 0];

const DOGGE_SUMMARY: Five = [
  'Um cachorro meme comum que vira herói da Meme Island: junta aliados, enfrenta o Rei das Sombras e decide o destino da ilha.',
  'An ordinary meme dog who becomes the hero of Meme Island: he gathers allies, faces the Shadow King and decides the island’s fate.',
  'Un perro meme común que se vuelve el héroe de Meme Island: reúne aliados, enfrenta al Rey de las Sombras y decide el destino de la isla.',
  'Un chien meme ordinaire qui devient le héros de Meme Island : il réunit des alliés, affronte le Roi des Ombres et décide du destin de l’île.',
  'ごく普通のミーム犬がミームアイランドの英雄になる。仲間を集め、影の王に挑み、島の運命を決める。',
];
const DOGGE_TAGLINE: Five = ['O Herói da Ilha', 'The Island Hero', 'El Héroe de la Isla', 'Le Héros de l’Île', '島の英雄'];

export function characterSummary(id: string): Five | null {
  if (id === 'dogge') return DOGGE_SUMMARY;
  return getCampaign(id)?.summary ?? null;
}
export function characterTagline(id: string): Five | null {
  if (id === 'dogge') return DOGGE_TAGLINE;
  return getCampaign(id)?.tagline ?? null;
}

/** Total de missões da campanha (as do caminho de escolhas contam só as do caminho feito no jogo; aqui, as sem ramo + 1 final). */
export function campaignMissionTotal(id: string): number {
  const ms = STORY_CHARACTERS[id]?.missions ?? [];
  return ms.filter((m) => !m.branch && !m.secret).length;
}

/** Quantas missões secretas a campanha tem (opcionais, escondidas como "???" até a descoberta). */
export function campaignSecretTotal(id: string): number {
  return (STORY_CHARACTERS[id]?.missions ?? []).filter((m) => m.secret).length;
}

export interface TreeInfo {
  skills: number;
  points: number;
  supreme: SkillDef | null;
}
/** Informações da árvore INDIVIDUAL do personagem (null enquanto ele ainda não tem árvore própria). */
export function treeInfo(id: string): TreeInfo | null {
  const tree = SKILL_TREES[id];
  if (!tree) return null;
  return { skills: tree.skills.length, points: tree.skills.reduce((a, s) => a + s.cost, 0), supreme: tree.skills.find((s) => s.supreme) ?? null };
}
