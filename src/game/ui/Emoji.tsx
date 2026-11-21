import React from 'react';
import { Image, Platform, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import type { SeaEmojiName } from '@/game/dive/seaFx';

/* eslint-disable @typescript-eslint/no-require-imports */
// "Viral Emojis" do pacote new-sea-assets (128x128), recortados por tools/import_sea_fx.py.
export const EMOJI_SOURCES: Record<SeaEmojiName, number> = {
  stop: require('../../../assets/sea/emoji/stop.png'),
  skull: require('../../../assets/sea/emoji/skull.png'),
  shocked: require('../../../assets/sea/emoji/shocked.png'),
  scream: require('../../../assets/sea/emoji/scream.png'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

const WEB_PIXELATED = StyleSheet.create({ p: { imageRendering: 'pixelated' } as unknown as ImageStyle }).p;

/** Emoji pixel-art do pacote do mar. Quadrado, decorativo para leitor de tela (o texto ao lado já diz tudo). */
export function Emoji({ name, size = 22, style }: { name: SeaEmojiName; size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={EMOJI_SOURCES[name]}
      style={[{ width: size, height: size }, Platform.OS === 'web' ? (WEB_PIXELATED as ImageStyle) : null, style]}
      resizeMode="contain"
      fadeDuration={0}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
