import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MenuButton } from '@/game/menu/MenuButton';
import { useI18n } from '@/game/i18n/i18n';

interface Props {
  title: string;
  onAccept: () => void;
  onDecline: () => void;
}

/** Shown right after an NPC's dialogue closes, when they have an unstarted quest to offer. */
export function QuestOfferPrompt({ title, onAccept, onDecline }: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.row}>
          <MenuButton fit label={t('quest_accept')} onPress={onAccept} />
          <MenuButton fit compact label={t('quest_decline')} variant="ghost" onPress={onDecline} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  card: {
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 16,
    backgroundColor: '#151022',
    paddingVertical: 26,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 18,
    width: '86%',
    maxWidth: 340,
  },
  title: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 21 },
  row: { alignSelf: 'stretch', flexDirection: 'column', gap: 10 },
});
