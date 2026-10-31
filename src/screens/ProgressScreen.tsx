import React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { useProgress, PROGRESS_LEVEL_TARGET } from '@/game/state/progressState';
import { GameIcon, IconLabel } from '@/game/ui/GameIcon';
import type { IconName } from '@/game/ui/iconRegistry';
import { useI18n } from '@/game/i18n/i18n';

const ICON: Record<string, IconName> = {
  missions: 'scroll',
  map: 'map',
  npcs: 'bubble',
  chests: 'gift',
  islands: 'boat',
  buildings: 'house',
  level: 'arrow_up',
  points: 'fist',
  shop: 'cart',
  casino: 'dice',
  cosmetics: 'crown',
  choices: 'bubble',
  ending: 'trophy',
  monsters: 'skull',
};

/** "PROGRESSO": how much of the game is done (0% -> 100% = platina), broken down by category. */
export function ProgressScreen() {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const info = useProgress();

  return (
    <ArtBackdrop onBack={() => router.back()}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('progress_title')}</Text>
        <IconLabel icon={info.platinum ? 'trophy' : 'target'} size={20} gap={6} textStyle={[styles.percent, info.platinum && styles.percentGold]}>{`${info.percent}%`}</IconLabel>
      </View>
      <View style={styles.totalTrack}>
        <View style={[styles.totalFill, { width: `${info.percent}%` }, info.platinum && styles.totalFillGold]} />
      </View>
      {info.platinum && <Text style={styles.platinum}>{t('progress_platinum')}</Text>}
      <ScrollView style={{ maxHeight: Math.max(150, height - 190), width: 520, maxWidth: '100%' }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator>
        {info.categories.map((c) => {
          const done = c.pct >= 1;
          return (
            <View key={c.id} style={[styles.row, done && styles.rowDone]}>
              <GameIcon name={done ? 'check' : ICON[c.id] ?? 'dot'} size={20} />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {t(`progress_${c.id}`)}
                  </Text>
                  <Text style={styles.count}>
                    {c.id === 'level' ? `${c.have}/${PROGRESS_LEVEL_TARGET}` : c.id === 'map' ? `${Math.round(c.pct * 100)}%` : `${c.have}/${c.total}`}
                  </Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round(c.pct * 100)}%` }, done && styles.fillDone]} />
                </View>
              </View>
              <Text style={styles.weight}>{c.weight}%</Text>
            </View>
          );
        })}
      </ScrollView>
    </ArtBackdrop>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 16, marginBottom: 6 },
  title: { color: '#FFD700', fontWeight: '800', fontSize: 20, letterSpacing: 1 },
  percent: { color: '#fff', fontWeight: '800', fontSize: 22 },
  percentGold: { color: '#FFD700' },
  totalTrack: { width: 520, maxWidth: '100%', height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginBottom: 8 },
  totalFill: { height: '100%', backgroundColor: '#4ade80' },
  totalFillGold: { backgroundColor: '#FFD700' },
  platinum: { color: '#FFD700', fontWeight: '800', fontSize: 13, marginBottom: 6, textAlign: 'center' },
  scroll: { gap: 6, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(10,10,18,0.6)', borderColor: 'rgba(255,215,0,0.25)', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  rowDone: { borderColor: 'rgba(155,232,155,0.6)' },
  icon: { fontSize: 16, width: 22, textAlign: 'center', color: '#9be89b' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: '#fff', fontWeight: '700', fontSize: 13, flexShrink: 1 },
  count: { color: '#FFD700', fontWeight: '800', fontSize: 12 },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#4ea1ff' },
  fillDone: { backgroundColor: '#4ade80' },
  weight: { color: '#aaa', fontSize: 10, width: 30, textAlign: 'right' },
});
