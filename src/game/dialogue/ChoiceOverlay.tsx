import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playSfx } from '@/game/audio/audioManager';
import { haptic } from '@/game/audio/haptics';
import { NPC_KIND_COLOR, type NpcDef } from '@/game/world/npcs';
import { CharacterMarker } from '@/game/world/CharacterMarker';
import { NPC_SHEET } from '@/game/world/npcSheet';
import { getSprite } from '@/game/battle/sprites';
import { applyChoice, type ChoiceDef } from '@/game/story/storyChoices';
import { useI18n } from '@/game/i18n/i18n';

interface Props {
  npc: NpcDef;
  choice: ChoiceDef;
  onFinish: () => void;
}

/**
 * Diálogo com ESCOLHA: fala do NPC -> botões com as opções -> o que acontece (e a recompensa) -> fim.
 * A escolha só vale ao tocar em uma opção; antes disso o jogador pode ler com calma.
 */
export function ChoiceOverlay({ npc, choice, onFinish }: Props) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<'intro' | 'pick' | 'result'>('intro');
  const [idx, setIdx] = useState(0);
  const [outcome, setOutcome] = useState<{ lines: string[]; info: string[] }>({ lines: [], info: [] });

  const lines = phase === 'intro' ? choice.intro : outcome.lines;
  const isLast = idx >= lines.length - 1;

  const advance = () => {
    playSfx('ui_hover', { gain: 0.6 });
    if (!isLast) {
      setIdx((i) => i + 1);
      return;
    }
    if (phase === 'intro') setPhase('pick');
    else onFinish();
  };

  const pick = (optionId: string) => {
    const o = choice.options.find((x) => x.id === optionId);
    if (!o) return;
    playSfx('ui_confirm');
    haptic('medium');
    const info = applyChoice(choice.id, optionId);
    setOutcome({ lines: o.lines, info });
    setIdx(0);
    setPhase('result');
  };

  const portrait = npc.fighterSprite ? (
    <Image source={getSprite(npc.fighterSprite, 'idle')} resizeMode="contain" style={styles.portraitSprite} />
  ) : npc.portraitSprite ? (
    <Image source={npc.portraitSprite} resizeMode="contain" style={styles.portraitSprite} />
  ) : npc.sheetChar && NPC_SHEET[npc.sheetChar] ? (
    <Image source={NPC_SHEET[npc.sheetChar].src} resizeMode="contain" style={styles.portraitSprite} />
  ) : (
    <CharacterMarker size={44} skinColor={npc.skinColor} outfitColor={npc.outfitColor} hairColor={npc.hairColor} />
  );

  return (
    <Pressable style={styles.root} onPress={phase === 'pick' ? undefined : advance}>
      <View style={styles.box}>
        <View style={[styles.portrait, { backgroundColor: NPC_KIND_COLOR[npc.kind] }]}>{portrait}</View>
        <View style={styles.textArea}>
          <Text style={styles.name}>{npc.name}</Text>
          {phase === 'pick' ? (
            <ScrollView style={{ maxHeight: 150 }} contentContainerStyle={{ gap: 6 }} showsVerticalScrollIndicator>
              <Text style={styles.question}>{t('choice_prompt')}</Text>
              {choice.options.map((o) => (
                <Pressable key={o.id} style={styles.option} onPress={() => pick(o.id)}>
                  <Text style={styles.optionText}>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <>
              <Text style={styles.line}>{lines[idx]}</Text>
              {phase === 'result' && isLast && outcome.info.length > 0 && <Text style={styles.reward}>{outcome.info.join(' · ')}</Text>}
            </>
          )}
        </View>
      </View>
      {phase !== 'pick' && <Text style={styles.hint}>{isLast && phase === 'result' ? t('dialogue_close') : t('dialogue_continue')}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.35)' },
  box: { flexDirection: 'row', gap: 14, backgroundColor: 'rgba(10,10,18,0.94)', borderWidth: 3, borderColor: '#ff9f43', borderRadius: 14, padding: 14 },
  portrait: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  portraitSprite: { width: 50, height: 50 },
  textArea: { flex: 1, gap: 4 },
  name: { color: '#ff9f43', fontWeight: '800', fontSize: 16 },
  line: { color: '#fff', fontSize: 14, lineHeight: 20 },
  question: { color: '#ffd9a0', fontSize: 12, fontWeight: '700' },
  option: { backgroundColor: 'rgba(255,159,67,0.18)', borderWidth: 2, borderColor: '#ff9f43', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  optionText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  reward: { color: '#9be89b', fontWeight: '800', fontSize: 12, marginTop: 2 },
  hint: { color: '#ff9f43', opacity: 0.8, fontSize: 11, textAlign: 'right', marginTop: 6 },
});
