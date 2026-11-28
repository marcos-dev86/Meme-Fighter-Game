import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { SCREEN_SCENE } from '@/game/menu/sceneArt';
import { MenuButton } from '@/game/menu/MenuButton';
import { PowerPointsView } from '@/game/menu/PowerPointsView';
import { CosmeticBrowser } from '@/game/menu/CosmeticBrowser';
import { SkillTreeView } from '@/game/menu/SkillTreeView';
import { CharacterInfoPanel } from '@/game/menu/CharacterInfoPanel';
import { getMissionCountsSplit, getStoryCharacterId } from '@/game/state/questState';
import { getEnding } from '@/game/state/storyFlags';
import { useI18n } from '@/game/i18n/i18n';
import { useWindowDimensions } from 'react-native';
import { usePlayerState } from '@/game/state/playerState';

type Page = 'hub' | 'skills' | 'power' | 'visual' | 'character';

/**
 * "STATUS" (menu de pausa): duas opções, ÁRVORE DE HABILIDADES e PONTOS DE PODER
 * (os 4 atributos). Voltar leva ao hub primeiro e depois sai da tela.
 */
export function StatusScreen() {
  const { t } = useI18n();
  const { statPoints } = usePlayerState();
  const [page, setPage] = useState<Page>('hub');
  const { height } = useWindowDimensions();

  const onBack = () => {
    if (page === 'hub') router.back();
    else setPage('hub');
  };

  return (
    <ArtBackdrop scene={SCREEN_SCENE.status} rail onBack={onBack}>
      {page === 'hub' && (
        <>
          <Text style={styles.title}>{t('status_title')}</Text>
          <Text style={styles.points}>
            {statPoints} {t('upgrade_points_abbr')}
          </Text>
          <View style={styles.hub}>
            <MenuButton label={t('status_character')} onPress={() => setPage('character')} />
            <MenuButton label={t('status_skills')} onPress={() => setPage('skills')} />
            <MenuButton label={t('status_power')} onPress={() => setPage('power')} />
            <MenuButton label={t('status_visual')} onPress={() => setPage('visual')} />
          </View>
        </>
      )}
      {page === 'character' && (
        <View style={styles.charPanel}>
          <CharacterInfoPanel characterId={getStoryCharacterId()} progress={getMissionCountsSplit().main} secrets={getMissionCountsSplit().secret} endingSeen={!!getEnding()} maxHeight={Math.max(200, height - 130)} />
        </View>
      )}
      {page === 'skills' && <SkillTreeView />}
      {page === 'power' && <PowerPointsView />}
      {page === 'visual' && <CosmeticBrowser mode="wardrobe" />}
    </ArtBackdrop>
  );
}

const styles = StyleSheet.create({
  title: { color: '#FFD700', fontSize: 24, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  points: { color: '#fff', fontWeight: '800', backgroundColor: 'rgba(255,215,0,0.18)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  hub: { gap: 10, alignItems: 'center' },
  charPanel: { width: '92%', maxWidth: 560, backgroundColor: 'rgba(8,10,28,0.78)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', padding: 12, marginBottom: 56 },
});
