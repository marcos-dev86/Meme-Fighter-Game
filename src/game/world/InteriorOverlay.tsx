import React, { useEffect, useRef, useState } from 'react';
import { GameIcon } from '@/game/ui/GameIcon';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveMoveBoxes, type AABB } from '@/game/collision/collision';
import { useGameLoop } from '@/game/core/useGameLoop';
import { DPad } from '@/game/input/DPad';
import { useDirectionalInput } from '@/game/input/useDirectionalInput';
import type { Direction, MapDef, TileType } from '@/types/game';
import { MenuButton } from '@/game/menu/MenuButton';
import { BUILDING_CONTENT, type FloorContent, type InteriorTemplate } from './buildingContent';
import { NPCS } from './npcs';
import { CharacterMarker } from './CharacterMarker';
import { NpcSprite } from './NpcSprite';
import { getIdleAspect, getSprite, SPRITE_ASPECTS } from '@/game/battle/sprites';
import { CapeLayer, HatLayer, getBodySprite, canWearCosmetics, preloadBodySprites } from '@/game/cosmetics/CosmeticLayers';
import { useCosmetics } from '@/game/state/cosmeticsState';
import { getStoryCharacterId } from '@/game/state/questState';
import { getStoryCharacter } from '@/game/story/characters';
import { DialogueOverlay } from '@/game/dialogue/DialogueOverlay';
import { resolveNpcDialogue } from '@/game/story/npcDialogue';
import { ChoiceOverlay } from '@/game/dialogue/ChoiceOverlay';
import { pendingChoiceFor, type ChoiceDef } from '@/game/story/storyChoices';
import { onQuestNotice, refreshMissions, reportTalk } from '@/game/state/questState';
import { ShopOverlay } from './ShopOverlay';
import { BATTLE_STOCK } from '@/game/items/itemDefs';
import { CasinoOverlay } from './CasinoOverlay';
import { CosmeticShopOverlay } from './CosmeticShopOverlay';
import { itemName } from '@/game/items/itemDefs';
import { addCoins, addItem, bagRoomFor, isCollected, markCollected } from '@/game/state/playerState';
import { useI18n } from '@/game/i18n/i18n';
import { playSfx } from '@/game/audio/audioManager';
import { haptic } from '@/game/audio/haptics';
import { CURRENCY_ABBR } from '@/game/items/itemDefs';
import { hash2 } from './overworld';

const ROOM_W = 9;
const ROOM_H = 7;
const ROOM_TILE = 44;
const DOOR_X = 4;
const PLAYER_SIZE = { x: 22, y: 30 };
const INTERACT_RANGE = 60;
const NPC_MARKER_SIZE = 34;
// Stairs sit in the two top corners, clear of every template's furniture
// and of the npc/chest spots (4,2)/(7,4) - see docs/AUDIT.md. Up and down
// get their own corner so a building with both someday won't collide.
const STAIRS_UP_POS = { x: 7, y: 1 };
const STAIRS_DOWN_POS = { x: 1, y: 1 };

const WALK_FRAME_COUNT = 3; // o corpo vem de getBodySprite (pose + skin)
const WALK_FRAME_MS = 140;
// Collision uses only the player's FEET (a small box at the bottom of the
// body), like the classic top-down RPGs: the head can overlap a wall or a
// shelf behind it, the feet can't walk through it.
const FEET = { x: 3, y: 16, w: 16, h: 14 };

const FLOOR_PALETTE: Record<InteriorTemplate, [string, string]> = {
  shop: ['#cbab6f', '#c2a165'],
  cozyHome: ['#b9a37e', '#af9974'],
  humbleHome: ['#b9a37e', '#af9974'],
  loft: ['#cdb68f', '#c3ab82'],
  basement: ['#6e6e6e', '#646464'],
  casino: ['#8a2433', '#7c1f2d'],
};
const WALL_COLOR: Record<InteriorTemplate, string> = {
  shop: '#4a3826',
  cozyHome: '#4a3826',
  humbleHome: '#4a3826',
  loft: '#4a3826',
  basement: '#333333',
  casino: '#2a1020',
};

type FurnitureSprite =
  | 'bedRed' | 'bedRedDouble' | 'bedBlue' | 'bedDouble' | 'clock' | 'tableCloth' | 'table' | 'tableRound'
  | 'counter' | 'shelf' | 'bookshelf' | 'crate' | 'barrel' | 'plant' | 'wardrobe' | 'lamp' | 'rug' | 'chairL' | 'chairR'
  | 'tvstand' | 'sofa' | 'fridge' | 'sideboard' | 'display';

