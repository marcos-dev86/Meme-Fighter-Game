import React from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { HUD_ART } from './hudArt';

/**
 * Peças da interface do modo história (layout da imagem de referência):
 *  - HudBar: barra com a ARTE do jogo (vermelha = vida, azul = energia). O preenchimento é a arte CORTADA (não esticada) até a
 *    fração atual, sobre um fundo escuro, então a barra "esvazia" de verdade.
 *  - CurrencyPill: cápsula amarela (moedas) ou azul (diamantes) com o ícone saltando para fora na esquerda.
 */
export const HUD_BAR_COLORS = { red: '#c8002b', blue: '#00aaff' } as const;

export function HudBar({ art, width, height, fillStyle, testID }: { art: 'bar_red' | 'bar_blue'; width: number; height: number; fillStyle: AnimatedStyle<ViewStyle>; testID?: string }) {
  return (
    <View style={[styles.barTrack, { width, height, borderRadius: height / 2.4 }]} testID={testID}>
      <Animated.View style={[{ height: '100%', overflow: 'hidden' }, fillStyle]}>
        <Image source={HUD_ART[art]} resizeMode="stretch" style={{ width, height }} />
      </Animated.View>
    </View>
  );
}

export function CurrencyPill({ kind, value, testID }: { kind: 'coin' | 'gem'; value: number; testID?: string }) {
  const gem = kind === 'gem';
  return (
    <View style={[styles.pill, { backgroundColor: gem ? '#00d9ff' : '#faf600' }]} testID={testID}>
      <Image source={HUD_ART[kind]} resizeMode="contain" style={styles.pillIcon} />
      <Text style={styles.pillText} numberOfLines={1}>
        {value > 9999 ? '9999+' : String(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barTrack: { backgroundColor: 'rgba(0,0,0,0.55)', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', height: 22, minWidth: 74, borderRadius: 11, paddingLeft: 26, paddingRight: 9, marginLeft: 12 },
  pillIcon: { position: 'absolute', left: -12, top: -4, width: 28, height: 28 },
  pillText: { color: '#fff', fontWeight: '900', fontSize: 13, textShadowColor: '#000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 3 },
});
