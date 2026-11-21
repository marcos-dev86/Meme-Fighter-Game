"""Cutscenes 14-21: ENCERRAMENTOS DE ARCO da expansao maritima (gatilhos = missoes de src/game/story/missionsMar.ts).

So arte/sons que ja existem no projeto:
  * cenarios de superficie: assets/legacy-art/stages/stage13*.webp
  * sprites-v2 (dogge, sea_beast, poseidon), NPCs (assets/npcs, npc-walk), icones de itens (assets/icons), mapas de mergulho (assets/sea/maps)
  * criaturas marinhas (assets/sea/creatures) e o pacote Time Fantasy Atlantis copiado para assets/sea/cutscene-src/
    (tileset de Atlantida, sereios RPG Maker 26x46, bolhas, respingos de agua; ver assets/sea/CREDITS.md)
Os FUNDOS submarinos sao COMPOSTOS aqui: gradiente de agua (pontilhado) + tiles/props do tileset + raios de luz + bolhas + neve marinha.
Nenhum personagem novo e inventado: os sereios sao os do pacote, os NPCs humanos sao os sprites de NPC do jogo, o fantasma e o capitao
com transparencia, e os bichos sao as folhas do mergulho. Textos em pt-BR; os fatos citados vem de missionsMar.ts, diveNpcs.ts,
diveScenes.ts, diveSites.ts e rosterState.ts.
"""
import random
from PIL import ImageFilter
from engine import *
import engine
from engine import _png
from scenes_a import fig, npc, S

SRC = ('sea', 'cutscene-src')
G = 535  # linha dos pes (a caixa de fala comeca em ~540)


# =========================================================================== arte (recortes pixel-art, escala inteira NEAREST)
@functools.lru_cache(maxsize=None)
def _tiles():
    return _png(A(*SRC, 'tf_atlantis_tiles.png'))


@functools.lru_cache(maxsize=None)
def prop(x0, y0, x1, y1, var=0):
    """Recorte do tileset de Atlantida (var 0 = verde/cinza, var 1 = azul/areia, +272 px) sem as bordas transparentes."""
    im = _tiles().crop((x0, y0 + 272 * var, x1, y1 + 272 * var))
    bb = im.getbbox()
    return im.crop(bb) if bb else im


# nome -> retangulos (x0,y0,x1,y1) do tileset (grade de 16 px; conferidos em tools/cutscenes/_preview)
PROPS = {
    'weed_tall': [(224, 32, 240, 64), (240, 32, 256, 64), (256, 32, 272, 64), (272, 32, 288, 64), (288, 32, 304, 64), (304, 32, 320, 64), (320, 32, 336, 64)],
    'weed_low': [(208, 80, 224, 96), (224, 80, 240, 96), (240, 80, 256, 96), (208, 64, 224, 80), (224, 64, 240, 80)],
    'coral_red': [(208, 112, 240, 144), (240, 112, 272, 144), (208, 144, 240, 160), (224, 144, 272, 160)],
    'coral_purple': [(272, 144, 288, 160), (288, 144, 304, 160), (304, 144, 320, 160), (320, 144, 336, 160)],
    'kelp_green': [(208, 160, 224, 192), (224, 160, 240, 192), (272, 160, 304, 192), (304, 160, 336, 192)],
    'kelp_red': [(208, 192, 224, 224), (224, 192, 240, 224), (272, 192, 304, 224), (304, 192, 336, 224)],
    'anchor': [(366, 20, 396, 48), (396, 24, 430, 52)],
    'statue': [(338, 238, 372, 272), (380, 238, 412, 272), (428, 238, 462, 272)],
    'clam_pearl': [(306, 240, 336, 272)],
    'clam': [(244, 240, 272, 272), (274, 240, 304, 272)],
    'pillar': [(384, 112, 400, 160), (400, 112, 432, 160)],
    'ruin_wall': [(336, 144, 400, 176), (336, 176, 400, 208), (384, 176, 464, 240)],
    'rock': [(336, 64, 400, 100), (432, 64, 470, 100), (384, 64, 432, 110)],
    'arch': [(224, 16, 256, 32), (256, 16, 288, 32)],
    'tower': [(430, 110, 464, 172)],
    'shell': [(208, 224, 224, 240), (224, 224, 240, 240), (256, 224, 272, 240), (320, 224, 336, 240)],
}


def pick(kind, rng, var=0):
    r = rng.choice(PROPS[kind])
    return prop(*r, var)


def _fog(im, color, amt):
    a = np.asarray(im, dtype=np.float32)
    a[..., :3] = a[..., :3] * (1 - amt) + np.array(color, dtype=np.float32) * amt
    return Image.fromarray(a.astype(np.uint8))


def _lerp(c0, c1, t):
    return tuple(c0[i] + (c1[i] - c0[i]) * t for i in range(3))


BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16.0


def water_gradient(top, bottom, w=320, h=180, steps=14):
    """Gradiente de agua pontilhado (Bayer) em resolucao nativa 320x180 (depois x4, NEAREST) para o visual pixel-art."""
    yy, xx = np.mgrid[0:h, 0:w]
    t = yy / (h - 1)
    v = t * steps + BAYER[yy % 4, xx % 4] - 0.5
    band = np.clip(np.floor(v + 0.5), 0, steps) / steps
    c0, c1 = np.array(top, dtype=np.float32), np.array(bottom, dtype=np.float32)
    a = c0[None, None, :] + (c1 - c0)[None, None, :] * band[..., None]
    return Image.fromarray(a.astype(np.uint8))


MOODS = {  # (cor do topo, cor do fundo, cor da neblina distante, cor do chao)
    'reef': ((70, 205, 215), (14, 96, 140), (40, 150, 175), 1),
    'wreck': ((36, 120, 126), (6, 38, 58), (14, 70, 90), 0),
    'ruins': ((52, 134, 124), (8, 48, 60), (20, 84, 90), 0),
    'atlantis': ((60, 150, 210), (10, 44, 108), (28, 90, 160), 0),
    'abyss': ((18, 36, 72), (2, 4, 14), (8, 18, 40), 0),
    'open': ((96, 210, 235), (20, 100, 160), (60, 160, 200), 1),
    'warm': ((130, 200, 205), (24, 90, 130), (80, 150, 170), 1),
}


