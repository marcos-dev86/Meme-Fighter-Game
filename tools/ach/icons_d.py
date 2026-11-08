"""Zerar a historia com cada personagem (um simbolo de cada lutador) e a lenda final."""
from .kit import *  # noqa: F401,F403
from .kit import icon


@icon('story_dogge')   # coroa
def _(p):
    p.poly([(2, 12), (1, 4), (5, 8), (8, 2), (11, 8), (14, 4), (13, 12)], Y)
    p.rect(2, 11, 13, 13, DY)
    p.pts(R, (4, 11), (8, 11), (11, 11)); p.pts(W, (3, 6), (8, 4))


@icon('story_gadigago')   # nugget laranja de sobrancelha erguida
def _(p):
    p.poly([(3, 14), (2, 7), (5, 2), (11, 2), (14, 6), (13, 14)], O)
    p.pts(Y, (5, 3), (6, 3), (4, 5))
    p.line(4, 5, 8, 4, BK); p.line(9, 6, 12, 5, BK)
    p.rect(5, 7, 6, 8, W); p.rect(10, 8, 11, 9, W); p.pts(BK, (6, 8), (11, 9))
    p.hline(6, 11, 12, DO); p.pts(DO, (12, 11))


@icon('story_orc')   # orc de presas
def _(p):
    p.oval(2, 2, 13, 14, c(110, 170, 60))
    p.poly([(1, 5), (4, 6), (2, 8)], c(110, 170, 60)); p.poly([(14, 5), (11, 6), (13, 8)], c(110, 170, 60))
    p.line(3, 5, 6, 6, BK); p.line(12, 5, 9, 6, BK)
    p.pts(R, (5, 7), (10, 7), (6, 7), (9, 7))
    p.rect(4, 11, 11, 12, BK)
    p.poly([(4, 11), (5, 8), (6, 11)], W); p.poly([(11, 11), (10, 8), (9, 11)], W)


@icon('story_soldier')   # capacete com pluma
def _(p):
    p.poly([(9, 1), (13, 2), (14, 6), (11, 5)], R)
    p.oval(2, 3, 12, 14, LG); p.rect(2, 9, 12, 14, LG)
    p.rect(3, 7, 11, 8, BK); p.vline(7, 4, 6, DG)
    p.vline(7, 9, 13, G)
    p.pts(W, (4, 5), (5, 4))


@icon('story_dogking')   # cachorro coroado
def _(p):
    p.rect(4, 6, 11, 14, LBR)
    p.rect(2, 6, 4, 12, BR); p.rect(11, 6, 13, 12, BR)
    p.rect(5, 11, 10, 14, W)
    p.pts(BK, (5, 8), (10, 8)); p.rect(7, 11, 8, 12, BK)
    p.poly([(4, 6), (4, 2), (6, 4), (8, 1), (10, 4), (12, 2), (12, 6)], Y)
    p.pts(R, (8, 5))


@icon('story_tank')   # tanque
def _(p):
    p.rect(1, 10, 13, 13, DG); p.hline(2, 12, 11, G); p.pts(BK, (3, 12), (6, 12), (9, 12), (12, 12))
    p.rect(2, 6, 10, 9, GR); p.rect(4, 4, 8, 6, DGR)
    p.rect(9, 4, 14, 5, DGR); p.hline(4, 5, 8, LGR)
    p.pts(Y, (11, 7))


@icon('story_ninja')   # shuriken
def _(p):
    p.poly([(8, 1), (10, 6), (8, 8), (6, 6)], LG); p.poly([(14, 8), (10, 10), (8, 8), (10, 6)], LG)
    p.poly([(8, 14), (6, 10), (8, 8), (10, 10)], G); p.poly([(1, 8), (6, 6), (8, 8), (6, 10)], G)
    p.oval(6, 6, 9, 9, DG); p.pts(BK, (7, 7), (8, 8))


@icon('story_mystic')   # varinha magica
def _(p):
    p.line(2, 13, 10, 5, BR, 2)
    p.line(2, 13, 3, 12, W)
    p.star(11, 4, 3, Y, 1); p.px(11, 4, W)
    p.spark(13, 9, 1, LP); p.spark(5, 4, 1, LB); p.pts(LP, (2, 6))


