import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveMoveBoxes, type AABB } from '@/game/collision/collision';
import { useGameLoop } from '@/game/core/useGameLoop';
import { DPad } from '@/game/input/DPad';
import { useDirectionalInput } from '@/game/input/useDirectionalInput';
import type { Direction, MapDef, TileType } from '@/types/game';
import { MenuButton } from '@/game/menu/MenuButton';
import { SPRITE_ASPECTS } from '@/game/battle/sprites';
import { CapeLayer, HatLayer, getBodySprite, canWearCosmetics, preloadBodySprites } from '@/game/cosmetics/CosmeticLayers';
import { useCosmetics } from '@/game/state/cosmeticsState';
import { getStoryCharacterId, onQuestNotice, refreshMissions, reportTalk } from '@/game/state/questState';
import { hasFlag, setFlag } from '@/game/state/storyFlags';
import { addCoins, addItem, bagRoomFor, isCollected, markCollected } from '@/game/state/playerState';
import { itemName, CURRENCY_ABBR } from '@/game/items/itemDefs';
import { GameIcon } from '@/game/ui/GameIcon';
import { getStoryCharacter } from '@/game/story/characters';
import { DialogueOverlay } from '@/game/dialogue/DialogueOverlay';
import { ChoiceOverlay } from '@/game/dialogue/ChoiceOverlay';
import { resolveNpcDialogue } from '@/game/story/npcDialogue';
import { pendingChoiceFor, type ChoiceDef } from '@/game/story/storyChoices';
import { useI18n } from '@/game/i18n/i18n';
import { playSfx } from '@/game/audio/audioManager';
import { hash2 } from './overworld';
import { NPCS } from './npcs';
import { NpcFigure } from './InteriorOverlay';
import { CasinoOverlay } from './CasinoOverlay';
import {
  CASINO_CELLAR_FLAG,
  CASINO_FLOORS,
  CASINO_H,
  CASINO_TILE as TILE,
  CASINO_W,
  casinoSolidBoxes,
  casinoWallTile,
  type CasinoGame,
  type CasinoSprite,
  type FloorId,
} from './casinoLayout';

/**
 * O CASSINO GIGANTE por dentro: 28 x 20 tiles (bem maior que a tela, a câmera segue o jogador),
 * 6 mesas + 9 caça-níqueis, um bar, ~28 moradores e missões. Zona de paz: não existe nenhum inimigo aqui
 * (o mundo de fora não tem spawn perto da porta; ver enemySpawns.ts e tools/test-urgente3.mjs).
 */

const PLAYER_SIZE = { x: 22, y: 30 };
const FEET = { x: 3, y: 16, w: 16, h: 14 };
const NPC_FEET = { w: 22, h: 14 };
const TALK_RANGE = 96;
const PLAY_RANGE = 96;
const WALK_FRAME_COUNT = 3;
const WALK_FRAME_MS = 140;

