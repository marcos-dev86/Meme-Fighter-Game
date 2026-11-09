#!/usr/bin/env python3
"""Cutscene 01 - Flashback do Vovo Bento. Renderiza um MP4 (offline) com PIL + ffmpeg.
Usa SO arte/sons que ja existem no projeto (cenarios, sprite do Vovo, dragoes novos, musica e sfx).
Uso:  python3 tools/cutscenes/render_01.py            -> assets/cutscenes/01_flashback_vovo.mp4
      python3 tools/cutscenes/render_01.py --preview 3,9,13,18,26,32 DIR   -> so PNGs de teste
"""
import math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W, H, FPS = 1280, 720, 30
DUR = 39.0
A = lambda *p: os.path.join(ROOT, 'assets', *p)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
F_TXT, F_NAME, F_TAG = (ImageFont.truetype(FONT, s) for s in (34, 26, 22))


def stage(n):
    return Image.open(A('legacy-art', 'stages', f'stage{n}.webp')).convert('RGB')


def grade(im, amt=0.55):
    """Cara de lembranca: dessatura, esquenta e escurece as bordas."""
    a = np.asarray(im, dtype=np.float32) / 255
    g = a.mean(axis=2, keepdims=True)
    a = a * (1 - amt) + g * amt
    a = a * np.array([1.06, 0.97, 0.80], dtype=np.float32)
    yy, xx = np.mgrid[0:im.height, 0:im.width]
    d = np.sqrt(((xx - im.width / 2) / (im.width / 2)) ** 2 + ((yy - im.height / 2) / (im.height / 2)) ** 2)
    a = a * np.clip(1.15 - 0.45 * d ** 1.6, 0.35, 1)[..., None]
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


BG = {k: grade(stage(n)) for k, n in {'vila': 2, 'floresta': 1, 'gelo': 5, 'trevas': 6}.items()}
BG_DARK = Image.fromarray((np.asarray(BG['vila'], dtype=np.float32) * 0.45).astype(np.uint8))

# Vovo Bento: folha 3 colunas x 4 linhas de 128x192 (baixo, esquerda, direita, cima)
_sheet = Image.open(A('npc-walk', 'w4_0.png')).convert('RGBA')
def bento(row, col, scale=1.9):
    c = _sheet.crop((col * 128, row * 192, col * 128 + 128, row * 192 + 192))
    return c.resize((int(128 * scale), int(192 * scale)), Image.NEAREST)

def fighter(name, pose='idle', scale=1.6):
    im = Image.open(A('sprites-v2', name, f'{pose}.png')).convert('RGBA')
    return im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)

DRAGONS = {k: fighter(k, scale=s) for k, s in (('green_dragon', 1.5), ('ice_dragon', 1.7), ('shadow_dragon', 1.9))}

def kb(im, t, t0, t1, z0=1.0, z1=1.07, shake=0.0):
    """Zoom lento (camera) + tremor opcional; devolve 1280x720."""
    p = min(max((t - t0) / max(t1 - t0, 1e-6), 0), 1)
    z = z0 + (z1 - z0) * p
    cw, ch = W / z, H / z
    ox = (W - cw) / 2 + (math.sin(t * 61) * shake)
    oy = (H - ch) / 2 + (math.cos(t * 53) * shake)
    return im.crop((int(ox), int(oy), int(ox + cw), int(oy + ch))).resize((W, H), Image.BILINEAR)

def paste_center_bottom(canvas, spr, cx, by, shadow=True):
    if shadow:
        sh = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(sh)
        w = spr.width * 0.55
        d.ellipse((cx - w / 2, by - 14, cx + w / 2, by + 14), fill=(0, 0, 0, 90))
        canvas.alpha_composite(sh)
    canvas.alpha_composite(spr, (int(cx - spr.width / 2), int(by - spr.height)))

def outline_text(d, xy, txt, font, fill=(255, 255, 255), edge=(20, 14, 6)):
    x, y = xy
    for dx in (-2, -1, 0, 1, 2):
        for dy in (-2, -1, 0, 1, 2):
            if dx or dy:
                d.text((x + dx, y + dy), txt, font=font, fill=edge)
    d.text(xy, txt, font=font, fill=fill)

def wrap(txt, font, maxw):
    words, lines, cur = txt.split(), [], ''
    probe = ImageDraw.Draw(Image.new('RGB', (4, 4)))
    for w in words:
        t = (cur + ' ' + w).strip()
        if probe.textlength(t, font=font) <= maxw:
            cur = t
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    return lines

