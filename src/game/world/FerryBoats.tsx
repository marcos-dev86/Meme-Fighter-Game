import React, { useEffect, useState } from 'react';
import { isGamePaused } from '@/game/state/pauseState';
import { Image, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { FERRY_DOCKS } from './worldGen';

/**
 * Boat pictures (the user's sprite sheet, 3 animation frames per heading:
 * the waves around the hull change from frame to frame). Used by the boats
 * moored at every dock and by the boat that carries the player over the sea.
 */
export type BoatDir = 'up' | 'down' | 'left' | 'right';

/* eslint-disable @typescript-eslint/no-require-imports */
const BOAT_IMG: Record<BoatDir, number[]> = {
  up: [require('../../../assets/boats/boat_up_1.png'), require('../../../assets/boats/boat_up_2.png'), require('../../../assets/boats/boat_up_3.png')],
  down: [require('../../../assets/boats/boat_down_1.png'), require('../../../assets/boats/boat_down_2.png'), require('../../../assets/boats/boat_down_3.png')],
  left: [require('../../../assets/boats/boat_left_1.png'), require('../../../assets/boats/boat_left_2.png'), require('../../../assets/boats/boat_left_3.png')],
  right: [require('../../../assets/boats/boat_right_1.png'), require('../../../assets/boats/boat_right_2.png'), require('../../../assets/boats/boat_right_3.png')],
};
/* eslint-enable @typescript-eslint/no-require-imports */

/** Picture size in the sheet (px) per heading. */
const BOAT_ART: Record<BoatDir, { w: number; h: number }> = {
  up: { w: 70, h: 70 },
  down: { w: 66, h: 70 },
  left: { w: 72, h: 44 },
  right: { w: 72, h: 44 },
};
const BOAT_SCALE = 2;

/** On-screen size (px) of a boat heading `dir`. */
export function boatSize(dir: BoatDir): { w: number; h: number } {
  return { w: BOAT_ART[dir].w * BOAT_SCALE, h: BOAT_ART[dir].h * BOAT_SCALE };
}

/** Wave frame order (the 3 pictures ping-pong). */
export const BOAT_FRAMES = [0, 1, 2, 1];

export function BoatImage({ dir, frame }: { dir: BoatDir; frame: number }) {
  const { w, h } = boatSize(dir);
  return <Image source={BOAT_IMG[dir][BOAT_FRAMES[frame % BOAT_FRAMES.length]]} resizeMode="contain" style={{ width: w, height: h }} />;
}

/** The boats moored at every dock (one per ferry stop); `hidden` = the one that is out at sea right now. */
export function FerryBoats({ tileSize, hidden }: { tileSize: number; hidden?: string | null }) {
  const bob = useSharedValue(0);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    bob.value = withRepeat(withSequence(withTiming(-2, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(2, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1, true);
    const id = setInterval(() => {
      if (!isGamePaused()) setFrame((f) => (f + 1) % BOAT_FRAMES.length);
    }, 420);
    return () => clearInterval(id);
  }, [bob]);
  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  return (
    <>
      {Object.entries(FERRY_DOCKS).map(([id, d]) => {
        if (id === hidden) return null;
        // Bow towards the pier.
        const dir: BoatDir = d.boat.x >= d.anchor.x ? 'left' : 'right';
        const { w, h } = boatSize(dir);
        return (
          <Animated.View key={id} pointerEvents="none" style={[styles.boat, { left: d.boat.x * tileSize - w / 2, top: d.boat.y * tileSize - h / 2, width: w, height: h }, bobStyle]}>
            <BoatImage dir={dir} frame={frame} />
          </Animated.View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  boat: { position: 'absolute' },
});
