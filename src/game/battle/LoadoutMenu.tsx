import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ITEMS } from '@/game/items/itemDefs';
import { useI18n } from '@/game/i18n/i18n';

interface Props {
  visible: boolean;
  items: (string | null)[];
  onClose: () => void;
  onUse: (slot: 0 | 1) => void;
  anchor: { left?: number; right?: number; bottom: number };
}

/** Menu do botão ITEM no VERSUS: os 2 itens sorteados antes da luta (uso único). */
export function LoadoutMenu({ visible, items, onClose, onUse, anchor }: Props) {
  const { t } = useI18n();
  if (!visible) return null;
  return (
    <View style={[styles.wrap, anchor]} pointerEvents="box-none">
      <View style={styles.panel}>
        <Text style={styles.title}>{t('versus_items_title')}</Text>
        <View style={styles.row}>
          {([0, 1] as const).map((slot) => {
            const def = items[slot] ? ITEMS[items[slot] as string] : null;
            return (
              <Pressable key={slot} style={[styles.slot, !def && styles.slotEmpty]} onPress={() => def && onUse(slot)} disabled={!def}>
                {def ? (
                  <>
                    <Image source={def.image} style={styles.img} resizeMode="contain" />
                    <Text style={styles.name} numberOfLines={1}>
                      {def.name}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.empty}>{t('equip_empty')}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={styles.close}>{t('inventory_close')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
  panel: { backgroundColor: 'rgba(10,10,18,0.92)', borderColor: '#FFD700', borderWidth: 2, borderRadius: 10, padding: 8, alignItems: 'center', gap: 6 },
  title: { color: '#FFD700', fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 8 },
  slot: { width: 84, height: 84, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', gap: 2 },
  slotEmpty: { opacity: 0.4 },
  img: { width: 40, height: 40 },
  name: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { color: '#aaa', fontSize: 10 },
  close: { color: '#aaa', fontSize: 11 },
});
