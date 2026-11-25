import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

/* eslint-disable @typescript-eslint/no-require-imports */
const SHIELD_GIF = require('../../../assets/legacy-art/effects/escudo.gif');
/* eslint-enable @typescript-eslint/no-require-imports */

interface Props {
  /** Centro do corpo do personagem (px, dentro do contêiner que o desenha). */
  cx: number;
  cy: number;
  /** Lado do quadrado do escudo: um pouco maior que o corpo. */
  size: number;
}

/**
 * O escudo do jogo (escudo.gif, animado), centralizado no corpo do personagem. Vale igual na luta e no mundo; nunca recebe toque.
 */
export function ShieldGif({ cx, cy, size }: Props) {
  return (
    <View pointerEvents="none" style={[styles.box, { left: cx - size / 2, top: cy - size / 2, width: size, height: size }]}>
      <ExpoImage source={SHIELD_GIF} style={StyleSheet.absoluteFill} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute' },
});
