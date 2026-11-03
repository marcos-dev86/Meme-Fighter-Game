import React, { useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

interface Props {
  label: string;
  value: number; // 0..1
  onChange: (v: number) => void;
  /** Called when the finger lifts (a good moment to play a sample sound). */
  onRelease?: (v: number) => void;
}

const THUMB = 26;

/**
 * Touch slider (no native module): drag anywhere on the bar. Works the
 * same on Android, iOS and the web preview.
 */
export function Slider({ label, value, onChange, onRelease }: Props) {
  const [w, setW] = useState(0);
  const widthRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const apply = (e: GestureResponderEvent) => {
    const width = widthRef.current - THUMB;
    if (width <= 0) return;
    const x = e.nativeEvent.locationX - THUMB / 2;
    const v = Math.min(1, Math.max(0, x / width));
    const snapped = Math.round(v * 20) / 20; // steps of 5%
    if (snapped !== valueRef.current) {
      valueRef.current = snapped;
      onChange(snapped);
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setW(e.nativeEvent.layout.width);
  };

  const pct = Math.round(value * 100);
  const travel = Math.max(0, w - THUMB);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{pct}%</Text>
      </View>
      <View
        style={styles.hit}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={apply}
        onResponderMove={apply}
        onResponderRelease={() => onRelease?.(valueRef.current)}
        onResponderTerminate={() => onRelease?.(valueRef.current)}
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: THUMB / 2 + travel * value }]} />
        </View>
        <View style={[styles.thumb, { left: travel * value }]} pointerEvents="none" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 300, gap: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: '#FFD700', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
  value: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hit: { height: 36, justifyContent: 'center' },
  track: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.5)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#FFCD3C' },
  thumb: { position: 'absolute', top: 5, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: '#FFE9A8', borderWidth: 3, borderColor: '#B9820A' },
});
