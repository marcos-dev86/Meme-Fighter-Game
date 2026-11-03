"""Personagens desenhados por codigo com tools/legacy_draw.py: orc, soldier, mystic, dragao sombrio e retratos de NPC.
Cada draw_* devolve um dict pose -> RGBA (grade baixa). Quem amplia (x k) e salva e tools/make_legacy_sprites.py."""
import math
import random

import numpy as np

from legacy_draw import POSE, Pix, Rig, ik2, over, polar, rgb, shade

POSE_NAMES = ['idle', 'walk1', 'walk2', 'walk3', 'dash', 'flash', 'strong']


def _fx_arc(W, H, center, r, a0, a1, thick, cols, S=8):
    """Meia-lua de corte (camadas hot/mid/core), sem contorno."""
    p = Pix(W, H, S)
    for k, c in enumerate(cols):
        t = thick * (1 - 0.30 * k)
        pts = []
        n = 22
        for i in range(n + 1):
            a = a0 + (a1 - a0) * i / n
            pts.append(polar(center, a, r))
        for i in range(n, -1, -1):
            a = a0 + (a1 - a0) * i / n
            taper = math.sin(math.pi * i / n)
            pts.append(polar(center, a, r - t * (0.15 + 0.85 * taper)))
        p.poly(pts, c)
    return p.finish(outline=False, bevel=False)


def _fx_burst(W, H, c, r, cols, spikes=8, S=8):
    p = Pix(W, H, S)
    for k, col in enumerate(cols):
        pts = []
        sc = 1 - 0.38 * k
        for i in range(spikes * 2):
            a = 360 * i / (spikes * 2)
            pts.append(polar(c, a, r * sc * (1.0 if i % 2 == 0 else 0.42)))
        p.poly(pts, col)
    return p.finish(outline=False, bevel=False)


def _speed(arr, rng, y0, y1, x_from, n=5, length=(14, 30)):
    for i in range(n):
        y = int(y0 + (y1 - y0) * (i + 0.5) / n + rng.randint(-1, 1))
        ln = rng.randint(*length)
        xe = int(x_from(y)) - 2
        col = (238, 242, 252, 235) if i % 2 == 0 else (46, 48, 66, 235)
        if 0 <= y < arr.shape[0]:
            arr[y, max(0, xe - ln):max(0, xe)] = col
    return arr


def _limb(p, a, j, e, w, c, w2=None):
    p.line(a, j, w, c)
    p.line(j, e, w2 or w * 0.9, c)


# ============================================================================== ORC

def draw_orc(name, seed=1):
    rng = random.Random(seed + hash(name) % 97)
    W, H = 76, 62
    rig = Rig(G=59, cx=38, L=17, T=14.5, UA=8.6, FA=8.6, TH=9.4, SH=9.4)
    po = dict(POSE[name])
    if name in ('walk1', 'walk2', 'walk3'):  # corpo mais agachado e pesado
        po['lean'] += 2
    po['wa'] = {'idle': -48, 'walk1': -24, 'walk2': -40, 'walk3': -58}.get(name, po['wa'])
    pts = rig.solve(po)
    skin, skin_d, skin_l = rgb('#6f9f3a'), rgb('#4d7a28'), rgb('#98c455')
    lea, lea_d, lea_l = rgb('#6b4a2b'), rgb('#4a301c'), rgb('#8f6a40')
    cloth = rgb('#5a2f2a')
    iron, wood = rgb('#8b909c'), rgb('#7a5632')
    p = Pix(W, H)
    hip, sh = pts['hip'], pts['shoulder']
    ta = pts['trunk_ang']

    def leg(side, col):
        _limb(p, hip, pts['knee_' + side], pts['foot_' + side], 6.2, col, 5.4)
        f = pts['foot_' + side]
        p.ell(f[0] + 2.2, f[1] - 0.8, 4.2, 2.6, lea_d)  # bota/pe
    leg('b', skin_d)
    # braco de tras
    _limb(p, sh, pts['elbow_b'], pts['hand_b'], 5.2, skin_d, 4.6)
    p.ell(pts['hand_b'][0], pts['hand_b'][1], 3.1, 3.1, skin_d)
    # tronco
    mid = ((hip[0] + sh[0]) / 2, (hip[1] + sh[1]) / 2)
    p.rell(mid[0] + 1, mid[1], 8.4, 10.2, ta, skin)
    p.rell(mid[0] + 3.2, mid[1] + 3.2, 5.0, 6.6, ta, skin_l)  # barriga
    # peitoral de couro com tira
    p.rell(mid[0] + 0.5, mid[1] - 2.2, 6.0, 8.4, ta, lea)
    p.line(polar(sh, 180, 5.5), polar(hip, -20, 4.5), 2.6, lea_l)
    p.line((hip[0] - 7, hip[1] - 1.5), (hip[0] + 8, hip[1] - 1.5), 2.8, lea_d)  # cinto
    p.ell(hip[0] + 1.2, hip[1] - 1.5, 1.7, 1.7, iron)
    # tanga
    p.poly([(hip[0] - 6, hip[1] - 0.5), (hip[0] + 7, hip[1] - 0.5), (hip[0] + 5 + po['lean'] * 0.1, hip[1] + 7), (hip[0] - 4, hip[1] + 6.5)], cloth)
    leg('f', skin)
    # cabeca
    hx, hy = sh[0] + 3.6 + po['lean'] * 0.12, sh[1] - 3.6
    jaw_open = 2.2 if name in ('flash', 'strong', 'dash') else 0.0
    p.poly([(hx - 5.5, hy - 1.5), (hx - 12.5, hy - 5.8), (hx - 7.5, hy + 2.5)], skin)  # orelha
    p.poly([(hx - 5.4, hy - 6.4), (hx - 1.0, hy - 10.4), (hx + 3.0, hy - 6.8)], rgb('#241a1a'))  # moicano
    p.ell(hx, hy, 7.6, 6.8, skin)
    if jaw_open:
        p.ell(hx + 2.5, hy + 4.3 + jaw_open, 5.3, 2.9, rgb('#2a0f12'))
    p.ell(hx + 2.4, hy + 4.3 + jaw_open * 1.1, 5.4, 3.0, skin_d)  # mandibula
    p.poly([(hx + 1.6, hy + 3.3), (hx + 3.0, hy + 3.3), (hx + 2.2, hy - 0.3 + jaw_open * 0.3)], rgb('#f1ecdc'))  # presa
    p.poly([(hx + 5.0, hy + 3.3), (hx + 6.4, hy + 3.3), (hx + 5.9, hy + 0.2 + jaw_open * 0.3)], rgb('#f1ecdc'))
    p.ell(hx + 7.3, hy + 0.9, 1.8, 1.5, skin_d)  # nariz
    p.line((hx + 0.8, hy - 2.4), (hx + 6.2, hy - 0.9), 1.5, rgb('#2c4a18'))  # sobrancelha
    p.ell(hx + 3.7, hy + 0.2, 1.6, 1.3, rgb('#ff2a1c'))  # olho vermelho
    p.ell(hx + 4.2, hy + 0.2, 0.6, 0.6, rgb('#1a0505'))
    # braco da frente (punho nu: o jogo usa os itens do proprio inventario)
    wa = po['wa']
    hand = pts['hand_f']
    _limb(p, sh, pts['elbow_f'], hand, 5.6, skin, 5.0)
    el = pts['elbow_f']
    p.line((el[0] + (hand[0] - el[0]) * 0.45, el[1] + (hand[1] - el[1]) * 0.45), (hand[0] - (hand[0] - el[0]) * 0.1, hand[1] - (hand[1] - el[1]) * 0.1), 5.2, lea_d)  # bracadeira
    p.ell(hand[0], hand[1], 3.9, 3.7, skin)  # punho fechado
    p.line((hand[0] - 1.4, hand[1] - 1.0), (hand[0] + 2.4, hand[1] - 1.0), 0.8, skin_d)
    p.line((hand[0] - 1.4, hand[1] + 0.4), (hand[0] + 2.4, hand[1] + 0.4), 0.8, skin_d)
    p.ell(sh[0] + 0.5, sh[1] + 1.2, 5.0, 4.0, lea)  # ombreira
    p.poly([(sh[0] - 1.5, sh[1] - 1.8), (sh[0] + 0.8, sh[1] - 6.2), (sh[0] + 2.6, sh[1] - 1.6)], iron)
    lo = p.finish()
    # efeitos
    if name == 'dash':
        lo = _speed(lo, rng, 14, 55, lambda y: 14, n=6)
    if name == 'flash':
        b = _fx_burst(W, H, (hand[0] + 8, hand[1]), 6.5, [rgb('#fff3a0'), rgb('#ffffff')])
        lo = over(lo, b)
    if name == 'strong':
        a = _fx_arc(W, H, (sh[0] + 1, sh[1] + 1), 21, -125, 8, 7.5, [rgb('#d8f08a'), rgb('#f3ffd0'), rgb('#ffffff')])
        lo = over(a, lo)  # o arco fica ATRAS do orc e da clava
    return lo



