"""Cutscenes 09-13 (historia principal, parte 2)."""
from engine import *
from scenes_a import fig, npc, S


def scene_09():  # mountain_summit: Topo do Mundo
    G = 535
    shots = [
        Shot(0, 12, 'stage5', 'cold', zoom=(1.0, 1.1), fade=1.2, card=('O TOPO DO MUNDO', 'A montanha de neve', 1.0, 5.5), actors=[
            fig('dogge', [(0, -120, G), (6.5, 470, G)], [(0, 'walk'), (6.5, 'idle')])]),
        Shot(12, 38, 'stage5', zoom=(1.18, 1.0), focus=(0.4, 0.7), fade=1.0, actors=[
            fig('dogge', [(12, 470, G)], 'idle', bob=2),
            npc('c18', [(12, 900, G)], s=2.0, flip=True)],
            lines=[('Dogge', 'Consegui... eu cheguei ao topo do mundo!', 13.0, 17.5),
                   ('Helga', 'Bem-vindo ao topo, novato. Poucos chegam até aqui.', 17.8, 22.5),
                   ('Dogge', 'Daqui dá para ver todas as ilhas, até as partidas.', 22.8, 27.5),
                   ('Helga', 'Lá em cima ainda tem o Moai e o Rocha. Vá falar com eles.', 27.8, 34.0)]),
    ]
    return Scene('09_topo_do_mundo', 38, shots, music=[('frozen_wastes.mp3', 0, 0, 0.6, 1.5, 3.0)], amb=[('wind.mp3', 0, 38, 0.3)])


def scene_10():  # volcano_summit: Cume do Vulcao
    G = 535
    shots = [
        Shot(0, 12, 'stage4', 'warm', zoom=(1.0, 1.1), fade=1.2, card=('O CUME DO VULCÃO', 'Com o piolet, até o fim', 1.0, 5.5), actors=[
            fig('dogge', [(0, -120, G), (6.5, 470, G)], [(0, 'walk'), (6.5, 'idle')])], fx=[Fx.shake(7, 1.0, 4)]),
        Shot(12, 36, 'stage4', 'warm', zoom=(1.15, 1.0), focus=(0.4, 0.7), fade=1.0, actors=[
            fig('dogge', [(12, 470, G)], 'idle', bob=2),
            fig('sahur_evil', [(12, 900, G)], [(12, 'idle'), (24, 'cast'), (27, 'idle')], flip=True, s=1.6, alpha=[(12, 0), (13.5, 1)], bob=5)],
            fx=[Fx.flash(12.5, 0.5, (255, 140, 60), 0.5)],
            lines=[('Dogge', 'A parede escura ficou para trás. O cume é meu!', 13.5, 18.0),
                   ('Sahur Evil', 'Ora, ora... o piolet serviu para alguma coisa, hein?', 18.3, 23.0),
                   ('Sahur Evil', 'Mas olhe o fogo lá embaixo: o vulcão sempre acorda.', 23.3, 29.0)]),
    ]
    return Scene('10_cume_vulcao', 36, shots, music=[('mountain_pass.mp3', 0, 60, 0.6, 1.5, 3.0)], amb=[('wind.mp3', 0, 36, 0.2)], sfx=[(12.5, 'fire.mp3', 0.5), (7.0, 'earth.mp3', 0.4)])


def scene_11():  # os tres troncos
    G = 535
    shots = [
        Shot(0, 36, 'stage9', zoom=(1.0, 1.12), fade=1.0, actors=[
            fig('sahur', [(0, 480, G)], 'idle', s=1.7, bob=3),
            fig('sahur_god', [(0, 740, G)], 'idle', s=1.7, bob=3),
            fig('sahur_evil', [(0, 1000, G)], [(0, 'idle'), (11, 'flash'), (11.6, 'idle')], s=1.6, flip=True, bob=3),
            fig('dogge', [(0, -150, G), (3.5, 200, G)], [(0, 'walk'), (3.5, 'idle')], s=1.5)],
            fx=[Fx.hit(11.2, 860, 430, 'hit_flash', 3.0), Fx.shake(11.2, 0.3, 6)],
            lines=[('Sahur', 'Três troncos, três jeitos de ser tronco.', 4.5, 8.5),
                   ('Sahur God', 'Eu sou a luz da ilha de gelo.', 8.7, 11.0),
                   ('Sahur Evil', 'E eu sou a bagunça! Toma! (empurrão)', 11.0, 14.5),
                   ('Sahur God', 'Ei! Isso queimou!', 14.7, 17.5),
                   ('Sahur', 'Parem, os dois! Dogge nos venceu um por um, lembram?', 17.8, 23.0),
                   ('Dogge', 'Vocês três são fortes. Sozinhos ou juntos.', 23.3, 28.0),
                   ('Sahur Evil', 'Hehe... juntos? Gostei. Mas eu continuo sendo o mais bonito.', 28.3, 34.0)]),
    ]
    return Scene('11_tres_troncos', 36, shots, music=[('trapalhoes.mp3', 0, 0, 0.6, 1.0, 2.5)], sfx=[(11.2, 'hit_flesh.mp3', 0.9)])


