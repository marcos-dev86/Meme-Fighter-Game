// Âncoras medidas nos sprites novos por tools/make_wear_v2.py (wearV2.ts). Ajuste fino: edite os números lá.
import { COSMETIC_ANCHORS_V2 } from './wearV2';
/**
 * Âncoras de cosméticos por personagem e por pose. Os sprites olham para a DIREITA (a imagem é espelhada quando o
 * personagem olha para a esquerda). Coordenadas como fração da imagem da pose: x da esquerda, y de cima; `s` é o
 * tamanho do ícone como fração da ALTURA da pose.
 *  - hat: ponto onde a BASE do chapéu encosta na cabeça (x central, y da base).
 *  - back: ponto do topo-centro da capa, nas costas (ela é desenhada ATRÁS do sprite).
 */
export type CosmeticAnchor = { x: number; y: number; s: number };
export type PoseAnchors = { hat: CosmeticAnchor; back: CosmeticAnchor };
export const COSMETIC_POSES = ["idle", "walk1", "walk2", "walk3", "dash", "flash", "strong"] as const;
export function canWearCosmetics(characterKey: string): boolean {
  return !!COSMETIC_ANCHORS_V2[characterKey];
}

function anchorTable(characterKey: string): Record<string, PoseAnchors> | undefined {
  return COSMETIC_ANCHORS_V2[characterKey];
}

export function getCosmeticAnchors(characterKey: string, poseKey: string): PoseAnchors | null {
  const set = anchorTable(characterKey);
  if (!set) return null;
  return set[poseKey] ?? set.idle;
}
