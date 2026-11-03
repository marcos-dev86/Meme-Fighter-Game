import React, { useEffect, useState } from 'react';
import { isGamePaused } from '@/game/state/pauseState';
import { Image, View } from 'react-native';

/* eslint-disable @typescript-eslint/no-require-imports */
// Frame-strip animations (Super Pixel Effects pack, 15 fps): every effect is
// ONE image with all frames side by side, so a running effect costs a
// single bitmap + a clipped view, not one file per frame.
const EFFECTS = {
  hit_flash: { src: require('../../../assets/effects/hit_flash.png'), frames: 7, w: 96, h: 96 },
  hit_strong: { src: require('../../../assets/effects/hit_strong.png'), frames: 7, w: 96, h: 96 },
  hit_ult: { src: require('../../../assets/effects/hit_ult.png'), frames: 13, w: 128, h: 128 },
  hit_block: { src: require('../../../assets/effects/hit_block.png'), frames: 10, w: 96, h: 96 },
  item_heal: { src: require('../../../assets/effects/item_heal.png'), frames: 16, w: 128, h: 128 },
  item_attack: { src: require('../../../assets/effects/item_attack.png'), frames: 18, w: 128, h: 128 },
  item_haste: { src: require('../../../assets/effects/item_haste.png'), frames: 29, w: 128, h: 128 },
  item_guard: { src: require('../../../assets/effects/item_guard.png'), frames: 18, w: 128, h: 128 },
  charge_up: { src: require('../../../assets/effects/charge_up.png'), frames: 12, w: 96, h: 96 },
  bomb: { src: require('../../../assets/effects/bomb.png'), frames: 10, w: 96, h: 96 },
};
/* eslint-enable @typescript-eslint/no-require-imports */

export type EffectName = keyof typeof EFFECTS;

const FRAME_MS = 67;

interface Props {
  name: EffectName;
  /** Centre of the effect, in the parent's coordinate space. */
  x: number;
  y: number;
  /** On-screen width/height of ONE frame. */
  size?: number;
  onDone?: () => void;
}

/** Plays an effect once, centred on (x, y), then calls onDone. */
export function SpriteEffect({ name, x, y, size = 96, onDone }: Props) {
  const fx = EFFECTS[name];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      if (isGamePaused()) return;
      i += 1;
      if (i >= fx.frames) {
        clearInterval(id);
        onDone?.();
      } else {
        setFrame(i);
      }
    }, FRAME_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scale = size / fx.w;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - size / 2, top: y - (fx.h * scale) / 2, width: size, height: fx.h * scale, overflow: 'hidden' }}>
      <Image
        source={fx.src}
        resizeMode="stretch"
        style={{ position: 'absolute', top: 0, left: -frame * size, width: fx.frames * size, height: fx.h * scale }}
      />
    </View>
  );
}
