import React, { useEffect, useRef, useState } from 'react';
import { setFlag } from '@/game/state/storyFlags';
import { GameIcon, IconLabel } from '@/game/ui/GameIcon';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSequence } from 'react-native-reanimated';

import { computeCameraPosition } from '@/game/camera/Camera';
import { bodyBox, isAreaSolid, landFromJump, resolveMove, resolveMoveSolid, singleAxisInput, type AABB } from '@/game/collision/collision';
import { useGameLoop } from '@/game/core/useGameLoop';
import { DefeatOverlay } from '@/game/account/DefeatOverlay';
import { clearDamageCause, describeDeath, lastDamageCause, noteDamage } from '@/game/account/deathCause';
import { REVIVE_COST, currentDeathFee, payDeathFee, payRevive } from '@/game/account/deathRules';
import { useAccount } from '@/game/account/accountState';
import { consumeRespawn, getCheckpoint, setCheckpoint } from '@/game/state/checkpointState';
import { DPad } from '@/game/input/DPad';
import { ActionCluster } from '@/game/input/ActionCluster';
import { useItemMenuAnchor } from '@/game/input/controlsLayout';
import { SpriteEffect, type EffectName } from '@/game/battle/SpriteEffect';
import { EquipMenu } from '@/game/items/EquipMenu';
import { AuraEffect } from '@/game/battle/AuraEffect';
import { ShieldGif } from '@/game/battle/ShieldGif';
import { useDirectionalInput, type DirectionKey } from '@/game/input/useDirectionalInput';
import { TapDashDetector } from '@/game/input/tapDash';
import { TileMapRenderer, type ChunkCoord } from '@/game/world/TileMapRenderer';
import { CHUNK_SIZE, overworld } from '@/game/world/overworld';
import { BUILDING_RECTS, TOWER, getBuildingAtDoor, FERRY_DOCKS, getWorldTile } from '@/game/world/worldGen';
import { computeProgress } from '@/game/state/progressState';
import { getBagEffects } from '@/game/items/bagRuntime';
import { playMusic, playSfx, setAmbient, stopAmbients, warmSfx } from '@/game/audio/audioManager';
import { ALL_AMBIENTS, ambientMix, interiorKindOf, type InteriorKind } from '@/game/audio/ambientMix';
import { BUILDING_CONTENT } from '@/game/world/buildingContent';
import { ClockPill, LightsLayer, NightLayer, useIsNight } from '@/game/world/DayNightLayers';
import { WeatherLayer } from '@/game/world/WeatherLayer';
import { weatherAt, type Weather } from '@/game/state/weatherState';
import { advanceTime, getCycleMs, getTotalMs, isNight, CYCLE_MS } from '@/game/state/timeState';
import { tide, tideLevelAt } from '@/game/world/waveClock';
import { worldMusic } from '@/game/audio/music';
import { haptic } from '@/game/audio/haptics';
import { FerryBoats, BoatImage, boatSize, BOAT_FRAMES, type BoatDir } from '@/game/world/FerryBoats';
import { findSeaRoute, routeLength } from '@/game/world/seaRoute';
import { canClimbCliff } from '@/game/world/cliff';
import { FerryOverlay } from '@/game/world/FerryOverlay';
import { DiveOverlay } from '@/game/dive/DiveOverlay';
import { CurrencyPill, HudBar } from '@/game/hud/StoryHudParts';
import { siegeWavesFor, startSiege } from '@/game/story/siege';
import { islandNear, nearestSeaStart } from '@/game/dive/seaWorld';
import { type IslandId } from '@/game/state/islandState';
import { BuildingSprite } from '@/game/world/BuildingSprite';
import { TowerSprite } from '@/game/world/TowerSprite';
import { SceneryLayer } from '@/game/world/SceneryLayer';
import { CapeLayer, HatLayer, getBodySprite, canWearCosmetics, preloadBodySprites } from '@/game/cosmetics/CosmeticLayers';
import { useCosmetics } from '@/game/state/cosmeticsState';
import { OutdoorNpcs } from '@/game/world/OutdoorNpcs';
import { BossMarkers } from '@/game/world/BossMarkers';
import { BOSSES, BOSS_BY_ID, isBossDefeated, type BossDef } from '@/game/state/bossState';
import { applySkills } from '@/game/items/skills';
import { applyAbility, healMult, lootBonusItem, lootCoins, worldRegenPerSec } from '@/game/story/abilities';
import { getLearned } from '@/game/state/skillState';
import { npcPose } from '@/game/world/npcRoutine';
import { tip } from '@/game/state/tipsState';
import { Minimap } from '@/game/world/Minimap';
import { MissionArrow, type ArrowState } from '@/game/world/MissionArrow';
import { FERRY_STOPS, getIslandAt, nearestStopOf } from '@/game/world/islandMap';
import { getMissionTargets } from '@/game/world/missionTargets';
import { InteriorOverlay } from '@/game/world/InteriorOverlay';
import { CasinoInterior } from '@/game/world/CasinoInterior';
import { PauseButton, PauseMenu } from '@/game/menu/PauseMenu';
import { isWorldFrozen, setGamePaused } from '@/game/state/pauseState';
import { setWorldPosition } from '@/game/state/worldPosition';
import { groundFromTile, setLevelUpGround } from '@/game/story/levelUpScene';
import { createFighter, Fighter } from '@/game/battle/Fighter';
import { FAINT_HP, getStoryHp, setStoryHp } from '@/game/state/healthState';
import { applyArmorRegen } from '@/game/items/armor';
import { getLayoutAspect, hasPose, SPRITE_ASPECTS, walkFrames } from '@/game/battle/sprites';
import { getHandAnchor } from '@/game/battle/handAnchors';
import { rollHit } from '@/game/battle/damageRoll';
import { getGear, isGear } from '@/game/items/gear';
import { HeldGear, type SwingPhase } from '@/game/items/HeldGear';
import { EnemyManager, type PlayerAttackType } from '@/game/enemies/enemySim';
import { markEliteDefeated } from '@/game/state/eliteState';
import { nextRivalEncounter, getRivalEncounterParam } from '@/game/state/rivalState';
import { EnemyLayer } from '@/game/enemies/EnemyLayer';
import { getStoryDifficulty } from '@/game/state/difficulty';
import { NPCS, OUTDOOR_NPCS, type NpcDef } from '@/game/world/npcs';
import { isPlacementActive } from '@/game/world/npcActive';
import { endingShouldPlay } from '@/game/story/storyEnding';
import { cutscenesForMission } from '@/game/story/cutscenes';
import { cutsceneSeen, nextQueuedCutscene, queueCutscenes } from '@/game/story/cutsceneState';
import { isShortCutscenePlaying, playShortCutscene, queueShortEvent, takeQueuedShortEvent } from '@/game/story/shortCutsceneState';
import { CLIMB_COOLDOWN_MS, climbEventOnEntry } from '@/game/world/climbEvents';
import { BOSS_LORE } from '@/game/story/bossLore';
import { WORLD_PICKUPS, type PickupDef } from '@/game/world/pickups';
import { DialogueOverlay } from '@/game/dialogue/DialogueOverlay';
import { QuestOfferPrompt } from '@/game/dialogue/QuestOfferPrompt';
import { getQuestStatus, setQuestStatus, QUEST_BATTLE_DEFS, getCurrentMissionId, getNpcQuest, onMissionCompleted, onQuestNotice, isPlatinumAnnounced, markPlatinumAnnounced, refreshMissions, reportEnter, reportKill, reportReach, reportTalk, reportVisit, getStoryCharacterId } from '@/game/state/questState';
import { getStoryCharacter } from '@/game/story/characters';
import { resolveNpcDialogue } from '@/game/story/npcDialogue';
import { ChoiceOverlay } from '@/game/dialogue/ChoiceOverlay';
import { pendingChoiceFor, type ChoiceDef } from '@/game/story/storyChoices';
import { markLorePieceFound, allLorePiecesFound, combinedInscription } from '@/game/state/loreState';
import { saveGame } from '@/game/state/saveState';
import { useSettings } from '@/game/state/settingsState';
import { getSession } from '@/game/state/session';
import { MissionHud } from '@/game/world/MissionHud';
import { router, useIsFocused } from 'expo-router';
import { CURRENCY_ABBR, ITEMS, itemName, applyItemEffect, needsTarget, itemEffectName } from '@/game/items/itemDefs';
import { addCoins, addItem, bagRoomFor, consumeEquippedItem, getEquippedItems, isCollected, markCollected, usePlayerState, getUpgradeLevels, addXp, takeLevelNotice } from '@/game/state/playerState';
import { applyUpgrades, upgradeSpeedMult } from '@/game/items/upgrades';
import { useI18n } from '@/game/i18n/i18n';
import type { Direction, PlayerState } from '@/types/game';

/** O corpo do jogador agora vem de getBodySprite (pose + skin); a caminhada tem 3 quadros. */

const PLAYER_SIZE = { x: 30, y: 42 };
const PLAYER_SPEED = 190;
const WALK_FRAME_MS = 140;
const CHUNK_RADIUS = 1; // 3x3 chunks loaded at once, not 5x5 - see docs/AUDIT.md perf pass
const ATTACK_ANIM_MS = 260;
const JUMP_HEIGHT = 30;
const JUMP_MS = 420; // o pulo precisa cobrir um bloco inteiro mais o corpo (uma pedra ou tronco no caminho)
const JUMP_COOLDOWN_MS = 300;
const INTERACT_RANGE = 70;
const PICKUP_RANGE = 34;
const NPC_MARKER_SIZE = 34;

const map = overworld;

const DASH_DIR_VECTORS: Record<DirectionKey, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function spawnWorldPos() {
  const spawn = map.spawns[0];
  return {
    x: spawn.x * map.tileSize + map.tileSize / 2 - PLAYER_SIZE.x / 2,
    y: spawn.y * map.tileSize + map.tileSize / 2 - PLAYER_SIZE.y / 2,
  };
}

function chunkListAround(cx: number, cy: number): ChunkCoord[] {
  const list: ChunkCoord[] = [];
  for (let y = cy - CHUNK_RADIUS; y <= cy + CHUNK_RADIUS; y++) {
    for (let x = cx - CHUNK_RADIUS; x <= cx + CHUNK_RADIUS; x++) list.push({ cx: x, cy: y });
  }
  return list;
}


const CASINO_BUILDING_ID = 'loja_misteriosa';
const TROLL_BOSS_ID = 'boss_troll';

