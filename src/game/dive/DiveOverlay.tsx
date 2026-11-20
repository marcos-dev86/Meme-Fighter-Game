import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveMoveBoxes } from '@/game/collision/collision';
import { useGameLoop } from '@/game/core/useGameLoop';
import { DPad } from '@/game/input/DPad';
import { useDirectionalInput } from '@/game/input/useDirectionalInput';
import type { Direction, MapDef } from '@/types/game';
import { MenuButton } from '@/game/menu/MenuButton';
import { GameIcon } from '@/game/ui/GameIcon';
import { CharacterMarker } from '@/game/world/CharacterMarker';
import { ShopOverlay } from '@/game/world/ShopOverlay';
import { SPRITE_ASPECTS, walkFrames } from '@/game/battle/sprites';
import type { Fighter } from '@/game/battle/Fighter';
import { CapeLayer, HatLayer, getBodySprite, canWearCosmetics, preloadBodySprites } from '@/game/cosmetics/CosmeticLayers';
import { useCosmetics } from '@/game/state/cosmeticsState';
import { getStoryCharacterId, onQuestNotice, refreshMissions, reportTalk } from '@/game/state/questState';
import { getStoryCharacter } from '@/game/story/characters';
import { setStoryHp } from '@/game/state/healthState';
import { hasFlag } from '@/game/state/storyFlags';
import { addCoins, addItem, addXp, bagRoomFor, getInventory, removeItem } from '@/game/state/playerState';
import { ITEMS, itemName } from '@/game/items/itemDefs';
import { RARITY_COLOR } from '@/game/items/rarity';
import { useI18n } from '@/game/i18n/i18n';
import { playSfx } from '@/game/audio/audioManager';
import { haptic } from '@/game/audio/haptics';
import { clearDamageCause, noteDamage, type DeathCause } from '@/game/account/deathCause';
import { isBossDefeated } from '@/game/state/bossState';
import { noteStat } from '@/game/account/accountState';

import { BREATH_CONFIG, applyDamageFrac, breathLevel, breathMax, newBreath, stepBreath, type BreathState } from './breath';
import { CREATURES, type DiveAttack } from './diveCreatures';
import { DIVE_NPCS, type DiveNpcDef } from './diveNpcs';
import { REVEAL_SCENES, introFor } from './diveScenes';
import { EVENTS, rollEvent, rollWorldEvent, tickEvent, useSpot, type ActiveEvent, type EventReward } from './diveEvents';
import { SITES, ALL_SITES, SWIM_SPEED, TILE, buildGrid, crossingFor, isBreathableChar, isSolidChar, tileAt, type DiveChest, type DiveSite } from './diveSites';
import { WORLD_SITE, createSim, createWorldSim, feedCreature, nearestFriend, playerStrike, stepSim, syncWorldChunks, type DiveEntity, type DiveSim } from './diveSim';
import { SEA_H, SEA_W, chestsNear, coastTiles, findLanding, getPortals, islandNear, moodAt, portalAt, regionNameAt, seaChar, type SeaChest, type SeaMood } from './seaWorld';
import {
  buffMsLeft, creaturesKnown, currentBreathMods, diveConsumables, getCreatureRecord, getDiveData, getEventHistory, noteEventDone, noteEventStarted, isChestOpen, logCreatureDefeated, logCreatureHelped, logCreatureSeen, markDiscovered, markSceneSeen, noteCrossing, noteDiveStart,
  noteSwim, openChest, revealWall, revealedWalls, sceneSeen, siteUnlocked, tickBuff, useDiveItem,
} from './diveState';
import { DIVE_MAP_IMG, FLOOR_REVEAL_IMG, SEA_SHEET_IMG } from './seaAssets';

const PLAYER_SIZE = { x: 22, y: 30 };
const FEET = { x: 3, y: 16, w: 16, h: 14 };
const WALK_FRAME_MS = 140;
const NPC_MARKER_SIZE = 32;
const LIGHT_CD = 450;
const HEAVY_CD = 1000;
const HAZARD_MS = 2000;
const HAZARD_FRAC = 0.04;

type Phase = 'in' | 'play' | 'out' | 'cross';
type Action =
  | { kind: 'chest'; id: string }
  | { kind: 'npc'; npc: string }
  | { kind: 'friend'; uid: string }
  | { kind: 'portal'; siteId: string }
  | { kind: 'surface' }
  | { kind: 'wall'; id: string }
  | { kind: 'boss' }
  | { kind: 'espot'; uid: string; sub: 'chest' | 'help' | 'sos' };

interface Props {
  /** Tile (do mundo da superfície) onde o mergulho começa: a água mais próxima de onde o jogador estava na costa. */
  startTile: { x: number; y: number };
  /** Cais (ilha) mais próximo de onde o mergulho começou: serve para saber se a travessia terminou em outra ilha. */
  startDock: string;
  /** Lutador do mundo: a vida do mergulho é a mesma vida do jogador. */
  fighter: Fighter;
  /** Subiu: `landing` é o tile de terra onde o jogador pisa (null = voltar ao ponto de partida) e `dock` o cais da costa onde emergiu. */
  onSurface: (landing: { x: number; y: number } | null, dock: string) => void;
  /** Vida zerada no mergulho: o mundo mostra a tela de derrota normal. */
  onDowned: () => void;
  /** Encarar o chefe do abismo: o mundo fecha o mergulho e abre a luta. */
  onBossFight?: (bossId: string) => void;
}

/** Sprite de uma folha: recorta o quadro com um View de overflow oculto, sem mexer na imagem. */
function SheetSprite({ creature, frame, size }: { creature: DiveEntity['def']; frame: number; size: number }) {
  const sh = creature.sheet;
  const idx = sh.frames[frame % sh.frames.length];
  const col = idx % sh.cols;
  const row = Math.floor(idx / sh.cols);
  const scale = size / sh.fw;
  const h = sh.fh * scale;
  return (
    <View style={{ width: size, height: h, overflow: 'hidden' }}>
      <Image
        source={SEA_SHEET_IMG[sh.key]}
        resizeMode="stretch"
        style={{ position: 'absolute', left: -col * sh.fw * scale, top: -row * sh.fh * scale, width: sh.cols * sh.fw * scale, height: sh.rows * sh.fh * scale }}
      />
    </View>
  );
}

/** Cores-base do fundo por região do mar (e mais escuro com a profundidade). */
const MOOD_BASE: Record<SeaMood, string> = {
  open: '#0e4a83', reef: '#14659c', wreck: '#12507b', cave: '#0e3e68', ruins: '#13597f', vent: '#0f4571', abyss: '#082a4c', lagoon: '#1a7ba9', city: '#15648f', ice: '#1c70a0',
};
const RUN_STYLE: Record<string, { bg: string }> = {
  rock: { bg: '#0a1522' },
  edge: { bg: '#27405a' },
  ':': { bg: 'rgba(0,10,40,0.32)' },
  U: { bg: 'rgba(190,240,255,0.5)' },
  A: { bg: 'rgba(215,242,255,0.55)' },
  '~': { bg: 'rgba(255,110,30,0.55)' },
  k: { bg: 'rgba(170,230,255,0.5)' },
};

/**
 * Desenha o mar aberto numa JANELA ao redor do jogador (só ~50x30 tiles, refeita quando ele anda uns 6 tiles): fundo por blocos de
 * 8 tiles colorido pela região e profundidade, e só os tiles que diferem da água aberta (rocha, costa, ar, fumarola, gelo, fundo)
 * viram faixas. Barato mesmo num mundo de 2034x1448 tiles.
 */
