import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { getSettings } from '@/game/state/settingsState';
import { SCENES, type ParticlePreset, type SceneKey } from './sceneArt';

/**
 * Partículas procedurais leves de um cenário (sem imagens, sem sprites). Nunca recebem toque (pointerEvents none),
 * ficam atrás do conteúdo, usam só transform/opacidade (thread de UI) e se desligam sozinhas quando o aparelho pede
 * "reduzir movimento". No modo leve das Opções usam metade das partículas.
 */
export function SceneParticles({ scene }: { scene: SceneKey }) {
  const { width, height } = useWindowDimensions();
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduce(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(!!v));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const preset = SCENES[scene].particles;
  const light = getSettings().lightMode;
  const items = useMemo(() => makeParticles(preset, width, height, light), [preset, width, height, light]);
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((p) => (
        <Particle key={p.id} p={p} preset={preset} height={height} />
      ))}
    </View>
  );
}

interface P {
  id: number;
  x: number;
  y0: number;
  y1: number;
  size: number;
  color: string;
  delay: number;
  dur: number;
  phase: number;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function makeParticles(preset: ParticlePreset, w: number, h: number, light: boolean): P[] {
  const n = light ? Math.ceil(preset.count / 2) : preset.count;
  const [b0, b1] = preset.band ?? [0, 1];
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: rnd(0, w),
    y0: rnd(b0, b1) * h,
    y1: rnd(b0, b1) * h,
    size: rnd(preset.size[0], preset.size[1]),
    color: preset.colors[i % preset.colors.length],
    delay: rnd(0, preset.dur[1]),
    dur: rnd(preset.dur[0], preset.dur[1]),
    phase: rnd(0, Math.PI * 2),
  }));
}

function Particle({ p, preset, height }: { p: P; preset: ParticlePreset; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(p.delay, withRepeat(withTiming(1, { duration: p.dur, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(t);
  }, [t, p.delay, p.dur]);

  const style = useAnimatedStyle(() => {
    const k = t.value;
    const top = (preset.band?.[0] ?? 0) * height - 10;
    const bottom = (preset.band?.[1] ?? 1) * height + 10;
    let y: number;
    if (preset.motion === 'up') y = bottom - k * (bottom - top);
    else if (preset.motion === 'down') y = top + k * (bottom - top);
    else y = p.y0 + (p.y1 - p.y0) * k;
    const x = p.x + Math.sin(k * Math.PI * 2 + p.phase) * preset.sway;
    const edge = k < 0.12 ? k / 0.12 : k > 0.82 ? (1 - k) / 0.18 : 1;
    const tw = preset.twinkle ? 0.35 + 0.65 * Math.abs(Math.sin(k * Math.PI * 4 + p.phase)) : 1;
    return { transform: [{ translateX: x }, { translateY: y }], opacity: Math.max(0, Math.min(1, edge)) * tw * preset.alpha };
  });

  const shape =
    preset.shape === 'ring'
      ? { width: p.size, height: p.size, borderRadius: p.size / 2, borderWidth: 1, borderColor: p.color }
      : preset.shape === 'square'
        ? { width: p.size, height: p.size, backgroundColor: p.color }
        : { width: p.size, height: p.size, borderRadius: p.size / 2, backgroundColor: p.color };
  return <Animated.View style={[styles.dot, shape, style]} />;
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', left: 0, top: 0 },
});
