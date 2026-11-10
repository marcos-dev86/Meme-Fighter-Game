"""Cutscenes CURTAS por acao (escalada, cassino, bau, nivel). Videos repetiveis de 4-9 s, so com arte/sons ja existentes."""
import random
from engine import *
from engine import _png, _fit
from scenes_a import fig

IC = lambda n: _png(A('icons', f'{n}.png'))
_FONT_BIG = ImageFont.truetype(FONT, 78)


def blit(cv, img, cx, cy, scale=1.0, rot=0.0, alpha=1.0, flipx=1.0):
    """Cola uma imagem centrada em (cx,cy) com escala, rotacao e escala horizontal (flipx<0 = espelhada, |flipx|<1 = girando)."""
    w, h = max(1, int(img.width * scale * abs(flipx))), max(1, int(img.height * scale))
    s = img.resize((w, h), Image.NEAREST)
    if flipx < 0:
        s = s.transpose(Image.FLIP_LEFT_RIGHT)
    if rot:
        s = s.rotate(rot, resample=Image.BICUBIC, expand=True)
    if alpha < 1:
        s = s.copy(); s.putalpha(s.getchannel('A').point(lambda v: int(v * alpha)))
    cv.alpha_composite(s, (int(cx - s.width / 2), int(cy - s.height / 2)))


