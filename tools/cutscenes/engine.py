#!/usr/bin/env python3
"""Motor offline das cutscenes em VIDEO (PIL + ffmpeg). Nada disto roda no celular: o jogo so abre o .mp4.

Usa SO arte/sons que ja existem no projeto (cenarios, sprites-v2, NPCs, efeitos, musicas, sfx).
Uma cena = Scene(...) com shots (cenario + atores + falas + efeitos) e trilha. Ver scenes.py.
"""
import functools, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W, H, FPS = 1280, 720, 30
A = lambda *p: os.path.join(ROOT, 'assets', *p)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
F_TXT, F_NAME, F_TAG = (ImageFont.truetype(FONT, s) for s in (34, 26, 22))
F_BIG, F_MID = ImageFont.truetype(FONT, 70), ImageFont.truetype(FONT, 38)


def smooth(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def ramp(t, a, b):
    return smooth((t - a) / max(b - a, 1e-6))


# --------------------------------------------------------------------------- cenarios
CUSTOM_BG = {}  # nome -> funcao() que devolve uma imagem RGB 1280x720 (fundos gerados, ex.: submarinos em scenes_mar.py)


@functools.lru_cache(maxsize=None)
def stage_raw(name):
    if name in CUSTOM_BG:
        return CUSTOM_BG[name]().convert('RGB')
    return Image.open(A('legacy-art', 'stages', f'{name}.webp')).convert('RGB')


@functools.lru_cache(maxsize=None)
def bg(name, grade='none'):
    """grade: none | memory (sepia) | dark | cold | warm | gold | shadow"""
    im = stage_raw(name)
    if grade == 'none':
        return im
    a = np.asarray(im, dtype=np.float32) / 255
    g = a.mean(axis=2, keepdims=True)
    if grade == 'memory':
        a = (a * 0.45 + g * 0.55) * np.array([1.06, 0.97, 0.80], dtype=np.float32)
    elif grade == 'dark':
        a = a * 0.42
    elif grade == 'cold':
        a = (a * 0.7 + g * 0.3) * np.array([0.85, 0.95, 1.12], dtype=np.float32)
    elif grade == 'warm':
        a = a * np.array([1.10, 0.95, 0.80], dtype=np.float32)
    elif grade == 'gold':
        a = (a * 0.5 + g * 0.5) * np.array([1.18, 1.0, 0.65], dtype=np.float32)
    elif grade == 'shadow':
        a = (a * 0.5 + g * 0.2) * np.array([0.85, 0.55, 0.85], dtype=np.float32)
    if grade in ('memory', 'gold'):
        yy, xx = np.mgrid[0:im.height, 0:im.width]
        d = np.sqrt(((xx - im.width / 2) / (im.width / 2)) ** 2 + ((yy - im.height / 2) / (im.height / 2)) ** 2)
        a = a * np.clip(1.15 - 0.45 * d ** 1.6, 0.35, 1)[..., None]
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


# --------------------------------------------------------------------------- sprites
@functools.lru_cache(maxsize=None)
def _png(path):
    return Image.open(path).convert('RGBA')


@functools.lru_cache(maxsize=None)
def pose_img(char, pose):
    return _png(A('sprites-v2', char, f'{pose}.png'))


def walk_poses(char):
    n = 0
    while os.path.exists(A('sprites-v2', char, f'walk{n + 1}.png')):
        n += 1
    return [f'walk{i + 1}' for i in range(min(n, 5))] or ['idle']


def F(char, timeline='idle', fps=8):
    """Lutador. timeline: 'idle' | 'walk' | [(t, 'pose'), ...] (pose 'walk' = ciclo de passos)."""
    tl = [(0, timeline)] if isinstance(timeline, str) else timeline

    def f(t):
        pose = tl[0][1]
        for tt, p in tl:
            if t >= tt:
                pose = p
        if pose == 'walk':
            ws = walk_poses(char)
            pose = ws[int(t * fps) % len(ws)]
        elif pose == 'bob':
            pose = 'idle'
        return pose_img(char, pose)
    return f


@functools.lru_cache(maxsize=None)
def _walk_sheet(w):
    return _png(A('npc-walk', f'{w}.png'))


def NPC(char, direction='down', walking=False, fps=7):
    """NPC do mundo. char = c08..c22. Os com folha de passos (c08-c15) andam; os outros sao quadro unico."""
    import json
    mp = json.load(open(A('npc-walk', 'MAP.json')))
    row = {'down': 0, 'left': 1, 'right': 2, 'up': 3}[direction]
    if char in mp:
        sh = _walk_sheet(mp[char])

        def f(t):
            col = [0, 1, 2, 1][int(t * fps) % 4] if walking else 1
            return sh.crop((col * 128, row * 192, col * 128 + 128, row * 192 + 192))
        return f
    img = _png(A('npcs', f'{char}.png'))
    return lambda t: img


def IMG(path_parts):
    img = _png(A(*path_parts))
    return lambda t: img


@functools.lru_cache(maxsize=4096)
def _scaled(img_id, scale, flip, alpha_q, tint, nearest=False):
    img = _IMGS[img_id]
    w, h = max(1, int(img.width * scale)), max(1, int(img.height * scale))
    r = img.resize((w, h), Image.NEAREST if nearest else (Image.LANCZOS if scale < 1 else Image.BICUBIC))
    if flip:
        r = r.transpose(Image.FLIP_LEFT_RIGHT)
    if tint:
        a = np.asarray(r, dtype=np.float32)
        a[..., :3] = a[..., :3] * np.array(tint[:3], dtype=np.float32)
        r = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    if alpha_q < 100:
        r = r.copy()
        r.putalpha(r.getchannel('A').point(lambda v: v * alpha_q // 100))
    return r

_IMGS = {}
def scaled(img, scale, flip=False, alpha=1.0, tint=None, nearest=False):
    k = id(img)
    _IMGS[k] = img
    return _scaled(k, round(scale, 3), flip, int(round(alpha * 100)), tint, nearest)


class Actor:
    """Ator: sprite(t_local)->RGBA; keys [(t,x,y),...] (y = pe do personagem); alpha [(t,a),...]; flip espelha."""
    def __init__(self, sprite, keys, scale=1.0, flip=False, shadow=True, alpha=None, bob=0.0, tint=None, jitter=0.0, nearest=False, rot=0.0):
        self.sprite, self.keys, self.scale, self.flip = sprite, keys, scale, flip
        self.shadow, self.alpha, self.bob, self.tint, self.jitter, self.nearest, self.rot = shadow, alpha, bob, tint, jitter, nearest, rot

    def pos(self, t):
        k = self.keys
        if t <= k[0][0]:
            return k[0][1], k[0][2]
        for (t0, x0, y0), (t1, x1, y1) in zip(k, k[1:]):
            if t0 <= t < t1:
                p = smooth((t - t0) / (t1 - t0))
                return x0 + (x1 - x0) * p, y0 + (y1 - y0) * p
        return k[-1][1], k[-1][2]

    def alpha_at(self, t):
        if not self.alpha:
            return 1.0
        a = self.alpha
        if t <= a[0][0]:
            return a[0][1]
        for (t0, v0), (t1, v1) in zip(a, a[1:]):
            if t0 <= t < t1:
                return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0))
        return a[-1][1]

    def draw(self, cv, t):
        al = self.alpha_at(t)
        if al <= 0.01:
            return
        x, y = self.pos(t)
        y += math.sin(t * 3.0) * self.bob
        if self.jitter:
            x += math.sin(t * 90) * self.jitter
        s = scaled(self.sprite(t), self.scale, self.flip, al, self.tint, self.nearest)
        if self.rot:
            s = s.rotate(self.rot, expand=True, resample=Image.BICUBIC)
        if self.shadow:
            sh = Image.new('RGBA', cv.size, (0, 0, 0, 0))
            w = s.width * 0.5
            ImageDraw.Draw(sh).ellipse((x - w / 2, y - 12, x + w / 2, y + 12), fill=(0, 0, 0, int(80 * al)))
            cv.alpha_composite(sh)
        cv.alpha_composite(s, (int(x - s.width / 2), int(y - s.height)))


# --------------------------------------------------------------------------- efeitos (tiras existentes de assets/effects)
EFFECT = {'hit_flash': (96, 7), 'hit_strong': (96, 7), 'hit_ult': (128, 13), 'charge_up': (96, 12), 'hit_block': (96, 10)}

@functools.lru_cache(maxsize=None)
def effect_frame(name, i):
    sz, n = EFFECT[name]
    sheet = _png(A('effects', f'{name}.png'))
    i = min(max(i, 0), n - 1)
    return sheet.crop((i * sz, 0, i * sz + sz, sheet.height))


class Fx:
    """Efeitos pontuais: ('flash', t, dur, (r,g,b)) ('shake', t, dur, amp) ('hit', t, x, y, nome, escala) ('tint', t0, t1, (r,g,b,a))"""
    @staticmethod
    def flash(t, dur=0.6, color=(255, 255, 255), power=0.9): return ('flash', t, dur, color, power)
    @staticmethod
    def shake(t, dur=0.5, amp=10): return ('shake', t, dur, amp)
    @staticmethod
    def hit(t, x, y, name='hit_strong', scale=3.0, dur=0.33): return ('hit', t, x, y, name, scale, dur)
    @staticmethod
    def tint(t0, t1, rgba, fin=0.5, fout=0.5): return ('tint', t0, t1, rgba, fin, fout)


# --------------------------------------------------------------------------- texto
def wrap(txt, font, maxw):
    probe = ImageDraw.Draw(Image.new('RGB', (4, 4)))
    lines, cur = [], ''
    for w in txt.split():
        t = (cur + ' ' + w).strip()
        if probe.textlength(t, font=font) <= maxw:
            cur = t
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    return lines


def dialog(cv, name, txt, t_in, t, alpha=1.0, cps=26):
    lines = wrap(txt, F_TXT, W - 2 * 90 - 60)
    shown = int(max(0, t - t_in) * cps)
    box_h = 38 + max(2, len(lines)) * 44 + 14
    x0, y0, x1, y1 = 60, H - 40 - box_h, W - 60, H - 40
    lay = Image.new('RGBA', cv.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    a = int(255 * alpha)
    d.rounded_rectangle((x0, y0, x1, y1), 18, fill=(18, 14, 30, int(215 * alpha)), outline=(230, 190, 80, a), width=4)
    if name:
        d.rounded_rectangle((x0 + 24, y0 - 20, x0 + 24 + int(d.textlength(name, font=F_NAME)) + 36, y0 + 20), 10, fill=(230, 190, 80, a))
        d.text((x0 + 42, y0 - 14), name, font=F_NAME, fill=(40, 24, 8, a))
    n, y = shown, y0 + 28
    for ln in lines:
        d.text((x0 + 40, y), ln[:max(n, 0)], font=F_TXT, fill=(255, 255, 255, a))
        n -= len(ln) + 1
        y += 44
    cv.alpha_composite(lay)


def outline(d, xy, txt, font, fill, edge=(20, 14, 6, 255), w=3, anchor='mm'):
    x, y = xy
    for dx in range(-w, w + 1):
        for dy in range(-w, w + 1):
            if dx or dy:
                d.text((x + dx, y + dy), txt, font=font, fill=edge, anchor=anchor)
    d.text(xy, txt, font=font, fill=fill, anchor=anchor)


def _fit(txt, size, maxw=W - 140):
    probe = ImageDraw.Draw(Image.new('RGB', (4, 4)))
    while size > 26:
        f = ImageFont.truetype(FONT, size)
        if probe.textlength(txt, font=f) <= maxw:
            return f
        size -= 4
    return ImageFont.truetype(FONT, 26)


def card(cv, title, sub, alpha, dim=0.55):
    lay = Image.new('RGBA', cv.size, (0, 0, 0, int(255 * dim * alpha)))
    d = ImageDraw.Draw(lay)
    a = int(255 * alpha)
    outline(d, (W // 2, H // 2 - 30), title, _fit(title, 70), (255, 226, 130, a), (30, 18, 4, a), 4)
    if sub:
        outline(d, (W // 2, H // 2 + 50), sub, _fit(sub, 38), (255, 255, 255, a), (30, 18, 4, a), 3)
    cv.alpha_composite(lay)


def tag(cv, txt, alpha):
    lay = Image.new('RGBA', cv.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle((40, 36, 40 + int(d.textlength(txt, font=F_TAG)) + 36, 82), 8, fill=(0, 0, 0, int(150 * alpha)))
    d.text((58, 44), txt, font=F_TAG, fill=(240, 220, 160, int(255 * alpha)))
    cv.alpha_composite(lay)


# --------------------------------------------------------------------------- shots / cena
class Shot:
    def __init__(self, t0, t1, bg_name='stage1', grade='none', zoom=(1.0, 1.06), focus=(0.5, 0.5), actors=(), lines=(), fx=(),
                 fade=0.6, card=None, black=False, tag=None, pan=0, back=(), front=()):
        self.t0, self.t1, self.bg_name, self.grade, self.zoom, self.focus = t0, t1, bg_name, grade, zoom, focus
        self.actors, self.lines, self.fx, self.fade, self.card, self.black, self.tag, self.pan = list(actors), list(lines), list(fx), fade, card, black, tag, pan
        self.back, self.front = list(back), list(front)  # camadas f(cv, t, tl): 'back' entre cenario e atores, 'front' entre atores e efeitos/falas

    def render(self, t):
        tl = t - self.t0
        z0, z1 = self.zoom
        z = z0 + (z1 - z0) * min(max(tl / max(self.t1 - self.t0, 1e-6), 0), 1)
        sx = sy = 0.0
        for f in self.fx:
            if f[0] == 'shake' and f[1] <= t < f[1] + f[2]:
                k = 1 - (t - f[1]) / f[2]
                sx += math.sin(t * 61) * f[3] * k
                sy += math.cos(t * 53) * f[3] * k
        if self.black:
            cv = Image.new('RGBA', (W, H), (0, 0, 0, 255))
        else:
            base = bg(self.bg_name, self.grade)
            cw, ch = W / z, H / z
            ox = (W - cw) * self.focus[0] + self.pan * (tl / max(self.t1 - self.t0, 1e-6)) + sx
            oy = (H - ch) * self.focus[1] + sy
            ox = min(max(ox, 0), W - cw)
            oy = min(max(oy, 0), H - ch)
            cv = base.crop((int(ox), int(oy), int(ox + cw), int(oy + ch))).resize((W, H), Image.BILINEAR).convert('RGBA')
        for L in self.back:
            L(cv, t, tl)
        for a in sorted(self.actors, key=lambda a: a.pos(t)[1]):
            a.draw(cv, t)
        for L in self.front:
            L(cv, t, tl)
        for f in self.fx:
            if f[0] == 'hit' and f[1] <= t < f[1] + f[6]:
                p = (t - f[1]) / f[6]
                fr = effect_frame(f[4], int(p * EFFECT[f[4]][1]))
                s = fr.resize((int(fr.width * f[5]), int(fr.height * f[5])), Image.NEAREST)
                cv.alpha_composite(s, (int(f[2] - s.width / 2), int(f[3] - s.height / 2)))
            elif f[0] == 'tint':
                k = ramp(t, f[1], f[1] + f[4]) * (1 - ramp(t, f[2] - f[5], f[2]))
                if k > 0:
                    r, g, b, a = f[3]
                    cv.alpha_composite(Image.new('RGBA', cv.size, (r, g, b, int(a * k))))
        for (name, text, a, b) in self.lines:
            if a <= t < b:
                al = min(ramp(t, a, a + 0.3), 1 - ramp(t, b - 0.3, b))
                dialog(cv, name, text, a + 0.2, t, al)
        if self.card and self.card[2] <= t < self.card[3]:
            al = min(ramp(t, self.card[2], self.card[2] + 0.7), 1 - ramp(t, self.card[3] - 0.7, self.card[3]))
            card(cv, self.card[0], self.card[1], al)
        for f in self.fx:
            if f[0] == 'flash' and f[1] <= t < f[1] + f[2]:
                k = 1 - ramp(t, f[1] + 0.04, f[1] + f[2]) if t > f[1] + 0.04 else (t - f[1]) / 0.04
                cv = Image.blend(cv, Image.new('RGBA', cv.size, f[3] + (255,)), max(0, min(1, k)) * f[4])
        return cv


class Scene:
    def __init__(self, name, dur, shots, music=(), sfx=(), amb=(), tag=None, end_fade=1.4, lufs=-18):
        self.name, self.dur, self.shots, self.music, self.sfx, self.amb, self.tag, self.end_fade, self.lufs = name, dur, shots, music, sfx, amb, tag, end_fade, lufs

    def frame(self, t):
        sh = [s for s in self.shots if s.t0 <= t < s.t1] or [self.shots[-1]]
        cur = sh[-1]
        cv = cur.render(t)
        # crossfade a partir do shot anterior
        i = self.shots.index(cur)
        if i > 0 and t < cur.t0 + cur.fade:
            prev = self.shots[i - 1]
            pv = prev.render(min(t, prev.t1 - 1e-3))
            cv = Image.blend(pv, cv, ramp(t, cur.t0, cur.t0 + cur.fade))
        elif i == 0 and t < cur.t0 + cur.fade:
            cv = Image.blend(Image.new('RGBA', cv.size, (0, 0, 0, 255)), cv, ramp(t, cur.t0, cur.t0 + cur.fade))
        if self.tag:
            tag(cv, self.tag, min(1, ramp(t, 1.0, 2.0)) * (1 - ramp(t, self.dur - 2.0, self.dur - 1.0)))
        k = ramp(t, self.dur - self.end_fade, self.dur)
        if k > 0:
            cv = Image.blend(cv, Image.new('RGBA', cv.size, (0, 0, 0, 255)), k)
        return cv.convert('RGB')

    # ---- audio
    def audio_cmd(self, out):
        ins, fl, labels = [], [], []
        n = 0
        for (path, start, ss, vol, fin, fout) in self.music:
            ins += ['-ss', str(ss), '-t', str(self.dur - start), '-i', A('audio', 'music', path)]
            fl.append(f"[{n}:a]volume={vol},afade=t=in:d={fin},afade=t=out:st={max(0, self.dur - start - fout)}:d={fout},adelay={int(start*1000)}|{int(start*1000)}[a{n}]")
            labels.append(f'[a{n}]'); n += 1
        for (t, path, vol) in self.sfx:
            ins += ['-i', A('audio', 'sfx', path)]
            fl.append(f"[{n}:a]volume={vol},adelay={int(t*1000)}|{int(t*1000)}[a{n}]")
            labels.append(f'[a{n}]'); n += 1
        for (path, t0, t1, vol) in self.amb:
            ins += ['-stream_loop', '-1', '-t', str(t1 - t0), '-i', A('audio', 'ambient', path)]
            fl.append(f"[{n}:a]volume={vol},afade=t=in:d=1.2,afade=t=out:st={max(0, t1 - t0 - 1.2)}:d=1.2,adelay={int(t0*1000)}|{int(t0*1000)}[a{n}]")
            labels.append(f'[a{n}]'); n += 1
        fl.append(''.join(labels) + f"amix=inputs={n}:normalize=0:duration=longest,atrim=0:{self.dur},loudnorm=I={self.lufs}:TP=-3:LRA=11,alimiter=limit=0.85:level=0[a]")
        return ['ffmpeg', '-y', '-v', 'error'] + ins + ['-filter_complex', ';'.join(fl), '-map', '[a]', '-ar', '44100', '-ac', '2', out]


_SCENE = None
def _work(i):
    return _SCENE.frame(i / FPS).tobytes()


def render(scene, out_path, preview=None):
    global _SCENE
    _SCENE = scene
    if preview:
        os.makedirs(preview[1], exist_ok=True)
        for t in preview[0]:
            scene.frame(t).save(os.path.join(preview[1], f'{scene.name}_{t:05.1f}.png'))
        return
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    tmp, wav = out_path + '.tmp.mp4', out_path + '.tmp.wav'
    subprocess.run(scene.audio_cmd(wav), check=True)
    cmd = ['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', wav,
           '-c:v', 'libx264', '-profile:v', 'main', '-level', '3.1', '-crf', '26', '-preset', 'medium', '-pix_fmt', 'yuv420p',
           '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', '-f', 'mp4', tmp]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    import multiprocessing as mp
    n = int(scene.dur * FPS)
    with mp.get_context('fork').Pool(2) as pool:
        for b in pool.imap(_work, range(n), chunksize=6):
            p.stdin.write(b)
    p.stdin.close()
    if p.wait() != 0:
        raise SystemExit('ffmpeg falhou')
    os.replace(tmp, out_path)
    os.remove(wav)
    print('ok', os.path.basename(out_path), os.path.getsize(out_path) // 1024, 'KB', flush=True)
