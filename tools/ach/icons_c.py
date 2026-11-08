"""Versus, morte, colecao e perfil."""
from .kit import *  # noqa: F401,F403
from .kit import icon


@icon('vs_1')   # controle
def _(p):
    p.rect(2, 5, 13, 11, DG); p.oval(1, 6, 4, 13, DG); p.oval(11, 6, 14, 13, DG)
    p.rect(3, 6, 12, 10, G)
    p.rect(3, 8, 6, 8, BK); p.vline(4, 7, 9, BK)
    p.pts(R, (10, 7), (11, 8)); p.pts(B, (9, 8), (10, 9))
    p.pts(W, (7, 8), (8, 8))


@icon('vs_10')   # joystick
def _(p):
    p.oval(5, 1, 10, 6, R); p.pts(c(255, 140, 140), (6, 2), (7, 2))
    p.rect(7, 6, 8, 10, G)
    p.rect(2, 10, 13, 13, DG); p.rect(2, 10, 13, 10, G)
    p.pts(Y, (4, 12)); p.pts(B, (11, 12))


@icon('vs_50')   # alvo com flecha
def _(p):
    p.oval(1, 1, 14, 14, R); p.oval(3, 3, 12, 12, W); p.oval(5, 5, 10, 10, R); p.oval(7, 7, 8, 8, W)
    p.line(8, 8, 14, 2, BR, 1); p.pts(Y, (14, 1), (15, 2), (13, 1))


@icon('vs_hard')   # cerebro
def _(p):
    p.oval(1, 2, 8, 12, PK); p.oval(7, 2, 14, 12, PK)
    p.rect(5, 11, 10, 14, PK)
    p.vline(8, 3, 11, c(200, 80, 130))
    p.pts(c(200, 80, 130), (3, 5), (4, 5), (5, 6), (3, 8), (4, 8), (11, 5), (12, 5), (10, 6), (12, 8), (11, 8), (5, 10), (10, 10))
    p.pts(W, (3, 4), (11, 4))


@icon('vs_hardcore')   # explosao
def _(p):
    p.star(8, 8, 7, O, 3)
    p.star(8, 8, 5, Y, 2)
    p.star(8, 8, 2, W, 1)


@icon('death_1')   # caveira e ossos
def _(p):
    p.line(2, 9, 13, 14, W, 2); p.line(13, 9, 2, 14, W, 2)
    p.oval(3, 1, 12, 9, W); p.rect(5, 8, 10, 11, W)
    p.rect(4, 4, 6, 6, BK); p.rect(9, 4, 11, 6, BK)
    p.px(8, 7, BK); p.vline(6, 9, 11, G); p.vline(9, 9, 11, G)


@icon('death_10')   # caixao
def _(p):
    p.poly([(5, 1), (10, 1), (13, 5), (10, 14), (5, 14), (2, 5)], BR)
    p.poly([(7, 1), (8, 1), (11, 5), (8, 14), (7, 14), (4, 5)], c(120, 72, 40))
    p.vline(7, 4, 10, Y); p.hline(5, 9, 6, Y)
    p.vline(8, 4, 10, Y)
    p.pts(LBR, (5, 3), (4, 5))


@icon('debt')   # grafico caindo
def _(p):
    p.vline(2, 1, 13, LG); p.hline(2, 14, 13, LG)
    p.line(3, 3, 7, 8, R, 2); p.line(7, 8, 9, 6, R, 2); p.line(9, 6, 13, 11, R, 2)
    p.poly([(14, 13), (14, 8), (9, 12)], R)
    p.pts(Y, (4, 11), (6, 11))


@icon('revive_1')   # asa
def _(p):
    p.poly([(2, 12), (3, 6), (7, 2), (13, 1), (11, 5), (14, 6), (11, 9), (12, 11), (8, 11), (5, 14)], W)
    p.line(3, 11, 11, 3, LG, 1); p.line(5, 12, 12, 6, LG, 1)
    p.pts(LB, (4, 8), (8, 4))


@icon('revive_10')   # fenix de chamas
def _(p):
    p.poly([(8, 1), (11, 6), (9, 8), (14, 4), (13, 10), (10, 12), (8, 14), (6, 12), (3, 10), (2, 4), (7, 8), (5, 6)], O)
    p.poly([(8, 4), (10, 8), (8, 12), (6, 8)], Y)
    p.pts(W, (8, 8), (8, 7)); p.pts(BK, (7, 9), (9, 9))
    p.pts(R, (3, 5), (12, 5))


@icon('cos_1')   # chapeu de palha
def _(p):
    p.oval(1, 8, 14, 13, Y)
    p.oval(4, 2, 11, 10, Y)
    p.rect(4, 8, 11, 9, R)
    p.pts(DY, (3, 11), (6, 12), (9, 12), (12, 11), (6, 4), (9, 5))
    p.pts(W, (6, 3))


