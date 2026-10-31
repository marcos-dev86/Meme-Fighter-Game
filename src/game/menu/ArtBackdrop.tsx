import React, { useEffect, useMemo } from 'react';
import { getSettings } from '@/game/state/settingsState';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { playSfx } from '@/game/audio/audioManager';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  /** kept optional so existing call sites that still pass `background` don't need to change */
  background?: number;
  children: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

const SKY_COLORS = ['#1b1030', '#2a1540', '#160c28', '#241238'];
const PARTICLE_COUNT = 14;

/**
 * Own menu chrome, no baked screen art (see docs/AUDIT.md changelog: the
 * original PNGs had text/buttons baked in and doubled up visually with
 * real buttons on top). Animated dusk gradient (color-cycled, no extra
 * asset) plus a handful of drifting embers/fireflies, all Reanimated : 
 * zero new dependencies.
 */
export function ArtBackdrop({ children, onBack, backLabel = '< VOLTAR' }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t]);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 0.33, 0.66, 1], SKY_COLORS),
  }));

  const particles = useMemo(
    () =>
      Array.from({ length: getSettings().lightMode ? Math.ceil(PARTICLE_COUNT / 2) : PARTICLE_COUNT }, (_, i) => ({
        id: i,
        x: Math.random() * width,
        size: 3 + Math.random() * 4,
        delay: Math.random() * 4000,
        duration: 5000 + Math.random() * 5000,
      })),
    [width]
  );

  return (
    <Animated.View style={[styles.bg, bgStyle]}>
      {particles.map((p) => (
        <Ember key={p.id} x={p.x} size={p.size} delay={p.delay} duration={p.duration} height={height} />
      ))}
      <View style={styles.content}>{children}</View>
      {onBack && (
        <Pressable
          onPress={() => {
            playSfx('ui_back');
            (onBack ?? (() => router.back()))();
          }}
          style={[styles.backButton, { left: insets.left + 24, bottom: insets.bottom + 24 }]}
        >
          <Text style={styles.backLabel}>{backLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

function Ember({ x, size, delay, duration, height }: { x: number; size: number; delay: number; duration: number; height: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
  }, [progress, duration, delay]);

  const style = useAnimatedStyle(() => {
    const y = height + 20 - progress.value * (height + 40);
    const opacity = progress.value < 0.1 ? progress.value * 10 : progress.value > 0.85 ? (1 - progress.value) * 6.6 : 1;
    return {
      transform: [{ translateX: x }, { translateY: y }],
      opacity: Math.max(0, Math.min(1, opacity)) * 0.8,
    };
  });

  return <Animated.View pointerEvents="none" style={[styles.ember, { width: size, height: size, borderRadius: size / 2 }, style]} />;
}

const styles = StyleSheet.create({
  bg: { flex: 1, width: '100%', height: '100%' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ember: { position: 'absolute', backgroundColor: '#FFD700' },
  backButton: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.7)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(10,10,18,0.6)',
  },
  backLabel: { color: '#FFD700', fontWeight: '700', fontSize: 14 },
});