@icon('story_green_dragon')   # folha com ventania
def _(p):
    p.poly([(3, 12), (4, 5), (9, 2), (13, 3), (12, 9), (7, 12)], GR)
    p.line(4, 12, 11, 4, DGR); p.line(7, 8, 10, 8, DGR); p.line(6, 10, 7, 6, DGR)
    p.pts(LGR, (6, 4), (9, 3))
    p.line(1, 14, 5, 14, LB); p.pts(LB, (6, 13), (6, 12))


@icon('story_ice_dragon')   # cara congelada
def _(p):
    p.oval(2, 3, 13, 14, LB)
    p.poly([(2, 5), (5, 0), (7, 4)], W); p.poly([(8, 4), (11, 0), (14, 5)], W)
    p.rect(4, 7, 5, 8, BK); p.rect(10, 7, 11, 8, BK)
    p.pts(BK, (5, 11), (6, 12), (7, 11), (8, 12), (9, 11), (10, 12))
    p.pts(W, (3, 7), (12, 9), (7, 5))
    p.poly([(4, 13), (5, 15), (6, 13)], W)


@icon('story_shadow_dragon')   # morcego
def _(p):
    p.poly([(1, 4), (5, 5), (7, 4), (8, 5), (9, 4), (10, 5), (14, 4), (13, 9), (11, 8), (10, 12), (8, 10), (6, 12), (4, 8), (2, 9)], DP)
    p.oval(6, 4, 9, 9, P)
    p.pts(R, (6, 6), (9, 6)); p.poly([(6, 2), (7, 4), (6, 4)], DP); p.poly([(9, 2), (8, 4), (9, 4)], DP)
    p.pts(W, (7, 8), (8, 8))


@icon('story_troll_face')   # sorriso de lado
def _(p):
    p.oval(1, 1, 14, 14, Y)
    p.line(3, 5, 6, 4, BK); p.line(9, 4, 12, 3, BK)
    p.pts(BK, (4, 7), (10, 6))
    p.line(4, 10, 8, 11, BK); p.line(8, 11, 12, 8, BK)
    p.pts(BK, (12, 7))


@icon('story_cara_tranquilo')   # meditando
def _(p):
    p.oval(6, 1, 9, 4, SK)
    p.poly([(8, 5), (11, 9), (5, 9)], O)
    p.poly([(2, 12), (5, 8), (11, 8), (14, 12), (8, 14)], DO)
    p.hline(4, 12, 12, O)
    p.pts(BK, (7, 3), (8, 3))
    p.pts(Y, (2, 4), (13, 4), (1, 7), (14, 7))


@icon('story_sahur')   # tronco
def _(p):
    p.rect(2, 4, 11, 12, O)
    p.oval(9, 3, 14, 13, DO)
    p.oval(10, 4, 13, 12, LBR); p.oval(11, 6, 12, 10, BR)
    p.pts(Y, (3, 5), (4, 5), (3, 6)); p.hline(2, 8, 11, DO)
    p.pts(BK, (4, 7), (7, 7)); p.pts(W, (4, 7), (7, 7)); p.pts(BK, (5, 9), (6, 9))
    p.pts(BK, (5, 7), (8, 7))


@icon('story_sahur_god')   # brilho divino
def _(p):
    p.spark(8, 7, 6, Y); p.spark(8, 7, 5, Y)
    p.star(8, 7, 4, W, 2)
    p.oval(6, 5, 9, 8, Y)
    p.spark(3, 3, 1, LB); p.spark(13, 12, 2, Y); p.spark(3, 12, 1, W)
    p.rect(5, 14, 10, 14, Y)


@icon('story_sahur_evil')   # chamas
def _(p):
    p.poly([(8, 0), (11, 5), (13, 8), (12, 13), (8, 15), (4, 13), (3, 8), (5, 6), (6, 8), (7, 4)], R)
    p.poly([(8, 6), (10, 9), (10, 12), (8, 14), (6, 12), (6, 9)], O)
    p.poly([(8, 10), (9, 12), (8, 13), (7, 12)], Y)


@icon('story_all')   # arco-iris
def _(p):
    for r, col in ((7, R), (6, O), (5, Y), (4, GR), (3, B), (2, P)):
        p.oval(8 - r, 12 - r, 7 + r, 12 + r, col)
    p.oval(6, 10, 9, 13, (0, 0, 0, 0))
    p.rect(0, 12, 15, 15, (0, 0, 0, 0))
    p.oval(1, 10, 6, 14, W); p.oval(9, 10, 14, 14, W); p.rect(3, 12, 12, 14, W)
    p.hline(3, 12, 14, LG)
