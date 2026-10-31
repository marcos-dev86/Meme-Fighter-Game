import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

interface Props {
  width: number;
  height: number;
  /** 1 = full daylight, 0 = deep night. */
  light: number;
  /** Where the player is on screen (the lantern hole is centred here). */
  cx: number;
  cy: number;
}

/**
 * Screen-space darkness: a dark-blue veil with a soft hole around the player,
 * and an orange tint that peaks halfway through dusk and dawn.
 */
export function NightOverlay({ width, height, light, cx, cy }: Props) {
  const dark = 1 - light;
  if (dark < 0.015) return null;
  const veil = dark * 0.74;
  const dusk = 4 * light * (1 - light); // 0 at full day/night, 1 at the middle of the transition
  const r = Math.max(width, height) * 0.62;
  const hole = 0.2 + 0.1 * light; // fraction of the radius that stays clear
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="nightGrad" cx={cx} cy={cy} r={r} gradientUnits="userSpaceOnUse">
            <Stop offset={0} stopColor="#070b26" stopOpacity={0} />
            <Stop offset={hole} stopColor="#070b26" stopOpacity={veil * 0.15} />
            <Stop offset={0.55} stopColor="#070b26" stopOpacity={veil * 0.85} />
            <Stop offset={1} stopColor="#070b26" stopOpacity={veil} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#nightGrad)" />
        {dusk > 0.02 && <Rect x={0} y={0} width={width} height={height} fill="#ff7a2a" opacity={dusk * 0.2} />}
      </Svg>
    </View>
  );
}
