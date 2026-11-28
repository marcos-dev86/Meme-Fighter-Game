"""Gera os 14 ícones de habilidades (ab_*) em assets/icons/ (PNG RGBA 64x64, nearest).

Uso (na raiz do projeto):  python3 tools/make_ability_icons.py [pasta_saida] [folha_contato.png]
- Comuns: grade 16x16 ampliada 4x.  - Supremas: grade 32x32 ampliada 2x.
Paleta e contorno copiados de tools/make_icons.py. Depois rode tools/gen_icon_registry.py.
"""
from PIL import Image, ImageDraw
import math, os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else 'assets/icons'
SHEET = sys.argv[2] if len(sys.argv) > 2 else None
OUTLINE = (34, 24, 44, 255)

PAL = {
  '.': None,
  'k': OUTLINE,
  'r': (226, 58, 58, 255), 'R': (150, 30, 44, 255), 'p': (255, 140, 140, 255),
  'o': (244, 148, 40, 255), 'O': (190, 96, 24, 255),
  'y': (252, 212, 64, 255), 'Y': (208, 152, 30, 255), 'w': (255, 244, 170, 255),
  'g': (92, 196, 84, 255), 'G': (46, 128, 60, 255), 'l': (170, 236, 140, 255),
  'b': (70, 140, 232, 255), 'B': (36, 84, 168, 255), 'c': (150, 210, 255, 255),
  'v': (160, 96, 206, 255), 'V': (96, 56, 140, 255),
  'W': (244, 244, 246, 255), 's': (190, 192, 204, 255), 'S': (128, 130, 146, 255), 'D': (78, 80, 96, 255),
  'n': (150, 98, 54, 255), 'N': (96, 60, 34, 255), 't': (222, 178, 120, 255),
  'f': (244, 196, 158, 255),
  # extras só deste script (tons de verde-orc / cinza / ferro mais escuros)
  'H': (28, 84, 48, 255),      # verde bem escuro
  'd': (52, 54, 68, 255),      # ferro escuro
  'q': (110, 22, 34, 255),     # vinho escuro
}

class Img:
    """Grade pequena RGBA com helpers de desenho sem anti-aliasing."""
    def __init__(self, size):
        self.n = size
        self.im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)
    def col(self, c):
        return PAL[c] if isinstance(c, str) else c
    def px(self, x, y, c):
        if 0 <= x < self.n and 0 <= y < self.n:
            v = self.col(c)
            if v: self.im.putpixel((x, y), v)
    def line(self, x0, y0, x1, y1, c):
        self.d.line([x0, y0, x1, y1], fill=self.col(c))
    def rect(self, x0, y0, x1, y1, c):
        self.d.rectangle([x0, y0, x1, y1], fill=self.col(c))
    def ellipse(self, x0, y0, x1, y1, fill=None, ring=None):
        self.d.ellipse([x0, y0, x1, y1], fill=self.col(fill) if fill else None,
                       outline=self.col(ring) if ring else None)
    def poly(self, pts, c):
        self.d.polygon(pts, fill=self.col(c))
    def ascii(self, rows, ox=0, oy=0):
        for r in rows:
            assert len(r) == len(rows[0]), (len(r), len(rows[0]), r)
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch in PAL and PAL[ch]:
                    self.px(ox + x, oy + y, ch)
        return self
    def erase(self, x, y):
        if 0 <= x < self.n and 0 <= y < self.n:
            self.im.putpixel((x, y), (0, 0, 0, 0))
    def outlined(self):
        """Contorno escuro de 1px ao redor de tudo (como make_icons.outline)."""
        out = self.im.copy(); px = self.im.load(); n = self.n
        for y in range(n):
            for x in range(n):
                if px[x, y][3] == 0:
                    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                        nx, ny = x+dx, y+dy
                        if 0 <= nx < n and 0 <= ny < n and px[nx, ny][3] and px[nx, ny] != OUTLINE:
                            out.putpixel((x, y), OUTLINE); break
        return out

