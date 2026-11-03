import React, { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ITEMS } from './itemDefs';
import type { GearDef } from './gear';
import type { HandPoint } from '@/game/battle/handAnchors';

/** Intrinsic pixel size of each gear image (checked against the PNGs). */
const IMG_SIZE: Record<string, { w: number; h: number }> = {
  w_dagger: { w: 48, h: 16 },
  w_cutlass: { w: 51, h: 17 },
  w_club: { w: 87, h: 87 },
  w_sword: { w: 141, h: 50 },
  w_hammer: { w: 88, h: 85 },
  w_axe: { w: 93, h: 93 },
  w_shield: { w: 101, h: 100 },
};

export type SwingPhase = 'windup' | 'swing' | undefined;

/** Weapon direction (degrees, 0 = forward, -90 = straight up) for a sprite pose. */
function weaponAngle(poseKey: string, phase: SwingPhase): number {
  if (phase === 'windup') return -105;
  if (phase === 'swing') return poseKey === 'strong' ? 40 : poseKey === 'flash' ? 15 : -20;
  switch (poseKey) {
    case 'dash':
      return -25;
    case 'flash':
      return -15;
    case 'strong':
      return -100;
    default:
      return -60;
  }
}

interface Props {
  weapon: GearDef | null;
  shield: GearDef | null;
  /** Sprite's drawn rectangle, in the parent's coordinates. */
  box: { left: number; top: number; width: number; height: number };
  /** Fraction (0-1) of the sprite where the front hand is in this pose. */
  hand: HandPoint;
  /** Character's standing height in px - gear is sized relative to it. */
  charH: number;
  /** 1 = facing right, -1 = facing left (sprite is mirrored). */
  dir: 1 | -1;
  poseKey: string;
  phase?: SwingPhase;
}

/**
 * The weapon in the character's hand (and the shield on the body). The
 * weapon's grip is pinned to the hand point of the CURRENT sprite frame, so
 * it moves with the arm through the walk cycle and punches, and it turns
 * smoothly between poses (raised for the wind-up, forward for the swing).
 */
export function HeldGear({ weapon, shield, box, hand, charH, dir, poseKey, phase }: Props) {
  const target = weaponAngle(poseKey, phase);
  const rot = useSharedValue(target);
  useEffect(() => {
    rot.value = withTiming(target, { duration: 70 });
  }, [target, rot]);

  const axis = weapon?.axis ?? 0;
  const wImg = weapon ? IMG_SIZE[weapon.id] : null;
  let w = 0;
  let h = 0;
  let gcx = 0;
  let gcy = 0;
  if (weapon && wImg) {
    const k = (weapon.lengthFrac * charH) / Math.max(wImg.w, wImg.h);
    w = wImg.w * k;
    h = wImg.h * k;
    gcx = (weapon.grip.x - 0.5) * w;
    gcy = (weapon.grip.y - 0.5) * h;
  }

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value - axis}deg` }, { translateX: -gcx }, { translateY: -gcy }],
  }));

  const hx = box.left + (dir === 1 ? hand.x : 1 - hand.x) * box.width;
  const hy = box.top + hand.y * box.height;

  const sImg = shield ? IMG_SIZE[shield.id] : null;
  let sw = 0;
  let sh = 0;
  if (shield && sImg) {
    const k = (shield.lengthFrac * charH) / Math.max(sImg.w, sImg.h);
    sw = sImg.w * k;
    sh = sImg.h * k;
  }
  // The shield rides on the torso, a bit toward the front.
  const bx = box.left + (dir === 1 ? 0.52 : 0.48) * box.width;
  const by = box.top + 0.58 * box.height;

  return (
    <>
      {shield && sImg && ITEMS[shield.id]?.image ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: bx - sw / 2, top: by - sh / 2, width: sw, height: sh }}>
          <Image source={ITEMS[shield.id].image} resizeMode="contain" style={{ width: sw, height: sh }} />
        </View>
      ) : null}
      {weapon && wImg && ITEMS[weapon.id]?.image ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: hx, top: hy, width: 0, height: 0, transform: [{ scaleX: dir }] }}>
          <Animated.View style={[{ position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h }, style]}>
            <Image source={ITEMS[weapon.id].image} resizeMode="stretch" style={{ width: w, height: h }} />
          </Animated.View>
        </View>
      ) : null}
    </>
  );
}