function SeaTiles({ anchor, cols, rows }: { anchor: { tx: number; ty: number }; cols: number; rows: number }) {
  const x0 = anchor.tx - Math.floor(cols / 2);
  const y0 = anchor.ty - Math.floor(rows / 2);
  const { blocks, runs } = useMemo(() => {
    const blocks: { x: number; y: number; color: string; dark: number }[] = [];
    const B = 8;
    for (let by = Math.floor(y0 / B); by <= Math.floor((y0 + rows) / B); by++) {
      for (let bx = Math.floor(x0 / B); bx <= Math.floor((x0 + cols) / B); bx++) {
        const cx = bx * B + B / 2;
        const cy = by * B + B / 2;
        const depth = Math.min(1, coastTiles(Math.floor(cx), Math.floor(cy)) / 110);
        blocks.push({ x: bx * B, y: by * B, color: MOOD_BASE[moodAt(Math.floor(cx), Math.floor(cy))], dark: depth * 0.45 });
      }
    }
    const runs: { x: number; y: number; len: number; key: string }[] = [];
    for (let y = y0; y < y0 + rows; y++) {
      let cur: { x: number; y: number; len: number; key: string } | null = null;
      for (let x = x0; x < x0 + cols; x++) {
        const c = seaChar(x, y);
        let key: string | null = null;
        if (c === '#') key = isSolidChar(seaChar(x, y + 1)) && isSolidChar(seaChar(x, y - 1)) && isSolidChar(seaChar(x - 1, y)) && isSolidChar(seaChar(x + 1, y)) ? 'rock' : 'edge';
        else if (c !== '.') key = c;
        if (key && cur && cur.key === key && cur.x + cur.len === x) cur.len += 1;
        else {
          if (cur) runs.push(cur);
          cur = key ? { x, y, len: 1, key } : null;
        }
      }
      if (cur) runs.push(cur);
    }
    return { blocks, runs };
  }, [x0, y0, cols, rows]);
  return (
    <>
      {blocks.map((b) => (
        <View key={`b${b.x},${b.y}`} style={{ position: 'absolute', left: b.x * TILE, top: b.y * TILE, width: 8 * TILE + 1, height: 8 * TILE + 1, backgroundColor: b.color }}>
          <View style={{ flex: 1, backgroundColor: `rgba(0,8,30,${b.dark})` }} />
        </View>
      ))}
      {runs.map((r) => (
        <View key={`r${r.x},${r.y}`} style={{ position: 'absolute', left: r.x * TILE, top: r.y * TILE, width: r.len * TILE + 0.5, height: TILE + 0.5, backgroundColor: RUN_STYLE[r.key]?.bg ?? 'transparent' }} />
      ))}
    </>
  );
}

