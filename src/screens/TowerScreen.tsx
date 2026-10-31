import React from 'react';
import { GameIcon, IconLabel } from '@/game/ui/GameIcon';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { MenuButton } from '@/game/menu/MenuButton';
import { checkpointFloor, startRun, useTower } from '@/game/state/towerState';
import { getStoryCharacter } from '@/game/story/characters';
import { getStoryCharacterId } from '@/game/state/questState';
import { getSession } from '@/game/state/session';
import { isTowerBossFloor, isTowerRivalFloor } from '@/game/battle/battleModes';
import { useI18n } from '@/game/i18n/i18n';

/** TORRE DE DESAFIOS: endless floors, one round each, local ranking. */
export function TowerScreen() {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const { best, ranking } = useTower();
  const checkpoint = checkpointFloor();
  const hasSession = !!getSession();

  const go = (floor: number) => {
    startRun(floor);
    router.push({ pathname: '/battle', params: { p1: getStoryCharacter(getStoryCharacterId()).fighter, p2Control: 'cpu', tower: String(floor) } });
  };
  const next = best + 1;
  const nextKind: 'boss' | 'rival' | '' = isTowerBossFloor(next) ? 'boss' : isTowerRivalFloor(next) ? 'rival' : '';

  return (
    <ArtBackdrop onBack={() => router.back()}>
      <Text style={styles.title}>{t('tower_title')}</Text>
      <Text style={styles.sub}>{t('tower_desc')}</Text>
      <View style={styles.cols}>
        <View style={styles.left}>
          <Text style={styles.best}>
            {t('tower_best')}: {best}
          </Text>
          {nextKind !== '' && (
            <IconLabel icon={nextKind === 'boss' ? 'skull' : 'swords'} size={16} textStyle={styles.kind}>
              {t('tower_floor')} {next}: {nextKind === 'boss' ? 'BOSS' : 'RIVAL'}
            </IconLabel>
          )}
          {hasSession ? (
            <>
              <MenuButton label={`${t('tower_start')} 1`} onPress={() => go(1)} />
              {checkpoint > 1 && <MenuButton label={`${t('tower_checkpoint')} ${checkpoint}`} variant="ghost" onPress={() => go(checkpoint)} />}
            </>
          ) : (
            <Text style={styles.note}>{t('tower_need_world')}</Text>
          )}
        </View>
        <View style={styles.right}>
          <IconLabel icon="trophy" size={16} textStyle={styles.rankTitle}>{t('tower_ranking')}</IconLabel>
          <ScrollView style={{ maxHeight: Math.max(120, height - 190) }} contentContainerStyle={{ gap: 4 }}>
            {ranking.length === 0 && <Text style={styles.note}>{t('tower_no_runs')}</Text>}
            {ranking.map((r, i) => (
              <View key={`${r.at}_${i}`} style={styles.rankRow}>
                <Text style={styles.rankPos}>{i + 1}.</Text>
                <Text style={styles.rankName} numberOfLines={1}>
                  {r.name} · {t('upgrade_level_abbr')} {r.level}
                </Text>
                <Text style={styles.rankFloor}>
                  {t('tower_floor')} {r.floor}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </ArtBackdrop>
  );
}

const styles = StyleSheet.create({
  title: { color: '#FFD700', fontWeight: '800', fontSize: 20, letterSpacing: 1 },
  sub: { color: '#fff', opacity: 0.8, fontSize: 11, maxWidth: 440, textAlign: 'center', marginBottom: 6 },
  cols: { flexDirection: 'row', gap: 26, alignItems: 'flex-start' },
  left: { gap: 10, alignItems: 'center' },
  right: { width: 250, gap: 6 },
  best: { color: '#9be89b', fontWeight: '800', fontSize: 16 },
  kind: { color: '#ff9f43', fontWeight: '800', fontSize: 12 },
  note: { color: '#fff', opacity: 0.7, fontSize: 11, maxWidth: 220 },
  rankTitle: { color: '#FFD700', fontWeight: '800', fontSize: 13 },
  rankRow: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  rankPos: { color: '#FFD700', fontWeight: '800', width: 20, fontSize: 12 },
  rankName: { color: '#fff', flex: 1, fontSize: 12 },
  rankFloor: { color: '#9be89b', fontWeight: '800', fontSize: 12 },
});
