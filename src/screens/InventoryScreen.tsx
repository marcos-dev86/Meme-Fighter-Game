import React, { useState } from 'react';
import { GameIcon } from '@/game/ui/GameIcon';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { CURRENCY_ABBR, ITEMS, isUsable } from '@/game/items/itemDefs';
import { usePlayerState, equipItem, equipBag, getBagUsage, getOwnedBags } from '@/game/state/playerState';
import { BAGS } from '@/game/items/bags';
import { RARITY_COLOR, rarityKey } from '@/game/items/rarity';
import { itemBonusLines } from '@/game/items/itemBonusText';
import { playSfx } from '@/game/audio/audioManager';
import { useI18n } from '@/game/i18n/i18n';

/**
 * Grid-of-slots inventory (the "exatamente igual do inventário do
 * MINECRAFT" request): fixed 9-wide grid of square beveled slots with a
 * separate hotbar row, empty slots shown as empty (not hidden), item
 * count pinned to a slot's bottom-right corner. That slot-grid shape is
 * a UI convention used across a huge number of games (grid inventories
 * predate Minecraft), so it's recreated here with plain Views/borders;
 * what's NOT here is any of Minecraft's actual texture files - those are
 * Mojang's, not something to source or embed even for a personal project
 * (same reasoning as the world map in docs/AUDIT.md).
 *
 * v2 (this pass): slots are tappable now. Tapping one with an item opens
 * a detail card below the grid with its description and (for anything
 * that isn't a plain collectible) a USAR button - see itemDefs.ts for why
 * every item is a pre-battle buff rather than an instant effect.
 */

const COLS = 10;
const SLOT = 36;
const GAP = 4;

