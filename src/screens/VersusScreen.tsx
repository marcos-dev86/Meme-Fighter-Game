import React, { useState } from 'react';
import { ROSTER, useRoster } from '@/game/state/rosterState';
import { BOSS_BY_ID } from '@/game/state/bossState';
import { ITEMS } from '@/game/items/itemDefs';
import { GameIcon } from '@/game/ui/GameIcon';
import { PICK_COUNT, drawOffer, drawRandomPair, encodeItems } from '@/game/battle/versusLoadout';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { ButtonColumn, MenuButton } from '@/game/menu/MenuButton';
import { STAGE_ART } from '@/game/menu/art';
import { useI18n } from '@/game/i18n/i18n';
import type { CharacterKey } from '@/game/battle/Fighter';
import { DifficultyPicker } from '@/game/menu/DifficultyPicker';
import type { Difficulty } from '@/game/state/difficulty';

const CHAR_PORTRAIT: Record<CharacterKey, number> = {
  dogge: require('../../assets/legacy-sprites/dogge/idle.png'),
  gadigago: require('../../assets/legacy-sprites/gadigago/idle.png'),
  orc: require('../../assets/legacy-sprites/orc/idle.png'),
  soldier: require('../../assets/legacy-sprites/soldier/idle.png'),
  dogking: require('../../assets/legacy-sprites/dogking/idle.png'),
  tank: require('../../assets/legacy-sprites/tank_fighter/idle.png'),
  ninja: require('../../assets/legacy-sprites/ninja/idle.png'),
  mystic: require('../../assets/legacy-sprites/mystic/idle.png'),
  ice_dragon: require('../../assets/legacy-sprites/ice_dragon/idle.png'),
  green_dragon: require('../../assets/legacy-sprites/green_dragon/idle.png'),
  shadow_dragon: require('../../assets/legacy-sprites/shadow_dragon/idle.png'),
  cara_tranquilo: require('../../assets/legacy-sprites/cara_tranquilo/idle.png'),
  troll_face: require('../../assets/legacy-sprites/troll_face/idle.png'),
};

const CHAR_LABEL: Record<CharacterKey, string> = {
  dogge: 'DOGGE',
  gadigago: 'GADIGAGO',
  orc: 'ORC',
  soldier: 'SOLDADO',
  dogking: 'REI DOS CÃES',
  tank: 'TANK',
  ninja: 'SOMBRA',
  mystic: 'ENCAPUZADO',
  ice_dragon: 'DRAGÃO DO GELO',
  green_dragon: 'DRAGÃO DA FLORESTA',
  shadow_dragon: 'DRAGÃO SOMBRIO',
  cara_tranquilo: 'CARA TRANQUILO',
  troll_face: 'TROLL FACE',
};
const ALL_CHARACTERS: CharacterKey[] = ROSTER.map((r) => r.key);
const STAGES: { key: string; label: string }[] = [
  { key: 'stage_1', label: 'MONTANHAS' },
  { key: 'stage_2', label: 'VILAREJO' },
  { key: 'stage_3', label: 'RIO OUTONAL' },
];

type Step = 'mode' | 'difficulty' | 'characters' | 'stage' | 'items';
type Mode = 'cpu' | '2p';

