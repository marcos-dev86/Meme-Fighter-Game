import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { useI18n } from '@/game/i18n/i18n';

export function ControlsInfoScreen() {
  const { t } = useI18n();
  return (
    <ArtBackdrop onBack={() => router.back()}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('controls_title')}</Text>
        <Text style={styles.line}>{t('controls_world')}</Text>
        <Text style={styles.line}>{t('controls_battle')}</Text>
        <Text style={styles.line}>{t('controls_shield')}</Text>
      </View>
    </ArtBackdrop>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.6)',
    borderRadius: 12,
    backgroundColor: 'rgba(10,10,18,0.7)',
    paddingVertical: 24,
    paddingHorizontal: 28,
    gap: 10,
    maxWidth: 420,
  },
  title: { color: '#FFD700', fontWeight: '700', fontSize: 18, marginBottom: 8, textAlign: 'center' },
  line: { color: '#fff', fontSize: 13, opacity: 0.9 },
});
