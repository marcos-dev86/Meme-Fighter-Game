"""Pixel art desenhada por codigo (sem imagem pronta, sem rede, deterministica) para o Meme Fighter.

Usado por tools/make_legacy_sprites.py para recriar do zero: orc, soldier, mystic e dragao sombrio (+ retratos de NPC).
Tecnica: as formas sao desenhadas em alta resolucao (S x), amostradas por vizinho mais proximo na grade de pixels baixa
(bordas nitidas, paleta exata), ganham brilho/sombra nas bordas (bevel) e contorno escuro de 1 px. Os membros usam
cinematica inversa de 2 ossos, entao cada pose (andar, arranque, golpes) e uma pose de verdade.
Todos os personagens olham para a DIREITA, como o resto do jogo.
"""
import math

import numpy as np
from PIL import Image, ImageDraw

OUT = (18, 13, 24)


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c[:3])


class Pix:
    """Tela de desenho em unidades de pixel baixo (floats). finish() devolve o RGBA na grade baixa."""

    def __init__(self, w, h, S=8):
        self.w, self.h, self.S = w, h, S
        self.im = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def _c(self, c):
        return tuple(c[:3]) + (255,)

    def ell(self, cx, cy, rx, ry, c):
        S = self.S
        self.d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=self._c(c))

    def rell(self, cx, cy, rx, ry, ang, c, n=32):
        ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        pts = []
        for i in range(n):
            t = 2 * math.pi * i / n
            x, y = rx * math.cos(t), ry * math.sin(t)
            pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
        self.poly(pts, c)

    def poly(self, pts, c):
        S = self.S
        self.d.polygon([(x * S, y * S) for x, y in pts], fill=self._c(c))

    def rect(self, x0, y0, x1, y1, c):
        S = self.S
        self.d.rectangle([x0 * S, y0 * S, x1 * S, y1 * S], fill=self._c(c))

    def line(self, a, b, w, c, caps=True):
        S = self.S
        self.d.line([a[0] * S, a[1] * S, b[0] * S, b[1] * S], fill=self._c(c), width=max(1, int(w * S)))
        if caps:
            r = w / 2.0
            for p in (a, b):
                self.ell(p[0], p[1], r, r, c)

    def path(self, pts, w, c):
        for a, b in zip(pts, pts[1:]):
            self.line(a, b, w, c)

    def taper(self, pts, w0, w1, c):
        """Linha grossa que afina do primeiro ao ultimo ponto (cauda, pescoco)."""
        n = len(pts)
        for i, p in enumerate(pts):
            w = w0 + (w1 - w0) * i / max(1, n - 1)
            self.ell(p[0], p[1], w / 2, w / 2, c)
        for i in range(n - 1):
            w = w0 + (w1 - w0) * (i + 0.5) / max(1, n - 1)
            self.line(pts[i], pts[i + 1], w, c, caps=False)

    def finish(self, outline=True, bevel=True, out=OUT):
        S = self.S
        ys = np.arange(self.h) * S + S // 2
        xs = np.arange(self.w) * S + S // 2
        lo = np.array(self.im)[np.ix_(ys, xs)].copy()
        al = lo[..., 3] >= 128
        lo[..., 3] = np.where(al, 255, 0)
        lo[~al, :3] = 0
        if bevel:
            p = np.pad(al, 1)
            top_empty = ~p[:-2, 1:-1]
            left_empty = ~p[1:-1, :-2]
            bot_empty = ~p[2:, 1:-1]
            right_empty = ~p[1:-1, 2:]
            f = lo[..., :3].astype(np.float32)
            rim = al & (top_empty | left_empty)
            dk = al & (bot_empty | right_empty) & ~rim
            f[rim] = np.minimum(255, f[rim] * 1.16 + 10)
            f[dk] = f[dk] * 0.78
            lo[..., :3] = f.astype(np.uint8)
        if outline:
            p = np.pad(al, 1)
            ring = ~al & (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:])
            lo[ring] = out + (255,)
        return lo


