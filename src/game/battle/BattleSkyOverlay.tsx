import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { DayPhase } from './battleContext';

interface Props {
  light: number;
  phase: DayPhase;
  tint?: string | null;
}

/**
 * Hora do dia na luta: um véu azul escuro à noite (mais leve que o do mundo, para
 * os lutadores continuarem visíveis), laranja no pôr do sol e rosado ao nascer do sol.
 */
export function BattleSkyOverlay({ light, phase, tint }: Props) {
  const dark = 1 - light;
  const twilight = 4 * light * (1 - light); // 0 em pleno dia/noite, 1 no meio da transição
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {dark > 0.02 && <View style={[StyleSheet.absoluteFill, { backgroundColor: '#070b26', opacity: dark * 0.5 }]} />}
      {twilight > 0.03 && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: phase === 'dawn' ? '#ff9fb0' : '#ff7a2a', opacity: twilight * 0.22 }]} />
      )}
      {tint ? <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} /> : null}
    </View>
  );
}
