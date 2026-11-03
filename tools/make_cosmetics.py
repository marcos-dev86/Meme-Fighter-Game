"""Gera os ativos dos cosméticos (Parte 37).
  python3 tools/make_cosmetics.py            (rode na raiz do projeto)
 - assets/skins/<personagem>/<skin>/<pose>.png : sprites recoloridos por tonalidade (hue)
 - assets/icons/cape_violet.png, cape_gold.png : capas extras (troca de tonalidade das capas do pacote)
 - src/game/cosmetics/skinSources.ts            : registro estático dos sprites (require)
"""
import os, sys
import numpy as np
from PIL import Image

POSES = ['idle', 'walk1', 'walk2', 'walk3', 'dash', 'flash', 'strong', 'ult']
CHARS = ['dogge', 'gadigago']
# id da skin -> (deslocamento de tonalidade em graus, fator de saturação, fator de brilho)
SKINS = {
    'gelo': (165, 0.95, 1.05),
    'floresta': (75, 1.0, 0.98),
    'sombra': (262, 0.85, 0.72),
    'ouro': (9, 1.8, 1.12),
}

def shift(im, deg, sat, val):
    im = im.convert('RGBA')
    a = im.getchannel('A')
    hsv = np.array(im.convert('RGB').convert('HSV')).astype(np.float32)
    hsv[..., 0] = (hsv[..., 0] + deg / 360.0 * 255.0) % 255.0
    hsv[..., 1] = np.clip(hsv[..., 1] * sat, 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] * val, 0, 255)
    rgb = Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')
    out = rgb.convert('RGBA'); out.putalpha(a)
    return out

def main():
    root = os.getcwd()
    # capas extras
    for new, src, deg in [('cape_violet', 'cape_blue', 70), ('cape_gold', 'cape_red', 38)]:
        im = Image.open(f'{root}/assets/icons/{src}.png')
        shift(im, deg, 1.0, 1.1).save(f'{root}/assets/icons/{new}.png')
    lines = ["// GERADO por tools/make_cosmetics.py. Sprites de skin (recoloridos por tonalidade) de cada personagem.",
             "import type { ImageSourcePropType } from 'react-native';", "",
             "export type SkinSources = Record<string, ImageSourcePropType>;",
             "export const SKIN_SPRITES: Record<string, Record<string, SkinSources>> = {"]
    for c in CHARS:
        lines.append(f"  {c}: {{")
        for sk, (deg, sat, val) in SKINS.items():
            os.makedirs(f'{root}/assets/skins/{c}/{sk}', exist_ok=True)
            lines.append(f"    {sk}: {{")
            for p in POSES:
                im = Image.open(f'{root}/assets/legacy-sprites/{c}/{p}.png')
                shift(im, deg, sat, val).save(f'{root}/assets/skins/{c}/{sk}/{p}.png', optimize=True)
                lines.append(f"      {p}: require('../../../assets/skins/{c}/{sk}/{p}.png') as ImageSourcePropType,")
            lines.append("    },")
        lines.append("  },")
    lines += ["};", ""]
    os.makedirs(f'{root}/src/game/cosmetics', exist_ok=True)
    open(f'{root}/src/game/cosmetics/skinSources.ts', 'w').write("\n".join(lines))
    print('ok', len(CHARS) * len(SKINS) * len(POSES), 'sprites')

if __name__ == '__main__':
    main()
