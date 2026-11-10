#!/usr/bin/env python3
"""Gera os ICONES DE PERFIL (busto: cara, pescoco e um pouco abaixo do pescoco) de todos os memes do jogo.

Nada de arte nova: cada icone e um RECORTE da arte que o jogo ja tem (idle dos lutadores, folhas dos NPCs, memes do cassino,
parentes, retratos antigos). A tabela SPECS diz de onde recortar (fracoes da caixa opaca da imagem: x0,y0,x1,y1) - para ajustar
o enquadramento de um icone basta mudar a fracao e rodar de novo. Saidas:
  assets/avatars/<id>.png                 (160x160, paleta de 256 cores, busto alinhado embaixo)
  src/game/account/avatarArt.ts           (id -> require, gerado)
  src/game/account/avatarList.ts          (id, nome, tipo, preco: dados puros, gerado)
Uso:  python3 tools/make_avatars.py [--sheet caminho.png]   (o --sheet salva uma folha de contato para conferir os recortes)
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'avatars')
SIZE = 160

def fighter_src(k):
    return f'assets/sprites-v2/{k}/idle.png'

# (id, nome, tipo, origem, recorte (x0,y0,x1,y1), preco)
# tipo: fighter = jogavel (precisa estar liberado para comprar, exceto os gratis) | npc = amigavel/meme nao jogavel (compra direto)
F = lambda k, name, crop, price=0: (k, name, 'fighter', fighter_src(k), crop, price)
SPECS = [
    F('dogge', 'Dogge', (0.30, 0.0, 1.0, 0.40)),
    F('gadigago', 'Gadigago', (0.0, 0.0, 1.0, 0.50)),
    F('orc', 'Orc', (0.0, 0.0, 1.0, 0.40), 25),
    F('soldier', 'Soldado', (0.0, 0.0, 1.0, 0.40), 25),
    F('dogking', 'Dog King', (0.0, 0.0, 1.0, 0.40), 30),
    F('tank', 'Tank', (0.0, 0.0, 1.0, 0.36), 25),
    F('ninja', 'Ninja', (0.0, 0.0, 1.0, 0.55), 30),
    F('mystic', 'Místico', (0.0, 0.0, 1.0, 0.40), 30),
    F('green_dragon', 'Dragão da Floresta', (0.55, 0.0, 1.0, 0.75), 30),
    F('ice_dragon', 'Dragão do Gelo', (0.5, 0.0, 1.0, 0.65), 30),
    F('shadow_dragon', 'Dragão Sombrio', (0.68, 0.0, 1.0, 0.6), 35),
    F('troll_face', 'Troll Face', (0.0, 0.0, 1.0, 0.40), 25),
    F('cara_tranquilo', 'Cara Tranquilo', (0.0, 0.0, 1.0, 0.40), 25),
    F('sahur', 'Sahur', (0.0, 0.0, 1.0, 0.40), 25),
    F('sahur_god', 'Sahur God', (0.16, 0.0, 0.92, 0.40), 40),
    F('sahur_evil', 'Sahur Evil', (0.22, 0.0, 0.98, 0.40), 40),
]
def N(i, name, src, crop, price): return ('npc_' + i, name, 'npc', src, crop, price)
CH = lambda c: f'assets/npcs/{c}.png'
CHIBI = (0.0, 0.0, 1.0, 0.62)   # folha 1 (c00-c07): cabecao, ~metade do corpo
TALL = (0.0, 0.0, 1.0, 0.50)    # folhas 2/3: cabeca ocupa ~1/3, busto vai ate o peito
SPECS += [
    N('bento', 'Vovô Bento', CH('c08'), TALL, 8), N('marina', 'Marina', CH('c11'), TALL, 8), N('croupier', 'Crupiê Misterioso', CH('c20'), TALL, 12),
    N('maximilian', 'Maximilian', CH('c18'), TALL, 8), N('iracema', 'Dona Iracema', CH('c09'), TALL, 8), N('zeca', 'Zeca', CH('c10'), TALL, 8),
    N('barqueiro', 'Barqueiro', CH('c13'), TALL, 8), N('mercador_gelo', 'Pedro Gélido', CH('c21'), TALL, 8), N('iara', 'Iara', CH('c17'), TALL, 8),
    N('brasa', 'Brasa', CH('c06'), CHIBI, 10), N('rocha', 'Rocha', CH('c04'), CHIBI, 10), N('guardiao_pedra', 'Guardião de Pedra', CH('c05'), CHIBI, 10),
    N('npc_padrao', 'NPC Padrão', CH('c14'), TALL, 8), N('garoto_sombrio', 'Breno das Trevas', CH('c03'), CHIBI, 10), N('turista', 'Turista Perdido', CH('c12'), TALL, 8),
    N('toinho', 'Toinho', CH('c22'), TALL, 8), N('mercador_noturno', 'Mercador da Madrugada', CH('c16'), TALL, 8), N('cantora_chuva', 'Dona Garoa', CH('c19'), TALL, 8),
    N('pipoca', 'Pipoca', CH('c15'), TALL, 8), N('mestre_guilda', 'Mestre Gaspar', CH('c01'), CHIBI, 10), N('eremita', 'Eremita Tobias', CH('c07'), CHIBI, 10),
    N('madame_dourada', 'Madame Dourada', CH('c23'), TALL, 12),
    N('silvana', 'Silvana', 'assets/npc-portraits/hood.png', (0.0, 0.0, 1.0, 0.55), 12),
    N('tico', 'Irmão Tico', 'assets/npc-portraits/monk.png', (0.0, 0.0, 1.0, 0.60), 12),
    N('moai', 'Sigma Boy', 'assets/npc-portraits/moai.png', (0.0, 0.0, 1.0, 0.92), 20),
    N('footman', 'Footman', 'assets/npc-portraits/footman.png', (0.0, 0.0, 1.0, 0.40), 12),
    N('tank_dog', 'Tank Cão', 'assets/npc-portraits/tank_dog.png', (0.0, 0.0, 1.0, 0.40), 12),
    N('espinho', 'Espinho Parente', 'assets/npc-portraits/meme-kin/espinho.png', (0.0, 0.0, 1.0, 0.75), 12),
    N('violeta', 'Violeta Parente', 'assets/npc-portraits/meme-kin/violeta.png', (0.0, 0.0, 1.0, 0.75), 12),
    N('gemada', 'Gemada Parente', 'assets/npc-portraits/meme-kin/gemada.png', (0.0, 0.0, 1.0, 0.80), 12),
    N('polen', 'Pólen Parente', 'assets/npc-portraits/meme-kin/polen.png', (0.0, 0.0, 1.0, 0.75), 12),
    N('penumbra', 'Penumbra Parente', 'assets/npc-portraits/meme-kin/penumbra.png', (0.0, 0.0, 1.0, 0.75), 12),
    N('azulao', 'Azulão', 'assets/npcs/meme_azulao.png', (0.0, 0.0, 1.0, 0.90), 15),
    N('vermelhao', 'Vermelhão', 'assets/npcs/meme_vermelhao.png', (0.0, 0.0, 1.0, 0.90), 15),
    N('rei_dourado', 'Rei Dourado', 'assets/npcs/meme_rei_dourado.png', (0.0, 0.0, 1.0, 0.90), 25),
    N('corvao', 'Corvão', 'assets/npcs/meme_corvao.png', (0.0, 0.0, 1.0, 0.95), 15),
    N('gato_arco_iris', 'Gato Arco-Íris', 'assets/npcs/meme_gato_arco_iris.png', (0.0, 0.0, 1.0, 1.0), 20),
    N('gato_bocao', 'Gato Bocão', 'assets/npcs/meme_gato_bocao.png', (0.0, 0.0, 1.0, 0.72), 20),
    N('shiba_manso', 'Shiba Manso', 'assets/npcs/meme_shiba_manso.png', (0.0, 0.0, 1.0, 0.55), 15),
    N('bebe_risonho', 'Bebê Risonho', 'assets/npcs/meme_bebe_risonho.png', (0.0, 0.0, 1.0, 0.78), 20),
    N('seis_sete', 'Seis-Sete', 'assets/npcs/meme_seis_sete.png', (0.0, 0.0, 1.0, 0.52), 20),
]


# Ajustes finos por icone (alem do recorte): close = raio (px) do fechamento morfologico que tapa buracos abertos na silhueta
# (ex.: o focinho "vazado" do Cara Tranquilo). Todo icone tambem tem os buracos fechados e os pixels soltos removidos.
FIX = {'npc_moai': {}, 'cara_tranquilo': {'close': 16, 'fill': (172, 93, 69)}, 'ninja': {'close': 12}}
ALPHA_MIN = 40      # abaixo disso o pixel e "poeira" quase invisivel (nao conta nem para a caixa nem para o desenho)
MIN_BLOB = 40       # pedacos menores que isso (pixels soltos fora do corpo) sao descartados


def solidify(im, close=0, fill=None):
    """Limpa o sprite: tira poeira/pixels soltos e preenche buracos transparentes DENTRO da silhueta (nariz, rosto),
    pintando o que foi preenchido com a cor do pixel opaco mais proximo (nada de cor nova inventada)."""
    a = np.array(im)
    mask = a[..., 3] >= ALPHA_MIN
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    if n:
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        keep = np.zeros(n + 1, bool)
        keep[1:] = sizes >= MIN_BLOB
        mask = keep[lab]
    solid = mask
    if close:
        pad = close + 2
        m = np.pad(mask, pad)
        yy, xx = np.ogrid[-close:close + 1, -close:close + 1]
        disk = (xx * xx + yy * yy) <= close * close
        m = ndimage.binary_closing(m, structure=disk)
        solid = m[pad:-pad, pad:-pad]
    solid = ndimage.binary_fill_holes(solid)
    new = solid & ~mask
    if new.any():
        _, (iy, ix) = ndimage.distance_transform_edt(~mask, return_indices=True)
        rgb = a[iy, ix, :3]
        a[new, :3] = rgb[new]
        if fill:
            a[new, :3] = fill
        # a borda semitransparente que contornava o buraco agora fica dentro do corpo: fica opaca (senao sobra um fio claro)
        edge = ndimage.binary_dilation(new, structure=np.ones((3, 3)), iterations=2) & mask
        a[edge, 3] = 255
    a[..., 3] = np.where(mask, a[..., 3], np.where(new, 255, 0))
    return Image.fromarray(a, 'RGBA')


FIXED_DIR = os.path.join(ROOT, 'tools', 'art_src', 'avatars_fixed')


def bust_fixed(path):
    """Icone JA PRONTO (arte corrigida entregue pelo dono, em tools/art_src/avatars_fixed/<id>.png): so encaixa no quadrado 160x160 encostado embaixo."""
    crop = Image.open(path).convert('RGBA')
    cb = crop.getbbox()
    if cb:
        crop = crop.crop(cb)
    cw, ch = crop.size
    margin = SIZE - 12
    sc = min(margin / cw, margin / ch)
    crop = crop.resize((max(1, round(cw * sc)), max(1, round(ch * sc))), Image.LANCZOS)
    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(crop, ((SIZE - crop.width) // 2, SIZE - crop.height), crop)
    return out


def bust(spec):
    _id, _name, _kind, src, (x0, y0, x1, y1), _price = spec
    fixed = os.path.join(FIXED_DIR, _id + '.png')
    if os.path.exists(fixed):
        return bust_fixed(fixed)
    im = solidify(Image.open(os.path.join(ROOT, src)).convert('RGBA'), FIX.get(_id, {}).get('close', 0), FIX.get(_id, {}).get('fill'))
    bx = im.getchannel('A').point(lambda a: 255 if a > 0 else 0).getbbox()
    l, t, r, b = bx
    w, h = r - l, b - t
    crop = im.crop((int(l + x0 * w), int(t + y0 * h), int(l + x1 * w) + 1, int(t + y1 * h) + 1))
    cb = crop.getbbox()
    if cb:
        crop = crop.crop(cb)
    cw, ch = crop.size
    margin = SIZE - 12
    sc = min(margin / cw, margin / ch)
    nw, nh = max(1, round(cw * sc)), max(1, round(ch * sc))
    # pixel art (recorte pequeno) cresce por vizinho mais proximo para continuar nitido; imagens grandes reduzem suave
    method = Image.NEAREST if (cw < 90 and ch < 90 and sc >= 1.5) else Image.LANCZOS
    crop = crop.resize((nw, nh), method)
    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(crop, ((SIZE - nw) // 2, SIZE - nh), crop)  # busto encostado embaixo: os ombros "assentam" no fundo do icone
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    sheet_path = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else None
    imgs = []
    for spec in SPECS:
        out = bust(spec)
        imgs.append((spec, out))
        q = out.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.NONE)
        q.save(os.path.join(OUT, spec[0] + '.png'), optimize=True)
    ids = [s[0] for s in SPECS]
    assert len(ids) == len(set(ids)), 'id repetido'
    art = ["/* GERADO por tools/make_avatars.py - não edite à mão. */", "/* eslint-disable @typescript-eslint/no-require-imports */",
           "/** Arte dos ícones de perfil: id -> imagem (busto 160x160). */", "export const AVATAR_ART: Record<string, number> = {"]
    for i in ids:
        art.append(f"  {i}: require('../../../assets/avatars/{i}.png'),")
    art += ["};", ""]
    open(os.path.join(ROOT, 'src/game/account/avatarArt.ts'), 'w').write('\n'.join(art))
    lst = ["/* GERADO por tools/make_avatars.py - não edite à mão. */", "/** Dados puros dos ícones de perfil (sem imagens, testável em Node). 'fighter' = jogável (precisa estar liberado); 'npc' = amigo/meme não jogável (compra direto). */",
           "export interface AvatarInfo { id: string; name: string; kind: 'fighter' | 'npc'; price: number }", "export const AVATARS: AvatarInfo[] = ["]
    for s in SPECS:
        lst.append(f"  {{ id: {json.dumps(s[0])}, name: {json.dumps(s[1], ensure_ascii=False)}, kind: '{s[2]}', price: {s[5]} }},")
    lst += ["];", "export const AVATAR_BY_ID: Record<string, AvatarInfo> = Object.fromEntries(AVATARS.map((a) => [a.id, a]));", ""]
    open(os.path.join(ROOT, 'src/game/account/avatarList.ts'), 'w').write('\n'.join(lst))
    if sheet_path:
        cols = 10
        cell = 120
        rows = (len(imgs) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * cell, rows * (cell + 14)), (70, 120, 170, 255))
        d = ImageDraw.Draw(sheet)
        for n, (spec, im) in enumerate(imgs):
            t = im.resize((cell - 6, cell - 6), Image.NEAREST)
            x, y = (n % cols) * cell, (n // cols) * (cell + 14)
            sheet.paste(t, (x + 3, y + 14), t)
            d.text((x + 3, y + 1), spec[0][:18], fill=(255, 255, 0, 255))
        sheet.save(sheet_path)
    print(len(SPECS), 'icones gerados')


if __name__ == '__main__':
    main()
