import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { ButtonColumn, MenuButton } from '@/game/menu/MenuButton';
import { useI18n } from '@/game/i18n/i18n';

export function HomeScreen() {
  const { t } = useI18n();
  return (
    <ArtBackdrop>
      <Image source={require('../../assets/images/game-logo-gold.png')} style={styles.logo} resizeMode="contain" />
      <ButtonColumn>
        <MenuButton label={t('home_play')} onPress={() => router.push('/play')} />
        <MenuButton label={t('home_options')} onPress={() => router.push('/options')} />
        <MenuButton label={t('home_exit')} variant="danger" onPress={() => router.push('/exit-confirm')} />
      </ButtonColumn>
    </ArtBackdrop>
  );
}

const styles = StyleSheet.create({
  // Mascot + wordmark recoloured gold for this dark animated backdrop -
  // the source art is solid black, which would be invisible here (see
  // docs/AUDIT.md's notes on the logo assets).
  logo: { width: 170, height: 170, marginBottom: 4 },
});
