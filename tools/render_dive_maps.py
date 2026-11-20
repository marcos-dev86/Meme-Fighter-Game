"""
Desenha as imagens dos mapas de mergulho (assets/sea/maps/<id>.png) com os tiles do Time Fantasy Atlantis
(assets/sea/tiles). Uso:
  node tools/dump-dive-grids.mjs > /tmp/dive_grids.json && python3 tools/render_dive_maps.py /tmp/dive_grids.json
Tiles de 16px ampliados 2x (32px = TILE em diveSites.ts). Só desenha o cenário fixo; baús, criaturas, NPCs e paredes
secretas reveladas são desenhados pela cena.
"""
import json, sys, os, random
from PIL import Image, ImageEnhance

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sea')
T = 32
A = Image.open(os.path.join(ROOT, 'tiles', 'tf_A5_atlantisA.png')).convert('RGBA')
B = Image.open(os.path.join(ROOT, 'tiles', 'tf_A5_atlantisB.png')).convert('RGBA')

def cell(sheet, c, r):
    return sheet.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)).resize((T, T), Image.NEAREST)

SAND = {'reef', 'lagoon', 'city', 'ruins'}
TINT = {  # multiplicador RGB por clima
    'reef': (1.05, 1.1, 1.15), 'wreck': (0.95, 0.9, 0.85), 'cave': (0.75, 0.85, 1.0), 'ruins': (1.0, 1.0, 1.05), 'vent': (1.15, 0.85, 0.75),
    'abyss': (0.5, 0.55, 0.8), 'lagoon': (1.1, 1.15, 1.2), 'city': (0.95, 1.05, 1.1), 'ice': (0.9, 1.1, 1.3), 'tunnel': (0.7, 0.8, 0.95),
}

def tint(im, mult):
    r, g, b, a = im.split()
    r = r.point(lambda v: min(255, int(v * mult[0]))); g = g.point(lambda v: min(255, int(v * mult[1]))); b = b.point(lambda v: min(255, int(v * mult[2])))
    return Image.merge('RGBA', (r, g, b, a))

def overlay(im, color, alpha):
    ov = Image.new('RGBA', im.size, color + (int(255 * alpha),))
    return Image.alpha_composite(im, ov)

def render(sid, d):
    sheet = B if d['mood'] in SAND else A
    floors = [cell(sheet, c, r) for c in (1, 2, 3) for r in (2, 3)]
    deco = [cell(A, 0, 1), cell(A, 1, 1), cell(A, 5, 1), cell(A, 6, 1), cell(A, 7, 1)]
    face = cell(sheet, 1, 7); face2 = cell(sheet, 2, 7); void = cell(sheet, 5, 5); void2 = cell(sheet, 4, 5)
    w, h, grid = d['w'], d['h'], d['grid']
    rnd = random.Random(sid)
    img = Image.new('RGBA', (w * T, h * T), (10, 22, 40, 255))
    open_ = lambda x, y: 0 <= x < w and 0 <= y < h and grid[y][x] not in '#H'
    for y in range(h):
        for x in range(w):
            ch = grid[y][x]
            if ch in '#H':
                t = (face if (x + y) % 2 == 0 else face2) if open_(x, y + 1) else (void if (x * 7 + y * 3) % 5 else void2)
                img.alpha_composite(t, (x * T, y * T))
                continue
            t = floors[rnd.randrange(len(floors))].copy()
            if ch == ':': t = overlay(tint(t, (0.55, 0.6, 0.85)), (5, 10, 40), 0.35)
            elif ch == '~': t = overlay(tint(t, (1.3, 0.8, 0.6)), (255, 90, 20), 0.28)
            elif ch == 'k': t = overlay(tint(t, (0.9, 1.1, 1.4)), (170, 230, 255), 0.30)
            elif ch == 'A': t = overlay(overlay(t, (20, 90, 160), 0.2), (200, 240, 255), 0.45)
            elif ch == 'U': t = overlay(t, (255, 255, 255), 0.55)
            else: t = overlay(tint(t, TINT.get(d['mood'], (1, 1, 1))), (20, 90, 160), 0.34)  # banho de água
            img.alpha_composite(t, (x * T, y * T))
            if ch == '.' and rnd.random() < 0.10:
                img.alpha_composite(deco[rnd.randrange(len(deco))], (x * T, y * T))
    # bolhas nos bolsões de ar e na superfície
    from PIL import ImageDraw
    dr = ImageDraw.Draw(img)
    for y in range(h):
        for x in range(w):
            if grid[y][x] in 'AU':
                for _ in range(5):
                    cx, cy, r = x * T + rnd.randrange(4, T - 4), y * T + rnd.randrange(4, T - 4), rnd.randrange(2, 5)
                    dr.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 230))
    out = os.path.join(ROOT, 'maps', sid + '.png')
    img.convert('RGB').quantize(colors=96, method=Image.MEDIANCUT).save(out, optimize=True)
    return out

if __name__ == '__main__':
    data = json.load(open(sys.argv[1]))
    os.makedirs(os.path.join(ROOT, 'maps'), exist_ok=True)
    for sid, d in data.items():
        print(render(sid, d))
    # tile de chão liso usado para revelar paredes secretas
    cell(B, 1, 2).save(os.path.join(ROOT, 'tiles', 'floor_reveal.png'))