def ik2(a, t, l1, l2, bend=1):
    """Cinematica inversa de 2 ossos: devolve (articulacao, ponta alcancavel)."""
    dx, dy = t[0] - a[0], t[1] - a[1]
    d = math.hypot(dx, dy)
    d = min(max(d, abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3)
    ang = math.atan2(dy, dx)
    cos_a = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
    A = math.acos(max(-1.0, min(1.0, cos_a)))
    ja = ang + bend * A
    j = (a[0] + l1 * math.cos(ja), a[1] + l1 * math.sin(ja))
    e = (a[0] + d * math.cos(ang), a[1] + d * math.sin(ang))
    return j, e


def polar(p, ang, r):
    return (p[0] + r * math.cos(math.radians(ang)), p[1] + r * math.sin(math.radians(ang)))


def over(dst, src, x=0, y=0):
    """alpha-over de src (RGBA uint8) sobre dst."""
    H, W = dst.shape[:2]
    h, w = src.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return dst
    s = src[y0 - y:y1 - y, x0 - x:x1 - x].astype(np.float32)
    d = dst[y0:y1, x0:x1].astype(np.float32)
    sa, da = s[..., 3:4] / 255.0, d[..., 3:4] / 255.0
    oa = sa + da * (1 - sa)
    c = np.where(oa > 0, (s[..., :3] * sa + d[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6), 0)
    dst[y0:y1, x0:x1] = np.concatenate([c, oa * 255.0], axis=2).round().astype(np.uint8)
    return dst


# ----------------------------------------------------------------------------- esqueleto humanoide

# Poses em unidades do comprimento da perna (L). Eixo x para a FRENTE (direita); y para BAIXO.
# ff/fb = pe da frente/de tras relativo ao quadril (y<0 = pe levantado); hf/hb = mao relativa ao ombro (em L).
# wa = angulo da arma (graus, 0 = aponta para a direita, -90 = para cima); lean = inclinacao do tronco; up = corpo sobe (em L).
POSE = {
    'idle':   dict(lean=2, up=0.00, ff=(0.30, 0), fb=(-0.28, 0), hf=(0.50, 0.55), hb=(-0.30, 0.62), wa=-62),
    'walk1':  dict(lean=7, up=0.03, ff=(0.62, 0), fb=(-0.52, -0.22), hf=(-0.18, 0.62), hb=(0.58, 0.42), wa=-28),
    'walk2':  dict(lean=4, up=0.10, ff=(0.06, -0.02), fb=(0.00, -0.34), hf=(0.34, 0.62), hb=(-0.05, 0.66), wa=-50),
    'walk3':  dict(lean=7, up=0.03, ff=(-0.50, -0.22), fb=(0.62, 0), hf=(0.60, 0.40), hb=(-0.30, 0.62), wa=-78),
    'dash':   dict(lean=26, up=-0.04, ff=(0.95, -0.10), fb=(-0.85, -0.30), hf=(-0.50, 0.30), hb=(0.45, 0.20), wa=-8),
    'flash':  dict(lean=12, up=-0.02, ff=(0.55, 0), fb=(-0.45, 0), hf=(0.98, 0.10), hb=(-0.40, 0.55), wa=2),
    'strong': dict(lean=20, up=-0.06, ff=(0.78, 0), fb=(-0.60, 0), hf=(0.80, -0.55), hb=(0.20, 0.30), wa=64),
}


class Rig:
    def __init__(self, G, cx, L, T, UA, FA, TH=None, SH=None, shoulder_dx=0.0):
        self.G, self.cx, self.L, self.T, self.UA, self.FA = G, cx, L, T, UA, FA
        self.TH = TH or L * 0.52
        self.SH = SH or L * 0.52
        self.sdx = shoulder_dx

    def solve(self, pose):
        P = dict(pose)
        L = self.L
        hip = (self.cx, self.G - L * (0.97 + P['up']) + 0.0)
        ang = -90 + P['lean']
        shoulder = polar(hip, ang, self.T)
        shoulder = (shoulder[0] + self.sdx, shoulder[1])
        pts = dict(hip=hip, shoulder=shoulder, trunk_ang=ang)
        for side in ('f', 'b'):
            fx, fy = P['f' + side]
            foot = (hip[0] + fx * L, self.G + fy * L)
            knee, foot = ik2(hip, foot, self.TH, self.SH, bend=1)  # joelho dobra para a frente
            pts['knee_' + side], pts['foot_' + side] = knee, foot
            hx, hy = P['h' + side]
            hand = (shoulder[0] + hx * L, shoulder[1] + hy * L)
            elbow, hand = ik2(shoulder, hand, self.UA, self.FA, bend=-1)  # cotovelo para baixo/tras
            pts['elbow_' + side], pts['hand_' + side] = elbow, hand
        pts['wa'] = P['wa']
        return pts


def fx_layer(w, h, kind, pts, pal, S=8):
    """Efeitos (sem contorno/bevel): riscos de velocidade, estrela de impacto ou arco de corte."""
    p = Pix(w, h, S)
    return p


def speed_lines(arr, rng, x_end_fn, y0, y1, n, light=(238, 242, 252), dark=(46, 48, 66), length=(0.22, 0.45)):
    H, W = arr.shape[:2]
    for i in range(n):
        y = int(y0 + (y1 - y0) * (i + 0.5) / n + rng.randint(-1, 1))
        if not (0 <= y < H):
            continue
        xe = int(x_end_fn(y))
        ln = int(W * rng.uniform(*length))
        col = light if i % 2 == 0 else dark
        arr[y, max(0, xe - ln):max(0, xe)] = col + (235,)
    return arr
