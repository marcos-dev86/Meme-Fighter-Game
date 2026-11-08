"""Primeiros passos, niveis e ilhas."""
from .kit import *  # noqa: F401,F403
from .kit import icon


@icon('welcome')   # mao acenando
def _(p):
    p.rect(3, 8, 11, 13, SK)
    p.vline(4, 3, 8, SK); p.vline(6, 2, 8, SK); p.vline(8, 2, 8, SK); p.vline(10, 3, 8, SK)
    p.vline(5, 7, 8, SK); p.vline(7, 7, 8, SK); p.vline(9, 7, 8, SK)
    p.rect(1, 9, 2, 11, SK); p.px(2, 12, SK)
    p.hline(5, 9, 12, c(232, 170, 130))
    p.pts(Y, (13, 3), (14, 5), (13, 7), (1, 4), (2, 2))


@icon('first_world')   # globo
def _(p):
    p.oval(2, 2, 13, 13, B)
    p.rect(4, 4, 6, 6, GR); p.rect(5, 7, 7, 10, GR); p.rect(9, 3, 11, 5, GR); p.rect(9, 8, 12, 10, GR); p.px(8, 11, GR)
    p.pts(W, (4, 3), (3, 4))


@icon('first_win')   # espadas cruzadas
def _(p):
    p.line(3, 2, 11, 10, LG, 2); p.line(12, 2, 4, 10, LG, 2)
    p.line(3, 2, 4, 2, W); p.line(12, 2, 11, 2, W)
    p.line(9, 8, 12, 11, Y, 2); p.line(6, 8, 3, 11, Y, 2)
    p.rect(11, 12, 13, 13, BR); p.rect(2, 12, 4, 13, BR)


@icon('wins_25')   # luva de boxe
def _(p):
    p.rect(3, 3, 11, 10, R)
    p.rect(2, 5, 4, 9, R); p.rect(10, 5, 13, 8, R)
    p.rect(4, 11, 11, 13, W)
    p.hline(4, 11, 11, LG)
    p.hline(4, 8, 4, c(255, 130, 130)); p.vline(4, 4, 8, c(255, 130, 130))
    p.hline(6, 9, 8, DR)


@icon('wins_100')   # trofeu
def _(p):
    p.poly([(4, 2), (11, 2), (10, 8), (5, 8)], Y)
    p.vline(5, 3, 6, c(255, 240, 150))
    p.oval(1, 3, 4, 6, DY); p.oval(11, 3, 14, 6, DY)
    p.rect(2, 4, 3, 5, (0, 0, 0, 0)); p.rect(12, 4, 13, 5, (0, 0, 0, 0))
    p.rect(7, 8, 8, 11, DY); p.rect(5, 12, 10, 13, Y); p.rect(5, 13, 10, 13, DY)


@icon('flawless')   # escudo limpo com visto
def _(p):
    p.poly([(2, 2), (13, 2), (13, 8), (8, 14), (2, 8)], LB)
    p.poly([(4, 4), (11, 4), (11, 8), (8, 11), (4, 8)], W)
    p.pts(GR, (5, 7), (6, 8), (7, 9), (8, 8), (9, 7), (10, 6), (11, 5))
    p.pts(DGR, (5, 8), (6, 9), (7, 10), (8, 9), (9, 8), (10, 7))


@icon('lvl_10')   # estrela
def _(p):
    p.star(8, 8, 7, Y, 3)
    p.pts(W, (7, 5), (6, 7))


@icon('lvl_25')   # estrela cadente
def _(p):
    p.line(1, 12, 8, 6, LB, 1); p.line(1, 9, 6, 6, B, 1); p.line(4, 13, 9, 9, B, 1)
    p.star(11, 5, 4, Y, 2)
    p.px(11, 4, W)


