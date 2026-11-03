import React from 'react';
import { Image, View } from 'react-native';
import { NPC_SHEET } from './npcSheet';

/** One original sheet pixel -> this many screen px (a 48px-tall character ends up ~62px tall). */
const UNIT = 1.3;

/** A character from the user's sprite pack, sized by its original pixel size. */
export function NpcSprite({ char, scale = 1 }: { char: string; scale?: number }) {
  const c = NPC_SHEET[char];
  if (!c) return null;
  return (
    <View style={{ alignItems: 'center' }}>
      <Image source={c.src} resizeMode="contain" style={{ width: c.w * UNIT * scale, height: c.h * UNIT * scale }} />
    </View>
  );
}