def banner(cv, text, alpha, y=150, color=(255, 226, 130, 255)):
    lay = Image.new('RGBA', cv.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    c = color[:3] + (int(255 * alpha),)
    outline(d, (W // 2, y), text, _fit(text, 78), c, (30, 18, 4, int(255 * alpha)), 5)
    cv.alpha_composite(lay)


def coins(cv, t, t0, n=26, seed=1, x0=200, x1=1080, scale=1.0, dur=2.4):
    rnd = random.Random(seed)
    for i in range(n):
        st = t0 + rnd.random() * 1.2
        if t < st or t > st + dur:
            continue
        x = x0 + rnd.random() * (x1 - x0)
        sp = 0.6 + rnd.random() * 0.8
        p = (t - st) / dur
        y = -60 + (H + 140) * (p ** 1.4) * sp + 40 * math.sin(p * 9 + i)
        blit(cv, IC('coin'), x, y, (0.55 + rnd.random() * 0.4) * scale, rot=(t * 240 + i * 40) % 360)


def sparks(cv, t, t0, cx, cy, n=14, r=260, dur=1.4, name='star'):
    for i in range(n):
        a = i / n * 2 * math.pi
        p = (t - t0) / dur
        if 0 <= p <= 1:
            blit(cv, IC(name), cx + math.cos(a) * r * p, cy + math.sin(a) * r * p, 0.6 * (1 - p) + 0.2, rot=t * 200, alpha=1 - p)


class Custom(Shot):
    def __init__(self, t0, t1, draw, **k):
        super().__init__(t0, t1, **k)
        self.draw = draw

    def render(self, t):
        cv = super().render(t)
        return self.draw(cv, t)


# --------------------------------------------------------------------------- escalada
def wall_layer(kind, off, edge=None):
    """Paredao igual ao do jogo (cliff): rocha azul-gelo ou vulcanica, laterais e degraus; off = deslocamento vertical."""
    ice = kind == 'montanha'
    base, alt, rung, rail = (('#a9cfe0', '#94bdd1', '#e9f6ff', '#5f7f93') if ice else ('#6e3b2f', '#5c3027', '#f0a35c', '#2a1410'))
    wx0, wx1 = 380, 900
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rectangle((wx0, 0, wx1, H), fill=base)
    for i in range(-2, 12):  # blocos de rocha
        y = (i * 96 + off) % (H + 192) - 96
        for j in range(5):
            if (i + j) % 2:
                d.rectangle((wx0 + j * 104, y, wx0 + j * 104 + 104, y + 96), fill=alt)
    d.rectangle((wx0, 0, wx0 + 22, H), fill=rail)
    d.rectangle((wx1 - 22, 0, wx1, H), fill=rail)
    for i in range(-2, 8):  # degraus de piolet
        y = (i * 150 + off) % (H + 300) - 150
        for k in range(3):
            d.rectangle((wx0 + 70, y + k * 40, wx1 - 70, y + k * 40 + 14), fill=rung)
    return lay


def climb(kind, up, dur):
    bgname, ground = ('stage5', (250, 252, 255)) if kind == 'montanha' else ('stage4', (60, 30, 25))
    grade = 'cold' if kind == 'montanha' else 'warm'
    label = 'ESCALANDO...' if up else 'DESCENDO...'

    def draw(cv, t):
        speed = 150
        off = (t * speed) if up else (-t * speed)
        lay = wall_layer(kind, off)
        cv.alpha_composite(lay)
        # fim do paredao: no topo aparece a bandeira; na descida, o chao sobe de baixo
        p_end = ramp(t, dur - 1.6, dur - 0.4)
        if up and p_end > 0:
            blit(cv, IC('flag'), 640, 90 + (1 - p_end) * -160, 2.2)
        if (not up) and p_end > 0:
            d = ImageDraw.Draw(cv)
            d.rectangle((0, int(H - p_end * 150), W, H), fill=ground + (255,))
        # Dogge: pose de golpe/ passo alternados + piolet batendo
        cyc = (t * 3.2) % 1.0
        poses = ['walk1', 'strong', 'walk2', 'flash'] if up else ['walk1', 'walk2', 'walk3', 'walk2']
        pose = poses[int(cyc * 4)]
        spr = scaled(pose_img('dogge', pose), 1.5)
        y = 600 - (0 if up else 10)
        cv.alpha_composite(spr, (int(640 - spr.width / 2), int(y - spr.height)))
        swing = math.sin(cyc * 2 * math.pi)
        blit(cv, IC('pickaxe'), 790 + swing * 30, y - 250 - swing * 40, 1.7, rot=-50 + swing * 40)
        if up and int(cyc * 4) == 1:
            blit(cv, effect_frame('hit_flash', int((cyc * 4 % 1) * 7)), 860, y - 300, 2.4)
        banner(cv, label, min(ramp(t, 0.1, 0.5), 1 - ramp(t, dur - 0.5, dur)), 90)
        return cv
    shots = [Custom(0, dur, draw, bg_name=bgname, grade=grade, zoom=(1.0, 1.04), fade=0.3)]
    sfx = [(0.3 + i * 0.62, 'climb.mp3', 0.8) for i in range(int((dur - 0.6) / 0.62))]
    if up:
        sfx.append((dur - 1.3, 'levelup.mp3', 0.45))
    return Scene(f'climb_{kind}_{"sobe" if up else "desce"}', dur, shots, music=[('frozen_wastes.mp3' if kind == 'montanha' else 'mountain_pass.mp3', 0, 6, 0.5, 0.4, 1.2)],
                 sfx=sfx, amb=[('wind.mp3', 0, dur, 0.35)], end_fade=0.4)


def scene_climb_montanha_sobe(): return climb('montanha', True, 6.0)
def scene_climb_montanha_desce(): return climb('montanha', False, 5.0)
def scene_climb_vulcao_sobe(): return climb('vulcao', True, 6.0)
def scene_climb_vulcao_desce(): return climb('vulcao', False, 5.0)


# --------------------------------------------------------------------------- cassino
SYMS = ['dog', 'banana', 'moai', 'card', 'gem', 'seven']
SLOT_ICON = {'dog': 'dog', 'banana': 'banana', 'moai': 'moai', 'joker': 'card', 'gem': 'gem', 'seven': 'seven'}


def slot(symbol, dur):
    jack = symbol == 'seven'
    target = SLOT_ICON[symbol]
    machine = pose_machine = _png(A('furniture', 'cas_slot.png'))
    S_ = 6.5
    mw, mh = int(48 * S_), int(96 * S_)
    mx0, my0 = 640 - mw // 2, 715 - mh
    win = (mx0 + 12 * S_, my0 + 20 * S_, mx0 + 36 * S_, my0 + 44 * S_)  # janela dos rolos
    stops = [1.7, 2.3, 2.9]
    rnd = random.Random(7)
    strips = [[rnd.choice(SYMS) for _ in range(30)] for _ in range(3)]

    def draw(cv, t):
        wob = (math.sin(t * 70) * 5 * ramp(t, stops[2], stops[2] + 0.2) * (1 - ramp(t, stops[2] + 0.2, stops[2] + 1.2))) if t > stops[2] else 0
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        m = machine.resize((mw, mh), Image.NEAREST)
        lay.alpha_composite(m, (int(mx0 + wob), int(my0)))
        d = ImageDraw.Draw(lay)
        wx0, wy0, wx1, wy1 = win
        d.rectangle((wx0 + wob, wy0, wx1 + wob, wy1), fill=(250, 248, 235, 255))
        rw = (wx1 - wx0) / 3
        for r in range(3):
            x0 = wx0 + r * rw + wob
            cell = rw
            if t < stops[r]:
                pos = (t * 9 + r * 2.3) % 30
                for k in range(-1, 3):
                    idx = int(pos) + k
                    sy = wy0 + (k - (pos % 1)) * cell + (wy1 - wy0) / 2 - cell / 2 + cell * 0.5
                    icn = IC(SLOT_ICON.get(strips[r][idx % 30], strips[r][idx % 30]) if strips[r][idx % 30] != 'card' else 'card')
                    if wy0 - cell < sy < wy1:
                        s = icn.resize((int(cell * 0.9), int(cell * 0.9)), Image.NEAREST)
                        lay.alpha_composite(s, (int(x0 + cell * 0.05), int(sy)))
            else:
                bounce = max(0, 1 - (t - stops[r]) * 5) * 10
                s = IC(target).resize((int(cell * 0.9), int(cell * 0.9)), Image.NEAREST)
                lay.alpha_composite(s, (int(x0 + cell * 0.05), int((wy0 + wy1) / 2 - s.height / 2 - bounce)))
            if r:
                d.line((x0, wy0, x0, wy1), fill=(90, 60, 40, 255), width=3)
        cv.alpha_composite(lay)
        win_t = stops[2] + 0.15
        if t > win_t:
            k = (t - win_t)
            for i in range(10):  # luzes piscando ao redor da maquina
                a = i / 10 * 2 * math.pi
                on = int(t * 8 + i) % 2
                blit(cv, IC('sparkle'), 640 + math.cos(a) * 260, 330 + math.sin(a) * 250, 0.8 if on else 0.4, rot=t * 90)
            coins(cv, t, win_t, n=44 if jack else 26, seed=3, scale=1.2 if jack else 1.0, dur=2.6)
            sparks(cv, t, win_t, 640, 300, n=18 if jack else 12, r=380 if jack else 280)
            banner(cv, 'JACKPOT 777!' if jack else 'TRÊS IGUAIS!', min(ramp(t, win_t, win_t + 0.3), 1 - ramp(t, dur - 0.5, dur)), 110,
                   (255, 90, 90, 255) if jack else (255, 226, 130, 255))
        if jack and t > win_t:
            cv = Image.blend(cv, Image.new('RGBA', cv.size, (255, 230, 140, 255)), 0.35 * (1 - ramp(t, win_t, win_t + 1.2)))
        # zoom suave na janela
        z = 1 + 0.35 * ramp(t, 0.2, stops[2]) - 0.15 * ramp(t, stops[2] + 0.6, dur)
        cx, cy = (wx0 + wx1) / 2, (wy0 + wy1) / 2
        cw, ch = W / z, H / z
        ox = min(max(cx - cw / 2 * 1.0 - (cx - W / 2) * (1 - 1 / z) * 0, 0), W - cw)
        oy = min(max(cy - ch / 2 + (1 - 1 / z) * 60, 0), H - ch)
        return cv.crop((int(ox), int(oy), int(ox + cw), int(oy + ch))).resize((W, H), Image.BILINEAR)
    shots = [Custom(0, dur, draw, bg_name='stage8', grade='dark', zoom=(1.0, 1.0), fade=0.25)]
    win_t = stops[2] + 0.15
    sfx = [(0.3, 'swing.mp3', 0.6)] + [(s, 'block.mp3', 0.8) for s in stops] + [(win_t, 'levelup.mp3', 0.8)] + [(win_t + 0.15 + i * 0.22, 'coin.mp3', 0.7) for i in range(10)]
    if jack:
        sfx += [(win_t, 'thunder.mp3', 0.6), (win_t + 0.6, 'levelup.mp3', 0.6)] + [(win_t + 2.4 + i * 0.2, 'coin.mp3', 0.6) for i in range(6)]
    return Scene(f'cassino_slot_{"777" if jack else symbol}', dur, [shots[0]], music=[('retrofuture.mp3', 0, 24, 0.5, 0.3, 1.2)], sfx=sfx, end_fade=0.4)


def scene_cassino_slot_dog(): return slot('dog', 6.5)
def scene_cassino_slot_banana(): return slot('banana', 6.5)
def scene_cassino_slot_moai(): return slot('moai', 6.5)
def scene_cassino_slot_joker(): return slot('joker', 6.5)
def scene_cassino_slot_gem(): return slot('gem', 6.5)
def scene_cassino_slot_777(): return slot('seven', 9.0)


def table_scene(name, furn, label, dur, prop):
    tbl = _png(A('furniture', f'{furn}.png'))

    def draw(cv, t):
        s = tbl.resize((144 * 6, 96 * 6), Image.NEAREST)
        cv.alpha_composite(s, (640 - s.width // 2, 560 - s.height))
        prop(cv, t)
        win_t = 2.4
        if t > win_t:
            coins(cv, t, win_t, n=30, seed=5, dur=2.2)
            sparks(cv, t, win_t, 640, 340, n=12, r=300)
            banner(cv, label, min(ramp(t, win_t, win_t + 0.3), 1 - ramp(t, dur - 0.5, dur)), 110)
        return cv
    sfx = [(0.3, 'swing.mp3', 0.6), (2.4, 'levelup.mp3', 0.8)] + [(2.55 + i * 0.22, 'coin.mp3', 0.7) for i in range(9)]
    return Scene(name, dur, [Custom(0, dur, draw, bg_name='stage8', grade='dark', zoom=(1.0, 1.08), fade=0.25)], music=[('retrofuture.mp3', 0, 24, 0.5, 0.3, 1.2)], sfx=sfx, end_fade=0.4)


def scene_cassino_cara_coroa():
    def prop(cv, t):
        if t < 2.4:
            p = t / 2.4
            y = 400 - math.sin(p * math.pi) * 300
            blit(cv, IC('coin'), 640, y, 3.2, flipx=math.cos(p * 18) if abs(math.cos(p * 18)) > 0.08 else 0.08)
        else:
            blit(cv, IC('coin'), 640, 400 - 6 * math.sin((t - 2.4) * 10) * max(0, 1 - (t - 2.4) * 2), 3.4)
    return table_scene('cassino_cara_coroa', 'cas_flip', 'DEU CARA!' if False else 'VITÓRIA!', 5.5, prop)


def scene_cassino_dados():
    def prop(cv, t):
        for k, dx in enumerate((-110, 110)):
            if t < 2.4:
                p = t / 2.4
                y = 400 - abs(math.sin(p * 9)) * 230 * (1 - p) ** 1.1
                blit(cv, IC('dice'), 640 + dx + (1 - p) * -dx * 0.8 * (1 if k else -1), y, 2.6, rot=(t * 560 * (1 - p) * (1 if k else -1)))
            else:
                blit(cv, IC('dice'), 640 + dx, 400, 2.7)
    return table_scene('cassino_dados', 'cas_dice', 'VITÓRIA!', 5.5, prop)


def scene_cassino_roleta():
    def prop(cv, t):
        spin = 1800 * (1 - (1 - min(t / 2.4, 1)) ** 2.4)
        blit(cv, IC('roulette'), 640, 380, 4.0, rot=-spin)
        if t > 2.4:
            blit(cv, IC('dot'), 640 + 90, 300 + 10 * math.sin((t - 2.4) * 12) * max(0, 1 - (t - 2.4)), 1.4)
    return table_scene('cassino_roleta', 'cas_roulette', 'VITÓRIA!', 5.5, prop)


def scene_cassino_cartas():
    def prop(cv, t):
        for k, dx in enumerate((-130, 130)):
            p = min(max((t - 0.4 - k * 0.5) / 1.6, 0), 1)
            fx = math.cos(p * math.pi)
            icn = IC('card') if fx < 0 else IC('card')
            blit(cv, icn, 640 + dx, 390, 3.2, flipx=(fx if abs(fx) > 0.08 else 0.08))
            if fx < 0 and p >= 1 - 1e-6 and t > 2.0:
                blit(cv, IC('crown'), 640 + dx, 380, 1.6)
        if t > 2.4:
            blit(cv, IC('crown'), 640, 250 + 8 * math.sin(t * 6), 1.8)
    return table_scene('cassino_cartas', 'cas_cards', 'VITÓRIA!', 5.5, prop)


# --------------------------------------------------------------------------- bau e nivel
def scene_bau_tesouro():
    dur = 5.0

    def draw(cv, t):
        # raios de luz atras do bau
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        k = ramp(t, 1.2, 1.8) * (1 - ramp(t, dur - 0.8, dur))
        for i in range(14):
            a = i / 14 * 2 * math.pi + t * 0.6
            d.polygon([(640, 360), (640 + math.cos(a - 0.09) * 900, 360 + math.sin(a - 0.09) * 900), (640 + math.cos(a + 0.09) * 900, 360 + math.sin(a + 0.09) * 900)], fill=(255, 226, 130, int(90 * k)))
        cv.alpha_composite(lay)
        bounce = abs(math.sin(min(t, 1.2) * 7)) * 20 * (1 - min(t / 1.2, 1))
        blit(cv, IC('chest_open'), 640, 360 - bounce, 4.6 if t > 1.2 else 4.2)
        if t > 1.2:
            for i in range(18):  # moedas saindo do bau em parabola
                rnd = random.Random(i)
                vx, vy = (rnd.random() - 0.5) * 520, -(420 + rnd.random() * 260)
                tt = (t - 1.2 - rnd.random() * 0.5)
                if 0 < tt < 2.6:
                    blit(cv, IC('coin'), 640 + vx * tt, 330 + vy * tt + 520 * tt * tt, 0.9, rot=tt * 360)
            sparks(cv, t, 1.2, 640, 330, n=14, r=330, dur=1.6, name='sparkle')
        cv.alpha_composite(scaled(pose_img('dogge', 'flash' if t > 1.2 else 'idle'), 1.2), (140, 720 - 240 - 20))
        banner(cv, 'TESOURO ENCONTRADO!', min(ramp(t, 1.3, 1.7), 1 - ramp(t, dur - 0.5, dur)), 90)
        return cv
    sfx = [(0.4, 'landing.mp3', 0.7), (1.2, 'levelup.mp3', 0.8)] + [(1.35 + i * 0.2, 'coin.mp3', 0.7) for i in range(10)]
    return Scene('bau_tesouro', dur, [Custom(0, dur, draw, bg_name='stage7', grade='warm', zoom=(1.0, 1.06), fade=0.25)], music=[('secret_garden.mp3', 0, 10, 1.6, 0.3, 1.0)], sfx=sfx, end_fade=0.4)


def scene_subiu_de_nivel():
    dur = 4.6

    def draw(cv, t):
        k = ramp(t, 0.2, 1.4)
        cx, cy = 640, 360
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        for i in range(12):
            a = i / 12 * 2 * math.pi - t * 0.8
            d.polygon([(cx, 520), (cx + math.cos(a - 0.1) * 900, 520 + math.sin(a - 0.1) * 900), (cx + math.cos(a + 0.1) * 900, 520 + math.sin(a + 0.1) * 900)], fill=(255, 240, 160, int(70 * k)))
        cv.alpha_composite(lay)
        pose = 'charge' if t < 1.6 else 'strong' if t < 2.0 else 'idle'
        spr = scaled(pose_img('dogge', pose), 1.8)
        up = 6 * math.sin(t * 6) if t > 1.6 else 0
        cv.alpha_composite(spr, (int(640 - spr.width / 2), int(600 - spr.height - up)))
        if t < 1.8:
            fr = effect_frame('charge_up', int((t * 14) % 12))
            s = fr.resize((fr.width * 5, fr.height * 5), Image.NEAREST)
            cv.alpha_composite(s, (640 - s.width // 2, 300 - s.height // 2))
        if t > 1.6:
            sparks(cv, t, 1.6, 640, 330, n=16, r=320, dur=1.8)
            for i in range(6):
                blit(cv, IC('star'), 200 + i * 175, 180 + 40 * math.sin(t * 4 + i), 0.9, rot=t * 120)
        banner(cv, 'SUBIU DE NÍVEL!', min(ramp(t, 1.7, 2.1), 1 - ramp(t, dur - 0.5, dur)), 110)
        if 1.6 < t < 2.0:
            cv = Image.blend(cv, Image.new('RGBA', cv.size, (255, 255, 255, 255)), 0.5 * (1 - (t - 1.6) / 0.4))
        return cv
    sfx = [(0.2, 'charge.mp3', 0.7), (1.6, 'levelup.mp3', 0.9), (1.7, 'speed_up.mp3', 0.5)]
    return Scene('subiu_de_nivel', dur, [Custom(0, dur, draw, bg_name='stage1', grade='warm', zoom=(1.0, 1.05), fade=0.25)], music=[('comic_hero.mp3', 0, 0, 0.5, 0.2, 1.0)], sfx=sfx, end_fade=0.4)
