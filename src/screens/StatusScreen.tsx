import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { MenuButton } from '@/game/menu/MenuButton';
import { PowerPointsView } from '@/game/menu/PowerPointsView';
import { CosmeticBrowser } from '@/game/menu/CosmeticBrowser';
import { SkillTreeView } from '@/game/menu/SkillTreeView';
import { useI18n } from '@/game/i18n/i18n';
import { usePlayerState } from '@/game/state/playerState';

type Page = 'hub' | 'skills' | 'power' | 'visual';

/**
 * "STATUS" (menu de pausa): duas opções, ÁRVORE DE HABILIDADES e PONTOS DE PODER
 * (os 4 atributos). Voltar leva ao hub primeiro e depois sai da tela.
 */
export function StatusScreen() {
  const { t } = useI18n();
  const { statPoints } = usePlayerState();
  const [page, setPage] = useState<Page>('hub');

  const onBack = () => {
    if (page === 'hub') router.back();
    else setPage('hub');
  };

  return (
    <ArtBackdrop onBack={onBack}>
      {page === 'hub' && (
        <>
          <Text style={styles.title}>{t('status_title')}</Text>
          <Text style={styles.points}>
            {statPoints} {t('upgrade_points_abbr')}
          </Text>
          <View style={styles.hub}>
            <MenuButton label={t('status_skills')} onPress={() => setPage('skills')} />
            <MenuButton label={t('status_power')} onPress={() => setPage('power')} />
            <MenuButton label={t('status_visual')} onPress={() => setPage('visual')} />
          </View>
        </>
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
});
