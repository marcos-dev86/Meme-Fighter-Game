import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RARITY_COLOR, rarityKey } from '@/game/items/rarity';
import { useI18n } from '@/game/i18n/i18n';
import { playSfx } from '@/game/audio/audioManager';
import { ACH_BY_ID, achDesc, achTitle } from './achievementDefs';
import { DIAMOND_RATES } from './accountConfig';
import { AchievementIcon } from './AchievementIcon';
import { subscribeAchievementToasts, takeAchievementToast } from './accountState';

/** Aviso de conquista desbloqueada: desce do topo, em qualquer tela (mundo, luta, menus). Uma de cada vez. */
export function AchievementToast() {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [id, setId] = useState<string | null>(null);
  const busy = useRef(false);
  const y = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    const next = () => {
      if (busy.current) return;
      const n = takeAchievementToast();
      if (!n) return;
      busy.current = true;
      setId(n);
      playSfx('levelup');
      Animated.sequence([
        Animated.timing(y, { toValue: 0, duration: 350, useNativeDriver: Platform.OS !== 'web' }),
        Animated.delay(3200),
        Animated.timing(y, { toValue: -120, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      ]).start(() => {
        busy.current = false;
        setId(null);
        next();
      });
    };
    const off = subscribeAchievementToasts(next);
    next();
    return off;
  }, [y]);

  const def = id ? ACH_BY_ID[id] : null;
  if (!def) return null;
  const color = RARITY_COLOR[def.rarity];
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8, transform: [{ translateY: y }] }]} testID="achievement-toast">
      <View style={[styles.card, { borderColor: color }]}>
        <View style={[styles.icon, { borderColor: color }]}>
          <AchievementIcon id={def.id} size={32} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.head, { color }]}>
            {t('ach_toast')} · {t(rarityKey(def.rarity))}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {achTitle(def, lang)}
          </Text>
          <Text style={styles.desc} numberOfLines={2}>
            {achDesc(def, lang)}
          </Text>
        </View>
        <Text style={styles.reward}>+{DIAMOND_RATES.achievement[def.rarity]} 💎</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 999 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 420, maxWidth: '94%', backgroundColor: 'rgba(14,10,4,0.96)', borderWidth: 3, borderRadius: 12, padding: 10 },
  icon: { width: 48, height: 48, borderRadius: 10, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  head: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: '900' },
  desc: { color: '#d8cba4', fontSize: 11, fontWeight: '600' },
  reward: { color: '#8BE9FF', fontSize: 13, fontWeight: '900' },
});
