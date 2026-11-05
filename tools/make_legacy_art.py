#!/usr/bin/env python3
"""Recria a arte "legacy" do Meme Fighter em pixel art, so com codigo.

Gera (tudo deterministico, semente fixa, sem rede, sem IA de imagem):
  assets/legacy-art/screens/{inicio,jogar,versus,opcoes,sair,historia}.png
  assets/legacy-art/stages/{stage1,stage2,stage3}.webp
  assets/legacy-art/effects/escudo.gif

Uso:
  python3 tools/make_legacy_art.py                 # tudo, em assets/legacy-art
  python3 tools/make_legacy_art.py --out /tmp/x    # outra pasta (para testar)
  python3 tools/make_legacy_art.py --only stage1 inicio escudo

Tamanhos (ver docs/AUDIT.md e o codigo):
  * stages: pintados em 640x360 e ampliados 2x (vizinho mais proximo) para
    1280x720 = a arena do BattleScreen (ARENA_W x ARENA_H), sem recorte no
    `cover`. Pes dos lutadores (px da arena): stage_1 y=600, stage_2 y=670,
    stage_3 y=630 => y=300/335/315 na grade nativa. O chao e um plano que
    comeca bem acima disso e vai ate a borda de baixo.
  * telas: 640x360 nativo, ampliado 2x para 1280x720, PNG paletizado.
  * escudo: 64x64 nativo, ampliado 2x para 128x128, GIF com 10 quadros.
Nenhuma tela tem texto, botao ou logo: o menu desenha os botoes por cima.
"""
import argparse
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw

W, H = 640, 360
UP = 2
OUT = (34, 24, 44)  # contorno escuro, o mesmo dos icones/predios do jogo
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def C(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def bayer(w, h):
    return np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w]


def dither_field(t, cols, k=3.0):
    """t: matriz float em [0, n-1] -> RGB. Faixas chapadas com transicao tramada estreita."""
    n = len(cols)
    t = np.clip(t, 0, n - 1 - 1e-6)
    base = np.floor(t)
    f = t - base
    f = np.clip((f - 0.5) * k + 0.5, 0, 1)
    b = bayer(t.shape[1], t.shape[0])
    idx = (base + (f > b)).astype(int)
    idx = np.clip(idx, 0, n - 1)
    pal = np.array(cols, dtype=np.uint8)
    return pal[idx]


class Cv:
    def __init__(self, w=W, h=H, bg=(0, 0, 0)):
        self.w, self.h = w, h
        self.im = Image.new('RGB', (w, h), bg)
        self.d = ImageDraw.Draw(self.im)

    # --- basicos -------------------------------------------------------
    def arr(self):
        return np.array(self.im)

    def put(self, a):
        self.im.paste(Image.fromarray(a.astype(np.uint8)), (0, 0))

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((int(x), int(y)), tuple(c))

    def rect(self, x0, y0, x1, y1, c, outline=None):
        self.d.rectangle([min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)], fill=c, outline=outline)

    def poly(self, pts, fill, outline=None):
        self.d.polygon(pts, fill=fill, outline=outline)

    def ell(self, cx, cy, rx, ry, fill, outline=None):
        self.d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill, outline=outline)

    def line(self, p0, p1, c, w=1):
        self.d.line([p0, p1], fill=c, width=w)

    # --- degrades em passos -------------------------------------------
    def grad_v(self, x0, y0, x1, y1, cols, k=3.0):
        h, w = y1 - y0, x1 - x0
        t = np.tile(np.linspace(0, len(cols) - 1, h)[:, None], (1, w))
        a = self.arr()
        a[y0:y1, x0:x1] = dither_field(t, cols, k)
        self.put(a)

    def grad_h(self, x0, y0, x1, y1, cols, k=3.0):
        h, w = y1 - y0, x1 - x0
        t = np.tile(np.linspace(0, len(cols) - 1, w)[None, :], (h, 1))
        a = self.arr()
        a[y0:y1, x0:x1] = dither_field(t, cols, k)
        self.put(a)

    def radial(self, cx, cy, r, cols, k=3.0, ry=None, mask_rect=None, alpha_only_inside=True):
        """Brilho radial: cols[0] no centro -> cols[-1] na borda (so dentro de r)."""
        ry = ry or r
        yy, xx = np.mgrid[0:self.h, 0:self.w]
        d = np.sqrt(((xx - cx) / r) ** 2 + ((yy - cy) / ry) ** 2)
        inside = d < 1
        t = d * (len(cols) - 1)
        f = dither_field(t, cols, k)
        a = self.arr()
        if mask_rect:
            x0, y0, x1, y1 = mask_rect
            m = np.zeros_like(inside)
            m[y0:y1, x0:x1] = True
            inside &= m
        a[inside] = f[inside]
        self.put(a)

    def paint_mask(self, m, cols, outline=None, split=(0.38, 0.72), jit=0.10):
        """Pinta uma mascara bool com 3 tons (claro/medio/sombra) por altura relativa."""
        a = self.arr()
        ys = np.where(m.any(axis=1))[0]
        if len(ys) == 0:
            return
        h, w = m.shape
        yy = np.arange(h)[:, None] * np.ones((1, w))
        top = np.full(w, h, float)
        bot = np.zeros(w)
        for x in np.where(m.any(axis=0))[0]:
            col = np.where(m[:, x])[0]
            top[x], bot[x] = col[0], col[-1] + 1
        rel = (yy - top[None, :]) / np.maximum(bot - top, 1)[None, :]
        rel = rel + (bayer(w, h) - 0.5) * jit * 2
        light, mid, shade = cols
        out = np.where(rel < split[0], 0, np.where(rel < split[1], 1, 2))
        pal = np.array([light, mid, shade], dtype=np.uint8)
        a[m] = pal[out][m]
        if outline is not None:
            dil = m.copy()
            dil[1:, :] |= m[:-1, :]
            dil[:-1, :] |= m[1:, :]
            dil[:, 1:] |= m[:, :-1]
            dil[:, :-1] |= m[:, 1:]
            a[dil & ~m] = outline
        self.put(a)

    def blob(self, parts, cols, outline=None, split=(0.38, 0.72)):
        yy, xx = np.mgrid[0:self.h, 0:self.w]
        m = np.zeros((self.h, self.w), bool)
        for cx, cy, rx, ry in parts:
            m |= ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
        self.paint_mask(m, cols, outline, split)
        return m

    def scatter_dots(self, rng, n, box, cols, size=(1, 1)):
        x0, y0, x1, y1 = box
        for _ in range(n):
            x, y = rng.randint(x0, x1), rng.randint(y0, y1)
            c = rng.choice(cols)
            self.rect(x, y, x + size[0] - 1, y + size[1] - 1, c)


def ridge_heights(w, seed, lam=(300, 150, 70, 30), wts=(1, .55, .28, .12)):
    r = random.Random(seed)
    x = np.arange(w)
    h = np.zeros(w)
    for l, a in zip(lam, wts):
        ph = r.uniform(0, 6.28)
        h += a * (1 - np.abs(np.sin(2 * np.pi * x / l + ph)))
    h = (h - h.min()) / (h.max() - h.min())
    return h


def ridge(c, base, amp, seed, cols, snow=None, snowline=0.6, power=1.2, lam=None, y_end=None, x0=0, x1=None):
    """Montanhas em camada: cols=(lit, base, shade). snow=(lit, shade) opcional."""
    x1 = x1 or c.w
    kw = {'lam': lam} if lam else {}
    h = ridge_heights(c.w, seed, **kw) ** power
    top = (base - amp * h).astype(int)
    a = c.arr()
    lit, mid, sh = cols
    b = bayer(c.w, c.h)
    for x in range(x0, x1):
        s = h[min(x + 3, c.w - 1)] - h[max(x - 3, 0)]
        for y in range(top[x], (y_end or c.h)):
            depth = y - top[x]
            if s > 0.02:
                col = lit if depth < 5 + 40 * abs(s) * 6 * (1 - h[x]) + 8 else mid
            elif s < -0.02:
                col = sh if depth < 6 + 40 * abs(s) * 6 * (1 - h[x]) + 10 else mid
            else:
                col = mid
            if snow and h[x] > snowline:
                snow_edge = base - amp * (snowline + 0.04 * math.sin(x * 0.7) + 0.05 * (b[y % c.h, x] - 0.5) * 2 + 0.0)
                snow_edge = base - amp * snowline - 3 * math.sin(x * 0.45) - 2 * math.sin(x * 1.3)
                if y < snow_edge:
                    col = snow[0] if s >= -0.02 else snow[1]
            a[y, x] = col
        if 0 <= top[x] < c.h:
            a[top[x], x] = lit if not (snow and h[x] > snowline) else snow[0]
    c.put(a)
    return top


