import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BUILDING_RECTS } from './worldGen';
import { BuildingLights } from './BuildingLights';
import { NightOverlay } from './NightOverlay';
import { getLight, subscribeTime, useTimeOfDay } from '@/game/state/timeState';
import { WEATHER_ICON, type Weather } from '@/game/state/weatherState';
import { GameIcon } from '@/game/ui/GameIcon';
import type { IconName } from '@/game/ui/iconRegistry';

/** True while it is night; re-renders only when that flips. */
export function useIsNight(): boolean {
  const [night, setNight] = useState(() => getLight() < 0.5);
  useEffect(
    () =>
      subscribeTime(() => {
        const n = getLight() < 0.5;
        setNight((prev) => (prev === n ? prev : n));
      }),
    [],
  );
  return night;
}

/** Darkness veil over the world (below the HUD). */
export function NightLayer({ width, height, cx, cy }: { width: number; height: number; cx: number; cy: number }) {
  const { light } = useTimeOfDay();
  return <NightOverlay width={width} height={height} light={light} cx={cx} cy={cy} />;
}

/** Window glow of every building: lives inside the world container, above the veil. */
export function LightsLayer({ tileSize }: { tileSize: number }) {
  const { light } = useTimeOfDay();
  const dark = 1 - light;
  if (dark < 0.05) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: Math.min(1, dark * 1.3) }]}>
      {BUILDING_RECTS.map((b) => (
        <BuildingLights key={b.id} buildingId={b.id} x={b.x0 * tileSize} y={b.y0 * tileSize} width={(b.x1 - b.x0 + 1) * tileSize} height={(b.y1 - b.y0 + 1) * tileSize} tileSize={tileSize} />
      ))}
    </View>
  );
}

/** Small clock + weather pill at the top centre. */
export function ClockPill({ top, weather }: { top: number; weather: Weather }) {
  const { night, clock } = useTimeOfDay();
  return (
    <View pointerEvents="none" style={[styles.pill, { top }]}>
      <GameIcon name={night ? 'moon' : 'sun'} size={14} />
      <Text style={styles.text}>{clock}</Text>
      {WEATHER_ICON[weather] ? <GameIcon name={WEATHER_ICON[weather] as IconName} size={14} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(10,10,18,0.55)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  text: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
