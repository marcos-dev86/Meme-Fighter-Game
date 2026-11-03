import React from 'react';
import { isMissionRevealed } from '@/game/state/questState';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { useMissionList } from '@/game/state/questState';
import { useProgress } from '@/game/state/progressState';
import { GameIcon, IconLabel } from '@/game/ui/GameIcon';
import type { IconName } from '@/game/ui/iconRegistry';
import { useI18n } from '@/game/i18n/i18n';

const ICON: Record<string, IconName> = { battle: 'swords', discover: 'question', collect: 'sparkle', talk: 'bubble', quest: 'compass', deliver: 'parcel' };

/** "MISSÕES": every mission of the story grouped by chapter - done, the current one highlighted, locked ones hidden (no spoilers). */
export function MissionsScreen() {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const list = useMissionList();
  const progress = useProgress();
  const done = list.filter((m) => m.done).length;

  const chapters: { name: string; items: typeof list }[] = [];
  for (const m of list) {
    const last = chapters[chapters.length - 1];
    if (last && last.name === m.def.chapter) last.items.push(m);
    else chapters.push({ name: m.def.chapter, items: [m] });
  }

  return (
    <ArtBackdrop onBack={() => router.back()}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('missions_title')}</Text>
        <Text style={styles.count}>
          {t('missions_progress')}: {done}/{list.length}
        </Text>
        <Pressable style={styles.progressBtn} onPress={() => router.push('/progress' as never)}>
          <IconLabel icon={progress.platinum ? 'trophy' : 'target'} size={14} textStyle={styles.progressBtnText}>
            {t('progress_title')} {progress.percent}%
          </IconLabel>
        </Pressable>
      </View>
      <ScrollView style={{ maxHeight: Math.max(160, height - 150), width: 520, maxWidth: '100%' }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator>
        {chapters.map((ch) => {
          const visible = ch.items.some((m) => m.available || m.done);
          return (
            <View key={ch.name} style={styles.chapter}>
              <Text style={[styles.chapterName, !visible && styles.dim]}>{visible ? ch.name : '???'}</Text>
              {ch.items.map(({ def, done: isDone, available, current, progress, hint }) => {
                // Missões secretas ainda não descobertas aparecem como "???" (sem pista do que são).
                const shown = (isDone || available) && isMissionRevealed(def);
                return (
                  <View key={def.id} style={[styles.row, current && styles.rowCurrent, isDone && styles.rowDone]}>
                    <GameIcon name={isDone ? 'check' : shown ? ICON[def.type] ?? 'question' : 'lock'} size={18} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.mTitle, !shown && styles.dim]} numberOfLines={1}>
                        {shown ? def.title : def.secret ? '???' : t('missions_locked')}
                      </Text>
                      {shown && !isDone && (
                        <Text style={styles.mHint} numberOfLines={2}>
                          {hint}
                        </Text>
                      )}
                    </View>
                    {shown && !isDone && progress.total > 1 && (
                      <Text style={styles.prog}>
                        {progress.have}/{progress.total}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </ArtBackdrop>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 16, marginBottom: 8 },
  title: { color: '#FFD700', fontWeight: '800', fontSize: 20, letterSpacing: 1 },
  progressBtn: { backgroundColor: 'rgba(255,215,0,0.18)', borderColor: '#FFD700', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  progressBtnText: { color: '#FFD700', fontWeight: '800', fontSize: 12 },
  count: { color: '#fff', fontWeight: '700', fontSize: 13, opacity: 0.85 },
  scroll: { gap: 10, paddingBottom: 12 },
  chapter: { gap: 4 },
  chapterName: { color: '#FFD700', fontWeight: '800', fontSize: 12, letterSpacing: 1, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(10,10,18,0.6)', borderColor: 'rgba(255,215,0,0.25)', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  rowCurrent: { borderColor: '#FFD700', borderWidth: 2, backgroundColor: 'rgba(255,215,0,0.12)' },
  rowDone: { opacity: 0.55 },
  icon: { fontSize: 16, width: 22, textAlign: 'center', color: '#9be89b' },
  mTitle: { color: '#fff', fontWeight: '700', fontSize: 13 },
  mHint: { color: '#ddd', fontSize: 11, marginTop: 1 },
  dim: { opacity: 0.45 },
  prog: { color: '#FFD700', fontWeight: '800', fontSize: 12 },
});