/* eslint-disable @typescript-eslint/no-require-imports */
const ART: Record<CasinoSprite, number> = {
  roulette: require('../../../assets/furniture/cas_roulette.png'),
  dice: require('../../../assets/furniture/cas_dice.png'),
  cards: require('../../../assets/furniture/cas_cards.png'),
  flip: require('../../../assets/furniture/cas_flip.png'),
  slot: require('../../../assets/furniture/cas_slot.png'),
  bar: require('../../../assets/furniture/cas_bar.png'),
  bottles: require('../../../assets/furniture/cas_bottles.png'),
  vase: require('../../../assets/furniture/cas_vase.png'),
  crate: require('../../../assets/furniture/crate.png'),
  barrel: require('../../../assets/furniture/barrel.png'),
  vault: require('../../../assets/furniture/cas_vault.png'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

function wallMapFor(floor: FloorId): MapDef {
  return {
    id: `cassino_${floor}`,
    name: 'Cassino',
    tileSize: TILE,
    width: CASINO_W,
    height: CASINO_H,
    getTile: (x, y): TileType => {
      const k = casinoWallTile(x, y, floor);
      return k === 'wall' ? 'wall' : k === 'door' ? 'door' : 'sand';
    },
    spawns: [],
    exits: [],
    npcs: [],
    objects: [],
  };
}
const WALL_MAPS: Record<FloorId, MapDef> = { ground: wallMapFor('ground'), upper: wallMapFor('upper'), basement: wallMapFor('basement') };

/** Caixa sólida de cada morador (os pés), em px. */
function npcBoxes(floor: FloorId): AABB[] {
  return CASINO_FLOORS[floor].npcs.map((p) => ({ x: p.x * TILE + (TILE - NPC_FEET.w) / 2, y: p.y * TILE + TILE - NPC_FEET.h - 4, width: NPC_FEET.w, height: NPC_FEET.h }));
}
const SOLID_BY_FLOOR: Record<FloorId, AABB[]> = {
  ground: [...casinoSolidBoxes('ground'), ...npcBoxes('ground')],
  upper: [...casinoSolidBoxes('upper'), ...npcBoxes('upper')],
  basement: [...casinoSolidBoxes('basement'), ...npcBoxes('basement')],
};
/** Piso e parede de cada andar. */
const FLOOR_COLORS: Record<FloorId, { wall: string; a: string; b: string; aisleA: string; aisleB: string }> = {
  ground: { wall: '#2a1020', a: '#8a2433', b: '#7c1f2d', aisleA: '#a8323f', aisleB: '#9b2c39' },
  upper: { wall: '#16143a', a: '#2d2a74', b: '#262363', aisleA: '#4a3f9a', aisleB: '#41388c' },
  basement: { wall: '#17120d', a: '#4a4036', b: '#40372e', aisleA: '#564a3d', aisleB: '#4d4236' },
};

interface Props {
  onExit: () => void;
}

export function CasinoInterior({ onExit }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const roomW = CASINO_W * TILE;
  const roomH = CASINO_H * TILE;
  const [floor, setFloor] = useState<FloorId>('ground');
  const floorRef = useRef<FloorId>('ground');
  floorRef.current = floor;
  const def = CASINO_FLOORS[floor];
  const tileToPos = (tile: { x: number; y: number }) => ({ x: tile.x * TILE + TILE / 2 - PLAYER_SIZE.x / 2, y: tile.y * TILE + TILE / 2 - PLAYER_SIZE.y / 2 });
  const startPos = { x: def.start.x * TILE + TILE / 2 - PLAYER_SIZE.x / 2, y: def.start.y * TILE };
  const positionRef = useRef({ ...startPos });
  const { stateRef: inputRef, setPressed } = useDirectionalInput();
  const playerX = useSharedValue(startPos.x);
  const playerY = useSharedValue(startPos.y);
  const [facing, setFacing] = useState<Direction>('up');
  const facingRef = useRef<Direction>('up');
  const exitedRef = useRef(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const frameTimerRef = useRef(0);
  // Chegou numa escada: não volta na hora, só depois de sair de cima dela.
  const stairsLockRef = useRef(true);
  /** Tile de chegada pela escada + se o jogador já soltou o direcional desde então (evita 'quicar' entre andares segurando a seta). */
  const arrivalRef = useRef<{ x: number; y: number; released: boolean } | null>(null);
  const [cellarOpen, setCellarOpen] = useState(() => hasFlag(CASINO_CELLAR_FLAG));
  const cellarRef = useRef(cellarOpen);
  cellarRef.current = cellarOpen;

  const bodyChar = getStoryCharacter(getStoryCharacterId()).fighter;
  const { equipped: cosEq } = useCosmetics();
  const wears = canWearCosmetics(bodyChar);
  useEffect(() => {
    preloadBodySprites(bodyChar, wears ? cosEq.skin : null);
  }, [bodyChar, wears, cosEq.skin]);

  const [nearNpc, setNearNpc] = useState<number | null>(null);
  const [nearStation, setNearStation] = useState<number | null>(null);
  const [nearChest, setNearChest] = useState(false);
  const [dialogueIdx, setDialogueIdx] = useState<number | null>(null);
  const [choiceDef, setChoiceDef] = useState<ChoiceDef | null>(null);
  const [casinoGame, setCasinoGame] = useState<CasinoGame | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [chestOpen, setChestOpen] = useState(() => (CASINO_FLOORS.ground.chest ? isCollected(CASINO_FLOORS.ground.chest.id) : true));
  const busy = dialogueIdx !== null || casinoGame !== null;
  const say = (text: string, ms = 2400) => {
    setToast(text);
    setTimeout(() => setToast(null), ms);
  };

  const goToFloor = (to: FloorId, fromFloor: FloorId) => {
    // chega ao lado da escada que leva de volta (a escada de `to` que aponta para `fromFloor`)
    const back = CASINO_FLOORS[to].stairs.find((s) => s.to === fromFloor);
    const tile = back ? { x: back.x, y: back.y - 1 } : CASINO_FLOORS[to].start;
    const pos = { x: tile.x * TILE + TILE / 2 - PLAYER_SIZE.x / 2, y: tile.y * TILE + TILE / 2 - PLAYER_SIZE.y / 2 };
    positionRef.current = pos;
    playerX.value = pos.x;
    playerY.value = pos.y;
    stairsLockRef.current = true;
    arrivalRef.current = { x: tile.x, y: tile.y, released: false };
    setFloor(to);
    const c = CASINO_FLOORS[to].chest;
    setChestOpen(c ? isCollected(c.id) : true);
    setNearNpc(null);
    setNearStation(null);
    setNearChest(false);
    playSfx('ui_hover', { gain: 0.6 });
  };

  useGameLoop((dtMs) => {
    if (exitedRef.current || busy) return;
    const fl = floorRef.current;
    const fdef = CASINO_FLOORS[fl];
    const dt = dtMs / 1000;
    const input = inputRef.current;
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy) || 1;
      const speed = 150;
      const step = { x: (dx / len) * speed * dt, y: (dy / len) * speed * dt };
      const feet = { x: positionRef.current.x + FEET.x, y: positionRef.current.y + FEET.y };
      const result = resolveMoveBoxes(WALL_MAPS[fl], feet, { x: FEET.w, y: FEET.h }, step, SOLID_BY_FLOOR[fl]);
      const np = { x: result.position.x - FEET.x, y: result.position.y - FEET.y };
      positionRef.current = np;
      playerX.value = np.x;
      playerY.value = np.y;
      frameTimerRef.current += dtMs;
      if (frameTimerRef.current >= WALK_FRAME_MS) {
        frameTimerRef.current = 0;
        setFrameIndex((i) => {
          const next = (i + 1) % WALK_FRAME_COUNT;
          if (next % 2 === 0) playSfx('step_wood', { gain: 0.4, minGapMs: 150 });
          return next;
        });
      }
      if (!movingRef.current) {
        movingRef.current = true;
        setMoving(true);
      }
      let nf: Direction = facingRef.current;
      if (Math.abs(dx) > Math.abs(dy)) nf = dx > 0 ? 'right' : 'left';
      else if (dy !== 0) nf = dy > 0 ? 'down' : 'up';
      if (nf !== facingRef.current) {
        facingRef.current = nf;
        setFacing(nf);
      }
      const tx = Math.floor((np.x + PLAYER_SIZE.x / 2) / TILE);
      const ty = Math.floor((np.y + PLAYER_SIZE.y / 2) / TILE);
      if (fl === 'ground' && casinoWallTile(tx, ty, 'ground') === 'door') {
        exitedRef.current = true;
        onExit();
        return;
      }
      const st = fdef.stairs.find((q) => q.x === tx && q.y === ty && (!q.hidden || cellarRef.current));
      if (!st) {
        const arr = arrivalRef.current;
        if (!arr || arr.released || Math.hypot(tx - arr.x, ty - arr.y) >= 3) stairsLockRef.current = false;
      } else if (!stairsLockRef.current) {
        goToFloor(st.to, fl);
        return;
      }
    } else {
      if (arrivalRef.current) arrivalRef.current.released = true;
      frameTimerRef.current = 0;
      if (movingRef.current) {
        movingRef.current = false;
        setMoving(false);
      }
    }

    const cx = positionRef.current.x + PLAYER_SIZE.x / 2;
    const cy = positionRef.current.y + PLAYER_SIZE.y / 2;
    let bestN: number | null = null;
    let bestND = TALK_RANGE;
    fdef.npcs.forEach((p, i) => {
      const d = Math.hypot(cx - (p.x * TILE + TILE / 2), cy - (p.y * TILE + TILE / 2));
      if (d < bestND) {
        bestND = d;
        bestN = i;
      }
    });
    let bestS: number | null = null;
    let bestSD = PLAY_RANGE;
    fdef.stations.forEach((s, i) => {
      const d = Math.hypot(cx - s.cx * TILE, cy - s.cy * TILE);
      if (d < bestSD) {
        bestSD = d;
        bestS = i;
      }
    });
    const ch = fdef.chest;
    const nearC = !!ch && Math.hypot(cx - (ch.x * TILE + TILE / 2), cy - (ch.y * TILE + TILE / 2)) < 70;
    if (bestN !== nearNpc) setNearNpc(bestN);
    if (bestS !== nearStation) setNearStation(bestS);
    if (nearC !== nearChest) setNearChest(nearC);
  });

  const camStyle = (extraX: number, extraY: number, sign: 1 | -1) =>
    useAnimatedStyle(() => {
      const camX = roomW <= width ? (roomW - width) / 2 : Math.min(Math.max(playerX.value + PLAYER_SIZE.x / 2 - width / 2, 0), roomW - width);
      const camY = roomH <= height ? (roomH - height) / 2 : Math.min(Math.max(playerY.value + PLAYER_SIZE.y / 2 - height / 2, 0), roomH - height);
      return sign === 1 ? { transform: [{ translateX: playerX.value - camX + extraX }, { translateY: playerY.value - camY + extraY }] } : { transform: [{ translateX: -camX }, { translateY: -camY }] };
    });
  const playerStyle = camStyle(0, 0, 1);
  const worldStyle = camStyle(0, 0, -1);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onQuestNotice((text) => {
      setToast(text);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 2600);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const openChest = () => {
    const ch = def.chest;
    if (!ch || chestOpen) return;
    if (ch.itemId && bagRoomFor(ch.itemId, 1) < 1) {
      say(t('bag_full'));
      playSfx('ui_denied');
      return;
    }
    playSfx(ch.coins ? 'coin' : 'use_item');
    if (ch.coins) addCoins(ch.coins);
    if (ch.itemId) addItem(ch.itemId, 1);
    markCollected(ch.id);
    refreshMissions(); // o baú do cofre é passo da missão secreta
    setChestOpen(true);
    say(`${ch.coins ? `+${ch.coins} ${CURRENCY_ABBR}` : ''}${ch.coins && ch.itemId ? '  ' : ''}${ch.itemId ? itemName(ch.itemId) : ''}`);
  };

  const pal = FLOOR_COLORS[floor];
  const tiles: React.ReactNode[] = [];
  for (let y = 0; y < CASINO_H; y++) {
    for (let x = 0; x < CASINO_W; x++) {
      const k = casinoWallTile(x, y, floor);
      const aisle = x >= 13 && x <= 14;
      const a = hash2(x * 4.4, y * 6.6) > 0.5;
      const color = k === 'wall' ? pal.wall : k === 'door' ? '#e8c477' : aisle ? (a ? pal.aisleA : pal.aisleB) : a ? pal.a : pal.b;
      tiles.push(<View key={`${x}-${y}`} style={{ position: 'absolute', left: x * TILE, top: y * TILE, width: TILE, height: TILE, backgroundColor: color, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.15)' }} />);
    }
  }

  const bodyPose = moving ? `walk${frameIndex + 1}` : 'idle';
  const bodyAspect = SPRITE_ASPECTS[bodyChar]?.[bodyPose] ?? 1;
  const BODY_BOX_W = PLAYER_SIZE.x * 1.9;
  const BODY_BOX_H = PLAYER_SIZE.y * 1.7;
  const bodyW = bodyAspect > BODY_BOX_W / BODY_BOX_H ? BODY_BOX_W : BODY_BOX_H * bodyAspect;
  const bodyH = bodyAspect > BODY_BOX_W / BODY_BOX_H ? BODY_BOX_W / bodyAspect : BODY_BOX_H;
  const bodyBox = { left: (PLAYER_SIZE.x - BODY_BOX_W) / 2 + (BODY_BOX_W - bodyW) / 2, top: PLAYER_SIZE.y - BODY_BOX_H + (BODY_BOX_H - bodyH) / 2, width: bodyW, height: bodyH };
  const bodyDir: 1 | -1 = facing === 'left' ? -1 : 1;

  const talkNpc = dialogueIdx !== null ? NPCS[def.npcs[dialogueIdx].npcId] : null;
  const station = nearStation !== null ? def.stations[nearStation] : null;
  const nearbyNpc = nearNpc !== null ? NPCS[def.npcs[nearNpc].npcId] : null;
  const floorKey = floor === 'ground' ? 'cas_floor_ground' : floor === 'upper' ? 'cas_floor_upper' : 'cas_floor_basement';

  const finishTalk = (npcId: string) => {
    setDialogueIdx(null);
    setChoiceDef(null);
    // O Velho Poker conta onde fica a escada secreta: ela passa a existir no canto de baixo à esquerda do térreo.
    if (npcId === 'velho_poker' && !hasFlag(CASINO_CELLAR_FLAG)) {
      setFlag(CASINO_CELLAR_FLAG);
      setCellarOpen(true);
      say(t('cas_cellar_found'), 3200);
    }
    reportTalk(npcId);
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: roomW, height: roomH }, worldStyle]}>
        {tiles}
        {def.pieces.map((p, i) => {
          const cells = p.tile ? Array.from({ length: p.w * p.h }, (_, k) => k) : [0];
          return (
            <View key={`${floor}_${i}`} pointerEvents="none" style={{ position: 'absolute', left: p.x * TILE, top: p.y * TILE, width: p.w * TILE, height: p.h * TILE }}>
              {cells.map((k) => {
                const cw = p.tile ? TILE : p.w * TILE;
                const ch = p.tile ? TILE : p.h * TILE;
                return <Image key={k} source={ART[p.sprite]} resizeMode="contain" style={{ position: 'absolute', left: p.tile ? (k % p.w) * TILE : 0, top: p.tile ? Math.floor(k / p.w) * TILE : 0, width: cw, height: ch }} />;
              })}
            </View>
          );
        })}
        {def.stairs.map((st) => {
          if (st.hidden && !cellarOpen) return null;
          const up = st.to === 'upper' || (floor === 'basement' && st.to === 'ground');
          return (
            <View key={`st_${st.x}_${st.y}`} pointerEvents="none" style={{ position: 'absolute', left: st.x * TILE, top: st.y * TILE, width: TILE, height: TILE, alignItems: 'center', justifyContent: 'center', backgroundColor: st.hidden ? 'rgba(255,215,0,0.22)' : 'rgba(255,255,255,0.12)', borderWidth: 2, borderColor: st.hidden ? '#FFD700' : 'rgba(255,255,255,0.5)' }}>
              <GameIcon name={up ? 'arrow_up' : 'arrow_down'} size={TILE * 0.5} />
            </View>
          );
        })}
        {def.chest && (
          <View pointerEvents="none" style={{ position: 'absolute', left: def.chest.x * TILE + 6, top: def.chest.y * TILE + 6, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', opacity: chestOpen ? 0.5 : 1 }}>
            <GameIcon name={chestOpen ? 'chest_open' : 'gift'} size={28} />
          </View>
        )}
        {def.npcs.map((p, i) => {
          const npc = NPCS[p.npcId];
          if (!npc) return null;
          return (
            <View key={`${floor}_${p.npcId}_${i}`} style={{ position: 'absolute', left: p.x * TILE + TILE / 2 - 17, top: p.y * TILE - 6, zIndex: p.y }}>
              <NpcFigure npc={npc} />
            </View>
          );
        })}
      </Animated.View>

      <Animated.View style={[styles.player, playerStyle]}>
        {wears && <CapeLayer characterKey={bodyChar} poseKey={bodyPose} box={bodyBox} dir={bodyDir} cosmeticId={cosEq.cape} />}
        <Image
          source={getBodySprite(bodyChar, bodyPose, wears ? cosEq.skin : null)}
          resizeMode="contain"
          style={[{ position: 'absolute', bottom: 0, left: (PLAYER_SIZE.x - PLAYER_SIZE.x * 1.9) / 2, width: PLAYER_SIZE.x * 1.9, height: PLAYER_SIZE.y * 1.7 }, facing === 'left' && styles.flip]}
        />
        {wears && <HatLayer characterKey={bodyChar} poseKey={bodyPose} box={bodyBox} dir={bodyDir} cosmeticId={cosEq.hat} />}
      </Animated.View>

      <View style={[styles.hud, { top: insets.top + 12 }]} pointerEvents="none">
        <Text style={styles.hudText}>{t(floorKey)}</Text>
        <Text style={styles.hudSub}>{t('cas_hud_sub')}</Text>
      </View>
      <View style={[styles.exitRow, { top: insets.top + 12, right: insets.right + 16 }]}>
        <MenuButton label={t('pause_exit')} variant="ghost" onPress={onExit} />
      </View>

      {!busy && (station || (nearChest && !chestOpen)) && (
        <View style={[styles.playRow, { bottom: insets.bottom + 100 }]}>
          {station && <MenuButton label={`${t('cas_play')}: ${t(station.labelKey)}`} onPress={() => setCasinoGame(station.game)} />}
          {nearChest && !chestOpen && <MenuButton label={t('cas_chest_open')} variant="ghost" onPress={openChest} />}
        </View>
      )}
      {!busy && nearbyNpc && (
        <Pressable
          style={[styles.interactBtn, { bottom: insets.bottom + 180 }]}
          onPress={() => {
            setChoiceDef(pendingChoiceFor(nearbyNpc.id));
            setDialogueIdx(nearNpc);
          }}
        >
          <Text style={styles.interactLabel}>{t('interact_talk')} · {nearbyNpc.name}</Text>
        </Pressable>
      )}

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
      {!busy && <DPad onPress={setPressed} />}

      {talkNpc && choiceDef && <ChoiceOverlay npc={talkNpc} choice={choiceDef} onFinish={() => finishTalk(talkNpc.id)} />}
      {talkNpc && !choiceDef && <DialogueOverlay npc={resolveNpcDialogue(talkNpc)} onFinish={() => finishTalk(talkNpc.id)} />}
      {casinoGame && <CasinoOverlay initialGame={casinoGame} onClose={() => setCasinoGame(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#0a0a12', overflow: 'hidden' },
  player: { position: 'absolute', left: 0, top: 0, width: PLAYER_SIZE.x, height: PLAYER_SIZE.y, alignItems: 'center', zIndex: 999 },
  flip: { transform: [{ scaleX: -1 }] },
  hud: { position: 'absolute', alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  hudText: { color: '#FFD700', fontWeight: '800', fontSize: 16, textShadowColor: '#000', textShadowRadius: 4 },
  hudSub: { color: '#fff', opacity: 0.8, fontSize: 11, marginTop: 2, textShadowColor: '#000', textShadowRadius: 3 },
  exitRow: { position: 'absolute' },
  playRow: { position: 'absolute', alignSelf: 'center', left: 0, right: 0, flexDirection: 'row', gap: 10, justifyContent: 'center' },
  interactBtn: { position: 'absolute', left: '50%', marginLeft: -110, width: 220, paddingVertical: 10, borderRadius: 10, borderWidth: 2, borderColor: '#FFD700', backgroundColor: 'rgba(10,10,18,0.85)', alignItems: 'center' },
  interactLabel: { color: '#FFD700', fontWeight: '800', fontSize: 13 },
  toast: { position: 'absolute', top: '40%', alignSelf: 'center', backgroundColor: 'rgba(10,10,18,0.9)', borderWidth: 2, borderColor: '#FFD700', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18 },
  toastText: { color: '#FFD700', fontWeight: '700', fontSize: 14 },
});