@icon('cos_skins')   # paleta de tinta
def _(p):
    p.oval(1, 2, 14, 13, LBR)
    p.oval(9, 8, 12, 11, (0, 0, 0, 0))
    p.pts(R, (4, 4), (5, 4), (4, 5), (5, 5)); p.pts(B, (8, 3), (9, 3), (8, 4), (9, 4)); p.pts(GR, (11, 5), (12, 5), (11, 6), (12, 6))
    p.pts(Y, (3, 8), (4, 8), (3, 9), (4, 9)); p.pts(P, (6, 10), (7, 10), (6, 11), (7, 11))


@icon('cos_all')   # cartola
def _(p):
    p.rect(4, 2, 11, 10, c(70, 70, 96)); p.rect(1, 10, 14, 12, c(70, 70, 96))
    p.rect(4, 8, 11, 9, R)
    p.pts(G, (5, 3), (5, 4), (5, 5), (2, 11))
    p.pts(Y, (7, 8), (8, 8))


@icon('roster_5')   # peca de quebra-cabeca
def _(p):
    p.rect(3, 5, 12, 14, GR)
    p.oval(6, 1, 9, 5, GR)
    p.oval(1, 8, 4, 11, GR); p.oval(11, 8, 14, 11, DGR)
    p.rect(3, 8, 3, 11, GR)
    p.pts(LGR, (4, 6), (5, 6), (4, 7), (7, 2))


@icon('roster_all')   # mascaras de teatro
def _(p):
    p.oval(1, 2, 8, 12, Y); p.oval(7, 4, 14, 14, B)
    p.pts(BK, (3, 6), (6, 6), (3, 7), (6, 7)); p.hline(3, 6, 10, BK); p.pts(BK, (2, 9), (7, 9))
    p.pts(BK, (9, 8), (12, 8), (9, 9), (12, 9)); p.hline(9, 12, 12, BK); p.pts(BK, (8, 13), (13, 13))
    p.pts(W, (9, 8), (12, 8))


@icon('buy_avatar')   # quadro com retrato
def _(p):
    p.rect(1, 1, 14, 14, DBR); p.rect(3, 3, 12, 12, LB)
    p.oval(6, 5, 9, 8, SK); p.rect(4, 9, 11, 12, B); p.oval(5, 9, 10, 13, B)
    p.rect(3, 12, 12, 12, DBR)
    p.pts(Y, (1, 1), (14, 1), (1, 14), (14, 14))


@icon('buy_bg')   # cidade ao entardecer
def _(p):
    p.rect(1, 1, 14, 14, c(120, 60, 160)); p.rect(1, 8, 14, 14, c(240, 120, 90))
    p.oval(8, 3, 12, 7, Y)
    p.rect(2, 7, 4, 14, DP); p.rect(5, 5, 7, 14, c(70, 40, 110)); p.rect(9, 8, 11, 14, DP); p.rect(12, 6, 13, 14, c(70, 40, 110))
    p.pts(Y, (3, 9), (3, 11), (6, 8), (6, 10), (6, 12), (10, 10), (10, 12), (12, 9))


@icon('buy_frame')   # espelho/moldura dourada
def _(p):
    p.oval(2, 1, 13, 14, Y); p.oval(4, 3, 11, 12, LB)
    p.pts(W, (5, 5), (6, 4), (5, 6)); p.line(8, 10, 10, 7, W)
    p.pts(DY, (2, 7), (13, 7), (7, 14), (8, 14))


@icon('diamonds_100')   # diamante
def _(p):
    p.poly([(4, 2), (11, 2), (14, 6), (8, 14), (1, 6)], CY)
    p.poly([(1, 6), (14, 6), (8, 14)], B)
    p.poly([(4, 2), (6, 6), (1, 6)], LB); p.poly([(11, 2), (9, 6), (14, 6)], LB)
    p.pts(W, (4, 3), (5, 4))


@icon('diamonds_500')   # picareta com diamante
def _(p):
    p.line(3, 13, 11, 5, BR, 2)
    p.poly([(2, 5), (8, 1), (14, 7), (12, 7), (8, 4), (4, 7)], G)
    p.pts(LG, (6, 2), (9, 2))
    p.poly([(1, 12), (4, 10), (5, 13), (3, 15)], CY); p.pts(W, (2, 12))


@icon('exchange')   # moeda com setas
def _(p):
    p.oval(1, 3, 10, 12, Y); p.oval(3, 5, 8, 10, DY)
    p.pts(Y, (4, 6), (4, 7), (4, 8), (4, 9), (5, 7), (6, 8), (7, 7), (7, 6), (7, 9), (7, 8))
    p.pts(CY, (12, 2), (13, 2), (14, 3), (13, 4), (12, 4)); p.poly([(11, 2), (14, 2), (14, 5)], CY)
    p.poly([(14, 14), (11, 14), (11, 11)], LGR); p.hline(11, 14, 13, LGR)