@icon('lvl_50')   # supernova (explosao de raios)
def _(p):
    for a, b in ((8, 1), (8, 14)):
        p.vline(a, b if b < 8 else 10, 5 if b < 8 else b, O)
    p.hline(1, 5, 8, O); p.hline(10, 14, 8, O)
    p.line(3, 3, 5, 5, Y); p.line(12, 3, 10, 5, Y); p.line(3, 12, 5, 10, Y); p.line(12, 12, 10, 10, Y)
    p.oval(5, 5, 10, 10, Y); p.oval(6, 6, 9, 9, W)


@icon('isl_misteriosa')   # bola de cristal
def _(p):
    p.oval(2, 1, 13, 11, P)
    p.oval(4, 3, 9, 7, LP)
    p.pts(W, (4, 3), (5, 3), (4, 4))
    p.rect(4, 12, 11, 13, BR); p.rect(5, 11, 10, 11, DBR)
    p.spark(10, 7, 1, Y)


@icon('isl_fragments')   # galho com folhas
def _(p):
    p.line(3, 13, 12, 3, BR, 1)
    p.oval(3, 5, 7, 8, GR); p.oval(8, 8, 12, 11, GR); p.oval(9, 2, 13, 5, GR); p.oval(2, 9, 6, 12, DGR)
    p.pts(LGR, (4, 5), (9, 2), (9, 8))


@icon('isl_camp')   # barraca
def _(p):
    p.poly([(8, 2), (14, 13), (2, 13)], O)
    p.poly([(8, 2), (14, 13), (8, 13)], DO)
    p.poly([(8, 7), (11, 13), (5, 13)], BK)
    p.vline(8, 7, 13, DBR)
    p.pts(Y, (8, 1), (8, 0))


@icon('isl_dogisland')   # cachorro
def _(p):
    p.rect(4, 3, 11, 12, LBR)
    p.rect(2, 3, 4, 9, BR); p.rect(11, 3, 13, 9, BR)
    p.rect(5, 8, 10, 12, W)
    p.pts(BK, (5, 6), (10, 6)); p.rect(7, 8, 8, 9, BK)
    p.pts(R, (7, 11), (8, 11))
    p.pts(W, (5, 5), (10, 5))


@icon('isl_gelo')   # floco de neve
def _(p):
    p.vline(8, 1, 14, LB); p.hline(1, 14, 8, LB)
    p.line(3, 3, 13, 13, LB); p.line(13, 3, 3, 13, LB)
    for x, y in ((8, 2), (8, 14), (2, 8), (14, 8), (4, 4), (12, 4), (4, 12), (12, 12)):
        p.px(x, y, W)
    p.oval(7, 7, 9, 9, W)
    p.pts(W, (6, 2), (10, 2), (6, 14), (10, 14))


@icon('isl_vulcao')   # vulcao em erupcao
def _(p):
    p.poly([(2, 14), (6, 6), (10, 6), (14, 14)], BR)
    p.poly([(6, 6), (10, 6), (9, 8), (7, 8)], R)
    p.pts(O, (7, 4), (9, 3), (6, 2), (10, 1), (8, 2), (11, 4), (5, 4))
    p.pts(Y, (8, 5), (8, 3), (7, 5), (9, 5))
    p.vline(8, 8, 12, O); p.pts(O, (8, 13))


@icon('isl_trevas')   # tunel escuro com luz no fim
def _(p):
    p.rect(2, 2, 13, 14, DG)
    p.oval(2, 1, 13, 12, DG)
    p.rect(4, 5, 11, 14, c(24, 20, 40)); p.oval(4, 3, 11, 9, c(24, 20, 40))
    p.oval(6, 6, 9, 10, Y); p.oval(7, 7, 8, 9, W)
    p.rect(2, 14, 13, 14, G)


@icon('isl_all')   # bussola
def _(p):
    p.oval(1, 1, 14, 14, Y); p.oval(3, 3, 12, 12, W)
    p.poly([(8, 3), (10, 8), (8, 8)], R); p.poly([(8, 3), (6, 8), (8, 8)], c(255, 120, 120))
    p.poly([(8, 13), (10, 8), (8, 8)], LG); p.poly([(8, 13), (6, 8), (8, 8)], G)
    p.px(8, 8, BK)
