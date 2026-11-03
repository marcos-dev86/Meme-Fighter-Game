import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { useI18n } from '@/game/i18n/i18n';

export function CreditsScreen() {
  const { t } = useI18n();
  return (
    <ArtBackdrop onBack={() => router.back()}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('credits_title')}</Text>
        <Text style={styles.line}>{t('credits_direction')}</Text>
        <Text style={styles.line}>{t('credits_school')}</Text>
        <Text style={styles.small}>{t('credits_music')}</Text>
      </View>
    </ArtBackdrop>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 8 },
  title: { color: '#FFD700', fontWeight: '700', fontSize: 20, marginBottom: 12 },
  small: { color: '#fff', fontSize: 11, opacity: 0.7, marginTop: 10 },
  line: { color: '#fff', fontSize: 14, opacity: 0.9 },
});
