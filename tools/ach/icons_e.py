"""Conquistas da expansao marítima (mergulho, travessias, criaturas, segredos e o Sea Beast)."""
from .kit import *  # noqa: F401,F403
from .kit import icon


@icon('sea_first_dive')   # máscara de mergulho
def _(p):
    p.oval(2, 4, 13, 12, DB)
    p.oval(4, 5, 11, 11, CY)
    p.rect(1, 7, 2, 9, BK); p.rect(13, 7, 14, 9, BK)
    p.pts(W, (5, 6), (6, 6), (5, 7))
    p.rect(7, 12, 8, 13, BK)


@icon('sea_dives_25')   # peixe-palhaço
def _(p):
    p.oval(3, 4, 12, 11, O)
    p.poly([(12, 7), (15, 4), (15, 11)], O)
    p.vline(6, 4, 11, W); p.vline(9, 4, 11, W)
    p.pts(BK, (4, 6)); p.pts(W, (4, 5))
    p.poly([(6, 3), (8, 1), (9, 3)], DO)


@icon('sea_chests_5')   # baú fechado
def _(p):
    p.rect(2, 7, 13, 13, BR)
    p.poly([(2, 7), (3, 3), (12, 3), (13, 7)], LBR)
    p.hline(2, 13, 7, DBR)
    p.rect(7, 6, 8, 9, Y)
    p.vline(4, 4, 13, DBR); p.vline(11, 4, 13, DBR)


@icon('sea_chests_all')   # baú aberto com moedas
def _(p):
    p.rect(2, 8, 13, 13, BR)
    p.poly([(2, 7), (4, 2), (11, 2), (13, 7)], DBR)
    p.rect(3, 7, 12, 8, Y)
    p.pts(Y, (4, 6), (7, 5), (10, 6), (6, 4)); p.pts(DY, (5, 7), (9, 7))
    p.rect(7, 10, 8, 12, Y)


@icon('sea_cross_first')   # túnel d'água
def _(p):
    p.oval(1, 2, 14, 13, DB)
    p.oval(3, 4, 12, 11, B)
    p.oval(5, 6, 10, 9, LB)
    p.hline(1, 14, 7, CY); p.pts(W, (11, 6), (12, 7), (11, 8))


@icon('sea_cross_all')   # ondas concêntricas
def _(p):
    p.oval(1, 1, 14, 14, DB)
    p.oval(3, 3, 12, 12, B)
    p.oval(5, 5, 10, 10, LB)
    p.oval(7, 7, 8, 8, W)
    p.pts(CY, (2, 8), (13, 7), (8, 2), (7, 13))


@icon('sea_all_sites')   # mapa do tesouro
def _(p):
    p.poly([(1, 3), (5, 2), (10, 3), (14, 2), (14, 12), (10, 13), (5, 12), (1, 13)], LBR)
    p.line(2, 5, 13, 5, DBR); p.line(2, 10, 13, 10, DBR)
    p.line(5, 6, 10, 9, R); p.line(10, 6, 5, 9, R)
    p.pts(DBR, (3, 7), (12, 8))


@icon('sea_hunter')   # barbatana de tubarão
def _(p):
    p.poly([(3, 13), (8, 2), (13, 13)], G)
    p.poly([(8, 2), (13, 13), (9, 13)], DG)
    p.hline(1, 14, 12, B); p.hline(2, 13, 13, DB)
    p.pts(W, (7, 6), (7, 7))


@icon('sea_friend')   # coração com peixinho
def _(p):
    p.poly([(8, 14), (1, 6), (2, 2), (5, 1), (8, 4), (11, 1), (14, 2), (15, 6)], PK)
    p.oval(5, 5, 10, 8, Y); p.poly([(10, 6), (12, 4), (12, 9)], Y); p.pts(BK, (6, 6))


@icon('sea_bestiary')   # livro com peixe
def _(p):
    p.rect(2, 2, 13, 13, DB)
    p.rect(3, 3, 12, 12, LB)
    p.vline(2, 2, 13, BK)
    p.oval(5, 6, 10, 9, O); p.poly([(10, 7), (12, 5), (12, 10)], O); p.pts(BK, (6, 7))
    p.hline(4, 11, 11, DB)


