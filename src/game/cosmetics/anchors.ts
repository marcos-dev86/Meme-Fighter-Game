// GERADO por tools/measure_anchors.py (medido na silhueta de cada pose). Ajuste fino: edite os números.
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
export const COSMETIC_ANCHORS: Record<string, Record<string, PoseAnchors>> = {
  dogge: {
    idle: { hat: { x: 0.551, y: 0.139, s: 0.338 }, back: { x: 0.168, y: 0.27, s: 0.52 } },
    walk1: { hat: { x: 0.614, y: 0.128, s: 0.34 }, back: { x: 0.184, y: 0.27, s: 0.52 } },
    walk2: { hat: { x: 0.551, y: 0.139, s: 0.338 }, back: { x: 0.135, y: 0.27, s: 0.52 } },
    walk3: { hat: { x: 0.556, y: 0.139, s: 0.338 }, back: { x: 0.204, y: 0.27, s: 0.52 } },
    dash: { hat: { x: 0.513, y: 0.134, s: 0.355 }, back: { x: 0.187, y: 0.27, s: 0.52 } },
    flash: { hat: { x: 0.5, y: 0.128, s: 0.355 }, back: { x: 0.267, y: 0.27, s: 0.52 } },
    strong: { hat: { x: 0.538, y: 0.134, s: 0.351 }, back: { x: 0.139, y: 0.27, s: 0.52 } },
  },
  gadigago: {
    idle: { hat: { x: 0.498, y: 0.09, s: 0.46 }, back: { x: 0.124, y: 0.27, s: 0.55 } },
    walk1: { hat: { x: 0.494, y: 0.111, s: 0.316 }, back: { x: 0.337, y: 0.27, s: 0.55 } },
    walk2: { hat: { x: 0.555, y: 0.111, s: 0.332 }, back: { x: 0.211, y: 0.27, s: 0.55 } },
    walk3: { hat: { x: 0.618, y: 0.116, s: 0.41 }, back: { x: 0.356, y: 0.27, s: 0.55 } },
    dash: { hat: { x: 0.436, y: 0.108, s: 0.409 }, back: { x: 0.288, y: 0.27, s: 0.55 } },
    flash: { hat: { x: 0.441, y: 0.155, s: 0.383 }, back: { x: 0.261, y: 0.27, s: 0.55 } },
    strong: { hat: { x: 0.451, y: 0.09, s: 0.401 }, back: { x: 0.25, y: 0.27, s: 0.55 } },
  },
};

export function canWearCosmetics(characterKey: string): boolean {
  return !!COSMETIC_ANCHORS[characterKey];
}

export function getCosmeticAnchors(characterKey: string, poseKey: string): PoseAnchors | null {
  const set = COSMETIC_ANCHORS[characterKey];
  if (!set) return null;
  return set[poseKey] ?? set.idle;
}
