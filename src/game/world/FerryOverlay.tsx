import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CURRENCY_ABBR } from '@/game/items/itemDefs';
import { spendCoins, usePlayerState } from '@/game/state/playerState';
import { ISLANDS, isIslandUnlocked, type IslandId } from '@/game/state/islandState';
import { MenuButton } from '@/game/menu/MenuButton';
import { useI18n } from '@/game/i18n/i18n';

interface Props {
  /** The stop the player is at right now (hidden from the destination list). */
  current?: IslandId | null;
  onClose: () => void;
  /** The player picked (and paid for) a destination: the world starts the boat trip. */
  onDepart: (island: IslandId) => void;
}

const ISLAND_NAME_KEY: Record<IslandId, string> = {
  main: 'island_main',
  main_west: 'island_main_west',
  gelo: 'island_gelo',
  misteriosa: 'island_misteriosa',
  fragments: 'island_fragments',
  vulcao: 'island_vulcao',
  trevas: 'island_trevas',
  camp: 'island_camp',
  dogisland: 'island_dogisland',
};

export function FerryOverlay({ current, onClose, onDepart }: Props) {
  const { t } = useI18n();
  const { coins } = usePlayerState();
  const { height } = useWindowDimensions();
  const [message, setMessage] = useState<string | null>(null);

  const pick = (id: IslandId) => {
    if (!isIslandUnlocked(id)) {
      setMessage(t('ferry_locked'));
      return;
    }
    const fare = ISLANDS[id].fare;
    if (!spendCoins(fare)) {
      setMessage(t('shop_insufficient'));
      return;
    }
    onDepart(id);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t('ferry_title')}</Text>
      <Text style={styles.coins}>
        {coins} {CURRENCY_ABBR}
      </Text>
      <ScrollView style={[styles.listScroll, { maxHeight: Math.max(120, height - 190) }]} contentContainerStyle={styles.list}>
        {Object.values(ISLANDS).filter((def) => def.id !== current).map((def) => {
          const unlocked = isIslandUnlocked(def.id);
          return (
            <Pressable key={def.id} style={[styles.row, !unlocked && styles.rowLocked]} onPress={() => pick(def.id)}>
              <Text style={styles.rowName}>{unlocked ? t(ISLAND_NAME_KEY[def.id]) : '???'}</Text>
              <Text style={styles.rowFare}>{unlocked ? `${def.fare} ${CURRENCY_ABBR}` : t('ferry_locked_short')}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {message && <Text style={styles.message}>{message}</Text>}
      <MenuButton label={t('ferry_close')} variant="ghost" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(6,14,26,0.96)', padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { color: '#FFD700', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  coins: { color: '#fff', opacity: 0.8, marginBottom: 16 },
  listScroll: { width: '100%', maxWidth: 360, flexGrow: 0 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.4)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  rowLocked: { opacity: 0.45, borderColor: 'rgba(255,255,255,0.2)' },
  rowName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rowFare: { color: '#FFD700', fontWeight: '700' },
  message: { color: '#ff8a8a', marginTop: 14, marginBottom: 6 },
});
