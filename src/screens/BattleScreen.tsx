import React, { useEffect, useRef, useState } from 'react';
import { GameIcon } from '@/game/ui/GameIcon';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPlayingMusic, playMusic, playSfx } from '@/game/audio/audioManager';
import { BATTLE_MUSIC, BOSS_MUSIC } from '@/game/audio/music';
import { haptic } from '@/game/audio/haptics';
import { useGameLoop } from '@/game/core/useGameLoop';
import { boxesOverlap, createFighter, Fighter, STATUS_COLOR, STATUS_ICON, STATUS_KINDS, type CharacterKey, type StatusKind } from '@/game/battle/Fighter';
import { grantVictory, resolveSetup, type Granted } from '@/game/battle/battleModes';
import { applySkills } from '@/game/items/skills';
import { getLearned } from '@/game/state/skillState';
import { endRun, getRun } from '@/game/state/towerState';
import { CpuController } from '@/game/battle/CpuController';
import { getIdleAspect, getSprite, SPRITE_ASPECTS } from '@/game/battle/sprites';
import { STAGE_ART } from '@/game/menu/art';
import { MenuButton } from '@/game/menu/MenuButton';
import { useI18n } from '@/game/i18n/i18n';
import { setQuestStatus, QUEST_BATTLE_DEFS, getStoryCharacterId } from '@/game/state/questState';
import { getSession } from '@/game/state/session';
import { refreshIslandUnlocks } from '@/game/state/islandState';
import { addCoins, consumeEquippedItem, getEquippedItems, getLevel, getUpgradeLevels } from '@/game/state/playerState';
import { getGear, isGear } from '@/game/items/gear';
import { HeldGear, type SwingPhase } from '@/game/items/HeldGear';
import { canHoldWeapon, getHandAnchor } from '@/game/battle/handAnchors';
import { applyUpgrades } from '@/game/items/upgrades';
import { DIFFICULTY_PARAMS, getStoryDifficulty, isDifficulty, type Difficulty } from '@/game/state/difficulty';
import { CURRENCY_ABBR, ITEMS, applyItemEffect, itemName, itemEffectName } from '@/game/items/itemDefs';
import { EquipMenu } from '@/game/items/EquipMenu';
import { useItemMenuAnchor } from '@/game/input/controlsLayout';
import { PauseButton } from '@/game/menu/PauseMenu';
import { setBattleOpen, setGamePaused } from '@/game/state/pauseState';
import { captureBattleAmbience } from '@/game/battle/battleContext';
import { LoadoutMenu } from '@/game/battle/LoadoutMenu';
import { decodeItems } from '@/game/battle/versusLoadout';
import { CapeLayer, HatLayer, getBodySprite, canWearCosmetics, preloadBodySprites } from '@/game/cosmetics/CosmeticLayers';
import { getEquipped } from '@/game/state/cosmeticsState';
import { BattleSkyOverlay } from '@/game/battle/BattleSkyOverlay';
import { WeatherLayer } from '@/game/world/WeatherLayer';
import { getSettings, useSettings } from '@/game/state/settingsState';
import { DPad } from '@/game/input/DPad';
import { ActionCluster, ACTION_COLORS } from '@/game/input/ActionCluster';
import { SpriteEffect, type EffectName } from '@/game/battle/SpriteEffect';
import { AuraEffect } from '@/game/battle/AuraEffect';
import { TapDashDetector } from '@/game/input/tapDash';

const ARENA_W = 1280;
const ARENA_H = 720;
const ARENA_LEFT = 50;
const ARENA_RIGHT = 1230;
/**
 * Altura (na arena 1280x720) em que os PÉS dos lutadores ficam, por cenário. Os
 * três fundos têm proporções diferentes e são desenhados com `cover`, então o
 * chão cai em alturas diferentes: medido em cada arte (trilha de terra do
 * cenário 1, deque de madeira do 2 e piso do cais do 3).
 */
const GROUND_FEET_BY_STAGE: Record<string, number> = { stage_1: 600, stage_2: 670, stage_3: 630 };
const GROUND_FEET_DEFAULT = 600;
const INTRO_MS = 1400;
const ROUND_END_MS = 1800;

const RIVAL_QUEST_REWARD = 40;

type Phase = 'intro' | 'fight' | 'roundEnd' | 'matchEnd';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

function clampArena(f: Fighter) {
  if (f.x < ARENA_LEFT) f.x = ARENA_LEFT;
  if (f.x + f.drawWidth > ARENA_RIGHT) f.x = ARENA_RIGHT - f.drawWidth;
}

function resolveSeparation(f1: Fighter, f2: Fighter) {
  const hb1 = f1.getHurtbox();
  const hb2 = f2.getHurtbox();
  const overlap = Math.min(hb1.x2, hb2.x2) - Math.max(hb1.x1, hb2.x1);
  if (overlap > 0) {
    const push = overlap / 2 + 3;
    if (f1.x < f2.x) {
      f1.x -= push;
      f2.x += push;
    } else {
      f1.x += push;
      f2.x -= push;
    }
  }
}

function spawnHitEffect(particles: Particle[], x: number, y: number, kind: 'block' | 'ult' | 'normal' | 'crit') {
  const count = Math.max(3, Math.round((kind === 'ult' ? 16 : kind === 'crit' ? 14 : 8) * (getSettings().lightMode ? 0.5 : 1)));
  const color = kind === 'block' ? '80,200,255' : kind === 'ult' ? '255,150,30' : kind === 'crit' ? '255,90,90' : '255,220,80';
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * (2 + Math.random() * 2),
      vy: Math.sin(angle) * (2 + Math.random() * 2),
      life: 300,
      maxLife: 300,
      color,
    });
  }
}

const STATUS_SFX: Record<StatusKind, 'fire' | 'ice' | 'poison' | 'debuff'> = { burn: 'fire', freeze: 'ice', poison: 'poison', stun: 'debuff' };

