"""Cosmeticos e arma na mao para os sprites NOVOS de Dogge e Gadigago (assets/sprites-v2).

  python3 tools/make_wear_v2.py       (rode na raiz do projeto, DEPOIS de tools/import_sheets.py)

Gera :
 - assets/skins-v2/<personagem>/<skin>/<pose>.png : skins recoloridas por tonalidade 
 - src/game/cosmetics/wearV2.ts : SKIN_SPRITES_V2, COSMETIC_ANCHORS_V2 (chapeu e capa) e HAND_ANCHORS_V2 (mao da frente)
As ancoras sao MEDIDAS na silhueta de cada quadro; para ajustar a mao, edite os numeros em HAND_FIX abaixo e rode de novo.
"""
import json
import os

import numpy as np
from PIL import Image

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import png_opt  # noqa: E402

CHARS = ['dogge', 'gadigago']
# id da skin -> (deslocamento de tonalidade em graus, fator de saturação, fator de brilho)
SKINS = {
    'gelo': (165, 0.95, 1.05),
    'floresta': (75, 1.0, 0.98),
    'sombra': (262, 0.85, 0.72),
    'ouro': (9, 1.8, 1.12),
}


def shift(im, deg, sat, val):
    im = im.convert('RGBA')
    a = im.getchannel('A')
    hsv = np.array(im.convert('RGB').convert('HSV')).astype(np.float32)
    hsv[..., 0] = (hsv[..., 0] + deg / 360.0 * 255.0) % 255.0
    hsv[..., 1] = np.clip(hsv[..., 1] * sat, 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] * val, 0, 255)
    rgb = Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')
    out = rgb.convert('RGBA')
    out.putalpha(a)
    return out

ROOT = os.getcwd()
V2 = f'{ROOT}/assets/sprites-v2'
# quadros do corpo que recebem skin (os que o jogo desenha com getBodySprite)
SKIN_POSES = ['idle', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'dash', 'flash', 'strong', 'hurt', 'ko', 'charge', 'cast']
ANCHOR_POSES = ['idle', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'dash', 'flash', 'strong', 'hurt', 'cast']
# ajuste manual da mao (fracao x,y da imagem do quadro): {personagem: {pose: (x, y)}}
HAND_FIX = {}


def alpha(c, p):
    return np.array(Image.open(f'{V2}/{c}/{p}.png').convert('RGBA'))[..., 3] > 128


def measure_head(c, p):
    a = alpha(c, p)
    H, W = a.shape
    if p in ('dash', 'cast'):  # a explosao/bola fica a direita e mais alta que a cabeca: mede so o corpo (lado esquerdo)
        a = a.copy()
        a[:, int(0.64 * W):] = False
    rows = a.sum(axis=1)
    ytop = next(y for y in range(H) if rows[y] >= max(3, 0.03 * W))
    band = a[ytop:ytop + max(3, int(0.10 * H))]
    xs = np.where(band.any(axis=0))[0]
    cx = (xs.min() + xs.max()) / 2 / W
    wband = (xs.max() - xs.min() + 1) / W
    mid = a[int(0.35 * H):int(0.55 * H)]
    back = np.where(mid.any(axis=0))[0].min() / W
    return dict(W=W, H=H, ytop=ytop / H, cx=cx, wband=wband, back=back)


def body_mask(c, p):
    """silhueta do CORPO: tira luz/explosao (muito clara ou amarela viva) para nao confundir a mao com o efeito."""
    im = np.array(Image.open(f'{V2}/{c}/{p}.png').convert('RGBA')).astype(int)
    a = im[..., 3] > 200
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    glow = (r > 235) & (g > 215) & (b > 120)  # branco/amarelo claro das explosoes
    return a & ~glow


