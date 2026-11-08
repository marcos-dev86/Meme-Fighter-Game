"""Chefes."""
from .kit import *  # noqa: F401,F403
from .kit import icon


@icon('boss_main')   # mascara de ninja
def _(p):
    p.oval(2, 2, 13, 13, c(52, 52, 72))
    p.rect(2, 6, 13, 9, SK)
    p.rect(2, 5, 13, 5, R); p.pts(R, (14, 6), (14, 8), (1, 8))
    p.rect(4, 7, 5, 8, BK); p.rect(10, 7, 11, 8, BK)
    p.pts(W, (4, 7), (10, 7))


@icon('boss_chill')   # cara tranquila de oculos escuros
def _(p):
    p.oval(1, 1, 14, 14, Y)
    p.rect(2, 5, 13, 8, BK); p.rect(7, 5, 8, 5, Y)
    p.pts(DG, (3, 6), (4, 6), (10, 6), (11, 6))
    p.hline(5, 10, 11, DO); p.pts(DO, (4, 10), (11, 10))


@icon('boss_sahur')   # tambor com baquetas
def _(p):
    p.line(2, 1, 8, 6, BR, 1); p.line(13, 1, 7, 6, BR, 1)
    p.oval(2, 6, 13, 9, W)
    p.rect(2, 8, 13, 12, R); p.oval(2, 10, 13, 14, R)
    p.hline(2, 13, 8, LG)
    p.pts(Y, (4, 11), (7, 12), (10, 11), (13, 11))
    p.pts(DR, (3, 9), (6, 10), (9, 10), (12, 9))


@icon('boss_misteriosa')   # chapeu de mago
def _(p):
    p.poly([(8, 1), (12, 11), (4, 11)], P)
    p.poly([(8, 1), (12, 11), (9, 11)], DP)
    p.rect(1, 11, 14, 13, DP)
    p.rect(4, 9, 11, 10, Y)
    p.star(7, 6, 2, Y, 1)


@icon('boss_troll')   # troll face
def _(p):
    p.oval(1, 1, 14, 14, W)
    p.line(3, 4, 6, 5, BK); p.line(12, 4, 9, 5, BK)
    p.pts(BK, (4, 6), (11, 6))
    p.rect(3, 8, 12, 12, BK)
    p.hline(4, 11, 9, W); p.hline(4, 11, 11, W)
    p.pts(W, (6, 10), (9, 10))
    p.pts(PK, (7, 12), (8, 12))


@icon('boss_camp')   # capacete militar
def _(p):
    p.oval(2, 3, 13, 14, GR)
    p.rect(2, 9, 13, 14, (0, 0, 0, 0))
    p.rect(1, 9, 14, 11, DGR)
    p.rect(2, 8, 13, 8, GR)
    p.pts(LGR, (5, 5), (6, 4), (4, 6))
    p.rect(5, 12, 10, 13, BK); p.pts(R, (8, 12))


@icon('boss_dogisland')   # osso
def _(p):
    p.line(4, 11, 11, 4, W, 3)
    p.oval(1, 10, 5, 14, W); p.oval(1, 10, 3, 12, W); p.oval(10, 1, 14, 5, W); p.oval(12, 3, 14, 5, W)
    p.oval(3, 12, 5, 14, W)
    p.pts(LG, (3, 12), (12, 3), (6, 9), (9, 6))


@icon('boss_fragments')   # dragao verde
def _(p):
    p.poly([(2, 7), (9, 3), (14, 6), (14, 11), (6, 12), (2, 11)], GR)
    p.poly([(3, 3), (5, 1), (6, 5)], DGR); p.poly([(9, 3), (11, 1), (11, 5)], DGR)
    p.rect(9, 6, 10, 7, Y); p.px(9, 6, BK)
    p.pts(BK, (13, 8), (13, 9))
    p.hline(3, 13, 11, DGR)
    p.pts(W, (6, 11), (9, 11), (12, 11))


@icon('boss_sahur_god')   # anjo com aureola e asas
def _(p):
    p.poly([(0, 6), (5, 8), (5, 13), (1, 11)], W); p.poly([(15, 6), (10, 8), (10, 13), (14, 11)], W)
    p.pts(LG, (2, 8), (3, 10), (13, 8), (12, 10))
    p.oval(4, 4, 11, 13, W)
    p.rect(4, 1, 11, 2, Y); p.hline(5, 10, 3, DY)
    p.pts(BK, (6, 8), (9, 8)); p.hline(6, 9, 10, G)
    p.pts(LB, (5, 6))


@icon('boss_gelo')   # cubo de gelo
def _(p):
    p.poly([(8, 1), (14, 4), (8, 7), (2, 4)], LB)
    p.poly([(2, 4), (8, 7), (8, 14), (2, 11)], B)
    p.poly([(14, 4), (8, 7), (8, 14), (14, 11)], CY)
    p.pts(W, (6, 3), (7, 3), (4, 8), (4, 9))