export function VersusScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ skipMode?: string }>();
  const [step, setStep] = useState<Step>(params.skipMode ? 'characters' : 'mode');
  const [mode, setMode] = useState<Mode>('cpu');
  const [p1, setP1] = useState<CharacterKey>('dogge');
  const [p2, setP2] = useState<CharacterKey>('gadigago');
  const [stageKey, setStageKey] = useState('stage_1');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const chooseMode = (m: Mode) => {
    setMode(m);
    // vs-CPU asks for the difficulty BEFORE the character select.
    setStep(m === 'cpu' ? 'difficulty' : 'characters');
  };

  const unlocked = useRoster();
  const [offer, setOffer] = useState<string[]>(() => drawOffer());
  const [picked, setPicked] = useState<string[]>([]);
  const [rerolls, setRerolls] = useState(1);
  const [itemsOn, setItemsOn] = useState(true);
  const togglePick = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= PICK_COUNT ? [...cur.slice(1), id] : [...cur, id]));
  const reroll = () => {
    if (rerolls <= 0) return;
    setRerolls((n) => n - 1);
    setOffer(drawOffer());
    setPicked([]);
  };

  const startBattle = () => {
    // Itens: os 2 escolhidos do sorteio (se faltar, completa com a oferta) e 2 sorteados para o outro lado.
    const mine = [...picked, ...offer.filter((o) => !picked.includes(o))].slice(0, PICK_COUNT);
    router.push({
      pathname: '/battle',
      params: { p1, p2, p2Control: mode === 'cpu' ? 'cpu' : 'human', stageKey, difficulty: mode === 'cpu' ? difficulty : '', items1: itemsOn ? encodeItems(mine) : '', items2: itemsOn ? encodeItems(drawRandomPair()) : '' },
    });
  };

  if (step === 'mode') {
    return (
      <ArtBackdrop onBack={() => router.back()}>
        <ButtonColumn>
          <MenuButton label={t('versus_mode_cpu')} onPress={() => chooseMode('cpu')} />
          <MenuButton label={t('versus_mode_2p')} onPress={() => chooseMode('2p')} />
        </ButtonColumn>
      </ArtBackdrop>
    );
  }

  if (step === 'difficulty') {
    return (
      <ArtBackdrop onBack={() => setStep('mode')}>
        <Text style={styles.heading}>{t('difficulty_title')}</Text>
        <DifficultyPicker value={difficulty} onChange={setDifficulty} />
        <View style={{ height: 24 }} />
        <MenuButton label={t('versus_next_diff')} onPress={() => setStep('characters')} />
      </ArtBackdrop>
    );
  }

  if (step === 'characters') {
    return (
      <ArtBackdrop onBack={() => setStep(mode === 'cpu' && !params.skipMode ? 'difficulty' : 'mode')}>
        <Text style={styles.heading}>{t('versus_choose_fighters')}</Text>
        <View style={styles.pickRow}>
          <CharacterPicker title={t('versus_player1')} value={p1} onChange={setP1} pool={unlocked} />
          <Text style={styles.vs}>VS</Text>
          <CharacterPicker title={mode === 'cpu' ? t('versus_cpu') : t('versus_player2')} value={p2} onChange={setP2} pool={mode === 'cpu' ? ALL_CHARACTERS : unlocked} />
        </View>
        <RosterStrip unlocked={unlocked} />
        <MenuButton label={t('versus_next')} onPress={() => setStep('stage')} />
      </ArtBackdrop>
    );
  }

  if (step === 'items') {
    return (
      <ArtBackdrop onBack={() => setStep('stage')}>
        <Text style={styles.heading}>{t('versus_items_title')}</Text>
        <Text style={styles.itemsNote}>{itemsOn ? t('versus_items_note') : t('versus_items_off')}</Text>
        {itemsOn && (
          <View style={styles.offerRow}>
            {offer.map((id) => {
              const def = ITEMS[id];
              const on = picked.includes(id);
              return (
                <Pressable key={id} onPress={() => togglePick(id)} style={[styles.offerCard, on && styles.offerCardOn]}>
                  <Image source={def.image} style={styles.offerImg} resizeMode="contain" />
                  <Text style={styles.offerName} numberOfLines={1}>
                    {def.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
        <View style={styles.itemsActions}>
          {itemsOn && <MenuButton fit variant="ghost" label={`${t('versus_items_reroll')} (${rerolls})`} onPress={reroll} disabled={rerolls <= 0} />}
          <MenuButton fit variant="ghost" label={itemsOn ? t('versus_items_none') : t('versus_items_use')} onPress={() => setItemsOn((v) => !v)} />
        </View>
        <MenuButton label={t('versus_start')} onPress={startBattle} />
      </ArtBackdrop>
    );
  }

  return (
    <ArtBackdrop onBack={() => setStep('characters')}>
      <Text style={styles.heading}>{t('versus_choose_stage')}</Text>
      <View style={styles.stageRow}>
        {STAGES.map((s) => (
          <Pressable key={s.key} onPress={() => setStageKey(s.key)} style={[styles.stageCard, stageKey === s.key && styles.stageCardActive]}>
            <Image source={STAGE_ART[s.key]} style={styles.stageThumb} resizeMode="cover" />
            <Text style={styles.stageLabel}>{s.label}</Text>
          </Pressable>
        ))}
      </View>
      <MenuButton label={t('versus_next')} onPress={() => setStep('items')} />
    </ArtBackdrop>
  );
}

/** Faixa com todos os lutadores: os bloqueados aparecem apagados, com cadeado e a dica de como liberar. */
function RosterStrip({ unlocked }: { unlocked: CharacterKey[] }) {
  const { t } = useI18n();
  const [hint, setHint] = useState<CharacterKey | null>(null);
  const entry = ROSTER.find((r) => r.key === hint);
  const hintText = !entry
    ? t('roster_tap')
    : entry.unlock.kind === 'boss'
      ? t('roster_hint_boss').replace('{name}', BOSS_BY_ID[entry.unlock.bossId]?.name ?? '?')
      : entry.unlock.kind === 'tower'
        ? t('roster_hint_tower').replace('{n}', String(entry.unlock.floor))
        : '';
  return (
    <View style={styles.rosterBox}>
      <Text style={styles.rosterCount}>{t('roster_count').replace('{n}', String(unlocked.length)).replace('{m}', String(ROSTER.length))}</Text>
      <View style={styles.rosterRow}>
        {ROSTER.map((r) => {
          const have = unlocked.includes(r.key);
          return (
            <Pressable key={r.key} onPress={() => setHint(r.key)} style={[styles.rosterCell, !have && { opacity: 0.4 }]}>
              <Image source={CHAR_PORTRAIT[r.key]} style={styles.rosterImg} resizeMode="contain" />
              {!have && <GameIcon name="lock" size={14} style={styles.rosterLock} />}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.rosterHint}>{entry ? `${CHAR_LABEL[entry.key]}: ${unlocked.includes(entry.key) ? t('roster_unlocked') : hintText}` : hintText}</Text>
    </View>
  );
}

function CharacterPicker({ title, value, onChange, pool }: { title: string; value: CharacterKey; onChange: (c: CharacterKey) => void; pool: CharacterKey[] }) {
  const { t } = useI18n();
  // só cicla entre os lutadores permitidos para esse lado (ROSTER mantém a ordem)
  const order = ALL_CHARACTERS.filter((c) => pool.includes(c));
  const next = () => {
    const i = order.indexOf(value);
    onChange(order[(i + 1) % order.length]);
  };
  return (
    <View style={styles.pickerCard}>
      <Text style={styles.pickerTitle}>{title}</Text>
      <Image source={CHAR_PORTRAIT[value]} style={styles.portrait} resizeMode="contain" />
      <Text style={styles.charName}>{CHAR_LABEL[value]}</Text>
      <MenuButton fit label={t('versus_next_char')} variant="ghost" onPress={next} />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { color: '#FFD700', fontWeight: '700', fontSize: 18, marginBottom: 20 },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 24 },
  vs: { color: '#FFD700', fontWeight: '800', fontSize: 22 },
  pickerCard: {
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.5)',
    borderRadius: 12,
    backgroundColor: 'rgba(10,10,18,0.6)',
    padding: 14,
    gap: 8,
    width: 180,
    overflow: 'hidden',
  },
  pickerTitle: { color: '#fff', fontSize: 12, opacity: 0.8 },
  portrait: { width: 90, height: 90 },
  charName: { color: '#FFD700', fontWeight: '700', fontSize: 15 },
  rosterBox: { alignItems: 'center', gap: 4, marginBottom: 10 },
  rosterCount: { color: '#FFD700', fontWeight: '700', fontSize: 11 },
  rosterRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  rosterCell: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  rosterImg: { width: 28, height: 28 },
  rosterLock: { position: 'absolute', right: -2, bottom: -2 },
  rosterHint: { color: '#cfd6f5', fontSize: 10, minHeight: 14, textAlign: 'center', maxWidth: 420 },
  itemsNote: { color: '#cfd6f5', fontSize: 11, marginBottom: 8, textAlign: 'center', maxWidth: 440 },
  offerRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  offerCard: { width: 92, alignItems: 'center', padding: 8, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(10,10,18,0.6)', gap: 4 },
  offerCardOn: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.18)' },
  offerImg: { width: 44, height: 44 },
  offerName: { color: '#fff', fontSize: 10, fontWeight: '700' },
  itemsActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  stageRow: { flexDirection: 'row', gap: 16, marginBottom: 18 },
  stageCard: { borderWidth: 2, borderColor: 'rgba(255,215,0,0.3)', borderRadius: 10, overflow: 'hidden', width: 140 },
  stageCardActive: { borderColor: '#FFD700' },
  stageThumb: { width: '100%', height: 80 },
  stageLabel: { color: '#fff', textAlign: 'center', fontSize: 11, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.5)' },
});