def starburst(g, cx, cy, r_out, r_in, spikes, c, rot=0.0):
    pts = []
    for i in range(spikes * 2):
        a = rot + math.pi * i / spikes
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    g.poly(pts, c)

ICONS = {}
def reg(name, g):
    assert g.n in (16, 32)
    ICONS[name] = g.outlined().resize((64, 64), Image.NEAREST)  # 16 -> 4x, 32 -> 2x


# ============================================================ 1. soco certeiro
def soco_certeiro():
    g = Img(16)
    starburst(g, 7.5, 7.0, 8.6, 5.4, 8, 'y', rot=0)
    starburst(g, 7.5, 7.0, 6.6, 4.6, 8, 'w', rot=math.pi / 8)
    g.ascii([
     "...oo.oo.oo.oo..",
     "..ooorooRooRoor.",
     "..orrRrrRrrRrrR.",
     "..orrRrrRrrRrrR.",
     "..RRRRRRRRRRRRR.",
     "..rooooooorrrrR.",
     "..roowoooorrrRR.",
     "..rroooooorrrR..",
     "...rrrrrrrrrRR..",
     "...WWWWWWWWWW...",
     "...ssssssssss...",
    ], 0, 3)
    reg('ab_soco_certeiro', g)

# ============================================================ 2. pé de madrugada
def pe_madrugada():
    g = Img(16)
    g.ascii([           # lua crescente (atrás)
     "..yyyyy.",
     ".yyyyy..",
     "yyyy....",
     "yyyy....",
     "yyyy....",
     ".yyyyy..",
     "..yyyyy.",
    ], 8, 0)
    g.ascii([
     "................",
     "................",
     "................",
     "..W.............",
     ".WWW.BBBBB......",
     "WWWWWbbbbb......",
     ".WWWWbbWbb......",
     "..WWsbbbWbb.....",
     "....sbbbbWbbb...",
     ".c..bbbbbbbbbb..",
     "cc.bbbbbbbbbbbb.",
     "...WWWWWWWWWWWW.",
     ".c.ssssssssssSS.",
     "................",
     "................",
     "................",
    ])
    reg('ab_pe_madrugada', g)

# ============================================================ 3. casca grossa
def casca_grossa():
    g = Img(16)
    g.ascii([
     "................",
     "..GGGGGGGGGGGG..",
     ".GsggggggkgggsG.",
     ".GgllggggkkgggG.",
     ".GgllgggkkggggG.",
     ".GgggggggkgggGG.",
     ".GgggggggkkggGG.",
     ".GggggggggkggGG.",
     ".GggggggkkgggGG.",
     "..GgggggkggggG..",
     "..GsgggggggsGG..",
     "...GgggggggGG...",
     "....GGggggGG....",
     ".....GGGGGG.....",
     "................",
     "................",
    ])
    reg('ab_casca_grossa', g)

# ============================================================ 4. costas largas
def costas_largas():
    g = Img(16)
    g.ascii([
     "................",
     "....nnnnnnnn....",
     "..nnnnnnnnnnnn..",
     ".nnggtnnnnnggnnN",
     ".nnggnnnnnnggnnN",
     ".NnggnttttnggnNN",
     ".NnyyntNNtnyynNN",
     ".NnggnttttnggnNN",
     ".NNggNNNNNNggNNN",
     "..NNNNNNNNNNNN..",
     "..........SSS...",
     ".........S...S..",
     ".........DDDDD..",
     "........DDsDDDD.",
     "........DDDDDDD.",
     "................",
    ])
    reg('ab_costas_largas', g)

# ============================================================ 7. combo
def combo():
    g = Img(16)
    def chev(apex, h, c, c2):
        for i in range(h + 1):
            for sx in (-1, 1):
                x = 8 + sx * i
                g.px(x, apex + i, c)
                g.px(x, apex + i + 1, c2)
    chev(8, 5, 'o', 'O')
    chev(5, 4, 'y', 'Y')
    chev(2, 3, 'w', 'y')
    # faíscas
    for (cx, cy) in ((13, 2), (2, 4)):
        g.px(cx, cy, 'w'); g.px(cx + 1, cy, 'y'); g.px(cx - 1, cy, 'y'); g.px(cx, cy + 1, 'y'); g.px(cx, cy - 1, 'y')
    reg('ab_combo', g)

