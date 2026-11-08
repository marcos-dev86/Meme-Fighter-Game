"""Otimizador de PNG dos sprites novos (usado por import_sheets.py, make_wear_v2.py e import_npc_sheets.py).

 - reduz a imagem por um fator (o MESMO para todos os quadros de um personagem, para as proporcoes continuarem iguais);
 - quantiza para 256 cores com alfa (sem dithering: pixel art nao gosta de ruido). Em media -80% de peso, erro de cor
   medio ~3/255, imperceptivel no jogo.
Para voltar ao PNG sem perdas, rode as ferramentas com a variavel de ambiente MF_NO_OPT=1.
"""
import os

import numpy as np
from PIL import Image

TARGET_BODY_H = 200  # altura do corpo (px) depois de reduzir: o jogo mostra o lutador a ~1x-1.5x, a maioria dos PNG tinha 205-266


def scale_for(body_h):
    """fator unico por personagem: nunca amplia, nunca passa de TARGET_BODY_H de altura de corpo."""
    if os.environ.get('MF_NO_OPT'):
        return 1.0
    return min(1.0, TARGET_BODY_H / float(body_h))


def optimize(im, scale=1.0):
    """PIL RGBA -> PIL 'P' (paleta com alfa), reduzido por `scale`."""
    im = im.convert('RGBA')
    if os.environ.get('MF_NO_OPT'):
        return im
    if scale < 0.999:
        im = im.resize((max(1, int(round(im.width * scale))), max(1, int(round(im.height * scale)))), Image.LANCZOS)
    return im.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.NONE)


def save(im_or_arr, path, scale=1.0):
    im = Image.fromarray(im_or_arr) if isinstance(im_or_arr, np.ndarray) else im_or_arr
    out = optimize(im, scale)
    out.save(path, optimize=True)
    return out.size  # (w, h) finais
