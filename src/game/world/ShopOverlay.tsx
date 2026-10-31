import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CURRENCY_ABBR, ITEMS, SHOP_STOCK } from '@/game/items/itemDefs';
import { addItem, bagRoomFor, getOwnedBags, giveBag, spendCoins, usePlayerState } from '@/game/state/playerState';
import { BAGS, PLAZA_BAGS } from '@/game/items/bags';
import { RARITY_COLOR, rarityKey } from '@/game/items/rarity';
import { playSfx } from '@/game/audio/audioManager';
import { reportPurchase } from '@/game/state/questState';
import { flashMsLeft, flashOffers, markFlashBought, stockFor, type FlashOffer, type Vendor } from '@/game/items/shopCycle';
import { GameIcon } from '@/game/ui/GameIcon';
import { getTotalMs, useTimeOfDay } from '@/game/state/timeState';
import { tip } from '@/game/state/tipsState';
import { MenuButton } from '@/game/menu/MenuButton';
import { useI18n } from '@/game/i18n/i18n';

interface Props {
  onClose: () => void;
  /** Item ids on sale (defaults to the plaza shop's stock). */
  stock?: string[];
  /** Heading override (defaults to the plaza shop's). */
  title?: string;
  /** Bag ids on sale here (default: the plaza shop's). */
  bags?: string[];
  /** Which shop this is (building id): flash offers are rolled per shop. */
  shopKey?: string;
  /** Quem vende: define os itens que só aparecem à noite (Marina = comuns, Maximilian = batalha). */
  vendor?: Vendor;
}

