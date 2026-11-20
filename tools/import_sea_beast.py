"""
Recorta o SEA BEAST (Leviatã) das folhas do pacote new sea assets e gera assets/sprites-v2/sea_beast/*.png + ORIGEM.json,
no mesmo formato dos outros lutadores. Fundo azul vira transparente (chroma key por folha) e cada quadro é alinhado
pela base (linha d'água = pés). Uso: python3 tools/import_sea_beast.py <pasta com folha (1).png e folha (2).png>
Depois rode a parte de registro (spritesV2.ts) já incluída no repositório. Sem sprite inventado: tudo vem das folhas.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sprites-v2', 'sea_beast')
os.makedirs(OUT, exist_ok=True)

def load(n):
    im = Image.open(os.path.join(SRC, n)).convert('RGB')
    a = np.array(im).astype(int)
    bg = np.median(a[0:20, 0:20].reshape(-1, 3), axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(axis=2))
    mask = dist > 34
    rowfrac = mask.mean(axis=1)
    for y in range(a.shape[0]):
        if rowfrac[y] > 0.9: mask[y, :] = False
    mask[:3, :] = mask[-3:, :] = False; mask[:, :3] = mask[:, -3:] = False
    lab, nl = ndi.label(ndi.binary_dilation(mask, iterations=7))
    boxes = []
    for i in range(1, nl + 1):
        ys, xs = np.where((lab == i) & mask)
        if len(xs) < 400: continue
        boxes.append((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    boxes.sort(key=lambda b: (b[1] // 150, b[0]))
    # alpha suave: distância ao fundo (0 no fundo, 1 a partir de 60)
    alpha = np.clip((dist - 24) / 36.0, 0, 1)
    rgba = np.dstack([a.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    return Image.fromarray(rgba, 'RGBA'), boxes

s1, b1 = load('folha (1).png')
s2, b2 = load('folha (2).png')

# pose -> (folha, índice do quadro na ordem de leitura). Escolhidos olhando as folhas (ver docs/AUDIT.md).
POSES = {
    'idle': (s1, b1, 0), 'walk1': (s1, b1, 1), 'walk2': (s1, b1, 2), 'walk3': (s1, b1, 3), 'walk4': (s1, b1, 4),
    'flash': (s1, b1, 6),   # mordida rápida (boca aberta)
    'strong': (s1, b1, 9),  # investida com arco d'água
    'ult': (s1, b1, 15),    # gêiser: o Leviatã sobe numa coluna d'água
    'hurt': (s1, b1, 14),   # afunda em respingos
    'ko': (s1, b1, 24),     # deitado na água
    'guard': (s1, b1, 19),  # enrolado, em guarda
    'dash': (s1, b1, 12),   # lançado rente à água
    'charge': (s1, b1, 18), # redemoinho em volta da cabeça
    'cast': (s1, b1, 17),   # rugido com redemoinho
    'blast': (s2, b2, 7),   # rajada d'água pela boca
    'portrait': (s2, b2, 0),
}

# altura comum do canvas (pés alinhados na base), como os dragões (altura de corpo fixa)
frames = {}
for name, (sheet, boxes, idx) in POSES.items():
    x0, y0, x1, y1 = boxes[idx]
    pad = 4
    frames[name] = sheet.crop((max(0, x0 - pad), max(0, y0 - pad), x1 + pad, y1 + pad))
H = max(f.height for n, f in frames.items() if n != 'portrait')
meta = {}
for name, f in frames.items():
    if name == 'portrait':
        im = f
    else:
        im = Image.new('RGBA', (f.width, H), (0, 0, 0, 0))
        im.alpha_composite(f, (0, H - f.height))  # pés (base) alinhados
    im.save(os.path.join(OUT, name + '.png'), optimize=True)
    meta[name] = {'w': im.width, 'h': im.height, 'tipo': 'solto' if name == 'portrait' else 'corpo'}
json.dump({'folha': 'new sea assets/sea monster/folha (1).png + folha (2).png', 'layout': 'dragon', 'altura_corpo_px': H, 'poses': meta}, open(os.path.join(OUT, 'ORIGEM.json'), 'w'), indent=1)
print('H', H)
for n, m in meta.items(): print(n, m['w'], m['h'])
