import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { MenuButton } from '@/game/menu/MenuButton';
import { ACTION_COLORS, ACTION_LABELS } from '@/game/input/ActionCluster';
import { GameIcon } from '@/game/ui/GameIcon';
import type { IconName } from '@/game/ui/iconRegistry';
import { useI18n } from '@/game/i18n/i18n';

/**
 * In-game tutorial: 10 short pages that explain every mechanic (moving,
 * action buttons, fights, exploring, missions, map, boats, items, saving)
 * WITHOUT naming characters, places or anything from the story. Reached
 * from JOGAR > TUTORIAL, and offered right after a new save is created
 * (`?next=world` -> finishing or skipping continues into the world).
 * SKIP is on screen on every page.
 */
const PAGES: { icon: IconName; legend?: boolean }[] = [
  { icon: 'wave' },
  { icon: 'joystick' },
  { icon: 'gamepad', legend: true },
  { icon: 'swords' },
  { icon: 'compass' },
  { icon: 'target' },
  { icon: 'map' },
  { icon: 'boat' },
  { icon: 'backpack' },
  { icon: 'disk' },
];

const LEGEND: { id: keyof typeof ACTION_COLORS; text: string }[] = [
  { id: 'jump', text: 'tut_btn_jump' },
  { id: 'flash', text: 'tut_btn_flash' },
  { id: 'shield', text: 'tut_btn_shield' },
  { id: 'strong', text: 'tut_btn_strong' },
  { id: 'super', text: 'tut_btn_super' },
  { id: 'aura', text: 'tut_btn_aura' },
  { id: 'item', text: 'tut_btn_item' },
];

export function TutorialScreen() {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ next?: string }>();
  const toWorld = params.next === 'world';
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  const leave = () => {
    if (toWorld) router.replace('/world');
    else router.back();
  };

  const p = PAGES[page];
  const lines = p.legend ? [] : t(`tut_${page + 1}_b`).split('\n');

  return (
    <ArtBackdrop>
      <View style={[styles.card, { maxHeight: height - 28 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>
            {t('tut_title')} · {page + 1}/{PAGES.length}
          </Text>
        </View>

        <ScrollView style={{ maxHeight: Math.max(110, height - 172) }} contentContainerStyle={styles.body} showsVerticalScrollIndicator>
          <View style={styles.titleRow}>
            <GameIcon name={p.icon} size={36} />
            <Text style={styles.title}>{t(`tut_${page + 1}_t`)}</Text>
          </View>
          {p.legend ? (
            <View style={styles.legendGrid}>
              {LEGEND.map((l) => (
                <View key={l.id} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: ACTION_COLORS[l.id].bg, borderColor: ACTION_COLORS[l.id].border }]}>
                    <Text style={[styles.dotText, { color: ACTION_COLORS[l.id].border }]} numberOfLines={1}>
                      {ACTION_LABELS[l.id]}
                    </Text>
                  </View>
                  <Text style={styles.legendText}>{t(l.text)}</Text>
                </View>
              ))}
            </View>
          ) : (
            lines.map((line, i) => (
                <View key={i} style={styles.lineRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.line}>{line}</Text>
                </View>
              ))
          )}
        </ScrollView>

        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View key={i} style={[styles.pip, i === page && styles.pipOn]} />
          ))}
        </View>

        <View style={styles.footer}>
          {page > 0 ? <MenuButton compact variant="ghost" label={t('tut_prev')} onPress={() => setPage(page - 1)} /> : <View style={{ width: 8 }} />}
          {last ? (
            <MenuButton compact label={toWorld ? t('tut_start') : t('tut_finish')} onPress={leave} />
          ) : (
            <MenuButton compact label={t('tut_next')} onPress={() => setPage(page + 1)} />
          )}
        </View>
      </View>

      {/* Always on screen: skip the whole tutorial. */}
      <Pressable style={[styles.skip, { top: insets.top + 10, right: insets.right + 14 }]} onPress={leave} hitSlop={8}>
        <Text style={styles.skipText}>{t('tut_skip')}</Text>
      </Pressable>
    </ArtBackdrop>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '92%',
    maxWidth: 600,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.6)',
    borderRadius: 14,
    backgroundColor: 'rgba(10,10,18,0.82)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 8,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { color: '#FFD700', fontWeight: '800', fontSize: 12, letterSpacing: 2, opacity: 0.8 },
  pageNo: { color: '#fff', opacity: 0.6, fontSize: 12, fontWeight: '700' },
  body: { gap: 8, paddingVertical: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  icon: { fontSize: 30 },
  title: { color: '#FFD700', fontWeight: '800', fontSize: 20, letterSpacing: 1, flexShrink: 1 },
  lineRow: { flexDirection: 'row', gap: 8 },
  bullet: { color: '#FFD700', fontSize: 14, lineHeight: 20 },
  line: { color: '#fff', fontSize: 14, lineHeight: 20, flex: 1 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '48%', minWidth: 230, flexGrow: 1 },
  dot: { width: 54, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontSize: 10, fontWeight: '800' },
  legendText: { color: '#fff', fontSize: 12, lineHeight: 15, flex: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  pip: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  pipOn: { backgroundColor: '#FFD700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skip: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.75)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(10,10,18,0.75)',
    zIndex: 20,
  },
  skipText: { color: '#FFD700', fontWeight: '800', fontSize: 12 },
});
