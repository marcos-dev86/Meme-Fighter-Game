import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTIES, DIFFICULTY_PARAMS, type Difficulty } from '@/game/state/difficulty';
import { useI18n } from '@/game/i18n/i18n';

interface Props {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}

/** Row of the 5 difficulty chips + a one-line description of the chosen one. */
export function DifficultyPicker({ value, onChange }: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {DIFFICULTIES.map((d) => {
          const on = d === value;
          const color = DIFFICULTY_PARAMS[d].color;
          return (
            <Pressable key={d} onPress={() => onChange(d)} style={[styles.chip, { borderColor: color }, on && { backgroundColor: color }]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                {t(`difficulty_${d}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.desc}>{t(`difficulty_${value}_desc`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, maxWidth: 560 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  chip: { borderWidth: 2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(10,10,18,0.55)' },
  chipText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  chipTextOn: { color: '#1a1200' },
  desc: { color: '#fff', opacity: 0.85, fontSize: 12, textAlign: 'center' },
});