# ============================================================================== SOLDIER

def draw_soldier(name, seed=2):
    rng = random.Random(seed + hash(name) % 97)
    W, H = 76, 68
    rig = Rig(G=64, cx=38, L=19, T=16.5, UA=9.2, FA=9.2, TH=10.4, SH=10.4)
    po = dict(POSE[name])
    po['wa'] = {'idle': -74, 'walk1': -38, 'walk2': -56, 'walk3': -80}.get(name, po['wa'])
    pts = rig.solve(po)
    st, st_d, st_l = rgb('#9aa8b8'), rgb('#5d6b7c'), rgb('#d4deea')
    rd, rd_d = rgb('#a8323a'), rgb('#74202a')
    br, br_d = rgb('#6b4a2b'), rgb('#44301c')
    gold, skin = rgb('#d9b44a'), rgb('#e8b98a')
    wood = rgb('#8a5a30')
    p = Pix(W, H)
    hip, sh, ta = pts['hip'], pts['shoulder'], pts['trunk_ang']

    def leg(side, col):
        _limb(p, hip, pts['knee_' + side], pts['foot_' + side], 5.6, col, 4.8)
        f = pts['foot_' + side]
        p.ell(f[0] + 2.0, f[1] - 0.9, 4.0, 2.4, br_d)
    leg('b', st_d)
    # cachecol vermelho ao vento (atras)
    wind = -4 - po['lean'] * 0.35
    neck = (sh[0] - 1, sh[1] - 1.5)
    p.poly([(neck[0], neck[1] - 1.5), (neck[0], neck[1] + 2.5), (neck[0] + wind * 1.6, neck[1] + 7 + wind * 0.2), (neck[0] + wind * 2.2, neck[1] + 2)], rd_d)
    # braco de tras + escudo
    _limb(p, sh, pts['elbow_b'], pts['hand_b'], 4.6, st_d, 4.1)
    mid = ((hip[0] + sh[0]) / 2, (hip[1] + sh[1]) / 2)
    p.rell(mid[0], mid[1], 8.6, 7.4, ta, rd)  # tunica
    p.rell(mid[0] + 0.8, mid[1] - 1.2, 7.2, 6.8, ta, st)  # peitoral
    p.rell(mid[0] + 2.2, mid[1] - 2.4, 3.8, 4.2, ta, st_l)
    p.line((hip[0] - 6.5, hip[1] - 1.0), (hip[0] + 6.5, hip[1] - 1.0), 2.8, br)
    p.rect(hip[0] - 1.2, hip[1] - 2.4, hip[0] + 1.6, hip[1] + 0.4, gold)
    # saia da tunica
    p.poly([(hip[0] - 6.5, hip[1]), (hip[0] + 7.0, hip[1]), (hip[0] + 8.5 + po['lean'] * 0.1, hip[1] + 8.5), (hip[0] - 7.5, hip[1] + 8.0)], rd)
    p.poly([(hip[0] - 7.5, hip[1] + 8.0), (hip[0] + 8.5 + po['lean'] * 0.1, hip[1] + 8.5), (hip[0] + 8.5, hip[1] + 9.8), (hip[0] - 7.5, hip[1] + 9.4)], rd_d)
    leg('f', st)
    hb = pts['hand_b']
    p.ell(hb[0], hb[1], 3.0, 2.9, st_d)  # manopla de tras
    # cabeca: elmo de aco
    hx, hy = sh[0] + 2.6 + po['lean'] * 0.1, sh[1] - 6.2
    plume_w = -5 - po['lean'] * 0.25
    p.poly([(hx - 1, hy - 5), (hx + 3, hy - 7.5), (hx + plume_w, hy - 6), (hx + plume_w * 1.6, hy - 1.5), (hx + plume_w * 0.9, hy - 3.5), (hx - 3, hy - 2)], rd)
    p.ell(hx, hy, 6.8, 6.6, st)
    p.poly([(hx - 6.6, hy + 0.5), (hx + 6.4, hy + 0.5), (hx + 6.0, hy + 5.8), (hx - 1.0, hy + 6.4), (hx - 5.8, hy + 4.0)], st)
    p.ell(hx + 2.8, hy + 1.8, 3.5, 3.9, skin)
    p.ell(hx + 3.6, hy + 0.9, 0.9, 0.9, rgb('#241616'))
    p.line((hx + 4.4, hy - 4.8), (hx + 4.4, hy + 3.4), 1.6, st_d)  # protecao do nariz
    p.line((hx - 6.4, hy - 0.4), (hx + 6.3, hy - 0.4), 1.2, gold)  # friso dourado
    p.ell(hx - 1.5, hy - 3.6, 2.6, 1.9, st_l)
    # braco da frente (manopla nua: sem espada/escudo, o jogo usa os itens do inventario)
    wa = po['wa']
    hand = pts['hand_f']
    _limb(p, sh, pts['elbow_f'], hand, 5.0, st, 4.4)
    p.ell(sh[0] + 0.4, sh[1] + 0.8, 4.6, 3.8, st_l)  # ombreira
    p.ell(hand[0], hand[1], 3.4, 3.2, st_d)  # manopla fechada
    p.line((hand[0] - 1.2, hand[1] - 0.8), (hand[0] + 2.0, hand[1] - 0.8), 0.7, st_l)
    lo = p.finish()
    if name == 'dash':
        lo = _speed(lo, rng, 18, 60, lambda y: 14, n=6)
    if name == 'flash':
        lo = over(lo, _fx_burst(W, H, (hand[0] + 8, hand[1]), 6.0, [rgb('#bfe6ff'), rgb('#ffffff')]))
    if name == 'strong':
        a = _fx_arc(W, H, (sh[0] + 1, sh[1] + 1), 25, -128, 14, 7.5, [rgb('#9fd6ff'), rgb('#e4f6ff'), rgb('#ffffff')])
        lo = over(a, lo)
    return lo


