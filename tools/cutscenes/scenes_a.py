"""Cutscenes 02-08 (historia principal). So arte/sons ja existentes. Textos em pt-BR escritos a partir de docs/HISTORIA.md."""
from engine import *

S = 1.7  # sprites-v2 tem 200 px de altura de referencia -> ~340 px na tela


def fig(char, keys, tl='idle', s=S, flip=False, **k):
    return Actor(F(char, tl), keys, scale=s, flip=flip, **k)


def npc(char, keys, d='down', walking=False, s=1.9, flip=False, **k):
    return Actor(NPC(char, d, walking), keys, scale=s, flip=flip, **k)


def scene_02():  # rival_battle concluida: depois do duelo com Gadigago
    G = 535
    shots = [
        Shot(0, 27, 'stage1', zoom=(1.0, 1.10), focus=(0.55, 0.6), fade=0.8, actors=[
            fig('dogge', [(0, 470, G)], [(0, 'idle'), (0.7, 'strong'), (1.4, 'idle')]),
            fig('gadigago', [(0, 760, G), (0.8, 760, G), (1.6, 960, G), (2.4, 960, G)], [(0, 'guard'), (0.8, 'hurt'), (2.2, 'ko'), (4.0, 'hurt'), (4.6, 'idle')], flip=True),
        ], fx=[Fx.hit(0.8, 700, 430, 'hit_strong', 3.4), Fx.shake(0.8, 0.5, 12), Fx.flash(0.8, 0.25, power=0.5)],
            lines=[('Gadigago', 'Argh... como um novato bate tão forte assim?', 5.0, 9.5),
                   ('Dogge', 'Eu só treinei bastante. E você luta bem, Gadigago.', 9.8, 14.5),
                   ('Gadigago', 'Não me elogie! Da próxima vez eu venço. Anote o que eu disse!', 14.8, 20.0)]),
        Shot(20, 27, 'stage1', zoom=(1.12, 1.2), focus=(0.4, 0.6), fade=1.0, card=('UM NOVO RIVAL', 'Gadigago vai voltar mais forte', 21.0, 26.0), actors=[
            fig('dogge', [(20, 450, G)], 'idle', bob=3),
            fig('gadigago', [(20, 870, G)], 'idle', flip=True, bob=3),
        ]),
    ]
    return Scene('02_rival_gadigago', 27, shots, music=[('comic_hero.mp3', 0, 0, 0.7, 1.0, 2.5)], sfx=[(0.8, 'hit_heavy.mp3', 1.0), (2.2, 'landing.mp3', 0.8)])


def scene_03():  # visit_misteriosa: chegada na Ilha Misteriosa e o Troll Face do cassino
    G = 535
    shots = [
        Shot(0, 10, 'stage3', 'warm', zoom=(1.0, 1.1), fade=1.0, card=('ILHA MISTERIOSA', 'Onde a sorte tem dono', 0.8, 5.0), actors=[
            fig('dogge', [(0, -120, G), (7.0, 520, G)], [(0, 'walk'), (7.0, 'idle')]),
        ], lines=[('Dogge', 'Então é aqui que mora a sorte... e o mistério.', 6.0, 10.0)]),
        Shot(10, 38, 'stage8', zoom=(1.0, 1.1), fade=1.0, actors=[
            fig('dogge', [(10, 400, G)], 'idle', bob=2),
            fig('troll_face', [(10, 910, G)], [(10, 'idle'), (24, 'cast'), (28, 'idle')], flip=True, alpha=[(10, 0), (11.2, 1)], bob=4),
        ], fx=[Fx.flash(11.0, 0.5, (200, 255, 200), 0.5)],
            lines=[('Troll Face', 'Bem-vindo ao meu cassino, forasteiro!', 12.0, 16.0),
                   ('Dogge', 'Procuro uma pista sobre o poder perdido.', 16.3, 20.5),
                   ('Troll Face', 'Pistas? Aqui tudo tem preço... e eu sempre ganho.', 20.8, 25.5),
                   ('Troll Face', 'Quer entrar? Vença-me primeiro. Mas não confie no meu sorriso. Hehe.', 25.8, 33.5)]),
    ]
    return Scene('03_cassino_troll', 38, shots, music=[('open_ocean.mp3', 0, 0, 0.6, 1.0, 1.5), ('retrofuture.mp3', 9.5, 4, 0.6, 1.5, 3.0)],
                 amb=[('waves.mp3', 0, 10.5, 0.35)], sfx=[(11.0, 'teleport.mp3', 0.6), (12.0, 'encounter.mp3', 0.3)])


