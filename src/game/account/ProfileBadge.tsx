import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AVATAR_ART } from './avatarArt';
import { BG_BY_ID, DEFAULT_BG, DEFAULT_FRAME, FRAME_BY_ID, type BgDef, type FrameDef } from './profileDefs';

/**
 * O ÍCONE do perfil: retrato do lutador + fundo (cor lisa ou efeito animado) + moldura. Tudo em plain RN, usando só os retratos
 * (sprites de repouso) que o jogo já tem. Os efeitos animados rodam em loop leve (Animated); `animate={false}` congela
 * (listas grandes, miniaturas).
 */
interface Props {
  avatar: string;
  bg?: string;
  frame?: string;
  size?: number;
  animate?: boolean;
}

const native = Platform.OS !== 'web';
/** Os ícones são busto de pixel art: no web, ampliar sem borrar. */
const PIXELATED = (Platform.OS === 'web' ? { imageRendering: 'pixelated' } : {}) as object;

function useLoop(ms: number, on: boolean, driver = native): Animated.Value {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: driver }));
    loop.start();
    return () => loop.stop();
  }, [ms, on, driver, v]);
  return v;
}

function Stars({ def, size, animate }: { def: BgDef; size: number; animate: boolean }) {
  const t = useLoop(2400, animate);
  const dots = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ x: ((i * 37 + 11) % 90) / 100, y: ((i * 53 + 7) % 90) / 100, s: 2 + (i % 3), ph: i / 9 })), []);
  return (
    <>
      {dots.map((d, i) => {
        const op = t.interpolate({ inputRange: [0, d.ph, Math.min(1, d.ph + 0.25), 1].sort((a, b) => a - b), outputRange: [0.25, 0.25, 1, 0.25] });
        return <Animated.View key={i} style={{ position: 'absolute', left: d.x * size, top: d.y * size, width: d.s, height: d.s, borderRadius: d.s, backgroundColor: i % 3 === 0 ? def.colors[2] : def.colors[1], opacity: animate ? op : 0.8 }} />;
      })}
    </>
  );
}

function Rain({ def, size, animate }: { def: BgDef; size: number; animate: boolean }) {
  const t = useLoop(1400, animate);
  const cols = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ x: (i + 0.5) / 6, h: 10 + (i % 3) * 6, ph: (i * 0.23) % 1 })), []);
  return (
    <>
      {cols.map((c, i) => {
        const y = t.interpolate({ inputRange: [0, 1], outputRange: [-size * (0.3 + c.ph), size] });
        return <Animated.View key={i} style={{ position: 'absolute', left: c.x * size - 1, top: 0, width: 2, height: c.h, backgroundColor: i % 2 ? def.colors[1] : def.colors[2], opacity: 0.85, transform: [{ translateY: animate ? y : size * 0.25 * ((i % 3) + 1) }] }} />;
      })}
    </>
  );
}

function Aurora({ def, size, animate }: { def: BgDef; size: number; animate: boolean }) {
  const t = useLoop(4200, animate);
  const x1 = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-size * 0.3, size * 0.25, -size * 0.3] });
  const x2 = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [size * 0.3, -size * 0.25, size * 0.3] });
  return (
    <>
      <Animated.View style={{ position: 'absolute', top: size * 0.1, left: size * 0.1, width: size * 0.8, height: size * 0.45, borderRadius: size, backgroundColor: def.colors[1], opacity: 0.55, transform: [{ translateX: x1 }] }} />
      <Animated.View style={{ position: 'absolute', top: size * 0.4, left: size * 0.1, width: size * 0.8, height: size * 0.4, borderRadius: size, backgroundColor: def.colors[2], opacity: 0.5, transform: [{ translateX: x2 }] }} />
    </>
  );
}

function Pulse({ def, size, animate }: { def: BgDef; size: number; animate: boolean }) {
  const t = useLoop(1800, animate);
  return (
    <>
      {[0, 0.5].map((ph) => {
        const p = animate ? t : new Animated.Value(ph + 0.2);
        const sc = p.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.6] });
        const op = p.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] });
        return <Animated.View key={ph} style={{ position: 'absolute', left: size * 0.15, top: size * 0.15, width: size * 0.7, height: size * 0.7, borderRadius: size, borderWidth: 3, borderColor: def.colors[1], opacity: op, transform: [{ scale: sc }] }} />;
      })}
    </>
  );
}