/** Dano que o último checkHit realmente causou (0 se nenhum). */
let lastHitDealt = 0;
function checkHit(attacker: Fighter, defender: Fighter, particles: Particle[], onEffect: (name: EffectName, x: number, y: number, size: number) => void, dmgMult = 1) {
  if (!attacker.currentAttack || attacker.currentAttack.hasHit) return;
  const box = attacker.getActiveHitbox();
  if (!box) return;
  const d = defender.getHurtbox();
  if (boxesOverlap(box, d) && !defender.isKO) {
    const def = attacker.attackDefFor(attacker.currentAttack.type);
    let dmg = attacker[def.damageKey] * dmgMult;
    // Habilidades: bônus contra alvo com status e golpe crítico.
    if (attacker.statusTargetDmgMult !== 1 && defender.hasAnyStatus()) dmg *= attacker.statusTargetDmgMult;
    const crit = attacker.critChance > 0 && Math.random() < attacker.critChance;
    if (crit) dmg *= attacker.critMult;
    const isUlt = attacker.currentAttack.type === 'ultimate';
    const blocked = defender.isShielding && defender.energy >= defender.shieldCost;

    attacker.resolveAttackDamage();
    const atkType = attacker.currentAttack.type;
    const hpBefore = defender.health;
    defender.takeHit(dmg);
    const dealt = Math.max(0, hpBefore - defender.health);
    lastHitDealt = dealt; // quem chamou usa isto (ex.: segredo "Sem um Arranhão")
    // Roubo de vida: parte do dano que realmente entrou volta para quem bateu.
    if (attacker.lifesteal > 0 && !attacker.isKO) {
      if (dealt > 0) attacker.health = Math.min(attacker.maxHealth, attacker.health + dealt * attacker.lifesteal);
    }
    if (!blocked && !defender.isKO) {
      // Status effects (burn / freeze / poison / stun) from the attacker's gear, skills or nature.
      for (const pr of attacker.rollStatusProcs(atkType)) {
        if (defender.applyStatus(pr.kind, pr.ms)) {
          playSfx(STATUS_SFX[pr.kind], { minGapMs: 120, gain: 0.8 });
          const d2 = defender.getHurtbox();
          for (let i = 0; i < 10; i++) {
            const a = (Math.PI * 2 * i) / 10;
            particles.push({ x: (d2.x1 + d2.x2) / 2, y: (d2.y1 + d2.y2) / 2, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 1, life: 450, maxLife: 450, color: STATUS_COLOR[pr.kind] });
          }
        }
      }
    }

    const kind = blocked ? 'block' : isUlt ? 'ult' : crit ? 'crit' : 'normal';
    const hx = (box.x1 + box.x2) / 2;
    const hy = (d.y1 + d.y2) / 2 - 40;
    spawnHitEffect(particles, hx, hy, kind);
    playSfx(kind === 'block' ? 'block' : kind === 'ult' ? 'fire' : kind === 'crit' ? 'hit_heavy' : attacker.currentAttack?.type === 'strong' ? 'hit_heavy' : 'hit_flesh', { minGapMs: 50 });
    haptic(kind === 'ult' || kind === 'crit' ? 'heavy' : kind === 'block' ? 'light' : 'medium');
    if (kind === 'block') onEffect('hit_block', hx, hy, 90);
    else if (isUlt) onEffect('hit_ult', hx, hy, 190);
    else if (attacker.currentAttack?.type === 'strong') onEffect('hit_strong', hx, hy, 110);
    else onEffect('hit_flash', hx, hy, 80);
  }
}

interface HeldInput {
  left: boolean;
  right: boolean;
  shield: boolean;
}