def dialog(canvas, name, txt, t_in, t, alpha=1.0, cps=26):
    """Caixa de fala no estilo do jogo (fundo escuro, borda dourada) com texto digitando."""
    lines = wrap(txt, F_TXT, W - 2 * 90 - 60)
    shown = int(max(0, t - t_in) * cps)
    box_h = 56 + 2 * 46 + 24
    x0, y0, x1, y1 = 60, H - 40 - box_h, W - 60, H - 40
    lay = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    a = int(255 * alpha)
    d.rounded_rectangle((x0, y0, x1, y1), 18, fill=(18, 14, 30, int(215 * alpha)), outline=(230, 190, 80, a), width=4)
    d.rounded_rectangle((x0 + 24, y0 - 20, x0 + 24 + int(d.textlength(name, font=F_NAME)) + 36, y0 + 20), 10, fill=(230, 190, 80, a))
    d.text((x0 + 42, y0 - 14), name, font=F_NAME, fill=(40, 24, 8, a))
    n = shown
    y = y0 + 38
    for ln in lines:
        part = ln[:max(n, 0)]
        n -= len(ln) + 1
        d.text((x0 + 40, y), part, font=F_TXT, fill=(255, 255, 255, a))
        y += 46
    canvas.alpha_composite(lay)

def tag(canvas, txt, alpha):
    lay = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle((40, 36, 40 + int(d.textlength(txt, font=F_TAG)) + 36, 82), 8, fill=(0, 0, 0, int(150 * alpha)))
    d.text((58, 44), txt, font=F_TAG, fill=(240, 220, 160, int(255 * alpha)))
    canvas.alpha_composite(lay)

def smooth(x):
    x = min(max(x, 0), 1)
    return x * x * (3 - 2 * x)

def fade(t, a, b):  # 0 -> 1 entre a e b
    return smooth((t - a) / (b - a))

# ----- linha do tempo (segundos) -----
T_WALK0, T_WALK1 = 1.2, 5.6
T_L1, T_L2 = 5.8, 11.0
T_SPLIT = 14.2
T_G1, T_G2, T_G3 = 16.0, 21.0, 26.0
T_BACK = 31.0
T_L5 = 31.8
T_END = 36.4
L1 = 'Há muito tempo, esta ilha era inteira, e os memes viviam em paz.'
L2 = 'Até o dia em que o poder que a mantinha unida se partiu.'
L3 = 'Um guardião ficou com cada pedaço. Na floresta, o Dragão da Floresta...'
L4 = '...no gelo, o Dragão do Gelo...'
L5 = '...e nas trevas, o Dragão Sombrio.'
L6 = 'Só quem reunir as três partes vai entender o que realmente foi perdido.'
SPLIT_FLASH = (T_SPLIT, T_SPLIT + 0.9)

def frame(t):
    # 1) fundo
    if t < T_SPLIT - 0.0:
        bg = kb(BG['vila'], t, 0, T_SPLIT, 1.0, 1.10)
    elif t < T_G1 - 1.0:
        bg = kb(BG_DARK, t, T_SPLIT, T_G1, 1.10, 1.14, shake=max(0, 6 * (1 - (t - T_SPLIT) / 1.6)))
    elif t < T_BACK:
        seg = [(T_G1, T_G2, 'floresta'), (T_G2, T_G3, 'gelo'), (T_G3, T_BACK, 'trevas')]
        bg = None
        for a, b, k in seg:
            if a - 1.0 <= t < b + 0.0:
                cur = kb(BG[k], t, a, b, 1.0, 1.06)
                if t < a:
                    prev = BG_DARK if k == 'floresta' else kb(BG[seg[[s[2] for s in seg].index(k) - 1][2]], t, 0, 1, 1.06, 1.06)
                    cur = Image.blend(prev, cur, fade(t, a - 1.0, a))
                bg = cur
                break
        if bg is None:
            bg = kb(BG['trevas'], t, T_G3, T_BACK, 1.0, 1.06)
    else:
        bg = kb(BG['vila'], t, T_BACK, DUR, 1.0, 1.06)
    cv = bg.convert('RGBA')

    # 2) personagens
    if t < T_SPLIT + 0.4:
        if t < T_WALK1:
            p = (t - T_WALK0) / (T_WALK1 - T_WALK0)
            x = -140 + (470 + 140) * smooth(min(max(p, 0), 1))
            col = [0, 1, 2, 1][int((t * 7)) % 4] if 0 < p < 1 else 1
            spr = bento(2, col)
        else:
            x = 470
            spr = bento(0, 1 + (1 if int(t * 1.5) % 2 and t > T_L1 else 0) * 0)  # parado de frente
        if T_WALK0 - 1 < t:
            paste_center_bottom(cv, spr, x, 505)
    elif T_G1 - 1.0 <= t < T_BACK:
        for (a, b, k) in ((T_G1, T_G2, 'green_dragon'), (T_G2, T_G3, 'ice_dragon'), (T_G3, T_BACK, 'shadow_dragon')):
            if a - 0.4 <= t < b + 0.4:
                al = min(fade(t, a - 0.4, a + 0.4), 1 - fade(t, b - 0.4, b + 0.4))
                spr = DRAGONS[k].copy()
                spr.putalpha(spr.getchannel('A').point(lambda v: int(v * al)))
                paste_center_bottom(cv, spr, 640, 480 + math.sin(t * 2.2) * 12, shadow=False)
    elif t >= T_BACK - 0.5:
        al = fade(t, T_BACK - 0.5, T_BACK + 0.5)
        spr = bento(0, 1)
        spr.putalpha(spr.getchannel('A').point(lambda v: int(v * al)))
        paste_center_bottom(cv, spr, 640, 505)

    # 3) texto
    if t >= 1.0:
        tag(cv, 'FLASHBACK', min(1, fade(t, 1.0, 2.0)) * (1 - fade(t, T_END - 1.0, T_END)))
    def show(txt, a, b, name, who='Narrador'):
        if a <= t < b:
            al = min(fade(t, a, a + 0.3), 1 - fade(t, b - 0.3, b))
            dialog(cv, name, txt, a + 0.2, t, al)
    show(L1, T_L1, T_L2 - 0.2, 'Vovô Bento')
    show(L2, T_L2, T_SPLIT + 1.2, 'Vovô Bento')
    show(L3, T_G1 + 0.3, T_G2 - 0.3, 'Vovô Bento')
    show(L4, T_G2 + 0.3, T_G3 - 0.3, 'Vovô Bento')
    show(L5, T_G3 + 0.3, T_BACK - 0.3, 'Vovô Bento')
    show(L6, T_L5, T_END - 0.4, 'Vovô Bento')

    # 4) clarao da ruptura + fades
    if SPLIT_FLASH[0] <= t < SPLIT_FLASH[1] + 0.5:
        k = 1 - fade(t, SPLIT_FLASH[0] + 0.05, SPLIT_FLASH[1] + 0.5)
        if t < SPLIT_FLASH[0] + 0.05: k = (t - SPLIT_FLASH[0]) / 0.05
        cv = Image.blend(cv, Image.new('RGBA', cv.size, (255, 255, 255, 255)), max(0, min(1, k)) * 0.9)
    black = 1 - fade(t, 0.0, 1.2) if t < 3 else fade(t, T_END, DUR)
    if black > 0:
        cv = Image.blend(cv, Image.new('RGBA', cv.size, (0, 0, 0, 255)), black)
    return cv.convert('RGB')


