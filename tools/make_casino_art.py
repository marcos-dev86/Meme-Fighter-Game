#!/usr/bin/env python3
"""Pixel art do CASSINO (feita por codigo, deterministica, sem imagem pronta): fachada gigante + mesas de jogo.
  python3 tools/make_casino_art.py            (raiz do projeto)
Gera assets/buildings/nb_cassino.png (fachada 16x11 tiles) e assets/furniture/cas_*.png (mesas, caca-niquel, balcao, garrafas)."""
import os

from PIL import Image, ImageDraw

OUT = (18, 13, 24, 255)
T = (0, 0, 0, 0)
GOLD = (255, 205, 70, 255); GOLD_D = (205, 142, 32, 255); GOLD_L = (255, 238, 150, 255)
PLUM = (74, 28, 58, 255); PLUM_D = (44, 16, 38, 255); PLUM_L = (110, 48, 88, 255)
RED = (214, 48, 64, 255); RED_D = (150, 28, 44, 255)
CREAM = (250, 236, 204, 255); WHITE = (246, 246, 246, 255)
FELT = (26, 130, 78, 255); FELT_D = (16, 92, 56, 255)
WOOD = (150, 92, 44, 255); WOOD_D = (100, 58, 28, 255); WOOD_L = (190, 126, 66, 255)
PURPLE = (104, 52, 150, 255); PURPLE_D = (70, 32, 108, 255)
WARM = (255, 220, 128, 255); WARM_D = (232, 170, 70, 255)
BLUE = (60, 120, 220, 255); GREY = (150, 150, 160, 255); GREY_D = (96, 96, 108, 255)

GLYPH = {  # fonte 5x7 (so as letras que usamos)
    'C': ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'I': ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    'V': ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
    'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
}


def canvas(w, h):
    im = Image.new('RGBA', (w, h), T)
    return im, ImageDraw.Draw(im)


def rect(d, x0, y0, x1, y1, c):
    d.rectangle([x0, y0, x1, y1], fill=c)


def text(d, s, x, y, c, sc=1, gap=1, shadow=None):
    cx = x
    for ch in s:
        g = GLYPH[ch]
        for r, row in enumerate(g):
            for k, v in enumerate(row):
                if v == '#':
                    if shadow:
                        rect(d, cx + k * sc + 1, y + r * sc + 1, cx + k * sc + sc, y + r * sc + sc, shadow)
                    rect(d, cx + k * sc, y + r * sc, cx + k * sc + sc - 1, y + r * sc + sc - 1, c)
        cx += 5 * sc + gap


def outline(im, col=OUT):
    """Contorno de 1 px em volta da silhueta (como o resto dos assets)."""
    w, h = im.size
    px = im.load()
    ring = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] > 0:
                        ring.append((x, y))
                        break
    for p in ring:
        px[p] = col
    return im


def bevel(im, rect_box=None):
    """Brilho em cima/esquerda e sombra embaixo/direita nas bordas da silhueta (pixel art)."""
    w, h = im.size
    src = im.copy().load()
    px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a == 0 or (r, g, b, a) == OUT:
                continue
            up = y == 0 or src[x, y - 1][3] == 0 or src[x, y - 1] == OUT
            lf = x == 0 or src[x - 1, y][3] == 0 or src[x - 1, y] == OUT
            dn = y == h - 1 or src[x, y + 1][3] == 0 or src[x, y + 1] == OUT
            rt = x == w - 1 or src[x + 1, y][3] == 0 or src[x + 1, y] == OUT
            if up or lf:
                px[x, y] = (min(255, int(r * 1.15 + 10)), min(255, int(g * 1.15 + 10)), min(255, int(b * 1.15 + 10)), a)
            elif dn or rt:
                px[x, y] = (int(r * 0.8), int(g * 0.8), int(b * 0.8), a)
    return im