export function BattleScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const itemAnchor = useItemMenuAnchor();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ p1?: string; p2?: string; p2Control?: string; stageKey?: string; questId?: string; difficulty?: string; bossId?: string; tower?: string; rival?: string; items1?: string; items2?: string }>();
  // What this fight is (plain / quest / boss / tower floor / rival) and how strong the opponent is.
  const setup = useRef(resolveSetup(params, { questOpponent: params.questId ? ((params.p2 as CharacterKey) || undefined) : undefined })).current;
  const ROUNDS_TO_WIN = setup.roundsToWin;
  const ROUND_TIME_MS = setup.roundMs;
  const isSpecial = setup.kind === 'boss' || setup.kind === 'tower' || setup.kind === 'rival';

  // Fight music; the world's track comes back when the fight screen closes.
  useEffect(() => {
    const prev = getPlayingMusic();
    playMusic(setup.bossFight ? BOSS_MUSIC : BATTLE_MUSIC);
    playSfx('encounter');
    return () => playMusic(prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p1Key = (params.p1 as CharacterKey) || 'dogge';
  const p2Key: CharacterKey = setup.kind === 'free' ? ((params.p2 as CharacterKey) || 'gadigago') : setup.opponent;
  const p2IsCpu = params.p2Control !== 'human';
  // Ambiente da luta: lutas que começam no mundo (chefe, rival, missão, torre) usam o clima e a hora
  // do dia do mundo; o cenário depende de ONDE a luta começou (cais = rio outonal, prédios = vilarejo,
  // resto = montanhas). A torre mantém o cenário trocando a cada andar. VERSUS: sem ambiente, o jogador escolhe.
  const ambience = useRef(setup.kind === 'free' ? null : captureBattleAmbience()).current;
  const settings = useSettings();
  const stageKey =
    setup.kind === 'free' ? params.stageKey || 'stage_1' : setup.kind === 'tower' ? setup.stageKey : ambience?.stageKey ?? setup.stageKey;
  const groundFeetY = GROUND_FEET_BY_STAGE[stageKey] ?? GROUND_FEET_DEFAULT;

  const p1 = useRef(createFighter(p1Key, getIdleAspect(p1Key))).current;
  const p2 = useRef(createFighter(p2Key, getIdleAspect(p2Key))).current;

  // Permanent upgrade levels (Maximilian's shop) are applied once, in an
  // effect and not inline in render, so nothing here can notify() other
  // mounted components mid-render (that crashed an older version).
  // Consumable items are no longer pre-battle buffs: they're equipped in
  // 2 slots and used instantly mid-fight via the ITEM button below.
  useEffect(() => {
    applyUpgrades(p1, getUpgradeLevels());
    applySkills(p1, getStoryCharacterId(), getLearned());
    if (setup.kind === 'tower') {
      const r = getRun();
      if (r && r.hpPct < 1) p1.health = Math.max(1, p1.maxHealth * r.hpPct);
    }
    if (p2IsCpu) {
      p2.maxHealth = Math.round(p2.maxHealth * setup.hpMult);
      p2.health = p2.maxHealth;
      p2.strongDamage *= setup.dmgMult;
      p2.flashDamage *= setup.dmgMult;
      p2.ultimateDamage *= setup.dmgMult;
      for (const pr of setup.extraProcs) p2.onHitStatus.push(pr);
      const dp = DIFFICULTY_PARAMS[difficulty];
      p2.maxHealth = Math.round(p2.maxHealth * dp.cpuHealth);
      p2.health = p2.maxHealth;
      p2.strongDamage *= dp.cpuDamage;
      p2.flashDamage *= dp.cpuDamage;
      p2.ultimateDamage *= dp.cpuDamage;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // CPU difficulty: picked before character select for quick fights, and
  // taken from the loaded story world for quest fights.
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : params.questId ? getStoryDifficulty() : 'medium';
  const cpu = useRef(new CpuController(difficulty)).current;
  // VERSUS: itens sorteados antes da luta (substituem a mochila). items1 = jogador 1, items2 = CPU.
  const loadoutMode = params.items1 !== undefined;
  const [loadout1, setLoadout1] = useState<(string | null)[]>(() => decodeItems(params.items1));
  const cpuLoadout = useRef<(string | null)[]>(decodeItems(params.items2));
  const cpuItemClock = useRef(0);

  const held1 = useRef<HeldInput>({ left: false, right: false, shield: false });
  const held2 = useRef<HeldInput>({ left: false, right: false, shield: false });
  const tapDash1 = useRef(new TapDashDetector<-1 | 1>()).current;
  const tapDash2 = useRef(new TapDashDetector<-1 | 1>()).current;
  const particlesRef = useRef<Particle[]>([]);

  const phaseRef = useRef<Phase>('intro');
  const phaseTimerRef = useRef(INTRO_MS);
  const roundTimerRef = useRef(ROUND_TIME_MS);
  const roundNumberRef = useRef(1);

  const [, tick] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [paused, setPaused] = useState(false);
  const tookDamage = useRef(false);
  // Pausa de verdade: silencia efeitos/ambientes e congela animações; a batalha congela o mundo por baixo.
  useEffect(() => {
    setGamePaused(paused);
  }, [paused]);
  useEffect(() => {
    setBattleOpen(true);
    return () => {
      setBattleOpen(false);
      setGamePaused(false);
    };
  }, []);
  const [roundNumber, setRoundNumber] = useState(1);
  const [, setWins] = useState({ p1: 0, p2: 0 });
  const questRewardGrantedRef = useRef(false);
  const [questReward, setQuestReward] = useState<null | number>(null);
  const [seconds, setSeconds] = useState(Math.round(ROUND_TIME_MS / 1000));
  const [roundEndReason, setRoundEndReason] = useState<'ko' | 'time'>('ko');
  const [banner, setBanner] = useState<string | null>(null);
  const [granted, setGranted] = useState<Granted | null>(null);
  const towerEndedRef = useRef(false);

  const startRoundIntro = () => {
    phaseRef.current = 'intro';
    phaseTimerRef.current = INTRO_MS;
    roundTimerRef.current = ROUND_TIME_MS;
    p1.resetForRound(200, groundFeetY - p1.getReferenceHeight(), 1);
    p2.resetForRound(900, groundFeetY - p2.getReferenceHeight(), -1);
    setPhase('intro');
    setSeconds(Math.round(ROUND_TIME_MS / 1000));
  };

  const startedRef = useRef(false);
  if (!startedRef.current) {
    startedRef.current = true;
    p1.resetForRound(200, groundFeetY - p1.getReferenceHeight(), 1);
    p2.resetForRound(900, groundFeetY - p2.getReferenceHeight(), -1);
  }

  const endRound = () => {
    phaseRef.current = 'roundEnd';
    phaseTimerRef.current = ROUND_END_MS;
    if (p1.isKO && !p2.isKO) p2.roundsWon++;
    else if (p2.isKO && !p1.isKO) p1.roundsWon++;
    else if (roundNumberRef.current >= 5) {
      if (Math.random() < 0.5) p1.roundsWon++;
      else p2.roundsWon++;
    }
    setPhase('roundEnd');
    setRoundEndReason('ko');
    setWins({ p1: p1.roundsWon, p2: p2.roundsWon });
  };

  const timeUp = () => {
    phaseRef.current = 'roundEnd';
    phaseTimerRef.current = ROUND_END_MS;
    if (p1.health > p2.health) p1.roundsWon++;
    else if (p2.health > p1.health) p2.roundsWon++;
    else if (roundNumberRef.current >= 5) {
      if (Math.random() < 0.5) p1.roundsWon++;
      else p2.roundsWon++;
    }
    setPhase('roundEnd');
    setRoundEndReason('time');
    setWins({ p1: p1.roundsWon, p2: p2.roundsWon });
  };

  useGameLoop((dt) => {
    if (paused) return;
    const frameScale = dt / (1000 / 60);

    if (phaseRef.current === 'intro') {
      phaseTimerRef.current -= dt;
      if (phaseTimerRef.current <= 0) {
        phaseRef.current = 'fight';
        setPhase('fight');
      }
      tick((n) => n + 1);
      return;
    }

    if (phaseRef.current === 'fight') {
      roundTimerRef.current -= dt;
      if (roundTimerRef.current <= 0) {
        roundTimerRef.current = 0;
        timeUp();
        tick((n) => n + 1);
        return;
      }
      const newSeconds = Math.max(0, Math.ceil(roundTimerRef.current / 1000));
      if (newSeconds !== seconds) setSeconds(newSeconds);

      if (held1.current.shield) p1.startShield();
      else p1.stopShield();
      if (p1.canAct()) {
        let dir: -1 | 0 | 1 = 0;
        if (held1.current.left) dir -= 1;
        if (held1.current.right) dir += 1;
        if (dir !== 0) p1.walk(dir, frameScale);
        else if (p1.state === 'walk') p1.setState('idle');
      }

      if (p2IsCpu) {
        cpu.tick(p2, p1, dt, frameScale);
        // A CPU usa os itens sorteados dela: cura quando está baixa; bomba e buffs de vez em quando.
        if (loadoutMode && p2IsCpu) {
          cpuItemClock.current += dt;
          if (cpuItemClock.current >= 2.5) {
            cpuItemClock.current = 0;
            const slot = cpuLoadout.current.findIndex((id) => {
              if (!id) return false;
              const fx = ITEMS[id]?.effects ?? [];
              if (fx.some((e) => e.kind === 'heal')) return p2.health / p2.maxHealth < 0.4;
              if (fx.some((e) => e.kind === 'energy')) return p2.energy / p2.maxEnergy < 0.3;
              return Math.random() < 0.22; // bomba, fúria, guarda...
            });
            if (slot >= 0) {
              const id = cpuLoadout.current[slot] as string;
              cpuLoadout.current = cpuLoadout.current.map((x, i) => (i === slot ? null : x));
              applyItemEffect(p2, id, p1);
              playSfx(ITEMS[id]?.effects.some((e) => e.kind === 'bomb') ? 'fire' : 'buff_atk');
              const fx = itemEffectName(id);
              if (fx === 'bomb') addEffect('bomb', p1.x + p1.drawWidth / 2, p1.getHurtbox().y1 + 50, 150);
              else addEffect(fx, p2.x + p2.drawWidth / 2, p2.getHurtbox().y1 + 60, 140);
            }
          }
        }
      } else {
        if (held2.current.shield) p2.startShield();
        else p2.stopShield();
        if (p2.canAct()) {
          let dir: -1 | 0 | 1 = 0;
          if (held2.current.left) dir -= 1;
          if (held2.current.right) dir += 1;
          if (dir !== 0) p2.walk(dir, frameScale);
          else if (p2.state === 'walk') p2.setState('idle');
        }
      }

      p1.update(dt, frameScale);
      p2.update(dt, frameScale);
      clampArena(p1);
      clampArena(p2);
      resolveSeparation(p1, p2);

      // Boss phase 2 at 50% health: faster, harder, full energy, a short invulnerable roar.
      if (p2.hasPhases && p2.phase === 1 && !p2.isKO && p2.health <= p2.maxHealth * 0.5) {
        p2.enterPhase2();
        cpu.enrage();
        setBanner(`${p2.name}: ${t('boss_phase2')}`);
        setTimeout(() => setBanner(null), 2000);
        playSfx('charge');
        playSfx('encounter', { gain: 0.7 });
        haptic('heavy');
        for (let i = 0; i < 24; i++) {
          const a = (Math.PI * 2 * i) / 24;
          particlesRef.current.push({ x: p2.x + p2.drawWidth / 2, y: p2.y + p2.getReferenceHeight() / 2, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, life: 700, maxLife: 700, color: '255,80,40' });
        }
      }

      const gear = getGear(); // equipped weapon/shield (see items/gear.ts)
      checkHit(p1, p2, particlesRef.current, addEffect, gear.damageMult);
      lastHitDealt = 0;
      checkHit(p2, p1, particlesRef.current, addEffect, gear.guardMult);
      if (lastHitDealt > 0) tookDamage.current = true; // o jogador tomou um golpe

      if (particlesRef.current.length > 0) {
        for (const part of particlesRef.current) {
          part.x += part.vx * frameScale;
          part.y += part.vy * frameScale;
          part.life -= dt;
        }
        particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      }

      if (p1.isKO || p2.isKO) {
        endRound();
      }

      tick((n) => n + 1);
    } else if (phaseRef.current === 'roundEnd') {
      phaseTimerRef.current -= dt;
      if (phaseTimerRef.current <= 0) {
        if (p1.roundsWon >= ROUNDS_TO_WIN || p2.roundsWon >= ROUNDS_TO_WIN) {
          phaseRef.current = 'matchEnd';
          setPhase('matchEnd');
          if (isSpecial && p1.roundsWon > p2.roundsWon && !questRewardGrantedRef.current) {
            questRewardGrantedRef.current = true;
            playSfx('levelup');
            haptic('success');
            setGranted(grantVictory(setup, Math.max(0.01, p1.health / p1.maxHealth), !tookDamage.current));
          } else if (setup.kind === 'tower' && p1.roundsWon <= p2.roundsWon && !towerEndedRef.current) {
            towerEndedRef.current = true;
            endRun(getSession()?.name ?? 'Dogge', getLevel());
          }
          if (params.questId && p1.roundsWon > p2.roundsWon && !questRewardGrantedRef.current) {
            questRewardGrantedRef.current = true;
            setQuestStatus(params.questId, 'completed');
            refreshIslandUnlocks();
            const reward = QUEST_BATTLE_DEFS[params.questId]?.reward ?? RIVAL_QUEST_REWARD;
            addCoins(reward);
            setQuestReward(reward);
          }
        } else {
          roundNumberRef.current += 1;
          setRoundNumber(roundNumberRef.current);
          startRoundIntro();
        }
      }
      tick((n) => n + 1);
    }
  });

  const handleTapDir = (dir: -1 | 1, held: React.MutableRefObject<HeldInput>, tapDash: TapDashDetector<-1 | 1>, fighter: Fighter) => {
    if (dir === -1) held.current.left = true;
    else held.current.right = true;
    if (tapDash.tap(dir)) fighter.startDash(dir);
  };
  const handleReleaseDir = (dir: -1 | 1, held: React.MutableRefObject<HeldInput>) => {
    if (dir === -1) held.current.left = false;
    else held.current.right = false;
  };

  /** Player 1's D-pad, reusing the literal same DPad component world mode
   * uses (see docs/AUDIT.md - "deixe igual do modo história"). Battle is
   * 1D (no up/down movement), so up/down are repurposed rather than
   * unused: up = jump (a natural, extremely standard mapping), down =
   * shield (hold to block, same shape as the ◈ button already has). Left/
   * right keep the existing tap-to-dash behaviour unchanged. */
  const handleP1Dir = (key: 'up' | 'down' | 'left' | 'right', pressed: boolean) => {
    if (key === 'left') {
      if (pressed) handleTapDir(-1, held1, tapDash1, p1);
      else handleReleaseDir(-1, held1);
    } else if (key === 'right') {
      if (pressed) handleTapDir(1, held1, tapDash1, p1);
      else handleReleaseDir(1, held1);
    } else if (key === 'up') {
      if (pressed) p1.jump();
    } else {
      held1.current.shield = pressed;
    }
  };

  const [effects, setEffects] = useState<{ id: number; name: EffectName; x: number; y: number; size: number }[]>([]);
  const effectId = useRef(0);
  function addEffect(name: EffectName, x: number, y: number, size: number) {
    const id = ++effectId.current;
    setEffects((list) => [...list.slice(-5), { id, name, x, y, size }]);
  }
  const removeEffect = (id: number) => setEffects((list) => list.filter((e) => e.id !== id));

  const [itemMenuOpen, setItemMenuOpen] = useState(false);
  const [itemToast, setItemToast] = useState<string | null>(null);
  const handleUseItem = (slot: 0 | 1) => {
    if (phaseRef.current !== 'fight') return;
    if (loadoutMode) {
      const lid = loadout1[slot];
      if (!lid) return;
      setLoadout1((cur) => cur.map((x, i) => (i === slot ? null : x)));
      applyItemEffect(p1, lid, p2);
      playSfx(ITEMS[lid]?.effects.some((e) => e.kind === 'bomb') ? 'fire' : ITEMS[lid]?.effects.some((e) => e.kind === 'heal') ? 'heal' : 'buff_atk');
      const lfx = itemEffectName(lid);
      if (lfx === 'bomb') addEffect('bomb', p2.x + p2.drawWidth / 2, p2.getHurtbox().y1 + 50, 150);
      else addEffect(lfx, p1.x + p1.drawWidth / 2, p1.getHurtbox().y1 + 60, 140);
      setItemMenuOpen(false);
      setItemToast(itemName(lid));
      setTimeout(() => setItemToast(null), 1500);
      return;
    }
    if (isGear(getEquippedItems()[slot])) {
      // Weapons/shield are worn, not spent: the bonus is already active.
      setItemMenuOpen(false);
      setItemToast(t('gear_passive'));
      setTimeout(() => setItemToast(null), 1500);
      return;
    }
    const id = consumeEquippedItem(slot);
    if (!id) return;
    applyItemEffect(p1, id, p2);
    playSfx(ITEMS[id]?.effects.some((e) => e.kind === 'bomb') ? 'fire' : ITEMS[id]?.effects.some((e) => e.kind === 'heal') ? 'heal' : 'buff_atk');
    const fx = itemEffectName(id);
    if (fx === 'bomb') addEffect('bomb', p2.x + p2.drawWidth / 2, p2.getHurtbox().y1 + 50, 150);
    else addEffect(fx, p1.x + p1.drawWidth / 2, p1.getHurtbox().y1 + 60, 140);
    setItemMenuOpen(false);
    setItemToast(itemName(id));
    setTimeout(() => setItemToast(null), 1500);
  };

  const isQuestBattle = !!params.questId || isSpecial;
  const leaveTower = () => {
    if (setup.kind === 'tower' && !towerEndedRef.current) {
      towerEndedRef.current = true;
      endRun(getSession()?.name ?? 'Dogge', getLevel());
    }
    router.back();
  };
  const nextFloor = () => {
    router.replace({ pathname: '/battle', params: { p1: p1Key, p2Control: 'cpu', tower: String((setup.floor ?? 1) + 1) } });
  };
  const startRematch = () => {
    p1.roundsWon = 0;
    p2.roundsWon = 0;
    roundNumberRef.current = 1;
    setRoundNumber(1);
    setWins({ p1: 0, p2: 0 });
    startRoundIntro();
  };

  const handleP1Aura = (pressed: boolean) => {
    if (pressed) p1.startCharge();
    else p1.stopCharge();
  };

  const scale = Math.min(width / ARENA_W, height / ARENA_H);
  // React Native scales around an element's own centre by default, and
  // this transform list applies translate before scale - so scale can't
  // move the centre, only grow/shrink around wherever translate put it.
  // That means centring the arena is just "translate its own centre to
  // the screen's centre" - the ARENA_W*scale/2 terms that would appear
  // for a naive top-left offset cancel out entirely. Written the naive
  // way instead, the box drifts toward the bottom-right by
  // ARENA_W*(1-scale)/2 on any screen where scale != 1, i.e. on every
  // real phone - see docs/AUDIT.md, this is the off-centre battle arena.
  const offsetX = width / 2 - ARENA_W / 2;
  const offsetY = height / 2 - ARENA_H / 2;

  const champion = p1.roundsWon > p2.roundsWon ? p1 : p2;

  return (
    <View style={styles.root}>
      <View style={[styles.arena, { width: ARENA_W, height: ARENA_H, transform: [{ translateX: offsetX }, { translateY: offsetY }, { scale }] }]}>
        <Image source={STAGE_ART[stageKey]} resizeMode="cover" style={styles.arenaBg} />
        {ambience && <BattleSkyOverlay light={ambience.light} phase={ambience.phase} tint={ambience.tint} />}
        <FighterSprite fighter={p1} withGear />
        <FighterSprite fighter={p2} />
        {ambience && ambience.weather !== 'clear' && (
          <WeatherLayer width={ARENA_W} height={ARENA_H} weather={ambience.weather} flashKey={0} paused={paused} intensity={settings.lightMode ? 0.25 : 0.55} />
        )}
        {effects.map((e) => (
          <SpriteEffect key={e.id} name={e.name} x={e.x} y={e.y} size={e.size} onDone={() => removeEffect(e.id)} />
        ))}
        {particlesRef.current.map((p, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: p.x - 4,
              top: p.y - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: `rgba(${p.color},${Math.max(0, p.life / p.maxLife)})`,
            }}
          />
        ))}

        <View style={styles.hudTop}>
          <HealthBlock fighter={p1} align="left" />
          <Text style={[styles.timer, seconds <= 10 && styles.timerLow]}>{seconds}</Text>
          <HealthBlock fighter={p2} align="right" />
        </View>
        <View style={styles.roundPips}>
          <RoundPips wins={p1.roundsWon} total={ROUNDS_TO_WIN} />
          <RoundPips wins={p2.roundsWon} total={ROUNDS_TO_WIN} />
        </View>

        {banner && (
          <View pointerEvents="none" style={[styles.centerWrap, { top: 150 }]}>
            <Text style={[styles.centerText, styles.centerTextRed, { fontSize: 38 }]}>{banner}</Text>
          </View>
        )}

        {phase === 'intro' && (
          <View pointerEvents="none" style={styles.centerWrap}>
            {setup.kind === 'tower' && (
              <Text style={styles.centerTextGold}>
                {t('tower_floor')} {setup.floor}
              </Text>
            )}
            {setup.bossFight && <Text style={[styles.centerTextGold, styles.centerTextRed]}>{(setup.title ?? p2.name).toUpperCase()}</Text>}
            <Text style={styles.centerText}>
              {setup.kind === 'tower' ? '' : `${t('battle_round')} ${roundNumber}`}
            </Text>
            {roundNumber === 1 && (
              <Text style={styles.hint}>
                P1: mover/pular/escudo no direcional . FLASH/FORTE/SUPER/AURA nos botões . toque 2x numa direção pra dash
              </Text>
            )}
          </View>
        )}

        {phase === 'roundEnd' && (
          <View pointerEvents="none" style={styles.centerWrap}>
            <Text style={[styles.centerText, styles.centerTextRed]}>{roundEndReason === 'time' ? t('battle_time_up') : t('battle_ko')}</Text>
            <Text style={styles.centerTextGold}>
              {roundEndReason === 'ko' && p1.isKO && p2.isKO
                ? t('battle_draw')
                : roundEndReason === 'time' && p1.health === p2.health
                ? t('battle_draw_round')
                : `${(roundEndReason === 'ko' ? p2.isKO : p1.health > p2.health) ? p1.name : p2.name} ${t('battle_wins_round')}`}
            </Text>
          </View>
        )}
      </View>

      {(phase === 'fight' || phase === 'intro') && !paused && <PauseButton onPress={() => setPaused(true)} />}

      {phase === 'matchEnd' && (
        <View style={styles.overlay}>
          {isSpecial ? (
            granted ? (
              <>
                <Text style={styles.overlayTitle}>
                  {setup.kind === 'tower' ? `${t('tower_floor')} ${setup.floor}` : setup.kind === 'rival' ? t('rival_victory') : t('boss_victory')}
                </Text>
                <Text style={styles.questRewardText}>
                  {granted.coins > 0 ? `+${granted.coins} ${CURRENCY_ABBR}   ` : ''}
                  {granted.xp > 0 ? `+${granted.xp} XP` : ''}
                </Text>
                {granted.lines.map((l) => (
                  <Text key={l} style={styles.questRewardText}>
                    {l}
                  </Text>
                ))}
                {setup.kind === 'tower' ? (
                  <>
                    <MenuButton label={`${t('tower_next')} ${(setup.floor ?? 1) + 1}`} onPress={nextFloor} />
                    <View style={{ height: 12 }} />
                    <MenuButton label={t('tower_leave')} variant="ghost" onPress={leaveTower} />
                  </>
                ) : (
                  <MenuButton label={t('battle_continue')} onPress={() => router.back()} />
                )}
              </>
            ) : setup.kind === 'tower' ? (
              <>
                <Text style={styles.overlayTitle}>{t('tower_fell')}</Text>
                <Text style={styles.questRewardText}>
                  {t('tower_floor')} {setup.floor}
                </Text>
                <MenuButton label={t('tower_back')} onPress={leaveTower} />
              </>
            ) : (
              <>
                <Text style={styles.overlayTitle}>{t('quest_defeat')}</Text>
                <MenuButton label={t('quest_retry')} onPress={startRematch} />
                <View style={{ height: 12 }} />
                <MenuButton label={t('quest_give_up')} variant="ghost" onPress={() => router.back()} />
              </>
            )
          ) : isQuestBattle ? (
            // STORY quest fight: never offer "revanche"/"menu" after a win -
            // the only way on is back to the world. A loss lets you retry.
            <>
              <Text style={styles.overlayTitle}>{questReward !== null ? (params.questId === 'final_meme_fighter' ? t('quest_final_victory') : t('quest_victory')) : t('quest_defeat')}</Text>
              {questReward !== null && (
                <Text style={styles.questRewardText}>
                  {t('quest_reward')}: +{questReward} {CURRENCY_ABBR}
                </Text>
              )}
              {questReward !== null ? (
                <MenuButton label={t('battle_continue')} onPress={() => router.back()} />
              ) : (
                <>
                  <MenuButton label={t('quest_retry')} onPress={startRematch} />
                  <View style={{ height: 12 }} />
                  <MenuButton label={t('quest_give_up')} variant="ghost" onPress={() => router.back()} />
                </>
              )}
            </>
          ) : (
            <>
              <Text style={styles.overlayTitle}>{champion.name + ' ' + t('battle_wins_match')}</Text>
              <MenuButton label={t('battle_rematch')} onPress={startRematch} />
              <View style={{ height: 12 }} />
              <MenuButton label={t('battle_menu')} variant="ghost" onPress={() => router.push('/')} />
            </>
          )}
        </View>
      )}

      {paused && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>{t('battle_paused')}</Text>
          <MenuButton
            label={t('battle_continue')}
            onPress={() => {
              setPaused(false);
            }}
          />
          <View style={{ height: 12 }} />
          <MenuButton label={isQuestBattle ? t('quest_give_up') : t('battle_exit_menu')} variant="danger" onPress={() => (setup.kind === 'tower' ? leaveTower() : isQuestBattle ? router.back() : router.push('/'))} />
        </View>
      )}

      {phase !== 'matchEnd' && !paused && (
        // Same two components world/story mode uses, not a look-alike copy
        // - see docs/AUDIT.md ("deixe igual do modo história"). P2's old
        // same-device controls (side="right") don't render any more:
        // "jogador vs jogador" is being rebuilt as real online multiplayer,
        // not pass-the-phone, so for now P2 simply has no local input.
        <>
          <DPad onPress={handleP1Dir} />
          <ActionCluster
            onJump={() => p1.jump()}
            onStrong={() => p1.startAttack('strong')}
            onSuper={() => p1.startAttack('ultimate')}
            onFlash={() => p1.startAttack('flash')}
            onShieldChange={(v) => (held1.current.shield = v)}
            onAuraChange={handleP1Aura}
            onItemMenu={() => setItemMenuOpen((v) => !v)}
          />
          {loadoutMode ? (
            <LoadoutMenu visible={itemMenuOpen} items={loadout1} onClose={() => setItemMenuOpen(false)} onUse={handleUseItem} anchor={itemAnchor} />
          ) : (
            <EquipMenu visible={itemMenuOpen} onClose={() => setItemMenuOpen(false)} onUse={handleUseItem} anchor={itemAnchor} />
          )}
          {itemToast && (
            <View style={styles.itemToast} pointerEvents="none">
              <Text style={styles.itemToastText}>{itemToast}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function FighterSprite({ fighter, withGear }: { fighter: Fighter; withGear?: boolean }) {
  const poseKey = fighter.currentSpriteKey;
  // Cosméticos (só o jogador, p1): skin troca o sprite; capa fica atrás e chapéu por cima.
  const cos = withGear && canWearCosmetics(fighter.characterKey) ? getEquipped() : null;
  const skinId = cos ? cos.skin : null;
  useEffect(() => {
    if (cos) preloadBodySprites(fighter.characterKey, skinId);
  }, [cos, fighter.characterKey, skinId]);
  const source = cos ? getBodySprite(fighter.characterKey, poseKey, cos.skin) : getSprite(fighter.characterKey, poseKey);
  const frameAspect = SPRITE_ASPECTS[fighter.characterKey][poseKey] ?? 1;
  const refHeight = fighter.getReferenceHeight();
  // Height is always the idle reference height - never recalculated per
  // pose - so the fighter's vertical size never changes between frames.
  // Any difference between a pose's own aspect ratio and the idle one
  // (e.g. dogking's "flash" pose, cropped much taller/narrower than its
  // idle) now shows up as WIDTH instead, growing/shrinking sideways from
  // the fighter's own horizontal centre. Previously this was the other
  // way around (fixed width, height derived from each pose's own
  // aspect), which is what made the character visibly grow/shrink
  // upward mid-attack.
  const frameWidth = refHeight * frameAspect;
  const xOffset = (fighter.drawWidth - frameWidth) / 2;

  const flicker = fighter.state === 'hurt' && Math.floor(fighter.hitstunTimer / 60) % 2 === 0;

  // Held weapon/shield (p1 only): pinned to the hand of the current frame.
  let gearNode: React.ReactNode = null;
  if (withGear && canHoldWeapon(fighter.characterKey)) {
    const g = getGear();
    const hand = getHandAnchor(fighter.characterKey, poseKey);
    if ((g.weapon || g.shield) && hand) {
      const atk = fighter.currentAttack;
      const phase: SwingPhase = atk && atk.type !== 'ultimate' ? (atk.phase === 'startup' ? 'windup' : atk.phase === 'active' ? 'swing' : undefined) : undefined;
      gearNode = (
        <HeldGear
          weapon={g.weapon}
          shield={g.shield}
          box={{ left: xOffset, top: 0, width: frameWidth, height: refHeight }}
          hand={hand}
          charH={refHeight}
          dir={fighter.facing}
          poseKey={poseKey}
          phase={phase}
        />
      );
    }
  }

  const ultActive = fighter.currentAttack?.type === 'ultimate' && fighter.currentAttack.phase !== 'recovery';
  const ultAspect = SPRITE_ASPECTS[fighter.characterKey].ult ?? 1;
  const ultW = fighter.ultEffectWidth;
  const ultH = ultW / ultAspect;
  const ultY = (refHeight - ultH) / 2;

  return (
    <View
      style={[
        styles.fighterBox,
        {
          left: fighter.x,
          top: fighter.y,
          width: fighter.drawWidth,
          height: refHeight,
          // Always a real array, never `undefined`. Toggling a style's
          // `transform` between an array and `undefined` is what crashes
          // RN's Fabric renderer with "Cannot read property 'forEach' of
          // null" (the native side receives a bare `null` for the
          // removed value, and processTransform doesn't guard against
          // that - see docs/AUDIT.md). A `0deg` rotation is a no-op, so
          // this looks identical to before but never removes the prop.
          transform: [{ rotate: fighter.state === 'ko' ? '90deg' : '0deg' }],
        },
      ]}
    >
      {cos && <CapeLayer characterKey={fighter.characterKey} poseKey={poseKey} box={{ left: xOffset, top: 0, width: frameWidth, height: refHeight }} dir={fighter.facing} cosmeticId={cos.cape} />}
      <Image
        source={source}
        resizeMode="stretch"
        style={[{ position: 'absolute', left: xOffset, top: 0, width: frameWidth, height: refHeight }, { transform: [{ scaleX: fighter.facing }] }]}
      />
      {cos && <HatLayer characterKey={fighter.characterKey} poseKey={poseKey} box={{ left: xOffset, top: 0, width: frameWidth, height: refHeight }} dir={fighter.facing} cosmeticId={cos.hat} />}
      {withGear && gearNode}
      {STATUS_KINDS.filter((k) => fighter.hasStatus(k)).map((k) => (
        <View key={k} style={{ position: 'absolute', left: xOffset, top: 0, width: frameWidth, height: refHeight, backgroundColor: `rgba(${STATUS_COLOR[k]},0.22)`, borderRadius: 16 }} />
      ))}
      {fighter.hasStatus('stun') && <GameIcon name="star" size={30} style={{ position: 'absolute', left: fighter.drawWidth / 2 - 15, top: -30 }} />}
      {fighter.invulnTimer > 0 && <View style={[styles.shieldGlow, { width: fighter.drawWidth, height: refHeight, borderColor: 'rgba(255,90,40,0.8)', backgroundColor: 'rgba(255,90,40,0.18)' }]} />}
      {fighter.state === 'hurt' && (
        <View style={[styles.hurtTint, { left: xOffset, top: 0, width: frameWidth, height: refHeight, opacity: flicker ? 0.55 : 0.25 }]} />
      )}
      {fighter.state === 'shield' && <View style={[styles.shieldGlow, { width: fighter.drawWidth, height: refHeight }]} />}
      {fighter.state === 'charge' && <AuraEffect active width={fighter.drawWidth} height={refHeight} />}
      {ultActive && (
        <Image
          source={getSprite(fighter.characterKey, 'ult')}
          resizeMode="stretch"
          style={{ position: 'absolute', left: fighter.drawWidth * 0.75, top: ultY, width: ultW, height: ultH }}
        />
      )}
    </View>
  );
}

function HealthBlock({ fighter, align }: { fighter: Fighter; align: 'left' | 'right' }) {
  const pct = Math.max(0, fighter.health / fighter.maxHealth);
  const energyPct = Math.max(0, fighter.energy / fighter.maxEnergy);
  const healthColor = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f1c40f' : '#e74c3c';
  const energyColor = energyPct >= 1 ? '#f39c12' : '#3498db';

  const active = STATUS_KINDS.filter((k) => fighter.hasStatus(k));
  return (
    <View style={{ width: 300, alignItems: align === 'left' ? 'flex-start' : 'flex-end' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={styles.fighterName}>{fighter.name}</Text>
        {fighter.hasPhases && fighter.phase >= 2 && <GameIcon name="fire" size={16} />}
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: healthColor, alignSelf: align === 'left' ? 'flex-start' : 'flex-end' }]} />
        {fighter.hasPhases && <View style={styles.phaseTick} />}
      </View>
      {active.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
          {active.map((k) => (
            <Text key={k} style={styles.statusIcon}>
              {STATUS_ICON[k]}
            </Text>
          ))}
        </View>
      )}
      <View style={[styles.barTrack, styles.energyTrack]}>
        <View style={[styles.barFill, { width: `${energyPct * 100}%`, backgroundColor: energyColor, alignSelf: align === 'left' ? 'flex-start' : 'flex-end' }]} />
      </View>
    </View>
  );
}

function RoundPips({ wins, total }: { wins: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.pip, i < wins && styles.pipFilled]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  itemToast: {
    position: 'absolute',
    top: '28%',
    alignSelf: 'center',
    backgroundColor: 'rgba(10,10,18,0.85)',
    borderColor: '#B565E8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  itemToastText: { color: '#FFD700', fontWeight: '800', fontSize: 14 },
  root: { flex: 1, backgroundColor: '#000' },
  arena: { position: 'absolute', left: 0, top: 0 },
  arenaBg: { position: 'absolute', left: 0, top: 0, width: ARENA_W, height: ARENA_H },
  fighterBox: { position: 'absolute' },
  hurtTint: { position: 'absolute', left: 0, backgroundColor: '#ff3c3c' },
  shieldGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(80,200,255,0.25)',
    borderWidth: 3,
    borderColor: 'rgba(120,220,255,0.6)',
  },
  hudTop: { position: 'absolute', top: 20, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  roundPips: { position: 'absolute', top: 76, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between' },
  fighterName: { color: '#FFD700', fontWeight: '700', fontSize: 18, textShadowColor: '#000', textShadowRadius: 4 },
  barTrack: {
    width: 280,
    height: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    marginTop: 4,
  },
  energyTrack: { height: 8 },
  phaseTick: { position: 'absolute', left: '50%', top: 0, width: 2, height: '100%', backgroundColor: 'rgba(255,255,255,0.7)' },
  statusIcon: { fontSize: 18, textShadowColor: '#000', textShadowRadius: 4 },
  barFill: { height: '100%' },
  pip: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FFD700' },
  pipFilled: { backgroundColor: '#FFD700' },
  timer: { color: '#FFD700', fontWeight: '800', fontSize: 32, textShadowColor: '#000', textShadowRadius: 6 },
  timerLow: { color: '#e74c3c' },
  centerWrap: { position: 'absolute', left: 0, right: 0, top: ARENA_H / 2 - 60, alignItems: 'center' },
  centerText: { color: '#FFD700', fontWeight: '800', fontSize: 46, textShadowColor: '#000', textShadowRadius: 10 },
  centerTextRed: { color: '#ff4444' },
  centerTextGold: { color: '#FFD700', fontSize: 32, fontWeight: '800', marginTop: 12, textShadowColor: '#000', textShadowRadius: 10 },
  hint: { color: '#fff', fontSize: 14, marginTop: 16, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 4, paddingHorizontal: 20 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center' },
  overlayTitle: { color: '#FFD700', fontWeight: '800', fontSize: 26, marginBottom: 24, textAlign: 'center', paddingHorizontal: 20 },
  questRewardText: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 20, marginTop: -12 },
});
