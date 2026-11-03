import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

/**
 * "Farmar aura" visual - see docs/AUDIT.md and Fighter.ts's
 * isCharging/startCharge/stopCharge. There's no dedicated character art
 * for a power-up pose (the game's sprites are single static memes, not a
 * DBZ-style animation set), so the "vira Super Sayajin" feeling is built
 * procedurally instead: a pulsing double glow behind the character plus a
 * few sparks rising out of it, all pure Reanimated/View, no images. Used
 * identically in WorldScreen and BattleScreen - same component, same
 * timings, same colours, so it reads as one consistent mechanic.
 */

const SPARK_COUNT = 5;

function Spark({ active, delay, dx }: { active: boolean; delay: number; dx: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (active) {
      t.value = withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 620, easing: Easing.out(Easing.quad) })), -1, false);
    } else {
      t.value = withTiming(0, { duration: 120 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const style = useAnimatedStyle(() => ({
    opacity: active ? (1 - t.value) * 0.9 : 0,
    transform: [{ translateY: -t.value * 46 }, { translateX: dx * t.value }, { scale: 0.5 + (1 - t.value) * 0.6 }],
  }));

  return <Animated.View style={[styles.spark, style]} />;
}

export function AuraEffect({ active, width, height }: { active: boolean; width: number; height: number }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(withSequence(withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }), withTiming(0.45, { duration: 380, easing: Easing.in(Easing.quad) })), -1, false);
    } else {
      pulse.value = withTiming(0, { duration: 180 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const outerStyle = useAnimatedStyle(() => ({ opacity: 0.5 * pulse.value, transform: [{ scale: 0.85 + pulse.value * 0.55 }] }));
  const innerStyle = useAnimatedStyle(() => ({ opacity: 0.55 * pulse.value, transform: [{ scale: 0.7 + pulse.value * 0.35 }] }));

  const base = Math.max(width, height) * 1.05;
  const cx = width / 2;
  const cy = height * 0.55;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.ring, { left: cx - base / 2, top: cy - base / 2, width: base, height: base, borderRadius: base / 2, backgroundColor: '#FFB300' }, outerStyle]} />
      <Animated.View
        style={[
          styles.ring,
          { left: cx - base * 0.38, top: cy - base * 0.38, width: base * 0.76, height: base * 0.76, borderRadius: base * 0.38, backgroundColor: '#FFF59D' },
          innerStyle,
        ]}
      />
      {Array.from({ length: SPARK_COUNT }).map((_, i) => (
        <View key={i} style={{ position: 'absolute', left: cx - 3 + (i - (SPARK_COUNT - 1) / 2) * (width / SPARK_COUNT), top: cy + base * 0.28 }}>
          <Spark active={active} delay={i * 90} dx={(i % 2 === 0 ? 1 : -1) * (6 + i * 2)} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute' },
  spark: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFE082' },
});
