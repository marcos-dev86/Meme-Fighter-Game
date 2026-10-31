"""Mede as âncoras de chapéu e capa na silhueta de cada pose e escreve src/game/cosmetics/anchors.ts.
  python3 tools/measure_anchors.py        (rode na raiz do projeto)
Depois do script dá para ajustar à mão qualquer número do anchors.ts (hat: x,y,s | back: x,y,s)."""
import json
import numpy as np
from PIL import Image

POSES = ['idle', 'walk1', 'walk2', 'walk3', 'dash', 'flash', 'strong']
CHARS = ['dogge', 'gadigago']

def measure(c, p):
    a = np.array(Image.open(f'assets/legacy-sprites/{c}/{p}.png').convert('RGBA'))[..., 3] > 128
    H, W = a.shape
    rows = a.sum(axis=1)
    ytop = next(y for y in range(H) if rows[y] >= max(3, 0.03 * W))
    band = a[ytop:ytop + max(3, int(0.10 * H))]
    xs = np.where(band.any(axis=0))[0]
    cx = (xs.min() + xs.max()) / 2 / W
    wband = (xs.max() - xs.min() + 1) / W
    mid = a[int(0.35 * H):int(0.55 * H)]
    back = np.where(mid.any(axis=0))[0].min() / W
    return dict(W=W, H=H, ytop=ytop / H, cx=cx, wband=wband, back=back)

def build():
    out = {}
    for c in CHARS:
        out[c] = {}
        for p in POSES:
            m = measure(c, p)
            head_px = m['wband'] * m['W']
            s = max(0.26, min(0.46, 1.32 * head_px / m['H']))
            hat = dict(x=round(m['cx'], 3), y=round(m['ytop'] + (0.115 if c == 'dogge' else 0.09), 3), s=round(s, 3))
            back = dict(x=round(m['back'] + 0.12, 3), y=0.27, s=0.52 if c == 'dogge' else 0.55)
            out[c][p] = dict(hat=hat, back=back)
    return out

def emit(A):
    L = ["// GERADO por tools/measure_anchors.py (medido na silhueta de cada pose). Ajuste fino: edite os números.",
         "/**", " * Âncoras de cosméticos por personagem e por pose. Os sprites olham para a DIREITA (a imagem é espelhada quando o",
         " * personagem olha para a esquerda). Coordenadas como fração da imagem da pose: x da esquerda, y de cima; `s` é o",
         " * tamanho do ícone como fração da ALTURA da pose.",
         " *  - hat: ponto onde a BASE do chapéu encosta na cabeça (x central, y da base).",
         " *  - back: ponto do topo-centro da capa, nas costas (ela é desenhada ATRÁS do sprite).", " */",
         "export type CosmeticAnchor = { x: number; y: number; s: number };",
         "export type PoseAnchors = { hat: CosmeticAnchor; back: CosmeticAnchor };",
         "export const COSMETIC_POSES = " + json.dumps(POSES) + " as const;",
         "export const COSMETIC_ANCHORS: Record<string, Record<string, PoseAnchors>> = {"]
    for c, poses in A.items():
        L.append(f"  {c}: {{")
        for p, a in poses.items():
            h, b = a['hat'], a['back']
            L.append(f"    {p}: {{ hat: {{ x: {h['x']}, y: {h['y']}, s: {h['s']} }}, back: {{ x: {b['x']}, y: {b['y']}, s: {b['s']} }} }},")
        L.append("  },")
    L += ["};", "", "export function canWearCosmetics(characterKey: string): boolean {", "  return !!COSMETIC_ANCHORS[characterKey];", "}", "",
          "export function getCosmeticAnchors(characterKey: string, poseKey: string): PoseAnchors | null {",
          "  const set = COSMETIC_ANCHORS[characterKey];", "  if (!set) return null;", "  return set[poseKey] ?? set.idle;", "}", ""]
    open('src/game/cosmetics/anchors.ts', 'w', encoding='utf8').write("\n".join(L))

if __name__ == '__main__':
    emit(build())
    print('anchors.ts escrito')