export function DiveOverlay({ startTile, startDock, fighter, onSurface, onDowned, onBossFight }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  /** 'world' = mar aberto (o mundo submerso inteiro); 'site' = dentro de um local (naufrágio, caverna, ruínas, cidade, abismo). */
  const [mode, setModeState] = useState<'world' | 'site'>('world');
  const modeRef = useRef<'world' | 'site'>('world');
  const setMode = (m: 'world' | 'site') => {
    modeRef.current = m;
    setModeState(m);
  };
  const [currentId, setCurrentId] = useState('');
  const site: DiveSite = mode === 'site' && ALL_SITES[currentId] ? ALL_SITES[currentId] : WORLD_SITE;
  const siteRef = useRef(site);
  siteRef.current = site;
  /** Portal por onde entrou no local (para sair de volta ao mesmo lugar do mar). */
  const portalReturnRef = useRef<{ x: number; y: number } | null>(null);
  const worldChestsRef = useRef<Map<string, DiveChest | SeaChest>>(new Map());
  const [anchor, setAnchor] = useState({ tx: startTile.x, ty: startTile.y });
  const anchorRef = useRef(anchor);
  const [region, setRegion] = useState(() => regionNameAt(startTile.x, startTile.y));
  /** Caractere do tile no nível atual (mar aberto ou local). */
  const charAt = (x: number, y: number): string | undefined => (modeRef.current === 'world' ? seaChar(x, y) : gridRef.current[y]?.[x]);

  const [phase, setPhase] = useState<Phase>('in');
  const phaseRef = useRef<Phase>('in');
  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const [caption, setCaption] = useState(() => introFor('mar', 'Mar Aberto', false));

  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => revealedWalls());
  const gridRef = useRef<string[][]>([]);
  const simRef = useRef<DiveSim>(createWorldSim());
  const [tick, setTick] = useState(0);
  const tickAcc = useRef(0);
  const animT = useRef(0);

  const positionRef = useRef({ x: 0, y: 0 });
  const { stateRef: inputRef, setPressed } = useDirectionalInput();
  const playerX = useSharedValue(0);
  const playerY = useSharedValue(0);
  const camX = useSharedValue(0);
  const camY = useSharedValue(0);
  const facingVec = useRef({ x: 1, y: 0 });
  const [facing, setFacing] = useState<Direction>('right');
  const facingRef = useRef<Direction>('right');
  const [frameIndex, setFrameIndex] = useState(0);
  const frameTimerRef = useRef(0);
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);

  const breathRef = useRef<BreathState>(newBreath(currentBreathMods()));
  const [breath, setBreath] = useState({ sec: breathRef.current.sec, max: breathMax(currentBreathMods()), level: 'ok' as ReturnType<typeof breathLevel> });
  const dotRef = useRef<{ msLeft: number; fracPerSec: number; cause: DeathCause; acc: number } | null>(null);
  const hazardRef = useRef(0);
  const cdRef = useRef({ light: 0, heavy: 0 });
  const [cds, setCds] = useState({ light: 0, heavy: 0 });
  const koRef = useRef(false);
  const [hpFrac, setHpFrac] = useState(() => fighter.health / fighter.maxHealth);
  const [flash, setFlash] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [action, setAction] = useState<Action | null>(null);
  const actionRef = useRef<Action | null>(null);
  const [talk, setTalk] = useState<DiveNpcDef | null>(null);
  const [shopNpc, setShopNpc] = useState<DiveNpcDef | null>(null);
  const [consumables, setConsumables] = useState(() => diveConsumables());
  /** Evento aleatório em andamento neste local (baú à deriva, cardume dourado...). */
  const eventRef = useRef<ActiveEvent | null>(null);
  const [journal, setJournal] = useState(false);
  const [, bump] = useState(0);

  const say = (msg: string, ms = 2400) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };

  // Cosméticos e corpo do jogador (mesma lógica do interior).
  const bodyChar = getStoryCharacter(getStoryCharacterId()).fighter;
  const { equipped: cosEq } = useCosmetics();
  const wears = canWearCosmetics(bodyChar);
  useEffect(() => {
    preloadBodySprites(bodyChar, wears ? cosEq.skin : null);
  }, [bodyChar, wears, cosEq.skin]);

  const roomMap: MapDef = useMemo(
    () => ({
      id: 'dive',
      name: site.name,
      tileSize: TILE,
      width: mode === 'world' ? SEA_W : site.w,
      height: mode === 'world' ? SEA_H : site.h,
      getTile: (x, y) => (isSolidChar(charAt(x, y)) ? 'wall' : 'sand'),
      spawns: [],
      exits: [],
      npcs: [],
      objects: [],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, site],
  );

  /** Coloca o jogador num tile (centro). */
  const placeAt = (tx: number, ty: number) => {
    const p = { x: tx * TILE + TILE / 2 - PLAYER_SIZE.x / 2, y: ty * TILE + TILE / 2 - PLAYER_SIZE.y + FEET.h / 2 + 8 };
    positionRef.current = p;
    playerX.value = p.x;
    playerY.value = p.y;
  };

  /** Começa um evento aleatório (do mar aberto ou de um local): registra, avisa e, se for visita rara, solta a criatura. */
  const startEvent = (ev: ActiveEvent) => {
    eventRef.current = ev;
    noteEventStarted(ev.id);
    if (ev.creature) {
      const def = CREATURES[ev.creature.id];
      simRef.current.entities.push({
        uid: 'event:rare', def, x: ev.creature.x, y: ev.creature.y, hp: def.hp, state: 'idle', hitCdMs: 0, shellClosed: false, shellMs: 2000,
        wanderTo: { x: ev.creature.x, y: ev.creature.y }, wanderMs: 0, helped: false, streak: { light: 0, heavy: 0 }, angry: false,
      });
      logCreatureSeen(def.id);
    }
    setTimeout(() => say(EVENTS[ev.id].line, 3800), 2800);
  };

  /** Entra no MAR ABERTO num tile do mundo: criaturas por área, evento aleatório ao redor. */
  const enterWorld = (tile: { x: number; y: number }, withEvent = true) => {
    setMode('world');
    gridRef.current = [];
    const sim = createWorldSim();
    simRef.current = sim;
    siteRef.current = WORLD_SITE;
    placeAt(tile.x, tile.y);
    anchorRef.current = { tx: tile.x, ty: tile.y };
    setAnchor(anchorRef.current);
    dotRef.current = null;
    for (const e of syncWorldChunks(sim, tile.x, tile.y, { questWhale: hasFlag('quest_whale_called') })) logCreatureSeen(e.def.id);
    eventRef.current = null;
    if (withEvent) {
      const ev = rollWorldEvent(tile, getEventHistory(), { creaturesKnown: creaturesKnown(), chance: getDiveData().stats.dives > 1 ? 0.4 : 0 });
      if (ev) startEvent(ev);
    }
  };

  /** Entra num LOCAL (por um portal do mar): monta mapa e criaturas, posiciona o jogador, descobre o local. */
  const enterSite = (id: string) => {
    const s2 = ALL_SITES[id];
    const rev = revealedWalls();
    setRevealed(rev);
    setMode('site');
    gridRef.current = buildGrid(s2, rev);
    simRef.current = createSim(s2, { revealed: rev, night: false, questWhale: hasFlag('quest_whale_called') });
    for (const e of simRef.current.entities) logCreatureSeen(e.def.id);
    siteRef.current = s2;
    setCurrentId(id);
    placeAt(s2.exit.x, s2.exit.y);
    dotRef.current = null;
    eventRef.current = null;
    const ev = rollEvent(s2, gridRef.current, getEventHistory(), { x: s2.exit.x, y: s2.exit.y }, { creaturesKnown: creaturesKnown(), chance: getDiveData().stats.dives > 1 ? 0.45 : 0 });
    if (ev) startEvent(ev);
    if (markDiscovered(id)) {
      say(t('dive_new_site').replace('{name}', s2.name), 3200);
      refreshMissions();
    }
  };

  /** Sai de um local de volta ao mar aberto, no portal por onde entrou. */
  const leaveSite = () => {
    const ret = portalReturnRef.current ?? { x: startTile.x, y: startTile.y };
    setCaption(introFor('mar', 'Mar Aberto', false));
    setPhaseBoth('cross');
    setTimeout(() => {
      enterWorld({ x: ret.x, y: ret.y + 3 }, false);
      setPhaseBoth('in');
      setTimeout(() => setPhaseBoth('play'), 900);
    }, 900);
  };

  // Primeira entrada: conta o mergulho, monta o mar aberto na água em que o jogador estava e roda a cena de descida.
  useEffect(() => {
    clearDamageCause();
    noteDiveStart();
    enterWorld(startTile);
    const first = !sceneSeen('intro_mar');
    markSceneSeen('intro_mar');
    const timer = setTimeout(() => setPhaseBoth('play'), first ? 2600 : 1500);
    refreshMissions();
    return () => {
      clearTimeout(timer);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onQuestNotice((text) => {
      say(text, 2800);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Entrega o prêmio de um ponto de evento (moedas, XP e itens à força, como as recompensas de missão). */
  const applyReward = (r: EventReward) => {
    if (r.coins) addCoins(r.coins);
    if (r.xp) addXp(r.xp);
    for (const [id, q] of Object.entries(r.items ?? {})) if (ITEMS[id]) addItem(id, q, true);
    setConsumables(diveConsumables());
    refreshMissions();
  };

  /** Dano de fração da vida máxima, com a causa registrada para o aviso de morte. */
  const hurt = (frac: number, cause: DeathCause) => {
    if (koRef.current) return;
    const r = applyDamageFrac(fighter.health, fighter.maxHealth, frac);
    fighter.health = r.health;
    if (cause.kind === 'entity' && cause.via) fighter.lastHurtBy = cause.via;
    else fighter.lastHurtBy = 'hit';
    noteDamage(cause);
    setStoryHp(r.health / fighter.maxHealth);
    setHpFrac(r.health / fighter.maxHealth);
    setFlash(1);
    playSfx('player_hurt', { minGapMs: 200 });
    haptic('light');
    if (r.ko) {
      koRef.current = true;
      fighter.isKO = true;
      onDowned();
    }
  };

  useGameLoop((dtMs) => {
    if (koRef.current) return;
    const ph = phaseRef.current;
    if (ph !== 'play' || talk || shopNpc || journal) return;
    const dt = dtMs / 1000;
    const s = siteRef.current;
    const sim = simRef.current;
    const world = modeRef.current === 'world';

    // --- Movimento (nado) + correntes
    const input = inputRef.current;
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    const feetC = { x: positionRef.current.x + FEET.x + FEET.w / 2, y: positionRef.current.y + FEET.y + FEET.h / 2 };
    let pushX = 0;
    let pushY = 0;
    for (const c of s.currents ?? []) {
      const tp = tileAt(feetC.x, feetC.y);
      if (tp.x >= c.rect.x && tp.x < c.rect.x + c.rect.w && tp.y >= c.rect.y && tp.y < c.rect.y + c.rect.h) {
        pushX += c.dx;
        pushY += c.dy;
      }
    }
    const evNow = eventRef.current;
    if (evNow?.surge) {
      pushX += evNow.surge.dx;
      pushY += evNow.surge.dy;
    }
    pushX += sim.pull.x; // isca do Tamboril Rei
    pushY += sim.pull.y;
    if (dx !== 0 || dy !== 0 || pushX !== 0 || pushY !== 0) {
      const len = Math.hypot(dx, dy) || 1;
      const step = { x: ((dx / len) * SWIM_SPEED + pushX) * dt, y: ((dy / len) * SWIM_SPEED + pushY) * dt };
      const feet = { x: positionRef.current.x + FEET.x, y: positionRef.current.y + FEET.y };
      const result = resolveMoveBoxes(roomMap, feet, { x: FEET.w, y: FEET.h }, step, []);
      const np = { x: result.position.x - FEET.x, y: result.position.y - FEET.y };
      positionRef.current = np;
      playerX.value = np.x;
      playerY.value = np.y;
    }
    if (dx !== 0 || dy !== 0) {
      facingVec.current = { x: dx, y: dy };
      frameTimerRef.current += dtMs;
      if (frameTimerRef.current >= WALK_FRAME_MS) {
        frameTimerRef.current = 0;
        setFrameIndex((i) => (i + 1) % walkFrames(bodyChar).length);
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
    } else if (movingRef.current) {
      movingRef.current = false;
      frameTimerRef.current = 0;
      setMoving(false);
    }

    // câmera segue o jogador
    const pc = { x: positionRef.current.x + PLAYER_SIZE.x / 2, y: positionRef.current.y + PLAYER_SIZE.y / 2 };
    const mapW = (world ? SEA_W : s.w) * TILE;
    const mapH = (world ? SEA_H : s.h) * TILE;
    camX.value = mapW <= width ? (width - mapW) / 2 : Math.min(0, Math.max(width - mapW, width / 2 - pc.x));
    camY.value = mapH <= height ? (height - mapH) / 2 : Math.min(0, Math.max(height - mapH, height / 2 - pc.y));

    // --- Em que tipo de água o jogador está
    const ft = tileAt(feetC.x, feetC.y);
    const ch = charAt(ft.x, ft.y);
    const regionName = world ? regionNameAt(ft.x, ft.y) : s.name;
    if (world && (Math.abs(ft.x - anchorRef.current.tx) > 6 || Math.abs(ft.y - anchorRef.current.ty) > 6)) {
      anchorRef.current = { tx: ft.x, ty: ft.y };
      setAnchor(anchorRef.current);
    }
    const mods = currentBreathMods();
    const breathable = isBreathableChar(ch);
    const deep = ch === ':';

    // --- Fôlego e afogamento
    const br = stepBreath(breathRef.current, dtMs, { submerged: true, breathable, deep, mods });
    breathRef.current = br.state;
    for (const ev of br.events) {
      if (ev === 'low') {
        say(t('dive_low'));
        playSfx('ui_denied');
      } else if (ev === 'empty') {
        say(t('dive_empty'), 3000);
        haptic('medium');
      } else if (ev === 'recovered') {
        say(t('dive_recovered'));
        noteStat('dive_survived_empty'); // chegou a se afogar e voltou a respirar
      }
      else if (ev === 'pressure') say(t('dive_pressure'));
    }
    if (br.damageFrac > 0 && br.hazard) hurt(br.damageFrac, { kind: 'hazard', hazard: br.hazard, region: regionName });
    tickBuff(dtMs);
    noteSwim(dt, deep, mods.infinite);

    // --- Fumarolas e água gelada (dano periódico)
    if (ch === '~' || ch === 'k') {
      hazardRef.current += dtMs;
      if (hazardRef.current >= HAZARD_MS) {
        hazardRef.current = 0;
        say(t(ch === '~' ? 'dive_fire' : 'dive_cold'));
        hurt(HAZARD_FRAC, { kind: 'hazard', hazard: ch === '~' ? 'fire' : 'cold', region: regionName });
      }
    } else hazardRef.current = 0;

    // --- Criaturas
    if (world) for (const e of syncWorldChunks(sim, ft.x, ft.y, { questWhale: hasFlag('quest_whale_called') })) logCreatureSeen(e.def.id);
    const contacts = stepSim(sim, dtMs, { x: feetC.x, y: feetC.y });
    for (const b of sim.spawned) logCreatureSeen(b.def.id); // filhotes invocados contam no diário

    // --- Evento aleatório: cardume dourado se pega encostando; o resto por botão; acaba por tempo
    if (evNow) {
      if (!tickEvent(evNow, dtMs)) {
        eventRef.current = null;
        if (!evNow.spots.every((x) => x.taken) || evNow.spots.length === 0) say(t('dive_ev_end'));
      } else {
        for (const sp of evNow.spots) {
          if (sp.kind !== 'coin' || sp.taken) continue;
          if (Math.hypot(sp.x - feetC.x, sp.y - feetC.y) <= 28) {
            const out = useSpot(sp, () => false);
            if (out.ok && out.reward) {
              applyReward(out.reward);
              playSfx('coin', { minGapMs: 120 });
              if (evNow.spots.every((x) => x.taken)) {
                noteEventDone(evNow.id);
                say(t('dive_ev_reward').replace('{name}', EVENTS[evNow.id].name).replace('{coins}', String(evNow.spots.length * (out.reward.coins ?? 0))));
              }
            }
          }
        }
      }
    }
    for (const c of contacts) {
      const def = c.entity.def;
      hurt(c.damageFrac, { kind: 'entity', role: def.role, name: def.name });
      if (c.dot && !dotRef.current) {
        dotRef.current = { msLeft: c.dot.ms, fracPerSec: c.dot.fracPerSec, cause: { kind: 'entity', role: def.role, name: def.name, via: c.dot.kind }, acc: 0 };
        say(t('dive_poisoned'));
      }
    }
    const dot = dotRef.current;
    if (dot) {
      dot.msLeft -= dtMs;
      dot.acc += dtMs;
      if (dot.acc >= 1000) {
        dot.acc -= 1000;
        hurt(dot.fracPerSec, dot.cause);
      }
      if (dot.msLeft <= 0) dotRef.current = null;
    }

    // --- Recargas dos golpes
    cdRef.current.light = Math.max(0, cdRef.current.light - dtMs);
    cdRef.current.heavy = Math.max(0, cdRef.current.heavy - dtMs);
    if (flash > 0) setFlash((f) => Math.max(0, f - dt * 3));

    // --- Ação mais próxima (um botão só: baú, NPC, amigo, portão, superfície, parede)
    let found: Action | null = null;
    const near = (px: number, py: number, r: number) => Math.hypot(px - feetC.x, py - feetC.y) <= r;
    const center = (tx: number, ty: number) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
    const chestList = world ? chestsNear(ft.x, ft.y, 1) : (s.chests ?? []);
    if (world) for (const c of chestList) worldChestsRef.current.set(c.id, c);
    for (const c of chestList as { id: string; x: number; y: number; hidden?: boolean }[]) {
      if (isChestOpen(c.id)) continue;
      if (c.hidden && s.hidden?.some((h) => !rev.has(h.id) && Math.hypot(h.x - c.x, h.y - c.y) <= 1.5)) continue;
      const p = center(c.x, c.y);
      if (near(p.x, p.y, 40)) {
        found = { kind: 'chest', id: c.id };
        break;
      }
    }
    if (!found && evNow) {
      for (const sp of evNow.spots) {
        if (sp.taken || sp.kind === 'coin') continue;
        if (Math.hypot(sp.x - feetC.x, sp.y - feetC.y) <= 44) {
          found = { kind: 'espot', uid: sp.uid, sub: sp.kind };
          break;
        }
      }
    }
    if (!found) {
      for (const n of s.npcs ?? []) {
        const p = center(n.x, n.y);
        if (near(p.x, p.y, 56)) {
          found = { kind: 'npc', npc: n.npc };
          break;
        }
      }
    }
    if (!found) {
      const f = nearestFriend(sim, { x: feetC.x, y: feetC.y });
      if (f && !f.helped) found = { kind: 'friend', uid: f.uid };
    }
    if (!found && world) {
      const p = portalAt(ft.x, ft.y, 1.9);
      if (p) found = { kind: 'portal', siteId: p.siteId };
    }
    if (!found && ch === 'U') found = { kind: 'surface' };
    if (!found) {
      for (const h of s.hidden ?? []) {
        if (rev.has(h.id)) continue;
        const p = center(h.x, h.y);
        if (near(p.x, p.y, TILE * 1.6)) {
          found = { kind: 'wall', id: h.id };
          break;
        }
      }
    }
    if (!found && s.bossGate && onBossFight && !isBossDefeated('boss_sea_beast')) {
      const p = center(s.bossGate.x, s.bossGate.y);
      if (near(p.x, p.y, 56)) found = { kind: 'boss' };
    }
    const prev = actionRef.current;
    const same = (!prev && !found) || (prev && found && prev.kind === found.kind && JSON.stringify(prev) === JSON.stringify(found));
    if (!same) {
      actionRef.current = found;
      setAction(found);
    }

    // redesenha criaturas ~12 vezes por segundo
    animT.current += dtMs;
    tickAcc.current += dtMs;
    if (tickAcc.current >= 80) {
      tickAcc.current = 0;
      setTick((n) => (n + 1) % 100000);
      setBreath({ sec: breathRef.current.sec, max: breathMax(mods), level: breathLevel(breathRef.current, mods) });
      setRegion((r) => (r === regionName ? r : regionName));
      setCds({ light: cdRef.current.light, heavy: cdRef.current.heavy });
    }
  });

  const rev = revealed;

  // ---- Ações do jogador ----------------------------------------------------------------------------
  const strike = (attack: DiveAttack) => {
    if (phaseRef.current !== 'play' || koRef.current) return;
    if (cdRef.current[attack] > 0) return;
    cdRef.current[attack] = attack === 'light' ? LIGHT_CD : HEAVY_CD;
    const base = attack === 'light' ? fighter.flashDamage : fighter.strongDamage;
    const feetC = { x: positionRef.current.x + FEET.x + FEET.w / 2, y: positionRef.current.y + FEET.y + FEET.h / 2 };
    playSfx(attack === 'light' ? 'water' : 'hit_heavy', { minGapMs: 80 });
    const res = playerStrike(simRef.current, feetC, facingVec.current, attack, base);
    for (const k of res.kills) {
      const def = k.def;
      logCreatureDefeated(def.id);
      addCoins(def.reward.coins);
      addXp(def.reward.xp);
      for (const [id, q] of Object.entries(def.reward.items ?? {})) if (ITEMS[id] && bagRoomFor(id, q) >= q) addItem(id, q);
      say(t('dive_kill').replace('{name}', def.name).replace('{coins}', String(def.reward.coins)).replace('{xp}', String(def.reward.xp)), 2800);
      refreshMissions();
    }
    bump((n) => n + 1);
  };

  const doAction = () => {
    const a = actionRef.current;
    if (!a || phaseRef.current !== 'play') return;
    const s = siteRef.current;
    if (a.kind === 'chest') {
      const chest = s.chests?.find((c) => c.id === a.id) ?? worldChestsRef.current.get(a.id);
      if (!chest) return;
      const r = openChest(chest);
      if (!r.ok) {
        say(t('dive_item_none'));
        playSfx('ui_denied');
        return;
      }
      playSfx('coin');
      haptic('medium');
      const names = Object.entries(r.items).map(([id, q]) => `${itemName(id)}${q > 1 ? ` x${q}` : ''}`);
      say(`${t('dive_chest_got')} +${r.coins} · ${names.join(', ')}`, 3600);
      refreshMissions();
      bump((n) => n + 1);
    } else if (a.kind === 'npc') {
      const def = DIVE_NPCS[a.npc];
      if (!def) return;
      reportTalk(def.id);
      setTalk(def);
    } else if (a.kind === 'friend') {
      const sim = simRef.current;
      const feetC = { x: positionRef.current.x + FEET.x + FEET.w / 2, y: positionRef.current.y + FEET.y + FEET.h / 2 };
      const r = feedCreature(sim, a.uid, feetC);
      const e = sim.entities.find((x) => x.uid === a.uid);
      if (!r.ok || !e) {
        say(t(r.reason === 'already' ? 'dive_already' : 'dive_item_none'));
        return;
      }
      logCreatureHelped(e.def.id);
      if (e.def.id === 'cleaner' && dotRef.current) {
        dotRef.current = null;
        say(t('dive_cleaned'));
      } else if (r.gift && ITEMS[r.gift.itemId] && bagRoomFor(r.gift.itemId, r.gift.qty) >= r.gift.qty) {
        addItem(r.gift.itemId, r.gift.qty);
        say(t('dive_gift').replace('{name}', e.def.name).replace('{item}', itemName(r.gift.itemId)), 3000);
        setConsumables(diveConsumables());
      } else say(t('dive_friendly').replace('{name}', e.def.name));
      addXp(e.def.reward.xp);
      playSfx('use_item');
      refreshMissions();
    } else if (a.kind === 'portal') {
      if (!siteUnlocked(a.siteId)) {
        say(t('dive_locked'), 3200);
        playSfx('ui_denied');
        return;
      }
      const dest = ALL_SITES[a.siteId];
      const p = getPortals().find((x) => x.siteId === a.siteId);
      portalReturnRef.current = p ? { x: p.x, y: p.y } : null;
      setCaption(introFor(dest.intro, dest.name, false));
      setPhaseBoth('cross');
      setTimeout(() => {
        enterSite(a.siteId);
        setPhaseBoth('in');
        setTimeout(() => setPhaseBoth('play'), 1500);
      }, 1100);
    } else if (a.kind === 'surface') {
      if (modeRef.current === 'site') {
        leaveSite();
        return;
      }
      // Emerge na costa onde está: pisa no chão mais perto. Se começou o mergulho numa ilha e emergiu em outra, é uma travessia.
      const f = { x: positionRef.current.x + FEET.x + FEET.w / 2, y: positionRef.current.y + FEET.y + FEET.h / 2 };
      const ft2 = tileAt(f.x, f.y);
      const landing = findLanding(ft2.x, ft2.y);
      if (!landing) {
        // costa só de parede (borda da ilha): não há onde pisar aqui, então não emerge; é só nadar para outro ponto da costa
        say(t('dive_no_landing'), 3000);
        playSfx('ui_denied');
        return;
      }
      const endDock = islandNear(ft2.x, ft2.y);
      if (endDock !== startDock) {
        noteCrossing(crossingFor(startDock, endDock)?.id);
        refreshMissions();
      }
      setCaption(introFor('saida', '', false));
      setPhaseBoth('out');
      setTimeout(() => onSurface(landing, endDock), 1200);
    } else if (a.kind === 'espot') {
      const ev = eventRef.current;
      const sp = ev?.spots.find((x) => x.uid === a.uid);
      if (!ev || !sp) return;
      const out = useSpot(sp, (id) => (getInventory()[id] ?? 0) > 0);
      if (!out.ok || !out.reward) {
        say(t('dive_ev_need'));
        playSfx('ui_denied');
        return;
      }
      if (out.consumed) removeItem(out.consumed, 1);
      applyReward(out.reward);
      playSfx('coin');
      haptic('medium');
      say(a.sub === 'help' ? t('dive_ev_help').replace('{xp}', String(out.reward.xp ?? 0)) : t('dive_ev_reward').replace('{name}', EVENTS[ev.id].name).replace('{coins}', String(out.reward.coins ?? 0)), 3200);
      if (ev.spots.every((x) => x.taken)) {
        noteEventDone(ev.id);
        eventRef.current = null;
      }
    } else if (a.kind === 'boss') {
      // Cena de despertar do chefe e depois a luta de verdade (motor de combate do jogo).
      setCaption({ title: 'SEA BEAST', line: 'Algo enorme se move no fundo. O mar inteiro prende a respiração.' });
      setPhaseBoth('cross');
      setTimeout(() => onBossFight?.('boss_sea_beast'), 1500);
    } else if (a.kind === 'wall') {
      if (revealWall(a.id)) {
        say(t('dive_wall_found'), 2800);
        playSfx('use_item');
        haptic('medium');
        const rv = revealedWalls();
        setRevealed(rv);
        gridRef.current = buildGrid(s, rv);
        refreshMissions();
        const scene = REVEAL_SCENES[a.id];
        if (scene) {
          // cena curta de revelação: 1,7 s e o controle volta
          setCaption(scene);
          setPhaseBoth('cross');
          setTimeout(() => setPhaseBoth('play'), 1700);
        }
      } else say(t('dive_wall_none'));
    }
  };

  const useConsumable = (id: string) => {
    const mods = currentBreathMods();
    const r = useDiveItem(id, { infinite: mods.infinite });
    if (!r.ok) {
      say(mods.infinite ? t('dive_infinite_on') : t('dive_item_none'));
      playSfx('ui_denied');
      return;
    }
    if (r.breathSec > 0) {
      breathRef.current = { ...breathRef.current, sec: Math.min(breathMax(mods), breathRef.current.sec + r.breathSec), empty: false, drownMs: 0, lowWarned: false };
      say(t('dive_breath_plus').replace('{n}', String(r.breathSec)));
    }
    if (r.buff) say(t('dive_elixir_on'));
    playSfx('use_item');
    setConsumables(diveConsumables());
  };

  // ---- Desenho ----------------------------------------------------------------------------------------
  const camStyle = useAnimatedStyle(() => ({ transform: [{ translateX: camX.value }, { translateY: camY.value }] }));
  const playerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: playerX.value }, { translateY: playerY.value }] }));

  const bodyPose = moving ? `walk${frameIndex + 1}` : 'idle';
  const bodyAspect = SPRITE_ASPECTS[bodyChar]?.[bodyPose] ?? 1;
  const BODY_BOX_W = PLAYER_SIZE.x * 1.9;
  const BODY_BOX_H = PLAYER_SIZE.y * 1.7;
  const bodyW = bodyAspect > BODY_BOX_W / BODY_BOX_H ? BODY_BOX_W : BODY_BOX_H * bodyAspect;
  const bodyH = bodyAspect > BODY_BOX_W / BODY_BOX_H ? BODY_BOX_W / bodyAspect : BODY_BOX_H;
  const bodyBox = { left: (PLAYER_SIZE.x - BODY_BOX_W) / 2 + (BODY_BOX_W - bodyW) / 2, top: PLAYER_SIZE.y - BODY_BOX_H + (BODY_BOX_H - bodyH) / 2, width: bodyW, height: bodyH };
  const bodyDir: 1 | -1 = facing === 'left' ? -1 : 1;

  const mods = currentBreathMods();
  const infinite = mods.infinite;
  const frame = Math.floor(animT.current / 220);
  const sim = simRef.current;
  const worldDeep = mode === 'world' && moodAt(anchor.tx, anchor.ty) === 'abyss';
  const dark = mode === 'world' ? (worldDeep ? 0.34 : coastTiles(anchor.tx, anchor.ty) > 44 ? 0.18 : 0) : site.mood === 'abyss' ? 0.38 : site.mood === 'cave' || site.mood === 'tunnel' ? 0.2 : 0;
  const barColor = breath.level === 'infinite' ? '#ffffff' : breath.level === 'empty' ? '#ff3b30' : breath.level === 'low' ? '#ffb020' : '#3ec6ff';
  const actionLabel =
    action?.kind === 'chest' ? t('dive_open')
    : action?.kind === 'npc' ? t('dive_talk')
    : action?.kind === 'friend' ? t('dive_feed')
    : action?.kind === 'portal' ? t('dive_enter_site')
    : action?.kind === 'surface' ? t(mode === 'site' ? 'dive_leave' : 'dive_surface')
    : action?.kind === 'wall' ? t('dive_search')
    : action?.kind === 'boss' ? t('dive_boss')
    : action?.kind === 'espot' ? t(action.sub === 'chest' ? 'dive_open' : action.sub === 'help' ? 'dive_feed' : 'dive_talk')
    : '';
  const buff = buffMsLeft();
  void tick;

  return (
    <View style={styles.root} testID="dive-overlay">
      <Animated.View style={[{ position: 'absolute', width: (mode === 'world' ? SEA_W : site.w) * TILE, height: (mode === 'world' ? SEA_H : site.h) * TILE }, camStyle]}>
        {mode === 'world' ? (
          <SeaTiles anchor={anchor} cols={Math.ceil(width / TILE) + 18} rows={Math.ceil(height / TILE) + 18} />
        ) : (
          <Image source={DIVE_MAP_IMG[site.id]} resizeMode="stretch" style={{ width: site.w * TILE, height: site.h * TILE }} />
        )}
        {mode === 'world' && getPortals().filter((p) => Math.abs(p.x - anchor.tx) < 40 && Math.abs(p.y - anchor.ty) < 30).map((p) => (
          <View key={p.siteId} style={{ position: 'absolute', left: p.x * TILE - TILE, top: p.y * TILE - TILE, width: TILE * 3, height: TILE * 3, alignItems: 'center', justifyContent: 'center', borderRadius: TILE * 1.5, borderWidth: 3, borderColor: '#ffe066', backgroundColor: 'rgba(255,224,102,0.18)' }}>
            <GameIcon name="compass" size={30} />
            <Text style={styles.portalLabel} numberOfLines={1}>{ALL_SITES[p.siteId]?.name}</Text>
          </View>
        ))}
        {mode === 'world' && chestsNear(anchor.tx, anchor.ty, 1).map((c) => (
          <View key={c.id} style={{ position: 'absolute', left: c.x * TILE, top: c.y * TILE, width: TILE, height: TILE, alignItems: 'center', justifyContent: 'center' }}>
            <GameIcon name={isChestOpen(c.id) ? 'chest_open' : 'gift'} size={26} />
          </View>
        ))}
        {(site.hidden ?? []).filter((h) => rev.has(h.id)).map((h) => (
          <Image key={h.id} source={FLOOR_REVEAL_IMG} style={{ position: 'absolute', left: h.x * TILE, top: h.y * TILE, width: TILE, height: TILE }} />
        ))}
        {mode === 'site' && (site.chests ?? []).map((c) => (
          <View key={c.id} style={{ position: 'absolute', left: c.x * TILE, top: c.y * TILE, width: TILE, height: TILE, alignItems: 'center', justifyContent: 'center' }}>
            <GameIcon name={isChestOpen(c.id) ? 'chest_open' : 'gift'} size={26} />
          </View>
        ))}
        {eventRef.current?.spots.map((sp) =>
          sp.taken ? null : (
            <View key={sp.uid} style={{ position: 'absolute', left: sp.x - 14, top: sp.y - 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              <GameIcon name={sp.kind === 'chest' ? 'gift' : sp.kind === 'coin' ? 'sparkle' : sp.kind === 'help' ? 'heart' : 'bubble'} size={24} />
            </View>
          ),
        )}
        {sim.entities.map((e) => {
          const tg = e.boss?.telegraph;
          if (!tg || e.state === 'dead') return null;
          const prog = 1 - tg.msLeft / tg.totalMs;
          const lure = tg.kind === 'lure';
          return (
            <View
              key={`tg_${e.uid}`}
              pointerEvents="none"
              style={{
                position: 'absolute', left: tg.x - tg.r, top: tg.y - tg.r, width: tg.r * 2, height: tg.r * 2, borderRadius: tg.r,
                borderWidth: 3, borderColor: lure ? '#ffe066' : '#ff3b30', backgroundColor: lure ? `rgba(255,224,102,${0.1 + 0.2 * prog})` : `rgba(255,59,48,${0.12 + 0.3 * prog})`,
              }}
            />
          );
        })}
        {site.bossGate && !isBossDefeated('boss_sea_beast') && (
          <View style={{ position: 'absolute', left: site.bossGate.x * TILE, top: site.bossGate.y * TILE, width: TILE, height: TILE, alignItems: 'center', justifyContent: 'center' }}>
            <GameIcon name="skull" size={28} />
          </View>
        )}
        {(site.npcs ?? []).map((n) => {
          const d = DIVE_NPCS[n.npc];
          if (!d) return null;
          return (
            <View key={n.npc} style={{ position: 'absolute', left: n.x * TILE + TILE / 2 - NPC_MARKER_SIZE / 2, top: n.y * TILE }}>
              <CharacterMarker size={NPC_MARKER_SIZE} skinColor={d.skin} outfitColor={d.outfit} hairColor={d.hair} />
            </View>
          );
        })}
        {sim.entities.map((e) =>
          e.state === 'dead' || e.state === 'hidden' ? null : (
            <View key={e.uid} style={{ position: 'absolute', left: e.x - e.def.size / 2, top: e.y - e.def.size / 2, opacity: e.def.shell && e.shellClosed ? 0.7 : 1 }}>
              <SheetSprite creature={e.def} frame={frame} size={e.def.size} />
            </View>
          ),
        )}
        <Animated.View style={[styles.player, playerStyle]}>
          {wears && <CapeLayer characterKey={bodyChar} poseKey={bodyPose} box={bodyBox} dir={bodyDir} cosmeticId={cosEq.cape} />}
          <Image
            source={getBodySprite(bodyChar, bodyPose, wears ? cosEq.skin : null)}
            resizeMode="contain"
            style={[{ position: 'absolute', bottom: 0, left: (PLAYER_SIZE.x - BODY_BOX_W) / 2, width: BODY_BOX_W, height: BODY_BOX_H }, facing === 'left' && styles.flip]}
          />
          {wears && <HatLayer characterKey={bodyChar} poseKey={bodyPose} box={bodyBox} dir={bodyDir} cosmeticId={cosEq.hat} />}
        </Animated.View>
      </Animated.View>

      {/* água: banho azul, escuridão do fundo, tinta do polvo e piscada de dano */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,70,140,0.16)' }]} />
      {dark > 0 && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,12,${dark})` }]} />}
      {sim.inkMs > 0 && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,0,15,0.72)' }]} />}
      {flash > 0 && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,0,0,${0.35 * flash})` }]} />}

      {/* HUD */}
      <View pointerEvents="none" style={[styles.hud, { top: insets.top + 8 }]}>
        <Text style={styles.hudTitle}>{mode === 'world' ? region : site.name}</Text>
      </View>
      {phase === 'play' && !talk && !shopNpc && (
        <Pressable style={[styles.journalBtn, { top: insets.top + 8, right: insets.right + 12 }]} onPress={() => setJournal(true)} testID="dive-journal">
          <Text style={styles.journalBtnText}>{t('dive_journal')}</Text>
        </Pressable>
      )}
      <View pointerEvents="none" style={[styles.bars, { top: insets.top + 8, left: insets.left + 12 }]}>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>{t('dive_breath')}</Text>
          <View style={styles.barBg}>
            <View style={{ height: '100%', width: `${infinite ? 100 : Math.max(0, Math.min(1, breath.sec / breath.max)) * 100}%`, backgroundColor: barColor }} />
          </View>
          <Text style={[styles.barNum, { color: barColor }]}>{infinite ? '∞' : Math.ceil(breath.sec)}</Text>
        </View>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>♥</Text>
          <View style={styles.barBg}>
            <View style={{ height: '100%', width: `${Math.max(0, Math.min(1, hpFrac)) * 100}%`, backgroundColor: hpFrac < 0.3 ? '#ff3b30' : '#4cd964' }} />
          </View>
        </View>
        {buff > 0 && <Text style={styles.buffText}>{`⏳ ${Math.ceil(buff / 1000)}s`}</Text>}
      </View>

      {/* consumíveis de fôlego */}
      {phase === 'play' && consumables.length > 0 && (
        <View style={[styles.consRow, { top: insets.top + 78, left: insets.left + 12 }]}>
          {consumables.map((c) => (
            <Pressable key={c.id} style={[styles.consBtn, { borderColor: RARITY_COLOR[ITEMS[c.id].rarity] }]} onPress={() => useConsumable(c.id)} testID={`dive-use-${c.id}`}>
              <GameIcon name={ITEMS[c.id].icon} size={22} />
              <Text style={styles.consQty}>{c.qty}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {toast && (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {phase === 'play' && !talk && !shopNpc && (
        <>
          <DPad onPress={setPressed} />
          <View style={[styles.strikeCol, { bottom: insets.bottom + 24, right: insets.right + 16 }]}>
            <Pressable style={[styles.strikeBtn, cds.heavy > 0 && styles.strikeCd]} onPress={() => strike('heavy')} testID="dive-heavy">
              <Text style={styles.strikeText}>{t('dive_heavy')}</Text>
            </Pressable>
            <Pressable style={[styles.strikeBtn, cds.light > 0 && styles.strikeCd]} onPress={() => strike('light')} testID="dive-light">
              <Text style={styles.strikeText}>{t('dive_light')}</Text>
            </Pressable>
          </View>
          {action && (
            <Pressable style={[styles.interactBtn, { bottom: insets.bottom + 150 }]} onPress={doAction} testID="dive-action">
              <Text style={styles.interactLabel}>{actionLabel}</Text>
            </Pressable>
          )}
        </>
      )}

      {journal && (
        <View style={[styles.journal, { top: insets.top + 36, bottom: insets.bottom + 12 }]} testID="dive-journal-panel">
          <Text style={styles.journalTitle}>{t('dive_journal_title')}</Text>
          <ScrollView contentContainerStyle={{ gap: 6, paddingBottom: 8 }}>
            <Text style={styles.journalSection}>{`${t('dive_j_creatures')} ${creaturesKnown()}/${Object.keys(CREATURES).length}`}</Text>
            {Object.values(CREATURES).map((c) => {
              const r = getCreatureRecord(c.id);
              const known = !!r && (r.seen > 0 || r.defeated > 0 || r.helped);
              return (
                <View key={c.id} style={styles.journalRow}>
                  <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', opacity: known ? 1 : 0.18 }}>
                    <SheetSprite creature={c} frame={0} size={36} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.journalName}>{known ? c.name : '???'}</Text>
                    <Text style={styles.journalSub}>
                      {!known
                        ? t('dive_j_unknown')
                        : [
                            r && r.defeated > 0 ? `${t('dive_j_beaten')} x${r.defeated}` : '',
                            r?.helped ? t('dive_j_helped') : '',
                            r && r.defeated > 0 && c.weak ? `${t('dive_j_weak')} ${t(c.weak === 'light' ? 'dive_j_hit_light' : 'dive_j_hit_heavy')}` : '',
                            r && r.defeated > 0 && c.resist ? `${t('dive_j_resist')} ${t(c.resist === 'light' ? 'dive_j_hit_light' : 'dive_j_hit_heavy')}` : '',
                          ]
                            .filter(Boolean)
                            .join(' · ') || c.line}
                    </Text>
                  </View>
                </View>
              );
            })}
            <Text style={styles.journalSection}>{`${t('dive_j_sites')} ${getDiveData().discovered.filter((d) => ALL_SITES[d]?.kind === 'hub').length}/9`}</Text>
            {Object.values(SITES).map((s) => (
              <Text key={s.id} style={[styles.journalSub, { opacity: getDiveData().discovered.includes(s.id) ? 1 : 0.35 }]}>{getDiveData().discovered.includes(s.id) ? s.name : '???'}</Text>
            ))}
            <Text style={styles.journalSection}>{`${t('dive_j_secrets')} ${getDiveData().walls.length}/4`}</Text>
          </ScrollView>
          <MenuButton label={t('dive_close')} variant="ghost" onPress={() => setJournal(false)} />
        </View>
      )}

      {/* conversa com NPC aquático */}
      {talk && !shopNpc && (
        <View style={[styles.talk, { bottom: insets.bottom + 24 }]} testID="dive-talk">
          <Text style={styles.talkName}>{talk.name}</Text>
          <Text style={styles.talkLine}>{talk.say(hasFlag)}</Text>
          <View style={styles.talkRow}>
            {talk.shop && <MenuButton label={t('dive_shop')} onPress={() => setShopNpc(talk)} />}
            <MenuButton label={t('dive_close')} variant="ghost" onPress={() => setTalk(null)} />
          </View>
        </View>
      )}
      {shopNpc?.shop && (
        <ShopOverlay
          onClose={() => {
            setShopNpc(null);
            setConsumables(diveConsumables());
          }}
          stock={shopNpc.shop.stock}
          armors={shopNpc.shop.armors ?? []}
          bags={[]}
          title={shopNpc.shop.title}
          shopKey={`dive_${shopNpc.id}`}
        />
      )}

      {/* cena de descida, travessia e subida */}
      {phase !== 'play' && (
        <View style={[StyleSheet.absoluteFill, styles.cut, { backgroundColor: phase === 'out' ? 'rgba(160,220,255,0.92)' : 'rgba(0,25,60,0.94)' }]} testID="dive-cutscene">
          <Text style={[styles.cutTitle, phase === 'out' && { color: '#05304f' }]}>{caption.title}</Text>
          {!!caption.line && <Text style={[styles.cutLine, phase === 'out' && { color: '#05304f' }]}>{caption.line}</Text>}
          {phase === 'cross' && <Text style={styles.cutHint}>{t('dive_breath')}!</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#04101f' },
  player: { position: 'absolute', width: PLAYER_SIZE.x, height: PLAYER_SIZE.y, alignItems: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  hud: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hudTitle: { color: '#bfe9ff', fontWeight: '800', fontSize: 14, textShadowColor: '#000', textShadowRadius: 4 },
  bars: { position: 'absolute', width: 170, gap: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { color: '#bfe9ff', fontWeight: '800', fontSize: 10, width: 46, textShadowColor: '#000', textShadowRadius: 3 },
  barBg: { flex: 1, height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: '#bfe9ff', overflow: 'hidden' },
  barNum: { fontWeight: '900', fontSize: 12, width: 26, textAlign: 'right', textShadowColor: '#000', textShadowRadius: 3 },
  buffText: { color: '#ffd54f', fontWeight: '800', fontSize: 11 },
  portalLabel: { position: 'absolute', bottom: -16, color: '#ffe066', fontWeight: '900', fontSize: 10, textShadowColor: '#000', textShadowRadius: 3, width: 150, textAlign: 'center' },
  journalBtn: { position: 'absolute', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 2, borderColor: '#7fd6ff', backgroundColor: 'rgba(5,20,40,0.85)' },
  journalBtnText: { color: '#e8f8ff', fontWeight: '800', fontSize: 11 },
  journal: { position: 'absolute', left: 24, right: 24, alignSelf: 'center', maxWidth: 560, backgroundColor: 'rgba(5,20,40,0.96)', borderWidth: 2, borderColor: '#7fd6ff', borderRadius: 12, padding: 12, gap: 8 },
  journalTitle: { color: '#7fd6ff', fontWeight: '900', fontSize: 15, textAlign: 'center' },
  journalSection: { color: '#ffd54f', fontWeight: '900', fontSize: 12, marginTop: 4 },
  journalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  journalName: { color: '#fff', fontWeight: '800', fontSize: 13 },
  journalSub: { color: '#bfe9ff', fontSize: 11 },
  consRow: { position: 'absolute', flexDirection: 'row', gap: 6 },
  consBtn: { width: 40, height: 40, borderRadius: 8, borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  consQty: { position: 'absolute', right: 2, bottom: 0, color: '#fff', fontWeight: '900', fontSize: 11, textShadowColor: '#000', textShadowRadius: 3 },
  toast: { position: 'absolute', top: '32%', alignSelf: 'center', maxWidth: '86%', backgroundColor: 'rgba(5,20,40,0.92)', borderWidth: 2, borderColor: '#7fd6ff', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  toastText: { color: '#e8f8ff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  strikeCol: { position: 'absolute', gap: 10, alignItems: 'center' },
  strikeBtn: { width: 74, height: 74, borderRadius: 37, borderWidth: 3, borderColor: '#7fd6ff', backgroundColor: 'rgba(5,40,80,0.8)', alignItems: 'center', justifyContent: 'center' },
  strikeCd: { opacity: 0.4 },
  strikeText: { color: '#e8f8ff', fontWeight: '900', fontSize: 12 },
  interactBtn: { position: 'absolute', left: '50%', marginLeft: -80, width: 160, paddingVertical: 10, borderRadius: 10, borderWidth: 2, borderColor: '#7fd6ff', backgroundColor: 'rgba(5,20,40,0.88)', alignItems: 'center' },
  interactLabel: { color: '#e8f8ff', fontWeight: '800', fontSize: 12, textAlign: 'center' },
  talk: { position: 'absolute', left: 16, right: 16, alignSelf: 'center', maxWidth: 520, backgroundColor: 'rgba(5,20,40,0.95)', borderWidth: 2, borderColor: '#7fd6ff', borderRadius: 12, padding: 14, gap: 8 },
  talkName: { color: '#7fd6ff', fontWeight: '900', fontSize: 14 },
  talkLine: { color: '#fff', fontSize: 14, lineHeight: 20 },
  talkRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cut: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  cutTitle: { color: '#e8f8ff', fontWeight: '900', fontSize: 26, textAlign: 'center' },
  cutLine: { color: '#bfe9ff', fontSize: 15, marginTop: 12, textAlign: 'center', lineHeight: 22 },
  cutHint: { color: '#7fd6ff', fontWeight: '800', fontSize: 14, marginTop: 18 },
});

export { SITES };
