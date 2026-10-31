import React from 'react';
import { GameIcon } from '@/game/ui/GameIcon';
import { StyleSheet, Text, View } from 'react-native';

export interface ArrowState {
  /** radians, 0 = pointing right */
  angle: number;
  /** distance in tiles */
  dist: number;
  /** true = the target is on another island: the arrow points at the ferry */
  viaFerry: boolean;
}

const RING = 64; // px from the player's centre

/** Gold arrow circling the player (the camera keeps the player at screen
 * centre) pointing at the current mission. Hidden on HARDCORE. */
export function MissionArrow({ arrow, cx, cy }: { arrow: ArrowState | null; cx: number; cy: number }) {
  if (!arrow) return null;
  const x = cx + Math.cos(arrow.angle) * RING;
  const y = cy + Math.sin(arrow.angle) * RING;
  const label = `${Math.round(arrow.dist)}`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.arrowWrap, { left: x - 16, top: y - 16, transform: [{ rotate: `${arrow.angle}rad` }] }]}>
        <GameIcon name="arrow" size={30} style={{ opacity: 0.92 }} />
      </View>
      {arrow.viaFerry && <GameIcon name="boat" size={14} style={{ position: 'absolute', left: cx + Math.cos(arrow.angle) * (RING + 30) - 34, top: cy + Math.sin(arrow.angle) * (RING + 30) - 8 }} />}
      <Text style={[styles.dist, { left: cx + Math.cos(arrow.angle) * (RING + 30) - 24, top: cy + Math.sin(arrow.angle) * (RING + 30) - 8 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  arrowWrap: { position: 'absolute', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: '#FFD700', fontSize: 28, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 4, opacity: 0.92 },
  dist: { position: 'absolute', width: 48, textAlign: 'center', color: '#fff', fontSize: 11, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 3 },
});
