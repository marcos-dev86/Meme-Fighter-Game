import React, { useCallback, useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { SCREEN_SCENE } from '@/game/menu/sceneArt';
import { MenuButton } from '@/game/menu/MenuButton';
import { DEFAULT_CHARACTER_ID, STORY_CHARACTERS } from '@/game/story/characters';
import { useUnlockedCharacters } from '@/game/state/profileState';
import { CharacterInfoPanel } from '@/game/menu/CharacterInfoPanel';
import { DifficultyPicker } from '@/game/menu/DifficultyPicker';
import { DIFFICULTY_PARAMS, type Difficulty } from '@/game/state/difficulty';
import { createWorld, deleteSlot, listSlots, startSession, summarize, type SaveData } from '@/game/state/saveState';
import { FighterSelect } from '@/game/versus/FighterSelect';
import { getFighterRegistry } from '@/game/versus/fighterRegistry';
import type { CharacterKey } from '@/game/battle/Fighter';
import { buyWorldSlot, useAccount } from '@/game/account/accountState';
import { nextSlotPrice, slotTotal } from '@/game/account/accountCore';
import { formatPlayTime } from '@/game/state/session';
import { useI18n } from '@/game/i18n/i18n';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Os personagens da história na grade de seleção (mesmos retratos e barras do Versus), na ordem de STORY_CHARACTERS. */
function storyEntries() {
  const all = getFighterRegistry();
  return Object.keys(STORY_CHARACTERS).map((id) => all.find((e) => e.key === id)).filter((e): e is NonNullable<typeof e> => !!e);
}

/**
 * STORY entry: 3 saved worlds (more can be bought with diamonds, see SLOT_SHOP). Each card shows the world's name,
 * difficulty, play time, creation date and progress. Empty slots start the
 * "new world" step (name + difficulty), filled ones can be played or deleted.
 */
export function SaveSlotsScreen() {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const account = useAccount();
  const visible = slotTotal(account);
  const price = nextSlotPrice(account);
  const [buyStep, setBuyStep] = useState<'idle' | 'confirm'>('idle');
  const [buyMsg, setBuyMsg] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [slots, setSlots] = useState<(SaveData | null)[] | null>(null);
  const [creating, setCreating] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [characterId, setCharacterId] = useState(DEFAULT_CHARACTER_ID);
  const unlockedCharacters = useUnlockedCharacters();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setSlots(await listSlots(visible));
  }, [visible]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const play = (i: number, data: SaveData) => {
    if (busy) return;
    startSession(i, data);
    router.push('/world');
  };

  const create = async (i: number) => {
    if (busy) return;
    setBusy(true);
    const data = await createWorld(i, name, difficulty, characterId);
    setBusy(false);
    if (!data) {
      setError(true);
      return;
    }
    setCreating(null);
    startSession(i, data);
    // A brand-new world starts with the tutorial (it has a SKIP button on every page).
    router.push({ pathname: '/tutorial', params: { next: 'world' } } as never);
  };

  const askBuy = () => {
    if (price === null) return;
    if (account.diamonds < price) {
      setBuyMsg(t('slots_buy_poor').replace('{missing}', String(price - account.diamonds)));
      return;
    }
    setBuyMsg(null);
    setBuyStep('confirm');
  };
  const doBuy = () => {
    const r = buyWorldSlot();
    setBuyStep('idle');
    setBuyMsg(r.ok ? t('slots_buy_done') : r.reason === 'max' ? t('slots_buy_max') : t('slots_buy_poor').replace('{missing}', String((price ?? 0) - account.diamonds)));
  };

  const remove = async (i: number) => {
    await deleteSlot(i);
    setConfirmDel(null);
    refresh();
  };

  if (creating !== null && selecting) {
    const keys = unlockedCharacters as CharacterKey[];
    return (
      <ArtBackdrop scene={SCREEN_SCENE.slots} dim onBack={() => setSelecting(false)}>
        <FighterSelect
          mode="cpu"
          single
          title={t('char_select_title')}
          tagText={t('char_select_tag')}
          unlocked={keys}
          entries={storyEntries()}
          initialP1={characterId as CharacterKey}
          initialP2={characterId as CharacterKey}
          onDone={(k) => {
            setCharacterId(k);
            setSelecting(false);
          }}
          detail={(k, maxH) => <CharacterInfoPanel characterId={k} locked={!unlockedCharacters.includes(k)} maxHeight={maxH} />}
        />
      </ArtBackdrop>
    );
  }

  if (creating !== null) {
    const i = creating;
    const chosen = storyEntries().find((e) => e.key === characterId);
    return (
      <ArtBackdrop scene={SCREEN_SCENE.slots} dim onBack={() => (setCreating(null), setError(false))}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.newWrap}>
          <ScrollView contentContainerStyle={styles.newScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.heading}>{t('slots_new_title')}</Text>
            <Text style={styles.label}>{t('slots_world_name')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={18}
              placeholder={t('slots_name_placeholder')}
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.input}
            />
            <Text style={[styles.label, { marginTop: 10 }]}>{t('slots_character')}</Text>
            <Pressable onPress={() => setSelecting(true)} testID="select-character-btn" accessibilityRole="button" style={styles.selectBtn}>
              {chosen && <Image source={chosen.avatar} style={styles.selectImg} resizeMode="contain" testID="select-character-img" />}
              <View style={{ flex: 1 }}>
                <Text style={styles.selectLabel}>{t('char_select_btn')}</Text>
                <Text style={styles.selectName} testID="select-character-name" numberOfLines={1}>{STORY_CHARACTERS[characterId]?.name ?? characterId}</Text>
              </View>
              <Text style={styles.selectArrow}>{'>'}</Text>
            </Pressable>
            <View style={styles.charPanel}>
              <CharacterInfoPanel characterId={characterId} locked={!unlockedCharacters.includes(characterId)} maxHeight={300} />
            </View>
            <Text style={[styles.label, { marginTop: 10 }]}>{t('difficulty_title')}</Text>
            <DifficultyPicker value={difficulty} onChange={setDifficulty} />
            {error && <Text style={styles.error}>{t('save_fail')}</Text>}
            <View style={{ height: 14 }} />
            <MenuButton label={t('slots_create')} onPress={() => create(i)} disabled={busy || !unlockedCharacters.includes(characterId)} />
          </ScrollView>
        </KeyboardAvoidingView>
      </ArtBackdrop>
    );
  }

  const cols = Math.max(1, Math.min(slots?.length ?? visible, width >= 900 ? 4 : 3));
  const cardW = Math.max(150, Math.min(220, (width - 120) / cols));

  return (
    <ArtBackdrop scene={SCREEN_SCENE.slots} dim onBack={() => router.back()}>
      <Text style={styles.heading}>{t('slots_title')}</Text>
      <Text style={styles.diamonds} testID="slots-diamonds">{t('slots_diamonds').replace('{n}', String(account.diamonds))}</Text>
      <ScrollView style={{ maxHeight: Math.max(220, height - 120), width: '100%' }} contentContainerStyle={styles.gridScroll} showsVerticalScrollIndicator={false} testID="slots-scroll">
      <View style={styles.row}>
        {(slots ?? Array.from({ length: visible }, () => null)).map((data, i) => (
          <View key={i} style={[styles.card, { width: cardW }, data && { borderColor: DIFFICULTY_PARAMS[data.difficulty].color }]}>
            <Text style={styles.slotNum}>{t('slots_slot')} {i + 1}</Text>
            {slots === null ? (
              <Text style={styles.muted}>...</Text>
            ) : data ? (
              confirmDel === i ? (
                <View style={styles.cardBody}>
                  <Text style={styles.confirmText}>{t('slots_delete_confirm')}</Text>
                  <Text style={styles.worldName} numberOfLines={1}>{data.name}</Text>
                  <MenuButton compact fit variant="danger" label={t('slots_delete_yes')} onPress={() => remove(i)} />
                  <MenuButton compact fit variant="ghost" label={t('exit_cancel')} onPress={() => setConfirmDel(null)} />
                </View>
              ) : (
                <View style={styles.cardBody}>
                  <Text style={styles.worldName} numberOfLines={1}>{data.name}</Text>
                  <View style={[styles.diffChip, { backgroundColor: DIFFICULTY_PARAMS[data.difficulty].color }]}>
                    <Text style={styles.diffText}>{t(`difficulty_${data.difficulty}`)}</Text>
                  </View>
                  <Text style={styles.info}>{t('slots_played')}: {formatPlayTime(data.playTimeMs)}</Text>
                  <Text style={styles.info}>{t('slots_created')}: {formatDate(data.createdAt)}</Text>
                  <Text style={styles.info}>{t('slots_last_save')}: {formatDate(data.savedAt)}</Text>
                  <Text style={styles.info}>
                    {t('slots_missions')}: {summarize(data).missionsDone}/{summarize(data).missionsTotal}
                  </Text>
                  <Text style={styles.info}>{t('slots_coins')}: {summarize(data).coins}</Text>
                  <MenuButton compact fit label={t('slots_play')} onPress={() => play(i, data)} />
                  <MenuButton compact fit variant="ghost" label={t('slots_delete')} onPress={() => setConfirmDel(i)} />
                </View>
              )
            ) : (
              <View style={styles.cardBody}>
                <Text style={styles.muted}>{t('slots_empty')}</Text>
                <MenuButton
                  compact
                  fit
                  label={t('slots_new')}
                  onPress={() => {
                    setName('');
                    setDifficulty('medium');
                    setError(false);
                    setCreating(i);
                  }}
                />
              </View>
            )}
          </View>
        ))}
        {price !== null && (
          <View style={[styles.card, styles.buyCard, { width: cardW }]} testID="slot-buy-card">
            <Text style={styles.slotNum}>{t('slots_buy_title')}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.muted}>{t('slots_buy_hint')}</Text>
              {buyStep === 'confirm' ? (
                <>
                  <Text style={styles.confirmText}>{t('slots_buy_confirm').replace('{price}', String(price))}</Text>
                  <MenuButton compact fit label={t('slots_buy_yes')} onPress={doBuy} />
                  <MenuButton compact fit variant="ghost" label={t('exit_cancel')} onPress={() => setBuyStep('idle')} />
                </>
              ) : (
                <MenuButton compact fit label={t('slots_buy_button').replace('{price}', String(price))} onPress={askBuy} />
              )}
              {buyMsg && <Text style={styles.buyMsg} testID="slot-buy-msg">{buyMsg}</Text>}
            </View>
          </View>
        )}
      </View>
      {price === null && <Text style={styles.buyMsg}>{t('slots_buy_max')}</Text>}
      </ScrollView>
    </ArtBackdrop>
  );
}