export function ShopOverlay({ onClose, stock: baseStock = SHOP_STOCK, title, bags = PLAZA_BAGS, shopKey = 'plaza_shop', vendor }: Props) {
  const { t } = useI18n();
  const { coins, inventory } = usePlayerState();
  const [message, setMessage] = useState<string | null>(null);
  const { night } = useTimeOfDay(); // re-renders as the clock runs: the countdown and the stock follow it
  const stock = stockFor(baseStock, night, vendor);
  const total = getTotalMs();
  const flash = flashOffers(shopKey, stock, total);
  const secsLeft = Math.ceil(flashMsLeft(total) / 1000);
  useEffect(() => {
    tip('shop');
    tip('flash');
  }, []);

  const buy = (itemId: string) => {
    const item = ITEMS[itemId];
    if (item.price === null) return;
    if (bagRoomFor(itemId, 1) < 1) {
      setMessage(t('bag_full'));
      playSfx('ui_denied');
      return;
    }
    const ok = spendCoins(item.price);
    if (ok) {
      addItem(itemId, 1);
      reportPurchase(itemId);
      playSfx('coin');
      setMessage(`${t('shop_bought')} ${item.name}!`);
    } else {
      playSfx('ui_denied');
      setMessage(t('shop_insufficient'));
    }
  };

  const buyFlash = (o: FlashOffer) => {
    if (o.left <= 0) return;
    if (bagRoomFor(o.itemId, 1) < 1) {
      setMessage(t('bag_full'));
      playSfx('ui_denied');
      return;
    }
    if (spendCoins(o.price)) {
      addItem(o.itemId, 1);
      markFlashBought(shopKey, o);
      reportPurchase(o.itemId);
      playSfx('coin');
      setMessage(`${t('shop_bought')} ${ITEMS[o.itemId].name}!`);
    } else {
      playSfx('ui_denied');
      setMessage(t('shop_insufficient'));
    }
  };

  const buyBag = (bagId: string) => {
    const bag = BAGS[bagId];
    if (!bag || bag.price === null || getOwnedBags().includes(bagId)) return;
    if (spendCoins(bag.price)) {
      giveBag(bagId);
      playSfx('coin');
      setMessage(`${t('bag_got')} ${bag.name}!`);
    } else {
      playSfx('ui_denied');
      setMessage(t('shop_insufficient'));
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{title ?? t('shop_title')}</Text>
        <Text style={styles.coins}>
          {coins} {CURRENCY_ABBR}
        </Text>
      </View>

      <View style={styles.cycleRow}>
        <GameIcon name={night ? 'moon' : 'sun'} size={14} />
        <Text style={[styles.cycle, night && styles.cycleNight]}>{night ? t(vendor === 'battle' ? 'shop_night_battle' : 'shop_night') : t(vendor === 'battle' ? 'shop_day_battle' : 'shop_day')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {flash.length > 0 && (
          <View style={styles.flashTitleRow}>
            <GameIcon name="bolt" size={14} />
            <Text style={styles.flashTitle}>
              {t('shop_flash')} · {Math.floor(secsLeft / 60)}:{String(secsLeft % 60).padStart(2, '0')}
            </Text>
          </View>
        )}
        {flash.map((o) => {
          const item = ITEMS[o.itemId];
          const soldOut = o.left <= 0;
          return (
            <View key={`f_${o.itemId}`} style={[styles.row, styles.flashRow]}>
              <Image source={item.image} style={styles.iconImg} resizeMode="contain" />
              <View style={styles.rowText}>
                <Text style={[styles.itemName, { color: RARITY_COLOR[item.rarity] }]}>{item.name}</Text>
                <Text style={styles.itemDesc}>
                  {t('shop_left')}: {o.left}
                </Text>
              </View>
              <Pressable style={[styles.buyBtn, styles.flashBtn, soldOut && styles.buyBtnOff]} onPress={() => buyFlash(o)} disabled={soldOut}>
                <Text style={styles.buyLabel}>{soldOut ? t('shop_soldout') : `${o.price} ${CURRENCY_ABBR}`}</Text>
                {!soldOut && <Text style={styles.oldPrice}>{o.basePrice}</Text>}
              </Pressable>
            </View>
          );
        })}
        {bags.length > 0 && <Text style={styles.sectionTitle}>{t('shop_bags')}</Text>}
        {bags.map((bagId) => {
          const bag = BAGS[bagId];
          if (!bag) return null;
          const has = getOwnedBags().includes(bagId);
          return (
            <View key={bagId} style={[styles.row, { borderColor: RARITY_COLOR[bag.rarity] }]}>
              <GameIcon name={bag.icon} size={30} />
              <View style={styles.rowText}>
                <Text style={[styles.itemName, { color: RARITY_COLOR[bag.rarity] }]}>
                  {bag.name} · {t(rarityKey(bag.rarity))}
                </Text>
                <Text style={styles.itemDesc}>
                  {bag.slots} {t('bag_slots')} · {bag.maxWeight} kg
                </Text>
                <Text style={styles.itemDesc}>{bag.effectText}</Text>
              </View>
              <Pressable style={[styles.buyBtn, has && styles.buyBtnOff]} onPress={() => buyBag(bagId)} disabled={has}>
                <Text style={styles.buyLabel}>{has ? t('bag_owned') : `${bag.price} ${CURRENCY_ABBR}`}</Text>
              </Pressable>
            </View>
          );
        })}
        {bags.length > 0 && <Text style={styles.sectionTitle}>{t('shop_title')}</Text>}
        {stock.map((id) => {
          const item = ITEMS[id];
          const owned = inventory[id] ?? 0;
          return (
            <View key={id} style={styles.row}>
              <Image source={item.image} style={styles.iconImg} resizeMode="contain" />
              <View style={styles.rowText}>
                <Text style={[styles.itemName, { color: RARITY_COLOR[item.rarity] }]}>
                  {item.name} {owned > 0 ? `(${owned})` : ''}
                </Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
              </View>
              <Pressable style={styles.buyBtn} onPress={() => buy(id)}>
                <Text style={styles.buyLabel}>
                  {item.price} {CURRENCY_ABBR}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      {message && <Text style={styles.message}>{message}</Text>}

      <MenuButton label={t('shop_exit')} variant="ghost" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconImg: { width: 30, height: 30 },
  root: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(5,5,10,0.92)', padding: 24, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 16 },
  title: { color: '#FFD700', fontWeight: '800', fontSize: 20, letterSpacing: 1 },
  coins: { color: '#fff', fontWeight: '700', fontSize: 16, backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  list: { gap: 10, width: 360, maxWidth: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.35)',
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  icon: { fontSize: 28 },
  rowText: { flex: 1 },
  itemName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  itemDesc: { color: '#fff', opacity: 0.65, fontSize: 11, marginTop: 2 },
  buyBtn: { borderWidth: 2, borderColor: '#FFD700', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  sectionTitle: { color: '#FFD700', fontWeight: '800', fontSize: 12, letterSpacing: 1, marginTop: 4 },
  buyBtnOff: { opacity: 0.45 },
  buyLabel: { color: '#FFD700', fontWeight: '700', fontSize: 12 },
  cycleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  flashTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cycle: { color: '#ffe9a8', fontSize: 11, fontWeight: '700' },
  cycleNight: { color: '#a9b8ff' },
  flashTitle: { color: '#ff9f43', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  flashRow: { borderColor: '#ff9f43', backgroundColor: 'rgba(255,159,67,0.1)' },
  flashBtn: { alignItems: 'center', borderColor: '#ff9f43' },
  oldPrice: { color: '#fff', opacity: 0.55, fontSize: 10, textDecorationLine: 'line-through' },
  message: { color: '#fff', marginVertical: 12, fontSize: 13 },
});