# ============================================================================== MYSTIC

def draw_mystic(name, seed=3):
    rng = random.Random(seed + hash(name) % 97)
    W, H = 76, 92
    rig = Rig(G=88, cx=38, L=24, T=23, UA=10.5, FA=10.5, TH=13, SH=13)
    po = dict(POSE[name])
    po['ff'] = (po['ff'][0] * 0.42, po['ff'][1] * 0.7)  # pes perto da barra (o manto cobre as pernas)
    po['fb'] = (po['fb'][0] * 0.42, po['fb'][1] * 0.7)
    pts = rig.solve(po)
    nav, nav_d, nav_l = rgb('#252a44'), rgb('#141829'), rgb('#3a4064')
    trim, trim_d = rgb('#8a2f5c'), rgb('#5a1f3c')
    bone, bone_d = rgb('#e2ddd2'), rgb('#aaa497')
    pink, pink_d = rgb('#ff6fb0'), rgb('#c2307c')
    wood = rgb('#4a3322')
    p = Pix(W, H)
    hip, sh, ta = pts['hip'], pts['shoulder'], pts['trunk_ang']
    G = rig.G
    sway = (pts['foot_f'][0] + pts['foot_b'][0] - 2 * hip[0]) * 0.28 - po['lean'] * 0.35
    hem_y = G - 1.0 + (0 if name != 'walk2' else -2)
    # barra irregular
    left, right = hip[0] - 10.5 + sway, hip[0] + 12.0 + sway
    n = 7
    hem = []
    for i in range(n + 1):
        x = left + (right - left) * i / n
        y = hem_y + (2.4 if i % 2 == 0 else -2.2) + (1.2 if name in ('walk1', 'walk3') and i % 2 else 0)
        hem.append((x, y))
    # botas aparecendo sob a barra
    for sd in ('b', 'f'):
        f = pts['foot_' + sd]
        p.ell(f[0] + 1.8, min(G - 1.0, f[1]) - 0.6, 3.6, 2.0, rgb('#120d1a'))
    # braco de tras
    _limb(p, sh, pts['elbow_b'], pts['hand_b'], 5.6, nav_d, 5.0)
    p.ell(pts['hand_b'][0], pts['hand_b'][1], 2.5, 2.5, bone_d)
    # manto
    p.poly([(sh[0] - 7.4, sh[1] - 1.5), (sh[0] + 6.6, sh[1] - 1.5), (sh[0] + 7.8, sh[1] + 9)] + [(x + (sway * 0.0), y) for x, y in reversed(hem)] + [(sh[0] - 8.0, sh[1] + 9)], nav)
    p.poly([(sh[0] - 4.5, sh[1] + 2), (sh[0] + 1.5, sh[1] + 2), (hip[0] + 4 + sway * 0.6, hem_y), (hip[0] - 4 + sway * 0.6, hem_y)], nav_d)  # dobra central
    p.poly([(hem[0][0], hem[0][1] - 5.5), (hem[-1][0], hem[-1][1] - 5.5), (hem[-1][0], hem[-1][1] - 3.0), (hem[0][0], hem[0][1] - 3.0)], trim_d)  # faixa do bordado
    p.path([(x, y - 4.2) for x, y in hem], 1.2, trim)
    p.line((sh[0] - 7, sh[1] + 1), (hip[0] - 9 + sway, hem_y - 6), 1.4, nav_l)
    # cabeca/capuz
    hx, hy = sh[0] + 2.6 + po['lean'] * 0.15, sh[1] - 5.8
    p.poly([(hx - 7.5, hy - 2), (hx - 15 - po['lean'] * 0.2, hy - 11), (hx - 2.5, hy - 8.2)], nav)  # ponta do capuz
    p.ell(hx, hy, 8.2, 8.6, nav)
    p.ell(hx + 2.8, hy + 0.5, 5.9, 6.8, rgb('#07080f'))
    p.line((hx - 8.0, hy + 5.6), (hx + 5.0, hy + 7.4), 1.6, trim)  # barra do capuz
    # mascara de peste com bico
    p.ell(hx + 3.4, hy + 0.2, 4.3, 5.2, bone)
    p.poly([(hx + 5.8, hy - 0.6), (hx + 15.5, hy + 5.2), (hx + 7.6, hy + 4.6)], bone)
    p.poly([(hx + 8.4, hy + 1.2), (hx + 15.5, hy + 5.2), (hx + 9.2, hy + 3.6)], bone_d)
    p.ell(hx + 3.8, hy - 1.0, 2.5, 2.5, rgb('#2a1a30'))
    p.ell(hx + 3.8, hy - 1.0, 1.7, 1.7, pink)
    p.ell(hx + 4.2, hy - 1.5, 0.6, 0.6, rgb('#ffffff'))
    # braco da frente (maos nuas: o poder vem do efeito de energia, nao de um item)
    wa = po['wa']
    hand = pts['hand_f']
    _limb(p, sh, pts['elbow_f'], hand, 5.8, nav, 5.2)
    p.ell(sh[0] + 0.6, sh[1] + 0.8, 4.5, 3.7, nav_l)
    p.ell(hand[0], hand[1], 2.9, 2.9, bone)
    p.line((hand[0] + 0.6, hand[1] - 0.2), (hand[0] + 3.4, hand[1] + 0.8), 1.3, bone)  # dedos abertos
    lo = p.finish()
    if name == 'dash':
        lo = _speed(lo, rng, 24, 80, lambda y: 12, n=7)
    if name == 'flash':
        lo = over(lo, _fx_burst(W, H, (hand[0] + 9, hand[1]), 7.5, [rgb('#ff9ccd'), rgb('#ffffff')]))
    if name == 'strong':
        a = _fx_arc(W, H, (sh[0] + 1, sh[1] + 1), 27, -128, 30, 8, [rgb('#d36bff'), rgb('#f0b6ff'), rgb('#ffffff')])
        lo = over(a, lo)
    return lo