def up(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


# ----------------------------------------------------------------------------- fachada (160 x 110 -> x4 = 640 x 440, 16x11 tiles)
def facade_lowres():
    im, d = canvas(160, 110)
    # corpo principal
    rect(d, 6, 40, 153, 109, PLUM)
    for y in range(44, 108, 8):  # tijolos
        for x in range(6, 154, 12):
            off = 6 if ((y - 44) // 8) % 2 else 0
            if x + off + 10 >= 6 and x + off <= 153:
                rect(d, max(6, x + off), y, min(153, x + off + 10), y, PLUM_D)
    rect(d, 6, 36, 153, 40, GOLD_D); rect(d, 6, 36, 153, 37, GOLD)  # cornija
    rect(d, 6, 104, 153, 109, GOLD_D); rect(d, 6, 104, 153, 105, GOLD)  # base
    # torre central
    rect(d, 46, 10, 113, 40, PLUM_D)
    rect(d, 46, 10, 113, 12, GOLD); rect(d, 46, 12, 113, 13, GOLD_D)
    d.polygon([(40, 10), (80, -6), (119, 10)], fill=GOLD_D)  # frontao
    d.polygon([(48, 10), (80, -1), (111, 10)], fill=PLUM)
    d.ellipse([74, 1, 85, 12], fill=GOLD)  # medalhao
    text(d, 'O', 76, 3, RED_D, 1, 0)
    for x in (44, 114):  # pinaculos
        rect(d, x, 0, x + 2, 12, GOLD_D); d.polygon([(x - 1, 0), (x + 1, -5), (x + 3, 0)], fill=RED)
    # letreiro
    rect(d, 30, 34, 129, 62, PLUM_D)
    rect(d, 30, 34, 129, 35, GOLD); rect(d, 30, 61, 129, 62, GOLD_D); rect(d, 30, 34, 31, 62, GOLD); rect(d, 128, 34, 129, 62, GOLD_D)
    rect(d, 34, 38, 125, 58, (20, 8, 28, 255))
    text(d, 'CASSINO', 41, 41, GOLD, 2, 2, shadow=RED_D)
    for k, x in enumerate(range(32, 128, 6)):  # lampadas
        c = WARM if k % 2 == 0 else WHITE
        rect(d, x, 35, x + 1, 36, c); rect(d, x, 60, x + 1, 61, WARM if k % 2 else WHITE)
    for y in range(38, 60, 6):
        rect(d, 31, y, 32, y + 1, WARM); rect(d, 127, y, 128, y + 1, WHITE)
    # faixas neon
    rect(d, 6, 64, 153, 66, RED_D); rect(d, 6, 64, 153, 64, RED)
    rect(d, 6, 68, 153, 69, PURPLE); rect(d, 6, 68, 153, 68, PURPLE_D)
    # colunas e janelas
    for cx in (12, 40, 119, 147):
        rect(d, cx - 3, 70, cx + 3, 103, CREAM); rect(d, cx - 3, 70, cx - 2, 103, WHITE); rect(d, cx + 2, 70, cx + 3, 103, GREY)
        rect(d, cx - 4, 70, cx + 4, 72, GOLD); rect(d, cx - 4, 101, cx + 4, 103, GOLD_D)
    for wx in (19, 29, 124, 134):
        rect(d, wx - 3, 76, wx + 3, 98, GOLD_D); rect(d, wx - 2, 77, wx + 2, 97, WARM)
        rect(d, wx, 77, wx, 97, WARM_D); rect(d, wx - 2, 86, wx + 2, 86, WARM_D)
        d.ellipse([wx - 3, 73, wx + 3, 79], fill=GOLD_D)
    # portal central (porta de 3 tiles = 30 px)
    rect(d, 59, 72, 100, 109, GOLD_D); rect(d, 59, 72, 100, 73, GOLD)
    d.ellipse([60, 66, 99, 90], fill=GOLD_D)
    rect(d, 64, 80, 95, 109, WOOD_D)
    d.ellipse([64, 72, 95, 90], fill=WOOD_D)
    rect(d, 64, 82, 79, 109, WOOD); rect(d, 80, 82, 95, 109, WOOD)
    rect(d, 79, 82, 80, 109, OUT)
    for x0 in (66, 82):
        rect(d, x0, 86, x0 + 11, 100, WOOD_L); rect(d, x0 + 1, 87, x0 + 10, 99, WOOD_D)
    rect(d, 76, 96, 77, 99, GOLD); rect(d, 82, 96, 83, 99, GOLD)
    d.ellipse([68, 70, 91, 84], fill=PLUM_D)
    text(d, 'O', 76, 73, GOLD, 1, 0)
    rect(d, 66, 106, 93, 109, RED); rect(d, 66, 106, 93, 106, RED_D)  # tapete vermelho
    # bandeiras e estrelas
    for x in (14, 142):
        rect(d, x, 22, x, 36, GOLD_D); d.polygon([(x + 1, 22), (x + 10, 25), (x + 1, 28)], fill=RED)
    for sx, sy in ((26, 20), (132, 18), (20, 12), (138, 10), (60, 22), (100, 24)):
        rect(d, sx, sy, sx, sy + 2, GOLD_L); rect(d, sx - 1, sy + 1, sx + 1, sy + 1, GOLD_L)
    return im


def facade():
    return up(outline(facade_lowres()), 4)


def vault():
    """Cofre de aco (2x2 tiles): porta redonda com roda dourada."""
    im, d = canvas(32, 32)
    rect(d, 2, 3, 29, 30, GREY_D); rect(d, 3, 4, 28, 29, GREY); rect(d, 3, 4, 28, 5, WHITE)
    rect(d, 2, 28, 29, 31, (60, 60, 72, 255))
    d.ellipse([7, 8, 24, 25], fill=(74, 74, 88, 255)); d.ellipse([9, 10, 22, 23], fill=GOLD_D); d.ellipse([11, 12, 20, 21], fill=GOLD)
    for ang in range(0, 360, 60):
        import math
        x = 15.5 + math.cos(math.radians(ang)) * 7; y = 16.5 + math.sin(math.radians(ang)) * 7
        rect(d, int(x), int(y), int(x) + 1, int(y) + 1, WHITE)
    rect(d, 15, 15, 16, 18, RED_D)
    rect(d, 4, 9, 5, 12, GOLD_D); rect(d, 4, 20, 5, 23, GOLD_D)
    return outline(im)


# ----------------------------------------------------------------------------- fachada GIGANTE (176 x 66 tiles = 1760 x 660 px de arte, x2 no arquivo)
GW, GH = 1760, 660


def giant_facade():
    """O cassino inteiro visto de frente, ocupando 170 x 66 tiles: asas longas, torres de hotel, telhado com claraboias e
    o portal central (3 tiles) no meio da base. Feito por codigo, sem imagem pronta."""
    im, d = canvas(GW, GH)
    cx = GW // 2
    top = 92  # topo do corpo (acima dele so as torres e o letreiro)
    # corpo geral
    rect(d, 0, top + 150, GW - 1, GH - 1, PLUM)
    for y in range(top + 154, GH - 6, 8):
        for x in range(0, GW, 12):
            off = 6 if ((y - top - 154) // 8) % 2 else 0
            rect(d, x + off, y, min(GW - 1, x + off + 10), y, PLUM_D)
    # telhado (faixa de cima) com telhas e claraboias
    rect(d, 0, top + 40, GW - 1, top + 150, (52, 36, 70, 255))
    for y in range(top + 44, top + 148, 6):
        rect(d, 0, y, GW - 1, y, (40, 26, 56, 255))
    for x in range(40, GW - 40, 70):
        rect(d, x, top + 62, x + 36, top + 96, (70, 190, 220, 255)); rect(d, x + 2, top + 64, x + 34, top + 94, (150, 226, 240, 255))
        rect(d, x + 18, top + 64, x + 18, top + 94, (70, 190, 220, 255)); rect(d, x + 2, top + 79, x + 34, top + 79, (70, 190, 220, 255))
        rect(d, x, top + 62, x + 36, top + 63, GOLD)
    for x in range(75, GW - 60, 140):  # cupulas
        d.ellipse([x - 16, top + 100, x + 16, top + 136], fill=GOLD_D); d.ellipse([x - 12, top + 103, x + 12, top + 132], fill=GOLD)
        rect(d, x - 1, top + 90, x + 1, top + 104, GOLD_D)
    rect(d, 0, top + 36, GW - 1, top + 41, GOLD_D); rect(d, 0, top + 36, GW - 1, top + 37, GOLD)
    rect(d, 0, top + 148, GW - 1, top + 156, GOLD_D); rect(d, 0, top + 148, GW - 1, top + 149, GOLD)
    # torres de hotel nas pontas e entre as asas
    for tx in (50, 330, GW - 50 - 120, GW - 330 - 120):
        tw = 120
        rect(d, tx, 20, tx + tw, top + 40, PLUM_D)
        rect(d, tx, 20, tx + tw, 24, GOLD); rect(d, tx - 4, 16, tx + tw + 4, 20, GOLD_D)
        d.polygon([(tx - 4, 16), (tx + tw // 2, -2), (tx + tw + 4, 16)], fill=GOLD_D)
        for wy in range(32, top + 34, 14):
            for wx in range(tx + 8, tx + tw - 14, 18):
                lit = ((wx * 7 + wy * 3) // 5) % 3 != 0
                rect(d, wx, wy, wx + 9, wy + 7, WARM if lit else (36, 22, 52, 255))
    # letreiros do telhado
    def sign(x0, y0, wd, word, sc):
        rect(d, x0, y0, x0 + wd, y0 + 7 * sc + 14, PLUM_D); rect(d, x0, y0, x0 + wd, y0 + 1, GOLD); rect(d, x0, y0 + 7 * sc + 13, x0 + wd, y0 + 7 * sc + 14, GOLD_D)
        text(d, word, x0 + 8, y0 + 7, GOLD, sc, sc, shadow=RED_D)
        for k in range(x0 + 2, x0 + wd - 2, 7):
            rect(d, k, y0 - 2, k + 1, y0, WARM if (k // 7) % 2 else WHITE)
    sign(cx - 190, top - 6, 380, 'CASINO', 3)
    sign(180, top + 6, 140, 'LUCKY', 2)
    sign(GW - 320, top + 6, 140, 'VIP', 2)
    sign(cx - 390, top + 8, 96, '777', 2)
    sign(cx + 294, top + 8, 96, '777', 2)
    # base das asas: janelas, colunas, faixas neon
    rect(d, 0, top + 160, GW - 1, top + 163, RED_D); rect(d, 0, top + 160, GW - 1, top + 160, RED)
    rect(d, 0, top + 166, GW - 1, top + 167, PURPLE)
    for x in range(14, GW, 80):
        if abs(x - cx) < 190:
            continue
        rect(d, x, top + 176, x + 10, GH - 22, CREAM); rect(d, x, top + 176, x + 1, GH - 22, WHITE); rect(d, x + 9, top + 176, x + 10, GH - 22, GREY)
        rect(d, x - 2, top + 176, x + 12, top + 179, GOLD); rect(d, x - 2, GH - 24, x + 12, GH - 22, GOLD_D)
        wx = x + 30
        if wx + 26 < GW:
            rect(d, wx, top + 190, wx + 26, GH - 40, GOLD_D); rect(d, wx + 2, top + 192, wx + 24, GH - 42, WARM)
            rect(d, wx + 13, top + 192, wx + 13, GH - 42, WARM_D); rect(d, wx + 2, top + 240, wx + 24, top + 240, WARM_D); rect(d, wx + 2, top + 300, wx + 24, top + 300, WARM_D)
            d.ellipse([wx, top + 182, wx + 26, top + 204], fill=GOLD_D)
    rect(d, 0, GH - 14, GW - 1, GH - 1, GOLD_D); rect(d, 0, GH - 14, GW - 1, GH - 13, GOLD)
    # portal central: reaproveita a fachada pequena (o portal fica no centro da base e a porta de 3 tiles bate com a do mapa)
    small = facade_lowres()
    big = small.resize((small.width * 2, small.height * 2), Image.NEAREST)
    im.alpha_composite(big, (cx - big.width // 2, GH - big.height))
    # bandeiras nos cantos
    for x in (14, GW - 24):
        rect(d, x, 40, x, 100, GOLD_D); d.polygon([(x + 1, 40), (x + 14, 46), (x + 1, 52)], fill=RED)
    im = outline(im)
    return up(im, 2)


# ----------------------------------------------------------------------------- mobilia (cada uma em baixa resolucao, depois x3)
def table_base(w, h, felt, felt_d):
    im, d = canvas(w, h)
    rect(d, 1, 3, w - 2, h - 5, WOOD)  # borda de madeira
    rect(d, 1, 3, w - 2, 4, WOOD_L)
    rect(d, 3, 6, w - 4, h - 8, felt)
    rect(d, 3, h - 8, w - 4, h - 8, felt_d)
    rect(d, 4, h - 5, 7, h - 1, WOOD_D); rect(d, w - 8, h - 5, w - 5, h - 1, WOOD_D)  # pes
    rect(d, 2, h - 5, w - 3, h - 4, WOOD_D)
    return im, d


def chips(d, x, y, cols):
    for k, c in enumerate(cols):
        rect(d, x, y - k * 2, x + 3, y - k * 2 + 1, c)
        rect(d, x, y - k * 2, x + 3, y - k * 2, WHITE)


def t_roulette():
    im, d = table_base(48, 32, FELT, FELT_D)
    d.ellipse([6, 7, 22, 22], fill=WOOD_D)
    d.ellipse([8, 9, 20, 20], fill=RED)
    for k in range(8):
        a = k * 45
        import math
        x = 14 + 5.2 * math.cos(math.radians(a)); y = 14.5 + 5.2 * math.sin(math.radians(a))
        rect(d, int(x), int(y), int(x), int(y), OUT if k % 2 else WHITE)
    d.ellipse([12, 12, 16, 16], fill=GOLD)
    for r in range(3):  # grade de numeros
        for c in range(6):
            rect(d, 26 + c * 3, 8 + r * 4, 27 + c * 3, 10 + r * 4, RED if (r + c) % 2 == 0 else OUT)
    chips(d, 25, 22, [RED, GOLD]); chips(d, 40, 21, [BLUE, WHITE, RED])
    return outline(bevel(im))


def t_dice():
    im, d = table_base(48, 32, (130, 24, 44, 255), (96, 16, 34, 255))
    for x0, y0, n in ((10, 10, 5), (22, 14, 3)):
        rect(d, x0, y0, x0 + 8, y0 + 8, WHITE); rect(d, x0, y0 + 8, x0 + 8, y0 + 8, GREY); rect(d, x0 + 8, y0, x0 + 8, y0 + 8, GREY)
        pts = {5: [(1, 1), (7, 1), (4, 4), (1, 7), (7, 7)], 3: [(1, 1), (4, 4), (7, 7)]}[n]
        for px_, py_ in pts:
            rect(d, x0 + px_ - 0, y0 + py_ - 0, x0 + px_ + 1, y0 + py_ + 1, OUT)
    rect(d, 6, 22, 41, 22, GOLD_D)
    chips(d, 35, 17, [GOLD, RED, GOLD]); chips(d, 5, 20, [BLUE, WHITE])
    return outline(bevel(im))


def t_cards():
    im, d = table_base(48, 32, (24, 96, 150, 255), (16, 70, 114, 255))
    for k, (x0, col) in enumerate(((10, RED), (16, OUT), (22, RED))):
        rect(d, x0, 9 + k % 2, x0 + 9, 20 + k % 2, WHITE); rect(d, x0, 20 + k % 2, x0 + 9, 20 + k % 2, GREY)
        rect(d, x0 + 3, 12 + k % 2, x0 + 6, 16 + k % 2, col)
    rect(d, 34, 9, 41, 18, RED_D); rect(d, 35, 10, 40, 17, PLUM)  # baralho
    chips(d, 6, 22, [GOLD, GOLD]); chips(d, 40, 23, [RED, WHITE, BLUE])
    return outline(bevel(im))


def t_flip():
    im, d = table_base(48, 32, PURPLE, PURPLE_D)
    d.ellipse([16, 8, 32, 22], fill=GOLD_D); d.ellipse([17, 8, 31, 20], fill=GOLD); d.ellipse([20, 11, 28, 17], fill=GOLD_D)
    rect(d, 23, 12, 24, 16, GOLD_L)
    chips(d, 7, 21, [WHITE, RED]); chips(d, 38, 22, [GOLD, GOLD, BLUE])
    return outline(bevel(im))


def slot_machine():
    im, d = canvas(16, 32)
    rect(d, 1, 2, 14, 28, RED); rect(d, 1, 2, 14, 4, RED_D)
    rect(d, 3, 6, 12, 15, OUT); rect(d, 4, 7, 11, 14, WHITE)
    for k in range(3):
        rect(d, 4 + k * 3, 7, 5 + k * 3, 14, CREAM)
        rect(d, 4 + k * 3, 9, 5 + k * 3, 11, RED if k != 1 else GOLD_D)
    rect(d, 3, 17, 12, 22, GOLD_D); rect(d, 3, 17, 12, 17, GOLD)
    rect(d, 5, 19, 6, 20, OUT); rect(d, 9, 19, 10, 20, OUT)
    rect(d, 4, 24, 11, 26, OUT)
    rect(d, 15, 8, 15, 18, GREY_D); d.ellipse([14, 5, 17, 8], fill=RED)  # alavanca
    rect(d, 1, 28, 14, 30, WOOD_D)
    rect(d, 4, 0, 11, 2, GOLD); text(d, 'O', 6, 0, RED_D, 1, 0) if False else None
    return outline(bevel(im))


def bar_counter():
    im, d = canvas(16, 16)
    rect(d, 0, 4, 15, 15, WOOD); rect(d, 0, 4, 15, 6, WOOD_L); rect(d, 0, 13, 15, 15, WOOD_D)
    for x in (2, 8):
        rect(d, x, 8, x + 4, 12, WOOD_D); rect(d, x + 1, 9, x + 3, 11, WOOD)
    rect(d, 0, 3, 15, 4, GOLD_D)
    rect(d, 11, 0, 12, 3, (70, 190, 120, 255)); rect(d, 5, 1, 6, 3, (240, 190, 70, 255))  # copos
    return outline(bevel(im))


def bottles():
    im, d = canvas(16, 16)
    rect(d, 0, 1, 15, 3, WOOD_L); rect(d, 0, 9, 15, 11, WOOD_L); rect(d, 0, 14, 15, 15, WOOD_D)
    for k, c in enumerate(((70, 190, 120, 255), RED, GOLD, BLUE)):
        x = 1 + k * 4
        rect(d, x, 4, x + 2, 8, c); rect(d, x + 1, 3, x + 1, 3, c)
        rect(d, x, 12 - 1 if False else 5, x, 6, WHITE)
    for k, c in enumerate((RED, (70, 190, 120, 255), BLUE, GOLD)):
        x = 2 + k * 4
        rect(d, x, 12, x + 2, 13, c)
    return outline(bevel(im))


def vase():
    im, d = canvas(16, 24)
    d.ellipse([3, 14, 12, 22], fill=PURPLE); rect(d, 4, 12, 11, 14, PURPLE_D)
    rect(d, 7, 4, 8, 12, (40, 140, 70, 255)); d.ellipse([2, 3, 7, 7], fill=(60, 190, 100, 255)); d.ellipse([8, 1, 14, 6], fill=(60, 190, 100, 255))
    rect(d, 4, 20, 11, 22, GOLD_D)
    return outline(bevel(im))


def main():
    root = os.getcwd()
    os.makedirs('assets/buildings', exist_ok=True)
    os.makedirs('assets/furniture', exist_ok=True)
    facade().save('assets/buildings/nb_cassino.png')
    giant_facade().save('assets/buildings/nb_cassino_gigante.png', optimize=True)
    up(vault(), 3).save('assets/furniture/cas_vault.png')
    for name, fn, k in (('cas_roulette', t_roulette, 3), ('cas_dice', t_dice, 3), ('cas_cards', t_cards, 3), ('cas_flip', t_flip, 3),
                        ('cas_slot', slot_machine, 3), ('cas_bar', bar_counter, 3), ('cas_bottles', bottles, 3), ('cas_vase', vase, 3)):
        im = up(fn(), k)
        im.save(f'assets/furniture/{name}.png')
        print(name, im.size)
    print('nb_cassino', Image.open('assets/buildings/nb_cassino.png').size)


if __name__ == '__main__':
    main()
