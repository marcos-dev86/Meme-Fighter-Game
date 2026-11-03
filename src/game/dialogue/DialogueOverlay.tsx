import { playSfx } from '@/game/audio/audioManager';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { NPC_KIND_COLOR, type NpcDef } from '@/game/world/npcs';
import { CharacterMarker } from '@/game/world/CharacterMarker';
import { NPC_SHEET } from '@/game/world/npcSheet';
import { getSprite } from '@/game/battle/sprites';
import { useI18n } from '@/game/i18n/i18n';

interface Props {
  npc: NpcDef;
  onFinish: () => void;
}

/** Portrait + name + text, tap to advance: same shape as dialogue-scene.js, adapted from canvas to RN. */
export function DialogueOverlay({ npc, onFinish }: Props) {
  const { t } = useI18n();
  const [lineIndex, setLineIndex] = useState(0);
  const line = npc.dialogue[lineIndex];
  const isLast = lineIndex >= npc.dialogue.length - 1;

  const advance = () => {
    playSfx('ui_hover', { gain: 0.6 });
    if (isLast) onFinish();
    else setLineIndex((i) => i + 1);
  };

  return (
    <Pressable style={styles.root} onPress={advance}>
      <View style={styles.box}>
        <View style={[styles.portrait, { backgroundColor: NPC_KIND_COLOR[npc.kind] }]}>
          {npc.fighterSprite ? (
            <Image source={getSprite(npc.fighterSprite, 'idle')} resizeMode="contain" style={styles.portraitSprite} />
          ) : npc.portraitSprite ? (
            <Image source={npc.portraitSprite} resizeMode="contain" style={styles.portraitSprite} />
          ) : npc.sheetChar && NPC_SHEET[npc.sheetChar] ? (
            <Image source={NPC_SHEET[npc.sheetChar].src} resizeMode="contain" style={styles.portraitSprite} />
          ) : (
            <CharacterMarker size={44} skinColor={npc.skinColor} outfitColor={npc.outfitColor} hairColor={npc.hairColor} />
          )}
        </View>
        <View style={styles.textArea}>
          <Text style={styles.name}>{npc.name}</Text>
          <Text style={styles.role}>{npc.role}</Text>
          <Text style={styles.line}>{line}</Text>
        </View>
      </View>
      <Text style={styles.hint}>{isLast ? t('dialogue_close') : t('dialogue_continue')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  box: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: 'rgba(10,10,18,0.92)',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 14,
    padding: 18,
  },
  portrait: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  portraitSprite: { width: 50, height: 50 },
  textArea: { flex: 1 },
  name: { color: '#FFD700', fontWeight: '800', fontSize: 17 },
  role: { color: '#fff', opacity: 0.6, fontSize: 12, marginBottom: 8 },
  line: { color: '#fff', fontSize: 15, lineHeight: 21 },
  hint: { color: '#FFD700', opacity: 0.7, fontSize: 11, textAlign: 'right', marginTop: 8 },
});
