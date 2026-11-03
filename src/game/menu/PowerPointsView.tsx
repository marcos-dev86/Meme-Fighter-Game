import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { playSfx } from '@/game/audio/audioManager';
import { haptic } from '@/game/audio/haptics';
import { usePlayerState, buyUpgrade } from '@/game/state/playerState';
import { reportUpgrade } from '@/game/state/questState';
import {
  UPGRADE_STATS,
  UPGRADE_META,
  MAX_LEVEL,
  costForNextLevel,
  HEALTH_PER_LEVEL,
  AURA_PER_LEVEL,
  SPEED_PER_LEVEL,
  FORCE_PER_LEVEL,
  type UpgradeStat,
} from '@/game/items/upgrades';
import { useI18n } from '@/game/i18n/i18n';
import { GameIcon } from '@/game/ui/GameIcon';

const PER_LEVEL_VALUE: Record<UpgradeStat, number> = {
  health: HEALTH_PER_LEVEL,
  aura: Math.round(AURA_PER_LEVEL * 100),
  speed: Math.round(SPEED_PER_LEVEL * 100),
  force: Math.round(FORCE_PER_LEVEL * 100),
};

/** "PONTOS DE PODER": os 4 atributos (Vida, Aura, Velocidade, Força), pagos com pontos de status. Antes ficava na loja do Maximilian. */
export function PowerPointsView({ onClose }: { onClose?: () => void }) {
  const { t } = useI18n();
  const { height, width } = useWindowDimensions();
  const twoCols = width >= 640;
  const { upgrades, level, xp, xpNeeded, statPoints } = usePlayerState();
  const [flash, setFlash] = useState<UpgradeStat | null>(null);

  const handleBuy = (stat: UpgradeStat) => {
    const cost = costForNextLevel(upgrades[stat]);
    if (cost !== null && buyUpgrade(stat)) {
      reportUpgrade(cost);
      playSfx('levelup', { gain: 0.7 });
      haptic('success');
      setFlash(stat);
      setTimeout(() => setFlash(null), 500);
    } else {
      playSfx('ui_denied');
    }
  };

  return (
    <ScrollView style={[styles.card, { maxHeight: height - 110, width: twoCols ? Math.min(width - 40, 700) : 420 }]} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator>
      <View style={styles.header}>
        <Text style={styles.title}>{t('power_title')}</Text>
        <Text style={styles.coins}>
          {statPoints} {t('upgrade_points_abbr')}
        </Text>
      </View>
      <Text style={styles.subtitle}>{t('power_subtitle')}</Text>
      <View style={styles.xpBox}>
        <Text style={styles.xpText}>
          {t('upgrade_level_abbr')} {level}
          {xpNeeded > 0 ? `  ·  ${xp}/${xpNeeded} XP` : `  ·  ${t('upgrade_max')}`}
        </Text>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${xpNeeded > 0 ? Math.min(100, (xp / xpNeeded) * 100) : 100}%` }]} />
        </View>
      </View>

      <View style={styles.grid}>
      {UPGRADE_STATS.map((stat) => {
        const lv = upgrades[stat];
        const meta = UPGRADE_META[stat];
        const cost = costForNextLevel(lv);
        const canAfford = cost !== null && statPoints >= cost;
        return (
          <View key={stat} style={[styles.row, twoCols && styles.rowHalf, flash === stat && styles.rowFlash]}>
            <View style={styles.badge}>
              <GameIcon name={meta.icon} size={24} />
            </View>
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={styles.statName}>{t(`stat_${stat}`)}</Text>
                <Text style={styles.statLevel}>
                  {t('upgrade_level_abbr')} {lv}/{MAX_LEVEL}
                </Text>
              </View>
              <View style={styles.segments}>
                {Array.from({ length: MAX_LEVEL }).map((_, i) => (
                  <View key={i} style={[styles.segment, i < lv && styles.segmentFilled]} />
                ))}
              </View>
              <Text style={styles.statDesc}>{t(`power_per_${stat}`).replace('{n}', String(PER_LEVEL_VALUE[stat]))}</Text>
            </View>
            <Pressable style={[styles.buyBtn, (cost === null || !canAfford) && styles.buyBtnDisabled]} disabled={cost === null || !canAfford} onPress={() => handleBuy(stat)}>
              <Text style={styles.buyBtnText}>{cost === null ? t('upgrade_max') : `${cost} ${t('upgrade_points_abbr')}`}</Text>
            </Pressable>
          </View>
        );
      })}
      </View>
      {onClose && (
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>{t('inventory_close')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { maxWidth: '94%', backgroundColor: '#14141f', borderWidth: 2, borderColor: '#2c3e8c', borderRadius: 14, flexGrow: 0 },
  cardContent: { padding: 12, gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { color: '#7fa8ff', fontWeight: '800', fontSize: 17, letterSpacing: 1, flexShrink: 1 },
  coins: { color: '#fff', fontWeight: '700', fontSize: 13, backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  xpBox: { gap: 4, marginBottom: 4 },
  xpText: { color: '#9be89b', fontWeight: '800', fontSize: 12 },
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: '#4ade80' },
  subtitle: { color: '#aab4d8', fontSize: 11, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowHalf: { width: '48.8%' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(124,158,255,0.08)', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: 'rgba(124,158,255,0.25)' },
  rowFlash: { borderColor: '#7fa8ff', backgroundColor: 'rgba(124,158,255,0.22)' },
  badge: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#1f2a5c', borderWidth: 1, borderColor: '#4a65c4', alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  statName: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statLevel: { color: '#7fa8ff', fontWeight: '700', fontSize: 11 },
  segments: { flexDirection: 'row', gap: 2 },
  segment: { flex: 1, height: 7, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  segmentFilled: { backgroundColor: '#4ea1ff' },
  statDesc: { color: '#8a93b8', fontSize: 10 },
  buyBtn: { backgroundColor: '#2c3e8c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, minWidth: 68, alignItems: 'center' },
  buyBtnDisabled: { backgroundColor: '#2a2a35', opacity: 0.5 },
  buyBtnText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  closeBtn: { alignSelf: 'center', marginTop: 4, paddingVertical: 6, paddingHorizontal: 16 },
  closeBtnText: { color: '#aaa', fontWeight: '700', fontSize: 13 },
});
