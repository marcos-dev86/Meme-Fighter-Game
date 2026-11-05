import React from 'react';
import { GameIcon } from '@/game/ui/GameIcon';
import { Image, StyleSheet, Text, View } from 'react-native';
import { NPCS, OUTDOOR_NPCS, type OutdoorPlacement } from './npcs';
import { isPlacementActive } from './npcActive';
import { npcPose } from './npcRoutine';
import { CharacterMarker } from './CharacterMarker';
import { NpcSprite } from './NpcSprite';
import { getIdleAspect, getSprite } from '@/game/battle/sprites';
import { useTimeOfDay } from '@/game/state/timeState';

interface Props {
  tileSize: number;
  markerSize: number;
}

function Npc({ placement, tileSize, markerSize, cycleTick }: { placement: OutdoorPlacement; tileSize: number; markerSize: number; cycleTick: number }) {
  const npc = NPCS[placement.npcId];
  const pose = npcPose(placement);
  const npcH = markerSize * 1.8;
  const npcW = npc.fighterSprite ? npcH * getIdleAspect(npc.fighterSprite) : markerSize;
  const bob = pose.walking && cycleTick % 2 === 0 ? -2 : 0;
  return (
    <View style={[styles.slot, { left: pose.x * tileSize - markerSize / 2, top: pose.y * tileSize - markerSize * 0.6 + bob }, pose.walking && pose.dir < 0 && styles.flip]}>
      {npc.fighterSprite ? (
        <Image source={getSprite(npc.fighterSprite, 'idle')} resizeMode="contain" style={{ width: npcW, height: npcH }} />
      ) : npc.portraitSprite ? (
        <Image source={npc.portraitSprite} resizeMode="contain" style={npc.portraitAspect ? { width: markerSize * 1.5 * Math.min(npc.portraitAspect, 1.6), height: markerSize * 1.5 } : { width: markerSize * 1.3, height: markerSize * 1.3 }} />
      ) : npc.sheetChar ? (
        <NpcSprite char={npc.sheetChar} />
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
  return (
    <>
      {OUTDOOR_NPCS.filter(isPlacementActive).map((placement) => (
        <Npc key={`${placement.npcId}_${placement.x}_${placement.y}`} placement={placement} tileSize={tileSize} markerSize={markerSize} cycleTick={tick} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', alignItems: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  zzz: { position: 'absolute', top: -12, right: -8, fontSize: 14 },
});