function Rainbow({ def, animate }: { def: BgDef; animate: boolean }) {
  const t = useLoop(5000, animate, false); // cor não anima no driver nativo
  const n = def.colors.length;
  const colors = [...def.colors, def.colors[0]];
  const bg = t.interpolate({ inputRange: colors.map((_, i) => i / n), outputRange: colors });
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: animate ? bg : def.colors[2] }]} />;
}

function Background({ def, size, animate }: { def: BgDef; size: number; animate: boolean }) {
  const base = def.colors[0];
  switch (def.kind) {
    case 'solid':
      return <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]} />;
    case 'gradient':
      return <LinearGradient colors={def.colors as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />;
    case 'aurora':
      return (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]}>
          <Aurora def={def} size={size} animate={animate} />
        </View>
      );
    case 'stars':
      return (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]}>
          <Stars def={def} size={size} animate={animate} />
        </View>
      );
    case 'rain':
      return (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: base, overflow: 'hidden' }]}>
          <Rain def={def} size={size} animate={animate} />
        </View>
      );
    case 'pulse':
      return (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: base, overflow: 'hidden' }]}>
          <Pulse def={def} size={size} animate={animate} />
        </View>
      );
    case 'rainbow':
      return <Rainbow def={def} animate={animate} />;
  }
}

function frameStyle(def: FrameDef, size: number) {
  const r = def.kind === 'pixel' ? 0 : Math.round(size * 0.16);
  switch (def.kind) {
    case 'plain':
      return { borderWidth: 3, borderColor: def.colors[0], borderRadius: r };
    case 'solid':
      return { borderWidth: Math.max(3, size * 0.06), borderColor: def.colors[0], borderRadius: r };
    case 'double':
      return { borderWidth: Math.max(4, size * 0.08), borderColor: def.colors[0], borderRadius: r };
    case 'pixel':
      return { borderWidth: Math.max(4, size * 0.07), borderColor: def.colors[0], borderRadius: 0 };
    default:
      return { borderWidth: Math.max(3, size * 0.05), borderColor: def.colors[0], borderRadius: r };
  }
}

function FrameOverlay({ def, size, animate }: { def: FrameDef; size: number; animate: boolean }) {
  const t = useLoop(1600, animate, false);
  const base = frameStyle(def, size);
  if (def.kind === 'glow') {
    const op = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1, 0.35] });
    return (
      <>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, base]} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: base.borderRadius + 4, margin: -4, borderWidth: 4, borderColor: def.colors[0], opacity: animate ? op : 0.6 }]} />
      </>
    );
  }
  if (def.kind === 'rainbow') {
    const n = def.colors.length;
    const colors = [...def.colors, def.colors[0]];
    const col = t.interpolate({ inputRange: colors.map((_, i) => i / n), outputRange: colors });
    return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, base, { borderColor: animate ? col : def.colors[3] }]} />;
  }
  return (
    <>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, base]} />
      {(def.kind === 'double' || def.kind === 'pixel') && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { margin: base.borderWidth, borderWidth: 2, borderColor: def.colors[1], borderRadius: Math.max(0, base.borderRadius - 3) }]} />
      )}
    </>
  );
}

export function ProfileBadge({ avatar, bg = DEFAULT_BG, frame = DEFAULT_FRAME, size = 96, animate = true }: Props) {
  const bgDef = BG_BY_ID[bg] ?? BG_BY_ID[DEFAULT_BG];
  const frDef = FRAME_BY_ID[frame] ?? FRAME_BY_ID[DEFAULT_FRAME];
  const radius = frDef.kind === 'pixel' ? 0 : Math.round(size * 0.16);
  const src: number | undefined = AVATAR_ART[avatar] ?? AVATAR_ART.dogge;
  return (
    <View style={{ width: size, height: size }} testID={`badge-${avatar}-${bg}-${frame}`}>
      <View style={{ flex: 1, borderRadius: radius, overflow: 'hidden' }}>
        <Background def={bgDef} size={size} animate={animate} />
        {src !== undefined && <Image source={src} style={[{ position: 'absolute', left: size * 0.04, top: size * 0.04, width: size * 0.92, height: size * 0.92 }, PIXELATED]} resizeMode="contain" />}
      </View>
      <FrameOverlay def={frDef} size={size} animate={animate} />
    </View>
  );
}
