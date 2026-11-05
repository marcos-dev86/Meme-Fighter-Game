#!/usr/bin/env python3
"""Gera os CENARIOS DE BATALHA novos (Urgente 3): um para cada lugar/bioma do mundo, no mesmo estilo pixel-art dos 3 originais
(montanhas, vilarejo, rio outonal): 1280x720, ceu com degrade pontilhado, camadas de fundo e um chao liso onde os lutadores pisam.

Tudo e DESENHADO POR CODIGO (formas, ruido, semente fixa): nenhuma imagem de terceiros. Cada cenario e feito em 320x180 e ampliado 4x
sem suavizar (pixel-art de verdade). Saida: assets/legacy-art/stages/stage<N>.webp (N = 4..12). Os 3 primeiros NAO sao tocados.

  stage_4 VULCAO            stage_5 NEVE (ilha do gelo)       stage_6 TREVAS
  stage_7 ILHA MISTERIOSA   stage_8 CASSINO (salao)           stage_9 FLORESTA (ilha dos fragmentos)
  stage_10 ACAMPAMENTO      stage_11 PRAIA (ilha dos caes)    stage_12 CAVERNA (subsolo / caverna)

VARIACOES: cada cenario ao ar livre tem 3 versoes - DIA (stageN.webp), AMANHECER/POR DO SOL (stageN_dusk.webp) e NOITE
(stageN_night.webp). Caverna (12) e cassino (8) sao fechados: so existe uma versao. Os 3 cenarios originais (1-3) mantem a arte
do jogo como DIA; dusk/night deles sao a MESMA arte com correcao de cor por codigo (derive()), sem redesenhar nada.

Uso: python3 tools/make_stages.py [--out assets/legacy-art/stages] [--png-preview pasta]
"""
import argparse
import math
import os
import random

import numpy as np
from PIL import Image

W, H = 320, 180
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def C(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(ch * 2 for ch in h)
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.uint8)


def canvas():
    return np.zeros((H, W, 3), np.uint8)


def sky(im, stops, y1):
    """degrade vertical pontilhado (dither ordenado) entre as cores `stops` de y=0 ate y1."""
    cols = [C(c) for c in stops]
    n = len(cols)
    for y in range(y1):
        pos = y / max(1, y1 - 1) * (n - 1)
        b = min(int(pos), n - 2)
        fr = pos - b
        for x in range(W):
            im[y, x] = cols[b + 1] if BAYER[y % 4, x % 4] < fr else cols[b]


