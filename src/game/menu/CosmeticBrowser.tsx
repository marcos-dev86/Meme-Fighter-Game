import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CosmeticPreview } from '@/game/cosmetics/CosmeticLayers';
import { COSMETICS, COSMETIC_BY_ID, COSMETIC_SLOTS, type CosmeticDef, type CosmeticSlot } from '@/game/cosmetics/cosmeticDefs';
import { buyCosmetic, equipCosmetic, useCosmetics, type Equipped } from '@/game/state/cosmeticsState';
import { usePlayerState } from '@/game/state/playerState';
import { getStoryCharacterId } from '@/game/state/questState';
import { getStoryCharacter } from '@/game/story/characters';
import { RARITY_COLOR, rarityKey } from '@/game/items/rarity';
import { CURRENCY_ABBR } from '@/game/items/itemDefs';
import { playSfx } from '@/game/audio/audioManager';
import { haptic } from '@/game/audio/haptics';
import { useI18n } from '@/game/i18n/i18n';
import { GameIcon } from '@/game/ui/GameIcon';

/**
 * Cosméticos (chapéus, capas e skins). Um só componente para os dois lugares:
 *  - mode 'wardrobe' (STATUS > VISUAL): veste o que o jogador tem, com pré-visualização;
 *  - mode 'shop' (costureira, Dona Iracema): mostra tudo com preço, prova antes de comprar e compra com moedas.
 * Cosméticos não têm nenhum efeito de atributo.
 */
