import React from 'react';
import { Image, Platform, View, type ImageStyle } from 'react-native';

const ART = require('../../../assets/buildings/torre_desafios.png');
// arte original 28x40 (ampliada 4x, sem suavização)
const ART_RATIO = 40 / 28;

/** Sprite da Torre dos Desafios: encostado na base do retângulo sólido do prédio. */
export function TowerSprite({ width, height }: { width: number; height: number }) {
  const h = Math.min(height, width * ART_RATIO);
  const w = h / ART_RATIO;
  const pixelated = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as unknown as ImageStyle) : null;
  return (
    <View style={{ width, height, justifyContent: 'flex-end', alignItems: 'center' }} pointerEvents="none">
      <Image source={ART} style={[{ width: w, height: h }, pixelated]} resizeMode="stretch" fadeDuration={0} />
    </View>
  );
}