@icon('boss_vulcao')   # vulcao apagado: fumaca e gota
def _(p):
    p.poly([(1, 14), (5, 8), (11, 8), (14, 14)], DG)
    p.rect(5, 8, 11, 8, G)
    p.oval(4, 4, 8, 7, LG); p.oval(8, 3, 12, 6, G)
    p.poly([(8, 8), (6, 12), (10, 12)], B)
    p.px(7, 11, LB)


@icon('boss_sahur_evil')   # diabinho
def _(p):
    p.oval(2, 4, 13, 14, R)
    p.poly([(2, 1), (6, 5), (3, 6)], DR); p.poly([(13, 1), (9, 5), (12, 6)], DR)
    p.rect(4, 7, 6, 8, W); p.rect(9, 7, 11, 8, W); p.pts(BK, (5, 8), (10, 8))
    p.line(3, 6, 6, 7, DR); p.line(12, 6, 9, 7, DR)
    p.rect(5, 11, 10, 12, BK); p.hline(5, 10, 11, W)


@icon('boss_trevas')   # coracao negro
def _(p):
    p.oval(1, 2, 8, 9, c(60, 30, 100)); p.oval(7, 2, 14, 9, c(60, 30, 100))
    p.poly([(1, 7), (14, 7), (8, 14)], c(60, 30, 100))
    p.pts(P, (3, 4), (4, 3), (3, 5))
    p.pts(R, (6, 8), (9, 8))


@icon('boss_all')   # caveira com coroa
def _(p):
    p.oval(2, 4, 13, 12, W); p.rect(5, 10, 10, 14, W)
    p.rect(4, 7, 6, 9, BK); p.rect(9, 7, 11, 9, BK)
    p.hline(6, 9, 11, BK); p.vline(7, 12, 14, G); p.vline(9, 12, 14, G)
    p.poly([(3, 4), (3, 0), (6, 3), (8, 0), (10, 3), (13, 0), (13, 4)], Y)
    p.pts(R, (8, 2))


# ── Torre ──
@icon('tower_5')   # tijolos
def _(p):
    p.rect(1, 3, 14, 13, DO)
    for y in (3, 7, 11):
        p.rect(1, y, 14, y + 2, O)
    for y, xs in ((3, (7,)), (7, (4, 11)), (11, (7,))):
        for x in xs:
            p.vline(x, y, y + 2, DBR)
    for y in (6, 10):
        p.hline(1, 14, y, DBR)
    p.pts(Y, (2, 3), (9, 7), (2, 11))


@icon('tower_10')   # pagode de tres andares
def _(p):
    p.vline(8, 0, 1, Y)
    p.poly([(8, 1), (11, 4), (5, 4)], R)
    p.rect(6, 5, 9, 6, W); p.pts(BR, (7, 5), (8, 5))
    p.poly([(3, 7), (12, 7), (14, 9), (1, 9)], R)
    p.rect(4, 10, 11, 11, W); p.pts(BR, (7, 10), (8, 10), (5, 10), (10, 10))
    p.poly([(1, 12), (14, 12), (14, 14), (1, 14)], DR)
    p.hline(2, 13, 12, R)


@icon('tower_25')   # torre de pedra com bandeira
def _(p):
    p.rect(4, 4, 11, 14, G); p.rect(3, 3, 12, 4, DG)
    p.pts(DG, (3, 2), (5, 2), (7, 2), (9, 2), (11, 2))
    p.rect(7, 6, 8, 8, BK); p.rect(7, 11, 8, 14, BK)
    p.pts(LG, (5, 5), (5, 7), (5, 9))
    p.vline(8, 0, 2, BR)


@icon('tower_40')   # castelo
def _(p):
    p.rect(1, 6, 14, 14, G)
    p.rect(1, 2, 4, 14, DG); p.rect(11, 2, 14, 14, DG)
    p.pts(G, (1, 1), (3, 1), (11, 1), (13, 1)); p.pts(G, (6, 5), (9, 5))
    p.poly([(6, 14), (6, 10), (8, 8), (10, 10), (10, 14)], BK)
    p.rect(2, 5, 3, 6, BK); p.rect(12, 5, 13, 6, BK)
    p.pts(R, (7, 0), (8, 0))


@icon('tower_50')   # torre tocando o ceu
def _(p):
    p.oval(1, 1, 14, 14, c(70, 40, 130))
    p.rect(6, 5, 9, 14, G); p.poly([(5, 5), (8, 1), (10, 5)], DG)
    p.pts(W, (3, 4), (12, 4), (3, 9), (12, 10), (4, 12), (11, 12))
    p.pts(Y, (11, 7), (3, 6), (12, 2))
    p.rect(7, 9, 8, 11, BK)
