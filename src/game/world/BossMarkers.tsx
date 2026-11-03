import React from 'react';
import { GameIcon } from '@/game/ui/GameIcon';
import { Image, StyleSheet, Text, View } from 'react-native';
import { BOSSES, isBossDefeated, useBosses } from '@/game/state/bossState';
import { getIdleAspect, getSprite } from '@/game/battle/sprites';

/**
 * The world bosses waiting on their islands (see state/bossState.ts). They
 * stay on screen until beaten for the first time; walk up to one and the
 * DESAFIAR button appears (WorldScreen).
 */
export function BossMarkers({ tileSize }: { tileSize: number }) {
  useBosses(); // re-render when one is defeated
  return (
    <>
      {BOSSES.filter((b) => b.spot && !isBossDefeated(b.id)).map((b) => {
        const h = b.character === 'shadow_dragon' ? 92 : 78;
        const w = h * getIdleAspect(b.character);
        return (
          <View key={b.id} pointerEvents="none" style={[styles.slot, { left: b.spot!.x * tileSize + tileSize / 2 - w / 2, top: b.spot!.y * tileSize + tileSize - h }]}>
            <GameIcon name="skull" size={16} style={styles.mark} />
            <Image source={getSprite(b.character, 'idle')} resizeMode="contain" style={{ width: w, height: h }} />
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', alignItems: 'center' },
  mark: { fontSize: 16, position: 'absolute', top: -18 },
});
