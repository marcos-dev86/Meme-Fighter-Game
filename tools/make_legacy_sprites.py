#!/usr/bin/env python3
"""Recria assets/legacy-sprites/<personagem>/{idle,walk1,walk2,walk3,dash,flash,strong,ult}.png.

Contexto: a pasta assets/legacy-sprites nunca esteve no Git e foi apagada. Este script reconstroi o conjunto de 8 quadros
de cada lutador no MESMO modelo do Dogge e do Gadigago (quadros viram para a DIREITA, pes na base do quadro, fundo
transparente, nomes de arquivo identicos aos que src/game/battle/sprites.ts espera).

De onde vem cada quadro (o que e original e o que e gerado fica registrado em assets/legacy-sprites/ORIGEM.json):
  * dogge, gadigago : os 8 quadros ORIGINAIS exatos, recuperados das skins do repositorio (assets/skins/<p>/floresta),
                      que sao so uma troca de tonalidade (make_cosmetics.py) - a troca e desfeita aqui.
  * dogking, tank_fighter, footman, tank (retrato) : quadros reais dos pacotes Doggo (EvilDog/TankDog/FootmanDog).
  * green_dragon, ice_dragon : quadros reais de bater de asas.
  * orc, soldier, mystic, shadow_dragon : DESENHADOS DO ZERO por codigo (tools/legacy_chars.py + legacy_draw.py), com
                      esqueleto de verdade (andar, arranque, golpes). Os quadros enviados serviram so de referencia.
  * ninja, cara_tranquilo, troll_face : 1 imagem-base real + poses geradas por codigo (inclinacao, passada, arranque,
                      soco, golpe forte) - nao sao desenhos novos feitos a mao.
  * hood, monk, moai, meme-kin (retratos de NPC) : desenhados do zero por codigo (legacy_chars.PORTRAITS).
  * ult de todos exceto Dogge/Gadigago : bola de fogo/energia desenhada por codigo, no estilo do ult do Dogge.

Uso (na raiz do projeto):
  python3 tools/make_legacy_sprites.py --src <pasta legacy-sprites enviada> [--out assets/legacy-sprites] [--only orc,ninja]
  python3 tools/make_legacy_sprites.py --src <...> --aspects     # imprime o bloco SPRITE_ASPECTS para sprites.ts
Deterministico (semente fixa), sem rede.
"""
import argparse
import json
import math
import os
import random
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import legacy_chars  # noqa: E402  (personagens desenhados do zero)

POSES = ['idle', 'walk1', 'walk2', 'walk3', 'dash', 'flash', 'strong', 'ult']
BODY = POSES[:7]

# ----------------------------------------------------------------------------- utilidades de matriz RGBA


def rgba(path):
    return np.array(Image.open(path).convert('RGBA'))


def trim(a, thr=0):
    ys, xs = np.where(a[..., 3] > thr)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def bbox(a, thr=0):
    ys, xs = np.where(a[..., 3] > thr)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def up(a, k):
    return a if k == 1 else np.repeat(np.repeat(a, k, 0), k, 1)


def nn(a, w, h):
    """Redimensiona por vizinho mais proximo (mantem pixel art nitida)."""
    return np.array(Image.fromarray(a).resize((max(1, int(w)), max(1, int(h))), Image.NEAREST))


def smooth(a, w, h):
    """Reduz com filtro suave, sem franja escura nas bordas (pre-multiplicado)."""
    f = a.astype(np.float32)
    al = f[..., 3:4] / 255.0
    pm = np.concatenate([f[..., :3] * al, f[..., 3:4]], axis=2)
    chans = [np.array(Image.fromarray(pm[..., i]).resize((int(w), int(h)), Image.LANCZOS)) for i in range(4)]
    o = np.stack(chans, axis=2)
    alpha = np.clip(o[..., 3:4], 0, 255)
    rgb = np.where(alpha > 0, o[..., :3] / np.maximum(alpha / 255.0, 1e-4), 0)
    return np.clip(np.concatenate([rgb, alpha], axis=2), 0, 255).astype(np.uint8)