def vnoise(rng, n, step):
    pts = [rng.random() for _ in range(n // step + 3)]
    out = np.zeros(n)
    for x in range(n):
        i, f = divmod(x, step)
        t = f / step
        t = (1 - math.cos(t * math.pi)) / 2
        out[x] = pts[i] * (1 - t) + pts[i + 1] * t
    return out


def height(rng, base, amp, step=40, octaves=3, sharp=False):
    h = np.zeros(W)
    a = 1.0
    tot = 0
    for o in range(octaves):
        n = vnoise(rng, W, max(3, step >> o))
        if sharp:
            n = 1 - np.abs(2 * n - 1)
        h += n * a
        tot += a
        a *= 0.5
    h /= tot
    return base - h * amp


def ridge(im, hts, color, bottom=H, snow=None, snow_depth=0, snow_above=None):
    col = C(color)
    for x in range(W):
        y0 = int(hts[x])
        im[max(0, y0):bottom, x] = col
        if snow is not None and snow_above is not None and y0 < snow_above:
            d = int(min(snow_depth, (snow_above - y0) * 0.8) + (x * 7 % 3))
            im[max(0, y0):max(0, y0) + d, x] = C(snow)


def rect(im, x0, y0, x1, y1, color):
    im[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = C(color)


def disc(im, cx, cy, r, color):
    yy, xx = np.ogrid[:H, :W]
    im[(xx - cx) ** 2 + (yy - cy) ** 2 <= r * r] = C(color)


def ellipse(im, cx, cy, rx, ry, color):
    yy, xx = np.ogrid[:H, :W]
    im[((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1] = C(color)


def tri(im, cx, top, bottom, half, color):
    for y in range(top, bottom):
        w = int(half * (y - top) / max(1, bottom - top))
        im[y, max(0, cx - w):min(W, cx + w + 1)] = C(color)


def cloud(im, cx, cy, s, light='#ffffff', shade='#c9d6f0'):
    for dx, dy, rx, ry in ((0, 0, 14, 5), (-9, 2, 9, 4), (10, 2, 10, 4), (2, -4, 8, 5)):
        ellipse(im, cx + dx * s, cy + dy * s + 2, rx * s, ry * s, shade)
    for dx, dy, rx, ry in ((0, 0, 14, 5), (-9, 2, 9, 4), (10, 2, 10, 4), (2, -4, 8, 5)):
        ellipse(im, cx + dx * s, cy + dy * s, rx * s, ry * s, light)


def stars(im, rng, n, y1, colors=('#ffffff', '#ffe9a8', '#bcd2ff')):
    for _ in range(n):
        im[rng.randrange(0, y1), rng.randrange(0, W)] = C(rng.choice(colors))


def pine(im, cx, base, h, dark, light, snow=None):
    for i in range(3):
        top = base - h + i * h // 4
        bot = base - h // 3 + i * h // 4 - 1
        tri(im, cx, top, min(base, bot + h // 4), h // 5 + i * 2, dark)
        tri(im, cx - 1, top, min(base, bot + h // 4), h // 5 + i * 2 - 1, light)
        if snow:
            tri(im, cx, top, top + h // 6, h // 6, snow)
    rect(im, cx - 1, base - 3, cx + 1, base, '#4a2e1a')


def round_tree(im, cx, base, r, dark, light, trunk='#4a2e1a'):
    rect(im, cx - 1, base - r, cx + 1, base, trunk)
    disc(im, cx, base - r - r // 2, r, dark)
    disc(im, cx - 1, base - r - r // 2 - 1, r - 2, light)


def dead_tree(im, rng, cx, base, h, color):
    rect(im, cx - 1, base - h, cx + 1, base, color)
    for _ in range(4):
        y = base - rng.randint(h // 3, h - 2)
        d = rng.choice((-1, 1))
        for k in range(rng.randint(5, 11)):
            im[y - k // 2, min(W - 1, max(0, cx + d * k))] = C(color)


def ground(im, gy, bands, rng, speck=None, edge=None, edge_h=3):
    """chao liso do `gy` ate o fim, em faixas horizontais; `speck`= cores de pontinhos; `edge` = cor da borda de cima irregular."""
    y = gy
    for color, hh in bands:
        rect(im, 0, y, W, min(H, y + hh), color)
        y += hh
    if y < H:
        rect(im, 0, y, W, H, bands[-1][0])
    if speck:
        for _ in range(420):
            im[rng.randrange(gy + 3, H), rng.randrange(0, W)] = C(rng.choice(speck))
    if edge:
        for x in range(W):
            d = rng.randint(0, edge_h)
            im[gy:gy + d, x] = C(edge)


def tint(im, color, a):
    im[:] = (im * (1 - a) + C(color) * a).astype(np.uint8)


def vignette(im, a=0.35):
    yy, xx = np.mgrid[:H, :W]
    d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    k = np.clip((d - 0.7) / 0.9, 0, 1) * a
    im[:] = (im * (1 - k[..., None])).astype(np.uint8)


# ----------------------------------------------------------------------------------------------- cenarios
GY = 136  # topo do chao (x4 = 544): os pes ficam por volta de y=150 (x4 = 600)
MODE = 'day'  # 'day' | 'dusk' | 'night' (definido por render())
SNAP = {}


def M(day, dusk, night):
    return {'day': day, 'dusk': dusk, 'night': night}[MODE]


def mark(im):
    """memoriza o que e ceu (ceu + astros), para o correcao de cor nao pintar por cima dele."""
    SNAP['sky'] = im.copy()


def sun(im, cx, cy, r, c1='#fff3a0', c2='#fffbd0'):
    disc(im, cx, cy, r, c1); disc(im, cx, cy, int(r * 0.75), c2)


def moon(im, cx, cy, r, c1='#e9dcff', c2='#b7a2e0'):
    disc(im, cx, cy, r, c1); disc(im, cx + 3, cy - 2, r - 2, c2)
    disc(im, cx - r // 3, cy + r // 4, max(1, r // 7), '#9a8cc0'); disc(im, cx + r // 4, cy + r // 2 - 1, max(1, r // 9), '#9a8cc0')


def grade(im, mode):
    """correcao de cor so do que NAO e ceu: entardecer = quente, noite = azul escuro (luzes vivas, como lava/fogo, ficam)."""
    if mode == 'day':
        return
    sky = (im == SNAP['sky']).all(2) if 'sky' in SNAP else np.zeros((H, W), bool)
    f = im.astype(np.float32)
    mx = f.max(2); mn = f.min(2)
    emissive = (mx > 205) & ((mx - mn) > 80)
    if mode == 'dusk':
        k = np.array([1.12, 0.86, 0.74], np.float32)
        out = f * k + np.array([22, 6, 0], np.float32)
    else:
        k = np.array([0.40, 0.50, 0.82], np.float32)
        out = f * k + np.array([0, 4, 16], np.float32)
    out = np.clip(out, 0, 255)
    keep = sky | (emissive if mode == 'night' else np.zeros_like(sky))
    f[~keep] = out[~keep]
    im[:] = f.astype(np.uint8)


def night_stars(im, rng, n=90):
    sk = SNAP.get('sky')
    if sk is None:
        return
    mask = (im == sk).all(2)
    mask[GY - 20:] = False
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return
    for _ in range(n):
        j = rng.randrange(len(xs))
        im[ys[j], xs[j]] = C(rng.choice(('#ffffff', '#ffe9a8', '#bcd2ff')))


# Cada cenario: funcao(r) que usa M(dia, entardecer, noite) onde algo muda por horario.
def s_vulcao(r):
    im = canvas()
    sky(im, M(['#5a423c', '#9a6a54', '#d89a6a', '#f0c090'], ['#2a0c10', '#5a1410', '#a8321a', '#e8742a', '#ffb347'], ['#07030a', '#14060a', '#2c0c0c', '#4a1408']), 120)
    if MODE == 'night':
        stars(im, r, 30, 70, ('#ffb0a0', '#ffe0c0'))
    sun(im, 60, 92, 15, '#ffb060', '#ffd890') if MODE == 'dusk' else (sun(im, 70, 30, 12, '#ffe0b0', '#fff4d8') if MODE == 'day' else None)
    mark(im)
    for _ in range(40):
        im[r.randrange(0, 100), r.randrange(0, W)] = C(r.choice(['#ff8a3c', '#ffc46b', '#7a2a20']))  # brasas no ar
    ridge(im, height(r, 118, 55, 60, 3, True), M('#4a3430', '#3a1612', '#1c0a0c'), GY)
    cx = 205
    for y in range(40, GY):  # vulcao grande ao centro
        w = int(8 + (y - 40) * 0.95)
        im[y, max(0, cx - w):min(W, cx + w)] = C(M('#2e1a18', '#241012', '#120608'))
    for y in range(40, 52):
        im[y, cx - 14:cx + 14] = C('#ff7a2a') if y < 46 else C('#ffb347')
    for i in range(7):  # rios de lava
        x0 = cx - 10 + i * 4 + r.randint(-1, 1)
        for y in range(50, 50 + r.randint(30, 70)):
            im[y, max(0, min(W - 1, x0 + int(math.sin(y / 5 + i) * 2)))] = C('#ff6a1f')
    for _ in range(18):
        ellipse(im, cx + r.randint(-26, 26), r.randint(8, 40), r.randint(8, 16), r.randint(4, 7), M('#7a625c', '#4a2a2a', '#241212'))
    ridge(im, height(r, 128, 26, 30, 3, True), M('#2a1a18', '#1c0b0c', '#0c0506'), GY)
    for x in range(0, W, 3):
        if r.random() < 0.55:
            rect(im, x, GY - 4, x + 2, GY, '#ff5a1a')
    ground(im, GY, [(M('#4a3638', '#3b2a2c', '#241a1c'), 5), (M('#3a292b', '#2b1e20', '#1a1214'), 12), (M('#2c1e20', '#201618', '#120c0d'), 40)], r, ['#5a4144', '#14090b', '#ff8a3c'], M('#5a4144', '#4b3436', '#2e2022'), 2)
    for x in range(10, W, 53):
        rect(im, x, GY + 14, x + 18, GY + 17, '#ff5a1a'); rect(im, x + 1, GY + 14, x + 17, GY + 15, '#ffb347')
    return im


def s_neve(r):
    im = canvas()
    sky(im, M(['#9cc4ea', '#c3dcf4', '#e6f1fb', '#f6fbff'], ['#4a4a8a', '#a8689a', '#f09a7a', '#ffd9a8'], ['#050a1c', '#0b1736', '#152a52', '#26406e']), 120)
    if MODE == 'night':
        stars(im, r, 80, 90); moon(im, 250, 34, 14, '#f4f4ff', '#c8d4f0')
    elif MODE == 'dusk':
        sun(im, 80, 100, 16, '#ffc080', '#ffe6b8')
    mark(im)
    for cx, cy, s in ((40, 30, 1.0), (150, 18, 1.3), (255, 38, 0.9)):
        cloud(im, cx, cy, s, M('#ffffff', '#ffc9b0', '#5a6a9a'), M('#d3e2f5', '#d08aa0', '#3a4a7a'))
    ridge(im, height(r, 96, 70, 55, 3, True), '#9db3d8', GY, '#ffffff', 22, 82)
    ridge(im, height(r, 112, 40, 38, 3, True), '#7f97c4', GY, '#f1f6ff', 14, 100)
    for x in range(8, W, 17):
        pine(im, x + r.randint(-3, 3), 128 + r.randint(0, 3), r.randint(16, 26), '#27557a', '#3f7aa8', '#ffffff')
    ground(im, GY, [('#ffffff', 3), ('#e5eefb', 5), ('#cddcf0', 40)], r, ['#ffffff', '#b8cbe6', '#9bb5d9'], '#ffffff', 3)
    for x in (30, 130, 220, 290):
        ellipse(im, x, GY + 2, 18, 3, '#ffffff')
    for _ in range(90):
        im[r.randrange(0, GY), r.randrange(0, W)] = C('#ffffff')
    for x in (60, 200):
        ellipse(im, x, GY + 1, 7, 4, '#8a99b0'); ellipse(im, x, GY - 1, 6, 2, '#ffffff')
    return im


def s_trevas(r):
    im = canvas()
    sky(im, M(['#5a4a7a', '#7e6a9e', '#a894c0', '#c8b8d8'], ['#241040', '#5e2a6e', '#b84a7a', '#f09a7a'], ['#0b0618', '#1d0f3a', '#3b1b66', '#5e2b86']), 125)
    if MODE == 'night':
        stars(im, r, 90, 90, ('#ffffff', '#c9a8ff', '#ff9ae6')); moon(im, 235, 38, 22)
    elif MODE == 'dusk':
        stars(im, r, 25, 40, ('#ffffff', '#c9a8ff')); moon(im, 60, 96, 20, '#f6e6ff', '#d6b8f0')
    else:
        sun(im, 240, 40, 14, '#e8dcf0', '#f8f0ff')  # sol palido atras da neblina
    mark(im)
    ridge(im, height(r, 108, 50, 50, 3, True), M('#4a3868', '#2f1a4f', '#23123f'), GY)
    ridge(im, height(r, 120, 28, 30, 3, True), M('#33244f', '#1f0f38', '#170b2c'), GY)
    for x in range(10, W, 29):
        dead_tree(im, r, x + r.randint(-6, 6), 130 + r.randint(0, 4), r.randint(18, 34), M('#1c1230', '#120a24', '#0d0618'))
    for _ in range(5):
        ellipse(im, r.randint(0, W), r.randint(112, 134), r.randint(40, 70), r.randint(3, 6), M('#8a7aaa', '#6a3a80', '#4a2a78'))
    ground(im, GY, [(M('#54406e', '#3f2860', '#3a2457'), 4), (M('#43315a', '#2e1a48', '#2a1840'), 12), (M('#33244a', '#22123a', '#1d0f30'), 40)], r, ['#4d3273', '#120820', '#7a4fb0'], M('#6a5088', '#4d3273', '#4d3273'), 2)
    for x in (45, 150, 270):
        rect(im, x, GY - 7, x + 7, GY + 3, '#4b3a66'); rect(im, x + 1, GY - 8, x + 6, GY - 7, '#4b3a66'); rect(im, x + 3, GY - 5, x + 4, GY, '#2a1c3f')
    SNAP['vig'] = 0.45 if MODE == 'night' else 0.3
    return im


def s_misteriosa(r):
    im = canvas()
    sky(im, M(['#3ab8e0', '#6fd8e0', '#b8f0e0', '#fff6c8'], ['#0e2a3a', '#13566a', '#2aa59a', '#9ee6c9', '#ffe9a8'], ['#020c18', '#06222e', '#0c4a52', '#1a7a78']), 120)
    if MODE == 'night':
        stars(im, r, 90, 80, ('#ffffff', '#cfffee')); moon(im, 70, 50, 22, '#e8fff6', '#bff0e0')
    elif MODE == 'dusk':
        stars(im, r, 40, 55, ('#ffffff', '#cfffee')); sun(im, 70, 50, 26, '#fff3c4', '#fffbe6')
    else:
        sun(im, 70, 36, 20, '#fff7b0', '#ffffe0')
    mark(im)
    for cx, cy in ((190, 40), (250, 28), (130, 22)):
        ellipse(im, cx, cy, 20, 4, '#5a7a4a'); tri(im, cx, cy + 2, cy + 18, 16, '#6b4f3a'); rect(im, cx - 18, cy - 1, cx + 19, cy + 1, '#7ec06a')
        disc(im, cx - 5, cy - 6, 4, '#3f8a5a'); rect(im, cx - 6, cy - 2, cx - 4, cy, '#4a2e1a')
    ridge(im, height(r, 112, 40, 45, 3, False), '#1d6e6a', GY)
    for x in range(14, W, 38):
        hh = r.randint(14, 30)
        for k in range(3):
            xx = x + k * 5 - 5
            tri(im, xx, 130 - hh + k * 4, 130, 3, ['#7affd8', '#b9fff0', '#4bd6c0'][k])
    for x in range(24, W, 61):
        rect(im, x, 100, x + 2, 132, '#6b4a2a')
        for k in range(6):
            a = -0.2 + k * 0.5 - 1.2
            for t in range(14):
                im[100 + int(math.sin(a) * t * 0.7) + t // 4, min(W - 1, max(0, x + 1 + int(math.cos(a) * t)))] = C('#2f9a5a')
    ground(im, GY, [('#e8d49a', 4), ('#d4bd7e', 12), ('#b99f62', 40)], r, ['#f5e6b0', '#a08650', '#7affd8'], '#f0dfa8', 2)
    for x in (50, 150, 250):
        ellipse(im, x, GY + 20, 12, 3, '#7affd8'); ellipse(im, x, GY + 20, 8, 2, '#d8fff4')
    return im


def s_floresta(r):
    im = canvas()
    sky(im, M(['#6ec1e8', '#a5dff2', '#d7f2ea'], ['#4a5a9a', '#c8708a', '#f4a870', '#ffd9a0'], ['#050a1c', '#0b1a30', '#14304a']), 105)
    if MODE == 'night':
        stars(im, r, 90, 80); moon(im, 240, 30, 13, '#f4f4e0', '#d0d0bc')
    elif MODE == 'dusk':
        sun(im, 90, 92, 15, '#ffc080', '#ffe6b8')
    else:
        sun(im, 250, 26, 11, '#fff7b0', '#ffffe0')
    mark(im)
    cloud(im, 70, 24, 1.0, M('#ffffff', '#ffc9b0', '#4a5a80'), M('#c9d6f0', '#d08aa0', '#2a3a60'))
    cloud(im, 230, 36, 0.9, M('#ffffff', '#ffc9b0', '#4a5a80'), M('#c9d6f0', '#d08aa0', '#2a3a60'))
    ridge(im, height(r, 100, 46, 60, 3, True), '#5e8fa8', GY)
    ridge(im, height(r, 112, 30, 40, 3, True), '#3f7a5a', GY)
    for x in range(0, W, 9):
        pine(im, x + r.randint(-2, 2), 126 + r.randint(0, 3), r.randint(18, 30), '#1f5a34', '#2f8a4a')
    for x in range(12, W, 36):
        round_tree(im, x + r.randint(-4, 4), 130 + r.randint(0, 4), r.randint(7, 11), '#2f8a3a', '#52b84e')
    if MODE == 'day':
        for x in range(0, W, 2):  # raios de luz
            if (x // 2) % 9 == 0:
                for y in range(20, 112):
                    if (x + y) % 3 == 0:
                        im[y, min(W - 1, x + y // 6)] = (im[y, min(W - 1, x + y // 6)] * 0.8 + C('#ffffcc') * 0.2).astype(np.uint8)
    ground(im, GY, [('#58b04a', 3), ('#3f8a3a', 5), ('#8a6a3c', 8), ('#6e5230', 40)], r, ['#a0845a', '#4a3a22', '#7ed36a'], '#58b04a', 3)
    for x in (30, 110, 190, 280):
        rect(im, x, GY + 12, x + 2, GY + 15, '#e8e8d0'); ellipse(im, x + 1, GY + 11, 4, 2, '#d63a3a'); im[GY + 11, x] = C('#ffffff')
    if MODE == 'night':  # vagalumes
        for _ in range(26):
            im[r.randint(70, 150), r.randrange(0, W)] = C('#d8ff7a')
    return im


def s_acampamento(r):
    im = canvas()
    sky(im, M(['#5aa8e0', '#9ad0f0', '#d0ecf8'], ['#2a3a7a', '#a8587a', '#f09a6a', '#ffd08a'], ['#0a1226', '#16254a', '#2a3f6e', '#6a5a7a']), 120)
    if MODE == 'night':
        stars(im, r, 110, 90); moon(im, 60, 36, 14, '#f4f0d8', '#d8d6c0')
    elif MODE == 'dusk':
        stars(im, r, 25, 40); sun(im, 230, 100, 16, '#ffc080', '#ffe6b8')
    else:
        sun(im, 60, 30, 12, '#fff7b0', '#ffffe0')
    mark(im)
    if MODE == 'day':
        cloud(im, 140, 26, 1.1); cloud(im, 270, 44, 0.8)
    ridge(im, height(r, 108, 40, 60, 3, True), M('#4a7a98', '#3a3a6a', '#16294a'), GY)
    for x in range(0, W, 8):
        pine(im, x + r.randint(-2, 2), 124 + r.randint(0, 4), r.randint(20, 36), M('#14502a', '#0e3020', '#0b2418'), M('#2a8a46', '#1c5a38', '#14402a'))
    for cx in (80, 245):
        tri(im, cx, 108, 136, 22, '#c4782a'); tri(im, cx, 108, 136, 12, '#a85f1c'); rect(im, cx - 3, 122, cx + 3, 136, '#2a1408')
        rect(im, cx - 1, 102, cx + 1, 108, '#4a2e1a')
    cx = 160
    if MODE != 'day':  # brilho da fogueira
        for rr, a in ((46, 0.10), (34, 0.14), (22, 0.18)):
            yy, xx = np.ogrid[:H, :W]
            m = (xx - cx) ** 2 + ((yy - 140) * 1.6) ** 2 <= rr * rr
            im[m] = (im[m] * (1 - a) + C('#ff9a3c') * a).astype(np.uint8)
    ground(im, GY, [(M('#8a7a4a', '#4a3a22', '#4a3a22'), 3), (M('#6e5e38', '#3a2d1a', '#3a2d1a'), 12), (M('#5a4a2a', '#2a2014', '#2a2014'), 40)], r, ['#5e4a2a', '#1a130b', '#ffb347'], M('#8a7a4a', '#5e4a2a', '#5e4a2a'), 2)
    kk = 5 if MODE != 'day' else 3
    for k in range(kk):
        tri(im, cx, 128 - k * 2 + (4 if MODE == 'day' else 0), 142, 7 - k, ['#d6381a', '#ff6a1a', '#ffa21a', '#ffd24a', '#fff3a0'][k])
    rect(im, cx - 9, 141, cx + 9, 144, '#5a3a1e'); rect(im, cx - 6, 139, cx + 6, 141, '#3a2412')
    if MODE != 'day':
        for k in range(12):
            im[r.randint(100, 128), cx + r.randint(-12, 12)] = C('#ffd24a')
    SNAP['vig'] = 0.3 if MODE == 'night' else 0.1
    return im


def s_praia(r):
    im = canvas()
    sky(im, M(['#2e8ae0', '#6ab8f0', '#a8dcf8', '#e0f4ff'], ['#2b6cc4', '#5aa0e0', '#f7a45a', '#ffd48a', '#ffe9b8'], ['#040a1e', '#0a1838', '#14305a', '#244a7a']), 100)
    if MODE == 'night':
        stars(im, r, 100, 90); moon(im, 160, 50, 18, '#f4f4e8', '#d0d4e4')
    elif MODE == 'dusk':
        sun(im, 160, 96, 20); 
    else:
        sun(im, 235, 28, 14, '#fff7b0', '#ffffe0')
    mark(im)
    if MODE == 'day':
        cloud(im, 70, 30, 1.0); cloud(im, 200, 50, 1.2)
    elif MODE == 'dusk':
        cloud(im, 60, 30, 1.0, '#ffd9b0', '#f0a87a'); cloud(im, 230, 22, 1.2, '#ffd9b0', '#f0a87a')
    sea = M('#2a8ae0', '#2a7ac8', '#0e2a5a')
    rect(im, 0, 96, W, 124, sea)
    cxs = {'day': 235, 'dusk': 160, 'night': 160}[MODE]
    for y in range(96, 124):
        for x in range(W):
            if (x * 3 + y * 7) % 23 == 0 or (abs(x - cxs) < 22 and (y + x) % 5 == 0):
                im[y, x] = C({'day': '#fff3c4', 'dusk': '#ffe9a8', 'night': '#dfe8ff'}[MODE]) if abs(x - cxs) < 22 else C(M('#8ccaf8', '#6fb0f0', '#2a5a9a'))
    rect(im, 0, 96, W, 98, M('#d0ecff', '#bfe0ff', '#4a7ab0'))
    ridge(im, height(r, 96, 12, 60, 2, False), M('#4a9aa8', '#3a7a8a', '#14384a'), 100)
    for x in (30, 280):
        for dx in (0, 20):
            xx = x + dx
            for k in range(30):
                im[100 + k, xx + int(math.sin(k / 9) * 3)] = C('#6b4a2a')
            for k in range(7):
                a = -1.4 + k * 0.45
                for t in range(16):
                    im[100 + int(math.sin(a) * t * 0.6) + t // 3, min(W - 1, max(0, xx + 3 + int(math.cos(a) * t)))] = C('#1f8a4a')
    ground(im, 124, [('#ffe9a8', 4), ('#f0d58a', 8), ('#e0c070', 8), ('#d4b062', 40)], r, ['#fff3c4', '#b89850', '#ffffff'], None)
    for x in range(0, W, 6):
        rect(im, x, 121 + (x // 6) % 2, x + 5, 124, '#ffffff')
    for x in (50, 140, 230, 300):
        rect(im, x, GY + 18, x + 3, GY + 20, '#ff9ab0'); im[GY + 17, x + 1] = C('#ffffff')
    return im


# ---- fechados: so uma versao (nao tem ceu)
def s_cassino(r):
    im = canvas()
    rect(im, 0, 0, W, GY, '#2a0f22')
    for x in range(0, W, 16):
        rect(im, x, 0, x + 8, GY, '#34132a')
    rect(im, 0, 0, W, 10, '#5a0f1f')
    for x in range(0, W, 12):
        rect(im, x, 0, x + 6, 22, '#8a1428'); rect(im, x + 6, 0, x + 12, 22, '#6a0f20')
    rect(im, 0, 22, W, 25, '#f2c14e')
    for cx in (60, 160, 260):
        rect(im, cx, 25, cx + 1, 40, '#f2c14e'); ellipse(im, cx, 44, 14, 6, '#f2c14e'); ellipse(im, cx, 42, 10, 3, '#ffe9a8')
        for k in range(-3, 4):
            rect(im, cx + k * 4, 46, cx + k * 4 + 2, 52, '#fff3c4')
    for i, x in enumerate(range(6, W, 28)):
        rect(im, x, 78, x + 22, GY, '#7a1020'); rect(im, x + 2, 82, x + 20, 100, '#1a1a2e')
        for k in range(3):
            rect(im, x + 4 + k * 6, 86, x + 8 + k * 6, 96, ['#ffdd55', '#ff5566', '#66ddff'][(i + k) % 3])
        rect(im, x + 2, 104, x + 20, 108, '#f2c14e'); rect(im, x + 8, 112, x + 14, 118, '#222'); rect(im, x + 22, 82, x + 24, 98, '#d4d4d4')
        if i % 2 == 0:
            rect(im, x + 6, 70, x + 16, 78, '#ffdd55'); rect(im, x + 8, 72, x + 14, 76, '#ff3355')
    for x in range(0, W, 20):
        im[27 + int(abs(math.sin(x / 30)) * 4), x] = C('#ffe9a8')
    for x in range(0, W, 8):
        rect(im, x, GY - 2, x + 4, GY, '#f2c14e')
    ground(im, GY, [('#a3142c', 4), ('#8a1024', 10), ('#6e0c1c', 44)], r, ['#b5223a', '#4f0914', '#f2c14e'], None)
    for y in range(GY + 4, H, 12):
        rect(im, 0, y, W, y + 1, '#541022')
    rect(im, 0, GY + 2, W, GY + 3, '#f2c14e')
    for x in range(0, W, 24):
        for k, y in enumerate(range(GY + 8, H, 12)):
            xx = x + (12 if k % 2 else 0)
            rect(im, xx, y, xx + 2, y + 2, '#c4962e')
    vignette(im, 0.3)
    return im


def s_caverna(r):
    im = canvas()
    sky(im, ['#0c0a14', '#1c1626', '#2e2438'], 130)
    ridge(im, height(r, 96, 20, 20, 3, False), '#18121e', GY)
    for x in range(0, W, 14):
        hh = r.randint(10, 44)
        tri(im, x + 6, 0, hh, 6, '#2c2238'); tri(im, x + 6, 0, hh - 3, 3, '#3d3150')
    for x in range(4, W, 40):
        hh = r.randint(14, 34)
        tri(im, x + 8, GY - hh, GY, 7, '#241c30')
    for cx, cy, col in ((70, 70, '#6affd0'), (160, 58, '#a28bff'), (250, 80, '#6aaaff'), (205, 110, '#ff8ae6'), (30, 100, '#6affd0')):
        for rr, a in ((18, 0.10), (12, 0.16), (7, 0.25)):
            yy, xx = np.ogrid[:H, :W]
            m = (xx - cx) ** 2 + (yy - cy) ** 2 <= rr * rr
            im[m] = (im[m] * (1 - a) + C(col) * a).astype(np.uint8)
        tri(im, cx, cy - 8, cy + 8, 3, col); tri(im, cx + 4, cy - 3, cy + 8, 2, col); tri(im, cx - 4, cy, cy + 8, 2, col)
    ground(im, GY, [('#4a3f58', 3), ('#392f46', 12), ('#2a2234', 40)], r, ['#5e5270', '#1a1422', '#a28bff'], '#4a3f58', 2)
    for x in (40, 120, 200, 275):
        ellipse(im, x, GY + 1, 8, 4, '#2e2640'); ellipse(im, x, GY - 1, 6, 2, '#4a3f58')
    vignette(im, 0.5)
    return im


def sky_mask(im, blue_rule=False):
    """ceu = regiao ligada ao topo cujos pixels vizinhos variam pouco (o degrade pontilhado); nuvens, montanhas e predios fazem borda."""
    f = im.astype(np.int16)
    seen = np.zeros((H, W), bool)
    stack = [(0, x) for x in range(W)]
    for pt in stack:
        seen[pt] = True
    while stack:
        y, x = stack.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if not (0 <= ny < H and 0 <= nx < W) or seen[ny, nx]:
                continue
            ok = (f[ny, nx, 1] - f[ny, nx, 0] >= 36 and f[ny, nx, 2] - f[ny, nx, 0] >= 66) if blue_rule else (np.abs(f[ny, nx] - f[y, x]).sum() < 34)
            if ok:
                seen[ny, nx] = True
                stack.append((ny, nx))
    return seen & (np.arange(H)[:, None] < 125)


def derive(im, mode, rng, blue_rule=False):
    """dusk/night dos cenarios ORIGINAIS (1-3): a mesma arte com correcao de cor e o ceu repintado (sem redesenhar o resto)."""
    f = im.astype(np.float32)
    sk = sky_mask(im, blue_rule)
    lum = f.mean(2)
    ys_, xs_ = np.where(sk)
    hor = ys_.max() if len(ys_) else 100  # linha do horizonte aproximada
    t = (np.arange(H)[:, None] / max(1, hor)).clip(0, 1).repeat(W, 1)
    if mode == 'dusk':
        out = f * np.array([1.10, 0.84, 0.72], np.float32) + np.array([20, 6, 0], np.float32)
        top = np.array([74, 74, 138], np.float32); mid = np.array([200, 110, 140], np.float32); bot = np.array([255, 190, 130], np.float32)
    else:
        out = f * np.array([0.38, 0.47, 0.80], np.float32) + np.array([0, 4, 16], np.float32)
        top = np.array([5, 10, 28], np.float32); mid = np.array([14, 28, 62], np.float32); bot = np.array([38, 62, 110], np.float32)
    g = np.where((t < 0.55)[..., None], top + (mid - top) * (t / 0.55)[..., None], mid + (bot - mid) * ((t - 0.55) / 0.45)[..., None])
    # pontilhado ordenado para manter o jeito pixel-art
    dith = BAYER[np.arange(H)[:, None] % 4, np.arange(W)[None, :] % 4][..., None]
    g = g + (dith - 0.5) * 10
    out = np.where(sk[..., None], g, out)
    out = np.clip(out, 0, 255).astype(np.uint8)
    skm = sk.copy()
    if mode == 'night':
        ys, xs = np.where(skm & (np.arange(H)[:, None] < hor * 0.8))
        for _ in range(min(110, len(xs))):
            j = rng.randrange(len(xs))
            out[ys[j], xs[j]] = C(rng.choice(('#ffffff', '#ffe9a8', '#bcd2ff')))
        tmp = out.copy(); disc(tmp, 255, 28, 11, '#f4f0d8'); disc(tmp, 258, 26, 9, '#d8d6c0')
        out = np.where(skm[..., None], tmp, out)
    else:
        tmp = out.copy(); disc(tmp, 70, int(hor) - 8, 14, '#ffc080'); disc(tmp, 70, int(hor) - 8, 10, '#ffe6b8')
        out = np.where(skm[..., None], tmp, out)
    return out


OPEN_STAGES = {4: s_vulcao, 5: s_neve, 6: s_trevas, 7: s_misteriosa, 9: s_floresta, 10: s_acampamento, 11: s_praia}
CLOSED_STAGES = {8: s_cassino, 12: s_caverna}
ORIGINALS = (1, 2, 3)
SUFFIX = {'day': '', 'dusk': '_dusk', 'night': '_night'}


def render(fn, mode, seed):
    global MODE, SNAP
    MODE, SNAP = mode, {}
    im = fn(random.Random(seed))
    grade(im, mode)
    if SNAP.get('vig'):
        vignette(im, SNAP['vig'])
    if mode == 'night':
        night_stars(im, random.Random(seed + 5), 40 if fn in (s_vulcao,) else 70)
    return im


def save(im, out, name, preview):
    big = Image.fromarray(im).resize((W * 4, H * 4), Image.NEAREST)
    big.save(os.path.join(out, name + '.webp'), quality=92, method=6)
    if preview:
        os.makedirs(preview, exist_ok=True)
        big.save(os.path.join(preview, name + '.png'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(os.getcwd(), 'assets', 'legacy-art', 'stages'))
    ap.add_argument('--png-preview', default=None)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    made = []
    for n, fn in OPEN_STAGES.items():
        for mode in ('day', 'dusk', 'night'):
            save(render(fn, mode, 1000 + n), a.out, f'stage{n}{SUFFIX[mode]}', a.png_preview)
            made.append(f'stage{n}{SUFFIX[mode]}')
    for n, fn in CLOSED_STAGES.items():
        save(render(fn, 'day', 1000 + n), a.out, f'stage{n}', a.png_preview)
        made.append(f'stage{n}')
    for n in ORIGINALS:  # dusk/night dos originais (o dia e o proprio arquivo do jogo, nao tocado)
        src = np.array(Image.open(os.path.join(a.out, f'stage{n}.webp')).convert('RGB').resize((W, H), Image.BOX))
        for mode in ('dusk', 'night'):
            save(derive(src, mode, random.Random(2000 + n), blue_rule=(n == 1)), a.out, f'stage{n}{SUFFIX[mode]}', a.png_preview)
            made.append(f'stage{n}{SUFFIX[mode]}')
    print('ok:', ', '.join(made))


if __name__ == '__main__':
    main()
