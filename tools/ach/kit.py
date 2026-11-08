"""Ferramentas de desenho dos icones de conquista (16x16, sem suavizacao) e paleta compartilhada."""
from PIL import Image, ImageDraw

S = 16
OUTLINE = (27, 19, 48, 255)

# paleta
def c(r, g, b): return (r, g, b, 255)
W = c(246, 246, 252); LG = c(200, 205, 220); G = c(150, 156, 176); DG = c(88, 94, 114); BK = c(40, 40, 56)
R = c(224, 52, 52); DR = c(150, 24, 40); O = c(244, 140, 40); DO = c(196, 92, 24); Y = c(255, 218, 64); DY = c(204, 152, 30)
GR = c(84, 196, 84); DGR = c(34, 122, 56); LGR = c(160, 230, 110)
B = c(62, 132, 232); DB = c(32, 72, 156); LB = c(150, 212, 250); CY = c(90, 224, 232)
P = c(156, 86, 208); DP = c(92, 50, 140); LP = c(210, 160, 240); PK = c(244, 130, 176)
BR = c(150, 92, 52); DBR = c(96, 56, 32); LBR = c(210, 160, 104); SK = c(248, 204, 164)

ICONS = {}


def icon(i):
    def deco(fn):
        assert i not in ICONS, f'icone repetido: {i}'
        ICONS[i] = fn
        return fn
    return deco


class Pen:
    """Pincel sobre uma tela 16x16: tudo com bordas duras (pixel-art)."""

    def __init__(self):
        self.im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def px(self, x, y, col):
        if 0 <= x < S and 0 <= y < S:
            self.im.putpixel((x, y), col)

    def pts(self, col, *xy):
        for x, y in xy:
            self.px(x, y, col)

    def rect(self, x0, y0, x1, y1, col):
        self.d.rectangle([x0, y0, x1, y1], fill=col)

    def oval(self, x0, y0, x1, y1, col, ring=None):
        self.d.ellipse([x0, y0, x1, y1], fill=col, outline=ring)

    def line(self, x0, y0, x1, y1, col, w=1):
        self.d.line([x0, y0, x1, y1], fill=col, width=w)

    def poly(self, pts, col):
        self.d.polygon(pts, fill=col)

    def hline(self, x0, x1, y, col):
        self.rect(x0, y, x1, y, col)

    def vline(self, x, y0, y1, col):
        self.rect(x, y0, x, y1, col)

    def star(self, cx, cy, r, col, r2=None):
        import math
        r2 = r2 if r2 is not None else r * 0.45
        pts = []
        for k in range(10):
            a = -math.pi / 2 + k * math.pi / 5
            rr = r if k % 2 == 0 else r2
            pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
        self.poly(pts, col)

    def spark(self, cx, cy, r, col):
        """brilho de 4 pontas (cruz fina)"""
        for k in range(-r, r + 1):
            self.px(cx + k, cy, col)
            self.px(cx, cy + k, col)


def outline(im):
    """contorno escuro de 1 px ao redor de tudo que foi desenhado"""
    out = im.copy()
    for y in range(S):
        for x in range(S):
            if im.getpixel((x, y))[3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < S and 0 <= ny < S and im.getpixel((nx, ny))[3] > 0:
                        out.putpixel((x, y), OUTLINE)
                        break
    return out


def render(i):
    p = Pen()
    ICONS[i](p)
    return outline(p.im)
