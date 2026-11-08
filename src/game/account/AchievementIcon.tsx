import React from 'react';
import { Image, Platform, StyleSheet, type ImageStyle } from 'react-native';
import { ACHIEVEMENT_ART } from './achievementArt';

const PIXELATED = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as unknown as ImageStyle) : null;

/** Pixel-art 16x16 própria de cada conquista, ampliada sem borrar. `dim` = conquista ainda não obtida (escurecida). */
export function AchievementIcon({ id, size, dim = false }: { id: string; size: number; dim?: boolean }) {
  const src = ACHIEVEMENT_ART[id];
  if (!src) return null;
  return (
    <Image
      source={src}
      testID={`ach-icon-${id}`}
      style={[{ width: size, height: size }, dim && styles.dim, PIXELATED]}
      resizeMode="stretch"
      fadeDuration={0}
    />
  );
}

const styles = StyleSheet.create({ dim: { opacity: 0.35 } });
