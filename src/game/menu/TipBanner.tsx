import React from 'react';
import { GameIcon, IconLabel } from '@/game/ui/GameIcon';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearTips, dismissTip, useCurrentTip } from '@/game/state/tipsState';
import { setTips } from '@/game/state/settingsState';
import { useI18n } from '@/game/i18n/i18n';

/** The tip card: appears at the top, can be skipped or all tips turned off. */
export function TipBanner() {
  const id = useCurrentTip();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  if (!id) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 34 }]}>
      <View style={styles.card}>
        <IconLabel icon="bulb" size={14} textStyle={styles.head}>{t('tip_title')}</IconLabel>
        <Text style={styles.body}>{t(`tip_${id}` as never)}</Text>
        <View style={styles.row}>
          <Pressable onPress={dismissTip} style={styles.btn}>
            <Text style={styles.btnText}>OK</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setTips(false);
              clearTips();
            }}
            style={[styles.btn, styles.btnGhost]}
          >
            <Text style={styles.btnTextGhost}>{t('tip_off')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  card: { width: 340, maxWidth: '92%', backgroundColor: 'rgba(8,10,24,0.92)', borderColor: '#FFD700', borderWidth: 2, borderRadius: 12, padding: 10, gap: 6 },
  head: { color: '#FFD700', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  body: { color: '#fff', fontSize: 12, lineHeight: 16 },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  btn: { borderWidth: 2, borderColor: '#FFD700', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(255,215,0,0.2)' },
  btnGhost: { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'transparent' },
  btnText: { color: '#FFD700', fontWeight: '800', fontSize: 12 },
  btnTextGhost: { color: '#fff', opacity: 0.8, fontWeight: '700', fontSize: 11 },
});
