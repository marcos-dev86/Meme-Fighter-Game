"""Os 3 FINAIS (bem mais longos que as outras cutscenes), um por final do jogo. Tocam antes dos slides de texto da EndingScreen."""
from engine import *
from scenes_a import fig, npc, S

MOAI = ['legacy-sprites', 'moai', 'idle.png']
FRONT = ['cara_tranquilo', 'gadigago', 'dogge', 'dogking', 'soldier', 'tank', 'sahur', 'sahur_god', 'sahur_evil']
BACK = ['c08', 'c09', 'c10', 'c11', 'c15', 'c04', 'c03', 'c01']


def crowd(t0, bob=4, front_y=535, back_y=470, x0=130, x1=1150, dogge_scale=1.7, tint=None, alpha_in=None, skip=()):
    """Todo mundo em fila na praca (so sprites existentes), cada um balancando em fase diferente."""
    ac = []
    n = len(BACK)
    for i, c in enumerate(BACK):
        if c in skip:
            continue
        x = x0 + 40 + (x1 - x0 - 80) * i / (n - 1)
        ac.append(npc(c, [(t0, x, back_y)], s=1.1, bob=bob * 0.7, tint=tint, alpha=alpha_in))
    m = len(FRONT)
    for i, c in enumerate(FRONT):
        if c in skip:
            continue
        x = x0 + (x1 - x0) * i / (m - 1)
        sc = dogge_scale if c == 'dogge' else 1.35
        ac.append(fig(c, [(t0, x, front_y)], 'idle', s=sc, flip=(i > m // 2), bob=bob + (i % 3), tint=tint, alpha=alpha_in))
    return ac


def scene_final_uniao():
    G = 535
    shots = [
        # 1) a pedra restaurada e as ilhas voltando
        Shot(0, 16, 'stage7', zoom=(1.0, 1.2), focus=(0.5, 0.4), fade=1.5, actors=[fig('dogge', [(0, 420, G)], 'idle', bob=2)],
             fx=[Fx.flash(2.5, 1.6, (255, 240, 200), 0.85), Fx.shake(2.5, 2.0, 7)],
             lines=[(None, 'A pedra brilhou e o chão tremeu.', 4.0, 9.0), (None, 'As ilhas partidas voltaram para casa, uma a uma.', 9.3, 15.5)]),
        # 2) a praca enche
        Shot(16, 30, 'stage2', zoom=(1.0, 1.1), fade=1.5, actors=[
            npc('c08', [(16, -100, 470), (24, 380, 470)], walking=True, s=1.5),
            npc('c09', [(16, 1400, 480), (24, 900, 480)], 'left', walking=True, s=1.5),
            npc('c10', [(16, -140, 500), (25, 620, 500)], walking=True, s=1.5),
            npc('c11', [(16, 1440, 510), (25, 760, 510)], 'left', walking=True, s=1.5),
            fig('dogge', [(16, 640, G)], 'idle', s=1.7, bob=3)],
             lines=[(None, 'Na praça, todos que você ajudou fizeram uma grande festa.', 19.0, 28.5)]),
        # 3) a festa: todos juntos
        Shot(30, 52, 'stage2', 'warm', zoom=(1.0, 1.1), fade=1.5, actors=crowd(30, bob=5),
             lines=[('Vovô Bento', 'Hoje a ilha dorme inteira, Dogge. E é por sua causa.', 33.0, 38.5),
                    ('Gadigago', 'A revanche fica para amanhã. Hoje eu como!', 38.8, 43.5),
                    ('Rei dos Cães', 'Há lugar para todos nesta mesa. Até para um Doge.', 43.8, 49.5)]),
        # 4) o titulo que ninguem precisou
        Shot(52, 70, 'stage2', 'warm', zoom=(1.1, 1.0), fade=1.5, actors=crowd(52, bob=6),
             lines=[('Dogge', 'Obrigado, amigos. Eu só queria ver a ilha inteira de novo.', 54.0, 60.0),
                    (None, 'Ele nunca precisou de um título. Para todos, era o Meme Fighter de todos.', 60.5, 69.0)]),
        # 5) encerramento
        Shot(70, 88, 'stage2', 'memory', zoom=(1.0, 1.15), fade=2.0, card=('A ILHA INTEIRA', 'Final: União', 73.0, 86.0), actors=crowd(70, bob=3)),
    ]
    return Scene('final_uniao', 88, shots, music=[('secret_garden.mp3', 0, 20, 2.0, 1.5, 4.0)], amb=[('waves.mp3', 0, 30, 0.3)],
                 sfx=[(2.5, 'charge.mp3', 0.7), (3.0, 'levelup.mp3', 0.6), (2.8, 'earth.mp3', 0.6)], end_fade=2.4)


def scene_final_gloria():
    G = 535
    shots = [
        # 1) o ultimo golpe do duelo lendario
        Shot(0, 18, 'stage1', zoom=(1.0, 1.12), focus=(0.5, 0.6), fade=1.5, actors=[
            fig('dogge', [(0, 330, G), (4.0, 560, G), (7.0, 560, G)], [(0, 'walk'), (3.9, 'guard'), (7.0, 'strong'), (7.8, 'idle')]),
            fig('gadigago', [(0, 1000, G), (4.0, 800, G), (7.0, 800, G), (7.4, 980, G)], [(0, 'walk'), (3.9, 'guard'), (7.4, 'hurt'), (10.0, 'ko')], flip=True)],
             fx=[Fx.hit(7.0, 740, 420, 'hit_ult', 3.4, 0.5), Fx.flash(7.0, 0.8, (255, 255, 255), 0.8), Fx.shake(7.0, 1.2, 14)],
             lines=[(None, 'O último golpe ecoou pela praça inteira.', 10.5, 17.0)]),
        # 2) a multidao
        Shot(18, 34, 'stage2', 'warm', zoom=(1.0, 1.12), fade=1.5, actors=crowd(18, bob=13, skip=('gadigago',)) ,
             lines=[(None, 'Por um instante, ninguém respirou. Então o rugido da multidão cobriu o mar.', 20.0, 32.5)]),
        # 3) as duas estatuas
        Shot(34, 56, 'stage2', 'gold', zoom=(1.0, 1.12), focus=(0.5, 0.6), fade=1.5, actors=[
            Actor(IMG(MOAI), [(34, 800, G)], scale=2.5, flip=True),
            fig('dogge', [(34, 470, G)], 'strong', s=1.9, tint=(1.0, 0.85, 0.45), shadow=False, alpha=[(34, 0), (39, 1)]),
            fig('dogge', [(44, 1250, G), (48, 1000, G)], [(44, 'walk'), (48, 'idle')], s=1.6, flip=True, alpha=[(44, 1), (49, 1)])],
             fx=[Fx.flash(38.5, 1.0, (255, 230, 150), 0.6)],
             lines=[(None, 'Uma estátua de Dogge foi erguida ao lado do Sigma Boy.', 40.0, 47.0),
                    ('Dogge', 'Ficou igualzinha. Só o queixo está maior.', 49.0, 54.5)]),
        # 4) a promessa de revanche
        Shot(56, 72, 'stage2', 'warm', zoom=(1.0, 1.1), fade=1.5, actors=[
            fig('dogge', [(56, 450, G)], 'idle', s=1.7, bob=3),
            fig('gadigago', [(56, 1000, G), (59, 800, G)], [(56, 'walk'), (59, 'guard')], flip=True)],
             lines=[('Gadigago', 'Isso não acabou, campeão. Eu prometo uma nova revanche!', 60.0, 66.0),
                    ('Dogge', 'Quando você quiser.', 66.3, 70.5)]),
        # 5) novos desafiantes
        Shot(72, 90, 'stage1', 'warm', zoom=(1.0, 1.16), fade=2.0, card=('O VERDADEIRO MEME FIGHTER', 'Final: Glória', 79.0, 88.0), actors=[
            fig('dogge', [(72, 440, G)], 'idle', s=1.8, bob=3),
            fig('orc', [(72, 1500, G), (79, 1000, G)], [(72, 'walk'), (79, 'guard')], flip=True),
            fig('ninja', [(74, 1500, G + 40), (80, 1130, G + 40)], [(74, 'walk'), (80, 'guard')], flip=True, s=1.5),
            fig('mystic', [(76, 1500, G + 100), (82, 1250, G + 100)], [(76, 'walk'), (82, 'guard')], flip=True, s=1.5)]),
    ]
    return Scene('final_gloria', 90, shots, music=[('breaktime.mp3', 0, 0, 0.7, 1.5, 4.0)],
                 sfx=[(7.0, 'hit_heavy.mp3', 1.0), (7.0, 'thunder.mp3', 0.5), (10.0, 'landing.mp3', 0.8), (38.5, 'levelup.mp3', 0.6)], end_fade=2.4)


def scene_final_poder():
    G = 535
    dark = (0.62, 0.42, 0.9)
    shots = [
        # 1) o poder responde
        Shot(0, 16, 'stage12', 'dark', zoom=(1.0, 1.18), fade=1.5, actors=[fig('dogge', [(0, 560, G)], [(0, 'idle'), (5.0, 'charge')], s=1.8)],
             fx=[Fx.tint(4, 16, (120, 20, 180, 90), 3.0, 2.0), Fx.shake(5, 8, 5), Fx.hit(7.0, 560, 300, 'charge_up', 5.0, 4.0), Fx.flash(12, 1.4, (200, 100, 255), 0.8)],
             lines=[(None, 'O poder perdido respondeu ao chamado.', 8.5, 15.0)]),
        # 2) a energia escura
        Shot(16, 32, 'stage12', 'shadow', zoom=(1.1, 1.3), focus=(0.45, 0.6), fade=1.5, actors=[
            fig('dogge', [(16, 560, G)], [(16, 'cast'), (26, 'strong')], s=1.9, tint=dark, jitter=2)],
             fx=[Fx.tint(16, 32, (110, 10, 170, 110), 1.0, 2.0), Fx.shake(16, 12, 6), Fx.hit(20, 560, 330, 'hit_ult', 5.0, 0.6), Fx.hit(27, 560, 330, 'hit_ult', 5.0, 0.6)],
             lines=[(None, 'Uma energia escura envolveu Dogge, e o brilho nos seus olhos mudou para sempre.', 19.0, 31.0)]),
        # 3) o trono nas trevas
        Shot(32, 52, 'stage6', 'shadow', zoom=(1.0, 1.12), fade=1.5, actors=[
            fig('shadow_dragon', [(32, 900, 520)], 'idle', s=2.2, bob=8, flip=True, shadow=False, alpha=[(32, 0), (36, 0.85)]),
            fig('dogge', [(32, 520, G)], 'idle', s=1.9, tint=dark, bob=2)],
             fx=[Fx.tint(32, 52, (50, 0, 80, 80), 1.5, 2.0)],
             lines=[(None, 'Na Ilha das Trevas, um trono o esperava.', 34.0, 40.0),
                    ('Dogge', 'Agora o poder é meu. Nenhum guardião me detém.', 40.5, 46.5),
                    ('Dragão Sombrio', 'Salve o novo rei das sombras...', 47.0, 51.5)]),
        # 4) Gadigago vai embora, os outros temem
        Shot(52, 70, 'stage6', 'shadow', zoom=(1.0, 1.1), fade=1.5, actors=[
            fig('dogge', [(52, 900, G)], 'idle', s=1.9, tint=dark, flip=True, bob=2),
            fig('gadigago', [(52, 560, G), (63, -160, G)], [(52, 'idle'), (56, 'walk')], flip=True),
            npc('c08', [(52, 330, G - 30)], s=1.5, tint=(0.6, 0.6, 0.8)),
            npc('c09', [(52, 200, G - 40)], s=1.5, tint=(0.6, 0.6, 0.8))],
             fx=[Fx.tint(52, 70, (50, 0, 80, 80), 1.5, 2.0)],
             lines=[(None, 'Gadigago partiu sem olhar para trás. Os outros baixaram a cabeça, com medo.', 54.0, 66.0)]),
        # 5) o novo nome
        Shot(70, 90, 'stage6', 'shadow', zoom=(1.0, 1.25), focus=(0.5, 0.7), fade=2.0, card=('O REI DAS SOMBRAS', 'Final: Poder', 75.0, 88.0), actors=[
            fig('dogge', [(70, 640, G)], 'idle', s=2.0, tint=dark, bob=2)],
             fx=[Fx.tint(70, 90, (70, 0, 90, 100), 1.5, 2.0)]),
    ]
    return Scene('final_poder', 90, shots, music=[('spy_glass.mp3', 0, 40, 0.7, 1.5, 4.0)], amb=[('wind.mp3', 30, 70, 0.2)],
                 sfx=[(5.0, 'charge.mp3', 0.8), (12.0, 'absorb.mp3', 0.9), (20.0, 'thunder.mp3', 0.8), (27.0, 'thunder.mp3', 0.7)], end_fade=2.4)