export function WorldScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const itemAnchor = useItemMenuAnchor();
  const { t } = useI18n();
  const { coins, level, xp, xpNeeded, statPoints } = usePlayerState();

  const startPos = useRef(spawnWorldPos()).current;
  const positionRef = useRef({ ...startPos });
  const facingRef = useRef<Direction>('down');
  const movingRef = useRef(false);
  const frameTimerRef = useRef(0);
  const pausedRef = useRef(false);
  const endingPushedRef = useRef(false);
  // Cutscenes em vídeo: `cutsceneGateRef` diz se o mundo está livre (sem diálogo, menu, luta por cima...) para abrir a próxima da fila.
  const cutsceneGateRef = useRef(false);
  // Escalada (cutscene curta): estava sobre o paredão no quadro anterior? e quando tocou a última vez (cooldown).
  const onCliffRef = useRef(false);
  const lastClimbCutsceneRef = useRef(Date.now()); // começa com 15 s de carência: carregar o save em cima do paredão não toca vídeo
  const bootingRef = useRef(true);
  // O menu de pausa é um <Modal> (fica acima de tudo): some enquanto uma tela do menu (STATUS, MISSÕES...) está aberta.
  const worldFocused = useIsFocused();
  useEffect(() => () => setGamePaused(false), []);
  const attackTimerRef = useRef(0);

  const startChunk = { cx: Math.floor(startPos.x / map.tileSize / CHUNK_SIZE), cy: Math.floor(startPos.y / map.tileSize / CHUNK_SIZE) };
  const currentChunkRef = useRef(startChunk);
  const [activeChunks, setActiveChunks] = useState<ChunkCoord[]>(() => chunkListAround(startChunk.cx, startChunk.cy));
  const [chunkPos, setChunkPos] = useState(startChunk);

  const { stateRef: inputRef, setPressed } = useDirectionalInput();
  const dashDirRef = useRef({ x: 0, y: 1 });
  const tapDashRef = useRef(new TapDashDetector<DirectionKey>()).current;

  const cameraX = useSharedValue(0);
  const cameraY = useSharedValue(0);
  const playerX = useSharedValue(positionRef.current.x);
  const playerY = useSharedValue(positionRef.current.y);
  const bumpX = useSharedValue(0);
  const bumpY = useSharedValue(0);
  const jumpY = useSharedValue(0); // hop offset (negative = up), see handleJump
  const jumpingRef = useRef(false);
  // Movimento: uma direção por vez (a última apertada vence), corpos sólidos e pouso do pulo
  const heldAxesRef = useRef({ x: false, y: false });
  const lastAxisRef = useRef<'x' | 'y'>('x');
  const lastMoveRef = useRef({ x: 0, y: 1 });
  const lastSafeRef = useRef({ x: 0, y: 0 });
  const bodiesRef = useRef<{ at: number; boxes: AABB[] }>({ at: 0, boxes: [] });
  const [jumpReady, setJumpReady] = useState(true);
  const healthPct = useSharedValue(100);
  const energyPct = useSharedValue(0);

  const [facing, setFacing] = useState<Direction>('down');
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [frameIndex, setFrameIndex] = useState(0);
  const [attacking, setAttacking] = useState<null | 'flash' | 'strong' | 'ultimate'>(null);
  const [shielding, setShielding] = useState(false);
  const [charging, setCharging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [interior, setInterior] = useState<null | { buildingId: string; returnPos: { x: number; y: number } }>(null);
  const [ferryOpen, setFerryOpen] = useState(false);
  /** Mergulho aberto (id do local) ou null. Enquanto aberto o mundo fica parado, como num interior. */
  const [diveSite, setDiveSite] = useState<{ start: { x: number; y: number }; dock: string; from: { x: number; y: number } } | null>(null);
  /** Água ao alcance (de qualquer ponto da costa): dá para mergulhar. */
  const [diveStart, setDiveStart] = useState<{ x: number; y: number } | null>(null);
  const diveStartRef = useRef<{ x: number; y: number } | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  // Boat trip in progress (see stepSail below): the player rides a boat along a sea route to the chosen island.
  const [sail, setSail] = useState<null | { origin: string; dest: IslandId; dir: BoatDir; frame: number }>(null);
  const sailRef = useRef<null | { pts: { x: number; y: number }[]; cum: number[]; total: number; t: number; dur: number; dest: IslandId; dir: BoatDir; frameT: number; chunkKey: string }>(null);
  // Which ferry stop the player is standing at (null = none in reach).
  const [dockHere, setDockHere] = useState<IslandId | null>(null);
  const [arrow, setArrow] = useState<ArrowState | null>(null);
  const arrowTimerRef = useRef(0);
  const hereIslandRef = useRef<string | null>(null);
  const [musicIsland, setMusicIsland] = useState<string | null>(null);
  const night = useIsNight();
  const [weather, setWeather] = useState<Weather>('clear');
  const [flashKey, setFlashKey] = useState(0);
  const weatherRef = useRef<Weather>('clear');
  const thunderAtRef = useRef(0);
  const insideRef = useRef(false);
  const interiorKindRef = useRef<InteriorKind | null>(null);
  const stepTimerRef = useRef(0);
  const bagFullAtRef = useRef(0);
  const missionRefreshRef = useRef(0);
  const arrowOff = getStoryDifficulty() === 'hardcore'; // HARDCORE: no arrow, no map
  const dockHereRef = useRef<IslandId | null>(null);
  const cliffHintAtRef = useRef(0);
  const [nearbyNpc, setNearbyNpc] = useState<NpcDef | null>(null);
  const [dialogueNpc, setDialogueNpc] = useState<NpcDef | null>(null);
  const [choiceNpc, setChoiceNpc] = useState<{ npc: NpcDef; choice: ChoiceDef } | null>(null);
  const [nearbyBoss, setNearbyBoss] = useState<BossDef | null>(null);
  const [nearTower, setNearTower] = useState(false);
  const [bossOffer, setBossOffer] = useState<BossDef | null>(null);
  const [questOffer, setQuestOffer] = useState<{ npc: NpcDef; questId: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, forcePickupRefresh] = useState(0);

  // Save system (see docs/AUDIT.md + saveState.ts): `booting` gates both
  // the game loop and the render below until any existing save has been
  // read and applied - positionRef/currentChunkRef/etc above are all
  // still initialized to spawn regardless (useRef's initial value only
  // ever runs once, before this effect can know whether a save exists),
  // but that's invisible: nothing that reads them renders or ticks until
  // `booting` flips to false, which only happens after they've been
  // corrected below if a save was found.
  const [booting, setBooting] = useState(true);
  // Background music by region / interior / boat trip (see audio/music.ts).
  useEffect(() => {
    if (booting) return;
    playMusic(worldMusic({ island: musicIsland, interior: interior?.buildingId ?? null, sailing: !!sail, night }));
  }, [booting, musicIsland, interior, sail, night]);
  insideRef.current = !!interior;
  interiorKindRef.current = interior ? interiorKindOf(interior.buildingId, BUILDING_CONTENT[interior.buildingId]?.template, CASINO_BUILDING_ID) : null;
  useEffect(() => {
    if (booting) return;
    if (night) tip('night');
  }, [booting, night]);
  useEffect(() => {
    if (booting) return;
    if (weather === 'rain' || weather === 'storm') tip('rain');
    else if (weather === 'fog') tip('fog');
    else if (weather === 'snow' || weather === 'blizzard') tip('snow');
    else if (weather === 'ash') tip('ash');
  }, [booting, weather]);
  useEffect(() => {
    if (!booting && statPoints > 0) tip('points');
  }, [booting, statPoints]);
  useEffect(() => {
    if (nearbyNpc) tip('talk');
  }, [nearbyNpc]);
  useEffect(() => {
    if (dockHere) tip('ferry');
  }, [dockHere]);
  // Game clock, weather and ambient sound (rain / wind / waves): twice a second.
  useEffect(() => {
    if (booting) return;
    const id = setInterval(() => {
      if (pausedRef.current) return; // pausa de verdade: relógio, clima e trovão param (o audioManager pausa os ambientes e os retoma ao voltar)
      if (isWorldFrozen()) {
        // Luta aberta por cima do mundo: os ambientes do mundo silenciam (uma luta tem som próprio) e a mistura volta quando ela fecha.
        stopAmbients();
        return;
      }
      advanceTime(500);
      // Missão final concluída: mostra o final (uma vez por save).
      if (!endingPushedRef.current && endingShouldPlay()) {
        endingPushedRef.current = true;
        router.push('/ending' as never);
      } else if (!endingPushedRef.current && cutsceneGateRef.current && !isShortCutscenePlaying()) {
        // Cutscene curta que estava esperando o mundo ficar livre (ex.: subiu de nível numa batalha), depois a da missão que fechou.
        const shortEv = takeQueuedShortEvent();
        if (shortEv) {
          playShortCutscene(shortEv);
        } else {
          // Cutscene em vídeo da missão que acabou de fechar (uma por vez, só quando o mundo está livre).
          const csId = nextQueuedCutscene();
          if (csId && !cutsceneSeen(csId)) router.push(`/cutscene?id=${csId}` as never);
        }
      }
      // Posição do mundo para a batalha escolher cenário, clima e hora (ver battleContext.ts).
      setWorldPosition({
        tx: Math.floor((positionRef.current.x + PLAYER_SIZE.x / 2) / map.tileSize),
        ty: Math.floor((positionRef.current.y + PLAYER_SIZE.y) / map.tileSize),
        island: hereIslandRef.current ?? null,
        sailing: !!sailRef.current,
      });
      const total = getTotalMs();
      const sailing = !!sailRef.current;
      const island = hereIslandRef.current ?? 'main';
      const w: Weather = sailing ? weatherAt('main', total) : weatherAt(island, total);
      if (weatherRef.current !== w) {
        weatherRef.current = w;
        setWeather(w);
      }
      tide.value = withTiming(tideLevelAt(getCycleMs(), CYCLE_MS), { duration: 480 });
      const inside = insideRef.current;
      let water = 0;
      if (!inside && !sailing) {
        const ts = map.tileSize;
        const bx = Math.floor((positionRef.current.x + PLAYER_SIZE.x / 2) / ts);
        const by = Math.floor((positionRef.current.y + PLAYER_SIZE.y / 2) / ts);
        let wet = 0;
        let n = 0;
        for (let oy = -6; oy <= 6; oy += 2) {
          for (let ox = -6; ox <= 6; ox += 2) {
            n++;
            if (map.getTile(bx + ox, by + oy) === 'water') wet++;
          }
        }
        water = wet === 0 ? 0 : Math.min(0.7, 0.15 + (wet / n) * 0.9);
      }
      // Mistura por região (audio/ambientMix.ts): uma cama regional + uma camada de clima/água, com cross-fade no audioManager.
      const mix = ambientMix({ island: hereIslandRef.current ?? 'main', interior: interiorKindRef.current, sailing, night: isNight(), weather: w, water });
      for (const k of ALL_AMBIENTS) setAmbient(k, mix[k]);
      if (w === 'storm' && !inside && Date.now() > thunderAtRef.current) {
        thunderAtRef.current = Date.now() + 7000 + Math.random() * 14000;
        setFlashKey((k) => k + 1);
        setTimeout(() => playSfx('thunder', { gain: 0.9, minGapMs: 0 }), 350);
      }
    }, 500);
    return () => {
      clearInterval(id);
      stopAmbients();
    };
  }, [booting, map]);
  useEffect(() => {
    warmSfx(['swing', 'slash', 'hit_flesh', 'coin', 'player_hurt', 'step_grass']);
  }, []);
  useEffect(() => {
    // The slots screen (SaveSlotsScreen) already applied the chosen world's
    // state (coins, quests, lore...) and stored where to put the player.
    const rawStart = getSession()?.startPos;
    // A save from an older version can sit on a tile that is solid now (the old
    // east pier no longer exists, say): move to the nearest free spot instead of getting stuck.
    let start = rawStart;
    if (rawStart && isAreaSolid(map, { x: rawStart.x, y: rawStart.y, width: PLAYER_SIZE.x, height: PLAYER_SIZE.y })) {
      const ts = map.tileSize;
      const bx = Math.floor(rawStart.x / ts);
      const by = Math.floor(rawStart.y / ts);
      let found: { x: number; y: number } | null = null;
      for (let r = 1; r <= 60 && !found; r++) {
        for (let oy = -r; oy <= r && !found; oy++) {
          for (let ox = -r; ox <= r; ox++) {
            if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
            const cand = { x: (bx + ox) * ts, y: (by + oy) * ts, width: PLAYER_SIZE.x, height: PLAYER_SIZE.y };
            if (!isAreaSolid(map, cand)) {
              found = { x: cand.x, y: cand.y };
              break;
            }
          }
        }
      }
      const fallback = FERRY_DOCKS.main.anchor;
      const spot = found ?? { x: fallback.x * ts, y: fallback.y * ts };
      start = { ...rawStart, x: spot.x, y: spot.y };
    }
    if (start) {
      positionRef.current = { x: start.x, y: start.y };
      playerX.value = start.x;
      playerY.value = start.y;
      facingRef.current = start.facing;
      setFacing(start.facing);
      const cx = Math.floor(start.x / map.tileSize / CHUNK_SIZE);
      const cy = Math.floor(start.y / map.tileSize / CHUNK_SIZE);
      currentChunkRef.current = { cx, cy };
      setChunkPos({ cx, cy });
      setActiveChunks(chunkListAround(cx, cy));
    }
    setBooting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const interiorRef = useRef(interior);
  interiorRef.current = interior;
  const doSave = async (): Promise<boolean> => {
    // Inside a building the world position is the door tile - save the
    // spot just outside instead (where the player returns to).
    const pos = interiorRef.current?.returnPos ?? positionRef.current;
    return saveGame({ x: pos.x, y: pos.y, facing: facingRef.current });
  };

  // "Missão concluída" toasts (one after the other if several finish at once).
  const missionToastQueue = useRef<string[]>([]);
  useEffect(() => {
    const off = onMissionCompleted((def, reward) => {
      // Cutscene em vídeo: só para missões concluídas NESTA sessão (não durante o carregamento do save).
      if (!bootingRef.current) {
        // Uma missão pode fechar mais de uma cena (ex.: Sea Beast = "A Queda do Leviatã" + "O Mar em Paz"): entram todas, na ordem do registro.
        queueCutscenes(cutscenesForMission(def.id, (m) => getQuestStatus(m) === 'completed', cutsceneSeen).map((c) => c.id));
      }
      if (!bootingRef.current) {
        // Parte 2: aparição do rival e elites que a missão libera.
        const encNow = nextRivalEncounter((m) => getQuestStatus(m) === 'completed');
        if (encNow && encNow.gate === def.id) missionToastQueue.current.push(t('rival_appeared'));
        if (enemies.refreshElites((d) => getQuestStatus(d.gate) === 'completed').length > 0) missionToastQueue.current.push(t('elite_appeared'));
      }
      const bits = [def.title];
      if (reward.coins) bits.push(`+${reward.coins} ${CURRENCY_ABBR}`);
      if (reward.xp) bits.push(`+${reward.xp} XP`);
      if (reward.diamonds) bits.push(`+${reward.diamonds} 💎`);
      missionToastQueue.current.push(bits.join('  '));
    });
    // Item received / next step of a multi-step mission.
    const offNotice = onQuestNotice((text) => missionToastQueue.current.push(text));
    const id = setInterval(() => {
      const lvl = takeLevelNotice();
      if (lvl !== null) {
        missionToastQueue.current.unshift(`NÍVEL ${lvl}! +1 ponto de status`);
        // chão da cena de nível: o tipo de bloco onde o jogador está (ou o fundo do mar, se estiver mergulhado)
        setLevelUpGround(groundFromTile(getWorldTile(Math.floor(positionRef.current.x), Math.floor(positionRef.current.y)), diveStartRef.current !== null));
        queueShortEvent('level:up'); // toca quando o mundo estiver livre (não durante batalha)
      }
      const next = missionToastQueue.current.shift();
      if (next) showToastRef.current(next);
    }, 2300);
    return () => {
      off();
      offNotice();
      clearInterval(id);
    };
  }, []);

  // AUTO SAVE (Options): every 15/30 s while this world is running.
  const settings = useSettings();
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => {
    if (booting || !settings.autoSave) return;
    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(async () => {
      if (pausedRef.current) return; // the pause menu has its own save buttons
      if (await doSave()) {
        setSavedFlash(true);
        flashTimer = setTimeout(() => setSavedFlash(false), 1300);
      }
    }, settings.autoSaveSeconds * 1000);
    return () => {
      clearInterval(id);
      if (flashTimer) clearTimeout(flashTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booting, settings.autoSave, settings.autoSaveSeconds]);

  const baseRegenRef = useRef(0);
  const fighter = useRef<Fighter>(createFighter(getStoryCharacter(getStoryCharacterId()).fighter, getLayoutAspect(getStoryCharacter(getStoryCharacterId()).fighter))).current;

  // Overworld enemies (see game/enemies): the manager owns their logic, the
  // loop below drives it, EnemyLayer draws it.
  // Próxima aparição especial do rival liberada pela história (null = só a revanche livre). Lido a cada render: é barato.
  const rivalEnc = nextRivalEncounter((m) => getQuestStatus(m) === 'completed');
  const enemies = useRef(new EnemyManager(map, getStoryDifficulty(), (d) => getQuestStatus(d.gate) === 'completed')).current;
  const invulnRef = useRef(0); // ms of damage immunity after a hit
  const sinceHurtRef = useRef(99999);
  const pendingAttackRef = useRef<{ type: PlayerAttackType; delay: number } | null>(null);
  const [hurt, setHurt] = useState(false);
  // Derrota no mundo (vida zerada): congela o jogo e deixa escolher entre reviver (Diamond Meme) e voltar ao checkpoint.
  const account = useAccount();
  const [downed, setDowned] = useState(false);
  const downedRef = useRef(false);
  const [swingPhase, setSwingPhase] = useState<SwingPhase>(undefined);

  // Maximilian's permanent stat upgrades (see upgrades.ts) - applied once
  // on mount. In an effect, not inline during render: doing this kind of
  // thing during render is what caused the "Maximum update depth
  // exceeded" crash fixed in docs/AUDIT.md, even though this particular
  // call doesn't itself touch other components - kept consistent/safe by
  // the same rule regardless.
  useEffect(() => {
    applyUpgrades(fighter, getUpgradeLevels());
    applySkills(fighter, getStoryCharacterId(), getLearned());
    applyAbility(fighter, getStoryCharacterId());
    baseRegenRef.current = fighter.regenPerSec; // só o das habilidades; a armadura soma por cima a cada quadro
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vida do modo história (state/healthState.ts): vale ao entrar no mundo (depois do save carregar) e a cada volta de uma luta.
  // Quem escreve o valor é este loop (mundo) ou a BattleScreen (luta de história); aqui só leio ao ganhar o foco.
  useEffect(() => {
    if (booting || !worldFocused) return;
    fighter.health = Math.max(1, getStoryHp() * fighter.maxHealth);
    healthPct.value = (fighter.health / fighter.maxHealth) * 100;
    // Perdeu uma luta de história e aceitou a derrota: volta ao checkpoint (a taxa já foi cobrada na luta).
    if (consumeRespawn()) {
      wakeAt(checkpointPos(), Math.max(getStoryHp(), 0.01));
      showToast(t('death_back_checkpoint'));
    }
    sinceHurtRef.current = 0; // voltou de uma luta: a regeneração natural do mundo espera o tempo normal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booting, worldFocused]);

  // Same dash trigger as battle (double-tap a direction within 300ms, see
  // src/game/input/tapDash.ts) instead of a dedicated button, so it's the
  // same move in both modes - just aimed in 2D instead of left/right only.
  const handleDirPress = (key: DirectionKey, pressed: boolean) => {
    setPressed(key, pressed);
    if (pressed && tapDashRef.tap(key)) {
      if (fighter.startDash(1)) dashDirRef.current = DASH_DIR_VECTORS[key];
    }
  };

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2000);
  };
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  useGameLoop((dtMs) => {
    if (booting || !worldFocused || pausedRef.current || downedRef.current || interior || diveSite || dialogueNpc || choiceNpc || questOffer || bossOffer || isShortCutscenePlaying()) return;
    applyArmorRegen(fighter, baseRegenRef.current); // armadura equipada: regenera vida aos poucos (fighter.update aplica)
    const sap = worldRegenPerSec(); // Seiva Viva (Dragão Verde): regenera ao andar pelo mundo, fora de combate
    if (sap > 0 && !fighter.isKO && fighter.health < fighter.maxHealth) {
      fighter.health = Math.min(fighter.maxHealth, fighter.health + fighter.maxHealth * sap * (dtMs / 1000) * healMult());
    }
    if (sailRef.current) {
      stepSail(dtMs);
      return;
    }

    fighter.update(dtMs, dtMs / (1000 / 60));
    healthPct.value = (fighter.health / fighter.maxHealth) * 100;
    energyPct.value = fighter.energy;

    if (attackTimerRef.current > 0) {
      attackTimerRef.current -= dtMs;
      if (attackTimerRef.current <= 0) {
        setAttacking(null);
        setSwingPhase(undefined);
      }
    }

    const dt = dtMs / 1000;
    const input = inputRef.current;

    let dx = 0;
    let dy = 0;
    let usingDash = false;
    if (fighter.state === 'dash') {
      dx = dashDirRef.current.x;
      dy = dashDirRef.current.y;
      usingDash = true;
    } else if (!fighter.isShielding) {
      // UMA direção por vez: sem andar na diagonal (se apertar duas, vale a última)
      const one = singleAxisInput(input, heldAxesRef.current, lastAxisRef.current);
      dx = one.dx;
      dy = one.dy;
      heldAxesRef.current = one.held;
      lastAxisRef.current = one.axis;
    }
    if (dx !== 0 || dy !== 0) lastMoveRef.current = { x: dx, y: dy };

    const isMoving = (dx !== 0 || dy !== 0) && !attacking;

    if (isMoving) {
      const len = Math.hypot(dx, dy) || 1;
      // Dash ratio x the Velocidade attribute (+3%/level) x the bag's walking bonus.
      const speedMul = (usingDash ? fighter.dashSpeed / fighter.speed : 1) * upgradeSpeedMult(getUpgradeLevels().speed) * getBagEffects().speedMult;
      const step = { x: (dx / len) * PLAYER_SPEED * speedMul * dt, y: (dy / len) * PLAYER_SPEED * speedMul * dt };

      // NPCs, inimigos e chefes são SÓLIDOS (só dá para passar pulando por cima)
      const nowMs = Date.now();
      if (nowMs - bodiesRef.current.at > 120) {
        const ts = map.tileSize;
        const px = positionRef.current.x;
        const py = positionRef.current.y;
        const near = (cx: number, cy: number) => Math.abs(cx - px) < ts * 12 && Math.abs(cy - py) < ts * 12;
        const boxes: AABB[] = [];
        for (const p of OUTDOOR_NPCS) {
          if (!isPlacementActive(p)) continue;
          const pose = npcPose(p);
          if (near(pose.x * ts, pose.y * ts)) boxes.push(bodyBox(pose.x * ts, pose.y * ts, ts));
        }
        for (const e of enemies.enemies) if ((e.mode === 'idle' || e.mode === 'chase') && near(e.x, e.y)) boxes.push(bodyBox(e.x, e.y + ts * 0.25, ts));
        for (const b of BOSSES) if (b.spot && !isBossDefeated(b.id) && near(b.spot.x * ts, b.spot.y * ts)) boxes.push(bodyBox(b.spot.x * ts, b.spot.y * ts, ts));
        bodiesRef.current = { at: nowMs, boxes };
      }
      const result = resolveMoveSolid(map, positionRef.current, PLAYER_SIZE, step, bodiesRef.current.boxes, jumpingRef.current);
      positionRef.current = result.position;
      if (!isAreaSolid(map, { x: result.position.x, y: result.position.y, width: PLAYER_SIZE.x, height: PLAYER_SIZE.y })) lastSafeRef.current = result.position;
      playerX.value = result.position.x;
      playerY.value = result.position.y;

      // Footsteps by ground type.
      stepTimerRef.current -= dtMs;
      if (stepTimerRef.current <= 0 && !jumpingRef.current) {
        stepTimerRef.current = usingDash ? 190 : 330;
        const under = map.getTile(Math.floor((result.position.x + PLAYER_SIZE.x / 2) / map.tileSize), Math.floor((result.position.y + PLAYER_SIZE.y) / map.tileSize));
        playSfx(under === 'dock' ? 'step_wood' : under === 'stone' || under === 'ash' || under === 'rock' || under === 'snow' || under === 'cliff' ? 'step_rock' : under === 'water' ? 'step_water' : 'step_grass', { gain: 0.45, minGapMs: 120 });
      }

      // Cutscene curta de escalada: ao ENTRAR no paredão ('cliff') vindo de fora (regra sobe/desce em climbEvents.ts).
      {
        const ctx = Math.floor((result.position.x + PLAYER_SIZE.x / 2) / map.tileSize);
        const cty = Math.floor((result.position.y + PLAYER_SIZE.y) / map.tileSize);
        const nowOnCliff = map.getTile(ctx, cty) === 'cliff';
        if (nowOnCliff && !onCliffRef.current && Date.now() - lastClimbCutsceneRef.current > CLIMB_COOLDOWN_MS) {
          if (playShortCutscene(climbEventOnEntry((x, y) => map.getTile(x, y), ctx, cty))) lastClimbCutsceneRef.current = Date.now();
        }
        onCliffRef.current = nowOnCliff;
      }

      if (result.blockedX || result.blockedY) {
        // Bumping into an icy cliff without a piolet: say what's missing.
        const pcx = positionRef.current.x + PLAYER_SIZE.x / 2;
        const pcy = positionRef.current.y + PLAYER_SIZE.y / 2;
        const ax = Math.floor((pcx + Math.sign(dx) * (PLAYER_SIZE.x / 2 + 4)) / map.tileSize);
        const ay = Math.floor((pcy + Math.sign(dy) * (PLAYER_SIZE.y / 2 + 4)) / map.tileSize);
        if ((map.getTile(ax, Math.floor(pcy / map.tileSize)) === 'cliff' || map.getTile(Math.floor(pcx / map.tileSize), ay) === 'cliff') && !canClimbCliff() && Date.now() - cliffHintAtRef.current > 3000) {
          cliffHintAtRef.current = Date.now();
          showToastRef.current(t('cliff_hint'));
        }
      }
      if (result.blockedX) {
        bumpX.value = withTiming(dx > 0 ? -6 : 6, { duration: 60 }, () => {
          bumpX.value = withTiming(0, { duration: 90 });
        });
      }
      if (result.blockedY) {
        bumpY.value = withTiming(dy > 0 ? -6 : 6, { duration: 60 }, () => {
          bumpY.value = withTiming(0, { duration: 90 });
        });
      }

      const cx = Math.floor(positionRef.current.x / map.tileSize / CHUNK_SIZE);
      const cy = Math.floor(positionRef.current.y / map.tileSize / CHUNK_SIZE);
      if (cx !== currentChunkRef.current.cx || cy !== currentChunkRef.current.cy) {
        currentChunkRef.current = { cx, cy };
        setActiveChunks(chunkListAround(cx, cy));
        setChunkPos({ cx, cy });
      }

      const centerTileX = Math.floor((positionRef.current.x + PLAYER_SIZE.x / 2) / map.tileSize);
      const centerTileY = Math.floor((positionRef.current.y + PLAYER_SIZE.y / 2) / map.tileSize);
      if (map.getTile(centerTileX, centerTileY) === 'door') {
        const building = getBuildingAtDoor(centerTileX, centerTileY);
        // O Troll Face e o dono do cassino: no primeiro acesso a porta fica barrada ate vencer a luta dele.
        if (building?.id === CASINO_BUILDING_ID && !isBossDefeated(TROLL_BOSS_ID)) {
          const back = { x: positionRef.current.x, y: positionRef.current.y + map.tileSize * 3 };
          positionRef.current = back;
          playerX.value = back.x;
          playerY.value = back.y;
          showToastRef.current(t('casino_troll_blocked'));
          setBossOffer(BOSS_BY_ID[TROLL_BOSS_ID]);
          return;
        }
        reportEnter(building?.id ?? 'plaza_shop');
        setInterior({ buildingId: building?.id ?? 'plaza_shop', returnPos: { ...positionRef.current } });
        return;
      }

      let newFacing: Direction = facingRef.current;
      if (Math.abs(dx) > Math.abs(dy)) newFacing = dx > 0 ? 'right' : 'left';
      else if (dy !== 0) newFacing = dy > 0 ? 'down' : 'up';
      if (newFacing !== facingRef.current) {
        facingRef.current = newFacing;
        setFacing(newFacing);
      }

      frameTimerRef.current += dtMs;
      if (frameTimerRef.current >= WALK_FRAME_MS) {
        frameTimerRef.current = 0;
        setFrameIndex((i) => (i + 1) % walkFrames(getStoryCharacter(getStoryCharacterId()).fighter).length);
      }
    } else {
      frameTimerRef.current = 0;
    }

    if (isMoving !== movingRef.current) {
      movingRef.current = isMoving;
      setPlayerState(isMoving ? 'walking' : 'idle');
    }

    // Ferry stops: the main-island pier plus every island's landing pad,
    // so you can sail BACK as well as out.
    {
      const cxp = positionRef.current.x + PLAYER_SIZE.x / 2;
      const cyp = positionRef.current.y + PLAYER_SIZE.y / 2;
      let here: IslandId | null = null;
      for (const stop of FERRY_STOPS) {
        if (Math.hypot(cxp - stop.anchor.x * map.tileSize, cyp - stop.anchor.y * map.tileSize) < 300) {
          here = stop.id;
          break;
        }
      }
      if (here !== dockHereRef.current) {
        dockHereRef.current = here;
        setDockHere(here);
      }
      // Mergulho: de QUALQUER ponto da costa. Basta estar a até 2 tiles da água.
      const sea = nearestSeaStart(Math.floor(cxp / map.tileSize), Math.floor(cyp / map.tileSize), 2);
      const prev = diveStartRef.current;
      if ((sea?.x !== prev?.x) || (sea?.y !== prev?.y)) {
        diveStartRef.current = sea;
        setDiveStart(sea);
      }
    }

    // A few times a second: island visits + "reach this spot" missions (always),
    // and the mission arrow (not on HARDCORE).
    arrowTimerRef.current += dtMs;
    if (arrowTimerRef.current >= 250) {
      arrowTimerRef.current = 0;
      const ptx = (positionRef.current.x + PLAYER_SIZE.x / 2) / map.tileSize;
      const pty = (positionRef.current.y + PLAYER_SIZE.y / 2) / map.tileSize;
      const here = getIslandAt(map, Math.floor(ptx), Math.floor(pty));
      if (here && here !== hereIslandRef.current) {
        hereIslandRef.current = here;
        setMusicIsland(here);
        reportVisit(here);
      }
      reportReach(ptx, pty);
      missionRefreshRef.current += 250;
      if (missionRefreshRef.current >= 2000) {
        missionRefreshRef.current = 0;
        refreshMissions(); // coins/kill counters + safety net for anything that changed the stats
        // Game completion (0-100%): HUD value + the one-time PLATINA celebration.
        const pr = computeProgress();
        setProgressPct((cur) => (cur === pr.percent ? cur : pr.percent));
        if (pr.platinum && !isPlatinumAnnounced()) {
          markPlatinumAnnounced();
          missionToastQueue.current.unshift(t('progress_platinum_toast'));
        }
      }
      if (!arrowOff) {
        const mid = getCurrentMissionId();
        let next: ArrowState | null = null;
        if (mid && here) {
          let best: { x: number; y: number } | null = null;
          let bestD = Infinity;
          for (const tg of getMissionTargets(mid)) {
            const d = Math.hypot(tg.x - ptx, tg.y - pty);
            if (d < bestD) {
              bestD = d;
              best = tg;
            }
          }
          if (best) {
            const tIsland = getIslandAt(map, best.x, best.y);
            let dest = best;
            let viaFerry = false;
            if (tIsland && tIsland !== here) {
              const stop = nearestStopOf(here, ptx, pty);
              if (stop) {
                dest = stop.anchor;
                viaFerry = true;
              }
            }
            const dist = Math.hypot(dest.x - ptx, dest.y - pty);
            if (dist > 4) next = { angle: Math.atan2(dest.y - pty, dest.x - ptx), dist, viaFerry };
          }
        }
        setArrow((prev) => {
          if (!next || !prev) return next;
          const same = Math.abs(prev.angle - next.angle) < 0.06 && Math.round(prev.dist) === Math.round(next.dist) && prev.viaFerry === next.viaFerry;
          return same ? prev : next;
        });
      }
    }

    // Nearby-NPC check, for the FALAR/TALK prompt.
    const px = positionRef.current.x + PLAYER_SIZE.x / 2;
    const py = positionRef.current.y + PLAYER_SIZE.y / 2;
    let closestNpc: NpcDef | null = null;
    let closestDist = INTERACT_RANGE;
    for (const placement of OUTDOOR_NPCS) {
      if (!isPlacementActive(placement)) continue; // NPC secreto fora de hora

      const pose = npcPose(placement);
      const nx = pose.x * map.tileSize + map.tileSize / 2;
      const ny = pose.y * map.tileSize + map.tileSize / 2;
      const d = Math.hypot(px - nx, py - ny);
      if (d < closestDist) {
        closestDist = d;
        closestNpc = NPCS[placement.npcId];
      }
    }
    if (closestNpc?.id !== nearbyNpc?.id) setNearbyNpc(closestNpc);

    // Nearby world boss, for the DESAFIAR button.
    let closeBoss: BossDef | null = null;
    for (const b of BOSSES) {
      if (!b.spot || isBossDefeated(b.id)) continue;
      const bx = b.spot.x * map.tileSize + map.tileSize / 2;
      const by = b.spot.y * map.tileSize + map.tileSize / 2;
      if (Math.hypot(px - bx, py - by) < INTERACT_RANGE + 20) {
        closeBoss = b;
        break;
      }
    }
    if (closeBoss?.id !== nearbyBoss?.id) setNearbyBoss(closeBoss);

    // Torre dos Desafios: botão ENTRAR perto da porta.
    const tdx = (TOWER.doorX + 0.5) * map.tileSize;
    const tdy = (TOWER.doorY + 1) * map.tileSize;
    const closeTower = Math.hypot(px - tdx, py - tdy) < map.tileSize * 3.2;
    if (closeTower !== nearTower) setNearTower(closeTower);

    // Pickup collection: auto-collect on walk-over, like classic RPG coins.
    for (const pickup of WORLD_PICKUPS) {
      if (isCollected(pickup.id)) continue;
      const pxk = pickup.x * map.tileSize + map.tileSize / 2;
      const pyk = pickup.y * map.tileSize + map.tileSize / 2;
      // Segredo: chegar perto do baú escondido ao lado da igreja revela a missão dele.
      if (pickup.id === 'bau_igreja' && Math.hypot(px - pxk, py - pyk) < map.tileSize * 9) setFlag('found:sec_bau');
      if (Math.hypot(px - pxk, py - pyk) < PICKUP_RANGE) {
        if (pickup.itemId && !pickup.coins && bagRoomFor(pickup.itemId, 1) < 1) {
          // Bag full or too heavy: leave it on the ground (no loss), say so now and then.
          if (Date.now() - bagFullAtRef.current > 3000) {
            bagFullAtRef.current = Date.now();
            showToast(t('bag_full'));
            tip('bag');
            playSfx('ui_denied');
          }
          continue;
        }
        markCollected(pickup.id);
        if (pickup.chest) playShortCutscene('chest:open');
        playSfx(pickup.coins ? 'coin' : 'use_item');
        haptic(pickup.coins ? 'light' : 'medium');
        if (pickup.coins) {
          const got = lootCoins(pickup.coins); // Mão Leve (Ninja): +35% de moedas
          addCoins(got);
          showToast(`+${got} ${CURRENCY_ABBR}`);
        } else if (pickup.itemId) {
          addItem(pickup.itemId, 1);
          showToast(itemName(pickup.itemId));
        }
        if (pickup.chest) {
          // Mão Leve (Ninja): chance de um item raro extra, só se couber na mochila (nunca perde nada).
          const bonus = lootBonusItem();
          if (bonus && bagRoomFor(bonus, 1) >= 1) {
            addItem(bonus, 1);
            setTimeout(() => showToast(`+ ${itemName(bonus)}`), 900);
          }
        }
        if (pickup.lorePiece) {
          const isNew = markLorePieceFound(pickup.lorePiece);
          if (isNew) {
            const allDone = allLorePiecesFound();
            setTimeout(() => {
              showToast(allDone ? combinedInscription() : '...');
            }, pickup.itemId || pickup.coins ? 1600 : 0);
            void allDone;
          }
        }
        refreshMissions(); // pickup-based missions complete from the collected set
        forcePickupRefresh((n) => n + 1);
      }
    }

    // ---- enemies: swing resolution, AI, contact damage, regen ----
    if (pendingAttackRef.current) {
      pendingAttackRef.current.delay -= dtMs;
      if (pendingAttackRef.current.delay <= 0) {
        const atk = pendingAttackRef.current;
        pendingAttackRef.current = null;
        resolveSwing(atk.type, px, py);
      }
    }
    invulnRef.current = Math.max(0, invulnRef.current - dtMs);
    sinceHurtRef.current += dtMs;
    const contacts = enemies.update(dtMs, { x: px, y: py }, jumpingRef.current);
    for (const c of contacts) {
      if (invulnRef.current > 0 || fighter.state === 'dash' || fighter.isKO) continue;
      invulnRef.current = 750;
      sinceHurtRef.current = 0;
      fighter.takeHit(c.damage * getGear().guardMult);
      noteDamage({ kind: 'entity', role: 'enemy', name: c.name }); // quem feriu por último é quem aparece no aviso de morte
      playSfx('player_hurt');
      haptic('heavy');
      // Small shove away from whatever hit us.
      const ax = px - c.fromX;
      const ay = py - c.fromY;
      const al = Math.hypot(ax, ay) || 1;
      positionRef.current = resolveMove(map, positionRef.current, PLAYER_SIZE, { x: (ax / al) * 16, y: (ay / al) * 16 }).position;
      playerX.value = positionRef.current.x;
      playerY.value = positionRef.current.y;
      setHurt(true);
      setTimeout(() => setHurt(false), 420);
    }
    healthPct.value = (fighter.health / fighter.maxHealth) * 100;
    energyPct.value = fighter.energy;
    if (fighter.isKO || fighter.health <= 0) {
      beginDowned();
      return;
    }
    // Slow natural recovery once nothing has hurt us for a while.
    if (sinceHurtRef.current > 4500 && fighter.health < fighter.maxHealth) {
      fighter.health = Math.min(fighter.maxHealth, fighter.health + 1.6 * dt);
      healthPct.value = (fighter.health / fighter.maxHealth) * 100;
    }
    setStoryHp(fighter.health / fighter.maxHealth); // a luta de história começa com ESTA vida

    const focus = { x: positionRef.current.x + PLAYER_SIZE.x / 2, y: positionRef.current.y + PLAYER_SIZE.y / 2 };
    const idealCamera = computeCameraPosition(map, focus, { width, height });
    const smoothing = 0.2;
    cameraX.value += (idealCamera.x - cameraX.value) * smoothing;
    cameraY.value += (idealCamera.y - cameraY.value) * smoothing;
  });

  const handleAttack = (type: 'flash' | 'strong' | 'ultimate') => {
    if (paused || interior || diveSite || sailRef.current || attacking || jumpingRef.current) return;
    const started = fighter.startAttack(type);
    if (!started) {
      // Only the ultimate can be refused here (needs a full energy bar) -
      // see Fighter.startAttack. Say so instead of a silent dead button.
      if (type === 'ultimate') showToast(t('world_no_energy'));
      return;
    }
    setAttacking(type);
    playSfx(type === 'flash' ? 'swing' : type === 'strong' ? 'slash' : 'charge');
    haptic(type === 'ultimate' ? 'medium' : 'light');
    attackTimerRef.current = ATTACK_ANIM_MS;
    // The blow lands a moment into the swing (enemies are hit in the loop).
    pendingAttackRef.current = { type, delay: 95 };
    setSwingPhase('windup');
    setTimeout(() => setSwingPhase('swing'), 95);
  };

  /** Applies a swing to the enemies in front of the player and pays out drops. */
  const resolveSwing = (type: PlayerAttackType, cx: number, cy: number) => {
    const def = fighter.attackDefFor(type);
    const gear = getGear();
    // Mesma conta do VERSUS: dano aleatorio na faixa do golpe + critico (base 5% + habilidades + arma afiada).
    const roll = rollHit({ base: fighter[def.damageKey] * gear.damageMult, type, critChance: fighter.critChance + gear.critChance, critMult: fighter.critMult });
    const res = enemies.playerAttack(cx, cy, facingRef.current, type, roll.damage);
    if (res.hits > 0) {
      fighter.gainEnergy(def.energyGain);
      playSfx(type === 'flash' && !roll.crit ? 'hit_flesh' : 'hit_heavy', { minGapMs: 60 });
      haptic(type === 'flash' ? 'light' : 'medium');
    }
    if (res.kills.length > 0) {
      playSfx('enemy_death');
      haptic('medium');
      let coins = 0;
      let xp = 0;
      const names: string[] = [];
      for (const k of res.kills) {
        reportKill(k.type);
        if (k.eliteId) {
          // Elite (Parte 2.3): o prêmio da 1ª derrota é um item já existente; o aviso usa texto traduzido.
          names.push(t('elite_defeated'));
          if (markEliteDefeated(k.eliteId) && k.firstDrop) {
            if (addItem(k.firstDrop.id, k.firstDrop.n, true) > 0) names.push(`${itemName(k.firstDrop.id)} ×${k.firstDrop.n}`);
          }
        }
        coins += k.coins;
        xp += k.xp;
        if (k.itemId) {
          if (addItem(k.itemId, 1) > 0) names.push(itemName(k.itemId));
          else names.push(t('bag_full'));
        }
      }
      addCoins(coins);
      addXp(xp);
      showToast(`+${coins} ${CURRENCY_ABBR}  ·  +${xp} XP${names.length ? '  ·  ' + names.join(', ') : ''}`);
    }
  };

  /** Vida zerada: congela o mundo e mostra a tela de derrota (a escolha acontece nela). */
  const beginDowned = () => {
    if (downedRef.current) return;
    downedRef.current = true;
    attackTimerRef.current = 0;
    pendingAttackRef.current = null;
    setAttacking(null);
    setSwingPhase(undefined);
    setDowned(true);
  };

  /** Teletransporta o jogador (câmera e blocos do mapa junto) e o deixa de pé com `hpFrac` da vida. */
  const wakeAt = (sp: { x: number; y: number }, hpFrac: number) => {
    fighter.isKO = false;
    fighter.health = Math.max(1, hpFrac * fighter.maxHealth);
    setStoryHp(hpFrac);
    fighter.hitstunTimer = 0;
    fighter.currentAttack = null;
    fighter.setState('idle');
    pendingAttackRef.current = null;
    setAttacking(null);
    setSwingPhase(undefined);
    positionRef.current = { ...sp };
    playerX.value = sp.x;
    playerY.value = sp.y;
    const cx = Math.floor(sp.x / map.tileSize / CHUNK_SIZE);
    const cy = Math.floor(sp.y / map.tileSize / CHUNK_SIZE);
    currentChunkRef.current = { cx, cy };
    setChunkPos({ cx, cy });
    setActiveChunks(chunkListAround(cx, cy));
    const ideal = computeCameraPosition(map, { x: sp.x + PLAYER_SIZE.x / 2, y: sp.y + PLAYER_SIZE.y / 2 }, { width, height });
    cameraX.value = ideal.x;
    cameraY.value = ideal.y;
    healthPct.value = (fighter.health / fighter.maxHealth) * 100;
    energyPct.value = fighter.energy;
    invulnRef.current = 1500;
    sinceHurtRef.current = 0;
    enemies.calmDown();
    clearDamageCause();
  };

  /** Onde a derrota leva: o último cais em que desembarcou (checkpoint) ou, sem nenhum ainda, a vila. */
  const checkpointPos = () => {
    const c = getCheckpoint();
    return c ? { x: c.x, y: c.y } : spawnWorldPos();
  };

  /** Reviver (Diamond Meme): vida cheia, no MESMO lugar e estado. O personagem volta no pico do clarão. */
  const handleRevive = () => payRevive();
  const handleRevived = () => {
    fighter.revive();
    fighter.setState('idle');
    setStoryHp(1);
    healthPct.value = 100;
    invulnRef.current = 1500;
    sinceHurtRef.current = 0;
    enemies.calmDown();
    clearDamageCause();
    downedRef.current = false;
    setDowned(false);
  };
  /** Derrota aceita: paga a taxa (o saldo pode ficar negativo) e acorda no checkpoint com metade da vida. */
  const handleDeclineDeath = () => {
    const { fee, balance } = payDeathFee();
    wakeAt(checkpointPos(), FAINT_HP);
    downedRef.current = false;
    setDowned(false);
    showToast(`${t('world_fainted')}  -${fee} ${CURRENCY_ABBR}${balance < 0 ? `  (${t('death_debt')})` : ''}`);
  };

  /** Story-mode jump: a quick hop (sprite rises then lands) with a shadow
   * that shrinks as it rises. There's no combat/hazard system in the
   * overworld yet, so for now this is movement flavour - it can't be
   * mashed (short cooldown) and can't overlap an attack. */
  const handleJump = () => {
    if (paused || interior || diveSite || sailRef.current || attacking || jumpingRef.current) return;
    if (!isAreaSolid(map, { x: positionRef.current.x, y: positionRef.current.y, width: PLAYER_SIZE.x, height: PLAYER_SIZE.y })) lastSafeRef.current = positionRef.current;
    jumpingRef.current = true;
    setJumpReady(false);
    jumpY.value = withSequence(withTiming(-JUMP_HEIGHT, { duration: JUMP_MS * 0.42 }), withTiming(0, { duration: JUMP_MS * 0.58 }));
    setTimeout(() => {
      jumpingRef.current = false;
      // pousou dentro de uma pedra/árvore (passou por cima)? vai para o chão livre mais perto, olhando para a frente
      const land = landFromJump(map, positionRef.current, PLAYER_SIZE, lastMoveRef.current, lastSafeRef.current);
      if (land !== positionRef.current) {
        positionRef.current = land;
        playerX.value = land.x;
        playerY.value = land.y;
      }
    }, JUMP_MS);
    setTimeout(() => setJumpReady(true), JUMP_MS + JUMP_COOLDOWN_MS);
  };
  const handleShield = (on: boolean) => {
    if (paused || interior || diveSite || sailRef.current) return;
    if (on) fighter.startShield();
    else fighter.stopShield();
    setShielding(fighter.isShielding);
  };

  const [worldFx, setWorldFx] = useState<{ id: number; name: EffectName } | null>(null);
  const [itemMenuOpen, setItemMenuOpen] = useState(false);
  bootingRef.current = booting;
  cutsceneGateRef.current = !booting && worldFocused && !paused && !downed && !interior && !diveSite && !ferryOpen && !sail && !itemMenuOpen && !dialogueNpc && !choiceNpc && !questOffer && !bossOffer;
  const handleUseItem = (slot: 0 | 1) => {
    if (paused || interior || diveSite || sailRef.current) return;
    const equippedId = getEquippedItems()[slot];
    if (isGear(equippedId)) {
      // Weapons/shield are worn, not spent: the bonus is already active.
      setItemMenuOpen(false);
      showToast(t('gear_passive'));
      return;
    }
    if (equippedId && needsTarget(equippedId)) {
      showToast(t('item_battle_only'));
      return;
    }
    const id = consumeEquippedItem(slot);
    if (!id) return;
    applyItemEffect(fighter, id);
    playSfx(ITEMS[id]?.effects.some((e) => e.kind === 'heal') ? 'heal' : 'buff_atk');
    haptic('light');
    healthPct.value = (fighter.health / fighter.maxHealth) * 100;
    energyPct.value = fighter.energy;
    setItemMenuOpen(false);
    setWorldFx({ id: Date.now(), name: itemEffectName(id) as EffectName });
    showToast(itemName(id));
  };

  const handleAura = (on: boolean) => {
    if (paused || interior || diveSite || sailRef.current) return;
    if (on) fighter.startCharge();
    else fighter.stopCharge();
    setCharging(fighter.isCharging);
  };

  /** The player boards the boat at the current dock and sails to `dest` along a water route. */
  const handleFerryDepart = (dest: IslandId) => {
    const origin = dockHereRef.current;
    if (!origin || !FERRY_DOCKS[origin]) {
      handleFerryArrive(dest);
      return;
    }
    const a = FERRY_DOCKS[origin].boat;
    const b = FERRY_DOCKS[dest].boat;
    const pts = findSeaRoute(map, { x: a.x + 0.5, y: a.y + 0.5 }, { x: b.x + 0.5, y: b.y + 0.5 });
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const total = routeLength(pts);
    // 7-18 s depending on distance (the brief asked for 5-20 s).
    const dur = Math.min(18000, Math.max(7000, (total / 45) * 1000));
    const dir: BoatDir = Math.abs(pts[1].x - pts[0].x) > Math.abs(pts[1].y - pts[0].y) ? (pts[1].x > pts[0].x ? 'right' : 'left') : pts[1].y > pts[0].y ? 'down' : 'up';
    sailRef.current = { pts, cum, total, t: 0, dur, dest, dir, frameT: 0, chunkKey: '' };
    playSfx('water');
    // Hide the moored boat that is leaving, put the player on board.
    const px = pts[0].x * map.tileSize - PLAYER_SIZE.x / 2;
    const py = pts[0].y * map.tileSize - PLAYER_SIZE.y / 2;
    positionRef.current = { x: px, y: py };
    playerX.value = px;
    playerY.value = py;
    fighter.stopCharge();
    setCharging(false);
    setFerryOpen(false);
    setSail({ origin, dest, dir, frame: 0 });
  };

  /** One frame of the boat trip: slide along the route (eased), keep the camera/terrain on the boat, arrive at the end. */
  const stepSail = (dtMs: number) => {
    const s = sailRef.current;
    if (!s) return;
    s.t += dtMs;
    const u = Math.min(1, s.t / s.dur);
    const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    const d = e * s.total;
    let seg = 1;
    while (seg < s.pts.length - 1 && s.cum[seg] < d) seg++;
    const a = s.pts[seg - 1];
    const b = s.pts[seg];
    const len = s.cum[seg] - s.cum[seg - 1] || 1;
    const f = Math.min(1, Math.max(0, (d - s.cum[seg - 1]) / len));
    const x = a.x + (b.x - a.x) * f;
    const y = a.y + (b.y - a.y) * f;
    const ts = map.tileSize;
    positionRef.current = { x: x * ts - PLAYER_SIZE.x / 2, y: y * ts - PLAYER_SIZE.y / 2 };
    playerX.value = positionRef.current.x;
    playerY.value = positionRef.current.y;
    const ideal = computeCameraPosition(map, { x: x * ts, y: y * ts }, { width, height });
    cameraX.value = ideal.x;
    cameraY.value = ideal.y;

    // Terrain: the chunks around the boat AND a bit ahead of it (it moves fast).
    const hx = b.x - a.x;
    const hy = b.y - a.y;
    const hl = Math.hypot(hx, hy) || 1;
    const ahead = { x: x + (hx / hl) * 40, y: y + (hy / hl) * 40 };
    const c0 = { cx: Math.floor(x / CHUNK_SIZE), cy: Math.floor(y / CHUNK_SIZE) };
    const c1 = { cx: Math.floor(ahead.x / CHUNK_SIZE), cy: Math.floor(ahead.y / CHUNK_SIZE) };
    const key = `${c0.cx},${c0.cy},${c1.cx},${c1.cy}`;
    if (key !== s.chunkKey) {
      s.chunkKey = key;
      const seen = new Set<string>();
      const list: ChunkCoord[] = [];
      for (const c of [c0, c1]) {
        for (const ch of chunkListAround(c.cx, c.cy)) {
          const k = `${ch.cx},${ch.cy}`;
          if (!seen.has(k)) {
            seen.add(k);
            list.push(ch);
          }
        }
      }
      currentChunkRef.current = c0;
      setActiveChunks(list);
      setChunkPos(c0);
    }

    // Heading + wave frames.
    const dir: BoatDir = Math.abs(hx) > Math.abs(hy) ? (hx > 0 ? 'right' : 'left') : hy > 0 ? 'down' : 'up';
    s.frameT += dtMs;
    if (dir !== s.dir || s.frameT >= 160) {
      const advance = s.frameT >= 160;
      if (advance) s.frameT = 0;
      s.dir = dir;
      setSail((cur) => (cur ? { ...cur, dir, frame: advance ? (cur.frame + 1) % BOAT_FRAMES.length : cur.frame } : cur));
    }

    if (u >= 1) {
      const dest = s.dest;
      sailRef.current = null;
      setSail(null);
      handleFerryArrive(dest);
    }
  };

  /** Põe o jogador num tile do mundo (câmera e terreno ao redor incluídos). Usado ao emergir do mergulho. */
  const teleportToTile = (tx: number, ty: number) => {
    const px = tx * map.tileSize;
    const py = ty * map.tileSize;
    positionRef.current = { x: px, y: py };
    const idealCamera = computeCameraPosition(map, { x: px + PLAYER_SIZE.x / 2, y: py + PLAYER_SIZE.y / 2 }, { width, height });
    cameraX.value = idealCamera.x;
    cameraY.value = idealCamera.y;
    playerX.value = px;
    playerY.value = py;
    const ccx = Math.floor(tx / CHUNK_SIZE);
    const ccy = Math.floor(ty / CHUNK_SIZE);
    currentChunkRef.current = { cx: ccx, cy: ccy };
    setActiveChunks(chunkListAround(ccx, ccy));
    setChunkPos({ cx: ccx, cy: ccy });
    invulnRef.current = 1200;
  };

  const handleFerryArrive = (island: IslandId) => {
    const anchor = FERRY_DOCKS[island].anchor;
    const px = anchor.x * map.tileSize;
    const py = anchor.y * map.tileSize;
    setCheckpoint({ x: px, y: py }); // o cais onde desembarcou vira o checkpoint
    positionRef.current = { x: px, y: py };
    const idealCamera = computeCameraPosition(map, { x: px + PLAYER_SIZE.x / 2, y: py + PLAYER_SIZE.y / 2 }, { width, height });
    cameraX.value = idealCamera.x;
    cameraY.value = idealCamera.y;
    playerX.value = px;
    playerY.value = py;
    // Load the terrain around the landing: chunks are normally refreshed only while walking.
    const ccx = Math.floor(px / map.tileSize / CHUNK_SIZE);
    const ccy = Math.floor(py / map.tileSize / CHUNK_SIZE);
    currentChunkRef.current = { cx: ccx, cy: ccy };
    setActiveChunks(chunkListAround(ccx, ccy));
    setChunkPos({ cx: ccx, cy: ccy });
    setFerryOpen(false);
  };

  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -cameraX.value }, { translateY: -cameraY.value }],
  }));
  const playerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: playerX.value + bumpX.value }, { translateY: playerY.value + bumpY.value + jumpY.value }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: playerX.value }, { translateY: playerY.value }, { scaleX: 1 + jumpY.value / (JUMP_HEIGHT * 2.2) }],
    opacity: 0.35 + jumpY.value / (JUMP_HEIGHT * 4),
  }));
  const healthBarStyle = useAnimatedStyle(() => ({ width: `${healthPct.value}%` }));
  const energyBarStyle = useAnimatedStyle(() => ({ width: `${energyPct.value}%` }));

  // Pose atual do corpo + cosméticos (skin troca o sprite; capa fica atrás e chapéu por cima).
  const worldChar = getStoryCharacter(getStoryCharacterId()).fighter;
  const { equipped: cosEq } = useCosmetics();
  const wears = canWearCosmetics(worldChar);
  useEffect(() => {
    preloadBodySprites(worldChar, wears ? cosEq.skin : null);
  }, [worldChar, wears, cosEq.skin]);
  const poseKey = attacking ? (attacking === 'ultimate' ? 'dash' : attacking) : charging && hasPose(worldChar, 'charge') ? 'charge' : playerState === 'walking' ? `walk${frameIndex + 1}` : 'idle';
  const sprite = getBodySprite(worldChar, poseKey, wears ? cosEq.skin : null);
  const BOX_W = PLAYER_SIZE.x * 1.9;
  const BOX_H = PLAYER_SIZE.y * 1.7;
  const poseAspect = SPRITE_ASPECTS[worldChar][poseKey] ?? 1;
  const poseW = poseAspect > BOX_W / BOX_H ? BOX_W : BOX_H * poseAspect;
  const poseH = poseAspect > BOX_W / BOX_H ? BOX_W / poseAspect : BOX_H;
  const poseBox = { left: (PLAYER_SIZE.x - BOX_W) / 2 + (BOX_W - poseW) / 2, top: PLAYER_SIZE.y - BOX_H + (BOX_H - poseH) / 2, width: poseW, height: poseH };
  const faceDir: 1 | -1 = facing === 'left' ? -1 : 1;

  // Held weapon / shield, pinned to the hand of the sprite frame being shown.
  let heldGear: React.ReactNode = null;
  {
    const g = getGear();
    const hand = getHandAnchor(worldChar, poseKey);
    if ((g.weapon || g.shield) && hand) {
      heldGear = (
        <HeldGear
          weapon={g.weapon}
          shield={g.shield}
          box={poseBox}
          hand={hand}
          charH={BOX_H}
          dir={faceDir}
          poseKey={poseKey}
          phase={attacking === 'ultimate' ? undefined : swingPhase}
        />
      );
    }
  }

  if (booting) {
    // Save-load in flight (see the effect above) - a blank/backdrop-only
    // frame for what's normally a couple dozen ms, rather than a flash of
    // the player standing at spawn before jumping to the saved position.
    return (
      <View style={[styles.root, styles.bootWrap]}>
        <Text style={styles.bootText}>...</Text>
      </View>
    );
  }

  if (diveSite) {
    return (
      <DiveOverlay
        startTile={diveSite.start}
        startDock={diveSite.dock}
        fighter={fighter}
        onSurface={(landing) => {
          const dest = landing ?? diveSite.from; // sem chão por perto: volta ao ponto de onde mergulhou
          setDiveSite(null);
          teleportToTile(dest.x, dest.y);
        }}
        onDowned={() => {
          setDiveSite(null);
          beginDowned(); // mesma tela de derrota de sempre; a causa (afogamento etc.) já foi registrada
        }}
        onBossFight={(bossId) => {
          setDiveSite(null);
          router.push({ pathname: '/battle', params: { p1: getStoryCharacter(getStoryCharacterId()).fighter, p2Control: 'cpu', bossId } } as never);
        }}
      />
    );
  }

  if (interior) {
    const leaveInterior = () => {
      positionRef.current = { ...interior.returnPos };
      playerX.value = interior.returnPos.x;
      playerY.value = interior.returnPos.y;
      setInterior(null);
    };
    // O cassino é uma sala gigante própria (câmera que rola), não a sala 9x7 das outras casas.
    if (interior.buildingId === CASINO_BUILDING_ID) return <CasinoInterior onExit={leaveInterior} />;
    return <InteriorOverlay buildingId={interior.buildingId} onExit={leaveInterior} />;
  }

  const visiblePickups: PickupDef[] = WORLD_PICKUPS.filter((p) => !isCollected(p.id));

  return (
    <View style={styles.root}>
      <View style={[styles.viewport, { width, height }, sail && { backgroundColor: '#3a7bc4' }]}>
        <Animated.View style={worldStyle}>
          <TileMapRenderer map={map} activeChunks={activeChunks} />

          {BUILDING_RECTS.map((b, i) => (
            <View key={b.id} style={{ position: 'absolute', left: b.x0 * map.tileSize, top: b.y0 * map.tileSize }}>
              <BuildingSprite width={(b.x1 - b.x0 + 1) * map.tileSize} height={(b.y1 - b.y0 + 1) * map.tileSize} type={b.type} buildingId={b.id} tileSize={map.tileSize} variant={i} />
            </View>
          ))}

          <SceneryLayer tileSize={map.tileSize} />
          <View style={{ position: 'absolute', left: TOWER.rect.x0 * map.tileSize, top: TOWER.rect.y0 * map.tileSize }}>
            <TowerSprite width={(TOWER.rect.x1 - TOWER.rect.x0 + 1) * map.tileSize} height={(TOWER.rect.y1 - TOWER.rect.y0 + 1) * map.tileSize} />
          </View>

          <FerryBoats tileSize={map.tileSize} hidden={sail?.origin ?? null} />

          <OutdoorNpcs tileSize={map.tileSize} markerSize={NPC_MARKER_SIZE} />

          <BossMarkers tileSize={map.tileSize} />

          <EnemyLayer manager={enemies} />

          {visiblePickups.map((p) => (
            <View key={p.id} style={[styles.pickupMarker, { left: p.x * map.tileSize - 12, top: p.y * map.tileSize - 12 }]}>
              <GameIcon name={p.coins ? 'coin' : 'gift'} size={22} />
            </View>
          ))}

          <Animated.View pointerEvents="none" style={[styles.jumpShadow, shadowStyle, sail && styles.hiddenWhileSailing]} />

          {sail && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sailBoat,
                { left: PLAYER_SIZE.x / 2 - boatSize(sail.dir).w / 2, top: PLAYER_SIZE.y / 2 - boatSize(sail.dir).h / 2, width: boatSize(sail.dir).w, height: boatSize(sail.dir).h },
                playerStyle,
              ]}
            >
              <BoatImage dir={sail.dir} frame={sail.frame} />
            </Animated.View>
          )}

          <Animated.View style={[styles.player, playerStyle, sail && styles.hiddenWhileSailing]}>
            {shielding && <ShieldGif cx={PLAYER_SIZE.x / 2} cy={PLAYER_SIZE.y / 2} size={Math.max(PLAYER_SIZE.x * 1.9, PLAYER_SIZE.y * 1.7) * 1.1} />}
            {/* Aura igual à da luta: com pose de carregar, o sprite muda; sem ela, o brilho procedural do tamanho do corpo */}
            {charging && !hasPose(worldChar, 'charge') && <AuraEffect active={charging} width={PLAYER_SIZE.x * 1.9} height={PLAYER_SIZE.y * 1.7} />}
            {wears && <CapeLayer characterKey={worldChar} poseKey={poseKey} box={poseBox} dir={faceDir} cosmeticId={cosEq.cape} />}
            <Image
              source={sprite}
              resizeMode="contain"
              style={[styles.sprite, { width: PLAYER_SIZE.x * 1.9, height: PLAYER_SIZE.y * 1.7, opacity: hurt ? 0.55 : 1 }, facing === 'left' && styles.flip]}
            />
            {wears && <HatLayer characterKey={worldChar} poseKey={poseKey} box={poseBox} dir={faceDir} cosmeticId={cosEq.hat} />}
            {heldGear}
          </Animated.View>
        </Animated.View>
        {settings.weatherParticles && <WeatherLayer width={width} height={height} weather={weather} flashKey={flashKey} paused={paused} intensity={settings.lightMode ? 0.3 : 1} />}
        {settings.nightDarkening && <NightLayer width={width} height={height} cx={width / 2} cy={height / 2 - 10} />}
        <Animated.View pointerEvents="none" style={[worldStyle, { position: 'absolute', left: 0, top: 0 }]}>
          <LightsLayer tileSize={map.tileSize} />
        </Animated.View>
      </View>

      {!sail && <ClockPill top={insets.top + 8} weather={weather} />}

      {/* INTERFACE DO MODO HISTÓRIA (layout novo): vida e energia com a arte do jogo, MISSÃO logo abaixo, pausa no centro, mapa com moedas e diamantes à direita */}
      <View pointerEvents="none" style={[styles.hud, { top: insets.top + 10, left: insets.left + 14 }]} testID="story-hud">
        <HudBar art="bar_red" width={190} height={14} fillStyle={healthBarStyle} testID="hud-health" />
        <View style={{ height: 5 }} />
        <HudBar art="bar_blue" width={166} height={9} fillStyle={energyBarStyle} testID="hud-energy" />
        <View style={styles.xpRow}>
          <Text style={styles.xpLevel}>Nv.{level}</Text>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${xpNeeded > 0 ? Math.min(100, (xp / xpNeeded) * 100) : 100}%` }]} />
          </View>
          {statPoints > 0 && <Text style={styles.xpPoints}>+{statPoints}</Text>}
          <IconLabel icon="trophy" size={12} gap={3} textStyle={styles.xpTrophy}>{`${progressPct}%`}</IconLabel>
        </View>
        {savedFlash && (
          <IconLabel icon="disk" size={14} style={{ marginTop: 4 }} textStyle={styles.savedFlash}>
            {t('autosave_toast')}
          </IconLabel>
        )}
      </View>

      <MissionHud top={insets.top + 74} left={insets.left + 12} />
      {!arrowOff && !interior && <MissionArrow arrow={arrow} cx={width / 2} cy={height / 2 - 10} />}

      {sail && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />
          <View style={[styles.sailBanner, { top: insets.top + 14 }]} pointerEvents="none">
            <IconLabel icon="boat" size={18} gap={8} style={styles.sailBannerBox} textStyle={styles.sailBannerTextPlain}>
              {t('ferry_sailing')}
            </IconLabel>
          </View>
          <Pressable
            style={[styles.sailSkip, { bottom: insets.bottom + 18 }]}
            onPress={() => {
              if (sailRef.current) sailRef.current.t = sailRef.current.dur;
            }}
          >
            <Text style={styles.sailSkipText}>{t('ferry_skip')}</Text>
          </Pressable>
        </View>
      )}

      <PauseButton
        onPress={() => {
          pausedRef.current = true;
          setGamePaused(true);
          setPaused(true);
        }}
      />

      <View style={[styles.minimapWrap, { top: insets.top + 12, right: insets.right + 16 }]}>
        {!arrowOff && <Minimap playerChunkX={chunkPos.cx} playerChunkY={chunkPos.cy} />}
        {/* moedas e diamantes logo abaixo do mapa */}
        <View pointerEvents="none" style={styles.currencyCol}>
          <CurrencyPill kind="coin" value={coins} testID="hud-coins" />
          <CurrencyPill kind="gem" value={account.diamonds} testID="hud-gems" />
        </View>
      </View>

      {nearTower && !nearbyBoss && !paused && !dialogueNpc && !bossOffer && !interior && (
        <Pressable style={[styles.interactBtn, styles.towerBtn, { bottom: insets.bottom + 248 }]} onPress={() => router.push('/tower' as never)}>
          <IconLabel icon="tower" size={18} textStyle={styles.interactLabel}>{t('tower_enter')}</IconLabel>
        </Pressable>
      )}

      {nearbyBoss && !paused && !dialogueNpc && !bossOffer && (
        <Pressable style={[styles.interactBtn, styles.bossBtn, { bottom: insets.bottom + 248 }]} onPress={() => setBossOffer(nearbyBoss)}>
          <IconLabel icon="swords" size={16} textStyle={[styles.interactLabel, { color: '#ff7a6a' }]}>{t('boss_challenge')}</IconLabel>
        </Pressable>
      )}

      {nearbyNpc?.id === 'rival' && getQuestStatus('rival_battle') === 'completed' && !paused && !dialogueNpc && (
        <Pressable
          style={[styles.interactBtn, styles.bossBtn, { bottom: insets.bottom + 248 }]}
          onPress={() =>
            router.push({ pathname: '/battle', params: { p1: getStoryCharacter(getStoryCharacterId()).fighter, p2Control: 'cpu', rival: rivalEnc ? getRivalEncounterParam(rivalEnc.n) : '1' } } as never)
          }
        >
          <IconLabel icon="swords" size={16} textStyle={[styles.interactLabel, { color: '#ff7a6a' }]}>{rivalEnc ? t('rival_challenge').replace('{n}', String(rivalEnc.n)) : t('rival_rematch')}</IconLabel>
        </Pressable>
      )}

      {nearbyNpc && !paused && !choiceNpc && (
        <Pressable
          style={[styles.interactBtn, { bottom: insets.bottom + 200 }]}
          onPress={() => {
            const ch = pendingChoiceFor(nearbyNpc.id);
            if (ch) setChoiceNpc({ npc: nearbyNpc, choice: ch });
            else setDialogueNpc(resolveNpcDialogue(nearbyNpc));
          }}
        >
          <Text style={styles.interactLabel}>{t('interact_talk')}</Text>
        </Pressable>
      )}

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <DPad onPress={handleDirPress} />

      {diveStart && !interior && (
        <Pressable
          style={[styles.ferryBtn, { top: insets.top + 100 }]}
          testID="dive-enter"
          onPress={() => {
            const px = positionRef.current.x + PLAYER_SIZE.x / 2;
            const py = positionRef.current.y + PLAYER_SIZE.y / 2;
            const from = { x: Math.floor(px / map.tileSize), y: Math.floor(py / map.tileSize) };
            fighter.stopCharge();
            setCharging(false);
            // A cutscene de mergulho roda dentro da cena (descida) e o jogador começa na água mais próxima de onde estava.
            setDiveSite({ start: diveStart, dock: islandNear(from.x, from.y), from });
          }}
        >
          <IconLabel icon="bubble" size={16} textStyle={styles.ferryBtnText}>{t('dive_enter')}</IconLabel>
        </Pressable>
      )}

      {dockHere && !interior && (
        <Pressable style={[styles.ferryBtn, { top: insets.top + 60 }]} onPress={() => setFerryOpen(true)}>
          <IconLabel icon="boat" size={16} textStyle={styles.ferryBtnText}>{t('ferry_call')}</IconLabel>
        </Pressable>
      )}

      <ActionCluster
        jumpReady={jumpReady}
        onJump={handleJump}
        onStrong={() => handleAttack('strong')}
        onSuper={() => handleAttack('ultimate')}
        onFlash={() => handleAttack('flash')}
        onShieldChange={handleShield}
        onAuraChange={handleAura}
        onItemMenu={() => setItemMenuOpen((v) => !v)}
      />
      {worldFx && !interior && (
        // The camera keeps the player centred, so the screen centre IS the player.
        <SpriteEffect key={worldFx.id} name={worldFx.name} x={width / 2} y={height / 2 - 10} size={150} onDone={() => setWorldFx(null)} />
      )}
      <EquipMenu
        visible={itemMenuOpen && !paused && !interior}
        onClose={() => setItemMenuOpen(false)}
        onUse={handleUseItem}
        anchor={itemAnchor}
      />

      {downed && (
        <DefeatOverlay
          fee={currentDeathFee()}
          coins={coins}
          diamonds={account.diamonds}
          reviveCost={REVIVE_COST}
          declineLabel={t('death_checkpoint')}
          cause={describeDeath(lastDamageCause(), t)}
          onRevive={handleRevive}
          onRevived={handleRevived}
          onDecline={handleDeclineDeath}
        />
      )}

      <PauseMenu
        visible={paused && worldFocused}
        onResume={() => {
          pausedRef.current = false;
          setGamePaused(false);
          setPaused(false);
        }}
        onSave={doSave}
        onExit={() => {
          pausedRef.current = false;
          setGamePaused(false);
          setPaused(false);
          // Back to the main menu: drop the whole world/battle stack so
          // starting another world later never sees a stale world screen.
          try {
            router.dismissAll();
          } catch {
            router.replace('/');
          }
        }}
      />

      {ferryOpen && (
        <View style={StyleSheet.absoluteFill}>
          <FerryOverlay current={dockHere} onClose={() => setFerryOpen(false)} onDepart={handleFerryDepart} />
        </View>
      )}

      {choiceNpc && (
        <ChoiceOverlay
          npc={choiceNpc.npc}
          choice={choiceNpc.choice}
          onFinish={() => {
            const n = choiceNpc.npc;
            setChoiceNpc(null);
            reportTalk(n.id);
          }}
        />
      )}

      {dialogueNpc && (
        <DialogueOverlay
          npc={dialogueNpc}
          onFinish={() => {
            const npc = dialogueNpc;
            if (npc.giftItemId && !isCollected(`gift_${npc.id}`)) {
              addItem(npc.giftItemId, 1, true);
              markCollected(`gift_${npc.id}`);
              showToast(itemName(npc.giftItemId));
            }
            setDialogueNpc(null);
            // Offer first (before the "talked to" report can complete anything), then count the conversation.
            const q = getNpcQuest(npc.id);
            if (q && q.def.objective.kind === 'battle' && (q.status === 'unstarted' || q.status === 'active' || q.status === 'offered')) {
              setQuestOffer({ npc, questId: q.id });
            }
            reportTalk(npc.id);
            if (npc.id === 'barqueiro' && dockHereRef.current) setFerryOpen(true);
          }}
        />
      )}

      {bossOffer && (
        <QuestOfferPrompt
          title={`${bossOffer.name}\n${t('boss_level_hint')} ${bossOffer.level}${BOSS_LORE[bossOffer.id] ? `\n${BOSS_LORE[bossOffer.id]}` : ''}`}
          onAccept={() => {
            const b = bossOffer;
            setBossOffer(null);
            router.push({ pathname: '/battle', params: { p1: getStoryCharacter(getStoryCharacterId()).fighter, p2Control: 'cpu', bossId: b.id } } as never);
          }}
          onDecline={() => setBossOffer(null)}
        />
      )}

      {questOffer && (
        <QuestOfferPrompt
          title={t(QUEST_BATTLE_DEFS[questOffer.questId]?.offerTitleKey ?? 'quest_rival_offer').replace('{n}', String(siegeWavesFor(getStoryDifficulty())))}
          onAccept={() => {
            const { questId } = questOffer;
            const def = QUEST_BATTLE_DEFS[questId];
            setQuestOffer(null);
            setQuestStatus(questId, 'active');
            // Cerco dos orcs: várias batalhas seguidas (3 a 6 pela dificuldade); a onda 1 começa já.
            const siege = def?.siege ? startSiege(questId, getStoryDifficulty()) : null;
            router.push({
              pathname: '/battle',
              params: { p1: getStoryCharacter(getStoryCharacterId()).fighter, p2: def?.opponent ?? 'gadigago', p2Control: 'cpu', stageKey: def?.stageKey ?? 'stage_1', questId, ...(siege ? { siegeWave: String(siege.wave), siegeTotal: String(siege.total) } : {}) },
            });
          }}
          onDecline={() => setQuestOffer(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a12' },
  bootWrap: { alignItems: 'center', justifyContent: 'center' },
  bootText: { color: '#FFD700', fontSize: 20, fontWeight: '700', letterSpacing: 4 },
  viewport: { overflow: 'hidden' },
  player: { position: 'absolute', width: PLAYER_SIZE.x, height: PLAYER_SIZE.y, alignItems: 'center' },
  jumpShadow: { position: 'absolute', left: 2, top: PLAYER_SIZE.y - 6, width: PLAYER_SIZE.x - 4, height: 9, borderRadius: 6, backgroundColor: '#000' },
  sprite: { position: 'absolute', bottom: 0 },
  flip: { transform: [{ scaleX: -1 }] },
  hud: { position: 'absolute', width: 200 },
  hiddenWhileSailing: { opacity: 0 },
  sailBoat: { position: 'absolute' },
  sailBanner: { position: 'absolute', alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  sailBannerBox: { backgroundColor: 'rgba(10,20,40,0.65)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  sailBannerTextPlain: { color: '#fff', fontWeight: '800', fontSize: 15 },
  sailBannerText: { color: '#fff', fontWeight: '800', fontSize: 15, backgroundColor: 'rgba(10,20,40,0.65)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  sailSkip: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(10,20,40,0.7)', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 7 },
  sailSkipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  xpLevel: { color: '#9be89b', fontWeight: '800', fontSize: 11, textShadowColor: '#000', textShadowRadius: 3 },
  xpTrack: { width: 90, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: '#4ade80' },
  xpTrophy: { color: '#FFD700', fontWeight: '800', fontSize: 10, textShadowColor: '#000', textShadowRadius: 3 },
  xpPoints: { color: '#7fa8ff', fontWeight: '800', fontSize: 11, textShadowColor: '#000', textShadowRadius: 3 },
  hudText: { color: '#FFD700', fontWeight: '700', fontSize: 16, textShadowColor: '#000', textShadowRadius: 4, marginBottom: 4 },
  barTrack: {
    width: 180,
    height: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    marginTop: 3,
  },
  energyTrack: { height: 7 },
  barFill: { height: '100%' },
  coinPill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,215,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  coinText: { color: '#FFD700', fontWeight: '700', fontSize: 13 },
  minimapWrap: { position: 'absolute', alignItems: 'flex-end' },
  currencyCol: { flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'center' },
  npcSlot: { position: 'absolute', alignItems: 'center' },
  pickupMarker: { position: 'absolute', width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  pickupIcon: { fontSize: 20 },
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
  towerBtn: { width: 150, marginLeft: -75 },
  bossBtn: { borderColor: '#ff7a6a', width: 150, marginLeft: -75 },
  interactLabel: { color: '#FFD700', fontWeight: '800', fontSize: 13 },
  savedFlash: { color: '#9be89b', fontWeight: '800', fontSize: 11, marginTop: 4, textShadowColor: '#000', textShadowRadius: 3 },
  toast: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    marginLeft: -110,
    width: 220,
    backgroundColor: 'rgba(10,10,18,0.9)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  toastText: { color: '#FFD700', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  shieldGlow: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(80,200,255,0.25)',
    borderWidth: 3,
    borderColor: 'rgba(120,220,255,0.6)',
  },
  ferryBtn: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -70,
    width: 140,
    backgroundColor: 'rgba(10,10,18,0.75)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  ferryBtnText: { color: '#FFD700', fontWeight: '700', fontSize: 13 },
});
