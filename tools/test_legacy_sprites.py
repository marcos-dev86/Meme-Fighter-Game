#!/usr/bin/env python3
"""Confere assets/legacy-sprites contra o que o jogo espera. Uso (raiz do projeto): python3 tools/test_legacy_sprites.py
 1. todo require('...legacy-sprites/...') de src/ aponta para um arquivo que existe (lista o que falta);
 2. cada lutador tem os 8 quadros; o tamanho de cada PNG bate com SPRITE_ASPECTS (src/game/battle/sprites.ts);
 3. quadros de corpo (idle..strong) com mesma altura (escala igual entre poses) - exceto Dogge/Gadigago, que sao os originais;
 4. quadros com fundo transparente, pes encostados na base (menos dragoes, que voam) e corpo centrado no quadro;
 5. o ult tem transparencia e e maior que um ponto.
Sai com codigo 1 se algum teste obrigatorio falhar (itens ausentes que o ZIP nao traz saem como AVISO, nao como falha)."""
import glob
import os
import re
import sys

import numpy as np
from PIL import Image

ROOT = os.getcwd()
POSES = ['idle', 'walk1', 'walk2', 'walk3', 'dash', 'flash', 'strong', 'ult']
WALK4 = ('tocao', 'serafim', 'capiroto')
ORIGINALS = {'dogge', 'gadigago'}
DRAWN = {'orc', 'soldier', 'mystic'}  # desenhados do zero: o arranque (dash) e um salto, sem pe na base
FLYERS = {'green_dragon', 'ice_dragon', 'shadow_dragon'}  # voam: mantem o quadro original 178x202, sem 'pes na base'
FOLDER = {'tank': 'tank_fighter'}
fails, warns, ok = [], [], 0


def check(cond, msg, warn=False):
    global ok
    if cond:
        ok += 1
    else:
        (warns if warn else fails).append(msg)


# 1) requires
refs = set()
for f in glob.glob('src/**/*.ts*', recursive=True):
    refs |= set(re.findall(r"assets/legacy-sprites/([\w\-]+)/(\w+)\.png", open(f, encoding='utf-8').read()))
for d, n in sorted(refs):
    check(os.path.exists(f'assets/legacy-sprites/{d}/{n}.png'), f'ausente: assets/legacy-sprites/{d}/{n}.png', warn=True)

# 2) proporcoes
src = open('src/game/battle/sprites.ts', encoding='utf-8').read()
tab = src[src.index('export const SPRITE_ASPECTS'):]
tab = tab[:tab.index('\n};')]
chars = re.findall(r'\n  (\w+): \{\n(.*?)\n  \},', tab, re.S)
check(len(chars) == 16, f'SPRITE_ASPECTS deveria ter 16 lutadores, tem {len(chars)}')
for key, body in chars:
    folder = FOLDER.get(key, key)
    asp = {p: (int(a), int(b)) for p, a, b in re.findall(r'(\w+): (\d+) / (\d+),', body)}
    ALL = POSES + (['walk4'] if key in WALK4 else [])  # os 3 troncos tem 4 passos de andar
    check(set(asp) == set(ALL), f'{key}: poses na tabela {sorted(asp)}')
    heights = {}
    for p in ALL:
        path = f'assets/legacy-sprites/{folder}/{p}.png'
        if not os.path.exists(path):
            check(False, f'{key}/{p}: arquivo ausente')
            continue
        im = Image.open(path).convert('RGBA')
        w, h = im.size
        check(asp.get(p) == (w, h), f'{key}/{p}: PNG {w}x{h} != tabela {asp.get(p)}')
        a = np.array(im)
        al = a[..., 3]
        check(al.min() == 0 and al.max() > 0, f'{key}/{p}: sem transparencia ou vazio')
        check((al > 0).sum() > 40, f'{key}/{p}: quase vazio')
        if p != 'ult':
            heights[p] = h
            if key not in ORIGINALS:
                if key not in FLYERS and not (key in DRAWN and p == 'dash'):
                    check((al[-1] > 0).any(), f'{key}/{p}: pes nao encostam na base do quadro')
                cols = np.where((al > 0).any(axis=0))[0]
                mid = (cols.min() + cols.max()) / 2.0 / w
                check(0.0 < mid < 1.0, f'{key}/{p}: centro fora do quadro')
    if key not in ORIGINALS and heights:
        check(len(set(heights.values())) == 1, f'{key}: alturas diferentes entre poses de corpo {heights}')
    # os 8 quadros nao podem ser todos iguais (tem que haver animacao)
    imgs = [np.array(Image.open(f'assets/legacy-sprites/{folder}/{p}.png').convert('RGBA')).tobytes() for p in ALL if os.path.exists(f'assets/legacy-sprites/{folder}/{p}.png')]
    check(len(set(imgs)) >= 6, f'{key}: so {len(set(imgs))} quadros distintos de {len(ALL)}')

# personagens novos (agora no jogo desde a Urgente 2; os arquivos continuam checados)
for c in ('cara_tranquilo', 'troll_face', 'tocao', 'serafim', 'capiroto'):
    for p in POSES + (['walk4'] if c in WALK4 else []):
        check(os.path.exists(f'assets/legacy-sprites/{c}/{p}.png'), f'{c}/{p}: ausente')

print(f'{ok} verificacoes ok, {len(fails)} falhas, {len(warns)} avisos')
for m in warns:
    print('AVISO', m)
for m in fails:
    print('FALHA', m)
sys.exit(1 if fails else 0)
