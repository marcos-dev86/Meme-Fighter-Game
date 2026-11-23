import React from 'react';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { SCREEN_SCENE } from '@/game/menu/sceneArt';
import { ButtonColumn, MenuButton } from '@/game/menu/MenuButton';
import { useI18n } from '@/game/i18n/i18n';

export function PlayMenuScreen() {
  const { t } = useI18n();
  return (
    <ArtBackdrop scene={SCREEN_SCENE.play} rail onBack={() => router.back()}>
      <ButtonColumn>
        <MenuButton label={t('play_versus')} onPress={() => router.push('/versus')} />
        <MenuButton label={t('play_story')} onPress={() => router.push('/slots' as never)} />
        <MenuButton label={t('play_training')} variant="ghost" onPress={() => router.push({ pathname: '/versus', params: { skipMode: '1' } })} />
        <MenuButton label={t('tut_button')} variant="ghost" onPress={() => router.push('/tutorial' as never)} />
      </ButtonColumn>
    </ArtBackdrop>
  );
}
