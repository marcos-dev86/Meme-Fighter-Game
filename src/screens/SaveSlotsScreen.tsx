import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { MenuButton } from '@/game/menu/MenuButton';
import { DEFAULT_CHARACTER_ID, STORY_CHARACTERS } from '@/game/story/characters';
import { useUnlockedCharacters } from '@/game/state/profileState';
import { DifficultyPicker } from '@/game/menu/DifficultyPicker';
import { DIFFICULTY_PARAMS, type Difficulty } from '@/game/state/difficulty';
import { createWorld, deleteSlot, listSlots, startSession, summarize, SLOT_COUNT, type SaveData } from '@/game/state/saveState';
import { formatPlayTime } from '@/game/state/session';
import { useI18n } from '@/game/i18n/i18n';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * STORY entry: up to 3 saved worlds. Each card shows the world's name,
 * difficulty, play time, creation date and progress. Empty slots start the
 * "new world" step (name + difficulty), filled ones can be played or deleted.
 */
export function SaveSlotsScreen() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
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
    setSlots(await listSlots());
  }, []);

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

  const remove = async (i: number) => {
    await deleteSlot(i);
    setConfirmDel(null);
    refresh();
  };

  if (creating !== null) {
    const i = creating;
    return (
      <ArtBackdrop onBack={() => (setCreating(null), setError(false))}>
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
            {unlockedCharacters.length > 1 && (
              <>
                <Text style={[styles.label, { marginTop: 10 }]}>{t('slots_character')}</Text>
                <View style={styles.charRow}>
                  {unlockedCharacters.map((id) => (
                    <Pressable key={id} onPress={() => setCharacterId(id)} style={[styles.charChip, characterId === id && styles.charChipOn]}>
                      <Text style={[styles.charText, characterId === id && styles.charTextOn]}>{STORY_CHARACTERS[id]?.name ?? id}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            <Text style={[styles.label, { marginTop: 10 }]}>{t('difficulty_title')}</Text>
            <DifficultyPicker value={difficulty} onChange={setDifficulty} />
            {error && <Text style={styles.error}>{t('save_fail')}</Text>}
            <View style={{ height: 14 }} />
            <MenuButton label={t('slots_create')} onPress={() => create(i)} disabled={busy} />
          </ScrollView>
        </KeyboardAvoidingView>
      </ArtBackdrop>
    );
  }

  const cardW = Math.max(150, Math.min(220, (width - 120) / SLOT_COUNT));

  return (
    <ArtBackdrop onBack={() => router.back()}>
      <Text style={styles.heading}>{t('slots_title')}</Text>
      <View style={styles.row}>
        {(slots ?? Array.from({ length: SLOT_COUNT }, () => null)).map((data, i) => (
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
      </View>
    </ArtBackdrop>
  );
}

const styles = StyleSheet.create({
  charRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 6 },
  charChip: { borderWidth: 2, borderColor: 'rgba(255,215,0,0.4)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: 'rgba(10,10,18,0.5)' },
  charChipOn: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.22)' },
  charText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  charTextOn: { color: '#FFD700' },
  heading: { color: '#FFD700', fontWeight: '800', fontSize: 20, letterSpacing: 2, marginBottom: 14, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 14, alignItems: 'stretch', justifyContent: 'center' },
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