def compose_sea(mood, seed, far=(), mid=(), floor_y=122, structures=(), col_cells=None):
    """Fundo submarino 1280x720. far/mid = [(prop_kind, x, escala)] posicionados no chao (x em pixels nativos 0-320)."""
    top, bot, fog, var = MOODS[mood]
    rng = random.Random(seed)
    cv = water_gradient(top, bot).convert('RGBA')
    # camada distante: silhuetas grandes (escala 2) mergulhadas na neblina
    for kind, x, sc in far:
        im = pick(kind, rng, var)
        im = im.resize((im.width * 2, im.height * 2), Image.NEAREST) if sc == 2 else im
        a = im.getchannel('A')
        rgb = _fog(im.convert('RGB'), fog, 0.70)
        im2 = rgb.convert('RGBA'); im2.putalpha(a)
        cv.alpha_composite(im2, (int(x - im2.width / 2), int(floor_y - 6 - im2.height)))
    # chao: faixa de ladrilhos (cobblestone) com a borda de cima mais clara
    fl = Image.new('RGBA', (320, 180), (0, 0, 0, 0))
    for j, y in enumerate(range(floor_y, 180, 16)):
        for i in range(0, 320, 16):
            if j == 0:
                xs = 32 + 16 * rng.randint(0, 6)
                t = _tiles().crop((xs, 16 + 272 * var, xs + 16, 32 + 272 * var))
            else:
                x0 = 16 + 16 * rng.randint(0, 4)
                y0 = 48 + 16 * rng.randint(0, 1)
                t = _tiles().crop((x0, y0 + 272 * var, x0 + 16, y0 + 16 + 272 * var))
            fl.alpha_composite(t.resize((16, 16)), (i, y))
    fa = np.asarray(fl, dtype=np.float32)
    yy = np.arange(180, dtype=np.float32)[:, None]
    shade = np.clip(1.0 - (yy - floor_y) / 90.0, 0.35, 1.0) * 0.9
    fa[..., :3] = fa[..., :3] * shade[..., None] * 0.9 + np.array(fog, dtype=np.float32) * 0.18
    cv.alpha_composite(Image.fromarray(np.clip(fa, 0, 255).astype(np.uint8)))
    # props do meio (pes no chao)
    for kind, x, sc in mid:
        im = pick(kind, rng, var)
        cv.alpha_composite(im, (int(x - im.width / 2), int(floor_y + 6 - im.height)))
    out = cv.convert('RGB').resize((W, H), Image.NEAREST)
    return out


def _reg(name, fn):
    engine.CUSTOM_BG[name] = fn


def _spread(kinds, n, x0, x1, seed):
    rng = random.Random(seed)
    return [(rng.choice(kinds), rng.randint(x0, x1), 1) for _ in range(n)]


_reg('sea_reef', lambda: compose_sea('reef', 1, far=[('pillar', 40, 2), ('arch', 250, 2), ('rock', 140, 2)],
                                      mid=_spread(['coral_red', 'weed_tall', 'kelp_green', 'coral_purple', 'weed_low', 'shell'], 20, 4, 316, 11) + [('clam_pearl', 280, 1)]))
_reg('sea_wreck', lambda: compose_sea('wreck', 2, far=[('ruin_wall', 70, 2), ('rock', 260, 2)],
                                       mid=[('anchor', 36, 1), ('anchor', 290, 1)] + _spread(['weed_tall', 'rock', 'weed_low', 'coral_purple', 'shell'], 16, 4, 316, 21)))
_reg('sea_ruins', lambda: compose_sea('ruins', 3, far=[('pillar', 30, 2), ('ruin_wall', 150, 2), ('pillar', 290, 2), ('tower', 220, 2)],
                                       mid=[('statue', 30, 1), ('pillar', 100, 1), ('ruin_wall', 200, 1), ('statue', 296, 1)] + _spread(['weed_tall', 'weed_low', 'shell', 'rock'], 12, 4, 316, 31)))
_reg('sea_atlantis', lambda: compose_sea('atlantis', 4, far=[('tower', 40, 2), ('ruin_wall', 100, 2), ('tower', 170, 2), ('pillar', 230, 2), ('tower', 300, 2)],
                                          mid=[('statue', 24, 1), ('statue', 160, 1), ('statue', 300, 1), ('pillar', 76, 1), ('pillar', 250, 1), ('arch', 120, 1)] + _spread(['weed_tall', 'coral_red', 'kelp_green', 'shell'], 14, 4, 316, 41)))
_reg('sea_abyss', lambda: compose_sea('abyss', 5, far=[('rock', 60, 2), ('pillar', 240, 2)],
                                       mid=_spread(['rock', 'weed_tall', 'coral_purple', 'shell'], 10, 4, 316, 51) + [('clam_pearl', 160, 1)]))
_reg('sea_open', lambda: compose_sea('open', 6, far=[('rock', 40, 2), ('rock', 270, 2)],
                                      mid=_spread(['weed_tall', 'kelp_green', 'coral_red', 'weed_low', 'shell', 'coral_purple'], 22, 4, 316, 61)))
_reg('sea_warm', lambda: compose_sea('warm', 7, far=[('tower', 50, 2), ('pillar', 260, 2), ('ruin_wall', 160, 2)],
                                      mid=_spread(['weed_tall', 'kelp_green', 'coral_red', 'statue', 'shell'], 18, 4, 316, 71)))