# ============================================================================== DRAGAO SOMBRIO

def _wing(p, S, ang, A, fingers, mem, bone, vein):
    wrist = polar(S, ang, A)
    tips = [polar(wrist, ang + da, L) for da, L in fingers]
    pts = [S, wrist]
    for i, t in enumerate(tips):
        pts.append(t)
        if i < len(tips) - 1:
            n = tips[i + 1]
            m = ((t[0] + n[0]) / 2, (t[1] + n[1]) / 2)
            pts.append((m[0] + (wrist[0] - m[0]) * 0.30, m[1] + (wrist[1] - m[1]) * 0.30))
    pts.append((S[0] - 17, S[1] + 15))
    p.poly(pts, mem)
    for t in tips:
        p.line(wrist, t, 1.2, vein)
    p.line(S, wrist, 2.6, bone)
    p.ell(wrist[0], wrist[1], 1.9, 1.9, bone)
    return wrist, tips


def draw_dragon(name, seed=4):
    rng = random.Random(seed + hash(name) % 97)
    W, H = 144, 104
    cx, cy = 72.0, 62.0
    mem, mem_d = rgb('#3d2766'), rgb('#271848')
    vein, bone = rgb('#7b57b8'), rgb('#b9a9d6')
    body, body_d, body_l, belly = rgb('#3b2a54'), rgb('#251a38'), rgb('#5c4283'), rgb('#7c5ba3')
    spine, horn, eye = rgb('#a070e0'), rgb('#e2dccb'), rgb('#ff3b3b')
    P = {
        'idle':   dict(wing=-124, far=-108, dy=0, head=(0, 0), jaw=0, tilt=-3, legs=0, tail=0),
        'walk1':  dict(wing=-96, far=-82, dy=-3, head=(0, -1), jaw=0, tilt=-5, legs=0, tail=1),
        'walk2':  dict(wing=-158, far=-140, dy=-1, head=(0, 0), jaw=0, tilt=-2, legs=0, tail=0),
        'walk3':  dict(wing=128, far=140, dy=3, head=(0, 1), jaw=0, tilt=0, legs=0, tail=-1),
        'dash':   dict(wing=-172, far=-160, dy=0, head=(7, 4), jaw=0, tilt=9, legs=1, tail=0),
        'flash':  dict(wing=-132, far=-118, dy=0, head=(12, 4), jaw=34, tilt=5, legs=0, tail=0),
        'strong': dict(wing=-112, far=-100, dy=-2, head=(5, -7), jaw=28, tilt=-7, legs=0, tail=0),
    }[name]
    p = Pix(W, H)
    by = cy + P['dy']
    S0 = (cx + 5, by - 9)
    fingers = [(-54, 25), (-22, 32), (9, 31), (38, 26)]
    # asa de tras
    _wing(p, (S0[0] - 3, S0[1] + 2), P['far'], 20, [(-46, 21), (-16, 27), (14, 27), (40, 21)], mem_d, rgb('#5d4690'), rgb('#4a3478'))
    # cauda
    tl = P['tail']
    tail = [(cx - 18, by + 3), (cx - 31, by + 7 + tl), (cx - 43, by + 8 + tl * 2), (cx - 54, by + 4 + tl * 2), (cx - 62, by - 2 + tl * 2)]
    p.taper(tail, 12, 3.0, body_d)
    p.poly([(cx - 60, by - 1 + tl * 2), (cx - 71, by - 8 + tl * 2), (cx - 64, by + 3 + tl * 2), (cx - 68, by + 8 + tl * 2)], spine)
    for t in range(1, 5):
        q = tail[t]
        p.poly([(q[0] - 2, q[1] - 4), (q[0], q[1] - 8), (q[0] + 2, q[1] - 4)], spine)
    # pernas
    leg_t = 1 if P['legs'] else 0
    hx0 = cx - 16
    p.path([(hx0, by + 8), (hx0 - 3, by + 17 - leg_t * 4), (hx0 + 3, by + 24 - leg_t * 9)], 5.4, body_d)
    for k in (-1, 0, 1):
        q = (hx0 + 3 + k * 2.4, by + 24 - leg_t * 9)
        p.poly([(q[0] - 1, q[1]), (q[0] + 1, q[1]), (q[0] + 1.2 + k, q[1] + 4.5)], horn)
    fx0 = cx + 16
    p.path([(fx0, by + 7), (fx0 + 3, by + 15 - leg_t * 3), (fx0 + 8, by + 21 - leg_t * 8)], 5.0, body)
    for k in (-1, 0, 1):
        q = (fx0 + 8 + k * 2.2, by + 21 - leg_t * 8)
        p.poly([(q[0] - 1, q[1]), (q[0] + 1, q[1]), (q[0] + 1.4 + k, q[1] + 4.2)], horn)
    # corpo
    p.rell(cx, by, 25.5, 11.5, P['tilt'], body)
    p.rell(cx + 1, by + 5.2, 22.0, 5.4, P['tilt'], belly)
    p.rell(cx - 2, by - 5.0, 21.0, 3.6, P['tilt'], body_l)
    # pescoco e cabeca
    hdx, hdy = P['head']
    neck = [(cx + 17, by - 2), (cx + 26, by - 8 + hdy * 0.3), (cx + 33 + hdx * 0.4, by - 15 + hdy * 0.6), (cx + 38 + hdx * 0.8, by - 21 + hdy * 0.8)]
    p.taper(neck, 13, 9.0, body)
    p.taper([(a, b + 3.4) for a, b in neck[:-1]], 6, 4, belly)
    for q in neck[:-1]:
        p.poly([(q[0] - 3, q[1] - 5), (q[0] - 1, q[1] - 9.5), (q[0] + 1.6, q[1] - 5)], spine)
    h = (cx + 40 + hdx, by - 24 + hdy)
    jaw = math.radians(P['jaw'])
    # mandibula
    jb = (h[0] - 1, h[1] + 3.2)
    jt = (jb[0] + 13.5 * math.cos(jaw), jb[1] + 13.5 * math.sin(jaw))
    p.poly([(jb[0], jb[1] - 1.8), (jt[0], jt[1] - 1.6), (jt[0] - 0.5, jt[1] + 1.6), (jb[0] - 1.0, jb[1] + 3.0)], body_d)
    if P['jaw'] > 8:
        p.poly([(jb[0] + 3, jb[1] - 1.5), (jt[0] - 1, jt[1] - 1.5), (jt[0] - 1, jt[1] + 0.2), (jb[0] + 3, jb[1] + 0.2)], rgb('#2a0818'))
        p.poly([(jt[0] - 4, jt[1] - 1.2), (jt[0] - 3, jt[1] - 4.2), (jt[0] - 2, jt[1] - 1.2)], horn)
        p.poly([(jt[0] - 8, jt[1] - 1.0), (jt[0] - 7, jt[1] - 3.6), (jt[0] - 6, jt[1] - 1.0)], horn)
    # cranio + focinho
    p.ell(h[0], h[1], 9.6, 6.6, body)
    p.poly([(h[0] + 2, h[1] - 5.2), (h[0] + 15.5, h[1] - 1.6), (h[0] + 15.0, h[1] + 3.4), (h[0] + 1, h[1] + 5.2)], body)
    p.poly([(h[0] + 6, h[1] - 3.6), (h[0] + 15.4, h[1] - 1.2), (h[0] + 6, h[1] - 0.8)], body_l)
    p.ell(h[0] + 14.2, h[1] - 0.2, 1.1, 0.9, rgb('#0e0618'))  # narina
    p.poly([(h[0] + 9.5, h[1] + 3.6), (h[0] + 10.6, h[1] + 6.4), (h[0] + 11.6, h[1] + 3.4)], horn)  # presa
    # chifres
    p.path([(h[0] - 4, h[1] - 4.5), (h[0] - 10, h[1] - 9.5), (h[0] - 17, h[1] - 8.5)], 3.6, horn)
    p.path([(h[0] - 1, h[1] - 5.6), (h[0] - 5, h[1] - 12.5), (h[0] - 10, h[1] - 14.5)], 3.0, rgb('#c9c2b0'))
    # olho brilhante
    p.ell(h[0] + 4.2, h[1] - 1.8, 2.3, 1.9, rgb('#ffd24a'))
    p.ell(h[0] + 4.6, h[1] - 1.8, 1.3, 1.5, eye)
    # asa da frente (por cima do corpo)
    _wing(p, S0, P['wing'], 24, fingers, mem, bone, vein)
    lo = p.finish()
    if name == 'dash':
        lo = _speed(lo, rng, 14, 64, lambda y: 10, n=7, length=(18, 42))
    if name == 'flash':
        lo = over(lo, _fx_burst(W, H, (h[0] + 21, h[1] + 6), 8.5, [rgb('#e7b6ff'), rgb('#ffffff')]))
    if name == 'strong':
        fl = Pix(W, H)
        mouth = (jt[0], jt[1] - 1)
        for k, (c, sc) in enumerate(((rgb('#6a1f9a'), 1.0), (rgb('#c04ae0'), 0.72), (rgb('#ffa0f0'), 0.46), (rgb('#ffffff'), 0.22))):
            L = (W - mouth[0] - 2) * (1.0 - 0.06 * k)
            half = 9.5 * sc
            pts = [(mouth[0], mouth[1] - half * 0.4)]
            n = 9
            for i in range(1, n + 1):
                x = mouth[0] + L * i / n
                wob = (3.2 if i % 2 else -2.4) * sc
                pts.append((x, mouth[1] - half * (0.4 + 0.9 * i / n) + wob * 0.4))
            pts.append((mouth[0] + L + 4, mouth[1] + 0.5))
            for i in range(n, 0, -1):
                x = mouth[0] + L * i / n
                wob = (-3.0 if i % 2 else 2.6) * sc
                pts.append((x, mouth[1] + half * (0.4 + 0.9 * i / n) + wob * 0.4))
            pts.append((mouth[0], mouth[1] + half * 0.4))
            fl.poly(pts, c)
        lo = over(lo, fl.finish(outline=False, bevel=False))
    return lo



