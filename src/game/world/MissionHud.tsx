import React from 'react';
import { IconLabel } from '@/game/ui/GameIcon';
import type { IconName } from '@/game/ui/iconRegistry';
import { StyleSheet, Text, View } from 'react-native';
import { useCurrentMission } from '@/game/state/questState';

const TYPE_ICON: Record<string, IconName> = { quest: 'compass', deliver: 'parcel', battle: 'swords', discover: 'question', collect: 'sparkle', talk: 'bubble' };

export function MissionHud({ top, left = 12 }: { top: number; left?: number }) {
  const mission = useCurrentMission();
  if (!mission || mission.status === 'completed') return null;

  return (
    <View style={[styles.root, { top, left }]} pointerEvents="none">
      <IconLabel icon={TYPE_ICON[mission.type] ?? 'question'} size={14} textStyle={styles.title} numberOfLines={1}>
        {mission.title}
      </IconLabel>
      {mission.progress.total > 1 ? (
        <Text style={styles.progress}>
          {mission.progress.have}/{mission.progress.total}
        </Text>
      ) : null}
      {/* numberOfLines=1 caps this at a single line - in landscape mode
       * (little vertical room to begin with) an unbounded 2-3 line hint
       * plus the title above could grow tall enough to sit on top of the
       * DPad below it (see docs/AUDIT.md). Capping the height here is more
       * robust than nudging `top`, since it holds regardless of how long
       * a future mission's hint text ends up being. */}
      <Text style={styles.hint} numberOfLines={1} ellipsizeMode="tail">
        {mission.hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    maxWidth: 240,
    backgroundColor: 'rgba(10,10,18,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  title: { color: '#FFD700', fontWeight: '700', fontSize: 12 },
  progress: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 1 },
  hint: { color: '#e8e8e8', fontSize: 10, marginTop: 2, opacity: 0.85 },
});