def audio_cmd(out_wav):
    # musica existente (medieval_library) + trovao no instante da ruptura + vento por baixo das cenas dos dragoes
    return [
        'ffmpeg', '-y', '-v', 'error',
        '-ss', '8', '-t', str(DUR), '-i', A('audio', 'music', 'medieval_library.mp3'),
        '-i', A('audio', 'sfx', 'thunder.mp3'),
        '-stream_loop', '-1', '-t', str(DUR), '-i', A('audio', 'ambient', 'wind.mp3'),
        '-filter_complex',
        f"[0:a]volume=0.55,afade=t=in:d=1.5,afade=t=out:st={DUR-2.5}:d=2.5[m];"
        f"[1:a]volume=0.9,adelay={int(T_SPLIT*1000)}|{int(T_SPLIT*1000)}[th];"
        f"[2:a]volume=0.22,afade=t=in:st={T_SPLIT}:d=1.5,afade=t=out:st={T_BACK}:d=1.5[w];"
        "[m][th][w]amix=inputs=3:normalize=0,loudnorm=I=-18:TP=-3:LRA=11,alimiter=limit=0.85:level=0[a]",
        '-map', '[a]', '-ar', '44100', '-ac', '2', out_wav]


def main():
    if '--preview' in sys.argv:
        i = sys.argv.index('--preview')
        ts = [float(x) for x in sys.argv[i + 1].split(',')]
        d = sys.argv[i + 2]
        os.makedirs(d, exist_ok=True)
        for t in ts:
            frame(t).save(os.path.join(d, f'f_{t:05.1f}.png'))
        return
    out = os.path.join(ROOT, 'assets', 'cutscenes', '01_flashback_vovo.mp4')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp_wav, tmp = out + '.tmp.wav', out + '.tmp.mp4'
    subprocess.run(audio_cmd(tmp_wav), check=True)
    cmd = ['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-i', tmp_wav, '-c:v', 'libx264', '-profile:v', 'main', '-level', '3.1', '-crf', '24', '-preset', 'medium', '-pix_fmt', 'yuv420p',
           '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', '-f', 'mp4', tmp]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = int(DUR * FPS)
    for i in range(n):
        p.stdin.write(frame(i / FPS).tobytes())
    p.stdin.close()
    if p.wait() != 0:
        raise SystemExit('ffmpeg falhou')
    os.replace(tmp, out)
    os.remove(tmp_wav)
    print('ok', out, os.path.getsize(out) // 1024, 'KB')

main()