# ============================================================================== RETRATOS DE NPC (32x32, olham de frente/3-4)

def _dots(p, pts, r, c):
    for x, y in pts:
        p.ell(x, y, r, r, c)


def portrait_hood():
    g, g_d, g_l = rgb('#2f5c33'), rgb('#1f3f23'), rgb('#4a8250')
    sk, wood = rgb('#e8b98a'), rgb('#7a4a22')
    p = Pix(32, 32)
    for dx in (0, 1.6, 3.2):  # flechas na aljava (atras)
        p.line((9 + dx, 12), (8 + dx, 5), 0.9, rgb('#c9b48a'))
        p.poly([(7.2 + dx, 5.2), (8 + dx, 3), (8.8 + dx, 5.2)], rgb('#aab2bc'))
    p.poly([(9, 13), (23, 13), (26, 29), (6, 29)], g)
    p.poly([(14, 14), (22, 14), (24, 29), (17, 29)], g_d)
    p.line((10, 14), (22, 26), 2.0, rgb('#6b4a2b'))  # alca da aljava
    p.ell(16, 10, 7.4, 7.8, g)
    p.poly([(9.5, 7), (5, 4), (8, 12)], g_d)
    p.ell(18, 11, 4.4, 5.2, rgb('#0d1a10'))
    p.ell(18.6, 12.2, 3.0, 3.6, sk)
    p.rect(15.2, 10.0, 22.2, 11.6, rgb('#3a2418'))  # sombra do capuz nos olhos
    _dots(p, [(17.6, 11.0), (20.4, 11.0)], 0.6, rgb('#ffffff'))
    p.path([(25, 7), (29, 16), (25, 26)], 1.8, wood)  # arco
    p.line((25, 7), (25, 26), 0.5, rgb('#e8e0cc'))
    p.ell(7.2, 29, 3.4, 1.8, rgb('#3a2a1c'))
    p.ell(19.5, 29.2, 3.4, 1.8, rgb('#3a2a1c'))
    return p.finish()


