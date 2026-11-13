import React, { useState } from 'react';
import { buyFighter, useRoster, useRosterEarned } from '@/game/state/rosterState';
import { fighterPrice } from '@/game/state/rosterPricing';
import { offerRosterTip } from '@/game/state/rosterTips';
import { useAccount } from '@/game/account/accountState';
import { ITEMS } from '@/game/items/itemDefs';
import { PICK_COUNT, drawOffer, drawRandomPair, encodeItems } from '@/game/battle/versusLoadout';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArtBackdrop } from '@/game/menu/ArtBackdrop';
import { ButtonColumn, MenuButton } from '@/game/menu/MenuButton';
import { STAGE_ART } from '@/game/menu/art';
import { STAGE_DEFS } from '@/game/battle/stages';
import { useI18n } from '@/game/i18n/i18n';
import type { CharacterKey } from '@/game/battle/Fighter';
import { FighterSelect } from '@/game/versus/FighterSelect';
import { VersusSplash } from '@/game/versus/VersusSplash';
import { DifficultyPicker } from '@/game/menu/DifficultyPicker';
import type { Difficulty } from '@/game/state/difficulty';

type Step = 'mode' | 'difficulty' | 'characters' | 'stage' | 'items' | 'splash';
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
  const earned = useRosterEarned();
  const account = useAccount();
  // As dicas do jogo dizem como conseguir os lutadores ainda bloqueados (a seleção não mostra isso).
  React.useEffect(() => {
    if (step === 'characters') offerRosterTip();
  }, [step]);
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

  const launchBattle = () => {
    // Itens: os 2 escolhidos do sorteio (se faltar, completa com a oferta) e 2 sorteados para o outro lado.
    const mine = [...picked, ...offer.filter((o) => !picked.includes(o))].slice(0, PICK_COUNT);
    router.push({
      pathname: '/battle',
      params: { p1, p2, p2Control: mode === 'cpu' ? 'cpu' : 'human', stageKey, difficulty: mode === 'cpu' ? difficulty : '', training: params.skipMode ? '1' : '', items1: itemsOn ? encodeItems(mine) : '', items2: itemsOn ? encodeItems(drawRandomPair()) : '' },
    });
  };

  /** Tela VS primeiro; ao terminar volta o passo para 'items' ANTES de abrir a luta (voltar da luta não repete a tela VS). */
  const startBattle = () => setStep('splash');
  const finishSplash = () => {
    setStep('items');
    launchBattle();
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
        <FighterSelect
          mode={mode}
          unlocked={unlocked}
          earned={earned}
          diamonds={account.diamonds}
          priceOf={fighterPrice}
          onBuy={(k) => buyFighter(k).ok}
          initialP1={p1}
          initialP2={p2}
          onDone={(a, b) => {
            setP1(a);
            setP2(b);
            setStep('stage');
          }}
        />
      </ArtBackdrop>
    );
  }

  if (step === 'splash') {
    const stage = STAGE_DEFS.find((s) => s.key === stageKey);
    return (
      <VersusSplash p1={p1} p2={p2} p2Label={mode === 'cpu' ? 'CPU' : 'P2'} stageKey={stageKey} stageName={stage ? t(stage.nameKey) : ''} onDone={finishSplash} />
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
      <ScrollView style={styles.stageScroll} contentContainerStyle={styles.stageRow}>
        {STAGE_DEFS.map((s) => (
          <Pressable key={s.key} onPress={() => setStageKey(s.key)} style={[styles.stageCard, stageKey === s.key && styles.stageCardActive]}>
            <Image source={STAGE_ART[s.key]} style={styles.stageThumb} resizeMode="cover" />
            <Text style={styles.stageLabel}>{t(s.nameKey)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <MenuButton label={t('versus_next')} onPress={() => setStep('items')} />
    </ArtBackdrop>
  );
}

const styles = StyleSheet.create({
  heading: { color: '#FFD700', fontWeight: '700', fontSize: 18, marginBottom: 20 },
  itemsNote: { color: '#cfd6f5', fontSize: 11, marginBottom: 8, textAlign: 'center', maxWidth: 440 },
  offerRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  offerCard: { width: 92, alignItems: 'center', padding: 8, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(10,10,18,0.6)', gap: 4 },
  offerCardOn: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.18)' },
  offerImg: { width: 44, height: 44 },
  offerName: { color: '#fff', fontSize: 10, fontWeight: '700' },
  itemsActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  stageScroll: { maxHeight: 250, alignSelf: 'stretch', marginBottom: 12 },
  stageRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingHorizontal: 8, paddingBottom: 6 },
  stageCard: { borderWidth: 2, borderColor: 'rgba(255,215,0,0.3)', borderRadius: 10, overflow: 'hidden', width: 140 },
  stageCardActive: { borderColor: '#FFD700' },
  stageThumb: { width: '100%', height: 80 },
  stageLabel: { color: '#fff', textAlign: 'center', fontSize: 11, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.5)' },
});
