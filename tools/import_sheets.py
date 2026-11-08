"""Importa as FOLHAS DE SPRITES novas (tools/art_src/sheets/<personagem>.png) para assets/sprites-v2/<personagem>/.

Nada aqui e desenhado: cada quadro e RECORTADO da folha enviada pelo dono (fundo preto removido). Os sprites ANTIGOS
(assets/legacy-sprites) NAO sao tocados: o jogo so usa os novos quando o personagem esta ligado em
assets/sprites-v2/ACTIVE.json (desligue um personagem la e ele volta ao desenho antigo na hora).

Uso:   python3 tools/import_sheets.py            (reimporta todas as folhas que existem)
       python3 tools/import_sheets.py orc dogge  (so esses)
Gera:  assets/sprites-v2/<p>/<pose>.png, assets/sprites-v2/<p>/ORIGEM.json, assets/sprites-v2/ACTIVE.json (se nao existir)
       src/game/battle/spritesV2.ts (GERADO: require() + proporcao de cada quadro)

Layouts de folha reconhecidos (a folha segue o modelo enviado: retrato grande + 5 passos + linhas de ataque/efeitos):
  std     (gadigago, dogge, sahur): linha 0 = retrato + 5 passos; linha 1 = guarda, soco curto, soco longo, investida;
          linha 2 = aura, bola, rastro, pose de conjurar, levando golpe; linha 3 = 4 expressoes + nocaute.
  soldier : linha 1 tem 5 quadros (guarda, jab, soco longo, recuo, carregando); linha 2 = explosao de gelo, bola, rastro,
          conjurar, levando golpe; linha 3 = 4 agachados, ajoelhado e nocaute.
  orc     : linha 1 = frente, costas, agachado, golpe com arco; linha 2 = bola grande, bola pequena, levando golpe,
          rastro, nocaute; linha 3 = 4 rostos.
Se uma folha futura vier com outra contagem de quadros o script para e diz qual linha nao bate (nao chuta).
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import png_opt  # noqa: E402
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, 'tools', 'art_src', 'sheets')
OUT = os.path.join(ROOT, 'assets', 'sprites-v2')
TS_OUT = os.path.join(ROOT, 'src', 'game', 'battle', 'spritesV2.ts')

# personagem -> chave do jogo (CharacterKey) e tipo de layout
CHARS = {
    'orc': ('orc', 'orc2'),  # 2a folha do orc (orc_2.png) + pecas que ela nao traz vindas da 1a (orc.png), ver SUPPLEMENT
    'soldier': ('soldier', 'soldier'),
    'gadigago': ('gadigago', 'std'),
    'dogge': ('dogge', 'std'),
    'sahur': ('sahur', 'std'),
    # folhas da 2a rodada (quadros colados uns nos outros: recorte por celulas, ver SHEET_CFG)
    'ninja': ('ninja', 'newA'),
    'troll_face': ('troll_face', 'newA'),
    'sahur_evil': ('sahur_evil', 'newA'),
    'sahur_god': ('sahur_god', 'newA'),
    'dogking': ('dogking', 'newA'),
    'tank': ('tank', 'newA'),
    'mystic': ('mystic', 'newB'),
    'cara_tranquilo': ('cara_tranquilo', 'newB'),
    # 3a rodada: os 3 dragoes (a folha nova nao traz um bom voo: idle e andar vem dos sprites ANTIGOS, ver LEGACY_FLIGHT)
    'shadow_dragon': ('shadow_dragon', 'dragon'),
    'ice_dragon': ('ice_dragon', 'dragon'),
    'green_dragon': ('green_dragon', 'dragon'),
}
SHEET_FILE = {'orc': 'orc_2'}  # nome da folha quando diferente do personagem
SUPPLEMENT = {'orc': ('orc', ['hurt', 'front', 'back', 'orb', 'burst', 'ult', 'face1', 'face2', 'face3', 'face4'])}
# poses que vem dos sprites ANTIGOS (assets/legacy-sprites/<p>/<pose>.png), reescalados para casar com os quadros novos
LEGACY_FLIGHT = {
    'shadow_dragon': ['idle', 'walk1', 'walk2', 'walk3', 'ult'],
    'ice_dragon': ['idle', 'walk1', 'walk2', 'walk3', 'ult'],
    'green_dragon': ['idle', 'walk1', 'walk2', 'walk3', 'ult'],
}
# Folhas "new": os quadros de ataque/efeito encostam um no outro, entao o recorte automatico por componente junta varios.
# hints = (linha, x) pontos da folha (1536 de largura) onde ha uma fronteira de quadro; o corte vai para o "vale" mais vazio
# a +-40 px dali (so age se o bloco realmente atravessa esse x). hurt = indice, na linha 3, do quadro levando golpe
# (nas folhas tipo A ele nao tem quadro proprio na linha 2; e o quadro com marcas de impacto/tombado da linha 3).
SHEET_CFG = {
    'ninja': {'dark': True, 'hints': [(1, 1135), (2, 1010), (2, 1265)], 'hurt': 1},
    'troll_face': {'hints': [(1, 1128), (2, 975), (2, 1225)], 'hurt': 2},
    'sahur_evil': {'hints': [(1, 1150), (2, 985), (2, 1227)], 'hurt': 0},
    'sahur_god': {'hints': [(1, 1165)], 'hurt': 3},
    'dogking': {'dark': True, 'hints': [(1, 1115), (2, 920), (2, 1196)], 'hurt': 3},
    'tank': {'hints': [(1, 875), (1, 1140), (2, 925), (2, 1200)], 'hurt': 3},
    'mystic': {'dark': True, 'hints': [(0, 852), (0, 1051), (0, 1250), (1, 620), (1, 838), (1, 1140), (2, 360), (2, 595), (2, 1210)]},
    'cara_tranquilo': {'hints': []},
    'orc': {'hints': [(1, 1195, 'cc')]},
    'shadow_dragon': {'dark': True, 'min_h': 40, 'hints': [(1, 1145)]},
    'ice_dragon': {'min_h': 40, 'hints': [(1, 1272)]},
    'green_dragon': {'dark': True, 'min_h': 40, 'hints': [(2, 1245)]},
}
ROW_BANDS = [(0, 290), (290, 545), (545, 800), (800, 1024)]
# limites verticais (centro do componente) entre as linhas 0|1, 1|2 e 2|3
BANDS = {'std': (290, 545, 800), 'soldier': (290, 545, 800), 'orc': (290, 580, 840)}

CORE = ['idle', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'dash', 'flash', 'strong', 'hurt', 'guard']
BODY = CORE + ['ko', 'charge', 'cast', 'exp1', 'exp2', 'exp3', 'exp4', 'front', 'back', 'dash2', 'blast']
ADDITIVE = {'orb', 'ult', 'burst'}  # efeitos de luz: o preto vira transparente (sem preencher buracos)
MAX_RATIO = 1.18  # poses mais altas que 1.18 x idle sao reduzidas (a altura em tela do lutador nao muda entre quadros)


# ----------------------------------------------------------------------------- segmentacao


def segment(rgb):
    s = rgb.astype(int).sum(2)
    m = ndi.binary_dilation(s > 110, iterations=7)
    lab, n = ndi.label(m)
    comps = []
    for i, o in enumerate(ndi.find_objects(lab)):
        area = int((lab[o] == i + 1).sum())
        if area < 1500:
            continue
        y0, x0, y1, x1 = o[0].start, o[1].start, o[0].stop, o[1].stop
        if x1 - x0 < 90 and x0 < 110 and y0 < 320:  # amostras de paleta no canto superior esquerdo
            continue
        comps.append({'id': i + 1, 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'labels': [i + 1]})
    # satelites pequenos (marcas de dor, estrelinhas) entram no quadro grande mais proximo
    big = [c for c in comps if not (((c['x1'] - c['x0']) * (c['y1'] - c['y0']) < 18000) and (c['x1'] - c['x0']) < 100)]
    small = [c for c in comps if c not in big]
    for sm in small:
        cx, cy = (sm['x0'] + sm['x1']) / 2, (sm['y0'] + sm['y1']) / 2
        best = min(big, key=lambda b: np.hypot(cx - (b['x0'] + b['x1']) / 2, cy - (b['y0'] + b['y1']) / 2))
        best['labels'] += sm['labels']
        best['x0'], best['y0'] = min(best['x0'], sm['x0']), min(best['y0'], sm['y0'])
        best['x1'], best['y1'] = max(best['x1'], sm['x1']), max(best['y1'], sm['y1'])
    return big, lab


def segment_new(rgb, hints, min_h=30):
    """Como segment(), mas separa quadros colados nos pontos `hints` (linha, x) e usa limiar menor (personagens escuros)."""
    sm = rgb.astype(int).sum(2)
    m = ndi.binary_dilation(sm > 60, iterations=3)
    lab, n = ndi.label(m)
    nxt = n + 1
    for hint in sorted(hints, key=lambda h: (h[0], h[1])):
        row, hx = hint[0], hint[1]
        by_cc = len(hint) > 2 and hint[2] == 'cc'
        y0, y1 = ROW_BANDS[row]
        for i, o in enumerate(ndi.find_objects(lab)):
            if o is None:
                continue
            cy = (o[0].start + o[0].stop) / 2
            if not (y0 <= cy < y1 and o[1].start + 20 < hx < o[1].stop - 20):
                continue
            if by_cc:
                # separa por pecas CONECTADAS (sem dilatar): o efeito (arco/sopro) e o corpo ficam cada um com o seu quadro
                mine = lab == i + 1
                core = (sm > 60) & mine
                cc, ncc = ndi.label(core, structure=np.ones((3, 3)))
                left = np.zeros_like(core)
                right = np.zeros_like(core)
                for j in range(1, ncc + 1):
                    ys, xs = np.where(cc == j)
                    (right if xs.mean() > hx else left)[cc == j] = True
                if left.any() and right.any():
                    dl = ndi.distance_transform_edt(~left)
                    dr = ndi.distance_transform_edt(~right)
                    lab[mine & (dr < dl)] = nxt
                    nxt += 1
                    break
                continue
            lo, hi = max(o[1].start + 10, hx - 40), min(o[1].stop - 10, hx + 40)
            mine = lab == i + 1
            cols = {x: int(mine[:, x].sum()) + 0.02 * abs(x - hx) for x in range(lo, hi)}
            cut_x = min(cols, key=cols.get)
            right = mine.copy()
            right[:, :cut_x] = False
            lab[right] = nxt
            nxt += 1
            break
    comps = []
    for i, o in enumerate(ndi.find_objects(lab)):
        if o is None:
            continue
        area = int((lab[o] == i + 1).sum())
        if area < 900:
            continue
        y0, x0, y1, x1 = o[0].start, o[1].start, o[0].stop, o[1].stop
        if y1 - y0 < min_h and x1 - x0 >= 100:  # faixa fina e larga = pedaco da sombra do chao do retrato: nao e quadro
            continue
        comps.append({'id': i + 1, 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'labels': [i + 1]})
    big = [c for c in comps if not (((c['x1'] - c['x0']) * (c['y1'] - c['y0']) < 14000) and (c['x1'] - c['x0']) < 100)]
    small = [c for c in comps if c not in big]
    for sc in small:
        cx, cy = (sc['x0'] + sc['x1']) / 2, (sc['y0'] + sc['y1']) / 2
        best = min(big, key=lambda b: np.hypot(cx - (b['x0'] + b['x1']) / 2, cy - (b['y0'] + b['y1']) / 2))
        best['labels'] += sc['labels']
        best['x0'], best['y0'] = min(best['x0'], sc['x0']), min(best['y0'], sc['y0'])
        best['x1'], best['y1'] = max(best['x1'], sc['x1']), max(best['y1'], sc['y1'])
    return big, lab


def rows_of(comps, layout):
    b0, b1, b2 = BANDS.get(layout, BANDS['std'])
    rows = [[], [], [], []]
    for c in comps:
        cy = (c['y0'] + c['y1']) / 2
        rows[0 if cy < b0 else 1 if cy < b1 else 2 if cy < b2 else 3].append(c)
    for r in rows:
        r.sort(key=lambda c: c['x0'])
    return rows


def assign(name, layout, rows, cfg=None):
    """-> {pose: comp}. Para se a contagem de quadros de alguma linha nao bate com o modelo."""
    def need(i, n):
        if len(rows[i]) != n:
            raise SystemExit(f'{name}: a linha {i} da folha tem {len(rows[i])} quadros, o modelo "{layout}" espera {n}.')
    r0, r1, r2, r3 = rows
    need(0, 6)
    # a linha 0 = retrato (o maior) + 5 passos
    por = max(r0, key=lambda c: (c['x1'] - c['x0']) * (c['y1'] - c['y0']))
    walks = [c for c in r0 if c is not por]
    out = {'portrait': por}
    for i, c in enumerate(walks):
        out[f'walk{i + 1}'] = c
    if layout in ('newA', 'newB'):
        # linha 1 = guarda, guarda 2 (soco curto), conjurar, conjurar + explosao (investida); linha 2 = aura, ..., rastro, ...;
        # linha 3 = expressoes + nocaute. idle = o retrato parado (maior quadro da linha 0), ver build().
        if len(r1) == 5:  # a explosao da investida veio solta: junta no quadro anterior (a investida inclui a explosao)
            a, b = r1[3], r1[4]
            a['labels'] += b['labels']
            a['x0'], a['y0'], a['x1'], a['y1'] = min(a['x0'], b['x0']), min(a['y0'], b['y0']), max(a['x1'], b['x1']), max(a['y1'], b['y1'])
            r1 = r1[:4]
            rows[1] = r1
        need(1, 4); need(2, 5)
        out.update(guard=r1[0], flash=r1[1], strong=r1[2], dash=r1[3], idle=por)
        out.update(charge=r2[0], ult=r2[2], cast=r2[3])
        if layout == 'newB':
            need(3, 5)
            out.update(orb=r2[1], hurt=r2[4])
            out.update(exp1=r3[0], exp2=r3[1], exp3=r3[2], exp4=r3[3], ko=r3[4])
        else:
            n3 = len(r3)
            if n3 not in (4, 5):
                raise SystemExit(f'{name}: a linha 3 tem {n3} quadros (esperado 4 ou 5).')
            for i, c in enumerate(r3[:-1]):
                out[f'exp{i + 1}'] = c
            out['ko'] = r3[-1]
            out['hurt'] = r3[(cfg or {}).get('hurt', 0)]
    elif layout == 'std':
        need(1, 4); need(2, 5); need(3, 5)
        out.update(guard=r1[0], flash=r1[1], strong=r1[2], dash=r1[3], idle=por)
        out.update(charge=r2[0], orb=r2[1], ult=r2[2], cast=r2[3], hurt=r2[4])
        out.update(exp1=r3[0], exp2=r3[1], exp3=r3[2], exp4=r3[3], ko=r3[4])
    elif layout == 'soldier':
        need(1, 5); need(2, 5); need(3, 6)
        out.update(guard=r1[0], idle=por, flash=r1[1], strong=r1[2], dash=r1[3], charge=r1[4])
        out.update(burst=r2[0], orb=r2[1], ult=r2[2], cast=r2[3], hurt=r2[4])
        out.update(exp1=r3[0], exp2=r3[1], exp3=r3[2], exp4=r3[3], ko=r3[5])
    elif layout == 'orc2':
        # 2a folha do orc: linha 1 = agachado, agachado 2, golpe com arco, agachado 3, deslize com arco; linha 2 = explosao de pedras,
        # aneis girando, investida com poeira, corrida com arco pequeno, soco com arco grande; linha 3 = 4 giros com arco + nocaute
        need(1, 5); need(2, 5); need(3, 5)
        out.update(guard=r1[0], exp1=r1[1], exp2=r1[2], exp3=r1[3], dash2=r1[4], idle=por)
        out.update(charge=r2[0], cast=r2[1], dash=r2[2], flash=r2[3], strong=r2[4], exp4=r3[0], ko=r3[4])
    elif layout == 'dragon':
        # folha dos dragoes: linha 0 = retrato + 5 voos (NAO usados: o voo vem dos sprites antigos); linha 1 = 4 poses de voo + sopro grande;
        # linha 2 = aura, redemoinho, rastro, investida, sopro com clarao; linha 3 = 4 poses em voo + nocaute
        # (no Dragao Sombrio o quadro 5 da linha 1 e so a bola de fogo, sem corpo: vem junto do quadro 4 = dragao soprando = soco longo)
        if len(r1) not in (4, 5):
            raise SystemExit(f'{name}: a linha 1 tem {len(r1)} quadros (esperado 4 ou 5).')
        need(2, 5); need(3, 5)
        out.update(guard=r1[0], exp4=r1[1], flash=r1[2], strong=r1[-1], idle=por)
        if len(r1) == 5:
            out['dash2'] = r1[3]
        out.update(charge=r2[0], cast=r2[1], dash=r2[2], blast=r2[4])
        if len(r1) == 4:
            out['dash2'] = r2[3]
        out.update(hurt=r3[0], exp1=r3[1], exp2=r3[2], exp3=r3[3], ko=r3[4])
    elif layout == 'orc':
        need(1, 4); need(2, 5); need(3, 4)
        out.update(front=r1[0], back=r1[1], flash=r1[2], cast=r1[2], strong=r1[3], dash=r1[3])
        out.update(burst=r2[0], orb=r2[1], ult=r2[2], hurt=r2[3], ko=r2[4])
        out.update(face1=r3[0], face2=r3[1], face3=r3[2], face4=r3[3])
        out['idle'] = por  # o orc nao traz quadro de guarda: o retrato (reduzido) e o idle
    return out


# ----------------------------------------------------------------------------- recorte


def key_pixels(rgb, region, additive, dark=False):
    """RGBA do recorte: corpo = mascara dura preenchida (contorno escuro incluso); luz = alfa pelo brilho."""
    p = rgb.astype(np.float32)
    s = p.sum(2)
    mx = p.max(2)
    add_a = np.clip((mx - 60) / 110.0, 0, 1)
    if additive:
        a = add_a
        col = np.clip(p / np.maximum(a, 0.08)[..., None], 0, 255)
        out = np.dstack([col, a * 255]).astype(np.uint8)
        out[a < 0.04] = 0
        out[~region] = 0
        return out
    hard = (s > (46 if dark else 120)) & region
    # sombra do chao (roxa escura, azul >= vermelho) fica de fora; o contorno preto do desenho continua
    shadow = (p[..., 2] >= p[..., 0]) & (mx <= 60) & (s > 40)
    if dark:
        # personagem escuro: o corpo tem a mesma cor da sombra, entao so tiro a sombra da faixa dos pes (12% de baixo)
        rows = np.arange(s.shape[0])[:, None] > 0.88 * s.shape[0]
        shadow &= rows
    near = ndi.binary_dilation(hard, iterations=3) & (s > 12) & region & ~shadow
    body = ndi.binary_fill_holes(ndi.binary_closing(hard | near, iterations=1)) & region
    a = np.where(body, 1.0, add_a)
    col = np.where(body[..., None], p, np.clip(p / np.maximum(add_a, 0.08)[..., None], 0, 255))
    out = np.dstack([col, a * 255]).astype(np.uint8)
    out[(a < 0.04)] = 0
    out[~region] = 0
    return out


def trim(a):
    ys, xs = np.where(a[..., 3] > 20)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], xs.min(), ys.min()


def feet_cx(a):
    """centro do corpo = o maior bloco solido na faixa dos pes (rastros e poeira ficam de fora)."""
    h = a.shape[0]
    band = a[int(h * 0.86):, :, 3] > 200
    cols = np.where(band.any(0))[0]
    if len(cols) == 0:
        return a.shape[1] / 2.0
    groups, start, prev = [], cols[0], cols[0]
    for c in cols[1:]:
        if c - prev > 14:
            groups.append((start, prev)); start = c
        prev = c
    groups.append((start, prev))
    g = max(groups, key=lambda g: (band[:, g[0]:g[1] + 1]).sum())
    return (g[0] + g[1]) / 2.0


def cut(rgb, lab, comp, additive, dark=False):
    region = np.isin(lab, comp['labels'])
    region = ndi.binary_dilation(region, iterations=2)
    sub = (slice(comp['y0'], comp['y1']), slice(comp['x0'], comp['x1']))
    a = key_pixels(rgb[sub], region[sub], additive, dark)
    # tira poeira solta: so fica o maior pedaco e o que encosta nele
    m = a[..., 3] > 30
    l2, n = ndi.label(ndi.binary_dilation(m, iterations=5))
    if n > 1:
        sizes = ndi.sum(m, l2, range(1, n + 1))
        keep = [i + 1 for i, sz in enumerate(sizes) if sz > 0.04 * sizes.max()]
        a[~np.isin(l2, keep)] = 0
    a, _, _ = trim(a)
    return a


def nn_resize(a, w, h):
    return np.array(Image.fromarray(a).resize((max(1, int(round(w))), max(1, int(round(h)))), Image.LANCZOS))


def add_supplement(name, raw, spec, log):
    """Pecas que a folha nova nao traz vem da folha ANTIGA do mesmo personagem (mesma arte, outro recorte), reescaladas para o
    tamanho do corpo dos quadros novos (razao entre a altura media do andar novo e a do andar antigo)."""
    sname, poses = spec
    layout = 'orc'
    rgb = np.array(Image.open(os.path.join(SHEETS, f'{sname}.png')).convert('RGB'))
    comps, lab = segment(rgb)
    slots = assign(sname, layout, rows_of(comps, layout))
    old_walk = np.mean([cut(rgb, lab, slots[f'walk{i}'], False).shape[0] for i in range(1, 6)])
    new_walk = np.mean([raw[f'walk{i}'].shape[0] for i in range(1, 6)])
    ratio = new_walk / old_walk
    for pose in poses:
        if pose in raw or pose not in slots:
            continue
        a = cut(rgb, lab, slots[pose], pose in ADDITIVE)
        raw[pose] = nn_resize(a, a.shape[1] * ratio, a.shape[0] * ratio)
    log.append(f'{name}: pecas da folha antiga {sorted(p for p in poses if p in raw)} (escala x{ratio:.2f})')


def up_pixelart(a, k):
    """amplia pixel-art por k (nao inteiro): primeiro por um inteiro com vizinho mais proximo (mantem o pixel nitido), depois ajusta."""
    n = int(np.ceil(k))
    big = np.array(Image.fromarray(a).resize((a.shape[1] * n, a.shape[0] * n), Image.NEAREST))
    return nn_resize(big, a.shape[1] * k, a.shape[0] * k)


def legacy_flight(key, raw, log):
    """Dragoes: a folha nova nao traz um bom voo. idle/andar (e o projetil do ultimate) vem dos sprites ANTIGOS
    (assets/legacy-sprites/<dragao>/), ampliados ate o tamanho do dragao dos quadros novos (largura mediana dos 5 voos da folha)."""
    legacy_dir = os.path.join(ROOT, 'assets', 'legacy-sprites', key)
    ref_w = float(np.median([raw[f'walk{i}'].shape[1] for i in range(1, 6)]))
    legs = {}
    for p in LEGACY_FLIGHT[key]:
        a = np.array(Image.open(os.path.join(legacy_dir, f'{p}.png')).convert('RGBA'))
        legs[p] = trim(a)[0] if p != 'ult' else a
    body = [p for p in legs if p != 'ult']
    k = ref_w / float(np.median([legs[p].shape[1] for p in body]))
    for i in range(1, 6):  # os voos novos NAO entram no jogo
        raw.pop(f'walk{i}', None)
    for p in body:
        raw[p] = up_pixelart(legs[p], k)
    if 'ult' in legs:
        raw['ult'] = legs['ult']
    log.append(f'{key}: voo (idle, walk1-3) e ult dos sprites antigos, ampliados x{k:.2f}')


def build(name, key, layout, log):
    sheet = SHEET_FILE.get(name, name)
    path = os.path.join(SHEETS, f'{sheet}.png')
    rgb = np.array(Image.open(path).convert('RGB'))
    cfg = SHEET_CFG.get(name, {})
    comps, lab = segment_new(rgb, cfg.get('hints', []), cfg.get('min_h', 30)) if layout.startswith('new') or layout in ('orc2', 'dragon') else segment(rgb)
    rows = rows_of(comps, layout)
    slots = assign(name, layout, rows, cfg)
    raw = {}
    for pose, comp in slots.items():
        raw[pose] = cut(rgb, lab, comp, pose in ADDITIVE, cfg.get('dark', False))
    if name in SUPPLEMENT:
        add_supplement(name, raw, SUPPLEMENT[name], log)
    if layout == 'dragon':
        legacy_flight(key, raw, log)
    # idle = o retrato PARADO (de frente), reduzido para a escala dos passos (a guarda continua sendo o quadro `guard`)
    if layout != 'dragon':
        wh = np.mean([raw[f'walk{i}'].shape[0] for i in range(1, 6)])
        s = wh * 1.08 / raw['idle'].shape[0]
        raw['idle'] = nn_resize(raw['idle'], raw['idle'].shape[1] * s, raw['idle'].shape[0] * s)
    cx = {p: (feet_cx(a) if p not in ('ko', 'portrait') and p not in ADDITIVE else a.shape[1] / 2.0) for p, a in raw.items()}
    idle_h = raw['idle'].shape[0]
    core_h = [raw[p].shape[0] for p in CORE if p in raw]
    H0 = int(round(min(max(core_h), idle_h * MAX_RATIO)))
    os.makedirs(os.path.join(OUT, key), exist_ok=True)
    meta = {}
    f_scale = png_opt.scale_for(H0)  # fator unico do personagem (ver png_opt.py)
    for pose, a in raw.items():
        c = cx[pose]
        if pose in BODY:
            if a.shape[0] > H0:  # mais alto que o permitido: reduz inteiro (mantem proporcao)
                s = H0 / a.shape[0]
                a = nn_resize(a, a.shape[1] * s, H0)
                c *= s
            a = np.pad(a, ((H0 - a.shape[0], 0), (0, 0), (0, 0)))
            half = int(np.ceil(max(c, a.shape[1] - c)))
            left = half - int(round(c))
            canvas = np.zeros((H0, 2 * half, 4), np.uint8)
            canvas[:, left:left + a.shape[1]] = a[:, :min(a.shape[1], 2 * half - left)]
            a = canvas
        fw, fh = png_opt.save(a, os.path.join(OUT, key, f'{pose}.png'), f_scale)
        meta[pose] = {'w': int(fw), 'h': int(fh), 'tipo': 'corpo' if pose in BODY else 'efeito' if pose in ADDITIVE else 'solto'}
    # extras de apoio ao jogo: quadros sem equivalente na folha ficam por fallback no motor (ver sprites.ts: resolvePose)
    origem = {
        'folha': f'tools/art_src/sheets/{name}.png',
        'layout': layout,
        'altura_corpo_px': int(round(H0 * f_scale)),
        'altura_corpo_original_px': H0,
        'reducao': round(f_scale, 3),
        'poses': meta,
        'notas': NOTES.get(layout, ''),
    }
    with open(os.path.join(OUT, key, 'ORIGEM.json'), 'w') as f:
        json.dump(origem, f, ensure_ascii=False, indent=1)
    log.append(f'{name}: {len(meta)} quadros, altura do corpo {H0}px (x{f_scale:.2f})')
    return meta


NOTES = {
    'newA': 'idle = retrato parado; guard = guarda; flash = guarda 2 (soco curto); strong = conjurar; dash = conjurar + explosao; charge = aura; cast = bola na mao; ult = rastro (efeito do ultimate); hurt = quadro com marcas de impacto (linha 3); exp1-4 = poses; ko = nocaute.',
    'newB': 'idle = retrato parado; guard = guarda; flash = guarda 2; strong = conjurar; dash = conjurar + explosao; charge = aura; orb = bola/circulo; ult = rastro; cast = bola na mao; hurt = levando golpe; exp1-4 = poses; ko = nocaute.',
    'std': 'idle = retrato parado (reduzido para a escala dos passos); guard = guarda; flash = soco curto; strong = soco longo; dash = investida com explosao; charge = aura; cast = pose da bola de energia (ultimate); ult = rastro (efeito do ultimate); orb = bola; exp1-4 = expressoes; ko = nocaute.',
    'soldier': 'idle = retrato parado; guard = guarda; flash = jab; strong = soco longo; dash = recuo/investida; charge = carregando a bola; cast = pose da bola de gelo (ultimate); ult = rastro; burst = explosao de gelo; exp1-4 = agachados; ko = nocaute.',
    'orc': 'idle = retrato parado reduzido (a folha nao traz guarda); flash/cast = agachado; strong/dash = golpe com arco; ult = rastro; orb/burst = bolas; front/back = vistas de frente/costas; face1-4 = rostos; ko = nocaute.',
    'orc2': 'idle = retrato parado reduzido; guard = agachado; flash = corrida com arco pequeno; strong = soco com arco grande; dash = investida com poeira; charge = explosao de pedras; cast = aneis girando; dash2 = deslize com arco; exp1-4 = poses; ko = nocaute. Pecas que a 2a folha nao traz (hurt, front, back, orb, burst, ult, face1-4) vem da 1a folha (tools/art_src/sheets/orc.png), reescaladas.',
    'dragon': 'idle/walk1-3/ult = sprites ANTIGOS do dragao (voo; a folha nova nao traz um voo bom), ampliados ate o tamanho dos quadros novos; guard = voo em guarda; flash = voo/sopro curto; strong = sopro/investida grande; dash/dash2 = investida; charge = aura; cast = redemoinho (ultimate); blast = clarao; hurt = recuo; exp1-4 = poses; ko = nocaute; portrait = retrato.',
}


# ----------------------------------------------------------------------------- codigo gerado


def emit_ts(all_meta):
    order = list(CHARS.values())
    lines = [
        '// GERADO por tools/import_sheets.py - nao edite a mao. Quadros recortados das folhas novas (assets/sprites-v2).',
        "import type { CharacterKey } from './Fighter';",
        '',
        'export const SOURCES_V2: Partial<Record<CharacterKey, Record<string, number>>> = {',
    ]
    for key, _ in order:
        if key not in all_meta:
            continue
        lines.append(f'  {key}: {{')
        for pose in all_meta[key]:
            lines.append(f"    {pose}: require('../../../assets/sprites-v2/{key}/{pose}.png'),")
        lines.append('  },')
    lines += ['};', '', '// largura/altura de cada quadro, medidas nos PNG gerados.', 'export const ASPECTS_V2: Partial<Record<CharacterKey, Record<string, number>>> = {']
    for key, _ in order:
        if key not in all_meta:
            continue
        lines.append(f'  {key}: {{')
        for pose, m in all_meta[key].items():
            lines.append(f"    {pose}: {m['w']} / {m['h']},")
        lines.append('  },')
    lines.append('};')
    lines.append('')
    with open(TS_OUT, 'w') as f:
        f.write('\n'.join(lines))


def main():
    names = sys.argv[1:] or [n for n in CHARS if os.path.exists(os.path.join(SHEETS, f'{n}.png'))]
    log, all_meta = [], {}
    # mantem o que ja foi importado de outros personagens (reimportar um so nao apaga os outros)
    for n, (key, layout) in CHARS.items():
        mp = os.path.join(OUT, key, 'ORIGEM.json')
        if n not in names and os.path.exists(mp):
            all_meta[key] = {p: {'w': m['w'], 'h': m['h']} for p, m in json.load(open(mp))['poses'].items()}
    for n in names:
        key, layout = CHARS[n]
        all_meta[key] = build(n, key, layout, log)
    os.makedirs(OUT, exist_ok=True)
    act = os.path.join(OUT, 'ACTIVE.json')
    if not os.path.exists(act):
        with open(act, 'w') as f:
            json.dump({'_aviso': 'Liga/desliga os sprites novos por personagem. false = volta ao desenho antigo (assets/legacy-sprites).', **{k: True for k in all_meta}}, f, ensure_ascii=False, indent=1)
    else:  # personagem novo na pasta entra desligado? nao: entra ligado, mas nunca religa um que o dono desligou
        cur = json.load(open(act))
        for k in all_meta:
            cur.setdefault(k, True)
        with open(act, 'w') as f:
            json.dump(cur, f, ensure_ascii=False, indent=1)
    emit_ts({k: dict(sorted(v.items(), key=lambda kv: kv[0])) for k, v in all_meta.items()})
    print('\n'.join(log))


if __name__ == '__main__':
    main()