def portrait_monk():
    sk, rb, rb_d, rb_l = rgb('#d9b38a'), rgb('#6b4a2a'), rgb('#4a331c'), rgb('#8d6a42')
    p = Pix(32, 32)
    p.poly([(9, 14), (23, 14), (26, 29), (6, 29)], rb)
    p.poly([(13, 15), (19, 15), (21, 29), (11, 29)], rb_d)
    p.ell(9.5, 17.5, 3.4, 4.0, rb_l)
    p.ell(22.5, 17.5, 3.4, 4.0, rb_l)
    p.ell(16, 9.5, 6.2, 6.8, sk)
    p.ell(9.8, 10.2, 1.5, 2.2, sk)
    p.ell(22.2, 10.2, 1.5, 2.2, sk)
    p.path([(12.6, 9.6), (13.8, 10.4), (15.2, 9.6)], 0.9, rgb('#3a2418'))  # olhos fechados, serenos
    p.path([(17.2, 9.6), (18.4, 10.4), (19.8, 9.6)], 0.9, rgb('#3a2418'))
    p.path([(14, 13.6), (16, 14.4), (18, 13.6)], 0.9, rgb('#8a4a3a'))
    p.ell(16, 3.2, 3.0, 1.0, rgb('#f0d8b0'))  # brilho na careca
    p.ell(16, 19.4, 3.0, 2.4, sk)  # maos juntas
    p.line((8, 22), (24, 22), 1.7, rgb('#e9dcb8'))  # corda
    p.ell(18.5, 24, 1.4, 1.4, rgb('#e9dcb8'))
    p.line((18.5, 24), (18.5, 27.5), 1.2, rgb('#e9dcb8'))
    _dots(p, [(12, 15.4), (13.6, 16.4), (15, 16.8), (17, 16.8), (18.4, 16.4), (20, 15.4)], 0.8, rgb('#3a2418'))  # contas
    p.ell(11, 29.2, 3.2, 1.7, rgb('#8a6a3a'))
    p.ell(21, 29.2, 3.2, 1.7, rgb('#8a6a3a'))
    return p.finish()


