"""Gera src/game/ui/iconRegistry.ts a partir de assets/icons/*.png (rode na raiz do projeto)."""
import os
names = sorted(f[:-4] for f in os.listdir('assets/icons') if f.endswith('.png'))
L = ["// GERADO por tools/gen_icon_registry.py a partir de assets/icons/*.png.",
     "import type { ImageSourcePropType } from 'react-native';", "", "export const ICON_SOURCES = {"]
for n in names:
    L.append(f"  {n}: require('../../../assets/icons/{n}.png') as ImageSourcePropType,")
L += ["} as const;", "", "export type IconName = keyof typeof ICON_SOURCES;", "",
      "export function iconSource(name: IconName): ImageSourcePropType {", "  return ICON_SOURCES[name];", "}", ""]
open('src/game/ui/iconRegistry.ts', 'w').write("\n".join(L))
print(len(names), 'ícones')