# =========================================================================== camadas animadas (raios, bolhas, neve marinha, vinheta)
@functools.lru_cache(maxsize=None)
def _rays(seed, strength):
    rng = random.Random(seed)
    lay = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(lay)
    for _ in range(9):
        x = rng.randint(-100, W)
        wd = rng.randint(50, 140)
        sh = rng.randint(120, 320)
        d.polygon([(x, 0), (x + wd, 0), (x + wd + sh, H), (x + sh - wd // 2, H)], fill=rng.randint(40, 90))
    lay = lay.filter(ImageFilter.GaussianBlur(14))
    g = np.linspace(1.0, 0.05, H, dtype=np.float32)[:, None]
    a = (np.asarray(lay, dtype=np.float32) * g * strength).astype(np.uint8)
    out = Image.new('RGBA', (W, H), (215, 250, 255, 0))
    out.putalpha(Image.fromarray(a))
    return out


@functools.lru_cache(maxsize=None)
def _vignette(a_max):
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    a = np.clip((d - 0.55) / 0.9, 0, 1) ** 1.6 * a_max
    out = Image.new('RGBA', (W, H), (0, 12, 30, 0))
    out.putalpha(Image.fromarray(a.astype(np.uint8)))
    return out


@functools.lru_cache(maxsize=None)
def _bubble_cell(row):
    sh = _png(A(*SRC, 'char_bubbles.png'))
    return sh.crop((0, row * 16, 16, row * 16 + 16))


@functools.lru_cache(maxsize=None)
def _bub(row, k):
    c = _bubble_cell(row)
    return c.resize((c.width * k, c.height * k), Image.NEAREST)


def water_fx(seed=1, rays=0.55, bubbles=22, snow=26, vig=140):
    """Camada f(cv, t, tl): raios de luz que oscilam, bolhas subindo (sprites do pacote), neve marinha e vinheta."""
    rng = random.Random(seed)
    bs = [(rng.randint(40, W - 40), rng.uniform(0, 1), rng.uniform(40, 110), rng.randint(1, 6), rng.uniform(0, 6.28), rng.choice([3, 4, 5])) for _ in range(bubbles)]
    sn = [(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(4, 14), rng.uniform(2, 6), rng.uniform(0, 6.28)) for _ in range(snow)]

    def f(cv, t, tl):
        if rays > 0:
            r = _rays(seed, rays)
            k = 0.75 + 0.25 * math.sin(t * 0.9 + seed)
            lay = r.copy()
            lay.putalpha(lay.getchannel('A').point(lambda v: int(v * k)))
            cv.alpha_composite(lay)
        d = ImageDraw.Draw(cv)
        for (x, y, v, s, ph) in sn:
            xx = (x + math.sin(t * 0.7 + ph) * 18) % W
            yy = (y + t * v * 0.5) % H
            d.rectangle((xx, yy, xx + s, yy + s), fill=(210, 245, 255, 90))
        for (x, p, v, row, ph, k) in bs:
            yy = H + 30 - ((p * (H + 60)) + t * v) % (H + 60)
            xx = x + math.sin(t * 1.3 + ph) * 14
            im = _bub(row, k)
            cv.alpha_composite(im, (int(xx), int(yy)))
        if vig:
            cv.alpha_composite(_vignette(vig))
    return f


def surface_fx(seed=3):
    """Mar de superficie (stage13): so a vinheta leve e brilhos."""
    return water_fx(seed, rays=0, bubbles=0, snow=0, vig=90)


# =========================================================================== atores (sereios, NPCs, criaturas)
@functools.lru_cache(maxsize=None)
def _mer_frame(sheet, idx, row, col, k):
    sh = _png(A(*SRC, sheet))
    rb, cb = divmod(idx, 4)
    x0 = (cb * 3 + col) * 26
    y0 = (rb * 4 + row) * 46
    im = sh.crop((x0, y0, x0 + 26, y0 + 46))
    return im.resize((26 * k, 46 * k), Image.NEAREST)


def MER(sheet, idx, direction='down', k=6, moving=False, fps=5):
    """Sereio do pacote Time Fantasy. sheet: mer_8_chars1.png (idx 4-7 = sem sombra) ou mer_8_1.png (idx 0-7). Escala inteira k, NEAREST."""
    row = {'down': 0, 'left': 1, 'right': 2, 'up': 3}[direction]

    def f(t):
        col = [0, 1, 2, 1][int(t * fps) % 4] if moving else 1
        return _mer_frame(sheet, idx, row, col, k)
    return f


def mer(sheet, idx, keys, d='down', k=6, moving=False, flip=False, **kw):
    kw.setdefault('shadow', False)
    kw.setdefault('bob', 5)
    return Actor(MER(sheet, idx, d, k, moving), keys, scale=1.0, flip=flip, nearest=True, **kw)


TRITAO = ('mer_8_chars1.png', 6)     # rei barbudo de cauda roxa: Guardiao Tritao
GIGACHAD = ('mer_8_1.png', 0)        # sereio sem camisa: Sereio Gigachad
CIDADAOS = [('mer_8_chars1.png', 4), ('mer_8_chars1.png', 5), ('mer_8_chars1.png', 7), ('mer_8_1.png', 3), ('mer_8_1.png', 5), ('mer_8_1.png', 2)]


@functools.lru_cache(maxsize=None)
def _sheet_frame(name, cols, fw, fh, i, scale, flip):
    sh = _png(A('sea', 'creatures', f'{name}.png'))
    c, r = i % cols, i // cols
    im = sh.crop((c * fw, r * fh, c * fw + fw, r * fh + fh))
    im = im.resize((int(fw * scale), int(fh * scale)), Image.NEAREST if scale == int(scale) else Image.BICUBIC)
    return im.transpose(Image.FLIP_LEFT_RIGHT) if flip else im


def CREATURE(name, cols, fw, fh, frames, scale=1.0, fps=6, flip=False):
    def f(t):
        return _sheet_frame(name, cols, fw, fh, frames[int(t * fps) % len(frames)], scale, flip)
    return f


def bicho(kind, keys, scale=1.0, flip=False, **kw):
    """Criaturas do mergulho (folhas de assets/sea/creatures). flip: espelha a folha (os desenhos olham para um lado so)."""
    spec = {
        'clown': ('clownfish', 4, 64, 64, [0, 1, 2, 3]), 'turtle': ('turtle', 4, 128, 128, [0, 1, 2, 3]),
        'angel': ('angel_fish', 4, 64, 64, [0, 1, 2, 3]), 'school': ('banc_anchois', 4, 80, 80, [0, 1, 2, 3]),
        'jelly': ('meduse_bleue', 2, 64, 64, [0, 1, 2]), 'jelly_pink': ('meduse_rose', 2, 64, 64, [0, 1, 2]),
        'jelly_violet': ('meduse_violette', 2, 64, 64, [0, 1, 2]), 'octo': ('pieuvre', 4, 128, 128, [0, 1, 2, 3]),
        'whale': ('baleine', 4, 496, 256, [0, 1, 2, 3]), 'angler': ('baudroief', 2, 128, 128, [0, 1]),
    }[kind]
    name, cols, fw, fh, frames = spec
    kw.setdefault('shadow', False)
    return Actor(CREATURE(name, cols, fw, fh, frames, scale, 5 if kind != 'whale' else 2, flip), keys, scale=1.0, **kw)


def icon(name, keys, scale=2.5, **kw):
    """Icone de item do jogo (assets/icons) como ator."""
    kw.setdefault('shadow', False)
    return Actor(IMG(['icons', f'{name}.png']), keys, scale=scale, **kw)


def lia(keys, **kw):      # Dra. Lia: sprite de NPC do mundo (teal), nunca ha um sprite aquatico proprio no jogo
    return npc('c15', keys, 'down', False, 1.7, shadow=False, **kw)


def nemo(keys, **kw):     # Cientista Nemo Junior
    return npc('c10', keys, 'down', False, 1.7, shadow=False, **kw)


def ghost(keys, **kw):    # Capitao Meme (fantasma): o NPC capitao com transparencia e tom azulado
    kw.setdefault('tint', (1.35, 1.55, 1.7))
    kw.setdefault('alpha', [(0, 0.7)])
    return npc('c22', keys, 'down', False, 1.7, shadow=False, **kw)


def dogge(keys, tl='idle', s=1.6, **kw):
    kw.setdefault('shadow', False)
    kw.setdefault('bob', 4)
    kw.setdefault('tint', (0.86, 0.96, 1.0))   # o tom da agua
    return fig('dogge', keys, tl, s=s, **kw)


# tiras de efeito de agua do pacote
@functools.lru_cache(maxsize=None)
def _splash(i, k):
    sh = _png(A(*SRC, 'water_splash.png'))
    fw, fh = 66, 77
    c, r = i % 5, i // 5
    im = sh.crop((c * fw, r * fh, c * fw + fw, r * fh + fh))
    return im.resize((fw * k, fh * k), Image.NEAREST)


def splash_layer(t0, x, y, k=5, dur=1.0, loops=1):
    """Respingo (Water Splash 01): 20 quadros 5x4. Camada 'front'."""
    def f(cv, t, tl):
        if t0 <= t < t0 + dur * loops:
            p = ((t - t0) / dur) % 1.0
            im = _splash(min(19, int(p * 20)), k)
            cv.alpha_composite(im, (int(x - im.width / 2), int(y - im.height)))
    return f


@functools.lru_cache(maxsize=None)
def _wb_impact(i, k):
    sh = _png(A(*SRC, 'waterball_impact.png'))
    c, r = i % 4, i // 4
    return sh.crop((c * 64, r * 64, c * 64 + 64, r * 64 + 64)).resize((64 * k, 64 * k), Image.NEAREST)


def impact_layer(t0, x, y, k=5, dur=0.9):
    def f(cv, t, tl):
        if t0 <= t < t0 + dur:
            im = _wb_impact(min(15, int((t - t0) / dur * 16)), k)
            cv.alpha_composite(im, (int(x - im.width / 2), int(y - im.height / 2)))
    return f


def rings(t0, t1, x, y, color=(200, 245, 255), every=0.9, maxr=420):
    """Aneis de som se espalhando (nota grave da Dona Marlene): so circulos, nada de arte nova."""
    def f(cv, t, tl):
        if not (t0 <= t < t1):
            return
        lay = Image.new('RGBA', cv.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        fade = min(ramp(t, t0, t0 + 0.8), 1 - ramp(t, t1 - 0.8, t1))
        for i in range(4):
            p = (((t - t0) / every) - i * 0.25) % 1.0
            r = 40 + p * maxr
            d.ellipse((x - r, y - r * 0.6, x + r, y + r * 0.6), outline=color + (int(150 * (1 - p) * fade),), width=5)
        cv.alpha_composite(lay)
    return f


def sparkle_burst(t0, x, y, dur=1.4, color=(255, 240, 160)):
    def f(cv, t, tl):
        if not (t0 <= t < t0 + dur):
            return
        p = (t - t0) / dur
        d = ImageDraw.Draw(cv)
        rng = random.Random(5)
        for i in range(26):
            a = rng.uniform(0, 6.28)
            r = (30 + rng.uniform(0, 200)) * p
            s = max(2, int(10 * (1 - p)))
            d.rectangle((x + math.cos(a) * r - s / 2, y + math.sin(a) * r * 0.8 - s / 2, x + math.cos(a) * r + s / 2, y + math.sin(a) * r * 0.8 + s / 2), fill=color + (int(255 * (1 - p)),))
    return f


def glow(x, y, r, color, t0, t1, strength=0.55):
    """Halo suave (ex.: tabua brilhando)."""
    def f(cv, t, tl):
        if not (t0 <= t < t1):
            return
        k = min(ramp(t, t0, t0 + 0.8), 1 - ramp(t, t1 - 0.8, t1)) * (0.8 + 0.2 * math.sin(t * 5))
        lay = Image.new('RGBA', cv.size, (0, 0, 0, 0))
        ImageDraw.Draw(lay).ellipse((x - r, y - r, x + r, y + r), fill=color + (int(255 * strength * k),))
        cv.alpha_composite(lay.filter(ImageFilter.GaussianBlur(r * 0.45)))
    return f


# =========================================================================== paineis (cartoes de mapa / esconderijos)
@functools.lru_cache(maxsize=None)
def _map_thumb(name, w):
    im = _png(A('sea', 'maps', f'{name}.png')).convert('RGB')
    h = int(w * im.height / im.width)
    return im.resize((w, h), Image.LANCZOS)


SITES = [('recife_pato', 'Recife do Pato'), ('naufragio', 'Naufrágio do Capitão'), ('caverna', 'Caverna das Águas-vivas'),
         ('ruinas', 'Ruínas dos Fragmentos'), ('atlantis', 'Atlântida'), ('lagoa', 'Lagoa do Acampamento'),
         ('fumarolas', 'Fumarolas do Vulcão'), ('gruta', 'Gruta Gelada'), ('abismo', 'Abismo Sombrio')]


def map_board(t0, t1, step=1.3, first=1.0):
    """Quadro 3x3 com os 9 locais de mergulho (mapas reais do jogo); cada um recebe o visto na sua vez."""
    ft = ImageFont.truetype(FONT, 20)
    chk = _png(A('icons', 'check.png'))
    tw, th_h, pitch = 300, 120, 160

    def f(cv, t, tl):
        if not (t0 <= t < t1):
            return
        al = min(ramp(t, t0, t0 + 0.7), 1 - ramp(t, t1 - 0.7, t1))
        lay = Image.new('RGBA', cv.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        d.rounded_rectangle((100, 30, W - 100, 610), 22, fill=(8, 26, 48, int(225 * al)), outline=(230, 190, 80, int(255 * al)), width=4)
        outline(d, (W // 2, 62), 'MAPA DO MAR', ImageFont.truetype(FONT, 38), (255, 226, 130, int(255 * al)), (30, 18, 4, int(255 * al)), 3)
        for i, (key, name) in enumerate(SITES):
            x = 150 + (i % 3) * (tw + 40)
            y = 108 + (i // 3) * pitch
            th = _map_thumb(key, tw).crop((0, 0, tw, th_h))
            on = t >= t0 + first + i * step
            lit = ramp(t, t0 + first + i * step, t0 + first + i * step + 0.5) if on else 0
            tl_ = Image.new('RGBA', th.size, (0, 0, 0, 0))
            base = th.convert('RGBA')
            dim = Image.blend(base, Image.new('RGBA', th.size, (4, 12, 28, 255)), 0.72 * (1 - lit))
            lay.alpha_composite(Image.blend(Image.new('RGBA', th.size, (0, 0, 0, 0)), dim, al), (x, y))
            col = (255, 226, 130, int(255 * al)) if on else (110, 130, 150, int(200 * al))
            d.rectangle((x - 2, y - 2, x + tw + 2, y + th_h + 2), outline=col, width=3)
            d.text((x + 4, y + th_h + 4), name, font=ft, fill=(255, 255, 255, int((255 if on else 150) * al)))
            if on:
                n = max(2, int(44 * (0.4 + 0.6 * lit)))
                c = chk.resize((n, n), Image.LANCZOS)
                lay.alpha_composite(c, (x + tw - 48, y + 4))
        cv.alpha_composite(lay)
    return f


SECRETS = [  # (mapa, titulo (REVEAL_SCENES), item real, icone)
    ('naufragio', 'A Cabine do Capitão', 'Pérola do Abismo', 'orb'),
    ('ruinas', 'Sala sob as Ruínas', 'Escama do Leviatã', 'gem'),
    ('atlantis', 'O Coração de Atlântida', 'Coração de Atlântida', 'heart'),
    ('abismo', 'O Último Esconderijo', 'Escama do Leviatã', 'gem'),
]


def secrets_board(t0, t1, step=3.2, first=0.8):
    ft = ImageFont.truetype(FONT, 25)
    fs = ImageFont.truetype(FONT, 21)
    cw = 250

    def f(cv, t, tl):
        if not (t0 <= t < t1):
            return
        al = min(ramp(t, t0, t0 + 0.7), 1 - ramp(t, t1 - 0.7, t1))
        lay = Image.new('RGBA', cv.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        d.rounded_rectangle((50, 60, W - 50, 560), 22, fill=(4, 16, 36, int(225 * al)), outline=(230, 190, 80, int(255 * al)), width=4)
        for i, (key, title, item, ic) in enumerate(SECRETS):
            x = 104 + i * (cw + 24)
            y = 90
            ta = t0 + first + i * step
            k = ramp(t, ta, ta + 0.9)
            th = _map_thumb(key, cw).crop((0, 0, cw, 150)).convert('RGBA')
            th = Image.blend(Image.new('RGBA', th.size, (3, 8, 20, 255)), th, 0.25 + 0.75 * k)
            lay.alpha_composite(Image.blend(Image.new('RGBA', th.size, (0, 0, 0, 0)), th, al), (x, y))
            d.rectangle((x - 2, y - 2, x + cw + 2, y + 152), outline=(230, 190, 80, int(255 * al * (0.35 + 0.65 * k))), width=3)
            if k > 0:
                im = _png(A('icons', f'{ic}.png'))
                s = 1.6 + 0.2 * math.sin(t * 4 + i)
                im = im.resize((int(64 * s * k + 1), int(64 * s * k + 1)), Image.LANCZOS)
                lay.alpha_composite(im, (x + cw // 2 - im.width // 2, y + 190 - im.height // 2 + 20))
                for ln_i, ln in enumerate(wrap(title, ft, cw)):
                    d.text((x + cw // 2, y + 290 + ln_i * 30), ln, font=ft, fill=(255, 226, 130, int(255 * al * k)), anchor='mm')
                d.text((x + cw // 2, y + 380), item, font=fs, fill=(255, 255, 255, int(255 * al * k)), anchor='mm')
        cv.alpha_composite(lay)
    return f


# =========================================================================== extras de cena
@functools.lru_cache(maxsize=None)
def _key_img():
    """Chave dourada desenhada na hora (a chave de Atlantida nao tem icone no jogo)."""
    im = Image.new('RGBA', (128, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    gold, dark = (255, 214, 90, 255), (120, 78, 10, 255)
    d.ellipse((6, 12, 46, 52), outline=dark, width=10)
    d.ellipse((10, 16, 42, 48), outline=gold, width=5)
    d.rectangle((44, 28, 122, 38), fill=dark)
    d.rectangle((44, 30, 122, 36), fill=gold)
    for x in (92, 108):
        d.rectangle((x, 36, x + 8, 54), fill=dark)
        d.rectangle((x + 1, 36, x + 6, 52), fill=gold)
    return im


def key_actor(keys, scale=1.6, **kw):
    kw.setdefault('shadow', False)
    return Actor(lambda t: _key_img(), keys, scale=scale, nearest=True, **kw)


@functools.lru_cache(maxsize=None)
def _boat(n):
    return _png(A('boats', f'boat_right_{n}.png'))


def boat(keys, scale=5, rot=0.0, **kw):
    kw.setdefault('shadow', False)
    return Actor(lambda t: _boat(1 + int(t * 4) % 3), keys, scale=scale, nearest=True, rot=rot, **kw)


def mix(*fns):
    return list(fns)


# =========================================================================== as cenas
def scene_14():  # mar_ruinas: a civilizacao dos Antigos
    wf = water_fx(14)
    D, L = (0.86, 0.96, 1.0), None
    shots = [
        Shot(0, 12, 'sea_ruins', zoom=(1.0, 1.08), fade=1.2, front=[wf, glow(640, 400, 150, (255, 230, 140), 6.5, 12, 0.5)],
             card=('AS RUÍNAS DOS FRAGMENTOS', 'Mais velhas que Atlântida', 0.8, 5.0), actors=[
                 dogge([(0, -150, G), (4.5, 420, G)]),
                 lia([(0, 900, G)], bob=5),
                 icon('scroll', [(6.5, 640, 400)], 2.6, alpha=[(6.0, 0), (6.8, 1)], bob=7),
             ], lines=[('Dra. Lia', 'Eu jurava que era uma lista de compras dos antigos. Sim, eu tinha certeza.', 5.4, 11.4)]),
        Shot(12, 17, 'sea_warm', 'memory', zoom=(1.0, 1.1), fade=1.0, front=[wf], card=('ANTES DE ATLÂNTIDA', 'Havia os Antigos', 12.4, 16.8), actors=[]),
        Shot(17, 22, 'sea_warm', 'memory', zoom=(1.1, 1.0), focus=(0.2, 0.5), fade=1.0, front=[wf], card=('ELES GRAVARAM NAS PEDRAS', 'tudo o que o mar esconde', 17.4, 21.8), actors=[]),
        Shot(22, 27, 'sea_warm', 'memory', zoom=(1.0, 1.1), focus=(0.8, 0.5), fade=1.0, front=[wf, glow(640, 330, 190, (255, 230, 140), 22, 27, 0.6)],
             card=('E UM AVISO', 'O Leviatã observa quem o enfrenta e aprende', 22.4, 26.8), actors=[icon('scroll', [(22, 640, 520)], 3.2, bob=6)]),
        Shot(27, 38, 'sea_ruins', zoom=(1.08, 1.0), fade=1.2, front=[wf], actors=[
            dogge([(27, 420, G)]), lia([(27, 900, G)], bob=5)],
            lines=[('Dra. Lia', 'Esta tábua fala do Leviatã. Ele observa quem o enfrenta e aprende.', 28.0, 33.0),
                   ('Dogge', 'Então não posso repetir sempre o mesmo golpe especial.', 33.3, 37.4)]),
    ]
    return Scene('14_mar_antigos', 38, shots, music=[('medieval_library.mp3', 0, 8, 0.6, 1.5, 3.0)], amb=[('cave.mp3', 0, 38, 0.25)],
                 sfx=[(0.5, 'dive.mp3', 0.4), (6.5, 'charge.mp3', 0.5), (12.0, 'levelup.mp3', 0.3), (22.0, 'teleport.mp3', 0.4)])


def scene_15():  # mar_naufragio: a historia do Fantasma do Capitao
    wf = water_fx(15)
    wreck = lambda t0: boat([(t0, 1100, 570)], 5, rot=16, tint=(0.35, 0.55, 0.6), alpha=[(t0, 0.9)])
    shots = [
        Shot(0, 14, 'sea_wreck', zoom=(1.0, 1.08), fade=1.2, front=[wf, glow(760, 330, 150, (150, 230, 255), 5.6, 14, 0.45)], card=('O NAUFRÁGIO DO CAPITÃO MEME', 'O casco ainda range no fundo', 0.8, 5.0),
             fx=[Fx.flash(5.2, 0.7, (200, 245, 255), 0.5)], actors=[
                 wreck(0),
                 dogge([(0, -150, G), (4.5, 380, G)]),
                 ghost([(0, 760, G)], alpha=[(0, 0), (5.2, 0), (6.2, 0.7)], bob=9),
             ], lines=[('Capitão Meme (fantasma)', 'Este navio afundou por causa de um meme. Não pergunte qual.', 6.0, 11.0),
                       ('Dogge', 'Achei o seu diário, Capitão.', 11.2, 14.0)]),
        Shot(14, 27, 'stage13_dusk', 'memory', zoom=(1.0, 1.08), fade=1.2, front=[surface_fx(), splash_layer(24.4, 760, 620, 5, 1.0)],
             card=('NÃO CONFIAR NO POLVO', 'o diário do capitão', 14.6, 18.6), actors=[
                 boat([(14, 200, 600), (24, 760, 600), (27, 760, 700)], 6, alpha=[(14, 1), (24.2, 1), (26.5, 0)]),
                 npc('c22', [(14, 200, 470), (24, 760, 470), (25, 760, 760)], 'down', False, 1.0, shadow=False, alpha=[(14, 1), (24.2, 1), (25.8, 0)]),
                 bicho('octo', [(19, 1050, 700), (21.5, 960, 560)], 1.6, alpha=[(19, 0), (21, 1)], bob=6),
             ], lines=[('Capitão Meme', 'Eu escrevi no diário: NÃO CONFIAR NO POLVO.', 19.0, 23.6),
                       ('Capitão Meme', 'Mesmo assim, eu confiei.', 23.8, 26.8)]),
        Shot(27, 38, 'sea_wreck', zoom=(1.08, 1.0), fade=1.4, front=[wf, glow(760, 330, 150, (150, 230, 255), 27, 37, 0.4), sparkle_burst(29.2, 520, 400)], actors=[
            wreck(27),
            dogge([(27, 380, G)]),
            ghost([(27, 760, G)], alpha=[(27, 0.7), (35.5, 0.7), (37.6, 0.12)], bob=9),
            icon('compass', [(28.5, 740, 380), (30, 520, 380)], 2.6, alpha=[(28.4, 0), (29.2, 1)], bob=5),
        ], lines=[('Capitão Meme (fantasma)', 'Meu diário! Fique com a bússola: ela aponta para a água com pressa.', 28.2, 33.6),
                  ('Capitão Meme (fantasma)', 'E dizem que a minha cabine tem uma parede que não é parede...', 33.9, 37.6)]),
    ]
    return Scene('15_mar_fantasma', 38, shots, music=[('spy_glass.mp3', 0, 10, 0.6, 1.5, 3.0)], amb=[('waves.mp3', 14, 27, 0.3), ('cave.mp3', 0, 14, 0.25), ('cave.mp3', 27, 38, 0.25)],
                 sfx=[(0.5, 'dive.mp3', 0.4), (5.3, 'teleport.mp3', 0.4), (24.4, 'water.mp3', 0.7), (29.2, 'levelup.mp3', 0.35)])


def scene_16():  # mar_chave: Atlantida, a cidade submersa
    wf = water_fx(16)
    cid = lambda sh, i, x0, x1, y, t0, t1, d: mer(sh[0], sh[1], [(t0, x0, y), (t1, x1, y)], d, 5, True, bob=3, alpha=[(t0, 0), (t0 + 1.0, 1), (t1 - 1.0, 1), (t1, 0)])
    shots = [
        Shot(0, 15, 'sea_atlantis', zoom=(1.0, 1.08), fade=1.2, front=[wf, glow(560, 380, 90, (255, 220, 100), 6.5, 15, 0.55)], actors=[
            dogge([(0, -150, G), (3.5, 400, G)]),
            mer(*TRITAO, [(0, 880, G)], 'left', 7),
            key_actor([(6.6, 560, 390)], 1.5, alpha=[(6.2, 0), (6.8, 1)], bob=6),
        ], lines=[('Guardião Tritão', 'Halt! Ninguém passa pelo portão interno sem a Chave de Atlântida.', 3.2, 7.8),
                  ('Dogge', 'Esta chave serve?', 8.0, 10.6),
                  ('Guardião Tritão', 'A chave! Eu deveria te parar. Mas estou de plantão desde o ano 300 e a chave é mesmo sua.', 10.8, 14.8)]),
        Shot(15, 38, 'sea_atlantis', zoom=(1.25, 1.0), focus=(0.2, 0.6), fade=1.0, front=[wf],
             fx=[Fx.flash(15.0, 1.0, (255, 240, 190), 0.8), Fx.shake(15.0, 1.2, 8)],
             card=('ATLÂNTIDA', 'A cidade submersa', 15.8, 20.5), actors=[
                 cid(CIDADAOS[0], 0, 1300, -100, 420, 16, 30, 'left'),
                 cid(CIDADAOS[1], 1, -100, 1300, 330, 19, 33, 'right'),
                 cid(CIDADAOS[3], 2, 1300, -100, 480, 24, 38, 'left'),
                 cid(CIDADAOS[4], 3, -100, 1300, 380, 27, 38, 'right'),
                 dogge([(15, 400, G)]),
                 mer(*TRITAO, [(15, 880, G)], 'left', 7),
             ], lines=[('Guardião Tritão', 'Bem-vindo a Atlântida. Dizem que a cidade ainda tem pulso, uma vez por maré.', 21.0, 27.0),
                       ('Dogge', 'E o abismo?', 27.3, 30.0),
                       ('Guardião Tritão', 'Com a chave ele se abre. Fale com a Dra. Lia e com o Sereio Gigachad.', 30.3, 37.0)]),
    ]
    return Scene('16_mar_atlantida', 38, shots, music=[('open_ocean.mp3', 0, 20, 0.6, 1.5, 3.0)], amb=[('cave.mp3', 0, 38, 0.2)],
                 sfx=[(0.5, 'dive.mp3', 0.4), (6.6, 'charge.mp3', 0.5), (15.0, 'levelup.mp3', 0.6), (15.0, 'earth.mp3', 0.5)])


def scene_17():  # mar_marlene: a baleia filosofa
    wf = water_fx(17, rays=0.8)
    whale = lambda keys, **k: bicho('whale', keys, 0.95, flip=True, bob=7, **k)
    shots = [
        Shot(0, 12, 'sea_open', zoom=(1.0, 1.08), fade=1.2, front=[wf, rings(4.0, 12, 960, 400)], card=('DONA MARLENE', 'A baleia filósofa', 0.8, 4.8), actors=[
            dogge([(0, -150, G), (4.0, 300, G)]),
            whale([(0, -500, 480), (6.0, 900, 480)]),
        ], lines=[('Dogge', 'Então era dela o som grave que o Cientista Nemo ouvia?', 6.4, 11.6)]),
        Shot(12, 40, 'sea_open', zoom=(1.0, 1.1), focus=(0.7, 0.6), fade=1.0, front=[wf, rings(12, 33, 960, 400), sparkle_burst(33.0, 560, 400)], actors=[
            dogge([(12, 300, G)]),
            whale([(12, 900, 480)]),
            icon('sparkle', [(33.0, 960, 360), (35.0, 520, 380)], 2.2, alpha=[(32.8, 0), (33.4, 1)], bob=6),
            bicho('angel', [(14, -200, 230), (30, 1500, 200)], 1.8, flip=True),
            bicho('clown', [(20, 1400, 330), (32, -100, 300)], 1.4, flip=False),
        ], card=('A CANÇÃO DA BALEIA', 'Uma nota gravada em cristal', 36.6, 39.6),
            lines=[('Dona Marlene', 'Eu canto uma nota só. Ninguém pergunta de onde ela vem.', 12.8, 18.6),
                   ('Dogge', 'De onde vem?', 18.8, 21.6),
                   ('Dona Marlene', 'Do fundo. Mas a pergunta de verdade é: você já pensou na vida?', 21.8, 28.0),
                   ('Dogge', '...Eu só penso no próximo golpe.', 28.2, 31.6),
                   ('Dona Marlene', 'Já é um começo. Leve a minha canção.', 31.8, 36.2)]),
    ]
    return Scene('17_mar_marlene', 40, shots, music=[('secret_garden.mp3', 0, 5, 0.65, 1.5, 3.0)], amb=[('cave.mp3', 0, 40, 0.2)],
                 sfx=[(0.5, 'dive.mp3', 0.4), (4.0, 'water.mp3', 0.4), (33.0, 'levelup.mp3', 0.4)])


def scene_18():  # mar_mapa: Dr. Nemo e o mapa completo
    wf = water_fx(18)
    shots = [
        Shot(0, 11, 'sea_reef', zoom=(1.0, 1.08), fade=1.2, front=[wf], card=('O CIENTISTA NEMO', 'Catalogando o mar inteiro', 0.8, 4.4), actors=[
            dogge([(0, -150, G), (4.0, 400, G)]),
            nemo([(0, 880, G)], bob=5),
        ], lines=[('Cientista Nemo', 'Catalogo cada recife, naufrágio e caverna. Eu pago em orgulho.', 4.6, 8.4),
                  ('Dogge', 'Visitei os nove locais.', 8.6, 10.8)]),
        Shot(11, 26.5, 'sea_atlantis', 'dark', zoom=(1.0, 1.0), fade=1.0, front=[wf, map_board(11.3, 26.4)], actors=[]),
        Shot(26.5, 38, 'sea_reef', zoom=(1.08, 1.0), fade=1.2, front=[wf], card=('MAPA COMPLETO', 'Os 9 locais de mergulho', 34.0, 37.6), actors=[
            dogge([(26.5, 400, G)]), nemo([(26.5, 880, G)], bob=5)],
            lines=[('Cientista Nemo', 'Todos os locais! Meu mapa está completo. Eu só queria que alguém visse. Obrigado.', 27.4, 33.6)]),
    ]
    return Scene('18_mar_mapa', 38, shots, music=[('open_ocean.mp3', 0, 40, 0.6, 1.5, 3.0)], amb=[('cave.mp3', 0, 38, 0.2)],
                 sfx=[(0.5, 'dive.mp3', 0.4)] + [(12.3 + i * 1.3 + 0.0, 'ui_confirm.mp3', 0.35) for i in range(9)] + [(26.6, 'levelup.mp3', 0.4)])


def scene_19():  # mar_sea_beast: consequencias da queda do Leviata
    wf = water_fx(19, rays=0.8)
    cre = lambda kind, y, t0, t1, flip, sc, **k: bicho(kind, [(t0, -250 if not flip else 1500, y), (t1, 1500 if not flip else -250, y)], sc, flip=flip, bob=8, **k)
    shots = [
        Shot(0, 10, 'stage13_night', 'dark', zoom=(1.0, 1.1), fade=1.2, front=[surface_fx(), splash_layer(1.6, 1040, 560, 5, 1.0), splash_layer(5.6, 960, 590, 5, 1.0)],
             fx=[Fx.flash(0.4, 0.5, (255, 255, 255), 0.6), Fx.shake(1.6, 0.6, 10), Fx.tint(0, 10, (10, 20, 50, 70), 0.5, 2.0)],
             card=('O LEVIATÃ AFUNDA NO ABISMO', 'O Predador do Abismo foi derrotado', 5.0, 9.4), actors=[
                 fig('dogge', [(0, 380, G)], 'idle', s=1.6, bob=3),
                 fig('sea_beast', [(0, 900, 560), (5.0, 900, 560), (9.5, 900, 800)], [(0, 'hurt'), (1.6, 'ko')], s=2.0, flip=True, alpha=[(0, 1), (6, 1), (9.5, 0)], shadow=False),
             ]),
        Shot(10, 18, 'stage13_dusk', zoom=(1.0, 1.08), fade=2.5, front=[surface_fx()], card=('O MAR ACALMA', 'A tempestade passou', 10.8, 16.8), actors=[
            fig('dogge', [(10, 380, G)], 'idle', s=1.6, bob=3)]),
        Shot(18, 25, 'sea_open', zoom=(1.0, 1.06), fade=1.4, front=[wf], card=('AS CRIATURAS VOLTAM', 'Cardumes, tartarugas e águas-vivas', 18.6, 22.8), actors=[
            dogge([(18, 640, G)]),
            cre('angel', 230, 18, 27, True, 1.8),
            cre('turtle', 420, 18.5, 30, False, 1.0),
            cre('angel', 330, 19, 28, False, 1.6, tint=(1.0, 0.9, 0.7)),
            cre('clown', 470, 20, 29, True, 1.5),
            bicho('jelly', [(18, 160, 330), (25, 200, 190)], 2.0, bob=10),
            bicho('jelly_pink', [(18, 1120, 400), (25, 1080, 260)], 2.2, bob=10),
        ]),
        Shot(25, 40, 'sea_atlantis', zoom=(1.0, 1.1), focus=(0.7, 0.5), fade=1.2, front=[wf, glow(900, 400, 220, (170, 220, 255), 25.4, 29, 0.7)],
             fx=[Fx.flash(25.6, 1.0, (200, 235, 255), 0.7), Fx.shake(25.6, 0.8, 7)],
             card=('REI POSEIDON LIBERADO', 'Novo lutador no Elenco', 36.6, 39.6), actors=[
                 dogge([(25, 380, G)]),
                 fig('poseidon', [(25, 900, G)], [(25, 'ko'), (25.6, 'charge'), (27.5, 'idle')], s=1.4, flip=True, shadow=False, alpha=[(25, 0), (26.0, 1)], bob=5),
             ], lines=[('Rei Poseidon', 'O Leviatã mantinha estas águas reféns. Você nos libertou, Dogge.', 26.8, 31.8),
                       ('Rei Poseidon', 'Quando quiser, lutarei ao seu lado.', 32.0, 36.2)]),
    ]
    return Scene('19_mar_leviata', 40, shots, music=[('goblin_king.mp3', 0, 30, 0.6, 1.0, 1.5), ('open_ocean.mp3', 9.5, 0, 0.65, 3.0, 3.0)],
                 amb=[('waves.mp3', 0, 18, 0.3), ('cave.mp3', 18, 40, 0.2)],
                 sfx=[(0.4, 'thunder.mp3', 0.7), (1.6, 'hit_heavy.mp3', 0.9), (5.6, 'water.mp3', 0.8), (18.0, 'dive.mp3', 0.5), (25.6, 'charge.mp3', 0.6), (26.0, 'levelup.mp3', 0.5)])


def scene_20():  # sec_mar_tudo: encerramento das missoes secretas
    wf = water_fx(20)
    shots = [
        Shot(0, 8, 'sea_atlantis', zoom=(1.0, 1.08), fade=1.2, front=[wf], card=('QUATRO ESCONDERIJOS', 'Cabine, Ruínas, Atlântida e Abismo', 0.8, 4.6), actors=[
            dogge([(0, -150, G), (4.0, 400, G)]),
            nemo([(0, 880, G)], bob=5),
        ], lines=[('Dogge', 'Nemo, eu achei todos os esconderijos do mar.', 4.8, 7.8)]),
        Shot(8, 29, 'sea_abyss', zoom=(1.0, 1.0), fade=1.0, front=[wf, secrets_board(8.2, 28.8)], actors=[]),
        Shot(29, 40, 'sea_atlantis', zoom=(1.08, 1.0), fade=1.4, front=[wf], card=('QUEM SABE TUDO DO MAR', 'O mar sussurra para você', 36.4, 39.6), actors=[
            dogge([(29, 400, G)]), nemo([(29, 880, G)], bob=5)],
            lines=[('Cientista Nemo', 'Quatro?! Eu catalogo o mar há anos e nunca achei um. Você é o verdadeiro explorador.', 29.6, 36.0)]),
    ]
    return Scene('20_mar_segredos', 40, shots, music=[('ice_cavern.mp3', 0, 10, 0.6, 1.5, 3.0)], amb=[('cave.mp3', 0, 40, 0.25)],
                 sfx=[(0.5, 'dive.mp3', 0.4)] + [(9.0 + i * 3.2, 'levelup.mp3', 0.4) for i in range(4)] + [(36.4, 'charge.mp3', 0.3)])


def scene_21():  # fecha o arco: sea_beast + mapa + marlene
    wf = water_fx(21, rays=0.7)
    shots = [
        Shot(0, 12, 'stage13_dusk', zoom=(1.0, 1.08), fade=1.4, front=[surface_fx(), splash_layer(5.0, 930, 470, 3, 1.0)], card=('O MAR EM PAZ', 'O fim do arco submarino', 0.8, 4.6), actors=[
            bicho('whale', [(0, 930, 470)], 0.45, flip=True, bob=4, alpha=[(0, 1)]),
            fig('dogge', [(0, -200, 520), (5.0, 470, 520)], 'idle', s=1.1, shadow=False, bob=3),
            boat([(0, -200, 590), (5.0, 470, 590)], 6, bob=3),
        ], lines=[('Dogge', 'O Leviatã caiu, o mapa está completo e a Dona Marlene canta de novo.', 5.4, 11.4)]),
        Shot(12, 38, 'sea_warm', zoom=(1.0, 1.06), fade=1.6, front=[wf], card=('FIM DO ARCO SUBMARINO', 'O mar está em paz', 34.0, 37.6), actors=[
            bicho('whale', [(12, 1450, 220), (38, -300, 200)], 0.6, flip=True, bob=5, alpha=[(12, 0.8)]),
            mer(*TRITAO, [(12, 140, G)], 'right', 6),
            lia([(12, 330, G)], bob=5),
            dogge([(12, 570, G)]),
            nemo([(12, 790, G)], bob=5),
            mer(*GIGACHAD, [(12, 990, G)], 'left', 6),
            fig('poseidon', [(12, 1140, G - 30)], 'idle', s=1.25, flip=True, shadow=False, bob=5),
        ], lines=[('Sereio Gigachad', 'Você derrotou o Leviatã. Eu só estava aqui flexionando. Respeito.', 13.0, 18.6),
                  ('Cientista Nemo', 'Meu mapa está completo. Eu só queria que alguém visse.', 18.8, 24.0),
                  ('Rei Poseidon', 'O mar nunca esteve tão calmo. Ele também é seu, Dogge.', 24.2, 29.6),
                  ('Dogge', 'O mar é de todos. Vamos cuidar dele.', 29.8, 33.6)]),
    ]
    return Scene('21_mar_paz', 38, shots, music=[('open_ocean.mp3', 0, 0, 0.65, 1.5, 3.0)], amb=[('waves.mp3', 0, 12, 0.35), ('cave.mp3', 12, 38, 0.2)],
                 sfx=[(5.0, 'water.mp3', 0.5), (12.0, 'dive.mp3', 0.5), (34.0, 'levelup.mp3', 0.4)])
