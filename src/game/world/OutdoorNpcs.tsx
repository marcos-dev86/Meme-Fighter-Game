import { isGamePaused } from '@/game/state/pauseState';
import React, { useEffect, useRef, useState } from 'react';
import { GameIcon } from '@/game/ui/GameIcon';
import { Image, StyleSheet, View } from 'react-native';
import { OUTDOOR_NPCS, type OutdoorPlacement } from './npcs';
import { npcFor } from '@/game/story/npcOverrides';
import { isPlacementActive } from './npcActive';
import { npcPose } from './npcRoutine';
import { CharacterMarker } from './CharacterMarker';
import { NpcSprite, hasWalkSheet } from './NpcSprite';
import { getIdleAspect, getSprite } from '@/game/battle/sprites';
import { useTimeOfDay } from '@/game/state/timeState';

interface Props {
  tileSize: number;
  markerSize: number;
}

function Npc({ placement, tileSize, markerSize, cycleTick, frame, onWalking }: { placement: OutdoorPlacement; tileSize: number; markerSize: number; cycleTick: number; frame: number; onWalking: () => void }) {
  const npc = npcFor(placement.npcId);
  const pose = npcPose(placement);
  const npcH = markerSize * 1.8;
  const npcW = npc.fighterSprite ? npcH * getIdleAspect(npc.fighterSprite) : markerSize;
  // Personagem com folha de andar (assets/npc-walk): troca de quadro por direção, sem o "pulinho" nem o espelhamento.
  const animated = !npc.fighterSprite && !npc.portraitSprite && !!npc.sheetChar && hasWalkSheet(npc.sheetChar);
  if (pose.walking) onWalking();
  const bob = !animated && pose.walking && cycleTick % 2 === 0 ? -2 : 0;
  return (
    <View style={[styles.slot, { left: pose.x * tileSize - markerSize / 2, top: pose.y * tileSize - markerSize * 0.6 + bob }, !animated && pose.walking && pose.dir < 0 && styles.flip]}>
      {npc.fighterSprite ? (
        <Image source={getSprite(npc.fighterSprite, 'idle')} resizeMode="contain" style={{ width: npcW, height: npcH }} />
      ) : npc.portraitSprite ? (
        <Image source={npc.portraitSprite} resizeMode="contain" style={npc.portraitAspect ? { width: markerSize * 1.5 * Math.min(npc.portraitAspect, 1.6), height: markerSize * 1.5 } : { width: markerSize * 1.3, height: markerSize * 1.3 }} />
      ) : npc.sheetChar ? (
        <NpcSprite char={npc.sheetChar} walk={{ facing: pose.facing, walking: pose.walking, frame }} />
      ) : (
        <CharacterMarker size={markerSize} skinColor={npc.skinColor} outfitColor={npc.outfitColor} hairColor={npc.hairColor} />
      )}
      {pose.asleep && <GameIcon name="zzz" size={16} style={styles.zzz} />}
    </View>
  );
}

/** All the outdoor NPCs, following their daily routine (re-evaluated as the game clock runs). */
export function OutdoorNpcs({ tileSize, markerSize }: Props) {
  const { clock } = useTimeOfDay();
  const tick = Number(clock.slice(3, 5));
  // Passo da animação de andar: ~6 quadros/s, e só enquanto alguém está andando (parado não re-renderiza).
  const [frame, setFrame] = useState(0);
  const walkingRef = useRef(false);
  walkingRef.current = false;
  useEffect(() => {
    const id = setInterval(() => {
      if (walkingRef.current && !isGamePaused()) setFrame((f) => f + 1);
    }, 170);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      {OUTDOOR_NPCS.filter(isPlacementActive).map((placement) => (
        <Npc key={`${placement.npcId}_${placement.x}_${placement.y}`} placement={placement} tileSize={tileSize} markerSize={markerSize} cycleTick={tick} frame={frame} onWalking={() => { walkingRef.current = true; }} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', alignItems: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  zzz: { position: 'absolute', top: -12, right: -8, fontSize: 14 },
});