/* eslint-disable @typescript-eslint/no-require-imports */
const FURNITURE_IMG: Record<FurnitureSprite, number> = {
  bedRed: require('../../../assets/furniture/bed_red.png'),
  bedRedDouble: require('../../../assets/furniture/bed_red_double.png'),
  bedBlue: require('../../../assets/furniture/bed_blue.png'),
  bedDouble: require('../../../assets/furniture/bed_double.png'),
  clock: require('../../../assets/furniture/clock.png'),
  tableCloth: require('../../../assets/furniture/table_cloth.png'),
  table: require('../../../assets/furniture/table.png'),
  tableRound: require('../../../assets/furniture/table_round.png'),
  counter: require('../../../assets/furniture/counter.png'),
  shelf: require('../../../assets/furniture/shelf.png'),
  bookshelf: require('../../../assets/furniture/bookshelf.png'),
  crate: require('../../../assets/furniture/crate.png'),
  barrel: require('../../../assets/furniture/barrel.png'),
  plant: require('../../../assets/furniture/plant.png'),
  wardrobe: require('../../../assets/furniture/wardrobe.png'),
  lamp: require('../../../assets/furniture/lamp.png'),
  rug: require('../../../assets/furniture/rug.png'),
  chairL: require('../../../assets/furniture/chair_l.png'),
  chairR: require('../../../assets/furniture/chair_r.png'),
  tvstand: require('../../../assets/furniture/tvstand.png'),
  sofa: require('../../../assets/furniture/sofa.png'),
  fridge: require('../../../assets/furniture/fridge.png'),
  sideboard: require('../../../assets/furniture/sideboard.png'),
  display: require('../../../assets/furniture/display.png'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * A piece of furniture occupying a w x h block of tiles.
 *  - `tile: true`: the sprite repeats once per tile (counters, shelves in
 *    a row), good for long pieces made from a 1-tile sprite.
 *  - otherwise one sprite is stretched-to-fit ("contain") over the block
 *    (beds, tables, clock).
 *  - `solid: false` pieces (rugs) are drawn under the player and can be
 *    walked over.
 */
interface FurniturePiece {
  x: number;
  y: number;
  w: number;
  h: number;
  sprite: FurnitureSprite;
  tile?: boolean;
  solid?: boolean;
}

// Furniture layout per template - hand-placed. Spots kept clear: NPCs
// (4,2) and (6,2), chest (7,4), stairs (7,1) and (1,1), door column 4.
const FURNITURE: Record<InteriorTemplate, FurniturePiece[]> = {
  shop: [
    { x: 3, y: 1, w: 3, h: 1, sprite: 'counter', tile: true },
    { x: 1, y: 4, w: 1, h: 2, sprite: 'shelf', tile: true },
    { x: 1, y: 1, w: 1, h: 2, sprite: 'shelf', tile: true },
    { x: 7, y: 1, w: 1, h: 1, sprite: 'plant' },
    { x: 7, y: 5, w: 1, h: 1, sprite: 'crate' },
  ],
  cozyHome: [
    { x: 3, y: 3, w: 3, h: 2, sprite: 'rug', solid: false },
    { x: 1, y: 1, w: 2, h: 2, sprite: 'bedRedDouble' },
    { x: 3, y: 1, w: 1, h: 1, sprite: 'clock' },
    { x: 5, y: 4, w: 2, h: 1, sprite: 'tableCloth' },
    { x: 4, y: 4, w: 1, h: 1, sprite: 'chairL', solid: false },
    { x: 6, y: 1, w: 1, h: 1, sprite: 'bookshelf' },
    { x: 1, y: 5, w: 1, h: 1, sprite: 'plant' },
  ],
  humbleHome: [
    { x: 6, y: 1, w: 1, h: 2, sprite: 'bedRed' },
    { x: 1, y: 4, w: 1, h: 1, sprite: 'tableRound' },
    { x: 2, y: 4, w: 1, h: 1, sprite: 'chairR', solid: false },
    { x: 2, y: 1, w: 1, h: 1, sprite: 'lamp' },
    { x: 3, y: 1, w: 1, h: 1, sprite: 'sideboard' },
  ],
  loft: [
    { x: 2, y: 4, w: 2, h: 2, sprite: 'bedDouble' },
    { x: 5, y: 1, w: 2, h: 1, sprite: 'bookshelf', tile: true },
    { x: 7, y: 5, w: 1, h: 1, sprite: 'tableRound' },
    { x: 1, y: 2, w: 1, h: 1, sprite: 'wardrobe' },
  ],
  casino: [
    { x: 3, y: 1, w: 3, h: 1, sprite: 'counter', tile: true },
    { x: 1, y: 1, w: 1, h: 2, sprite: 'display', tile: true },
    { x: 7, y: 1, w: 1, h: 2, sprite: 'display', tile: true },
    { x: 1, y: 4, w: 1, h: 2, sprite: 'display', tile: true },
    { x: 3, y: 3, w: 3, h: 2, sprite: 'rug', solid: false },
    { x: 7, y: 5, w: 1, h: 1, sprite: 'plant' },
  ],
  basement: [
    { x: 3, y: 1, w: 2, h: 1, sprite: 'crate', tile: true },
    { x: 1, y: 4, w: 1, h: 2, sprite: 'barrel', tile: true },
    { x: 5, y: 4, w: 1, h: 1, sprite: 'barrel' },
    { x: 7, y: 5, w: 1, h: 1, sprite: 'crate' },
  ],
};

/** Natural size (px) of every furniture picture, to place its collision box exactly where the art is drawn. */
const FURNITURE_SIZE: Record<FurnitureSprite, [number, number]> = {
  bedRed: [117, 235], bedRedDouble: [222, 231], bedBlue: [42, 50], bedDouble: [45, 52], clock: [92, 214], tableCloth: [188, 139],
  table: [60, 37], tableRound: [41, 39], counter: [46, 27], shelf: [40, 45], bookshelf: [50, 58], crate: [38, 53], barrel: [25, 35],
  plant: [40, 50], wardrobe: [32, 52], lamp: [17, 46], rug: [56, 37], chairL: [60, 110], chairR: [58, 111], tvstand: [55, 49],
  sofa: [59, 34], fridge: [52, 51], sideboard: [50, 32], display: [61, 41],
};

/** Where a picture ends up inside a cw x ch cell with resizeMode="contain" (what you SEE). */
function containRect(sprite: FurnitureSprite, ox: number, oy: number, cw: number, ch: number): AABB {
  const [iw, ih] = FURNITURE_SIZE[sprite];
  const k = Math.min(cw / iw, ch / ih);
  const w = iw * k;
  const h = ih * k;
  return { x: ox + (cw - w) / 2, y: oy + (ch - h) / 2, width: w, height: h };
}

/** Solid rectangles of a room's furniture = the visible art, nothing more (rugs/chairs stay walkable). */
function furnitureBoxes(template: InteriorTemplate): AABB[] {
  const out: AABB[] = [];
  for (const f of FURNITURE[template]) {
    if (f.solid === false) continue;
    if (f.tile) {
      for (let k = 0; k < f.w * f.h; k++) {
        out.push(containRect(f.sprite, (f.x + (k % f.w)) * ROOM_TILE, (f.y + Math.floor(k / f.w)) * ROOM_TILE, ROOM_TILE, ROOM_TILE));
      }
    } else {
      out.push(containRect(f.sprite, f.x * ROOM_TILE, f.y * ROOM_TILE, f.w * ROOM_TILE, f.h * ROOM_TILE));
    }
  }
  // Shrink a hair so brushing past an edge doesn't snag.
  return out.map((b) => ({ x: b.x + 2, y: b.y + 2, width: Math.max(4, b.width - 4), height: Math.max(4, b.height - 4) }));
}

/** Collision map: only the room's outer walls are tiles (the door stays open); furniture is handled by furnitureBoxes(). */
function getWallTile(x: number, y: number, isGroundFloor: boolean): TileType {
  if (x < 0 || y < 0 || x >= ROOM_W || y >= ROOM_H) return 'wall';
  if (x === 0 || y === 0 || x === ROOM_W - 1 || y === ROOM_H - 1) {
    if (isGroundFloor && y === ROOM_H - 1 && x === DOOR_X) return 'door';
    return 'wall';
  }
  return 'sand';
}

function getRoomTile(x: number, y: number, template: InteriorTemplate, isGroundFloor: boolean): TileType {
  if (x < 0 || y < 0 || x >= ROOM_W || y >= ROOM_H) return 'wall';
  const isBorder = x === 0 || y === 0 || x === ROOM_W - 1 || y === ROOM_H - 1;
  if (isBorder) {
    // The world-exit door only exists on the ground floor - on an extra
    // floor that same cell is just a wall, the only way back down is the
    // stairs (see STAIRS_UP_POS/STAIRS_DOWN_POS below).
    if (isGroundFloor && y === ROOM_H - 1 && x === DOOR_X) return 'door';
    return 'wall';
  }
  for (const f of FURNITURE[template]) {
    if (f.solid === false) continue;
    if (x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h) return 'wall';
  }
  return template === 'shop' ? 'stone' : 'sand';
}

/** Interior NPC: the meme character's own sprite when it has one (same as
 * outdoors), otherwise the generic paper-doll marker. */
export function NpcFigure({ npc }: { npc: (typeof NPCS)[string] }) {
  if (!npc.fighterSprite && npc.portraitSprite) {
    const ph = NPC_MARKER_SIZE * 1.8;
    return (
      <View style={{ width: NPC_MARKER_SIZE, alignItems: 'center' }}>
        <Image source={npc.portraitSprite} resizeMode="contain" style={{ width: ph * Math.min(npc.portraitAspect ?? 1, 1.6), height: ph }} />
      </View>
    );
  }
  if (!npc.fighterSprite && npc.sheetChar) {
    return (
      <View style={{ width: NPC_MARKER_SIZE, alignItems: 'center' }}>
        <NpcSprite char={npc.sheetChar} />
      </View>
    );
  }
  if (!npc.fighterSprite) {
    return <CharacterMarker size={NPC_MARKER_SIZE} skinColor={npc.skinColor} outfitColor={npc.outfitColor} hairColor={npc.hairColor} />;
  }
  const h = NPC_MARKER_SIZE * 1.7;
  return (
    <View style={{ width: NPC_MARKER_SIZE, alignItems: 'center' }}>
      <Image source={getSprite(npc.fighterSprite, 'idle')} resizeMode="contain" style={{ width: h * getIdleAspect(npc.fighterSprite), height: h }} />
    </View>
  );
}

interface Props {
  buildingId: string;
  onExit: () => void;
}

export function InteriorOverlay({ buildingId, onExit }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const building = BUILDING_CONTENT[buildingId];

  // 'ground' is always building's own template/npc/chest; 'up'/'down' read
  // from building.upstairs/basement when present (see buildingContent.ts).
  const [floor, setFloor] = useState<'ground' | 'up' | 'down'>('ground');
  const floorRef = useRef(floor);
  floorRef.current = floor;

  const content: FloorContent | undefined = floor === 'up' ? building?.upstairs : floor === 'down' ? building?.basement : building;
  const template = content?.template ?? 'humbleHome';
  const isGroundFloor = floor === 'ground';
  const npc = content?.npcId ? NPCS[content.npcId] : null;
  // A second resident on the same floor - Marina/Maximilian in the shop
  // (see docs/AUDIT.md: shops stay single-floor, so he stands next to
  // her instead of getting his own floor).
  const npc2 = content?.npcId2 ? NPCS[content.npcId2] : null;
  const hasBattleShop = content?.npcId === 'maximilian' || content?.npcId2 === 'maximilian';
  const hasCasino = !!content?.casino;
  const hasCosmetics = !!content?.cosmetics;
  const hasUpstairs = isGroundFloor && !!building?.upstairs;
  const hasBasement = isGroundFloor && !!building?.basement;
  // On an extra floor, the only way back is the same stairs you came up/
  // down through, at the same spot.
  const stairsBackPos = floor === 'up' ? STAIRS_UP_POS : floor === 'down' ? STAIRS_DOWN_POS : null;

  const [chestOpen, setChestOpen] = useState(() => (content?.chest ? isCollected(content.chest.id) : true));
  useEffect(() => {
    setChestOpen(content?.chest ? isCollected(content.chest.id) : true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor]);

  const chestPos = { x: ROOM_W - 2, y: ROOM_H - 3 };
  const npcPos = { x: 4, y: 2 };
  const npc2Pos = { x: 6, y: 2 };

  const startPos = { x: DOOR_X * ROOM_TILE + ROOM_TILE / 2 - PLAYER_SIZE.x / 2, y: (ROOM_H - 2) * ROOM_TILE };
  const positionRef = useRef({ ...startPos });
  const { stateRef: inputRef, setPressed } = useDirectionalInput();

  const playerX = useSharedValue(startPos.x);
  const playerY = useSharedValue(startPos.y);
  const [facing, setFacing] = useState<Direction>('down');
  const bodyDir: 1 | -1 = facing === 'left' ? -1 : 1;
  const facingRef = useRef<Direction>('down');
  const exitedRef = useRef(false);
  const [frameIndex, setFrameIndex] = useState(0);
  // Cosméticos do jogador (skin, capa, chapéu) também valem dentro das casas.
  const bodyChar = getStoryCharacter(getStoryCharacterId()).fighter;
  const { equipped: cosEq } = useCosmetics();
  const wears = canWearCosmetics(bodyChar);
  useEffect(() => {
    preloadBodySprites(bodyChar, wears ? cosEq.skin : null);
  }, [bodyChar, wears, cosEq.skin]);
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const frameTimerRef = useRef(0);
  // Solid furniture rectangles of the floor being shown (recomputed when the floor changes).
  const boxesRef = useRef<AABB[]>([]);
  boxesRef.current = furnitureBoxes(template);
  // Just arrived on a staircase tile: don't bounce straight back until the player steps off it.
  const stairsLockRef = useRef(false);

  const [nearby, setNearby] = useState<'npc' | 'npc2' | 'chest' | null>(null);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [choiceDef, setChoiceDef] = useState<ChoiceDef | null>(null); // escolha da história oferecida por esse NPC (travada ao abrir a conversa)
  const [shopOpen, setShopOpen] = useState(false);
  const [battleShopOpen, setBattleShopOpen] = useState(false);
  const [casinoOpen, setCasinoOpen] = useState(false);
  const [cosmeticsOpen, setCosmeticsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Whichever of npc/npc2 the player last approached - DialogueOverlay
  // needs to know which one, now that a floor can have both.
  const dialogueTarget = nearby === 'npc2' ? npc2 : npc;

  const roomMap: MapDef = {
    id: 'interior',
    name: content?.label ?? 'Interior',
    tileSize: ROOM_TILE,
    width: ROOM_W,
    height: ROOM_H,
    getTile: (x, y) => getWallTile(x, y, isGroundFloor),
    spawns: [],
    exits: [],
    npcs: [],
    objects: [],
  };

  /** Moves the player to a given stairs tile's position on the floor
   * they're arriving at, so climbing stairs up/down visually lands you
   * right next to them rather than snapping back to the room's door. */
  const arriveAt = (tile: { x: number; y: number }) => {
    const x = tile.x * ROOM_TILE + ROOM_TILE / 2 - PLAYER_SIZE.x / 2;
    const y = tile.y * ROOM_TILE + ROOM_TILE / 2 - PLAYER_SIZE.y / 2;
    positionRef.current = { x, y };
    playerX.value = x;
    playerY.value = y;
  };

  useGameLoop((dtMs) => {
    if (exitedRef.current || dialogueOpen || shopOpen || battleShopOpen || casinoOpen || cosmeticsOpen) return;
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
      const speed = 130;
      const step = { x: (dx / len) * speed * dt, y: (dy / len) * speed * dt };
      // Move the FEET box (see FEET), then put the body back around it.
      const feet = { x: positionRef.current.x + FEET.x, y: positionRef.current.y + FEET.y };
      const result = resolveMoveBoxes(roomMap, feet, { x: FEET.w, y: FEET.h }, step, boxesRef.current);
      const np = { x: result.position.x - FEET.x, y: result.position.y - FEET.y };
      positionRef.current = np;
      playerX.value = np.x;
      playerY.value = np.y;

      // Walk cycle.
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

      let newFacing: Direction = facingRef.current;
      if (Math.abs(dx) > Math.abs(dy)) newFacing = dx > 0 ? 'right' : 'left';
      else if (dy !== 0) newFacing = dy > 0 ? 'down' : 'up';
      if (newFacing !== facingRef.current) {
        facingRef.current = newFacing;
        setFacing(newFacing);
      }

      const tileX = Math.floor((positionRef.current.x + PLAYER_SIZE.x / 2) / ROOM_TILE);
      const tileY = Math.floor((positionRef.current.y + PLAYER_SIZE.y / 2) / ROOM_TILE);

      if (floorRef.current === 'ground' && getRoomTile(tileX, tileY, template, true) === 'door' && !exitedRef.current) {
        exitedRef.current = true;
        onExit();
        return;
      }
      const onStairs =
        (floorRef.current === 'ground' && ((hasUpstairs && tileX === STAIRS_UP_POS.x && tileY === STAIRS_UP_POS.y) || (hasBasement && tileX === STAIRS_DOWN_POS.x && tileY === STAIRS_DOWN_POS.y))) ||
        (floorRef.current !== 'ground' && !!stairsBackPos && tileX === stairsBackPos.x && tileY === stairsBackPos.y);
      if (!onStairs) stairsLockRef.current = false;
      if (onStairs && !stairsLockRef.current) {
        stairsLockRef.current = true;
        if (floorRef.current === 'ground') {
          const up = hasUpstairs && tileX === STAIRS_UP_POS.x && tileY === STAIRS_UP_POS.y;
          setFloor(up ? 'up' : 'down');
          arriveAt(up ? STAIRS_UP_POS : STAIRS_DOWN_POS);
        } else {
          setFloor('ground');
          arriveAt(stairsBackPos!);
        }
        return;
      }
    }

    if (dx === 0 && dy === 0) {
      frameTimerRef.current = 0;
      if (movingRef.current) {
        movingRef.current = false;
        setMoving(false);
      }
    }

    const cx = positionRef.current.x + PLAYER_SIZE.x / 2;
    const cy = positionRef.current.y + PLAYER_SIZE.y / 2;
    let found: 'npc' | 'npc2' | 'chest' | null = null;
    if (npc) {
      const nx = npcPos.x * ROOM_TILE + ROOM_TILE / 2;
      const ny = npcPos.y * ROOM_TILE + ROOM_TILE / 2;
      if (Math.hypot(cx - nx, cy - ny) < INTERACT_RANGE) found = 'npc';
    }
    if (!found && npc2) {
      const nx = npc2Pos.x * ROOM_TILE + ROOM_TILE / 2;
      const ny = npc2Pos.y * ROOM_TILE + ROOM_TILE / 2;
      if (Math.hypot(cx - nx, cy - ny) < INTERACT_RANGE) found = 'npc2';
    }
    if (!found && content?.chest && !chestOpen) {
      const chx = chestPos.x * ROOM_TILE + ROOM_TILE / 2;
      const chy = chestPos.y * ROOM_TILE + ROOM_TILE / 2;
      if (Math.hypot(cx - chx, cy - chy) < INTERACT_RANGE) found = 'chest';
    }
    if (found !== nearby) setNearby(found);
  });

  const playerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: playerX.value }, { translateY: playerY.value }],
  }));

  const openChest = () => {
    if (!content?.chest || chestOpen) return;
    const chest = content.chest;
    // A full/heavy bag leaves the chest closed (nothing is lost): come back with room.
    if (chest.itemId && bagRoomFor(chest.itemId, 1) < 1) {
      setToast(t('bag_full'));
      setTimeout(() => setToast(null), 2200);
      playSfx('ui_denied');
      return;
    }
    playSfx(chest.coins ? 'coin' : 'use_item');
    haptic('medium');
    if (chest.coins) addCoins(chest.coins);
    if (chest.itemId) addItem(chest.itemId, 1);
    markCollected(chest.id);
    refreshMissions(); // a chest can be a mission step
    setChestOpen(true);
    setToast(chest.coins ? `+${chest.coins} ${CURRENCY_ABBR}` : itemName(chest.itemId!));
    setTimeout(() => setToast(null), 2200);
  };

  // "item received" / "next step" notices from the mission engine (the world screen is hidden behind this room).
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

  const originX = (width - ROOM_W * ROOM_TILE) / 2;
  const originY = (height - ROOM_H * ROOM_TILE) / 2;

  const tiles: React.ReactNode[] = [];
  for (let y = 0; y < ROOM_H; y++) {
    for (let x = 0; x < ROOM_W; x++) {
      const t = getWallTile(x, y, isGroundFloor);
      const isFloor = t === 'stone' || t === 'sand';
      const palette = FLOOR_PALETTE[template];
      const color = t === 'wall' ? WALL_COLOR[template] : t === 'door' ? '#e8c477' : hash2(x * 4.4, y * 6.6) > 0.5 ? palette[0] : palette[1];
      tiles.push(
        <View
          key={`${x}-${y}`}
          style={{
            position: 'absolute',
            left: x * ROOM_TILE,
            top: y * ROOM_TILE,
            width: ROOM_TILE,
            height: ROOM_TILE,
            backgroundColor: isFloor || t === 'door' ? color : WALL_COLOR[template],
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: 'rgba(0,0,0,0.15)',
          }}
        />
      );
    }
  }

  // pose do corpo e a caixa em que a imagem é desenhada (ancora capa e chapéu)
  const bodyPose = moving ? `walk${frameIndex + 1}` : 'idle';
  const bodyAspect = SPRITE_ASPECTS[bodyChar]?.[bodyPose] ?? 1;
  const BODY_BOX_W = PLAYER_SIZE.x * 1.9;
  const BODY_BOX_H = PLAYER_SIZE.y * 1.7;
  const bodyW = bodyAspect > BODY_BOX_W / BODY_BOX_H ? BODY_BOX_W : BODY_BOX_H * bodyAspect;
  const bodyH = bodyAspect > BODY_BOX_W / BODY_BOX_H ? BODY_BOX_W / bodyAspect : BODY_BOX_H;
  const bodyBox = { left: (PLAYER_SIZE.x - BODY_BOX_W) / 2 + (BODY_BOX_W - bodyW) / 2, top: PLAYER_SIZE.y - BODY_BOX_H + (BODY_BOX_H - bodyH) / 2, width: bodyW, height: bodyH };

  return (
    <View style={styles.root}>
      <View style={[styles.room, { left: originX, top: originY, width: ROOM_W * ROOM_TILE, height: ROOM_H * ROOM_TILE }]}>
        {tiles}

        {FURNITURE[template].map((f, i) => {
          const cells = f.tile ? Array.from({ length: f.w * f.h }, (_, k) => k) : [0];
          return (
            <View key={i} style={{ position: 'absolute', left: f.x * ROOM_TILE, top: f.y * ROOM_TILE, width: f.w * ROOM_TILE, height: f.h * ROOM_TILE }} pointerEvents="none">
              {cells.map((k) => {
                const cw = f.tile ? ROOM_TILE : f.w * ROOM_TILE;
                const ch = f.tile ? ROOM_TILE : f.h * ROOM_TILE;
                const cx = f.tile ? (k % f.w) * ROOM_TILE : 0;
                const cy = f.tile ? Math.floor(k / f.w) * ROOM_TILE : 0;
                return (
                  <Image
                    key={k}
                    source={FURNITURE_IMG[f.sprite]}
                    resizeMode="contain"
                    style={{ position: 'absolute', left: cx, top: cy, width: cw, height: ch }}
                  />
                );
              })}
            </View>
          );
        })}

        {hasUpstairs && <StairsMarker pos={STAIRS_UP_POS} tileSize={ROOM_TILE} direction="up" />}
        {hasBasement && <StairsMarker pos={STAIRS_DOWN_POS} tileSize={ROOM_TILE} direction="down" />}
        {!isGroundFloor && stairsBackPos && <StairsMarker pos={stairsBackPos} tileSize={ROOM_TILE} direction={floor === 'up' ? 'down' : 'up'} />}

        {npc && (
          <View style={[styles.npcSlot, { left: npcPos.x * ROOM_TILE + ROOM_TILE / 2 - NPC_MARKER_SIZE / 2, top: npcPos.y * ROOM_TILE }]}>
            <NpcFigure npc={npc} />
          </View>
        )}
        {npc2 && (
          <View style={[styles.npcSlot, { left: npc2Pos.x * ROOM_TILE + ROOM_TILE / 2 - NPC_MARKER_SIZE / 2, top: npc2Pos.y * ROOM_TILE }]}>
            <NpcFigure npc={npc2} />
          </View>
        )}

        {content?.chest && (
          <View
            style={[styles.chestMarker, { left: chestPos.x * ROOM_TILE + 6, top: chestPos.y * ROOM_TILE + 6 }, chestOpen && styles.chestMarkerOpen]}
          >
            <GameIcon name={chestOpen ? 'chest_open' : 'gift'} size={28} />
          </View>
        )}

        <Animated.View style={[styles.player, playerStyle]}>
          {wears && <CapeLayer characterKey={bodyChar} poseKey={bodyPose} box={bodyBox} dir={bodyDir} cosmeticId={cosEq.cape} />}
          <Image
            source={getBodySprite(bodyChar, bodyPose, wears ? cosEq.skin : null)}
            resizeMode="contain"
            style={[{ position: 'absolute', bottom: 0, left: (PLAYER_SIZE.x - PLAYER_SIZE.x * 1.9) / 2, width: PLAYER_SIZE.x * 1.9, height: PLAYER_SIZE.y * 1.7 }, facing === 'left' && styles.flip]}
          />
          {wears && <HatLayer characterKey={bodyChar} poseKey={bodyPose} box={bodyBox} dir={bodyDir} cosmeticId={cosEq.hat} />}
        </Animated.View>
      </View>

      <View style={[styles.hud, { top: insets.top + 12 }]}>
        <Text style={styles.hudText}>{content?.label ?? 'Interior'}</Text>
        {!isGroundFloor && <Text style={styles.hudSub}>{t('interior_use_stairs')}</Text>}
      </View>

      <View style={[styles.exitRow, { top: insets.top + 12, right: insets.right + 16 }]}>
        <MenuButton label={t('pause_exit')} variant="ghost" onPress={onExit} />
      </View>

      {!dialogueOpen && !shopOpen && !battleShopOpen && !casinoOpen && !cosmeticsOpen && (template === 'shop' || hasBattleShop || hasCasino || hasCosmetics) && (
        <View style={[styles.shopRow, { bottom: insets.bottom + 100 }]}>
          {template === 'shop' && <MenuButton label={t('open_shop')} onPress={() => setShopOpen(true)} />}
          {hasCasino && <MenuButton label={t('open_casino')} onPress={() => setCasinoOpen(true)} />}
          {hasCosmetics && <MenuButton label={t('open_wardrobe')} variant="ghost" onPress={() => setCosmeticsOpen(true)} />}
          {hasBattleShop && <MenuButton label={t('open_battle_shop')} variant="ghost" onPress={() => setBattleShopOpen(true)} />}
        </View>
      )}

      {nearby && !dialogueOpen && !shopOpen && !battleShopOpen && !casinoOpen && !cosmeticsOpen && (
        <Pressable
          style={[styles.interactBtn, { bottom: insets.bottom + 180 }]}
          onPress={() => {
            if (nearby === 'chest') openChest();
            else {
              const tgt = dialogueTarget;
              setChoiceDef(tgt ? pendingChoiceFor(tgt.id) : null);
              setDialogueOpen(true);
            }
          }}
        >
          <Text style={styles.interactLabel}>{nearby === 'chest' ? t('interact_open') : t('interact_talk')}</Text>
        </Pressable>
      )}

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {!dialogueOpen && !shopOpen && !battleShopOpen && !casinoOpen && !cosmeticsOpen && (
        <DPad onPress={setPressed} />
      )}

      {dialogueOpen && dialogueTarget && choiceDef && (
        <ChoiceOverlay
          npc={dialogueTarget}
          choice={choiceDef}
          onFinish={() => {
            setDialogueOpen(false);
            setChoiceDef(null);
            reportTalk(dialogueTarget.id);
          }}
        />
      )}
      {dialogueOpen && dialogueTarget && !choiceDef && (
        <DialogueOverlay
          npc={resolveNpcDialogue(dialogueTarget)}
          onFinish={() => {
            setDialogueOpen(false);
            reportTalk(dialogueTarget.id);
          }}
        />
      )}
      {shopOpen && <ShopOverlay vendor={building?.stock ? undefined : 'common'} shopKey={buildingId} stock={building?.stock} bags={building?.stock ? building.bags ?? [] : undefined} title={building?.stock ? building.label.toUpperCase() : undefined} onClose={() => setShopOpen(false)} />}
      {battleShopOpen && <ShopOverlay vendor="battle" shopKey={`${buildingId}_battle`} stock={BATTLE_STOCK} bags={[]} title={t('shop_title_battle')} onClose={() => setBattleShopOpen(false)} />}
      {casinoOpen && <CasinoOverlay onClose={() => setCasinoOpen(false)} />}
      {cosmeticsOpen && <CosmeticShopOverlay onClose={() => setCosmeticsOpen(false)} />}
    </View>
  );
}

