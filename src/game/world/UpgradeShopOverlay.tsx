import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePlayerState, buyUpgrade } from '@/game/state/playerState';
import { reportUpgrade } from '@/game/state/questState';
import { UPGRADE_STATS, UPGRADE_META, MAX_LEVEL, costForNextLevel, type UpgradeStat } from '@/game/items/upgrades';
import { useI18n } from '@/game/i18n/i18n';
import { SkillTreeView } from '@/game/menu/SkillTreeView';

/**
 * Maximilian's shop (see docs/AUDIT.md) - permanent stat levels, 1-10,
 * inspired by the reference image the user sent: a diamond icon next to
 * a segmented bar per stat. That image showed Stamina/Health/Defense;
 * this game's four stats are Vida/Aura/Velocidade/Força (see
 * upgrades.ts) - same visual idea, this project's own attributes.
 */

const SEGMENTS = MAX_LEVEL;

export function UpgradeShopOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const { upgrades, level, xp, xpNeeded, statPoints } = usePlayerState();
  const [flash, setFlash] = useState<UpgradeStat | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);

  const handleBuy = (stat: UpgradeStat) => {
    const cost = costForNextLevel(upgrades[stat]);
    if (cost !== null && buyUpgrade(stat)) {
      reportUpgrade(cost);
      setFlash(stat);
      setTimeout(() => setFlash(null), 500);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.bg}>
        <ScrollView style={[styles.card, { maxHeight: height - 16 }]} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator>
          <View style={styles.header}>
            <Text style={styles.title}>{t('upgrade_shop_title')}</Text>
            <Text style={styles.coins}>
              {statPoints} {t('upgrade_points_abbr')}
            </Text>
          </View>
          <Text style={styles.subtitle}>{t('upgrade_shop_subtitle')}</Text>
          <View style={styles.xpBox}>
            <Text style={styles.xpText}>
              {t('upgrade_level_abbr')} {level}
              {xpNeeded > 0 ? `  ·  ${xp}/${xpNeeded} XP` : '  ·  MÁX.'}
            </Text>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${xpNeeded > 0 ? Math.min(100, (xp / xpNeeded) * 100) : 100}%` }]} />
            </View>
          </View>

          {UPGRADE_STATS.map((stat) => {
            const level = upgrades[stat];
            const meta = UPGRADE_META[stat];
            const cost = costForNextLevel(level);
            const canAfford = cost !== null && statPoints >= cost;
            return (
              <View key={stat} style={[styles.row, flash === stat && styles.rowFlash]}>
                <View style={styles.badge}>
                  <Text style={styles.badgeIcon}>{meta.icon}</Text>
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.statName}>{meta.name}</Text>
                    <Text style={styles.statLevel}>
                      {t('upgrade_level_abbr')} {level}/{MAX_LEVEL}
                    </Text>
                  </View>
                  <View style={styles.segments}>
                    {Array.from({ length: SEGMENTS }).map((_, i) => (
                      <View key={i} style={[styles.segment, i < level && styles.segmentFilled]} />
                    ))}
                  </View>
                  <Text style={styles.statDesc}>{meta.perLevel}</Text>
                </View>
                <Pressable
                  style={[styles.buyBtn, (cost === null || !canAfford) && styles.buyBtnDisabled]}
                  disabled={cost === null || !canAfford}
                  onPress={() => handleBuy(stat)}
                >
                  <Text style={styles.buyBtnText}>{cost === null ? t('upgrade_max') : `${cost} ${t('upgrade_points_abbr')}`}</Text>
                </Pressable>
              </View>
            );
          })}

          <Pressable style={[styles.closeBtn, { borderColor: '#ff9f43' }]} onPress={() => setTreeOpen(true)}>
            <Text style={[styles.closeBtnText, { color: '#ff9f43' }]}>🌳 {t('skills_title')}</Text>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t('inventory_close')}</Text>
          </Pressable>
        </ScrollView>
      </View>
      {treeOpen && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setTreeOpen(false)}>
          <View style={styles.bg}>
            <View style={{ backgroundColor: '#14141f', borderWidth: 2, borderColor: '#ff9f43', borderRadius: 14, padding: 6 }}>
              <SkillTreeView onClose={() => setTreeOpen(false)} />
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: 380,
    maxWidth: '92%',
    backgroundColor: '#14141f',
    borderWidth: 2,
    borderColor: '#2c3e8c',
    borderRadius: 14,
    flexGrow: 0,
  },
  cardContent: { padding: 14, gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#7fa8ff', fontWeight: '800', fontSize: 18, letterSpacing: 1 },
  coins: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  xpBox: { gap: 4, marginBottom: 4 },
  xpText: { color: '#9be89b', fontWeight: '800', fontSize: 12 },
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: '#4ade80' },
  subtitle: { color: '#aab4d8', fontSize: 11, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(124,158,255,0.08)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(124,158,255,0.25)',
  },
  rowFlash: { borderColor: '#7fa8ff', backgroundColor: 'rgba(124,158,255,0.22)' },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#1f2a5c',
    borderWidth: 1,
    borderColor: '#4a65c4',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  badgeIcon: { fontSize: 16, transform: [{ rotate: '-45deg' }] },
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
