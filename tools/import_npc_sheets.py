"""Importa as FOLHAS DE ANDAR dos NPCs (tools/art_src/npc_sheets/npc_sheet_N.jpg) para assets/npc-walk/.

Formato das folhas (estilo RPG Maker): 4 personagens por linha x 2 linhas por folha = 8 personagens; cada personagem ocupa
96 x 192 px = 3 colunas de 32 px (passo A, PARADO, passo B) x 4 linhas de 48 px (frente, esquerda, direita, costas).
A folha 3 veio em 236 x 236 (menor que as outras, 384 x 384): e ampliada para 384 antes do recorte e fica mais borrada.

Fundo branco do JPG -> transparente (inundacao a partir das bordas + tira o contorno claro que o JPG deixa). Nada e
desenhado: so recorte. Os originais ficam intactos em tools/art_src/npc_sheets/.

Gera:  assets/npc-walk/w<folha>_<n>.png   (1 por personagem: 3x4 quadros, ampliado 4x vizinho-mais-proximo, paleta 256)
       assets/npc-walk/MAP.json           (NPC antigo -> personagem animado; edite aqui para trocar quem anda como quem)
       src/game/world/npcWalk.ts          (GERADO)
Uso:   python3 tools/import_npc_sheets.py
Troca de arte: coloque a folha nova com o mesmo nome em tools/art_src/npc_sheets/ e rode de novo (MAP.json e mantido).
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import png_opt  # noqa: E402

SRC = os.path.join(ROOT, 'tools', 'art_src', 'npc_sheets')
OUT = os.path.join(ROOT, 'assets', 'npc-walk')
TS_OUT = os.path.join(ROOT, 'src', 'game', 'world', 'npcWalk.ts')
FW, FH = 32, 48
UP = 4
# folha 4 = os 8 NPCs c08..c15 do pacote antigo (conferido comparando o quadro de frente; os demais NPCs, c00-c07 e c16-c23,
# nao estao nestas folhas). As folhas 1, 2 e 3 sao personagens NOVOS ainda sem NPC no jogo.
DEFAULT_MAP = {f'c{8 + i:02d}': f'w4_{i}' for i in range(8)}


def key_sheet(im, fringe):
    a = np.array(im.convert('RGB')).astype(int)
    near = a.min(2) > 232
    lab, _ = ndi.label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    # contorno claro do JPG: pixels bem claros encostados no fundo viram fundo tambem
    for _ in range(fringe):
        edge = ndi.binary_dilation(bg) & ~bg & (a.min(2) > 205)
        bg = bg | edge
    return np.dstack([a, (~bg) * 255]).astype(np.uint8)


def main():
    os.makedirs(OUT, exist_ok=True)
    mp = os.path.join(OUT, 'MAP.json')
    mapping = json.load(open(mp)) if os.path.exists(mp) else dict(DEFAULT_MAP)
    ids, log = [], []
    for si in range(1, 5):
        path = os.path.join(SRC, f'npc_sheet_{si}.jpg')
        if not os.path.exists(path):
            continue
        im = Image.open(path).convert('RGB')
        native = im.size
        fringe = 1
        if im.size != (384, 384):
            im = im.resize((384, 384), Image.LANCZOS)
            fringe = 2
        sheet = key_sheet(im, fringe)
        for n in range(8):
            r, c = divmod(n, 4)
            cell = sheet[r * 192:(r + 1) * 192, c * 96:(c + 1) * 96]
            big = np.array(Image.fromarray(cell).resize((96 * UP, 192 * UP), Image.NEAREST))
            png_opt.save(big, os.path.join(OUT, f'w{si}_{n}.png'))
            ids.append(f'w{si}_{n}')
        log.append(f'folha {si}: {native[0]}x{native[1]} -> 8 personagens')
    with open(mp, 'w') as f:
        json.dump(mapping, f, ensure_ascii=False, indent=1)
    lines = [
        '// GERADO por tools/import_npc_sheets.py - nao edite a mao (o mapa NPC -> personagem animado fica em assets/npc-walk/MAP.json).',
        '/**',
        ' * Folhas de ANDAR dos NPCs: cada personagem e uma imagem com 3 colunas (passo A, parado, passo B) x 4 linhas',
        ' * (frente, esquerda, direita, costas); cada quadro = 32 x 48 px da arte original, ampliado 4x.',
        ' */',
        f'export const NPC_WALK_FRAME = {{ w: {FW}, h: {FH}, scale: {UP} }};',
        '',
        'export const NPC_WALK_SHEETS: Record<string, number> = {',
    ]
    for i in ids:
        lines.append(f"  {i}: require('../../../assets/npc-walk/{i}.png'),")
    lines += ['};', '', '/** NPC do pacote antigo (npcs.ts: sheetChar) -> personagem animado. */', 'export const NPC_WALK_FOR: Record<string, string> = {']
    for k, v in mapping.items():
        lines.append(f"  {k}: '{v}',")
    lines += ['};', '']
    open(TS_OUT, 'w').write('\n'.join(lines))
    print('\n'.join(log), f'| {len(ids)} personagens, {len(mapping)} NPCs ligados')


if __name__ == '__main__':
    main()