function StairsMarker({ pos, tileSize, direction }: { pos: { x: number; y: number }; tileSize: number; direction: 'up' | 'down' }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: pos.x * tileSize, top: pos.y * tileSize, width: tileSize, height: tileSize, alignItems: 'center', justifyContent: 'center' }}>
      <GameIcon name={direction === 'up' ? 'arrow_up' : 'arrow_down'} size={tileSize * 0.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#0a0a12' },
  room: { position: 'absolute', borderWidth: 3, borderColor: '#FFD700' },
  player: { position: 'absolute', width: PLAYER_SIZE.x, height: PLAYER_SIZE.y, alignItems: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  hud: { position: 'absolute', alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  hudText: { color: '#FFD700', fontWeight: '800', fontSize: 16, textShadowColor: '#000', textShadowRadius: 4 },
  hudSub: { color: '#fff', opacity: 0.75, fontSize: 11, marginTop: 2 },
  exitRow: { position: 'absolute' },
  shopRow: { position: 'absolute', alignSelf: 'center', left: 0, right: 0, flexDirection: 'row', gap: 10, justifyContent: 'center' },
  npcSlot: { position: 'absolute' },
  chestMarker: { position: 'absolute', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  chestMarkerOpen: { opacity: 0.5 },
  chestIcon: { fontSize: 24 },
  interactBtn: {
    position: 'absolute',
    left: '50%',
    marginLeft: -60,
    width: 120,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(10,10,18,0.8)',
    alignItems: 'center',
  },
  interactLabel: { color: '#FFD700', fontWeight: '800', fontSize: 13 },
  toast: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(10,10,18,0.9)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  toastText: { color: '#FFD700', fontWeight: '700', fontSize: 14 },
});