def pine(c, x, base, h, w=None, cols=((30, 84, 64), (46, 128, 76), (96, 180, 96)), trunk=(88, 56, 40), outline=OUT):
    w = w or int(h * 0.6)
    dark, mid, lit = cols
    tiers = 3 if h >= 18 else 2
    c.rect(x - 1, base - max(3, h // 8), x, base, trunk)
    th = h - 3
    for i in range(tiers):
        tb = base - 2 - i * (th // (tiers + 0.6))
        tt = tb - th / (tiers * 0.78)
        tw = w / 2 * (1 - i * 0.24)
        pts = [(x, tt), (x + tw, tb), (x - tw, tb)]
        c.poly(pts, mid, outline)
        # lado claro (esquerdo) e linha de sombra embaixo
        c.poly([(x, tt + 1), (x - tw + 1, tb - 1), (x - 1, tb - 1)], lit)
        c.line((x - int(tw) + 1, int(tb) - 1), (x + int(tw) - 1, int(tb) - 1), dark)


def pine_fill(c, x, base, h, cols=((30, 84, 64), (46, 128, 76), (96, 180, 96))):
    """Pinheiro simples, sem contorno, para fundos."""
    dark, mid, lit = cols
    w = int(h * 0.5)
    for i in range(3):
        tb = base - i * h * 0.26
        tt = base - h * (0.55 + i * 0.26)
        tw = w / 2 * (1 - i * 0.25)
        c.poly([(x, tt), (x + tw, tb), (x - tw, tb)], mid)
        c.poly([(x, tt), (x - tw, tb), (x - 1, tb)], lit)
    c.rect(x, base, x, base + 1, dark)


def cloud(c, x, y, w, cols=((255, 255, 255), (232, 242, 252), (188, 208, 238))):
    s = w / 60.0
    parts = [(x, y, 24 * s, 7 * s), (x - 14 * s, y - 3 * s, 12 * s, 8 * s), (x + 4 * s, y - 7 * s, 15 * s, 10 * s),
             (x + 18 * s, y - 2 * s, 12 * s, 7 * s)]
    c.blob(parts, cols, None, split=(0.35, 0.62))


def leaf_tree(c, x, base, h, canopy, trunk=(96, 62, 42), outline=OUT, wide=1.0):
    th = max(4, int(h * 0.4))
    c.rect(x - 1, base - th, x + 1, base, trunk, outline)
    r = h * 0.38 * wide
    cy = base - th - r * 0.55
    parts = [(x, cy, r, r * 0.9), (x - r * 0.65, cy + r * 0.25, r * 0.65, r * 0.6), (x + r * 0.65, cy + r * 0.25, r * 0.65, r * 0.6),
             (x, cy - r * 0.5, r * 0.7, r * 0.55)]
    c.blob(parts, canopy, outline, split=(0.36, 0.7))


def house(c, x, base, w, h, wall, roof, door=(98, 62, 40), lit=(255, 214, 112), chimney=True, roof_h=None, outline=OUT, stone=False):
    roof_h = roof_h or int(h * 0.55)
    top = base - h
    c.rect(x, top, x + w, base, wall[0], outline)
    c.rect(x + 1, top + 1, x + w // 2, base - 1, wall[0])
    c.rect(x + w // 2 + 1, top + 1, x + w - 1, base - 1, wall[1])
    # sombra do beiral
    c.rect(x + 1, top + 1, x + w - 1, top + 2, wall[2])
    if chimney:
        cxp = x + int(w * 0.72)
        c.rect(cxp, top - roof_h + 2, cxp + 4, top - 1, (140, 120, 112), outline)
    pts = [(x - 3, top), (x + w / 2, top - roof_h), (x + w + 3, top)]
    c.poly(pts, roof[0], outline)
    c.poly([(x - 1, top - 1), (x + w / 2, top - roof_h + 2), (x + w / 2, top - 1)], roof[1])
    for ry in range(top - roof_h + 4, top - 1, 3):
        c.line((x + w // 2 - (ry - (top - roof_h)) * (w / 2 + 3) / roof_h + 2, ry), (x + w // 2 + (ry - (top - roof_h)) * (w / 2 + 3) / roof_h - 2, ry), roof[2])
    # porta e janela
    dw = max(5, w // 5)
    c.rect(x + w // 2 - dw // 2 - 4, base - h // 2 + 2, x + w // 2 + dw // 2 - 4, base, door, outline)
    wx = x + w - max(8, w // 4) - 3
    c.rect(wx, top + h // 4, wx + max(6, w // 5), top + h // 4 + max(6, h // 4), lit, outline)
    c.line((wx + max(6, w // 5) // 2, top + h // 4), (wx + max(6, w // 5) // 2, top + h // 4 + max(6, h // 4)), outline)


def floor_boards(c, y0, y1, row_h, tones, seam_gap, rng, grain=(0, 0, 0), gap=(60, 40, 34), seam=None, depth_tones=None):
    """Chao de tabuas horizontais: faixas com emendas verticais alternadas."""
    seam = seam or gap
    y = y0
    row = 0
    while y < y1:
        rh = row_h
        yb = min(y + rh - 1, y1 - 1)
        tone = tones[row % len(tones)]
        if depth_tones:
            f = (y - y0) / max(1, (y1 - y0))
            tone = depth_tones[min(len(depth_tones) - 1, int(f * len(depth_tones)))][row % len(tones)]
        c.rect(0, y, c.w - 1, yb, tone)
        c.line((0, yb), (c.w - 1, yb), gap)
        c.line((0, y), (c.w - 1, y), tuple(min(255, v + 18) for v in tone))
        off = rng.randint(0, seam_gap)
        sx = -off
        while sx < c.w:
            sx += seam_gap + rng.randint(-8, 8)
            if 0 <= sx < c.w:
                c.line((sx, y), (sx, yb), seam)
                c.px(sx + 2, y + 2, gap)
                c.px(sx - 2, yb - 2, gap)
        # veios
        for _ in range(c.w // 36):
            gx, gy = rng.randint(0, c.w - 8), rng.randint(y + 2, max(y + 2, yb - 2))
            c.line((gx, gy), (gx + rng.randint(3, 8), gy), tuple(max(0, v - 14) for v in tone))
        y += rh
        row += 1


# ===========================================================================
# CENARIOS
# ===========================================================================
def stage1():
    """MONTANHAS: picos nevados, pinheiros, campina e uma trilha de terra (pes em y=300)."""
    c = Cv()
    rng = random.Random(1101)
    c.grad_v(0, 0, W, 250, [C('#5aa8e8'), C('#78bcf0'), C('#9ccef4'), C('#c0e2f8'), C('#e4f4fa')], 2.6)
    # nuvens altas
    for (x, y, w) in [(70, 40, 70), (250, 28, 50), (430, 52, 80), (580, 30, 56), (170, 78, 44)]:
        cloud(c, x, y, w)
    # montanhas distantes e proximas
    ridge(c, 205, 128, 11, (C('#aec2e2'), C('#94aad2'), C('#7a92c0')), snow=((248, 250, 255), (206, 220, 244)), snowline=0.50, power=1.1)
    ridge(c, 238, 112, 23, (C('#6f9a90'), C('#4f8078'), C('#3a6a64')), snow=((240, 248, 252), (186, 208, 230)), snowline=0.74, power=1.0,
          lam=(260, 120, 55, 26))
    # faixa de pinheiros nas encostas
    c.rect(0, 238, W, 252, C('#2f6a52'))
    for x in range(-6, W + 12, 9):
        pine_fill(c, x + rng.randint(-2, 2), 246 + rng.randint(-2, 2), rng.randint(16, 26), cols=((C('#1e5646'), C('#2f7852'), C('#5ca262'))))
    # campina em degradê
    c.grad_v(0, 246, W, 270, [C('#5db25c'), C('#4aa052'), C('#3a8c48')], 3.0)
    # tufos / flores na campina
    for _ in range(90):
        x, y = rng.randint(0, W - 3), rng.randint(250, 266)
        c.rect(x, y, x + 1, y, rng.choice([C('#86d070'), C('#2f7c40'), C('#a8e08a')]))
    for _ in range(26):
        x, y = rng.randint(0, W - 3), rng.randint(252, 266)
        c.px(x, y, rng.choice([C('#ffe45c'), C('#ffffff'), C('#ff9ab0')]))
    # arvores e pinheiros grandes nas bordas (longe dos lutadores)
    for x in (22, 62, 598, 622):
        pine(c, x, 262 + (x % 7), rng.randint(46, 62))
    leaf_tree(c, 104, 266, 40, (C('#7ccc66'), C('#4fa44e'), C('#2f7c3e')))
    leaf_tree(c, 548, 266, 44, (C('#7ccc66'), C('#4fa44e'), C('#2f7c3e')))
    # pedras nas bordas
    for (x, y, w) in [(150, 266, 14), (480, 267, 12), (34, 270, 11)]:
        c.blob([(x, y, w, w * 0.55), (x + w * 0.5, y + 1, w * 0.6, w * 0.4)], ((C('#c8c4bc'), C('#a09c94'), C('#7a766e'))), OUT)
    # --- chao: trilha de terra, plano ate a borda de baixo ----------------
    gy = 266
    c.rect(0, gy - 3, W, gy + 1, C('#3a8c48'))
    # beira com tufos de grama sobre a terra
    c.grad_v(0, gy, W, H, [C('#d6b278'), C('#cfa96c'), C('#c4a066'), C('#b8945c'), C('#a8844f')], 2.4)
    a = c.arr()
    for x in range(W):
        n = int(3 + 2 * math.sin(x * 0.31) + 1.4 * math.sin(x * 0.9 + 1) + rng.randint(0, 1))
        a[gy - 1:gy + n, x] = C('#3f9650') if rng.random() > 0.35 else C('#56ac5c')
        a[gy + n - 1, x] = C('#2e7a40')
    c.put(a)
    # sulcos de carroca (suaves) e pedrinhas
    for yy, dx in ((300, 0), (322, 30)):
        for x in range(0, W, 2):
            if rng.random() > 0.35:
                c.px(x, yy + int(2 * math.sin(x / 60 + dx)), C('#a98650'))
    for _ in range(150):
        x, y = rng.randint(0, W - 4), rng.randint(gy + 8, H - 2)
        k = rng.random()
        if k < 0.45:
            c.rect(x, y, x + 1, y, C('#a58250'))
        elif k < 0.8:
            c.rect(x, y, x + 2, y, C('#e0c488'))
        else:
            c.rect(x, y, x + 1, y + 1, C('#8c6c40'))
            c.px(x, y, C('#b0b0a8'))
    return c.im


def stage2():
    """VILAREJO: casinhas, igreja, cerca e um deque de madeira (pes em y=335)."""
    c = Cv()
    rng = random.Random(1202)
    c.grad_v(0, 0, W, 230, [C('#4aa0e0'), C('#68b8ee'), C('#90d0f4'), C('#bce6f8'), C('#e6f6f4')], 2.6)
    for (x, y, w) in [(90, 36, 76), (300, 56, 56), (500, 34, 84), (600, 80, 48), (200, 90, 40)]:
        cloud(c, x, y, w)
    # colinas ao fundo
    ridge(c, 196, 64, 31, (C('#9cd09a'), C('#7cba84'), C('#62a470')), power=1.0, lam=(380, 190, 90, 40))
    ridge(c, 222, 44, 47, (C('#78c076'), C('#5aa862'), C('#448c52')), power=1.0, lam=(300, 150, 70, 34))
    # vila de fundo (casas, torre da igreja)
    base = 252
    c.rect(0, base - 6, W, 270, C('#58a45a'))
    # igreja (centro-direita, um pouco acima das casas)
    ix = 438
    c.rect(ix, base - 54, ix + 34, base, C('#e8e0d0'), OUT)
    c.rect(ix + 17, base - 54, ix + 33, base - 1, C('#cfc4b2'))
    c.poly([(ix - 4, base - 54), (ix + 17, base - 78), (ix + 38, base - 54)], C('#c85a4a'), OUT)
    c.poly([(ix - 1, base - 55), (ix + 17, base - 76), (ix + 17, base - 55)], C('#e07a62'))
    c.rect(ix + 12, base - 100, ix + 22, base - 66, C('#e8e0d0'), OUT)
    c.poly([(ix + 10, base - 100), (ix + 17, base - 116), (ix + 24, base - 100)], C('#c85a4a'), OUT)
    c.line((ix + 17, base - 116), (ix + 17, base - 124), OUT)
    c.line((ix + 14, base - 121), (ix + 20, base - 121), OUT)
    c.rect(ix + 14, base - 92, ix + 20, base - 82, C('#2a2038'), OUT)
    c.px(ix + 17, base - 87, C('#f4c648'))
    c.rect(ix + 12, base - 30, ix + 22, base, C('#7a4a30'), OUT)
    c.rect(ix + 14, base - 46, ix + 20, base - 36, C('#6aa0e0'), OUT)
    walls = [(C('#e8c898'), C('#cfa878'), C('#b88a60')), (C('#f0e0b8'), C('#d8c498'), C('#bca878')), (C('#d8a888'), C('#bc8a6c'), C('#a07050'))]
    roofs = [(C('#b4503c'), C('#d0705a'), C('#8a3a30')), (C('#5a6aa8'), C('#7a8ac8'), C('#44508c')), (C('#8a5a3c'), C('#aa7850'), C('#6a4430'))]
    spots = [(34, 50, 34), (96, 44, 30), (158, 54, 36), (232, 46, 32), (294, 52, 34), (360, 44, 30), (500, 50, 34), (562, 46, 32)]
    for i, (hx, hh, hw) in enumerate(spots):
        wl, rf = walls[i % 3], roofs[(i * 2 + 1) % 3]
        house(c, hx, base, hw, hh, wl, rf, chimney=(i % 2 == 0))
    # fumacinha de chamine
    for (sx, sy) in [(34 + 24, base - 50 - 20), (232 + 23, base - 46 - 18), (294 + 24, base - 52 - 20)]:
        for k in range(4):
            c.ell(sx + k * 3 + (k % 2), sy - k * 6, 3 + k, 2 + k // 2, (236, 240, 248) if k % 2 == 0 else (214, 224, 238))
    # arvores entre as casas
    for x, h in [(74, 44), (206, 46), (338, 40), (418, 42), (540, 48), (612, 44)]:
        leaf_tree(c, x, base + 2, h, (C('#86d070'), C('#52aa54'), C('#34803f')))
    # cerca branca e grama
    c.grad_v(0, base, W, 276, [C('#6cc060'), C('#52a850'), C('#3e8c46')], 3.0)
    for x in range(2, W, 12):
        c.rect(x, base + 4, x + 3, base + 17, C('#f4f0e4'), OUT)
        c.poly([(x, base + 4), (x + 1.5, base + 1), (x + 3, base + 4)], C('#f4f0e4'), OUT)
    c.line((0, base + 8), (W, base + 8), OUT)
    c.line((0, base + 13), (W, base + 13), OUT)
    c.line((0, base + 9), (W, base + 9), C('#e6dcc6'))
    c.line((0, base + 12), (W, base + 12), C('#e6dcc6'))
    for _ in range(80):
        x, y = rng.randint(0, W - 2), rng.randint(base + 18, 276)
        c.px(x, y, rng.choice([C('#86d070'), C('#2f7c40'), C('#ffe45c'), C('#ffffff')]))
    # --- deque de madeira (plano ate a borda de baixo) ---------------------
    top = 278
    c.rect(0, top - 1, W, top + 5, OUT)
    c.rect(0, top, W, top + 3, C('#6a4630'))  # viga traseira
    c.rect(0, top, W, top, C('#8c6444'))
    deck_y = top + 5
    tones = [(C('#c08850'), C('#b87e46')), (C('#b57a44'), C('#ac723c'))]
    floor_boards(c, deck_y, H, 10, [C('#c28c54'), C('#b88048')], 52, rng, gap=C('#6a4630'), seam=C('#7a5236'),
                 depth_tones=[(C('#c89258'), C('#bc844c')), (C('#be8850'), C('#b27c44')), (C('#b4804a'), C('#a87440'))])
    # sombra da viga sobre as primeiras tabuas (tramada)
    a = c.arr()
    sh = np.zeros((6, W, 3), np.uint8)
    for yy in range(6):
        for xx in range(W):
            if BAYER[yy % 4, xx % 4] * 6 > yy + 1:
                a[deck_y + yy, xx] = np.clip(a[deck_y + yy, xx].astype(int) - 34, 0, 255)
    c.put(a)
    return c.im


def stage3():
    """RIO OUTONAL: folhagem alaranjada, rio, choca na margem e piso de cais (pes em y=315)."""
    c = Cv()
    rng = random.Random(1303)
    c.grad_v(0, 0, W, 214, [C('#7aaedc'), C('#a4c4e0'), C('#e6dcc4'), C('#f4dcb0'), C('#fcdc9c'), C('#fcc880')], 2.4)
    # sol baixo e suave a esquerda do centro-direita
    c.radial(430, 160, 60, [C('#fff6cc'), C('#fdeab0'), C('#f9e0a8'), C('#f8dca4')], 2.0, ry=50, mask_rect=(0, 0, W, 214))
    c.ell(430, 160, 13, 13, C('#fffbe0'))
    for (x, y, w) in [(90, 36, 70), (270, 64, 52), (560, 44, 74)]:
        cloud(c, x, y, w, cols=((C('#fff0dc'), C('#f6d6b4'), C('#e0b0a0'))))
    # colinas de outono
    ridge(c, 200, 70, 51, (C('#d0a070'), C('#b88060'), C('#9c6a56')), power=1.0, lam=(360, 170, 80, 36))
    ridge(c, 214, 46, 63, (C('#c8762c'), C('#a85a28'), C('#8a4424')), power=1.0, lam=(300, 140, 64, 30))
    # bosque da outra margem
    autumn = [((C('#f8c040'), C('#e8982c'), C('#c0701c'))), ((C('#f08a3c'), C('#d86a28'), C('#a84a22'))), ((C('#e0603a'), C('#bc4430'), C('#8a3030'))),
              ((C('#b8c848'), C('#88a43c'), C('#5c7c34')))]
    for x in range(-6, W + 14, 17):
        h = rng.randint(30, 48)
        leaf_tree(c, x + rng.randint(-3, 3), 214 + rng.randint(-1, 2), h, rng.choice(autumn), wide=1.1)
    # choca na margem direita
    hx, hb = 536, 224
    c.rect(hx, hb - 22, hx + 32, hb, C('#b08850'), OUT)
    c.rect(hx + 1, hb - 21, hx + 14, hb - 1, C('#c8a064'))
    for yy in range(hb - 20, hb, 4):
        c.line((hx + 1, yy), (hx + 31, yy), C('#94703c'))
    c.poly([(hx - 5, hb - 20), (hx + 16, hb - 42), (hx + 37, hb - 20)], C('#d8b860'), OUT)
    c.poly([(hx - 2, hb - 21), (hx + 16, hb - 40), (hx + 16, hb - 21)], C('#ecd078'))
    for yy in range(hb - 38, hb - 21, 3):
        c.line((hx + 16 - (yy - (hb - 42)) * 1.2, yy), (hx + 16 + (yy - (hb - 42)) * 1.2, yy), C('#b89440'))
    c.rect(hx + 12, hb - 13, hx + 20, hb, C('#5a3c2a'), OUT)
    c.rect(hx + 24, hb - 16, hx + 29, hb - 10, C('#ffd870'), OUT)
    # margem de areia/grama
    c.grad_v(0, 216, W, 226, [C('#c4a468'), C('#a88c58')], 2.0)
    for x in range(0, W, 3):
        if rng.random() > 0.5:
            c.px(x, 216 + rng.randint(0, 2), C('#d8bc80'))
    # --- rio -------------------------------------------------------------
    wy0, wy1 = 226, 266
    c.grad_v(0, wy0, W, wy1, [C('#e8b878'), C('#94b4c8'), C('#5e9cc8'), C('#3a84bc'), C('#2f70a8')], 2.2)
    # reflexos do bosque (manchas verticais) e ondas
    a = c.arr()
    for x in range(0, W, 6):
        col = rng.choice([C('#d89048'), C('#c06a34'), C('#e8b044')])
        for y in range(wy0 + 1, wy0 + 12):
            if (x + y) % 2 == 0 and rng.random() > 0.2:
                a[y, x:x + 4] = col
    c.put(a)
    for _ in range(95):
        x, y = rng.randint(0, W - 12), rng.randint(wy0 + 4, wy1 - 2)
        wlen = rng.randint(5, 12)
        c.line((x, y), (x + wlen, y), rng.choice([C('#d4ecf8'), C('#a8d0ec'), C('#fff0c8')]))
    # barquinho/vela ao longe
    c.poly([(300, 238), (322, 238), (318, 243), (304, 243)], C('#6a4630'), OUT)
    c.poly([(311, 220), (311, 237), (322, 237)], C('#f8f0e0'), OUT)
    c.line((311, 219), (311, 238), OUT)
    # --- cais: viga de borda + piso de pranchas -------------------------
    top = 268
    c.rect(0, top - 1, W, top + 7, OUT)
    c.rect(0, top, W, top + 5, C('#7a6458'))
    c.line((0, top), (W, top), C('#9c8678'))
    c.rect(0, top + 5, W, top + 5, C('#54443c'))
    deck_y = top + 7
    floor_boards(c, deck_y, H, 12, [C('#a09080'), C('#968676')], 58, rng, gap=C('#5a4a42'), seam=C('#6a584c'),
                 depth_tones=[(C('#a49484'), C('#9a8a7a')), (C('#9a8a7c'), C('#908072')), (C('#908070'), C('#867668'))])
    a = c.arr()
    for yy in range(7):
        for xx in range(W):
            if BAYER[yy % 4, xx % 4] * 7 > yy + 1:
                a[deck_y + yy, xx] = np.clip(a[deck_y + yy, xx].astype(int) - 30, 0, 255)
    c.put(a)
    # postes e cordas nas pontas
    for px_ in (22, 618):
        c.rect(px_ - 5, top - 40, px_ + 5, top + 6, C('#7a5638'), OUT)
        c.rect(px_ - 4, top - 39, px_ - 1, top + 5, C('#9a7048'))
        c.ell(px_, top - 40, 7, 3, C('#8a6440'), OUT)
        c.rect(px_ - 5, top - 26, px_ + 5, top - 24, C('#c8b890'), OUT)
    for k in range(0, 64):
        t = k / 63
        c.px(22 + 8 + int(t * 40), top - 24 + int(10 * math.sin(math.pi * t)), C('#c8b890'))
        c.px(618 - 8 - int(t * 40), top - 24 + int(10 * math.sin(math.pi * t)), C('#c8b890'))
    # folhas caindo (espalhadas pelo cenario e pouco no piso)
    for _ in range(46):
        x, y = rng.randint(0, W - 3), rng.randint(90, 262)
        c.rect(x, y, x + 1, y + 1, rng.choice([C('#f8a830'), C('#e06a28'), C('#d04a30'), C('#f8d050')]))
    for _ in range(26):
        x, y = rng.randint(0, W - 3), rng.randint(deck_y + 6, H - 3)
        c.rect(x, y, x + 2, y + 1, rng.choice([C('#e06a28'), C('#d04a30'), C('#e8a030')]))
    return c.im


# ===========================================================================
# AUXILIARES DE TELAS
# ===========================================================================
def light(c, cx, cy, r, tint, strength=0.5, ry=None, steps=3):
    """Halo de luz em passos tramados: mistura os pixels em direcao a `tint`."""
    ry = ry or r
    a = c.arr().astype(float)
    yy, xx = np.mgrid[0:c.h, 0:c.w]
    d = np.sqrt(((xx - cx) / r) ** 2 + ((yy - cy) / ry) ** 2)
    f = np.clip(1 - d, 0, 1) * steps
    lvl = np.floor(f) + ((f - np.floor(f)) > bayer(c.w, c.h))
    amt = np.clip(lvl / steps, 0, 1) * strength
    a = a + (np.array(tint, float) - a) * amt[..., None]
    c.put(np.clip(a, 0, 255))


def vignette(c, strength=0.45, start=0.62):
    a = c.arr().astype(float)
    yy, xx = np.mgrid[0:c.h, 0:c.w]
    d = np.sqrt(((xx - c.w / 2) / (c.w / 2)) ** 2 + ((yy - c.h / 2) / (c.h / 2)) ** 2) / 1.414
    f = np.clip((d - start) / (1 - start), 0, 1) * 3
    lvl = (np.floor(f) + ((f - np.floor(f)) > bayer(c.w, c.h))) / 3
    a = a * (1 - lvl * strength)[..., None]
    c.put(np.clip(a, 0, 255))


def darken_rect(c, x0, y0, x1, y1, amount):
    a = c.arr().astype(float)
    a[y0:y1, x0:x1] *= (1 - amount)
    c.put(np.clip(a, 0, 255))


def stars(c, rng, n, box, big=4):
    x0, y0, x1, y1 = box
    for i in range(n):
        x, y = rng.randint(x0, x1), rng.randint(y0, y1)
        col = rng.choice([(255, 255, 255), (255, 244, 200), (190, 210, 255)])
        c.px(x, y, col)
        if i < big:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                c.px(x + dx, y + dy, tuple(int(v * 0.62) for v in col))


def value_noise(w, h, cell, seed):
    r = np.random.RandomState(seed)
    g = r.rand(h // cell + 3, w // cell + 3).astype(np.float32)
    im = Image.fromarray((g * 255).astype(np.uint8)).resize(((w // cell + 3) * cell, (h // cell + 3) * cell), Image.BICUBIC)
    return np.array(im)[:h, :w].astype(float) / 255.0


def dilate(m, n=1):
    for _ in range(n):
        d = m.copy()
        d[1:, :] |= m[:-1, :]
        d[:-1, :] |= m[1:, :]
        d[:, 1:] |= m[:, :-1]
        d[:, :-1] |= m[:, 1:]
        m = d
    return m


def erode(m, n=1):
    return ~dilate(~m, n)


def gear_mask(w, h, cx, cy, r_out, r_in, teeth, rot=0.0, windows=0, hub=0.28, ring=0.78, tooth_frac=0.5):
    """Mascara de engrenagem: dentes trapezoidais, anel, raios e furos."""
    big = 4
    im = Image.new('L', (w * big, h * big), 0)
    d = ImageDraw.Draw(im)
    pts = []
    for i in range(teeth):
        a0 = rot + 2 * math.pi * i / teeth
        step = 2 * math.pi / teeth
        t = tooth_frac
        for (aa, rr) in [(0.0, r_in), (step * (0.5 - t / 2 - 0.06), r_in), (step * (0.5 - t / 2 + 0.04), r_out), (step * (0.5 + t / 2 - 0.04), r_out),
                         (step * (0.5 + t / 2 + 0.06), r_in)]:
            pts.append(((cx + math.cos(a0 + aa) * rr) * big, (cy + math.sin(a0 + aa) * rr) * big))
    d.polygon(pts, fill=255)
    if windows:
        rin, rout = r_in * hub * 1.6, r_in * ring
        for i in range(windows):
            a0 = rot + 2 * math.pi * i / windows
            span = 2 * math.pi / windows * 0.58
            pp = []
            for k in range(7):
                aa = a0 - span / 2 + span * k / 6
                pp.append(((cx + math.cos(aa) * rout) * big, (cy + math.sin(aa) * rout) * big))
            for k in range(6, -1, -1):
                aa = a0 - span / 2 + span * k / 6
                pp.append(((cx + math.cos(aa) * rin) * big, (cy + math.sin(aa) * rin) * big))
            d.polygon(pp, fill=0)
    d.ellipse([(cx - r_in * hub * 0.5) * big, (cy - r_in * hub * 0.5) * big, (cx + r_in * hub * 0.5) * big, (cy + r_in * hub * 0.5) * big], fill=0)
    small = im.resize((w, h), Image.BOX)
    return np.array(small) > 127


def draw_gear(c, cx, cy, r_out, teeth, cols, rot=0.0, windows=5, bg_hole=None):
    r_in = r_out * 0.84
    m = gear_mask(c.w, c.h, cx, cy, r_out, r_in, teeth, rot, windows)
    c.paint_mask(m, cols, OUT, split=(0.3, 0.68))
    # cubo
    c.ell(cx, cy, max(2, r_out * 0.12), max(2, r_out * 0.12), cols[2], OUT)
    c.px(cx, cy, cols[0])


def silhouette(c, x, base, h, facing, kind, col, rim):
    """Lutador generico em silhueta, em guarda, virado para `facing` (+1 direita, -1 esquerda).
    kind 'a': robusto, orelha caida e focinho (canino); 'b': esguio, orelhas pontudas e rabo."""
    f = facing
    u = h / 56.0

    def P(dx, dy):
        return (int(round(x + f * dx * u)), int(round(base - dy * u)))

    def limb(p0, p1, p2, wd):
        c.line(p0, p1, col, wd)
        c.line(p1, p2, col, wd)
        c.ell(p1[0], p1[1], wd / 2.0, wd / 2.0, col)

    wl = max(4, int(5.2 * u)) if kind == 'a' else max(3, int(4.2 * u))
    # pernas: de tras esticada, da frente dobrada
    limb(P(-1, 22), P(-8, 11), P(-12, 1), wl)
    limb(P(2, 22), P(10, 13), P(8, 1), wl)
    c.rect(*P(-16, 3), *P(-8, 0), col)
    c.rect(*P(4, 3), *P(13, 0), col)
    # tronco inclinado
    bw = 7.5 if kind == 'a' else 5.5
    c.poly([P(-bw + 1, 25), P(bw - 0.5, 25), P(bw + 3, 40), P(-bw + 4, 41)], col)
    # bracos em guarda
    wa = max(4, int(4.8 * u)) if kind == 'a' else max(3, int(3.8 * u))
    limb(P(2, 38), P(12, 31), P(19, 40), wa)
    c.ell(*P(20.5, 41), 3.4 * u, 3.4 * u, col)
    limb(P(0, 37), P(5, 29), P(11, 35), wa)
    c.ell(*P(12.5, 36), 3.1 * u, 3.1 * u, col)
    # cabeca
    hx, hy = P(6, 47)
    if kind == 'a':
        c.ell(hx, hy, 6.4 * u, 6 * u, col)
        c.rect(*P(8, 48), *P(15, 43), col)                               # focinho
        c.poly([P(-1, 50), P(-4, 40), P(3, 44)], col)                     # orelha caida
        c.poly([P(5, 52), P(6, 59), P(10, 52)], col)                      # orelha em pe
        c.line(P(-6, 26), P(-14, 36), col, max(3, int(3 * u)))             # rabo
    else:
        c.ell(hx, hy, 5.2 * u, 5 * u, col)
        c.poly([P(1, 50), P(1, 60), P(5, 52)], col)
        c.poly([P(7, 52), P(11, 60), P(10, 49)], col)
        c.line(P(-5, 26), P(-13, 22), col, max(2, int(2.4 * u)))
        c.line(P(-13, 22), P(-17, 33), col, max(2, int(2.4 * u)))
        c.line(P(-17, 33), P(-14, 40), col, max(2, int(2.4 * u)))
    # luz de borda no lado voltado para o sol (o centro da tela)
    c.line(P(bw + 3, 40), P(bw - 0.5, 26), rim)
    c.line(P(12, 52), P(11, 47), rim)
    c.line(P(21, 44), P(23, 41), rim)


def palm(c, x, base, h, lean, col, rng):
    pts = []
    for i in range(0, 13):
        t = i / 12
        pts.append((x + lean * t * t * h * 0.5, base - t * h))
    for i in range(len(pts) - 1):
        c.line((int(pts[i][0]), int(pts[i][1])), (int(pts[i + 1][0]), int(pts[i + 1][1])), col, 2)
    tx, ty = pts[-1]
    for ang, ln in [(-175, 18), (-145, 20), (-112, 15), (-68, 15), (-35, 20), (-5, 18), (150, 13), (30, 13)]:
        a = math.radians(ang)
        prev = (tx, ty)
        for k in range(1, 9):
            t = k / 8
            ex = tx + math.cos(a) * ln * t
            ey = ty + math.sin(a) * ln * t * 0.7 + ln * 0.62 * t * t
            c.line((int(prev[0]), int(prev[1])), (int(ex), int(ey)), col, 2 if k < 6 else 1)
            prev = (ex, ey)
    c.ell(tx, ty + 1, 2.5, 2.5, col)


def seagull(c, x, y, col, s=1):
    for i in range(0, 5 * s):
        c.px(x - i, y - i // 2 + (1 if i > 3 * s else 0), col)
        c.px(x + 1 + i, y - i // 2 + (1 if i > 3 * s else 0), col)
    c.px(x, y + 1, col)


# ===========================================================================
# TELAS
# ===========================================================================
def tela_inicio():
    """INICIO: ilha ao entardecer, dois lutadores em silhueta se encarando; centro calmo."""
    c = Cv()
    rng = random.Random(2101)
    hz = 236
    c.grad_v(0, 0, W, hz, [C('#140e38'), C('#1e1450'), C('#31185e'), C('#51206c'), C('#7e2c78'), C('#b04478'), C('#dc6470'), C('#f68c68'), C('#fcb078')], 2.4)
    stars(c, rng, 90, (0, 0, W, 120), big=6)
    # lua fina
    c.ell(560, 56, 9, 9, C('#fff4d0'))
    c.ell(564, 53, 8, 8, C('#2a1658'))
    # nuvens de entardecer (faixas)
    for (x, y, w_, hh) in [(90, 112, 90, 7), (230, 150, 70, 5), (520, 120, 100, 7), (410, 170, 60, 4), (30, 168, 52, 4), (600, 176, 56, 4)]:
        c.blob([(x, y, w_, hh), (x - w_ * 0.3, y - hh * 0.5, w_ * 0.5, hh), (x + w_ * 0.4, y - hh * 0.3, w_ * 0.45, hh * 0.9)],
               ((C('#f8a882'), C('#d0607c'), C('#7c3c7c'))), None, split=(0.3, 0.55))
    # sol afundando no mar
    light(c, 320, hz, 170, C('#ffd890'), 0.8, ry=100, steps=4)
    c.rect(0, hz, W, hz, C('#fcc888'))
    sun = np.zeros((H, W), bool)
    yy, xx = np.mgrid[0:H, 0:W]
    sun = ((xx - 320) ** 2 + (yy - hz) ** 2 <= 26 ** 2) & (yy < hz)
    c.paint_mask(sun, (C('#fffbe6'), C('#fff0b0'), C('#ffe090')), None, split=(0.6, 0.9))
    # mar
    c.grad_v(0, hz + 1, W, H, [C('#e88a70'), C('#c0587a'), C('#8a3e7c'), C('#58306c'), C('#38245c'), C('#241a4c'), C('#160f3a')], 2.2)
    # reflexo do sol (brilhos pequenos e esparsos)
    for i in range(46):
        y = hz + 3 + int((i / 46) ** 1.15 * 110)
        wd = int(3 + (y - hz) * 0.1)
        x = 320 + rng.randint(-wd * 3, wd * 3)
        ln = rng.randint(3, 8)
        col = C('#ffd890') if y < hz + 60 else C('#e8a080')
        c.line((x, y), (x + ln, y), col)
    for _ in range(70):
        x, y = rng.randint(0, W - 10), rng.randint(hz + 4, H - 3)
        c.line((x, y), (x + rng.randint(3, 8), y), rng.choice([C('#7a4486'), C('#54306c'), C('#3a2660')]))
    # ilha distante (centro-direita, pequena, farol)
    c.poly([(400, hz + 1), (418, hz - 14), (440, hz - 10), (462, hz + 1)], C('#3a2060'))
    c.rect(432, hz - 30, 436, hz - 10, C('#6a4a7a'))
    c.rect(431, hz - 34, 437, hz - 30, C('#ffe090'), OUT)
    light(c, 434, hz - 32, 14, C('#ffe090'), 0.5, steps=3)
    # --- penhasco esquerdo (silhueta + lutador) ---------------------------
    DK = C('#160c2c')
    cliff_l = [(0, 150), (26, 168), (50, 196), (76, 204), (118, 214), (150, 236), (170, 262), (210, 290), (205, 360), (0, 360)]
    c.poly(cliff_l, DK)
    # topo da rocha com borda iluminada
    c.line((50, 196), (76, 204), C('#6a3a70'))
    c.line((76, 204), (118, 214), C('#8a4a78'))
    c.line((118, 214), (150, 236), C('#6a3a70'))
    # --- ilha direita ----------------------------------------------------
    isl = [(640, 170), (606, 178), (574, 196), (548, 206), (520, 226), (484, 248), (452, 268), (440, 292), (470, 330), (520, 360), (640, 360)]
    c.poly(isl, DK)
    c.line((574, 196), (548, 206), C('#8a4a78'))
    c.line((548, 206), (520, 226), C('#6a3a70'))
    c.line((606, 178), (574, 196), C('#6a3a70'))
    # palmeiras
    palm(c, 608, 182, 52, -0.9, DK, rng)
    palm(c, 624, 176, 66, 0.6, DK, rng)
    palm(c, 520, 228, 36, -1.0, DK, rng)
    palm(c, 24, 160, 40, 0.8, DK, rng)
    # cabana na ilha com janela acesa
    # lutadores
    silhouette(c, 84, 204, 58, +1, 'a', DK, C('#d87878'))
    silhouette(c, 538, 207, 58, -1, 'b', DK, C('#d87878'))
    # fagulha entre os dois
    for (x, y) in [(300, 150), (340, 140), (322, 170), (310, 120), (352, 176)]:
        pass
    # barquinho no mar, esquerda baixo
    c.poly([(236, 300), (272, 300), (266, 308), (242, 308)], C('#1c1038'))
    c.line((254, 300), (254, 278), C('#1c1038'), 2)
    c.poly([(256, 278), (256, 298), (272, 298)], C('#1c1038'))
    # gaivotas
    for (x, y) in [(238, 70), (262, 84), (210, 92)]:
        seagull(c, x, y, C('#2a1450'))
    # centro: leve escurecida sob a area dos botoes (tramada) + vinheta
    light(c, 320, 160, 190, C('#140e38'), 0.28, ry=130, steps=3)
    vignette(c, 0.35)
    return c.im


def landmass(parts, seed, w=W, h=H, thresh=0.0, noise_amp=0.34):
    yy, xx = np.mgrid[0:h, 0:w]
    f = np.full((h, w), -9.0)
    for cx, cy, rx, ry in parts:
        f = np.maximum(f, 1 - np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2))
    n = value_noise(w, h, 14, seed) * 0.6 + value_noise(w, h, 6, seed + 1) * 0.4
    return (f + (n - 0.5) * noise_amp) > thresh


def tela_jogar():
    """JOGAR: mapa do tesouro / trilha de aventura. Duas ilhas, canal calmo no meio, trilha pontilhada."""
    c = Cv()
    rng = random.Random(2202)
    # mar de mapa
    c.grad_v(0, 0, W, H, [C('#2c78a8'), C('#2a70a0'), C('#26689a'), C('#245f90')], 2.0)
    a = c.arr()
    n = value_noise(W, H, 40, 7)
    dm = n > 0.62
    a[dm] = np.where(bayer(W, H)[dm][:, None] < 0.5, a[dm], np.array(C('#2f82b2'), np.uint8))
    c.put(a)
    A = [(120, 196, 108, 128), (176, 96, 72, 62), (84, 268, 64, 44), (206, 210, 50, 66), (60, 130, 50, 56)]
    B = [(524, 188, 100, 132), (452, 104, 62, 62), (562, 292, 62, 40), (468, 238, 46, 62), (590, 90, 50, 56)]
    land = landmass(A, 11) | landmass(B, 29)
    # agua rasa, praia, grama
    shallow = dilate(land, 7)
    sand = land & ~erode(land, 3)
    inner = erode(land, 3)
    grass2 = erode(land, 11)
    a = c.arr()
    sh_ring = shallow & ~land
    b = bayer(W, H)
    a[sh_ring] = np.array(C('#3c98c4'), np.uint8)
    far = dilate(land, 12) & ~dilate(land, 7)
    a[far & (b < 0.5)] = np.array(C('#3490bc'), np.uint8)
    a[sand] = np.array(C('#ecd8a0'), np.uint8)
    a[inner] = np.array(C('#7cc464'), np.uint8)
    a[grass2] = np.array(C('#5eb054'), np.uint8)
    nn = value_noise(W, H, 18, 91)
    a[grass2 & (nn > 0.58) & (b < 0.55)] = np.array(C('#4a9c4c'), np.uint8)
    a[inner & ~grass2 & (b < 0.3)] = np.array(C('#98d474'), np.uint8)
    # contorno escuro da costa
    coast = dilate(land, 1) & ~land
    a[coast] = np.array(C('#183a5c'), np.uint8)
    c.put(a)
    # ondinhas na agua
    for _ in range(260):
        x, y = rng.randint(2, W - 8), rng.randint(2, H - 3)
        if land[y, x] or shallow[y, x]:
            continue
        col = rng.choice([C('#4e9cc8'), C('#3a88b8'), C('#62acd2')])
        c.px(x, y, col)
        c.px(x + 1, y - 1, col)
        c.px(x + 2, y, col)
        c.px(x + 3, y - 1, col)
        c.px(x + 4, y, col)
    # montanhas
    def mountain(x, base, w_, h_):
        c.poly([(x, base - h_), (x + w_ / 2, base), (x - w_ / 2, base)], C('#a39a92'), OUT)
        c.poly([(x, base - h_ + 1), (x - w_ / 2 + 1, base - 1), (x - 1, base - 1)], C('#c8c0b6'))
        c.poly([(x, base - h_), (x + w_ * 0.16, base - h_ * 0.7), (x - w_ * 0.16, base - h_ * 0.7)], C('#f4f8ff'))
    for (x, y, w_, h_) in [(60, 108, 26, 26), (84, 114, 20, 18), (36, 116, 20, 16), (140, 66, 22, 20),
                           (560, 70, 28, 28), (590, 80, 22, 20), (534, 82, 20, 16), (500, 130, 20, 16)]:
        mountain(x, y, w_, h_)
    # florestas
    for _ in range(190):
        x, y = rng.randint(6, W - 6), rng.randint(6, H - 6)
        if not grass2[y, x]:
            continue
        if (y < 140 and x < 100) or (y < 100 and x > 540):
            continue
        if rng.random() < 0.55:
            c.ell(x, y, 2.6, 2.6, C('#2f7c40'))
            c.px(x - 1, y - 1, C('#58b062'))
        else:
            c.poly([(x, y - 5), (x + 3, y + 1), (x - 3, y + 1)], C('#2a6c48'))
            c.px(x - 1, y - 1, C('#4a9a5e'))
    # lago
    c.ell(228, 244, 14, 8, C('#3a9ac8'), C('#183a5c'))
    c.line((220, 243), (232, 243), C('#8ccce8'))
    # vila (4 casinhas) na ilha direita
    for i, (hx, hy) in enumerate([(430, 188), (450, 200), (470, 186), (448, 174)]):
        wl = [C('#e8c898'), C('#f0e0b8'), C('#d8a888'), C('#e8d0a0')][i]
        c.rect(hx - 5, hy - 5, hx + 5, hy + 2, wl, OUT)
        c.poly([(hx - 7, hy - 5), (hx, hy - 12), (hx + 7, hy - 5)], [C('#b4503c'), C('#5a6aa8'), C('#b4503c'), C('#8a5a3c')][i], OUT)
        c.px(hx, hy, OUT)
    # --- trilha pontilhada ------------------------------------------------
    way = [(98, 278), (112, 252), (128, 262), (158, 232), (126, 196), (158, 160), (140, 122), (178, 96), (214, 62), (260, 40), (320, 30), (380, 40), (426, 56),
           (462, 92), (452, 140), (490, 170), (520, 206), (548, 238)]
    pts = []
    for i in range(len(way) - 1):
        (x0, y0), (x1, y1) = way[max(0, i - 1)], way[i]
        p0, p1, p2, p3 = way[max(0, i - 1)], way[i], way[i + 1], way[min(len(way) - 1, i + 2)]
        for k in range(24):
            t = k / 24
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            pts.append((x, y))
    # distribui pontos a cada ~7px de comprimento
    acc, last, dots = 0.0, pts[0], [pts[0]]
    for p in pts[1:]:
        acc += math.hypot(p[0] - last[0], p[1] - last[1])
        last = p
        if acc >= 7:
            dots.append(p)
            acc = 0
    for (x, y) in dots:
        c.rect(int(x), int(y) + 1, int(x) + 2, int(y) + 3, C('#4a1c20'))
    for (x, y) in dots:
        c.rect(int(x), int(y), int(x) + 2, int(y) + 2, C('#e24a3c'))
        c.px(int(x), int(y), C('#ff8a70'))
    # bandeira de inicio + tenda
    sx, sy = 98, 278
    c.line((sx, sy), (sx, sy - 18), OUT, 2)
    c.poly([(sx + 1, sy - 18), (sx + 13, sy - 14), (sx + 1, sy - 10)], C('#ffd23c'), OUT)
    c.poly([(sx + 12, sy + 6), (sx + 24, sy + 6), (sx + 18, sy - 6)], C('#e8dcc0'), OUT)
    c.rect(sx + 17, sy + 1, sx + 19, sy + 6, C('#6a4630'))
    # X do tesouro
    tx, ty = 548, 238
    for k in range(-6, 7):
        for t in (0, 1, 2):
            c.px(tx + k + t, ty + k + 1, C('#4a1c20'))
            c.px(tx + k + t, ty - k + 1, C('#4a1c20'))
    for k in range(-6, 7):
        for t in (0, 1):
            c.px(tx + k + t, ty + k, C('#f04030'))
            c.px(tx + k + t, ty - k, C('#f04030'))
    # bussola (mar, embaixo ao centro)
    cx, cy = 328, 322
    c.ell(cx, cy, 20, 20, C('#d8c090'), C('#183a5c'))
    c.ell(cx, cy, 15, 15, C('#ecdcae'), C('#8a6a3c'))
    for (dx, dy, col) in [(0, -19, C('#e24a3c')), (0, 19, C('#183a5c')), (-19, 0, C('#183a5c')), (19, 0, C('#183a5c'))]:
        tipx, tipy = cx + dx, cy + dy
        if dx == 0:
            c.poly([(cx - 4, cy), (cx + 4, cy), (tipx, tipy)], col, OUT)
        else:
            c.poly([(cx, cy - 4), (cx, cy + 4), (tipx, tipy)], col, OUT)
    c.ell(cx, cy, 3, 3, C('#ffd23c'), OUT)
    # navio no canal
    c.poly([(300, 238), (334, 238), (326, 248), (308, 248)], C('#7a4a2c'), OUT)
    c.line((317, 238), (317, 212), OUT, 2)
    c.poly([(319, 213), (319, 236), (336, 236)], C('#f8f0e0'), OUT)
    c.poly([(315, 217), (315, 236), (300, 236)], C('#f0e4cc'), OUT)
    # monstro marinho: so uma barbatana, direita baixo
    c.poly([(396, 288), (408, 268), (414, 288)], C('#2a7a6a'), OUT)
    for i in range(3):
        c.line((388 + i * 4, 291), (394 + i * 4, 291), C('#8ccce8'))
    # leve escurecida central e vinheta (calma sob os botoes)
    light(c, 320, 160, 150, C('#1c4a78'), 0.34, ry=110, steps=3)
    vignette(c, 0.42)
    return c.im


def crowd(c, rng, y0, y1, hues_l, hues_r):
    """Arquibancada: fileiras de cabecinhas (3x3) quentes na esquerda, frias na direita."""
    for row, y in enumerate(range(y0, y1, 7)):
        for x in range(2 + (row % 2) * 3, W - 3, 6):
            if rng.random() < 0.12:
                continue
            side = x / W
            pal = hues_l if side < 0.42 else (hues_r if side > 0.58 else [C('#6a5878'), C('#5a4a6c')])
            col = rng.choice(pal)
            c.rect(x, y, x + 2, y + 2, col)
            c.rect(x - 1, y + 3, x + 3, y + 5, tuple(int(v * 0.6) for v in col))
            if rng.random() < 0.06:  # bracinho levantado
                c.rect(x + 3, y - 3, x + 3, y, col)


def tela_versus():
    """VERSUS: arena com dois lados opostos, quente a esquerda e frio a direita; centro neutro e calmo."""
    c = Cv()
    rng = random.Random(2303)
    # parede de fundo com gradiente horizontal quente -> frio
    wall = [C('#6a2028'), C('#58202c'), C('#462034'), C('#34203e'), C('#262046'), C('#1e2650'), C('#1c3060')]
    c.grad_h(0, 0, W, 238, wall, 2.4)
    # tijolos
    a = c.arr()
    for y in range(0, 238, 12):
        a[y, :] = np.clip(a[y, :].astype(int) - 22, 0, 255)
        off = 0 if (y // 12) % 2 == 0 else 14
        for x in range(off, W, 28):
            a[y:y + 12, x] = np.clip(a[y:y + 12, x].astype(int) - 22, 0, 255)
    nz = value_noise(W, H, 10, 5)[:238, :]
    mod = (nz > 0.6) & (bayer(W, 238) < 0.5)
    a[:238][mod] = np.clip(a[:238][mod].astype(int) + 10, 0, 255)
    c.put(a)
    # arquibancada (faixa superior) escurecida
    c.rect(0, 20, W, 124, C('#160c1c'))
    c.grad_h(0, 20, W, 124, [C('#28101c'), C('#1c1024'), C('#141028'), C('#101830')], 2.4)
    crowd(c, rng, 28, 122, [C('#e8803c'), C('#f0b040'), C('#d8503c'), C('#f0d0a0'), C('#c06838')], [C('#58a0f0'), C('#80d0f0'), C('#4868d8'), C('#a8c8f8'), C('#40b0c0')])
    # guarda-corpo e arcos
    c.rect(0, 124, W, 130, C('#3a2a3c'), OUT)
    for x in range(0, W, 64):
        c.rect(x, 124, x + 3, 160, C('#4a3a4c'), OUT)
    for x0 in range(32, W, 64):
        c.rect(x0 - 24, 150, x0 + 24, 238, C('#10081a'), OUT)
        c.ell(x0, 150, 24, 14, C('#10081a'), OUT)
        c.rect(x0 - 24, 150, x0 + 24, 236, C('#10081a'))
        c.ell(x0, 150, 23, 13, C('#10081a'))
    # faixa de topo (cornija)
    c.rect(0, 0, W, 18, C('#241428'), OUT)
    c.grad_h(0, 1, W, 17, [C('#7a2c30'), C('#5a2438'), C('#3a2a50'), C('#2c3c70'), C('#3a5c98')], 2.2)
    for x in range(6, W, 20):
        c.rect(x, 5, x + 8, 12, tuple(int(v * 0.75) for v in c.im.getpixel((x, 8))))
    # bandeiras penduradas (sem texto)
    def banner(x, col, light_col, dark):
        c.rect(x - 1, 18, x + 24, 21, C('#2a1c20'), OUT)
        c.poly([(x, 21), (x + 23, 21), (x + 23, 66), (x + 12, 58), (x, 66)], col, OUT)
        c.poly([(x + 3, 24), (x + 20, 24), (x + 20, 54), (x + 12, 48), (x + 3, 54)], dark)
        c.poly([(x + 12, 26), (x + 17, 36), (x + 12, 46), (x + 7, 36)], light_col, OUT)
    banner(112, C('#d83c30'), C('#ffd23c'), C('#9a2420'))
    banner(504, C('#2c68d8'), C('#9ae8ff'), C('#1c3c9a'))
    # tochas nas paredes: laranja a esquerda, ciano a direita
    def torch(x, y, flame, core, glow):
        c.rect(x - 2, y + 6, x + 2, y + 30, C('#5a3a28'), OUT)
        c.rect(x - 5, y + 2, x + 5, y + 8, C('#3a2a30'), OUT)
        c.poly([(x - 4, y + 2), (x, y - 14), (x + 4, y + 2)], flame, OUT)
        c.poly([(x - 2, y + 1), (x, y - 8), (x + 2, y + 1)], core)
        light(c, x, y - 4, 48, glow, 0.45, steps=3)
    torch(40, 168, C('#f07a2c'), C('#ffe070'), C('#ff9a40'))
    torch(600, 168, C('#34b0e8'), C('#d8f8ff'), C('#60d0ff'))
    torch(212, 168, C('#f07a2c'), C('#ffe070'), C('#ff9a40'))
    torch(428, 168, C('#34b0e8'), C('#d8f8ff'), C('#60d0ff'))
    # chao da arena: areia que vai de quente a fria
    c.grad_v(0, 238, W, H, [C('#7a6860'), C('#6a5a58'), C('#5a4c50'), C('#4a4048')], 2.4)
    floor_h = [C('#c88a58'), C('#b8845e'), C('#a07c68'), C('#8a7c86'), C('#6e80a0'), C('#5e84b4'), C('#5a8cc4')]
    yy, xx = np.mgrid[238:H, 0:W]
    t = (xx / (W - 1.0)) * (len(floor_h) - 1)
    fl = dither_field(t.astype(float), floor_h, 2.4).astype(float)
    v = 1 - np.clip((yy - 238) / 122.0, 0, 1) * 0.0
    shade = np.array([1.0, 0.94, 0.88, 0.84])
    band = np.minimum(((yy - 238) / 31).astype(int), 3)
    fl = fl * shade[band][..., None] * 0.92
    a = c.arr()
    a[238:H] = np.clip(fl, 0, 255).astype(np.uint8)
    c.put(a)
    # anel/ellipse central e linhas
    for (rx, ry, col) in [(300, 50, C('#ffffff')), (214, 34, C('#e8e4f0'))]:
        pass
    a = c.arr().astype(float)
    yy2, xx2 = np.mgrid[0:H, 0:W]
    e = np.sqrt(((xx2 - 320) / 262.0) ** 2 + ((yy2 - 312) / 40.0) ** 2)
    ring = (np.abs(e - 1.0) < 0.035) | (np.abs(e - 0.62) < 0.05)
    a[ring] = a[ring] * 0.72 + np.array([232, 224, 240]) * 0.28
    c.put(a)
    c.rect(318, 240, 321, H - 1, C('#e8e4f0'))
    c.rect(318, 240, 318, H - 1, C('#fffaff'))
    # areia: grao
    for _ in range(280):
        x, y = rng.randint(0, W - 3), rng.randint(244, H - 2)
        base_col = c.im.getpixel((x, y))
        k = rng.choice([-18, 14])
        c.rect(x, y, x + rng.randint(0, 2), y, tuple(int(np.clip(v + k, 0, 255)) for v in base_col))
    # base da parede com sombra
    c.rect(0, 236, W, 240, C('#1c1020'), OUT)
    # cones de luz (holofotes) sobre a arena
    def cone(x0, tint):
        a = c.arr().astype(float)
        yy3, xx3 = np.mgrid[0:H, 0:W]
        top, spread = 22, 120
        wcone = (yy3 - top) * 0.34 + 8
        m = (np.abs(xx3 - x0 - (yy3 - top) * (0.0)) < wcone) & (yy3 > top) & (yy3 < H)
        thr = bayer(W, H)
        m &= thr < 0.22
        a[m] = a[m] * 0.8 + np.array(tint) * 0.2
        c.put(a)
    cone(150, (255, 190, 120))
    cone(490, (150, 210, 255))
    # raio de choque no centro, bem discreto (parte baixa, abaixo dos botoes)
    zig = [(320, 244), (312, 262), (326, 276), (314, 294), (326, 312), (316, 330), (322, 346)]
    for (p0, p1) in zip(zig[:-1], zig[1:]):
        c.line(p0, p1, C('#fff4b8'), 2)
    # luz forte dos dois lados no chao
    light(c, 60, 300, 120, C('#ffb060'), 0.18, ry=50, steps=3)
    light(c, 580, 300, 120, C('#60b8ff'), 0.18, ry=50, steps=3)
    light(c, 320, 150, 170, C('#0c0818'), 0.25, ry=110, steps=3)
    vignette(c, 0.4)
    return c.im


def tela_opcoes():
    """OPCOES: oficina com engrenagens, painel de controle e ferramentas. Centro calmo (parede de painel perfurado)."""
    c = Cv()
    rng = random.Random(2404)
    c.grad_v(0, 0, W, 268, [C('#20424c'), C('#1c3c46'), C('#183640'), C('#152f38')], 2.2)
    # painel perfurado (pegboard)
    a = c.arr()
    for y in range(6, 268, 10):
        for x in range(6, W, 10):
            a[y, x] = np.clip(a[y, x].astype(int) - 34, 0, 255)
            a[y + 1, x + 1] = np.clip(a[y + 1, x + 1].astype(int) + 12, 0, 255)
    c.put(a)
    # tabuas verticais da parede (leves) e moldura do teto
    for x in range(0, W, 128):
        c.line((x, 0), (x, 268), C('#102830'))
        c.line((x + 1, 0), (x + 1, 268), C('#28505c'))
    c.rect(0, 0, W, 10, C('#2a1c20'), OUT)
    c.rect(0, 2, W, 3, C('#5a3c34'))
    # tubulacao horizontal com juntas e valvulas
    c.rect(0, 196, W, 205, C('#6a7a88'), OUT)
    c.rect(0, 198, W, 199, C('#a8b8c8'))
    c.rect(0, 203, W, 204, C('#46525e'))
    for x in (60, 190, 330, 470, 600):
        c.rect(x - 4, 193, x + 4, 208, C('#8898a8'), OUT)
        c.rect(x - 3, 195, x - 2, 206, C('#c8d4e0'))
    for (x, col) in [(190, C('#e24a3c')), (470, C('#e24a3c'))]:
        c.rect(x - 1, 180, x + 1, 193, C('#4a5460'), OUT)
        c.ell(x, 178, 8, 4, col, OUT)
        c.line((x - 5, 177), (x + 5, 177), tuple(min(255, v + 40) for v in col))
    # engrenagens de laiton
    brass = (C('#f8e07a'), C('#e0a830'), C('#a8681c'))
    steel = (C('#d4dce8'), C('#98a8bc'), C('#5e6e84'))
    copper = (C('#f4b080'), C('#d07848'), C('#8c4430'))
    draw_gear(c, 72, 92, 52, 14, brass, rot=0.2, windows=5)
    draw_gear(c, 144, 166, 32, 10, steel, rot=0.1, windows=4)
    draw_gear(c, 28, 168, 26, 9, copper, rot=0.3, windows=4)
    draw_gear(c, 566, 84, 56, 14, steel, rot=0.0, windows=6)
    draw_gear(c, 618, 164, 34, 10, brass, rot=0.25, windows=4)
    draw_gear(c, 506, 158, 28, 9, copper, rot=0.1, windows=4)
    # ferramentas penduradas no painel (esquerda e direita)
    def wrench(x, y, ang, ln, col=(C('#d4dce8'), C('#98a8bc'))):
        dx, dy = math.cos(ang), math.sin(ang)
        x2, y2 = x + dx * ln, y + dy * ln
        c.line((int(x), int(y)), (int(x2), int(y2)), OUT, 6)
        c.line((int(x), int(y)), (int(x2), int(y2)), col[1], 4)
        c.line((int(x - dy * 0), int(y)), (int(x2), int(y2)), col[1], 4)
        c.ell(x, y, 8, 8, OUT)
        c.ell(x, y, 6, 6, col[1])
        c.poly([(x - 2, y - 7), (x + 2, y - 7), (x, y)], C('#152f38'))
        c.line((int(x + dx * 6), int(y + dy * 6)), (int(x2 - dx * 2), int(y2 - dy * 2)), col[0])
    wrench(206, 36, 1.1, 54)
    wrench(432, 40, 1.9, 50, (C('#f4b080'), C('#d07848')))
    # martelo
    c.line((236, 70), (262, 130), OUT, 6)
    c.line((236, 70), (262, 130), C('#a0703c'), 4)
    c.rect(222, 54, 252, 70, C('#7a8898'), OUT)
    c.rect(224, 56, 250, 60, C('#c0ccd8'))
    # luminaria pendurada (direita do centro)
    c.line((392, 10), (392, 40), OUT, 2)
    c.poly([(376, 62), (408, 62), (400, 42), (384, 42)], C('#e0a830'), OUT)
    c.rect(378, 62, 406, 64, C('#fff0a0'))
    light(c, 392, 70, 90, C('#ffe9a0'), 0.4, ry=70, steps=3)
    # bancada
    top = 262
    c.rect(0, top, W, top + 8, C('#7a4e30'), OUT)
    c.rect(0, top + 1, W, top + 2, C('#b07c4c'))
    c.grad_v(0, top + 9, W, H, [C('#5a3a28'), C('#4a2e22'), C('#3a241c')], 2.4)
    for x in range(0, W, 96):
        c.line((x, top + 9), (x, H), C('#2a1a14'))
    for x in range(0, W, 34):
        c.px(x + 5, top + 14, C('#2a1a14'))
    # painel de controle (esquerda sobre a bancada)
    px0, py0 = 20, 204
    c.rect(px0, py0, px0 + 110, top, C('#7a8898'), OUT)
    c.rect(px0 + 2, py0 + 2, px0 + 108, top - 2, C('#5a6878'))
    c.rect(px0 + 2, py0 + 2, px0 + 108, py0 + 3, C('#a0b0c0'))
    for i, (col, ck) in enumerate([(C('#58e068'), 1), (C('#ffc83c'), 1), (C('#e24a3c'), 0)]):
        lx = px0 + 12 + i * 14
        c.ell(lx, py0 + 12, 4, 4, col if ck else tuple(int(v * 0.45) for v in col), OUT)
        if ck:
            c.px(lx - 1, py0 + 11, (255, 255, 255))
    for i in range(3):  # sliders
        sx = px0 + 14 + i * 20
        c.rect(sx, py0 + 24, sx + 3, py0 + 54, C('#1c2430'), OUT)
        ky = py0 + 28 + (i * 11) % 22
        c.rect(sx - 3, ky, sx + 6, ky + 6, C('#e0a830'), OUT)
        c.line((sx - 2, ky + 1), (sx + 5, ky + 1), C('#fff0a0'))
    for (dx, dy, r) in [(px0 + 84, py0 + 16, 10), (px0 + 90, py0 + 42, 12)]:  # mostradores
        c.ell(dx, dy, r, r, C('#e8ecf0'), OUT)
        c.ell(dx, dy, r - 3, r - 3, C('#1c2430'))
        c.line((dx, dy), (dx + int(r * 0.6), dy - int(r * 0.4)), C('#ff6a4c'), 1)
        c.px(dx, dy, C('#ffffff'))
    # caixa de ferramentas aberta (direita)
    bx0 = 500
    c.rect(bx0, 236, bx0 + 80, top, C('#c83c34'), OUT)
    c.rect(bx0 + 2, 238, bx0 + 78, 242, C('#f06858'))
    c.rect(bx0 + 2, 250, bx0 + 78, top - 2, C('#9a2824'))
    c.rect(bx0 + 34, 230, bx0 + 46, 237, C('#8898a8'), OUT)
    for i, col in enumerate([C('#e8e4d4'), C('#98a8bc'), C('#d07848')]):
        c.line((bx0 + 10 + i * 24, 236), (bx0 + 16 + i * 24, 214), OUT, 5)
        c.line((bx0 + 10 + i * 24, 236), (bx0 + 16 + i * 24, 214), col, 3)
        c.ell(bx0 + 16 + i * 24, 212, 5, 4, col, OUT)
    # frasco de parafusos e porcas
    c.rect(450, 228, 472, top, C('#9ad4e8'), OUT)
    c.rect(452, 236, 470, top - 2, C('#58a0b8'))
    for _ in range(18):
        x, y = rng.randint(453, 469), rng.randint(240, top - 3)
        c.rect(x, y, x + 2, y + 1, rng.choice([C('#e0a830'), C('#d4dce8'), C('#d07848')]))
    c.rect(448, 224, 474, 229, C('#a0703c'), OUT)
    # parafusos e porcas soltos na bancada
    for (x, y) in [(300, 270), (340, 274), (370, 268), (264, 276)]:
        c.rect(x, y, x + 6, y + 3, C('#98a8bc'), OUT)
        c.rect(x + 7, y - 1, x + 9, y + 4, C('#d4dce8'), OUT)
    # centro calmo: escurece levemente sob os botoes
    light(c, 320, 130, 190, C('#0c1c24'), 0.34, ry=130, steps=3)
    vignette(c, 0.4)
    return c.im


def tela_sair():
    """SAIR: cais ao por do sol e uma porta aberta no fim do pier, luz saindo por ela."""
    c = Cv()
    rng = random.Random(2505)
    hz = 214
    c.grad_v(0, 0, W, hz, [C('#3a1850'), C('#5c2060'), C('#8c2c64'), C('#bc3c5c'), C('#e0584c'), C('#f27a3c'), C('#fa9c44'), C('#fcc062'), C('#fee08a')], 2.3)
    stars(c, rng, 40, (0, 0, W, 40), big=2)
    # nuvens longas iluminadas por baixo
    for (x, y, w_, hh) in [(110, 70, 80, 7), (260, 104, 90, 6), (470, 60, 100, 8), (580, 112, 70, 5), (60, 140, 60, 4), (400, 140, 60, 4)]:
        c.blob([(x, y, w_, hh), (x - w_ * 0.35, y + hh * 0.2, w_ * 0.5, hh * 0.9), (x + w_ * 0.4, y - hh * 0.2, w_ * 0.5, hh)],
               ((C('#3a1a50'), C('#7a2c60'), C('#f0784c'))), None, split=(0.42, 0.7))
    # sol (a esquerda do centro, grande)
    sx0 = 186
    light(c, sx0, hz, 190, C('#fff0a8'), 0.85, ry=120, steps=4)
    yy, xx = np.mgrid[0:H, 0:W]
    sun = ((xx - sx0) ** 2 + (yy - hz) ** 2 <= 34 ** 2) & (yy < hz)
    c.paint_mask(sun, (C('#fffbe6'), C('#fff0b0'), C('#ffd880')), None, split=(0.6, 0.9))
    # colinas distantes
    ridge(c, hz + 1, 26, 77, (C('#6a2c58'), C('#4c2050'), C('#38184a')), power=1.0, x0=0, lam=(260, 120, 60, 30), y_end=hz + 2)
    # mar
    c.grad_v(0, hz, W, H, [C('#f08a50'), C('#d0584c'), C('#9a3c64'), C('#5e2c62'), C('#3c2058'), C('#281a48')], 2.2)
    for i in range(54):
        y = hz + 3 + int((i / 54) ** 1.2 * 120)
        wd = int(4 + (y - hz) * 0.12)
        x = sx0 + rng.randint(-wd * 3, wd * 3)
        c.line((x, y), (x + rng.randint(3, 9), y), C('#ffd890') if y < hz + 55 else C('#f0a070'))
    for _ in range(80):
        x, y = rng.randint(0, W - 10), rng.randint(hz + 4, H - 3)
        c.line((x, y), (x + rng.randint(3, 9), y), rng.choice([C('#7a3c6c'), C('#52306c'), C('#42285c')]))
    # gaivotas
    for (x, y) in [(300, 60), (330, 76), (270, 80), (360, 52)]:
        seagull(c, x, y, C('#34163e'))
    # --- pier de madeira (lado esquerdo ate o meio-direita) ---------------
    dk, mid, hi = C('#3a2030'), C('#5e3a38'), C('#8a5a44')
    deck_t, deck_b = 292, 304
    # estacas na agua (com reflexo)
    for x in range(16, 520, 46):
        c.rect(x, deck_b, x + 6, deck_b + 36, dk, OUT)
        c.rect(x + 1, deck_b, x + 2, deck_b + 34, mid)
        c.rect(x + 1, deck_b + 36, x + 5, deck_b + 40, C('#4a2c4c'))
    # travessas
    for x in range(40, 520, 92):
        c.rect(x - 4, deck_b + 12, x + 52, deck_b + 15, dk, OUT)
    # tabuas
    c.rect(0, deck_t, 536, deck_b, mid, OUT)
    c.rect(1, deck_t + 1, 535, deck_t + 2, hi)
    for x in range(0, 536, 18):
        c.line((x, deck_t + 3), (x, deck_b - 1), dk)
    c.line((0, deck_b - 3), (536, deck_b - 3), dk)
    # corrimao e lampioes
    for x in range(10, 470, 46):
        c.rect(x, deck_t - 26, x + 3, deck_t, dk, OUT)
    c.rect(4, deck_t - 24, 470, deck_t - 21, dk, OUT)
    c.rect(4, deck_t - 24, 470, deck_t - 23, hi)
    for x in (148, 332):
        c.rect(x, deck_t - 54, x + 3, deck_t - 24, dk, OUT)
        c.line((x + 3, deck_t - 54), (x + 12, deck_t - 54), OUT, 2)
        c.rect(x + 8, deck_t - 52, x + 14, deck_t - 44, C('#ffd870'), OUT)
        light(c, x + 11, deck_t - 48, 36, C('#ffd070'), 0.5, steps=3)
    # barquinho atracado
    c.poly([(48, 328), (130, 328), (120, 344), (60, 344)], C('#7a3c34'), OUT)
    c.rect(50, 326, 128, 329, C('#c8a060'), OUT)
    c.line((88, 326), (88, 292), OUT, 2)
    c.poly([(90, 294), (90, 322), (118, 322)], C('#f4e8d0'), OUT)
    c.line((91, 298), (112, 321), C('#d8c4a4'))
    # corda do barco ao pier
    for k in range(0, 20):
        t = k / 19
        c.px(int(70 + t * 20), int(326 - t * 22 + 4 * math.sin(math.pi * t)), C('#d8c090'))
    # porta aberta no fim do pier, luz saindo
    dx0, dy0, dw, dh = 536, 224, 44, 72
    # degraus / base
    c.rect(dx0 - 8, 292, dx0 + dw + 8, 304, mid, OUT)
    c.rect(dx0 - 8, 292, dx0 + dw + 8, 293, hi)
    c.rect(dx0 - 14, 298, dx0 + dw + 14, 306, C('#5a3a40'), OUT)
    # interior luminoso (gradiente em passos) e raios de luz tramados no chao
    c.rect(dx0, dy0, dx0 + dw, dy0 + dh, C('#2a1830'))
    c.grad_v(dx0 + 3, dy0 + 3, dx0 + dw - 2, dy0 + dh, [C('#fff6c8'), C('#ffe48a'), C('#ffcc60'), C('#ffe48a')], 2.0)
    # moldura (arco)
    c.rect(dx0 - 5, dy0 - 6, dx0 + dw + 5, dy0 + dh, C('#6a3a2c'), OUT)
    c.rect(dx0 - 3, dy0 - 4, dx0 + dw + 3, dy0 - 2, C('#9a5a40'))
    c.rect(dx0 + 3, dy0 + 3, dx0 + dw - 3, dy0 + dh, C('#fff0b0'))
    c.grad_v(dx0 + 3, dy0 + 3, dx0 + dw - 2, dy0 + dh, [C('#fff6c8'), C('#ffe48a'), C('#ffcc60'), C('#ffe48a')], 2.0)
    # silhueta de caminho dentro da luz (horizonte)
    c.rect(dx0 + 3, dy0 + 46, dx0 + dw - 3, dy0 + dh, C('#f0a850'))
    c.line((dx0 + 3, dy0 + 46), (dx0 + dw - 3, dy0 + 46), C('#fff6c8'))
    # folha da porta aberta (em perspectiva) a esquerda
    c.poly([(dx0 + 3, dy0 + 3), (dx0 - 20, dy0 + 10), (dx0 - 20, dy0 + dh - 4), (dx0 + 3, dy0 + dh)], C('#8a5236'), OUT)
    c.poly([(dx0 + 1, dy0 + 7), (dx0 - 16, dy0 + 13), (dx0 - 16, dy0 + 34), (dx0 + 1, dy0 + 30)], C('#a8683c'))
    c.poly([(dx0 + 1, dy0 + 40), (dx0 - 16, dy0 + 38), (dx0 - 16, dy0 + 58), (dx0 + 1, dy0 + 60)], C('#a8683c'))
    c.ell(dx0 - 14, dy0 + 38, 2, 2, C('#ffd23c'), OUT)
    light(c, dx0 + dw // 2, dy0 + 36, 70, C('#ffe48a'), 0.35, ry=60, steps=3)
    # brilhos: feixe de luz no pier (tramado)
    a = c.arr().astype(float)
    yy2, xx2 = np.mgrid[0:H, 0:W]
    beam = (xx2 > dx0 - 90) & (xx2 < dx0 + 10) & (yy2 > 292) & (yy2 < 304) & (bayer(W, H) < 0.35)
    a[beam] = a[beam] * 0.5 + np.array([255, 230, 150]) * 0.5
    c.put(a)
    # centro calmo
    light(c, 320, 130, 200, C('#2a1030'), 0.3, ry=110, steps=3)
    vignette(c, 0.38)
    return c.im


def tela_historia():
    """HISTORIA: escrivaninha a noite, livro aberto sob a luz de vela, janela em arco com ceu estrelado."""
    c = Cv()
    rng = random.Random(2606)
    # parede de pedra escura
    c.grad_v(0, 0, W, 262, [C('#2a2440'), C('#262038'), C('#201a30'), C('#1a1528')], 2.2)
    a = c.arr()
    for y in range(0, 262, 14):
        a[y, :] = np.clip(a[y, :].astype(int) - 14, 0, 255)
        off = 0 if (y // 14) % 2 == 0 else 20
        for x in range(off, W, 40):
            a[y:y + 14, x] = np.clip(a[y:y + 14, x].astype(int) - 14, 0, 255)
    nz = value_noise(W, H, 9, 9)[:262, :]
    m = (nz > 0.62) & (bayer(W, 262) < 0.5)
    a[:262][m] = np.clip(a[:262][m].astype(int) + 9, 0, 255)
    c.put(a)
    # janela em arco (centro)
    wx0, wx1, wy_top, wy_bot = 252, 388, 36, 226
    wcx = (wx0 + wx1) // 2
    ar = (wx1 - wx0) // 2
    frame = C('#5a4a5c')
    c.rect(wx0 - 8, wy_top + ar - 4, wx1 + 8, wy_bot + 6, frame, OUT)
    c.ell(wcx, wy_top + ar, ar + 8, ar + 8, frame, OUT)
    c.rect(wx0 - 8, wy_top + ar, wx1 + 8, wy_bot + 6, frame)
    # vidro
    c.rect(wx0, wy_top + ar, wx1, wy_bot, C('#0e1234'))
    c.ell(wcx, wy_top + ar, ar, ar, C('#0e1234'))
    # ceu noturno dentro da janela
    sky = Cv()
    sky.grad_v(0, 0, W, H, [C('#0a0c2c'), C('#10163e'), C('#18204e'), C('#222c60'), C('#2e3a70')], 2.2)
    srng = random.Random(77)
    stars(sky, srng, 200, (wx0, wy_top, wx1, wy_bot - 40), big=10)
    sky.ell(350, 84, 14, 14, C('#fff4d0'))
    sky.ell(356, 80, 12, 12, C('#141a46'))
    # castelo e colina ao longe
    sky.poly([(wx0 - 2, wy_bot), (wx0 + 20, wy_bot - 30), (wx0 + 60, wy_bot - 40), (wx0 + 100, wy_bot - 26), (wx1 + 2, wy_bot - 34), (wx1 + 2, wy_bot)], C('#0a0c20'))
    for (tx, th, tw) in [(wx0 + 54, 32, 8), (wx0 + 66, 24, 10), (wx0 + 82, 36, 8)]:
        sky.rect(tx, wy_bot - 40 - th + 8, tx + tw, wy_bot - 30, C('#0a0c20'))
        sky.poly([(tx - 1, wy_bot - 40 - th + 9), (tx + tw / 2, wy_bot - 40 - th - 4), (tx + tw + 1, wy_bot - 40 - th + 9)], C('#0a0c20'))
    for (tx, ty) in [(wx0 + 57, wy_bot - 56), (wx0 + 71, wy_bot - 46), (wx0 + 85, wy_bot - 60), (wx0 + 87, wy_bot - 52)]:
        sky.rect(tx, ty, tx + 1, ty + 2, C('#ffd870'))
    glass = sky.arr()
    gm = np.zeros((H, W), bool)
    gm[wy_top + ar:wy_bot + 1, wx0:wx1 + 1] = True
    yy, xx = np.mgrid[0:H, 0:W]
    gm |= ((xx - wcx) ** 2 + (yy - (wy_top + ar)) ** 2 <= ar ** 2) & (yy <= wy_top + ar)
    arr = c.arr()
    arr[gm] = glass[gm]
    c.put(arr)
    # caixilho
    c.line((wcx, wy_top), (wcx, wy_bot), frame, 4)
    c.line((wcx, wy_top), (wcx, wy_bot), OUT, 1)
    for yy_ in (wy_top + ar, wy_top + ar + 60):
        c.rect(wx0, yy_, wx1, yy_ + 3, frame, OUT)
    c.rect(wx0 - 12, wy_bot + 4, wx1 + 12, wy_bot + 14, C('#6a5a6c'), OUT)
    c.rect(wx0 - 12, wy_bot + 4, wx1 + 12, wy_bot + 5, C('#9a8a9c'))
    # estantes (esquerda e direita) com livros
    def shelf(x0, x1, ytop, ybot, rows):
        c.rect(x0, ytop, x1, ybot, C('#4a2e24'), OUT)
        c.rect(x0 + 3, ytop + 3, x1 - 3, ybot - 3, C('#241420'))
        rh = (ybot - ytop - 6) // rows
        spines = [C('#c83c34'), C('#2c68d8'), C('#e0a830'), C('#58a050'), C('#8a4ab8'), C('#e07a3c'), C('#3aa0a8'), C('#d8d0b8')]
        for r in range(rows):
            yb = ytop + 3 + (r + 1) * rh
            x = x0 + 4
            while x < x1 - 8:
                bw = rng.randint(3, 6)
                bh = rng.randint(rh - 14, rh - 4)
                col = rng.choice(spines)
                if rng.random() < 0.1:
                    x += rng.randint(4, 8)
                    continue
                c.rect(x, yb - bh, x + bw, yb - 1, col, OUT)
                c.rect(x + 1, yb - bh + 1, x + 1, yb - 2, tuple(min(255, v + 40) for v in col))
                c.line((x + 1, yb - bh + 4), (x + bw - 1, yb - bh + 4), tuple(int(v * 0.6) for v in col))
                x += bw + 1
            c.rect(x0 + 3, yb, x1 - 3, yb + 2, C('#6a4a38'), OUT)
    shelf(24, 116, 32, 268, 5)
    shelf(524, 616, 32, 268, 5)
    # globo e pergaminho nas prateleiras da direita? (somente detalhe) - frasco na estante esquerda
    # mesa
    top = 270
    c.rect(0, top, W, top + 10, C('#7a4a30'), OUT)
    c.rect(0, top + 1, W, top + 3, C('#b07c4c'))
    c.grad_v(0, top + 11, W, H, [C('#4a2e24'), C('#3a241e'), C('#2e1c18')], 2.4)
    for x in range(0, W, 120):
        c.line((x, top + 11), (x, H), C('#22140e'))
    # livro aberto (centro, parte baixa da tela)
    bx, by = 236, 292
    c.poly([(bx, by + 30), (bx + 168, by + 30), (bx + 168, by + 38), (bx, by + 38)], C('#6a2a30'), OUT)  # capa
    c.poly([(bx + 6, by - 2), (bx + 84, by + 6), (bx + 84, by + 34), (bx + 6, by + 30)], C('#f4ead0'), OUT)    # pagina esquerda
    c.poly([(bx + 162, by - 2), (bx + 84, by + 6), (bx + 84, by + 34), (bx + 162, by + 30)], C('#ece0c0'), OUT)  # pagina direita
    c.line((bx + 84, by + 6), (bx + 84, by + 34), C('#b8a478'), 2)
    for k in range(1, 4):
        c.line((bx + 6, by + 30 + k), (bx + 84, by + 34 + k), C('#d8caa4'))
        c.line((bx + 162, by + 30 + k), (bx + 84, by + 34 + k), C('#c8ba94'))
    # ilustracao na pagina esquerda (sol nascendo + colinas), nao texto
    c.poly([(bx + 14, by + 22), (bx + 28, by + 12), (bx + 44, by + 20), (bx + 60, by + 10), (bx + 78, by + 22), (bx + 78, by + 27), (bx + 14, by + 25)], C('#6aa860'), C('#3a6a3c'))
    c.ell(bx + 46, by + 9, 7, 7, C('#e8a830'), None)
    c.rect(bx + 38, by + 9, bx + 54, by + 22, C('#f4ead0'))
    c.poly([(bx + 14, by + 22), (bx + 28, by + 14), (bx + 44, by + 21), (bx + 60, by + 13), (bx + 78, by + 22), (bx + 78, by + 27), (bx + 14, by + 25)], C('#6aa860'), C('#3a6a3c'))
    # pagina direita: moldura ornamental simples e fita de marcador
    c.poly([(bx + 92, by + 6), (bx + 154, by + 0), (bx + 154, by + 24), (bx + 92, by + 29)], None, C('#b89860'))
    c.poly([(bx + 98, by + 10), (bx + 148, by + 5), (bx + 148, by + 20), (bx + 98, by + 25)], None, C('#d8b878'))
    c.rect(bx + 120, by + 6, bx + 124, by + 38, C('#c83c34'), OUT)
    c.poly([(bx + 120, by + 38), (bx + 122, by + 34), (bx + 124, by + 38)], C('#f4ead0'))
    # vela (direita do livro)
    vx, vy = 452, 270
    c.rect(vx - 8, vy - 4, vx + 8, vy, C('#8a6a3c'), OUT)
    c.rect(vx - 5, vy - 30, vx + 5, vy - 4, C('#f4ead0'), OUT)
    c.rect(vx - 5, vy - 30, vx - 3, vy - 4, C('#fffaf0'))
    c.rect(vx + 3, vy - 30, vx + 5, vy - 4, C('#d8c8a0'))
    c.line((vx, vy - 31), (vx, vy - 34), OUT)
    c.poly([(vx - 4, vy - 34), (vx, vy - 46), (vx + 4, vy - 34)], C('#f07a2c'), OUT)
    c.poly([(vx - 2, vy - 35), (vx, vy - 42), (vx + 2, vy - 35)], C('#ffe070'))
    # pergaminho enrolado (esquerda do livro) e tinteiro com pena
    c.rect(150, 280, 214, 292, C('#e8dcb8'), OUT)
    c.ell(150, 286, 4, 6, C('#d8c898'), OUT)
    c.ell(214, 286, 4, 6, C('#f4ead0'), OUT)
    c.line((158, 283), (206, 283), C('#c8b888'))
    c.rect(500, 276, 516, 292, C('#222a58'), OUT)
    c.rect(504, 272, 512, 277, C('#222a58'), OUT)
    c.rect(502, 278, 504, 290, C('#4a5a98'))
    c.line((508, 274), (528, 244), OUT, 2)
    c.poly([(520, 252), (536, 240), (528, 258)], C('#f4ead0'), OUT)
    # luzes: vela aquece a mesa e a estante direita; lua esfria a janela
    light(c, vx, vy - 38, 120, C('#ffb860'), 0.55, ry=96, steps=4)
    light(c, bx + 84, by + 10, 90, C('#fff0c0'), 0.3, ry=40, steps=3)
    light(c, wcx, 150, 120, C('#8aa8e8'), 0.12, ry=130, steps=3)
    # centro calmo (parte alta, atras dos botoes): escurece
    light(c, 320, 120, 150, C('#0a0814'), 0.22, ry=100, steps=3)
    vignette(c, 0.42)
    return c.im


# ===========================================================================
# EFEITO: ESCUDO (GIF animado, fundo transparente)
# ===========================================================================
def make_escudo(path, frames=10, native=64):
    """Bolha de escudo hexagonal azul-ciano que pulsa. 64x64 nativo, 2x -> 128x128, loop infinito."""
    pal = [
        (0, 0, 0),            # 0 transparente
        (10, 38, 74),         # 1 contorno profundo
        (14, 76, 140),        # 2 azul escuro
        (28, 128, 214),       # 3 azul
        (60, 190, 240),       # 4 ciano
        (122, 224, 252),      # 5 ciano claro
        (190, 244, 255),      # 6 brilho
        (255, 255, 255),      # 7 branco
    ]
    pal_arr = np.array(pal, np.int16)
    cx = cy = native / 2 - 0.5
    yy, xx = np.mgrid[0:native, 0:native]
    b = bayer(native, native)

    def hexdist(x, y, rot):
        """Distancia 'hexagonal' normalizada (1 = borda de um hexagono de raio 1)."""
        dx, dy = x - cx, y - cy
        c_, s_ = math.cos(rot), math.sin(rot)
        rx, ry = dx * c_ - dy * s_, dx * s_ + dy * c_
        ax, ay = np.abs(rx), np.abs(ry)
        return np.maximum(ax * 0.8660254 + ay * 0.5, ay)  # hexagono de ponta para o lado (pointy side)

    out = []
    for f in range(frames):
        ph = 2 * math.pi * f / frames
        pulse = math.sin(ph)
        R = 27.0 + 1.2 * pulse                     # raio externo respira
        d = hexdist(xx, yy, 0.0)
        inside = d <= R
        rim = inside & (d > R - 2.4)
        edge = inside & (d > R - 1.0)
        # alfa do preenchimento: mais opaco perto da borda, quase vazio no centro (translucido), tramado
        rad = np.clip(d / R, 0, 1)
        fill_a = 0.10 + 0.34 * rad ** 2.2 + 0.05 * pulse
        # varredura de brilho diagonal que percorre o escudo
        sweep_pos = (f / frames) * 2.6 - 0.8
        diag = ((xx - cx) * 0.7 + (yy - cy) * -0.7) / R
        sweep = np.exp(-((diag - sweep_pos) ** 2) / 0.012)
        fill_a = np.clip(fill_a + 0.5 * sweep * (rad > 0.15), 0, 0.95)
        solid = inside & (b < fill_a)
        # cor do preenchimento: ciano claro na borda, azul no meio, ciano no sweep
        level = np.clip(2 + 2.2 * rad ** 1.4 + 1.8 * sweep, 2, 6)
        lv = np.floor(level) + ((level - np.floor(level)) > b)
        idx = np.zeros((native, native), np.int16)
        idx[solid] = np.clip(lv[solid], 2, 6)
        # grade hexagonal interna (celulas): linhas finas
        cell = 12.0
        for rot in (0.0, math.pi / 3, 2 * math.pi / 3):
            c_, s_ = math.cos(rot + math.pi / 2), math.sin(rot + math.pi / 2)
            proj = (xx - cx) * c_ + (yy - cy) * s_
            lines = (np.abs(((proj + cell / 2) % cell) - cell / 2) < 0.62)
            m = lines & (d < R - 3.0) & (d > 4.5)
            idx[m] = np.where(sweep[m] > 0.35, 6, np.maximum(idx[m], 3))
        # aro externo em tres tons
        idx[rim] = 4
        idx[inside & (d > R - 1.6) & (d <= R - 0.7)] = 5
        idx[edge] = 1
        # brilho forte no aro, onde a varredura passa
        glow_hi = rim & (sweep > 0.25)
        idx[glow_hi] = 7
        # reflexos fixos no canto superior esquerdo e inferior direito (arcos)
        ang = np.arctan2(yy - cy, xx - cx)
        arc1 = rim & (d > R - 3.2) & (np.abs(ang + 2.35) < 0.42)
        idx[arc1] = 7
        arc2 = inside & (d > R - 4.4) & (d < R - 2.6) & (np.abs(ang - 0.8) < 0.30)
        idx[arc2] = np.maximum(idx[arc2], 5)
        # centelhas orbitando
        for k in range(3):
            a_ = ph + k * 2 * math.pi / 3
            sx, sy = cx + math.cos(a_) * (R - 0.5), cy + math.sin(a_) * (R - 0.5)
            ix, iy = int(round(sx)), int(round(sy))
            for (ox, oy, col) in [(0, 0, 7), (1, 0, 6), (-1, 0, 6), (0, 1, 6), (0, -1, 6)]:
                if 0 <= ix + ox < native and 0 <= iy + oy < native:
                    idx[iy + oy, ix + ox] = col
        # halo externo (fora do hexagono): pontinhos tramados que pulsam
        halo_r = R + 3.5 + 1.5 * pulse
        halo = (d > R) & (d <= halo_r) & (b < (0.30 + 0.10 * pulse) * (1 - (d - R) / (halo_r - R + 0.01)))
        idx[halo & (idx == 0)] = 3
        img = Image.fromarray(idx.astype(np.uint8), 'P')
        flat = [v for rgb in pal for v in rgb] + [0] * (3 * (256 - len(pal)))
        img.putpalette(flat)
        img = img.resize((native * 2, native * 2), Image.NEAREST)
        out.append(img)
    out[0].save(path, save_all=True, append_images=out[1:], duration=90, loop=0, transparency=0, disposal=2, optimize=False)


# ===========================================================================
# saida
# ===========================================================================
def up(im, k=UP):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def save_stage(im, path):
    up(im).save(path, 'WEBP', lossless=True, quality=100, method=6)


def save_screen(im, path):
    big = up(im.convert('RGB'))
    pal = big.quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal.save(path, 'PNG', optimize=True)


STAGES = {'stage1': stage1, 'stage2': stage2, 'stage3': stage3}
SCREENS = {'inicio': tela_inicio, 'jogar': tela_jogar, 'versus': tela_versus, 'opcoes': tela_opcoes, 'sair': tela_sair, 'historia': tela_historia}
EFFECTS = {'escudo': make_escudo}


def main():
    ap = argparse.ArgumentParser()
    root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'legacy-art'))
    ap.add_argument('--out', default=root)
    ap.add_argument('--only', nargs='*')
    args = ap.parse_args()
    for sub in ('screens', 'stages', 'effects'):
        os.makedirs(os.path.join(args.out, sub), exist_ok=True)
    want = lambda n: not args.only or n in args.only
    for n, fn in STAGES.items():
        if want(n):
            save_stage(fn(), os.path.join(args.out, 'stages', n + '.webp'))
            print('ok', n)
    for n, fn in SCREENS.items():
        if want(n):
            save_screen(fn(), os.path.join(args.out, 'screens', n + '.png'))
            print('ok', n)
    for n, fn in EFFECTS.items():
        if want(n):
            fn(os.path.join(args.out, 'effects', n + '.gif'))
            print('ok', n)


if __name__ == '__main__':
    main()