# ============================================================ 8. crosshair
def crosshair():
    g = Img(16)
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - 7.5, y - 7.5)
            if 3.9 <= d <= 5.9:
                g.px(x, y, 'r')
    for x in (7, 8):
        for y in list(range(0, 6)) + list(range(10, 16)):
            g.px(x, y, 'W')
    for y in (7, 8):
        for x in list(range(0, 6)) + list(range(10, 16)):
            g.px(x, y, 'W')
    g.rect(7, 7, 8, 8, 'r')
    reg('ab_crosshair', g)


def notebook():
    g = Img(16)
    g.ascii([
     "................",
     "..RRRRRRRRRR....",
     ".SrrrrrrrrrrR...",
     "ssrwwwwwwwwrR...",
     ".SrwNwNwNwwrR...",
     "ssrwNwNwNwNrR...",
     ".SrwNwNwNwNrR...",
     "ssrwNwNwNwwrR...",
     ".SrwwwwwwwwrR...",
     "ssrwNwNwwwwrR...",
     ".SrwNwNwwwwrR...",
     "ssrwNwNwwwwrR...",
     ".SrwwwwwwwwrR...",
     "..rrrrrrrrrrR...",
     "..RRRRRRRRRR....",
     "................",
    ])
    # lapiseira vertical (frente, à direita)
    g.ascii([
     "pp",
     "pp",
     "ss",
     "yY",
     "yY",
     "yY",
     "yY",
     "yY",
     "yY",
     "yY",
     "tY",
     ".k",
    ], 12, 1)
    reg('ab_notebook', g)

def club():
    g = Img(16)
    # cabo diagonal
    for k in range(9):
        x, y = 2 + k, 14 - k
        g.px(x, y, 'n'); g.px(x + 1, y, 'n'); g.px(x, y - 1, 'N'); g.px(x + 1, y - 1, 'n')
    for (x, y) in ((1, 14), (1, 13), (2, 15), (3, 15)):
        g.px(x, y, 'N')
    # cabeça
    g.ellipse(7, 1, 14, 8, fill='n')
    g.ascii([
     "ttt...",
     "tt....",
     "t.....",
    ], 8, 2)
    for (x, y) in ((13, 6), (13, 7), (12, 8), (11, 8), (10, 8), (9, 8), (14, 5), (14, 6), (14, 7), (13, 8)):
        g.px(x, y, 'N')
    # espetos de ferro
    for (x, y) in ((10, 0), (11, 0), (6, 3), (6, 4), (15, 3), (15, 4), (13, 9), (14, 9), (7, 7), (8, 9), (12, 1), (9, 0)):
        pass
    g.px(10, 0, 's'); g.px(11, 0, 's')
    g.px(6, 3, 's'); g.px(6, 4, 'S')
    g.px(15, 3, 's'); g.px(15, 4, 'S')
    g.px(13, 9, 'S'); g.px(14, 9, 'S')
    g.px(7, 7, 'S'); g.px(7, 8, 'S')
    # pregos na cabeça
    g.px(10, 4, 'S'); g.px(12, 5, 'S'); g.px(9, 6, 'S')
    reg('ab_club', g)

def pot():
    g = Img(16)
    g.ascii([
     "....W...W.......",
     ".....W...W......",
     "......ssss......",
     "....DDDDDDDD....",
     "..DDsDDDDDDDDD..",
     ".SSSSSSSSSSSSSS.",
     "..DDDDDDDDDDDD..",
     "dDDsDDDDDDDDDDDd",
     "dDDsDDDDDDDDDDdd",
     ".DDsDDDDDDDDDdd.",
     ".DDDDDDDDDDDddd.",
     "..DDDDDDDDDddd..",
     "...dddddddddd...",
     "................",
     "................",
     "................",
    ])
    reg('ab_pot', g)