def scene_04():  # camp_showdown: Capitao Ferro derrotado
    G = 535
    shots = [
        Shot(0, 32, 'stage10', zoom=(1.0, 1.1), fade=1.0, actors=[
            fig('dogge', [(0, 430, G)], 'idle', bob=2),
            fig('soldier', [(0, 860, G)], [(0, 'hurt'), (3.0, 'ko'), (6.0, 'hurt'), (7.0, 'idle')], flip=True),
        ], fx=[Fx.shake(0.2, 0.4, 8)],
            lines=[('Capitão Ferro', 'Impossível... a Legião Cinzenta nunca caiu assim.', 6.0, 10.5),
                   ('Dogge', 'Vocês não precisam tomar as ilhas à força.', 10.8, 15.0),
                   ('Capitão Ferro', 'Você tem coragem, garoto. Vou pensar no que disse.', 15.3, 20.5),
                   ('Capitão Ferro', 'Mas a Legião cumpre ordens... e as ordens vêm de cima.', 20.8, 26.5)]),
        Shot(26, 32, 'stage10', 'dark', zoom=(1.1, 1.18), fade=1.2, card=('A LEGIÃO CINZENTA', 'Quem dá as ordens?', 27.0, 31.5), actors=[
            fig('soldier', [(26, 860, G)], 'idle', flip=True, bob=2),
            fig('dogge', [(26, 430, G)], 'idle', bob=2),
        ]),
    ]
    return Scene('04_legiao_ferro', 32, shots, music=[('mountain_pass.mp3', 0, 0, 0.6, 1.0, 2.5)], sfx=[(0.2, 'hit_heavy.mp3', 0.9), (3.0, 'landing.mp3', 0.8)])


def scene_05():  # island_boss: Rei dos Caes
    G = 535
    shots = [
        Shot(0, 34, 'stage11', zoom=(1.0, 1.1), fade=1.0, actors=[
            fig('dogge', [(0, 420, G)], 'idle', bob=2),
            fig('dogking', [(0, 880, G)], [(0, 'hurt'), (2.8, 'ko'), (6.0, 'hurt'), (7.0, 'idle')], flip=True, s=1.8),
        ], fx=[Fx.shake(0.2, 0.4, 8), Fx.hit(0.3, 650, 440, 'hit_strong', 3.2)],
            lines=[('Rei dos Cães', 'Um Doge entre os meus cães... Eu via você como uma afronta à família.', 6.0, 12.0),
                   ('Dogge', 'Eu só quero ajudar as ilhas. Todos aqui são da mesma família.', 12.3, 18.0),
                   ('Rei dos Cães', '...Talvez eu tenha errado. A Ilha dos Cães reconhece você, Dogge.', 18.3, 25.0),
                   ('Rei dos Cães', 'Mas lembre-se: um rei só é rei enquanto protege os seus.', 25.3, 31.0)]),
    ]
    return Scene('05_rei_dos_caes', 34, shots, music=[('open_ocean.mp3', 0, 30, 0.6, 1.0, 2.5)], amb=[('waves.mp3', 0, 34, 0.3)], sfx=[(0.3, 'hit_heavy.mp3', 0.9), (2.8, 'landing.mp3', 0.8)])


def scene_06():  # lore_complete: as tres partes da inscricao
    G = 535
    pieces = ['"Quando a ilha foi partida,', 'o poder que a mantinha inteira se espalhou.', 'Só quem reunir as três partes vai entender o que realmente foi perdido."']
    shots = [
        Shot(0, 8, 'stage12', zoom=(1.0, 1.1), fade=1.0, actors=[fig('dogge', [(0, 420, G)], 'idle', bob=2)],
             lines=[('Dogge', 'As três partes... finalmente juntas.', 3.0, 7.5)]),
        Shot(8, 14, 'stage12', 'cold', zoom=(1.1, 1.16), fade=0.8, card=(pieces[0], '', 8.5, 13.6), actors=[fig('dogge', [(8, 420, G)], 'idle', bob=2)]),
        Shot(14, 20, 'stage7', zoom=(1.0, 1.1), fade=0.8, card=(pieces[1], 'O poder se espalhou pelas ilhas', 14.5, 19.6), actors=[fig('dogge', [(14, 420, G)], 'idle', bob=2)]),
        Shot(20, 28, 'stage12', 'cold', zoom=(1.1, 1.16), fade=0.8, actors=[fig('dogge', [(20, 420, G)], 'idle', bob=2)],
             fx=[Fx.flash(20.5, 1.2, (170, 220, 255), 0.7)], card=('AS TRÊS PARTES', 'Floresta, Gelo e Trevas', 21.5, 27.6)),
        Shot(28, 40, 'stage12', zoom=(1.0, 1.06), fade=0.8, actors=[
            fig('dogge', [(28, 420, G)], 'idle', bob=2),
            fig('green_dragon', [(28, 800, 470)], 'idle', s=1.2, bob=10, alpha=[(28, 0), (29.5, 0.55), (36, 0.55), (38, 0)], shadow=False),
            fig('ice_dragon', [(28, 980, 360)], 'idle', s=1.2, bob=10, alpha=[(29, 0), (30.5, 0.55), (36, 0.55), (38, 0)], shadow=False),
            fig('shadow_dragon', [(28, 1100, 520)], 'idle', s=1.2, bob=10, alpha=[(30, 0), (31.5, 0.55), (36, 0.55), (38, 0)], shadow=False),
        ], lines=[('Dogge', pieces[2], 30.0, 39.0)]),
    ]
    return Scene('06_tres_fragmentos', 40, shots, music=[('medieval_library.mp3', 0, 10, 0.6, 1.5, 3.0)], sfx=[(20.5, 'charge.mp3', 0.7), (21.0, 'levelup.mp3', 0.5)])


