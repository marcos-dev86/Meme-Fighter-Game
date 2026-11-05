"""Recorta a FOLHA DE POSES enviada pelo dono (tools/art_src/folha_3_personagens.png) nos quadros de Tocao, Serafim e Capiroto.

A folha tem 3 linhas (laranja, anjo, diabo) e 8 colunas: parado, 4 passos de andar, e 3 quadros de ataque. Nada aqui e
desenhado: cada quadro e RECORTADO da folha (fundo verde removido) com seus efeitos (rastro, estrela, arco). Onde a folha nao traz um
quadro, o mapeamento fica registrado em ORIGEM (ver POSE_NOTES).
  * Serafim / Capiroto : dash (rastro) | flash = soco curto (estrela) | strong = soco longo (arco) -> um quadro para cada.
  * Tocao : a linha dele traz 2 quadros de investida (um com estrela) e o arco solto: dash = investida com rastro,
            flash = investida com estrela, strong = a mesma investida da estrela SEM a estrela + arco solto.
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

BG = np.array([65, 115, 69], np.float32)
SHEET = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'art_src', 'folha_3_personagens.png')

# retangulos (x0, x1) por linha; y0/y1 por linha
ROWS = {'tocao': (0, 236), 'serafim': (240, 492), 'capiroto': (500, 783)}
COLS = {
    'tocao': {'idle': (15, 150), 'walk1': (195, 340), 'walk2': (365, 520), 'walk3': (560, 745), 'walk4': (770, 950),
              'a': (962, 1290), 'b': (1380, 1640), 'arc': (1680, 1995)},
    'serafim': {'idle': (0, 188), 'walk1': (190, 362), 'walk2': (364, 548), 'walk3': (556, 758), 'walk4': (768, 958),
                'dash': (960, 1250), 'flash': (1380, 1700), 'strong': (1712, 2008)},
    'capiroto': {'idle': (0, 181), 'walk1': (183, 360), 'walk2': (362, 548), 'walk3': (554, 748), 'walk4': (768, 955),
                 'dash': (958, 1260), 'flash': (1362, 1680), 'strong': (1700, 2008)},
}


def _keyed(rgb):
    """fundo verde -> transparente; franjas do contorno e rastros semi-transparentes recuperam a cor por 'un-blend'."""
    p = rgb.astype(np.float32)
    d = np.abs(p - BG).sum(2)
    al = np.clip((d - 24) / 70.0, 0, 1)
    col = BG + (p - BG) / np.maximum(al, 0.06)[..., None]
    col = np.clip(col, 0, 255)
    out = np.dstack([col, al * 255]).astype(np.uint8)
    out[al < 0.04] = 0
    return out


def _cut(sheet, x0, x1, y0, y1):
    a = _keyed(sheet[y0:y1, x0:x1])
    m = a[..., 3] > 30
    lab, n = ndi.label(ndi.binary_dilation(m, iterations=4))
    if n > 1:  # tira poeira solta (so fica o que e grande ou encostado no maior pedaco)
        sizes = ndi.sum(m, lab, range(1, n + 1))
        keep = [i + 1 for i, s in enumerate(sizes) if s > 40]
        a[~np.isin(lab, keep)] = 0
    ys, xs = np.where(a[..., 3] > 30)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return a


def _feet_cx(a):
    """centro do corpo = meio dos pes (a parte de baixo do quadro e sempre corpo, os efeitos ficam mais acima)."""
    h = a.shape[0]
    solid = a[..., 3] > 230
    band = solid[int(h * 0.88):]
    ys, xs = np.where(band)
    if len(xs) == 0:
        return a.shape[1] / 2.0
    return (xs.min() + xs.max()) / 2.0


def _star_x(a):
    """coluna a partir da qual so existe a estrela (separa estrela do punho): primeira coluna 'vazia' perto do fim."""
    col = (a[..., 3] > 60).any(0)
    xs = np.where(~col)[0]
    return int(xs.max()) if len(xs) else a.shape[1]


def frames(name):
    """-> {pose: (rgba, cx)} para idle, walk1-4, dash, flash, strong"""
    sheet = np.array(Image.open(SHEET).convert('RGB'))
    y0, y1 = ROWS[name]
    raw = {k: _cut(sheet, x0, x1, y0, y1) for k, (x0, x1) in COLS[name].items()}
    out = {}
    for k in ('idle', 'walk1', 'walk2', 'walk3', 'walk4'):
        out[k] = raw[k]
    if name == 'tocao':
        a, b, arc = raw['a'], raw['b'], raw['arc']
        out['dash'] = b
        out['flash'] = a
        # soco longo = a investida da estrela sem a estrela + arco na frente do punho (como nas outras duas linhas)
        sx = _star_x(a)
        body = a[:, :sx].copy() if sx < a.shape[1] - 4 else a.copy()
        gap = 6
        H = max(body.shape[0], arc.shape[0])
        canvas = np.zeros((H, body.shape[1] + gap + arc.shape[1], 4), np.uint8)
        canvas[H - body.shape[0]:, :body.shape[1]] = body
        ah = arc.shape[0]
        canvas[(H - ah) // 2 - 0:(H - ah) // 2 + ah, body.shape[1] + gap:] = arc
        out['strong'] = canvas
        cx_override = {'strong': _feet_cx(body)}
    else:
        out['dash'], out['flash'], out['strong'] = raw['dash'], raw['flash'], raw['strong']
        cx_override = {}
    return {k: (v, cx_override.get(k, _feet_cx(v))) for k, v in out.items()}


POSE_NOTES = {
    'tocao': {'dash': 'folha enviada pelo dono: investida com rastro',
              'flash': 'folha enviada pelo dono: soco curto com estrela',
              'strong': 'folha enviada pelo dono: mesma investida SEM a estrela + arco de energia solto da folha (a linha dele nao traz um quadro de soco longo proprio)'},
}