def soup():
    g = Img(16)
    # vapor
    for (x, y) in ((4, 0), (4, 1), (5, 2), (5, 3), (4, 4), (8, 1), (8, 2), (9, 3), (9, 4)):
        g.px(x, y, 'W')
    # colher
    for k in range(8):
        g.px(14 - k, 3 + k, 's'); g.px(15 - k, 3 + k, 'S')
    g.rect(13, 0, 14, 2, 's'); g.px(15, 1, 'S'); g.px(15, 2, 'S')
    g.ascii([
     "................",
     "................",
     "................",
     "................",
     "................",
     "...ooooooooo....",
     "..oyyyooyyyoo...",
     ".OoooyooooooOO..",
     ".rrrrrrrrrrrrr..",
     ".rppprrrrrrrrR..",
     "..rrrrrrrrrrR...",
     "...RrrrrrrRR....",
     "....RRRRRR......",
     "...RRRRRRRR.....",
     "................",
     "................",
    ])
    reg('ab_soup', g)

def boot_march():
    g = Img(16)
    g.ascii([
     "................",
     "................",
     "................",
     "................",
     "..ssssss........",
     "..SSSSSSD.......",
     "..SSWSSSD.......",
     "..SSSWSSD.......",
     "..SSWSSSD.......",
     "..SSSSSSSSSS....",
     "..SsSSSSSSSSSD..",
     ".SSSSSSSSSSSSSD.",
     ".dddddddddddddd.",
     ".DDDDDDDDDDDDDD.",
     "................",
     "................",
    ])
    for i, c in enumerate(('y', 'o', 'O')):
        x0 = 5 + 3 * i
        for (dx, dy) in ((0, 0), (1, 0), (1, 1), (2, 1), (0, 2), (1, 2)):
            g.px(x0 + dx, 0 + dy + 1, c)
    reg('ab_boot_march', g)

def fury():
    g = Img(16)
    starburst(g, 7.5, 8.0, 9.2, 6.4, 10, 'R', rot=-math.pi / 2)
    starburst(g, 7.5, 8.0, 8.0, 6.0, 10, 'r', rot=-math.pi / 2 + math.pi / 10)
    g.ascii([
     "................",
     "................",
     "................",
     "....gggggggg....",
     "...gllgggggGg...",
     "..gggggggggggg..",
     ".gggHHgggHHgggg.",
     ".ggggHyggyHggGg.",
     "..gggggGGggggG..",
     "..ggggggggggGG..",
     "...gWgGggGgWG...",
     "...gWggggggWG...",
     "....GgggggGG....",
     ".....GGGGGG.....",
     "................",
     "................",
    ])
    reg('ab_fury', g)

def sup_trofeu():
    g = Img(32)
    # raios de combo atrás
    starburst(g, 16, 14, 15.5, 9, 12, 'R', rot=0.1)
    starburst(g, 16, 14, 13, 8, 12, 'O', rot=0.35)
    # copa dourada
    g.poly([(8, 5), (24, 5), (22, 14), (19, 19), (13, 19), (10, 14)], 'Y')
    g.poly([(9, 6), (23, 6), (21, 14), (18, 18), (14, 18), (11, 14)], 'y')
    g.rect(10, 7, 12, 13, 'w')
    g.rect(13, 7, 14, 11, 'w')
    g.rect(19, 8, 22, 14, 'o')
    # alças
    g.ellipse(3, 6, 10, 14, ring='Y'); g.ellipse(22, 6, 29, 14, ring='Y')
    # haste e base
    g.rect(14, 19, 18, 23, 'Y'); g.rect(15, 19, 16, 23, 'y')
    g.rect(10, 23, 22, 26, 'N'); g.rect(11, 23, 21, 24, 'n')
    g.rect(8, 26, 24, 29, 'N'); g.rect(9, 26, 23, 27, 'n')
    g.rect(13, 25, 19, 25, 'y')
    # relâmpago de combo na copa
    g.poly([(17, 6), (13, 12), (16, 12), (14, 18), (20, 10), (17, 10), (19, 6)], 'r')
    g.poly([(17, 7), (14, 12), (17, 12), (15, 16), (19, 10), (16, 10), (18, 7)], 'p')
    # estrelas de impacto
    starburst(g, 5, 22, 4.5, 1.8, 4, 'w'); starburst(g, 27, 21, 4.5, 1.8, 4, 'w')
    starburst(g, 5, 22, 3, 1.2, 4, 'r', rot=0.78); starburst(g, 27, 21, 3, 1.2, 4, 'r', rot=0.78)
    reg('ab_sup_trofeu_revanche', g)