@icon('sea_secret_wall')   # parede com fenda
def _(p):
    p.rect(1, 2, 14, 13, G)
    p.hline(1, 14, 5, DG); p.hline(1, 14, 9, DG); p.hline(1, 14, 13, DG)
    p.vline(4, 2, 4, DG); p.vline(10, 6, 8, DG); p.vline(6, 10, 12, DG)
    p.line(8, 2, 6, 7, BK); p.line(6, 7, 9, 10, BK); p.line(9, 10, 7, 13, BK)
    p.pts(Y, (9, 5), (10, 8))


@icon('sea_secret_walls_4')   # olho que tudo vê
def _(p):
    p.poly([(1, 8), (5, 4), (11, 4), (15, 8), (11, 12), (5, 12)], W)
    p.oval(5, 5, 10, 11, B)
    p.oval(7, 7, 8, 9, BK)
    p.pts(W, (6, 6))
    p.line(1, 8, 5, 4, BK); p.line(15, 8, 11, 4, BK)


@icon('sea_beast_slayer')   # cabeça de serpente marinha
def _(p):
    p.poly([(3, 13), (2, 6), (5, 2), (11, 3), (13, 7), (11, 13)], c(110, 160, 130))
    p.poly([(5, 2), (7, 0), (8, 3)], BK); p.poly([(8, 3), (10, 1), (11, 4)], BK)
    p.rect(8, 5, 10, 6, R); p.pts(W, (9, 5))
    p.poly([(9, 9), (13, 8), (12, 12)], W)
    p.hline(5, 9, 10, BK); p.pts(DGR, (4, 6), (4, 9))


@icon('sea_near_drown')   # bolhas subindo
def _(p):
    p.oval(2, 8, 7, 13, LB, ring=B)
    p.oval(8, 4, 12, 8, LB, ring=B)
    p.oval(4, 2, 6, 4, W, ring=B)
    p.pts(W, (3, 9), (9, 5))
    p.vline(13, 8, 12, CY); p.pts(CY, (12, 13))


@icon('sea_glub')   # caveira afogada
def _(p):
    p.oval(3, 2, 12, 10, W)
    p.rect(5, 10, 10, 13, W)
    p.rect(4, 5, 6, 7, BK); p.rect(9, 5, 11, 7, BK)
    p.vline(7, 10, 13, G); p.vline(9, 10, 13, G)
    p.oval(12, 1, 14, 3, LB); p.pts(LB, (1, 5))


@icon('sea_gills')   # brânquias, só preto e branco
def _(p):
    p.oval(2, 3, 13, 13, BK)
    p.oval(3, 4, 12, 12, W)
    for x in (5, 7, 9):
        p.line(x, 6, x - 1, 11, BK)
    p.pts(BK, (10, 5))


@icon('sea_deep')   # manômetro de pressão
def _(p):
    p.oval(1, 1, 14, 14, DG)
    p.oval(3, 3, 12, 12, W)
    p.line(8, 8, 11, 5, R)
    p.pts(BK, (8, 8), (4, 8), (8, 4), (12, 8), (8, 12))
    p.hline(5, 10, 13, Y)


@icon('sea_whale')   # baleia
def _(p):
    p.oval(1, 5, 12, 13, B)
    p.poly([(11, 8), (15, 4), (14, 11)], DB)
    p.hline(3, 11, 11, LB)
    p.pts(W, (3, 8)); p.pts(BK, (3, 7))
    p.vline(6, 1, 4, CY); p.pts(CY, (5, 1), (7, 1))


@icon('sea_events')   # estrela dourada dentro de uma bolha
def _(p):
    p.oval(1, 1, 14, 14, LB, ring=B)
    p.star(8, 8, 5, Y)
    p.pts(W, (4, 4), (5, 3)); p.pts(DY, (8, 11))


@icon('sea_secret_items')   # pérola negra
def _(p):
    p.oval(2, 2, 13, 13, BK)
    p.oval(3, 3, 12, 12, DG)
    p.oval(4, 4, 9, 9, BK)
    p.pts(W, (5, 5), (6, 5), (5, 6))
