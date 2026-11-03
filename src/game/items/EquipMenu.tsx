import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ITEMS } from '@/game/items/itemDefs';
import { isGear } from '@/game/items/gear';
import { usePlayerState } from '@/game/state/playerState';
import { useI18n } from '@/game/i18n/i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
  onUse: (slot: 0 | 1) => void;
  /** Where to open (next to the ITEM button) - see useItemMenuAnchor. */
  anchor: { left?: number; right?: number; bottom: number };
}

/** Small popup next to the ITEM button: the 2 equipped items, tap one to
 * use it right away. Equipping is done in the inventory screen. */
export function EquipMenu({ visible, onClose, onUse, anchor }: Props) {
  const { t } = useI18n();
  const ps = usePlayerState(); // re-renders when inventory/equipped change
  if (!visible) return null;
  const slots = ps.equippedItems;
  const inv = ps.inventory;
  return (
    <View style={[styles.wrap, anchor]} pointerEvents="box-none">
      <View style={styles.panel}>
        <Text style={styles.title}>{t('equip_title')}</Text>
        <View style={styles.row}>
          {([0, 1] as const).map((slot) => {
            const id = slots[slot];
            const def = id ? ITEMS[id] : null;
            return (
              <Pressable key={slot} style={[styles.slot, !def && styles.slotEmpty]} onPress={() => def && onUse(slot)} disabled={!def}>
                {def ? (
                  <>
                    {def.image ? <Image source={def.image} style={styles.img} resizeMode="contain" /> : <Text style={styles.emoji}>{def.icon}</Text>}
                    <Text style={styles.name} numberOfLines={1}>{def.name}</Text>
                    <Text style={styles.qty}>{isGear(def.id) ? t('equip_worn') : `×${inv[def.id] ?? 0}`}</Text>
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
  panel: {
    backgroundColor: 'rgba(10,10,18,0.92)',
    borderColor: '#FFD700',
    borderWidth: 2,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    gap: 6,
  },
  title: { color: '#FFD700', fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 8 },
  slot: {
    width: 84,
    height: 84,
    backgroundColor: '#373737',
    borderColor: '#a8a8a8',
    borderWidth: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  slotEmpty: { opacity: 0.55 },
  img: { width: 40, height: 40 },
  emoji: { fontSize: 32 },
  name: { color: '#fff', fontSize: 9, fontWeight: '700', marginTop: 2 },
  qty: { color: '#FFD700', fontSize: 10, fontWeight: '800' },
  empty: { color: '#ccc', fontSize: 9, textAlign: 'center' },
  close: { color: '#aaa', fontSize: 11, fontWeight: '700' },
});
