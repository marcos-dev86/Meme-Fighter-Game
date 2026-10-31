import React from 'react';
import { Image, Platform, View, type ImageSourcePropType, type ImageStyle } from 'react-native';
import { SCENERY } from './worldGen';

/* eslint-disable @typescript-eslint/no-require-imports */
const ART: Record<string, { src: ImageSourcePropType; w: number; h: number }> = {
  nb_igreja: { src: require('../../../assets/buildings/nb_igreja.png'), w: 330, h: 495 },
  nb_lanchonete: { src: require('../../../assets/buildings/nb_lanchonete.png'), w: 381, h: 315 },
  nb_tijolo1: { src: require('../../../assets/buildings/nb_tijolo1.png'), w: 339, h: 462 },
  nb_tijolo2: { src: require('../../../assets/buildings/nb_tijolo2.png'), w: 390, h: 468 },
  nb_casa_vermelha: { src: require('../../../assets/buildings/nb_casa_vermelha.png'), w: 312, h: 222 },
  nb_casa_pequena1: { src: require('../../../assets/buildings/nb_casa_pequena1.png'), w: 213, h: 150 },
  nb_barraca: { src: require('../../../assets/buildings/nb_barraca.png'), w: 159, h: 129 },
  nb_sorvete: { src: require('../../../assets/buildings/nb_sorvete.png'), w: 135, h: 156 },
  nb_madeira: { src: require('../../../assets/buildings/nb_madeira.png'), w: 261, h: 312 },
};
/* eslint-enable @typescript-eslint/no-require-imports */

const PIXELATED = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as unknown as ImageStyle) : null;

/** Estruturas decorativas da praça (SCENERY em worldGen.ts): sprite encostado na base do retângulo sólido. */
export function SceneryLayer({ tileSize }: { tileSize: number }) {
  return (
    <>
      {SCENERY.map((s) => {
        const art = ART[s.art];
        if (!art) return null;
        const fpW = (s.fp.x1 - s.fp.x0 + 1) * tileSize;
        const fpH = (s.fp.y1 - s.fp.y0 + 1) * tileSize;
        const ih = s.h * tileSize;
        const iw = ih * (art.w / art.h);
        return (
          <View key={s.id} pointerEvents="none" style={{ position: 'absolute', left: s.fp.x0 * tileSize, top: s.fp.y0 * tileSize, width: fpW, height: fpH }}>
            <Image source={art.src} resizeMode="stretch" fadeDuration={0} style={[{ position: 'absolute', left: (fpW - iw) / 2, top: fpH - ih, width: iw, height: ih }, PIXELATED]} />
          </View>
        );
      })}
    </>
  );
}