def hand(c, p):
    m = body_mask(c, p)
    H, W = m.shape
    if p in ('dash', 'cast'):
        # a mao fica na ponta direita do CORPO, na altura do peito, antes da explosao: pega a maior coluna cheia perto do meio
        ys, xs = np.where(m[int(0.25 * H):int(0.75 * H)])
        xs_sorted = np.sort(xs)
        x = xs_sorted[int(len(xs_sorted) * 0.86)] / W
        sel = m[int(0.25 * H):int(0.75 * H), int(x * W) - 3:int(x * W) + 4]
        yy = np.where(sel.any(axis=1))[0]
        y = (yy.mean() + int(0.25 * H)) / H if len(yy) else 0.5
        return round(float(x), 3), round(float(y), 3)
    band = m[int(0.3 * H):int(0.8 * H)]
    cols = np.where(band.any(axis=0))[0]
    x = cols.max()
    # a mao = o ultimo trecho do corpo a direita nessa faixa; y = centro desse trecho
    sel = band[:, max(0, x - 10):x + 1]
    yy = np.where(sel.any(axis=1))[0]
    y = (yy.mean() + int(0.3 * H)) / H
    return round((x - 6) / W, 3), round(float(y), 3)


def main():
    lines = ['// GERADO por tools/make_wear_v2.py - nao edite a mao. Cosmeticos e arma dos sprites novos (assets/sprites-v2).',
             "import type { ImageSourcePropType } from 'react-native';", '',
             'export type SkinSourcesV2 = Record<string, ImageSourcePropType>;',
             'export const SKIN_SPRITES_V2: Record<string, Record<string, SkinSourcesV2>> = {']
    for c in CHARS:
        lines.append(f'  {c}: {{')
        for sk, (deg, sat, val) in SKINS.items():
            os.makedirs(f'{ROOT}/assets/skins-v2/{c}/{sk}', exist_ok=True)
            lines.append(f'    {sk}: {{')
            for p in SKIN_POSES:
                im = Image.open(f'{V2}/{c}/{p}.png')
                png_opt.save(shift(im.convert('RGBA'), deg, sat, val), f'{ROOT}/assets/skins-v2/{c}/{sk}/{p}.png')
                lines.append(f"      {p}: require('../../../assets/skins-v2/{c}/{sk}/{p}.png') as ImageSourcePropType,")
            lines.append('    },')
        lines.append('  },')
    lines += ['};', '', 'export type PoseAnchorsV2 = { hat: { x: number; y: number; s: number }; back: { x: number; y: number; s: number } };',
              'export const COSMETIC_ANCHORS_V2: Record<string, Record<string, PoseAnchorsV2>> = {']
    hands = {}
    for c in CHARS:
        lines.append(f'  {c}: {{')
        hands[c] = {}
        for p in ANCHOR_POSES:
            m = measure_head(c, p)
            head_px = m['wband'] * m['W']
            s = max(0.26, min(0.46, 1.32 * head_px / m['H']))
            hx, hy = round(m['cx'], 3), round(m['ytop'] + (0.115 if c == 'dogge' else 0.09), 3)
            bx, by = round(m['back'] + 0.12, 3), 0.27
            bs = 0.52 if c == 'dogge' else 0.55
            lines.append(f'    {p}: {{ hat: {{ x: {hx}, y: {hy}, s: {round(s, 3)} }}, back: {{ x: {bx}, y: {by}, s: {bs} }} }},')
            hands[c][p] = HAND_FIX.get(c, {}).get(p) or hand(c, p)
        lines.append('  },')
    lines += ['};', '', 'export const HAND_ANCHORS_V2: Record<string, Record<string, { x: number; y: number }>> = {']
    for c in CHARS:
        lines.append(f'  {c}: {{')
        for p, (x, y) in hands[c].items():
            lines.append(f'    {p}: {{ x: {x}, y: {y} }},')
        lines.append('  },')
    lines += ['};', '']
    open(f'{ROOT}/src/game/cosmetics/wearV2.ts', 'w').write('\n'.join(lines))
    print('ok', len(CHARS) * len(SKINS) * len(SKIN_POSES), 'skins')


if __name__ == '__main__':
    main()