def over(dst, src, x, y):
    """Composicao alpha-over de src em dst (uint8 RGBA) na posicao (x, y); recorta o que sai da area."""
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
    rgb = np.where(oa > 0, (s[..., :3] * sa + d[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6), 0)
    dst[y0:y1, x0:x1] = np.concatenate([rgb, oa * 255.0], axis=2).round().astype(np.uint8)
    return dst


class Fr:
    """Um quadro: matriz RGBA + cx = coluna do centro do corpo (a imagem final e centrada nele, como o jogo espera)."""

    def __init__(self, a, cx=None):
        self.a = a
        self.cx = a.shape[1] / 2.0 if cx is None else cx

    @property
    def h(self):
        return self.a.shape[0]

    @property
    def w(self):
        return self.a.shape[1]


def margins(fr, l=0, r=0, t=0, b=0):
    a = np.pad(fr.a, ((t, b), (l, r), (0, 0)))
    return Fr(a, fr.cx + l)


# ----------------------------------------------------------------------------- poses (transformacoes)


def row_shift(fr, shifts):
    a = fr.a
    H, W = a.shape[:2]
    m = int(max(1, np.abs(shifts).max()))
    out = np.zeros((H, W + 2 * m, 4), np.uint8)
    for y in range(H):
        s = int(shifts[y])
        out[y, m + s:m + s + W] = a[y]
    return Fr(out, fr.cx + m)


def lean(fr, k):
    """Inclina o corpo para a frente (k>0 = direita) mantendo os pes no lugar. k = deslocamento do topo / largura."""
    H, W = fr.a.shape[:2]
    top = k * W
    sh = [int(round(top * (1 - y / max(1, H - 1)) ** 1.15)) for y in range(H)]
    return row_shift(fr, np.array(sh))


def squash(fr, sx=1.0, sy=1.0):
    H, W = fr.a.shape[:2]
    a = nn(fr.a, W * sx, H * sy)
    return Fr(a, fr.cx * a.shape[1] / W)


def lift(fr, dy):
    return margins(fr, b=int(dy)) if dy > 0 else fr


def legs(fr, dl, dr, y0=0.55):
    """Abre/fecha as pernas: a metade esquerda e a direita da parte de baixo deslizam em sentidos opostos (passada)."""
    a = fr.a
    H, W = a.shape[:2]
    mid = int(round(fr.cx))
    mid = min(max(mid, 1), W - 1)
    m = int(max(abs(dl), abs(dr))) + 1
    out = np.zeros((H, W + 2 * m, 4), np.uint8)
    top = int(H * y0)
    for side, (x0, x1, d) in enumerate(((0, mid, dl), (mid, W, dr))):
        piece = a[:, x0:x1]
        for y in range(H):
            t = 0.0 if y < top else (y - top + 1) / max(1, H - top)
            s = int(round(d * t))
            row = np.zeros((1, out.shape[1], 4), np.uint8)
            row[0, m + x0 + s:m + x1 + s] = piece[y:y + 1]
            out[y:y + 1] = over(out[y:y + 1].copy(), row, 0, 0)
    return Fr(out, fr.cx + m)


def hem(fr, d, y0=0.55):
    """Passada de personagem de capa/manto: a barra de baixo balanca para um lado (cisalhamento so da parte de baixo)."""
    H = fr.a.shape[0]
    top = int(H * y0)
    sh = [0 if y < top else int(round(d * (y - top + 1) / max(1, H - top))) for y in range(H)]
    return row_shift(fr, np.array(sh))


# ----------------------------------------------------------------------------- efeitos (so cor + formas, sem arte emprestada)

FIRE = dict(core=(255, 250, 200), mid=(255, 222, 70), hot=(255, 150, 30), edge=(220, 50, 30), dark=(110, 20, 20))
ICE = dict(core=(245, 252, 255), mid=(190, 235, 255), hot=(110, 190, 255), edge=(50, 110, 220), dark=(20, 40, 110))
SHADOW = dict(core=(255, 190, 240), mid=(225, 110, 230), hot=(160, 60, 200), edge=(90, 30, 140), dark=(35, 10, 60))
TOXIC = dict(core=(240, 255, 190), mid=(190, 240, 80), hot=(110, 200, 50), edge=(40, 130, 40), dark=(15, 60, 25))
GOLD = dict(core=(255, 255, 230), mid=(255, 235, 120), hot=(240, 180, 40), edge=(190, 110, 20), dark=(100, 50, 10))


def _px(img, pts, col):
    ImageDraw.Draw(img).polygon(pts, fill=col + (255,))


def fx_speed(fr, u, rng, n=5, light=True):
    """Riscos de velocidade atras do personagem (como no dash do Dogge)."""
    w0 = fr.w
    pad = int(w0 * 0.4) + 4 * u
    fr = margins(fr, l=pad)
    a = fr.a
    ys, xs = np.where(a[..., 3] > 0)
    y_lo, y_hi = ys.min() + int(0.12 * fr.h), ys.max() - int(0.1 * fr.h)
    img = Image.fromarray(np.zeros_like(a))
    d = ImageDraw.Draw(img)
    for i in range(n):
        y = int(y_lo + (y_hi - y_lo) * (i + 0.5) / n + rng.randint(-u, u))
        row = np.where(a[y, :, 3] > 0)[0]
        x_end = (row.min() if len(row) else fr.cx) - 2 * u
        ln = int(w0 * rng.uniform(0.15, 0.36))
        col = (235, 240, 250, 230) if (light and i % 2 == 0) else (40, 44, 58, 235)
        d.rectangle([max(0, x_end - ln), y, x_end, y + max(0, u - 1)], fill=col)
    return Fr(over(a.copy(), np.array(img), 0, 0), fr.cx)


def fx_ghost(fr, shift, alpha=0.35):
    """Imagem residual (rastro) atras do corpo."""
    pad = int(shift) + 2
    fr2 = margins(fr, l=pad)
    g = fr2.a.copy()
    g[..., 3] = (g[..., 3] * alpha).astype(np.uint8)
    out = np.zeros_like(fr2.a)
    out = over(out, g, -int(shift), 0)
    out = over(out, fr2.a, 0, 0)
    return Fr(out, fr2.cx)


def fx_burst(fr, u, pal, size=1.0, at=(0.0, 0.40), spikes=8):
    """Estrela de impacto na frente do personagem (soco rapido)."""
    R = int(max(3 * u, fr.h * 0.16 * size))
    bx = int(fr.a.shape[1] * 0.0)
    ys, xs = np.where(fr.a[..., 3] > 0)
    right = xs.max()
    fr = margins(fr, r=int(R * 1.8))
    img = Image.new('RGBA', (fr.w, fr.h), (0, 0, 0, 0))
    cx, cy = right + int(R * 0.9) + int(at[0] * fr.w), int(ys.min() + (ys.max() - ys.min()) * at[1])
    for scale, col in ((1.0, pal['hot']), (0.62, pal['mid']), (0.3, pal['core'])):
        pts = []
        for i in range(spikes * 2):
            ang = math.pi * i / spikes
            rr = R * scale * (1.0 if i % 2 == 0 else 0.42)
            pts.append((cx + math.cos(ang) * rr, cy + math.sin(ang) * rr))
        _px(img, pts, col)
    return Fr(over(fr.a.copy(), np.array(img), 0, 0), fr.cx)


def fx_arc(fr, u, pal, size=1.0, at=0.5):
    """Meia-lua de corte na frente do personagem (golpe forte)."""
    ys, xs = np.where(fr.a[..., 3] > 0)
    top, bot, right = ys.min(), ys.max(), xs.max()
    R = int((bot - top) * 0.62 * size)
    th = max(2 * u, int(R * 0.34))
    fr = margins(fr, r=int(R * 0.7), t=0)
    img = Image.new('RGBA', (fr.w, fr.h), (0, 0, 0, 0))
    cx = right - int(R * 0.25)
    cy = int(top + (bot - top) * at)
    for shrink, col in ((0, pal['hot']), (0.28, pal['mid']), (0.55, pal['core'])):
        pts = []
        t_ = th * (1 - shrink)
        for i in range(0, 25):
            ang = math.radians(-62 + 124 * i / 24)
            pts.append((cx + math.cos(ang) * R, cy + math.sin(ang) * R))
        for i in range(24, -1, -1):
            ang = math.radians(-62 + 124 * i / 24)
            rr = R - t_ * math.sin(math.radians(180 * i / 24))
            pts.append((cx + math.cos(ang) * rr, cy + math.sin(ang) * rr))
        _px(img, pts, col)
    return Fr(over(fr.a.copy(), np.array(img), 0, 0), fr.cx)


# ----------------------------------------------------------------------------- bola de fogo do ult (modelo: ult do Dogge)


def fireball(w, h, pal, seed, cell=None):
    """Bola de fogo/energia em blocos grandes + riscos pretos de velocidade a esquerda. Retorna RGBA (h, w)."""
    rng = random.Random(seed)
    g = cell or max(3, int(round(h / 28)))
    gw, gh = w // g, h // g
    img = Image.new('RGBA', (gw, gh), (0, 0, 0, 0))
    px = img.load()
    cy = gh / 2.0
    R = gh * 0.47
    cx = gw - R - 1
    # riscos de velocidade (pretos, como no ult do Dogge)
    for i in range(rng.randint(5, 7)):
        y = int(rng.uniform(0.1, 0.9) * gh)
        x1 = int(cx - R * rng.uniform(0.35, 0.8))
        x0 = int(max(0, x1 - gw * rng.uniform(0.18, 0.5)))
        for x in range(x0, x1):
            for t in range(max(1, gh // 26)):
                if 0 <= y + t < gh:
                    px[x, y + t] = (14, 14, 18, 255)
    # cauda de chamas
    for i in range(int(R * 1.6)):
        x = int(cx - R * 0.5 - i)
        if x < 0:
            break
        spread = R * 0.75 * (1 - i / (R * 1.6))
        for y in range(int(cy - spread), int(cy + spread) + 1):
            if rng.random() < 0.55 and 0 <= y < gh:
                d = abs(y - cy) / max(spread, 1)
                px[x, y] = (pal['edge'] if d > 0.6 else pal['hot'] if d > 0.25 else pal['mid']) + (255,)
    # corpo da bola (aneis de cor)
    for y in range(gh):
        for x in range(gw):
            d = math.hypot(x - cx, y - cy) / R
            d += 0.09 * math.sin(math.atan2(y - cy, x - cx) * 5 + seed) + rng.uniform(-0.04, 0.04)
            if d <= 1.0:
                col = pal['dark'] if d > 0.9 else pal['edge'] if d > 0.74 else pal['hot'] if d > 0.52 else pal['mid'] if d > 0.28 else pal['core']
                px[x, y] = col + (255,)
    # fagulhas
    for i in range(10):
        x = int(cx + rng.uniform(-1.3, 1.1) * R)
        y = int(cy + rng.uniform(-1.2, 1.2) * R)
        if 0 <= x < gw and 0 <= y < gh and px[x, y][3] == 0:
            px[x, y] = (pal['hot'] if i % 2 else pal['mid']) + (255,)
    return up(np.array(img), g)


# ----------------------------------------------------------------------------- montagem do conjunto de 8 quadros


def finalize_set(frames, k, ult, ref_h=None, max_ratio=1.2, keep_canvas=False):
    """frames: dict pose -> Fr (1x). Todos os quadros ficam com a MESMA altura (escala igual entre poses), pes na base,
    e centrados no corpo (o jogo centra o quadro no lutador). Poses mais altas que max_ratio x idle sao reduzidas.
    keep_canvas=True (dragoes): nao recorta o quadro - mantem o quadro original inteiro (178x202), so alarga para os efeitos."""
    idle_h = frames['idle'].a.shape[0] if keep_canvas else trim(frames['idle'].a).shape[0]
    tops = []
    for p in BODY:
        f = frames[p]
        tops.append(f.a.shape[0])
    H0 = int(round(max(idle_h, min(max(tops), idle_h * max_ratio)))) if ref_h is None else ref_h
    out = {}
    for p in BODY:
        f = frames[p]
        a = f.a
        # recorta vazio nas bordas mantendo o centro do corpo calculado
        x0, y0, x1, y1 = (0, 0, a.shape[1], a.shape[0]) if keep_canvas else bbox(a)
        a = a[y0:y1, x0:x1]
        cx = f.cx - x0
        if a.shape[0] > H0:
            s = H0 / a.shape[0]
            a = nn(a, a.shape[1] * s, H0)
            cx *= s
        a = np.pad(a, ((H0 - a.shape[0], 0), (0, 0), (0, 0)))
        half = int(math.ceil(max(cx, a.shape[1] - cx)))
        left = half - int(round(cx))
        W = 2 * half
        canvas = np.zeros((H0, W, 4), np.uint8)
        canvas[:, left:left + a.shape[1]] = a[:, :min(a.shape[1], W - left)]
        out[p] = up(canvas, k)
    out['ult'] = ult
    return out


def body_set(base, u, rng, pal, style='legs', extra=None):
    """Gera idle/walk1-3/dash/flash/strong a partir de UMA imagem-base (pes embaixo, olhando para a direita).
    style 'legs' = pernas visiveis (abrem e cruzam); 'robe' = manto/capuz (a barra balanca)."""
    ex = extra or {}
    B = Fr(base)
    W = B.w
    step = max(2, int(round(W * 0.2)))
    bob = max(1, u)
    f = {'idle': B}
    if style == 'robe':
        f['walk1'] = hem(lean(B, 0.05), step)
        f['walk3'] = hem(lean(B, 0.05), -step)
    else:
        f['walk1'] = legs(lean(B, 0.05), step, -step // 2)
        f['walk3'] = legs(lean(B, 0.05), step // 2, -step)
    f['walk2'] = lift(squash(B, 1.0, 0.96), bob * 2)  # passagem: corpo sobe e fica mais baixo/fino
    f['dash'] = fx_ghost(fx_speed(lean(squash(B, 1.06, 0.97), 0.20), u, rng), W * 0.28)
    f['flash'] = fx_burst(lean(squash(B, 1.04, 0.98), 0.12), u, pal, 0.8)
    f['strong'] = fx_arc(lean(squash(B, 1.08, 0.95), 0.26), u, pal, 1.0)
    f.update({k: v for k, v in ex.items() if v is not None})
    return f


# ----------------------------------------------------------------------------- fontes


class Src:
    def __init__(self, root, repo):
        self.root, self.repo = root, repo

    def p(self, *a):
        return os.path.join(self.root, *a)

    def pack(self, d, n, kind, idx, fw):
        im = rgba(self.p('Doggo', 'Doggo', d, 'Spritesheet', f'{n}-{kind}-SpriteSheet.png'))
        cell = im[:, idx * fw:(idx + 1) * fw]
        return cell

    def pack_frame(self, d, n, kind, idx, fw, ref_cell_cx):
        """Quadro de pacote, aparado, com cx = centro do corpo (medido no quadro idle da mesma celula)."""
        cell = self.pack(d, n, kind, idx, fw)
        x0, y0, x1, y1 = bbox(cell)
        return Fr(cell[y0:y1, x0:x1], ref_cell_cx - x0)


def unshift(path, deg=75, sat=1.0, val=0.98):
    """Desfaz o deslocamento de tonalidade de make_cosmetics.py (skin floresta -> imagem original)."""
    im = Image.open(path).convert('RGBA')
    a = im.getchannel('A')
    hsv = np.array(im.convert('RGB').convert('HSV')).astype(np.float32)
    hsv[..., 0] = (hsv[..., 0] - deg / 360.0 * 255.0) % 255.0
    hsv[..., 1] = np.clip(hsv[..., 1] / sat, 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] / val, 0, 255)
    rgb = Image.fromarray(np.round(hsv).astype(np.uint8), 'HSV').convert('RGB').convert('RGBA')
    rgb.putalpha(a)
    return np.array(rgb)


# ----------------------------------------------------------------------------- receitas por personagem


def recipe_recovered(S, c):
    out = {}
    for p in POSES:
        out[p] = unshift(os.path.join(S.repo, 'assets', 'skins', c, 'floresta', f'{p}.png'))
    return out, {p: 'original (recuperado da skin floresta)' for p in POSES}


def recipe_dogking(S):
    d, n = 'DogKing', 'EvilDog'
    idle0 = S.pack(d, n, 'Idle', 0, 32)
    ix0, _, ix1, _ = bbox(idle0)
    cx = (ix0 + ix1) / 2.0
    F = lambda kind, i, fw: S.pack_frame(d, n, kind, i, fw, cx)
    f = {'idle': F('Idle', 0, 32), 'walk1': F('Run', 1, 48), 'walk2': F('Run', 2, 48), 'walk3': F('Run', 3, 48),
         'dash': F('Run', 4, 48), 'flash': F('Attack', 1, 48), 'strong': F('Attack', 4, 48)}
    f['dash'] = fx_speed(f['dash'], 1, random.Random(11), n=4)
    src = {'idle': 'pacote EvilDog Idle[0]', 'walk1': 'EvilDog Run[1]', 'walk2': 'EvilDog Run[2]', 'walk3': 'EvilDog Run[3]',
           'dash': 'EvilDog Run[4] + riscos de velocidade (gerado)', 'flash': 'EvilDog Attack[1]', 'strong': 'EvilDog Attack[4]'}
    return f, src


def recipe_tank(S):
    d, n = 'Tank', 'TankDog'
    idle0 = S.pack(d, n, 'Idle', 0, 48)
    ix0, _, ix1, _ = bbox(idle0)
    cx = (ix0 + ix1) / 2.0
    runcx = (bbox(S.pack(d, n, 'Run', 0, 32))[0] + bbox(S.pack(d, n, 'Run', 0, 32))[2]) / 2.0
    f = {'idle': S.pack_frame(d, n, 'Idle', 0, 48, cx), 'walk1': S.pack_frame(d, n, 'Run', 1, 32, runcx),
         'walk2': S.pack_frame(d, n, 'Run', 2, 32, runcx), 'walk3': S.pack_frame(d, n, 'Run', 3, 32, runcx),
         'dash': S.pack_frame(d, n, 'Run', 4, 32, runcx), 'flash': S.pack_frame(d, n, 'Attack', 1, 64, cx),
         'strong': S.pack_frame(d, n, 'Attack', 3, 64, cx)}
    f['dash'] = fx_speed(lean(f['dash'], 0.1), 1, random.Random(12), n=4)
    src = {'idle': 'pacote TankDog Idle[0]', 'walk1': 'TankDog Run[1]', 'walk2': 'TankDog Run[2]', 'walk3': 'TankDog Run[3]',
           'dash': 'TankDog Run[4] + riscos (gerado)', 'flash': 'TankDog Attack[1]', 'strong': 'TankDog Attack[3]'}
    return f, src


def dragon_set(frames_list, pal, rng, k=1, scale_up=1):
    """frames_list: dict nome -> RGBA 178x202 (quadros reais de bater de asas)."""
    f = {p: Fr(frames_list[p].copy(), frames_list[p].shape[1] / 2.0) for p in BODY}
    f['dash'] = fx_ghost(fx_speed(f['dash'], 3, rng, n=4), 40)
    f['strong'] = fx_arc(f['strong'], 3, pal, 0.9, 0.55)
    return f


def recolor(a, hue_deg, sat, val):
    im = Image.fromarray(a)
    al = im.getchannel('A')
    hsv = np.array(im.convert('RGB').convert('HSV')).astype(np.float32)
    hsv[..., 0] = (hsv[..., 0] + hue_deg / 360.0 * 255.0) % 255.0
    hsv[..., 1] = np.clip(hsv[..., 1] * sat, 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] * val, 0, 255)
    rgb = Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB').convert('RGBA')
    rgb.putalpha(al)
    return np.array(rgb)


def recipe_green(S):
    R = lambda n: rgba(S.p('green-dragon', f'f{n}.png'))
    up_, glide, down, mid = R(89417824), R(89415840), R(89416288), R(89418176)
    fr = {'idle': glide, 'walk1': up_, 'walk2': mid, 'walk3': down, 'dash': glide, 'flash': down, 'strong': up_}
    src = {'idle': 'quadro real (planando)', 'walk1': 'quadro real (asas p/ cima)', 'walk2': 'quadro real (asas a meio)',
           'walk3': 'quadro real (asas p/ baixo)', 'dash': 'quadro real + riscos (gerado)', 'flash': 'quadro real (asas p/ baixo)',
           'strong': 'quadro real (asas p/ cima) + arco (gerado)'}
    return fr, src


def recipe_ice(S):
    R = lambda n: rgba(S.p('ice-dragon', f'f{n}.png'))
    up_, glide, down = R(77864256), R(89433248), R(89441400)
    glide2 = R(89439168)
    fr = {'idle': up_, 'walk1': glide, 'walk2': down, 'walk3': glide2, 'dash': glide, 'flash': down, 'strong': up_}
    src = {'idle': 'quadro real (asas p/ cima)', 'walk1': 'quadro real (planando)', 'walk2': 'quadro real (asas p/ baixo)',
           'walk3': 'quadro real (planando 2)', 'dash': 'quadro real + riscos (gerado)', 'flash': 'quadro real (asas p/ baixo)',
           'strong': 'quadro real (asas p/ cima) + arco (gerado)'}
    return fr, src


def mono_base(path, k_small=None, soften=None, flip=False):
    a = rgba(path)
    a = trim(a)
    if soften:
        a = smooth(a, soften[0], soften[1])
    return a[:, ::-1].copy() if flip else a


# ----------------------------------------------------------------------------- principal


def write_set(out_dir, name, imgs, origin):
    d = os.path.join(out_dir, name)
    os.makedirs(d, exist_ok=True)
    for p in POSES:
        Image.fromarray(imgs[p]).save(os.path.join(d, f'{p}.png'), optimize=True)
    return {p: [imgs[p].shape[1], imgs[p].shape[0]] for p in POSES}, origin


def build_all(src_root, repo, out, only=None):
    S = Src(src_root, repo)
    sizes, origins = {}, {}

    def want(n):
        return only is None or n in only

    def add(name, imgs, origin):
        sizes[name], origins[name] = write_set(out, name, imgs, origin)

    # ---- modelos exatos
    for c in ('dogge', 'gadigago'):
        if want(c):
            imgs, org = recipe_recovered(S, c)
            add(c, imgs, org)

    # ---- pacotes Doggo
    if want('dogking'):
        f, org = recipe_dogking(S)
        add('dogking', finalize_set(f, 4, fireball(344, 334, SHADOW, 3)), {**org, 'ult': 'gerado (bola de energia sombria)'})
    if want('tank_fighter'):
        f, org = recipe_tank(S)
        add('tank_fighter', finalize_set(f, 4, fireball(477, 429, FIRE, 4)), {**org, 'ult': 'gerado (bola de fogo)'})
    if want('footman'):
        cell = S.pack('Footman', 'FootmanDog', 'Idle', 0, 32)
        a = up(trim(cell), 4)
        add_one = {p: a for p in POSES}
        sizes['footman'] = {'idle': [a.shape[1], a.shape[0]]}
        os.makedirs(os.path.join(out, 'footman'), exist_ok=True)
        Image.fromarray(a).save(os.path.join(out, 'footman', 'idle.png'), optimize=True)
        origins['footman'] = {'idle': 'pacote FootmanDog Idle[0] x4 (retrato)'}
    if want('tank'):
        cell = S.pack('Tank', 'TankDog', 'Idle', 0, 48)
        a = up(trim(cell), 4)
        os.makedirs(os.path.join(out, 'tank'), exist_ok=True)
        Image.fromarray(a).save(os.path.join(out, 'tank', 'idle.png'), optimize=True)
        sizes['tank'] = {'idle': [a.shape[1], a.shape[0]]}
        origins['tank'] = {'idle': 'pacote TankDog Idle[0] x4 (retrato)'}

    # ---- dragoes
    if want('green_dragon'):
        fr, org = recipe_green(S)
        f = dragon_set(fr, GOLD, random.Random(21))
        add('green_dragon', finalize_set(f, 1, fireball(420, 300, TOXIC, 5), keep_canvas=True), {**org, 'ult': 'gerado (bola de veneno)'})
    if want('ice_dragon'):
        fr, org = recipe_ice(S)
        f = dragon_set(fr, ICE, random.Random(22))
        add('ice_dragon', finalize_set(f, 1, fireball(420, 300, ICE, 6), keep_canvas=True), {**org, 'ult': 'gerado (bola de gelo)'})
    # ---- desenhados do zero
    def drawn(name, k, theme, ult_wh, seed, crop_bottom=True):
        frames = {p: legacy_chars.DRAWERS[name](p) for p in BODY}
        if crop_bottom:  # pes na ultima linha do quadro
            last = max(int(np.where(f[..., 3].any(axis=1))[0].max()) for f in frames.values())
            frames = {p: f[:last + 1] for p, f in frames.items()}
            # o pe de apoio de cada pose encosta na base do quadro (o arranque e um salto: fica como foi desenhado)
            for pz, f in list(frames.items()):
                low = int(np.where(f[..., 3].any(axis=1))[0].max())
                if pz != 'dash' and low < f.shape[0] - 1:
                    sh = f.shape[0] - 1 - low
                    g = np.zeros_like(f)
                    g[sh:] = f[:f.shape[0] - sh]
                    frames[pz] = g
        imgs = {p: up(f, k) for p, f in frames.items()}
        imgs['ult'] = fireball(ult_wh[0], ult_wh[1], theme, seed)
        org = {p: 'desenhado do zero por codigo (tools/legacy_chars.py)' for p in BODY}
        org['ult'] = 'gerado (bola de energia)'
        add(name, imgs, org)

    if want('orc'):
        drawn('orc', 4, TOXIC, (455, 433), 31)
    if want('soldier'):
        drawn('soldier', 4, ICE, (290, 319), 32)
    if want('mystic'):
        drawn('mystic', 3, SHADOW, (420, 300), 34)
    if want('shadow_dragon'):
        drawn('shadow_dragon', 4, SHADOW, (420, 300), 7, crop_bottom=False)

    # ---- retratos de NPC (uma imagem so)
    for (folder, name), fn in legacy_chars.PORTRAITS.items():
        if want(folder):
            a_ = up(fn(), 4)
            os.makedirs(os.path.join(out, folder), exist_ok=True)
            Image.fromarray(a_).save(os.path.join(out, folder, f'{name}.png'), optimize=True)
            sizes.setdefault(folder, {})[name] = [a_.shape[1], a_.shape[0]]
            origins.setdefault(folder, {})[name] = 'retrato desenhado do zero por codigo (tools/legacy_chars.py)'

    # ---- uma imagem-base + poses geradas
    def single(name, base, k, pal, ult_wh, seed, u, note, style='legs'):
        rng = random.Random(seed)
        f = body_set(base, u, rng, pal, style=style)
        ult = fireball(ult_wh[0], ult_wh[1], pal, seed)
        origin = {'idle': note}
        origin.update({p: f'{note} + pose gerada por codigo' for p in BODY[1:]})
        origin['ult'] = 'gerado (bola de energia)'
        add(name, finalize_set(f, k, ult), origin)


    if want('ninja'):
        base = trim(rgba(S.p('f1842528.png')))
        single('ninja', base, 1, SHADOW, (420, 300), 33, 4, 'imagem solta f1842528 (encapuzado)', style='robe')
    if want('cara_tranquilo'):
        a = trim(rgba(S.p('f80303424.png')))
        base = nn(a, a.shape[1] // 2, a.shape[0] // 2)
        single('cara_tranquilo', base, 1, GOLD, (420, 300), 35, 3, 'imagem solta f80303424 (cara tranquilo), reduzida a 50%')
    if want('troll_face'):
        a = trim(rgba(S.p('f89000160.png')))
        base = smooth(a, a.shape[1] * 0.6, a.shape[0] * 0.6)
        single('troll_face', base, 1, GOLD, (420, 300), 36, 4, 'imagem solta f89000160 (troll face), reduzida a 60%')

    meta = {'sizes': sizes, 'origem': origins}
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, 'ORIGEM.json'), 'w', encoding='utf-8') as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=1)
    return meta


def aspects_block(sizes):
    lines = []
    for c, d in sizes.items():
        if len(d) < 8:
            continue
        lines.append(f'  {c}: {{')
        for p in POSES:
            w, h = d[p]
            lines.append(f'    {p}: {w} / {h},')
        lines.append('  },')
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, help='pasta legacy-sprites enviada (a que tem dogge/, gadigago/, Doggo/...)')
    ap.add_argument('--repo', default=os.getcwd())
    ap.add_argument('--out', default=None)
    ap.add_argument('--only', default=None)
    ap.add_argument('--aspects', action='store_true')
    a = ap.parse_args()
    out = a.out or os.path.join(a.repo, 'assets', 'legacy-sprites')
    only = set(a.only.split(',')) if a.only else None
    meta = build_all(a.src, a.repo, out, only)
    if a.aspects:
        print(aspects_block(meta['sizes']))
    else:
        print('ok:', ', '.join(f'{k}({len(v)})' for k, v in meta['sizes'].items()))


if __name__ == '__main__':
    main()