const styles = StyleSheet.create({
  selectBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, width: 300, borderWidth: 2, borderColor: '#FFD700', borderRadius: 12, padding: 8, backgroundColor: 'rgba(10,10,18,0.7)' },
  selectImg: { width: 56, height: 56, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  selectLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  selectName: { color: '#FFD700', fontSize: 18, fontWeight: '900' },
  selectArrow: { color: '#FFD700', fontSize: 22, fontWeight: '900', paddingHorizontal: 6 },
  diamonds: { color: '#9fe8ff', fontWeight: '800', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  gridScroll: { alignItems: 'center', paddingBottom: 12 },
  buyCard: { borderStyle: 'dashed', borderColor: 'rgba(159,232,255,0.6)' },
  buyMsg: { color: '#9fe8ff', fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 6 },
  charRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 6 },
  charChip: { borderWidth: 2, borderColor: 'rgba(255,215,0,0.4)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: 'rgba(10,10,18,0.5)' },
  charChipOn: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.22)' },
  charText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  charChipLocked: { opacity: 0.6, borderColor: 'rgba(255,120,120,0.5)' },
  charTextLocked: { color: '#ffb3b3' },
  charPanel: { width: '100%', maxWidth: 560, alignSelf: 'center', marginTop: 8, padding: 10, borderRadius: 12, backgroundColor: 'rgba(8,10,28,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  charTextOn: { color: '#FFD700' },
  heading: { color: '#FFD700', fontWeight: '800', fontSize: 20, letterSpacing: 2, marginBottom: 14, textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch', justifyContent: 'center' },
  card: {
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.4)',
    borderRadius: 12,
    backgroundColor: 'rgba(10,10,18,0.7)',
    padding: 12,
    gap: 6,
    overflow: 'hidden',
  },
  slotNum: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  cardBody: { gap: 5 },
  worldName: { color: '#FFD700', fontWeight: '800', fontSize: 16 },
  diffChip: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  diffText: { color: '#1a1200', fontWeight: '800', fontSize: 11 },
  info: { color: '#fff', fontSize: 11, opacity: 0.85 },
  muted: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginVertical: 14, textAlign: 'center' },
  confirmText: { color: '#ffb199', fontSize: 12, fontWeight: '700' },
  newWrap: { flex: 1, width: '100%', alignItems: 'center' },
  newScroll: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20 },
  label: { color: '#fff', opacity: 0.85, fontSize: 12, marginBottom: 6 },
  input: {
    width: 260,
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    backgroundColor: 'rgba(10,10,18,0.7)',
    fontSize: 16,
    textAlign: 'center',
  },
  error: { color: '#ff8a65', marginTop: 8, fontWeight: '700' },
});