def portrait_moai():
    st, st_d, st_l = rgb('#8a8a7a'), rgb('#6a6a5c'), rgb('#aaaa98')
    p = Pix(32, 32)
    p.poly([(7, 29), (25, 29), (23, 24), (9, 24)], st_d)
    p.poly([(9, 3), (23, 3), (24, 10), (22.5, 14), (23.5, 22), (21, 26), (11, 26), (8.5, 22), (9.5, 14), (8, 10)], st)
    p.poly([(9, 3), (13, 3), (11.5, 24), (9, 22)], st_l)
    p.poly([(7, 9.5), (25, 9.5), (24, 12.2), (8, 12.2)], st_d)  # arcada pesada
    p.poly([(14.4, 11), (17.6, 11), (18.6, 20.5), (13.4, 20.5)], st_l)  # nariz longo
    p.poly([(15.2, 11), (17.6, 11), (18.6, 20.5), (16.6, 20.5)], st_d)
    p.rect(8.6, 12.6, 14.2, 15.2, rgb('#14141a'))  # oculos escuros: pose sigma
    p.rect(17.8, 12.6, 23.4, 15.2, rgb('#14141a'))
    p.line((14, 13.4), (18, 13.4), 0.9, rgb('#14141a'))
    p.rect(9.2, 12.8, 11.4, 13.4, rgb('#4a5a7a'))
    p.rect(18.4, 12.8, 20.6, 13.4, rgb('#4a5a7a'))
    p.path([(12.6, 22.4), (16, 23.2), (19.4, 22.4)], 1.0, st_d)  # boca firme
    for x, y, r in ((10.4, 5.8, 1.6), (21.6, 17.5, 1.4), (11.5, 20.5, 1.2)):
        p.ell(x, y, r, r * 0.8, rgb('#5f7f3a'))  # musgo
    return p.finish()


def portrait_espinho():
    g, g_d, g_l = rgb('#6a9c4a'), rgb('#4a7a32'), rgb('#8cc26a')
    p = Pix(32, 32)
    p.ell(16, 29.2, 11, 2.2, rgb('#d8bf7a'))
    p.rell(6.5, 17, 3.0, 5.2, -15, g_d)  # bracos
    p.rell(25.5, 14, 3.0, 5.2, 15, g_d)
    p.rell(16, 17, 8.8, 11.6, 0, g)
    for x in (11.5, 16, 20.5):
        p.line((x, 8), (x, 27), 0.9, g_d)
    for x, y in ((10, 10), (22, 11), (12, 23), (21, 24), (8.5, 17), (23.5, 18), (16, 6.5)):
        p.poly([(x - 1.0, y + 0.8), (x, y - 2.0), (x + 1.0, y + 0.8)], rgb('#f3efc8'))  # espinhos
    # flor
    for a in range(0, 360, 72):
        q = polar_pt(16, 4.2, a, 2.6)
        p.ell(q[0], q[1], 1.9, 1.9, rgb('#ff6fa0'))
    p.ell(16, 4.2, 1.5, 1.5, rgb('#ffd84a'))
    # rosto emburrado
    p.ell(12.6, 14.4, 2.4, 2.6, rgb('#f4f4e4'))
    p.ell(19.4, 14.4, 2.4, 2.6, rgb('#f4f4e4'))
    _dots(p, [(13.2, 14.8), (19.8, 14.8)], 1.2, rgb('#1a1a10'))
    p.line((10.2, 11.4), (14.6, 12.6), 1.1, g_d)
    p.line((21.8, 11.4), (17.4, 12.6), 1.1, g_d)
    p.path([(13.5, 20.6), (16, 19.8), (18.5, 20.6)], 1.0, rgb('#2a3a1a'))
    return p.finish()


def polar_pt(cx, cy, ang, r):
    return (cx + r * math.cos(math.radians(ang)), cy + r * math.sin(math.radians(ang)))


def portrait_violeta():
    pu, pu_d, pu_l = rgb('#7a4ea8'), rgb('#4a2e68'), rgb('#a478d4')
    p = Pix(32, 32)
    for x, y in ((4, 6), (27, 9), (6, 24), (26, 25), (15, 2.5)):
        p.poly([(x, y - 1.6), (x + 0.6, y - 0.4), (x + 1.8, y), (x + 0.6, y + 0.4), (x, y + 1.6), (x - 0.6, y + 0.4), (x - 1.8, y), (x - 0.6, y - 0.4)], rgb('#e8d8ff'))
    p.ell(16, 16, 10.6, 11.6, pu)
    p.poly([(5.4, 20), (26.6, 20), (26.6, 28), (23, 25.4), (19.6, 29), (16, 25.4), (12.4, 29), (9, 25.4), (5.4, 28)], pu)
    p.ell(16, 13, 8.2, 8.0, pu_l)
    p.ell(11.4, 15, 3.4, 4.0, rgb('#fff6c0'))
    p.ell(20.6, 15, 3.4, 4.0, rgb('#fff6c0'))
    p.ell(12.2, 15.6, 1.9, 2.5, pu_d)
    p.ell(21.4, 15.6, 1.9, 2.5, pu_d)
    _dots(p, [(11.6, 14.2), (20.8, 14.2)], 0.7, rgb('#ffffff'))
    p.ell(16, 6.4, 2.4, 2.4, rgb('#fff6c0'))  # lua crescente na testa
    p.ell(17.2, 6.0, 2.2, 2.2, pu_l)
    p.path([(13.5, 20.8), (16, 21.8), (18.5, 20.8)], 0.9, pu_d)
    return p.finish()


