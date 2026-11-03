import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import type { Weather } from '@/game/state/weatherState';

interface Props {
  width: number;
  height: number;
  weather: Weather;
  /** Bumped by the parent to fire a lightning flash. */
  flashKey: number;
  /** Pausa de verdade: congela as animações do clima. */
  paused?: boolean;
  /** false = só o tom do clima (sem chuva/neve/cinzas caindo). */
  particles?: boolean;
  /** 1 = clima do mundo; menos que 1 = versão mais leve (usada nas lutas). */
  intensity?: number;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Particle {
  x: number;
  y: number;
  s: number;
}

/**
 * A loop-able field of falling particles: the pattern repeats every `h` px
 * vertically (two copies stacked), and the container slides down by exactly
 * one period, so the motion never shows a seam.
 */
function Fall({ w, h, count, seed, duration, paused, render }: { w: number; h: number; count: number; seed: number; duration: number; paused: boolean; render: (p: Particle, i: number) => React.ReactNode }) {
  const y = useSharedValue(-h);
  useEffect(() => {
    if (paused) {
      cancelAnimation(y);
      return;
    }
    // retoma de onde parou: termina o ciclo atual e depois repete
    const start = Math.min(0, Math.max(-h, y.value));
    const rem = Math.max(30, duration * (-start / h));
    y.value = withSequence(
      withTiming(0, { duration: rem, easing: Easing.linear }),
      withTiming(-h, { duration: 0 }),
      withRepeat(withTiming(0, { duration, easing: Easing.linear }), -1, false),
    );
    return () => cancelAnimation(y);
  }, [h, duration, paused, y]);
  const parts = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({ x: r() * w, y: r() * h, s: r() }));
  }, [w, h, count, seed]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h * 2 }, style]}>
      {parts.map((p, i) => render(p, i))}
      {parts.map((p, i) => render({ ...p, y: p.y + h }, i + count))}
    </Animated.View>
  );
}

function Fog({ w, h, dense, paused }: { w: number; h: number; dense: boolean; paused: boolean }) {
  const a = useSharedValue(0);
  useEffect(() => {
    if (paused) {
      cancelAnimation(a);
      return;
    }
    a.value = withRepeat(withTiming(a.value < 0.5 ? 1 : 0, { duration: 22000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(a);
  }, [paused, a]);
  const s1 = useAnimatedStyle(() => ({ transform: [{ translateX: -w * 0.25 + a.value * w * 0.35 }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateX: w * 0.2 - a.value * w * 0.4 }] }));
  const op = dense ? 0.55 : 0.4;
  return (
    <>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(214,222,230,0.16)' }]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: h * 0.1, width: w * 1.5, height: h * 0.8, opacity: op }, s1]}>
        <Svg width={w * 1.5} height={h * 0.8}>
          <Defs>
            <RadialGradient id="fogA" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#f0f4f8" stopOpacity="0.9" />
              <Stop offset="1" stopColor="#f0f4f8" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx={w * 0.4} cy={h * 0.4} rx={w * 0.4} ry={h * 0.34} fill="url(#fogA)" />
          <Ellipse cx={w * 1.1} cy={h * 0.5} rx={w * 0.38} ry={h * 0.3} fill="url(#fogA)" />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: h * 0.3, width: w * 1.5, height: h * 0.7, opacity: op * 0.9 }, s2]}>
        <Svg width={w * 1.5} height={h * 0.7}>
          <Defs>
            <RadialGradient id="fogB" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#e6ecf2" stopOpacity="0.85" />
              <Stop offset="1" stopColor="#e6ecf2" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx={w * 0.6} cy={h * 0.35} rx={w * 0.42} ry={h * 0.3} fill="url(#fogB)" />
          <Ellipse cx={w * 1.2} cy={h * 0.3} rx={w * 0.3} ry={h * 0.26} fill="url(#fogB)" />
        </Svg>
      </Animated.View>
    </>
  );
}

function Flash({ flashKey }: { flashKey: number }) {
  const o = useSharedValue(0);
  useEffect(() => {
    if (!flashKey) return;
    o.value = withSequence(withTiming(0.75, { duration: 70 }), withTiming(0.1, { duration: 90 }), withTiming(0.6, { duration: 60 }), withTiming(0, { duration: 420 }));
  }, [flashKey, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#f4f6ff' }, style]} />;
}

/** Screen-space weather: rain, storm, fog, snow, blizzard and volcanic ash. */
export function WeatherLayer({ width: w, height: h, weather, flashKey, paused = false, particles = true, intensity = 1 }: Props) {
  const fade = useSharedValue(0);
  useEffect(() => {
    fade.value = 0;
    fade.value = withTiming(1, { duration: 4000 });
  }, [weather, fade]);
  const k = Math.min(1, 0.5 + intensity * 0.5);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value * k }));
  if (weather === 'clear') return null;

  const rain = (count: number, dur: number, seed: number, len: number, op: number) => (
    <Fall
      w={w}
      h={h}
      count={Math.max(3, Math.round(count * intensity))}
      seed={seed}
      duration={dur}
      paused={paused}
      render={(p, i) => <View key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: 1.5, height: len * (0.7 + p.s * 0.6), backgroundColor: `rgba(190,215,255,${op})`, transform: [{ rotate: '9deg' }] }} />}
    />
  );
  const flakes = (count: number, dur: number, seed: number, size: number, color: string) => (
    <Fall
      w={w}
      h={h}
      count={Math.max(3, Math.round(count * intensity))}
      seed={seed}
      duration={dur}
      paused={paused}
      render={(p, i) => <View key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: size * (0.6 + p.s * 0.8), height: size * (0.6 + p.s * 0.8), borderRadius: size, backgroundColor: color }} />}
    />
  );

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, fadeStyle]}>
      {(weather === 'rain' || weather === 'storm') && (
        <>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: weather === 'storm' ? 'rgba(20,30,60,0.32)' : 'rgba(40,60,90,0.16)' }]} />
          {particles && rain(weather === 'storm' ? 22 : 14, weather === 'storm' ? 620 : 800, 11, 22, 0.55)}
          {particles && rain(weather === 'storm' ? 14 : 8, weather === 'storm' ? 470 : 600, 29, 30, 0.7)}
        </>
      )}
      {weather === 'storm' && <Flash flashKey={flashKey} />}
      {weather === 'fog' && <Fog w={w} h={h} dense={false} paused={paused} />}
      {weather === 'snow' && (
        <>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(220,235,255,0.08)' }]} />
          {particles && flakes(12, 9000, 5, 4, 'rgba(255,255,255,0.9)')}
          {particles && flakes(7, 6000, 17, 6, 'rgba(255,255,255,0.95)')}
        </>
      )}
      {weather === 'blizzard' && (
        <>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(225,238,255,0.28)' }]} />
          <Fog w={w} h={h} dense paused={paused} />
          {particles && flakes(22, 3200, 41, 4, 'rgba(255,255,255,0.95)')}
          {particles && flakes(12, 2300, 53, 6, 'rgba(255,255,255,1)')}
        </>
      )}
      {weather === 'ash' && (
        <>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(90,40,20,0.14)' }]} />
          {particles && flakes(10, 10000, 61, 3, 'rgba(255,150,70,0.9)')}
          {particles && flakes(8, 7500, 73, 4, 'rgba(70,60,60,0.8)')}
        </>
      )}
    </Animated.View>
  );
}