export function InventoryScreen() {
  const { t } = useI18n();
  const { coins, inventory, equipped } = usePlayerState();
  const [selected, setSelected] = useState<string | null>(null);
  const [bagsOpen, setBagsOpen] = useState(false);
  const [bagMsg, setBagMsg] = useState<string | null>(null);

  const usage = getBagUsage();
  const bag = BAGS[usage.bagId];

  const owned = Object.entries(inventory)
    .filter(([id, qty]) => qty > 0 && ITEMS[id])
    .map(([id, qty]) => ({ id, qty }));

  // One grid sized by the bag: slots beyond the bag's capacity are drawn locked.
  // (A save made before bag limits can hold more than the bag: keep showing every item.)
  const rows = Math.max(1, Math.ceil(Math.max(usage.maxSlots, owned.length) / COLS));
  const slots = Array.from({ length: rows * COLS }, (_, i) => ({ entry: owned[i] ?? null, locked: i >= usage.maxSlots }));

  const selectedDef = selected ? ITEMS[selected] : null;
  const selectedQty = selected ? inventory[selected] ?? 0 : 0;

  const slotOf = (id: string): 0 | 1 | null => (equipped[0] === id ? 0 : equipped[1] === id ? 1 : null);
  const overWeight = usage.weight > usage.maxWeight + 1e-6;

  return (
    <ArtBackdrop onBack={() => router.back()}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('inventory_title')}</Text>
          <Text style={styles.coins}>
            {coins} {CURRENCY_ABBR}
          </Text>
        </View>

        <Pressable style={[styles.bagBar, { borderColor: RARITY_COLOR[bag.rarity] }]} onPress={() => { setBagsOpen((v) => !v); setBagMsg(null); }}>
          <Text style={styles.bagIcon}>{bag.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bagName, { color: RARITY_COLOR[bag.rarity] }]}>{bag.name}</Text>
            <Text style={styles.bagStats}>
              {t('bag_slots')} {usage.slots}/{usage.maxSlots} · {t('bag_weight')} <Text style={overWeight ? styles.bagOver : undefined}>{usage.weight.toFixed(1)}</Text>/{usage.maxWeight} kg
            </Text>
          </View>
          <Text style={styles.bagToggle}>{bagsOpen ? '▲' : '▼'} {t('bag_title')}</Text>
        </Pressable>

        {bagsOpen && (
          <View style={styles.bagList}>
            {getOwnedBags().map((id) => {
              const b = BAGS[id];
              const active = id === usage.bagId;
              return (
                <View key={id} style={[styles.bagRow, { borderColor: RARITY_COLOR[b.rarity] }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bagName, { color: RARITY_COLOR[b.rarity] }]}>
                      {b.name} · {t(rarityKey(b.rarity))}
                    </Text>
                    <Text style={styles.bagStats}>
                      {b.slots} {t('bag_slots')} · {b.maxWeight} kg
                    </Text>
                    <Text style={styles.bagStats}>{b.effectText}</Text>
                  </View>
                  <Pressable
                    style={[styles.equipBtn, active && styles.equipBtnOn]}
                    disabled={active}
                    onPress={() => {
                      if (equipBag(id)) {
                        playSfx('equip');
                        setBagMsg(null);
                      } else {
                        playSfx('ui_denied');
                        setBagMsg(t('bag_swap_fail'));
                      }
                    }}
                  >
                    <Text style={styles.equipBtnText}>{active ? t('bag_in_use') : t('bag_use')}</Text>
                  </Pressable>
                </View>
              );
            })}
            {bagMsg && <Text style={styles.bagMsg}>{bagMsg}</Text>}
          </View>
        )}

        <View style={styles.equipBar}>
          <Text style={styles.equipBarTitle}>{t('equip_title')}</Text>
          {([0, 1] as const).map((slot) => {
            const id = equipped[slot];
            const d = id && (inventory[id] ?? 0) > 0 ? ITEMS[id] : null;
            return (
              <Pressable key={slot} style={styles.equipSlot} onPress={() => d && setSelected(d.id)}>
                {d ? <ItemIcon item={d} size={26} /> : <Text style={styles.equipSlotEmpty}>{slot + 1}</Text>}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.panel}>
          <View style={[styles.grid, { width: COLS * SLOT + (COLS - 1) * GAP }]}>
            {slots.map(({ entry, locked }, i) => (
              <Slot key={i} entry={entry} locked={locked} selected={!!entry && entry.id === selected} onPress={() => entry && setSelected(entry.id)} />
            ))}
          </View>
        </View>

        {owned.length === 0 && <Text style={styles.hint}>{t('inventory_empty')}</Text>}

        {selectedDef && (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <ItemIcon item={selectedDef} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailName, { color: RARITY_COLOR[selectedDef.rarity] }]}>
                  {selectedDef.name} ×{selectedQty}
                </Text>
                <Text style={styles.detailMeta}>
                  {t(rarityKey(selectedDef.rarity))} · {selectedDef.weight} kg
                </Text>
                <Text style={styles.detailDesc}>{selectedDef.description}</Text>
                {itemBonusLines(selectedDef.id).map((line) => (
                  <Text key={line} style={[styles.detailBonus, { color: RARITY_COLOR[selectedDef.rarity] }]}>
                    {line}
                  </Text>
                ))}
              </View>
            </View>
            <View style={styles.detailActions}>
              {isUsable(selectedDef.id) ? (
                <View style={styles.equipBtns}>
                  {([0, 1] as const).map((slot) => (
                    <Pressable
                      key={slot}
                      style={[styles.equipBtn, slotOf(selectedDef.id) === slot && styles.equipBtnOn]}
                      onPress={() => {
                        playSfx(slotOf(selectedDef.id) === slot ? 'unequip' : 'equip');
                        equipItem(slot, slotOf(selectedDef.id) === slot ? null : selectedDef.id);
                      }}
                    >
                      <Text style={styles.equipBtnText}>
                        {slotOf(selectedDef.id) === slot ? `${t('inventory_unequip')} ${slot + 1}` : `${t('inventory_equip')} ${slot + 1}`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.detailCollectible}>{t('inventory_collectible')}</Text>
              )}
              <Pressable onPress={() => setSelected(null)}>
                <Text style={styles.detailClose}>{t('inventory_close')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </ArtBackdrop>
  );
}

function ItemIcon({ item, size }: { item: (typeof ITEMS)[string]; size: number }) {
  return item.image ? (
    <Image source={item.image} style={{ width: size, height: size }} resizeMode="contain" />
  ) : (
    <Text style={{ fontSize: size * 0.7 }}>{item.icon}</Text>
  );
}

function Slot({ entry, selected, locked, onPress }: { entry: { id: string; qty: number } | null; selected: boolean; locked?: boolean; onPress: () => void }) {
  const item = entry ? ITEMS[entry.id] : null;
  return (
    <Pressable style={[styles.slot, locked && styles.slotLocked, item && { borderColor: RARITY_COLOR[item.rarity], borderTopColor: RARITY_COLOR[item.rarity], borderLeftColor: RARITY_COLOR[item.rarity], borderRightColor: RARITY_COLOR[item.rarity], borderBottomColor: RARITY_COLOR[item.rarity] }, selected && styles.slotSelected]} onPress={onPress} disabled={!item}>
      <View style={styles.slotInner}>
        {item && (
          <>
            <ItemIcon item={item} size={26} />
            {entry!.qty > 1 && (
              <Text style={styles.qty} numberOfLines={1}>
                {entry!.qty}
              </Text>
            )}
          </>
        )}
        {locked && !item && <GameIcon name="lock" size={16} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: '100%', alignSelf: 'stretch' },
  scrollContent: { alignItems: 'center', paddingBottom: 70 },
  bagBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(10,10,18,0.6)', width: 400, maxWidth: '96%', marginBottom: 8 },
  bagIcon: { fontSize: 22 },
  bagName: { fontWeight: '800', fontSize: 13 },
  bagStats: { color: '#e8e8e8', fontSize: 11, marginTop: 1 },
  bagOver: { color: '#ff6b6b', fontWeight: '800' },
  bagToggle: { color: '#FFD700', fontWeight: '800', fontSize: 11 },
  bagList: { width: 400, maxWidth: '96%', gap: 6, marginBottom: 8 },
  bagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderRadius: 10, padding: 8, backgroundColor: 'rgba(10,10,18,0.8)' },
  bagMsg: { color: '#ff9b9b', fontSize: 11, textAlign: 'center' },
  slotLocked: { backgroundColor: '#1d1d1d', opacity: 0.55 },
  lockedMark: { color: '#555', fontWeight: '800', fontSize: 14 },
  detailMeta: { color: '#bbb', fontSize: 11, marginTop: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 12 },
  title: { color: '#FFD700', fontWeight: '800', fontSize: 20, letterSpacing: 1 },
  coins: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  equipBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    marginBottom: 10,
  },
  equipBarTitle: { color: '#B565E8', fontWeight: '800', fontSize: 11 },
  equipSlot: {
    width: 38,
    height: 38,
    backgroundColor: '#373737',
    borderColor: '#B565E8',
    borderWidth: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipSlotEmpty: { color: '#777', fontWeight: '800' },
  equipBtns: { flexDirection: 'row', gap: 8 },
  equipBtn: { backgroundColor: '#5b2d82', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  equipBtnOn: { backgroundColor: '#8a3d3d' },
  equipBtnText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  buffBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,122,0,0.16)',
    borderWidth: 1,
    borderColor: '#FF7A00',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
    maxWidth: 420,
  },
  buffBannerTitle: { color: '#FF7A00', fontWeight: '800', fontSize: 11, textAlign: 'center' },
  buffBannerLine: { color: '#fff', fontSize: 11, textAlign: 'center', marginTop: 2 },
  panel: {
    backgroundColor: '#8b8b8b',
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#373737',
    borderBottomColor: '#373737',
    borderWidth: 3,
    padding: 8,
    alignSelf: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  hotbarGap: { height: GAP * 2 },
  hotbarGrid: {
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.5)',
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  slot: {
    width: SLOT,
    height: SLOT,
    backgroundColor: '#373737',
    borderTopColor: '#232323',
    borderLeftColor: '#232323',
    borderRightColor: '#a8a8a8',
    borderBottomColor: '#a8a8a8',
    borderWidth: 2,
  },
  slotSelected: { borderColor: '#FFD700', borderTopColor: '#FFD700', borderLeftColor: '#FFD700' },
  slotInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  qty: {
    position: 'absolute',
    right: 2,
    bottom: 0,
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  hint: { color: '#fff', opacity: 0.7, fontSize: 13, maxWidth: 280, textAlign: 'center', marginTop: 14, alignSelf: 'center' },
  detailCard: {
    marginTop: 14,
    alignSelf: 'center',
    width: 320,
    backgroundColor: 'rgba(10,10,18,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.5)',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  detailHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  detailIcon: { fontSize: 28 },
  detailName: { color: '#FFD700', fontWeight: '800', fontSize: 14 },
  detailDesc: { color: '#e8e8e8', fontSize: 12, marginTop: 3 },
  detailBonus: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  detailActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailCollectible: { color: '#aaa', fontSize: 12, fontStyle: 'italic' },
  detailClose: { color: '#aaa', fontSize: 13, fontWeight: '700' },
});