def scene_07():  # vulcao_boss: Guardiao do Vulcao
    G = 535
    shots = [
        Shot(0, 34, 'stage4', zoom=(1.0, 1.1), fade=1.0, actors=[
            fig('dogge', [(0, 430, G)], 'idle', bob=2),
            fig('tank', [(0, 860, G)], [(0, 'hurt'), (2.8, 'ko'), (6.0, 'hurt'), (7.0, 'idle')], flip=True, s=1.75),
        ], fx=[Fx.shake(0.2, 0.4, 9), Fx.hit(0.3, 650, 440, 'hit_strong', 3.2)],
            lines=[('Guardião do Vulcão', 'Hmpf... Faz muito tempo que ninguém me derruba.', 6.0, 11.0),
                   ('Dogge', 'Preciso passar. A forja do Brasa pode me ajudar.', 11.3, 15.5),
                   ('Guardião do Vulcão', 'Você tem fogo por dentro, garoto. A passagem é sua.', 15.8, 21.0),
                   ('Guardião do Vulcão', 'Mas cuide da lava: ela guarda uma alma, e não perdoa quem a desrespeita.', 21.3, 28.5)]),
    ]
    return Scene('07_guardiao_vulcao', 34, shots, music=[('goblin_king.mp3', 0, 20, 0.6, 1.0, 2.5)], sfx=[(0.3, 'hit_heavy.mp3', 0.9), (2.8, 'landing.mp3', 0.8), (6.0, 'fire.mp3', 0.3)])


def scene_08():  # visit_trevas: chegada na Ilha das Trevas
    G = 535
    shots = [
        Shot(0, 12, 'stage6', zoom=(1.0, 1.12), fade=1.2, card=('A ILHA DAS TREVAS', 'O último guardião espera', 1.0, 6.0), actors=[
            fig('dogge', [(0, -120, G), (6.0, 420, G)], [(0, 'walk'), (6.0, 'idle')], tint=(0.8, 0.8, 0.95)),
        ], lines=[('Dogge', 'Aqui o ar pesa... parece que a escuridão me observa.', 6.5, 11.5)]),
        Shot(12, 40, 'stage6', 'shadow', zoom=(1.05, 1.15), fade=1.5, actors=[
            fig('dogge', [(12, 420, G)], 'idle', bob=2, tint=(0.8, 0.8, 0.95)),
            fig('shadow_dragon', [(12, 930, 560)], 'idle', s=2.1, bob=8, alpha=[(12, 0), (15, 0.9)], shadow=False, flip=True),
        ], fx=[Fx.shake(14.0, 1.5, 5), Fx.tint(12, 40, (40, 0, 60, 70), 2.0, 2.0)],
            lines=[('Voz sombria', 'Mais um herdeiro em busca do que foi perdido...', 16.0, 21.0),
                   ('Voz sombria', 'Eu sou o último guardião. Quem me vence enxerga a verdade.', 21.3, 27.5),
                   ('Dogge', 'Então eu vou te vencer.', 27.8, 31.5)]),
    ]
    return Scene('08_ilha_trevas', 40, shots, music=[('spy_glass.mp3', 0, 0, 0.6, 1.5, 3.0)], amb=[('wind.mp3', 0, 40, 0.2)], sfx=[(14.0, 'thunder.mp3', 0.6)])
