import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { ButtonColumn, MenuButton } from '@/game/menu/MenuButton';
import { useI18n } from '@/game/i18n/i18n';

export function ExitConfirmScreen() {
  const { t } = useI18n();
  const canQuit = Platform.OS === 'android';

  const handleConfirm = () => {
    if (Platform.OS === 'android') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BackHandler } = require('react-native');
      BackHandler.exitApp();
    }
  };

  return (
    <ArtBackdrop onBack={() => router.back()}>
      <ButtonColumn>
        <Text style={styles.question}>{t('exit_question')}</Text>
        {canQuit ? (
          <MenuButton label={t('exit_confirm')} variant="danger" onPress={handleConfirm} />
        ) : (
          <Text style={styles.note}>{t('exit_ios_note')}</Text>
        )}
        <MenuButton label={t('exit_cancel')} variant="ghost" onPress={() => router.back()} />
      </ButtonColumn>
    </ArtBackdrop>
  );
}

const styles = StyleSheet.create({
  question: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  note: { color: '#fff', opacity: 0.8, fontSize: 12, maxWidth: 280, textAlign: 'center' },
});