def scene_12():  # cas_subsolo: o andar que nao existe
    G = 535
    shots = [
        Shot(0, 12, 'stage8', zoom=(1.0, 1.1), fade=1.0, actors=[
            fig('dogge', [(0, 380, G)], 'idle', bob=2),
            npc('c20', [(0, 880, G)], s=2.0, flip=True)],
            lines=[('Crupiê', 'Dizem que o cassino esconde um andar que não existe. Siga-me.', 1.5, 7.5),
                   ('Dogge', 'Então ele existe de verdade?', 7.8, 11.5)]),
        Shot(12, 40, 'stage12', 'dark', zoom=(1.05, 1.15), fade=1.5, card=('O SEGREDO DO SUBSOLO', 'O andar que não existe', 13.0, 18.0), actors=[
            fig('dogge', [(12, 380, G)], 'idle', bob=2, tint=(0.85, 0.85, 1.0)),
            npc('c20', [(12, 880, G)], s=2.0, flip=True, tint=(0.85, 0.85, 1.0))],
            fx=[Fx.tint(12, 40, (20, 0, 50, 70), 1.5, 2.0)],
            lines=[('Crupiê', 'Aqui embaixo, as fichas valem mais que moedas. E os segredos, mais que fichas.', 18.5, 26.0),
                   ('Dogge', 'Eu só quero a verdade sobre o poder perdido.', 26.3, 31.0),
                   ('Crupiê', 'Então abra os olhos. O cassino sempre soube de muita coisa.', 31.3, 37.5)]),
    ]
    return Scene('12_subsolo_cassino', 40, shots, music=[('retrofuture.mp3', 0, 30, 0.6, 1.0, 3.0)], sfx=[(12.0, 'teleport.mp3', 0.5)])


def scene_13():  # moai_stone: A Pedra Moai
    G = 535
    shots = [
        Shot(0, 12, 'stage5', 'cold', zoom=(1.0, 1.1), fade=1.2, card=('A PEDRA MOAI', 'O refúgio do pico', 1.0, 5.5), actors=[
            fig('dogge', [(0, -120, G), (6.0, 330, G)], [(0, 'walk'), (6.0, 'idle')], s=1.6),
            npc('c04', [(0, 700, G)], s=2.0, flip=True),
            Actor(IMG(['npc-portraits', 'moai.png']), [(0, 1000, G)], scale=2.8, flip=True)]),
        Shot(12, 40, 'stage5', 'cold', zoom=(1.0, 1.18), focus=(0.7, 0.7), fade=1.0, actors=[
            fig('dogge', [(12, 330, G)], 'idle', s=1.6, bob=2),
            npc('c04', [(12, 700, G)], s=2.0, flip=True),
            Actor(IMG(['npc-portraits', 'moai.png']), [(12, 1000, G)], scale=2.8, flip=True, jitter=0)],
            fx=[Fx.shake(25, 2.5, 5), Fx.flash(27, 1.2, (200, 230, 255), 0.7), Fx.tint(25, 33, (120, 160, 255, 70), 1.0, 2.0)],
            lines=[('Rocha', 'Dizem que a pedra do pico só desperta para quem a merece.', 13.0, 18.5),
                   ('Dogge', 'Eu vim até aqui. Que a pedra me escute.', 18.8, 23.5),
                   ('Rocha', '...Olhe. Ela está brilhando.', 28.0, 32.0),
                   ('Dogge', 'A pedra respondeu. Agora eu entendo por que subi até aqui.', 32.3, 38.0)]),
    ]
    return Scene('13_pedra_moai', 40, shots, music=[('winter_woods.mp3', 0, 0, 0.6, 1.5, 3.0)], amb=[('wind.mp3', 0, 40, 0.25)], sfx=[(25, 'earth.mp3', 0.7), (27, 'levelup.mp3', 0.5)])
