import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { GROUND_COLORS, auraColors, type GroundKind } from './levelUpScene';

/** Altura (fração da tela) onde o personagem pisa: a mesma dos pés dos atores das outras cenas. */
export const LEVEL_UP_GROUND_Y = 0.76;

function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Fundo da cena "subiu de nível": gradiente com as cores do personagem, aura que pulsa e raios que giram por trás dele, e o
 * chão do lugar onde ele estava (a mesma textura/cores do mapa: grama, areia, neve, pedra, lava, cinza, cais, água ou fundo do mar).
 */
export function LevelUpBackdrop({ characterId, ground }: { characterId: string; ground: GroundKind }) {
  const { width, height } = useWindowDimensions();
  const [inner, mid, outer] = auraColors(characterId);
  const [gTop, gBase, gDetail] = GROUND_COLORS[ground];
  const groundTop = height * LEVEL_UP_GROUND_Y;
  const cx = width * 0.5;
  const cy = groundTop - height * 0.24;

  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })), -1, false);
    return () => {
      cancelAnimation(spin);
      cancelAnimation(pulse);
    };
  }, [spin, pulse]);
  const raysStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const bigGlow = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.25, transform: [{ scale: 1 + pulse.value * 0.12 }] }));
  const smallGlow = useAnimatedStyle(() => ({ opacity: 0.6 + pulse.value * 0.3, transform: [{ scale: 1 + pulse.value * 0.2 }] }));

  const details = useMemo(() => Array.from({ length: 46 }, (_, i) => ({ x: rand(i + 1) * width, y: rand(i + 77), w: 2 + rand(i + 9) * 6, h: 2 + rand(i + 31) * 8 })), [width]);
  const big = height * 1.05;
  const small = height * 0.6;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[outer, mid, outer]} locations={[0, 0.62, 1]} style={StyleSheet.absoluteFill} />

      {/* aura atrás do personagem: dois brilhos que pulsam e raios que giram devagar */}
      <Animated.View style={[styles.round, { left: cx - big / 2, top: cy - big / 2, width: big, height: big, borderRadius: big / 2, backgroundColor: mid }, bigGlow]} />
      <Animated.View style={[styles.round, { left: cx - small / 2, top: cy - small / 2, width: small, height: small, borderRadius: small / 2, backgroundColor: inner }, smallGlow]} />
      <Animated.View style={[{ position: 'absolute', left: cx, top: cy, width: 0, height: 0 }, raysStyle]}>
        {Array.from({ length: 12 }, (_, i) => (
          <View key={i} style={[styles.ray, { backgroundColor: inner, height: height * 1.5, top: -height * 0.75, transform: [{ rotate: `${i * 30}deg` }] }]} />
        ))}
      </Animated.View>

      {/* chão do lugar onde o personagem está */}
      <LinearGradient colors={[gTop, gBase]} style={{ position: 'absolute', left: 0, right: 0, top: groundTop, bottom: 0 }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: groundTop, bottom: 0, overflow: 'hidden' }}>
        {details.map((d, i) => {
          const y = d.y * (height - groundTop);
          if (ground === 'grass') return <View key={i} style={{ position: 'absolute', left: d.x, top: y * 0.7, width: 3, height: 7 + d.h, backgroundColor: gDetail, borderRadius: 2 }} />;
          if (ground === 'stone') return <View key={i} style={{ position: 'absolute', left: (i % 8) * (width / 8), top: (i % 5) * ((height - groundTop) / 5), width: width / 8 - 4, height: 2, backgroundColor: gDetail, opacity: 0.45 }} />;
          if (ground === 'dock') return <View key={i} style={{ position: 'absolute', left: (i % 16) * (width / 16), top: 0, width: 3, bottom: 0, backgroundColor: gDetail, opacity: 0.4 }} />;
          if (ground === 'water') return <View key={i} style={{ position: 'absolute', left: d.x, top: y, width: 10 + d.w * 3, height: 2, backgroundColor: gDetail, opacity: 0.5 }} />;
          if (ground === 'lava') return <View key={i} style={{ position: 'absolute', left: d.x, top: y, width: 6 + d.w * 4, height: 2, backgroundColor: gDetail, opacity: 0.85 }} />;
          return <View key={i} style={{ position: 'absolute', left: d.x, top: y, width: d.w, height: d.w, borderRadius: d.w / 2, backgroundColor: gDetail, opacity: 0.7 }} />;
        })}
      </View>
      {/* debaixo d'água: tudo ganha tom azul e sobem bolhas */}
      {ground === 'underwater' ? (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,90,170,0.38)' }]} />
          {details.slice(0, 18).map((d, i) => (
            <View key={i} style={{ position: 'absolute', left: d.x, top: d.y * groundTop, width: 4 + d.w, height: 4 + d.w, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' }} />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  round: { position: 'absolute' },
  ray: { position: 'absolute', left: -7, width: 14, opacity: 0.16 },
});
