"""
Recorta o REI POSEIDON (personagem subaquático jogável) de king-poisendon/personagem.png e gera
assets/sprites-v2/poseidon/*.png + ORIGEM.json no formato dos outros lutadores. Fundo preto vira transparente
(chave por brilho) e a sombra no chão é removida; cada quadro é alinhado pela base (pés).
Uso: python3 tools/import_poseidon.py <caminho de personagem.png>
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sprites-v2', 'poseidon')
os.makedirs(OUT, exist_ok=True)
im = Image.open(SRC).convert('RGB')
a = np.array(im).astype(int)
mx = a.max(axis=2)
# a sombra do chão é roxa escura (brilho baixo e azul > vermelho): fora; o corpo é azul vivo
mask = mx > 70
mask[:3, :] = mask[-3:, :] = False; mask[:, :3] = mask[:, -3:] = False
lab, n = ndi.label(ndi.binary_dilation(mask, iterations=9))
boxes = []
for i in range(1, n + 1):
    ys, xs = np.where((lab == i) & mask)
    if len(xs) < 600: continue
    boxes.append((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
boxes.sort(key=lambda b: (b[1] // 190, b[0]))
# Corpo sólido: as partes escuras da armadura (botas, contornos) não podem virar buraco. Preenche o casco do que é brilhante
# e deixa só os efeitos (aura, rajada) com transparência suave. A sombra do chão fica de fora (é mais escura que o limiar).
solid = ndi.binary_dilation(ndi.binary_fill_holes(ndi.binary_closing(mask, structure=np.ones((3, 3)), iterations=7)), iterations=2)
soft = np.clip((mx - 52) / 40.0, 0, 1)
alpha_solid = np.maximum(soft, solid.astype(float))
sheet_solid = Image.fromarray(np.dstack([a.astype(np.uint8), (alpha_solid * 255).astype(np.uint8)]), 'RGBA')
# efeitos: só fecha buracos pequenos dentro do corpo (sem encher os vãos entre os rastros)
solid_fx = ndi.binary_fill_holes(ndi.binary_closing(mask, structure=np.ones((3, 3)), iterations=3))
alpha_fx = np.maximum(soft, solid_fx.astype(float))
sheet_soft = Image.fromarray(np.dstack([a.astype(np.uint8), (alpha_fx * 255).astype(np.uint8)]), 'RGBA')
# poses com muito efeito (giro, soco com rajada, super, rajada) usam só a transparência suave: o casco encheria de preto os vãos do efeito
FX = {'ult', 'strong', 'flash', 'blast', 'charge', 'cast'}

# pose -> índice do quadro na ordem de leitura (linha 1: idle e andar; 2: corrida; 3: carga, giro, soco, rajada; 4: dano, guarda, nocaute)
POSES = {'idle': 0, 'walk1': 1, 'walk2': 2, 'walk3': 3, 'walk4': 4, 'dash': 7, 'charge': 10, 'cast': 10, 'ult': 11, 'strong': 12, 'flash': 13,
         'blast': 14, 'hurt': 15, 'guard': 16, 'ko': 18, 'portrait': 0}
frames = {}
for name, idx in POSES.items():
    x0, y0, x1, y1 = boxes[idx]
    frames[name] = (sheet_soft if name in FX else sheet_solid).crop((max(0, x0 - 4), max(0, y0 - 4), x1 + 4, y1 + 4))
H = max(f.height for k, f in frames.items() if k not in ('portrait', 'blast'))
meta = {}
for name, f in frames.items():
    if name in ('portrait', 'blast'):
        out = f
    else:
        out = Image.new('RGBA', (f.width, H), (0, 0, 0, 0)); out.alpha_composite(f, (0, H - f.height))
    out = out.quantize(colors=96, method=Image.FASTOCTREE, dither=Image.NONE)
    out.save(os.path.join(OUT, name + '.png'), optimize=True)
    meta[name] = {'w': out.width, 'h': out.height, 'tipo': 'solto' if name in ('portrait', 'blast') else 'corpo'}
json.dump({'folha': 'king-poisendon/personagem.png', 'layout': 'humanoide', 'altura_corpo_px': H, 'quadros_encontrados': len(boxes), 'poses': meta}, open(os.path.join(OUT, 'ORIGEM.json'), 'w'), indent=1)
print('quadros', len(boxes), 'H', H)
for n_, m in meta.items(): print(n_, m['w'], m['h'], os.path.getsize(os.path.join(OUT, n_ + '.png')) // 1024, 'KB')