export function CosmeticBrowser({ mode, onClose }: { mode: 'wardrobe' | 'shop'; onClose?: () => void }) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const { owned, equipped } = useCosmetics();
  const { coins } = usePlayerState();
  const [slot, setSlot] = useState<CosmeticSlot>('hat');
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const charKey = getStoryCharacter(getStoryCharacterId()).fighter;
  const wide = width >= 640;
  // A loja não vende os exclusivos de missão; o guarda-roupa mostra todos (os que faltam ficam trancados).
  const list = COSMETICS.filter((c) => c.slot === slot && (mode === 'wardrobe' || !c.exclusive || owned.includes(c.id)));
  const selDef = sel ? COSMETIC_BY_ID[sel] : null;
  const isOwned = (id: string) => owned.includes(id);

  // pré-visualização: o item selecionado é provado por cima do que está vestido
  const override: Partial<Equipped> = {};
  if (selDef) override[selDef.slot] = selDef.id;
  const preview = { ...equipped, ...override };

  const pick = (d: CosmeticDef) => {
    playSfx('ui_hover');
    setMsg(null);
    setSel(d.id);
  };
  const action = () => {
    if (!selDef) return;
    if (!isOwned(selDef.id)) {
      if (mode !== 'shop') return;
      if (buyCosmetic(selDef.id)) {
        equipCosmetic(selDef.slot, selDef.id);
        playSfx('coin');
        haptic('success');
        setMsg(t('cos_bought'));
      } else {
        playSfx('ui_denied');
        setMsg(t('shop_insufficient'));
      }
      return;
    }
    const wearing = equipped[selDef.slot] === selDef.id;
    equipCosmetic(selDef.slot, wearing ? null : selDef.id);
    playSfx(wearing ? 'unequip' : 'equip');
    setMsg(null);
  };
  const clearSlot = () => {
    equipCosmetic(slot, null);
    playSfx('unequip');
    setSel(null);
    setMsg(null);
  };

  const label =
    !selDef ? null : isOwned(selDef.id) ? (equipped[selDef.slot] === selDef.id ? t('cos_unequip') : t('cos_equip')) : mode === 'shop' ? `${t('cos_buy')} · ${selDef.price} ${CURRENCY_ABBR}` : null;
  const canAfford = selDef ? coins >= selDef.price : false;

  const ownedCount = owned.length;
  const previewH = Math.min(170, height - (mode === 'shop' ? 110 : 150));

  return (
    <View style={[styles.wrap, { width: Math.min(width - 24, 780), height: Math.max(230, mode === 'shop' ? height - 20 : height - 120), marginBottom: mode === 'shop' ? 0 : 56 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{mode === 'shop' ? t('cos_title_shop') : t('cos_title_wardrobe')}</Text>
        {mode === 'shop' && (
          <Text style={styles.coins}>
            {coins} {CURRENCY_ABBR}
          </Text>
        )}
        <Text style={styles.count}>{t('cos_count').replace('{n}', String(ownedCount)).replace('{m}', String(COSMETICS.length))}</Text>
      </View>
      <View style={[styles.body, !wide && { flexDirection: 'column' }]}>
        <View style={styles.previewBox}>
          <CosmeticPreview characterKey={charKey} height={previewH} override={preview} />
        </View>
        <View style={{ flex: 1, gap: 6, minHeight: 0 }}>
          <View style={styles.tabs}>
            {COSMETIC_SLOTS.map((s) => (
              <Pressable key={s} style={[styles.tab, slot === s && styles.tabOn]} onPress={() => { setSlot(s); setSel(null); setMsg(null); }}>
                <Text style={styles.tabText}>{t(`cos_slot_${s}`)}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.grid} showsVerticalScrollIndicator>
            <Pressable style={[styles.card, equipped[slot] === null && styles.cardWorn]} onPress={clearSlot}>
              <View style={styles.cardIcon}>
                <GameIcon name="cross" size={20} />
              </View>
              <Text style={styles.cardName} numberOfLines={1}>
                {slot === 'skin' ? t('cos_original') : t('cos_none')}
              </Text>
            </Pressable>
            {list.map((d) => {
              const have = isOwned(d.id);
              const worn = equipped[d.slot] === d.id;
              const dim = mode === 'wardrobe' && !have;
              return (
                <Pressable key={d.id} style={[styles.card, { borderColor: RARITY_COLOR[d.rarity] }, sel === d.id && styles.cardSel, worn && styles.cardWorn, dim && { opacity: 0.45 }]} onPress={() => pick(d)}>
                  <View style={styles.cardIcon}>
                    {d.icon ? <GameIcon name={d.icon} size={30} /> : <View style={[styles.swatch, { backgroundColor: d.swatch }]} />}
                    {worn && <GameIcon name="check" size={12} style={styles.cardCheck} />}
                    {dim && <GameIcon name="lock" size={12} style={styles.cardCheck} />}
                  </View>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {t(`cos_${d.id}`)}
                  </Text>
                  <Text style={[styles.cardSub, { color: RARITY_COLOR[d.rarity] }]} numberOfLines={1}>
                    {d.exclusive && !have ? t('cos_exclusive') : mode === 'shop' && !have ? `${d.price} ${CURRENCY_ABBR}` : have ? t('cos_owned') : t(rarityKey(d.rarity))}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.footer}>
            {selDef ? (
              <Text style={[styles.msg, { color: RARITY_COLOR[selDef.rarity] }]} numberOfLines={1}>
                {t(`cos_${selDef.id}`)} · {t(rarityKey(selDef.rarity))}
              </Text>
            ) : (
              <Text style={styles.msg}>{mode === 'shop' ? t('cos_shop_hint') : t('cos_wardrobe_hint')}</Text>
            )}
            {msg ? <Text style={styles.msgOk}>{msg}</Text> : null}
            {selDef && !isOwned(selDef.id) && mode === 'wardrobe' && <Text style={styles.msgWarn}>{selDef.exclusive ? t('cos_exclusive_hint') : t('cos_locked_hint')}</Text>}
            <View style={styles.footRow}>
              {label && (
                <Pressable style={[styles.btn, !isOwned(selDef!.id) && !canAfford && styles.btnOff]} onPress={action}>
                  <Text style={styles.btnText}>{label}</Text>
                </Pressable>
              )}
              {onClose && (
                <Pressable style={styles.btnGhost} onPress={onClose}>
                  <Text style={styles.btnGhostText}>{t('shop_exit')}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, paddingVertical: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  title: { color: '#FFD700', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  coins: { color: '#fff', fontWeight: '800', backgroundColor: 'rgba(255,215,0,0.18)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  count: { color: '#cfd6f5', fontSize: 11 },
  body: { flex: 1, flexDirection: 'row', gap: 12, minHeight: 0 },
  previewBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 6 },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  tabOn: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.2)' },
  tabText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  card: { width: 92, padding: 4, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', gap: 2 },
  cardSel: { backgroundColor: 'rgba(255,255,255,0.18)' },
  cardWorn: { borderColor: '#4cd964' },
  cardIcon: { width: 40, height: 32, alignItems: 'center', justifyContent: 'center' },
  cardCheck: { position: 'absolute', right: 0, bottom: 0 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#fff' },
  cardName: { color: '#fff', fontSize: 10, fontWeight: '800' },
  cardSub: { fontSize: 9, fontWeight: '700' },
  footer: { gap: 3 },
  footRow: { flexDirection: 'row', gap: 8 },
  msg: { color: '#d8def5', fontSize: 11, fontWeight: '700' },
  msgOk: { color: '#9be89b', fontSize: 11, fontWeight: '800' },
  msgWarn: { color: '#ffb39b', fontSize: 10 },
  btn: { backgroundColor: '#FFD700', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 16 },
  btnOff: { opacity: 0.5 },
  btnText: { color: '#1a1200', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  btnGhost: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14 },
  btnGhostText: { color: '#cfd6f5', fontWeight: '700', fontSize: 11 },
});