def portrait_gemada():
    og, og_d, cream = rgb('#e08a3c'), rgb('#c76a1a'), rgb('#f6c98a')
    p = Pix(32, 32)
    p.ell(16, 19.4, 11.4, 9.8, og)
    p.ell(16, 21, 7.6, 6.6, cream)
    p.ell(8.2, 22, 2.6, 4.2, og_d)
    p.ell(23.8, 22, 2.6, 4.2, og_d)
    p.ell(11.5, 29.4, 3.4, 1.6, og_d)
    p.ell(20.5, 29.4, 3.4, 1.6, og_d)
    # casca de ovo como chapeu
    p.poly([(8.4, 11.4), (9.6, 7.8), (11.8, 9.6), (13.6, 5.8), (16, 9.2), (18.4, 5.8), (20.2, 9.6), (22.4, 7.8), (23.6, 11.4)], rgb('#fbf6ea'))
    p.poly([(9.6, 8.8), (11, 8.4), (10.8, 11.2), (8.8, 11.2)], rgb('#e8dfc8'))
    p.ell(11.6, 16.6, 2.4, 2.8, rgb('#1a1010'))
    p.ell(20.4, 16.6, 2.4, 2.8, rgb('#1a1010'))
    _dots(p, [(12.4, 15.6), (21.2, 15.6)], 0.9, rgb('#ffffff'))
    p.ell(8.4, 20, 1.8, 1.2, rgb('#ff8a8a'))
    p.ell(23.6, 20, 1.8, 1.2, rgb('#ff8a8a'))
    p.poly([(14.4, 19.6), (17.6, 19.6), (16, 22)], rgb('#f2b02e'))  # biquinho
    return p.finish()


def portrait_polen():
    cy_, cy_d = rgb('#4ec4c4'), rgb('#2e8a8a')
    pk, pk_l = rgb('#d88ad8'), rgb('#f0b8f0')
    p = Pix(32, 32)
    p.rell(8.6, 15, 6.4, 3.4, -28, pk_l)  # asas
    p.rell(23.4, 15, 6.4, 3.4, 28, pk_l)
    p.rell(9.6, 20.4, 4.8, 2.4, 20, pk)
    p.rell(22.4, 20.4, 4.8, 2.4, -20, pk)
    p.path([(13, 6), (11, 2.2)], 0.9, cy_d)  # antenas
    p.path([(19, 6), (21, 2.2)], 0.9, cy_d)
    p.ell(11, 2.2, 1.7, 1.7, rgb('#ffd84a'))
    p.ell(21, 2.2, 1.7, 1.7, rgb('#ffd84a'))
    p.ell(16, 20.6, 6.2, 8.2, cy_)
    for y in (18.4, 22.4, 26):
        p.rect(10.6, y - 0.9, 21.4, y + 0.9, pk)
    p.ell(16, 11.4, 7.0, 6.4, cy_)
    p.ell(13.2, 11.4, 2.3, 2.6, rgb('#ffffff'))
    p.ell(18.8, 11.4, 2.3, 2.6, rgb('#ffffff'))
    _dots(p, [(13.6, 11.8), (19.2, 11.8)], 1.1, rgb('#14323a'))
    p.path([(14.2, 14.4), (16, 15.4), (17.8, 14.4)], 0.9, rgb('#14323a'))
    _dots(p, [(5, 6), (27, 8), (4, 26), (28, 28), (16, 30.2)], 0.7, rgb('#ffe27a'))  # po de polen
    return p.finish()


def portrait_penumbra():
    sk, hair, hair_d, dress, dress_d = rgb('#c8c8d8'), rgb('#6a3f9c'), rgb('#432766'), rgb('#6a3f9c'), rgb('#432766')
    p = Pix(32, 32)
    for x, y in ((5, 8), (27, 6), (4, 21), (28, 22), (24, 28)):
        p.poly([(x, y - 1.8), (x + 0.5, y - 0.5), (x + 1.8, y), (x + 0.5, y + 0.5), (x, y + 1.8), (x - 0.5, y + 0.5), (x - 1.8, y), (x - 0.5, y - 0.5)], rgb('#efe6ff'))
    p.poly([(9, 8), (11, 28), (8, 30), (6, 22)], hair_d)  # cabelo comprido atras
    p.poly([(23, 8), (25, 22), (22.5, 30), (21, 28)], hair_d)
    p.poly([(11, 15), (21, 15), (25, 26), (23, 29), (19, 26.6), (16, 30), (13, 26.6), (9, 29), (7, 26)], dress)
    p.poly([(13, 17), (19, 17), (21, 27), (16, 25), (11, 27)], dress_d)
    p.ell(16, 10.4, 6.4, 7.0, sk)
    p.poly([(9.4, 7), (13, 3), (21, 3.6), (23, 9), (20, 8), (16.6, 8.6), (15, 12.6), (13.4, 17.6), (10.6, 14), (9.8, 10)], hair)  # franja cobre um olho
    p.ell(19.2, 11.4, 2.0, 2.4, rgb('#0e0a18'))
    p.ell(19.2, 11.4, 1.3, 1.7, rgb('#d9a8ff'))
    _dots(p, [(19.6, 10.8)], 0.5, rgb('#ffffff'))
    p.path([(17.4, 15.4), (19.2, 16.0), (20.8, 15.2)], 0.8, rgb('#7a5a8a'))
    p.ell(16, 1.6, 2.2, 1.2, rgb('#efe6ff'))  # meia lua acima
    return p.finish()


PORTRAITS = {
    ('hood', 'idle'): portrait_hood, ('monk', 'idle'): portrait_monk, ('moai', 'idle'): portrait_moai,
    ('meme-kin', 'espinho'): portrait_espinho, ('meme-kin', 'violeta'): portrait_violeta, ('meme-kin', 'gemada'): portrait_gemada,
    ('meme-kin', 'polen'): portrait_polen, ('meme-kin', 'penumbra'): portrait_penumbra,
}

DRAWERS = {'orc': draw_orc, 'soldier': draw_soldier, 'mystic': draw_mystic, 'shadow_dragon': draw_dragon}
