#!/usr/bin/env python3
"""Desenha os ICONES DAS CONQUISTAS: um pixel-art 16x16 proprio e unico para cada conquista (feito a mao, em codigo).

Cada icone e uma funcao pequena registrada com @icon('id_da_conquista') que desenha com formas simples (retangulo, elipse, linha,
poligono, pontos) numa tela 16x16 transparente, sem suavizacao. Depois de desenhar, o programa pinta um contorno escuro de 1 px ao
redor (por isso a arte fica entre as colunas/linhas 1 e 14). Saidas:
  assets/achievements/<id>.png         (16x16 RGBA)
  src/game/account/achievementArt.ts   (id -> require, gerado)
Uso:  python3 tools/make_achievement_icons.py [--sheet caminho.png]   (a folha de contato mostra todos ampliados para conferir)
Os modulos tools/ach/icons_*.py tem os desenhos; a lista de ids vem de src/game/account/achievementDefs.ts (um icone por id, sem sobrar nem faltar).
"""
import os
import re
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
OUT = os.path.join(ROOT, 'assets', 'achievements')
S = 16

from ach.kit import ICONS, OUTLINE, render  # noqa: E402
from ach import icons_a, icons_b, icons_c, icons_d  # noqa: E402,F401  (registram os desenhos)


def ids_from_defs():
    src = open(os.path.join(ROOT, 'src/game/account/achievementDefs.ts'), encoding='utf-8').read()
    ids = re.findall(r"^\s*A\('([a-z0-9_]+)'", src, re.M)
    gen = re.search(r"STORY_CLEAR_ROSTER", src)
    return ids


def main():
    ids = ids_from_defs()
    assert len(ids) == len(set(ids)), 'id repetido nas conquistas'
    missing = [i for i in ids if i not in ICONS]
    extra = [i for i in ICONS if i not in ids]
    assert not missing, f'conquistas sem icone: {missing}'
    assert not extra, f'icones sem conquista: {extra}'
    os.makedirs(OUT, exist_ok=True)
    imgs = []
    for i in ids:
        im = render(i)
        im.save(os.path.join(OUT, i + '.png'))
        imgs.append((i, im))
    art = ["/* GERADO por tools/make_achievement_icons.py - não edite à mão. */", "/* eslint-disable @typescript-eslint/no-require-imports */",
           "/** Arte das conquistas: id -> pixel-art 16x16 própria de cada uma. */", "export const ACHIEVEMENT_ART: Record<string, number> = {"]
    for i in ids:
        art.append(f"  {i}: require('../../../assets/achievements/{i}.png'),")
    art += ["};", ""]
    open(os.path.join(ROOT, 'src/game/account/achievementArt.ts'), 'w').write('\n'.join(art))
    if '--sheet' in sys.argv:
        path = sys.argv[sys.argv.index('--sheet') + 1]
        z, cols = 8, 10
        cell_w, cell_h = S * z + 8, S * z + 14
        rows = (len(imgs) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * cell_w, rows * cell_h), (88, 96, 140, 255))
        d = ImageDraw.Draw(sheet)
        for n, (i, im) in enumerate(imgs):
            big = im.resize((S * z, S * z), Image.NEAREST)
            x, y = (n % cols) * cell_w, (n // cols) * cell_h
            sheet.paste(big, (x + 4, y + 12), big)
            d.text((x + 3, y + 1), i[:20], fill=(255, 255, 0, 255))
        sheet.save(path)
    print(len(imgs), 'icones de conquista gerados')


if __name__ == '__main__':
    main()
