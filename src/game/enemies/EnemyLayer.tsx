import React, { useEffect, useState } from 'react';
import { isGamePaused } from '@/game/state/pauseState';
import { Image, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { ENEMY_DEFS, enemySprite } from './enemyDefs';
import { GameIcon } from '@/game/ui/GameIcon';
import { POOL, type EnemyManager, type SlotInfo } from './enemySim';

/**
 * Draws the enemies the manager has put in its render slots. Positions,
 * health bars and hit flashes are shared values the game loop writes
 * directly, so nothing re-renders per frame except the sprite animation.
 */
export function EnemyLayer({ manager }: { manager: EnemyManager }) {
  const [info, setInfo] = useState<(SlotInfo | null)[]>(() => Array.from({ length: POOL }, () => null));
  useEffect(() => {
    manager.onSlots(setInfo);
    return () => manager.onSlots(null);
  }, [manager]);
  return (
    <>
      {info.map((slot, i) => (
        <EnemyView key={i} index={i} manager={manager} slot={slot} />
      ))}
    </>
  );
}

function EnemyView({ index, manager, slot }: { index: number; manager: EnemyManager; slot: SlotInfo | null }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const hp = useSharedValue(1);
  const flash = useSharedValue(0);
  const face = useSharedValue(1);
  const dying = useSharedValue(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    manager.bindSlot(index, { x, y, hp, flash, face, dying });
    return () => manager.bindSlot(index, null);
  }, [manager, index, x, y, hp, flash, face, dying]);

  const type = slot?.type;
  useEffect(() => {
    if (!type) return;
    const t = setInterval(() => {
      if (!isGamePaused()) setTick((n) => n + 1);
    }, ENEMY_DEFS[type].frameMs);
    return () => clearInterval(t);
  }, [type]);

  const def = type ? ENEMY_DEFS[type] : null;
  const sprite = type && slot ? enemySprite(type, slot.variant, tick) : null;
  // Elite (Parte 2.3): mesmo sprite, maior, com aura dourada e coroa (sem arte nova).
  const elite = !!slot?.elite;
  const es = slot?.eliteScale ?? 1;
  const dw = sprite && def ? sprite.w * def.scale * es : 0;
  const dh = sprite && def ? sprite.h * def.scale * es : 0;

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: 1 - dying.value,
    transform: [{ translateX: x.value - dw / 2 }, { translateY: y.value - dh * 0.62 }, { scale: 1 - dying.value * 0.4 }],
  }));
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: face.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.75 }));
  const barStyle = useAnimatedStyle(() => ({ width: `${hp.value * 100}%` }));
  const barWrapStyle = useAnimatedStyle(() => ({ opacity: hp.value < 0.999 ? 1 : 0 }));

  if (!sprite || !def) return null;
  // Bats hover a little higher than ground creatures.
  const lift = def.fly ? 10 : 0;
  return (
    <Animated.View testID={elite ? 'enemy-elite' : undefined} pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: dw, height: dh }, wrapStyle]}>
      {elite && <View style={{ position: 'absolute', left: -dw * 0.18, top: dh * 0.08, width: dw * 1.36, height: dh * 1.0, borderRadius: dw, backgroundColor: 'rgba(255,200,40,0.28)', borderWidth: 2, borderColor: 'rgba(255,215,0,0.7)' }} />}
      <Animated.View style={[{ position: 'absolute', top: -lift, width: dw, height: dh }, faceStyle]}>
        <Image source={sprite.src} resizeMode="stretch" style={{ width: dw, height: dh }} />
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: dw, height: dh }, flashStyle]}>
          <Image source={sprite.src} resizeMode="stretch" style={{ width: dw, height: dh, tintColor: '#ff3b30' }} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: dw / 2 - (elite ? 24 : 16), top: -lift - 9, width: elite ? 48 : 32, height: elite ? 5 : 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 2, overflow: 'hidden' }, barWrapStyle]}>
        <Animated.View style={[{ height: elite ? 5 : 4, backgroundColor: elite ? '#ffd700' : '#e74c3c' }, barStyle]} />
      </Animated.View>
      {elite && (
        <View style={{ position: 'absolute', left: dw / 2 - 9, top: -lift - 28 }}>
          <GameIcon name="crown" size={18} />
        </View>
      )}
    </Animated.View>
  );
}