def sup_ordem():
    g = Img(32)
    # bandeira cinza rasgada ao fundo
    g.poly([(2, 3), (15, 3), (15, 9), (12, 11), (14, 15), (2, 15)], 'S')
    g.poly([(3, 4), (14, 4), (14, 8), (11, 10), (12, 13), (3, 13)], 's')
    g.line(5, 6, 11, 11, 'D'); g.line(11, 6, 5, 11, 'D')
    # corrente partida (elos)
    for (x, y) in [(2, 20), (6, 22), (22, 22), (26, 20), (29, 17)]:
        g.ellipse(x, y, x + 4, y + 3, ring='D')
        g.ellipse(x + 1, y + 1, x + 3, y + 2, ring='S')
    # estilhaços
    for (x, y) in [(19, 4), (24, 7), (27, 11), (9, 26), (22, 27), (14, 29)]:
        g.poly([(x, y), (x + 3, y + 1), (x + 1, y + 3)], 'S')
        g.px(x + 1, y + 1, 'W')
    # punho verde orc
    g.poly([(9, 11), (23, 11), (25, 14), (25, 24), (21, 28), (12, 28), (8, 24), (8, 14)], 'G')
    g.poly([(10, 12), (22, 12), (24, 15), (24, 23), (20, 27), (13, 27), (9, 23), (9, 15)], 'g')
    # dedos
    for x in (10, 14, 18):
        g.rect(x, 12, x + 3, 17, 'l'); g.line(x + 3, 12, x + 3, 17, 'G'); g.line(x, 17, x + 3, 17, 'G')
    g.rect(21, 15, 24, 21, 'g'); g.line(21, 21, 24, 21, 'G')
    g.rect(10, 19, 20, 20, 'G')
    # sombra e polegar
    g.rect(11, 22, 20, 26, 'G'); g.rect(12, 23, 19, 25, 'g')
    # rebite dourado na pulseira
    g.rect(9, 25, 23, 28, 'D'); g.rect(10, 26, 22, 27, 'S')
    for x in (12, 16, 20): g.px(x, 26, 'y')
    # brilho de energia
    starburst(g, 16, 8, 3.2, 1.2, 4, 'y'); g.px(16, 8, 'w')
    reg('ab_sup_ordem_recusada', g)

ORDER = [soco_certeiro, pe_madrugada, casca_grossa, costas_largas, sup_trofeu, sup_ordem,
         combo, crosshair, notebook, club, pot, soup, boot_march, fury]
for f in ORDER:
    f()

def write_all():
    os.makedirs(OUT, exist_ok=True)
    for name, im in ICONS.items():
        im.save(os.path.join(OUT, name + '.png'))
    print(len(ICONS), 'ícones ab_*')

def contact(path):
    names = list(ICONS)
    cols = 8
    rows = 2
    S = 128
    sheet = Image.new('RGBA', (cols * (S + 8) + 8, rows * (S + 8) + 8 + 40), (50, 52, 64, 255))
    for i, n in enumerate(names):
        x = 8 + (i % cols) * (S + 8); y = 8 + (i // cols) * (S + 8)
        sheet.alpha_composite(ICONS[n].resize((S, S), Image.NEAREST), (x, y))
    # linha em 24px
    for i, n in enumerate(names):
        x = 8 + i * 36; y = rows * (S + 8) + 8 + 8
        sheet.alpha_composite(ICONS[n].resize((24, 24), Image.NEAREST), (x, y))
    sheet.save(path)

if __name__ == '__main__':
    write_all()
    if SHEET:
        contact(SHEET)
