#!/usr/bin/env python3
"""Converte as folhas de efeito de água e os emojis do pacote `new-sea-assets` em tiras horizontais
(`assets/sea/fx/<nome>.png`, quadros lado a lado) + `assets/sea/fx/index.json` (frames/w/h).
Uso: python3 tools/import_sea_fx.py <pasta_do_pacote_extraido>
Só recorta e reordena os pixels originais: nenhuma arte é inventada. Células vazias são descartadas."""
import json, os, sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'new-sea-assets'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets', 'sea', 'fx')
EMO = os.path.join(ROOT, 'assets', 'sea', 'emoji')
os.makedirs(OUT, exist_ok=True); os.makedirs(EMO, exist_ok=True)

def find(sub):
    for dp, _, fs in os.walk(SRC):
        for f in fs:
            p = os.path.join(dp, f)
            if p.replace('\\', '/').endswith(sub): return p
    raise SystemExit('não achei ' + sub)

def cells(img, cw, ch, cols, rows, minpx=20, skip=0, max_frames=None, row_range=None):
    out = []
    for r in range(rows):
        if row_range and not (row_range[0] <= r < row_range[1]): continue
        for c in range(cols):
            cell = img.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            if sum(1 for a in cell.getchannel('A').getdata() if a > 40) >= minpx: out.append(cell)
    out = out[skip:]
    return out[:max_frames] if max_frames else out

def strip(frames, cw, ch, name, index):
    s = Image.new('RGBA', (cw * len(frames), ch), (0, 0, 0, 0))
    for i, f in enumerate(frames): s.paste(f, (i * cw, 0))
    s.save(os.path.join(OUT, name + '.png'))
    index[name] = {'frames': len(frames), 'w': cw, 'h': ch}

index = {}
def load(sub): return Image.open(find(sub)).convert('RGBA')

# splash (330x308 = 5x4 de 66x77): usa só as 3 primeiras linhas (a 4a é só respingo residual)
strip(cells(load('Water Splash 01 - Spritesheet.png'), 66, 77, 5, 4, row_range=(0, 3)), 66, 77, 'splash', index)
# spike (320x320 = 5x5 de 64): coluna de água que sobe
strip(cells(load('Water Spike 01 - SpriteSheet.png'), 64, 64, 5, 5, row_range=(0, 4)), 64, 64, 'spike', index)
# impacto da bola d'água (256x256 = 4x4 de 64)
strip(cells(load('WaterBall - Impact.png'), 64, 64, 4, 4, minpx=30), 64, 64, 'ball_impact', index)
# bola d'água em voo (320x320 = 5x5 de 64)
strip(cells(load('WaterBall - Startup and Infinite.png'), 64, 64, 5, 5), 64, 64, 'ball_fly', index)
# fim do jato (384x384 = 3x3 de 128): explosão de água
strip(cells(load('Water Blast - End.png'), 128, 128, 3, 3, minpx=30), 128, 128, 'blast_end', index)
# redemoinho em loop (512x384 = 4x3 de 128): pula os 3 quadros iniciais (só a base), fica o funil cheio
strip(cells(load('Water Blast - Startup and Infinite.png'), 128, 128, 4, 3, minpx=200, skip=0), 128, 128, 'vortex', index)
# bolhas (RPG Maker 100%: 192x128, células 16x16): grupo 0, linhas 3..7 = anel que cresce até estourar
b = load('tf_atlantis/RPGMAKER-100/char_bubbles.png')
strip([b.crop((0, r * 16, 16, r * 16 + 16)) for r in range(3, 8)], 16, 16, 'bubble', index)
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), indent=2)

# emojis (256x256 -> 128x128, vizinho mais próximo para manter o pixel-art)
base = None
for dp, _, fs in os.walk(SRC):
    if dp.replace('\\', '/').endswith('/256x256') and 'Viral' in dp: base = dp
names = {'7': 'stop', '194': 'skull', '54': 'shocked', '115': 'scream'}
for n, nm in names.items():
    Image.open(os.path.join(base, f'ViralEmoji - {n}.png')).convert('RGBA').resize((128, 128), Image.NEAREST).save(os.path.join(EMO, nm + '.png'))
print(json.dumps(index))
