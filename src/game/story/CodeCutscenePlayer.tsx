import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { getAccount } from '@/game/account/accountState';
import { playMusic, getPlayingMusic, playSfx, setAmbient, stopAmbients } from '@/game/audio/audioManager';
import type { AmbientKey, MusicKey, SfxKey } from '@/game/audio/audioAssets';
import { SPRITE_ASPECTS, getSprite, walkFrames } from '@/game/battle/sprites';
import { SpriteEffect, type EffectName } from '@/game/battle/SpriteEffect';
import { CapeLayer, HatLayer, getBodySprite, type PoseBox } from '@/game/cosmetics/CosmeticLayers';
import { canWearCosmetics } from '@/game/cosmetics/anchors';
import { skinFolder } from '@/game/cosmetics/cosmeticDefs';
import { SKIN_SPRITES_V2 } from '@/game/cosmetics/wearV2';
import { STAGE_ART, STAGE_ART_VARIANT } from '@/game/menu/art';
import { SCENES, type SceneKey } from '@/game/menu/sceneArt';
import { SCENE_IMAGES, SEA_BG_IMAGES } from '@/game/menu/sceneImages';
import { SceneParticles } from '@/game/menu/SceneParticles';
import { getEquipped } from '@/game/state/cosmeticsState';
import { GameIcon } from '@/game/ui/GameIcon';
import type { IconName } from '@/game/ui/iconRegistry';
import { NPC_SHEET } from '@/game/world/npcSheet';
import { NpcSprite, hasWalkSheet } from '@/game/world/NpcSprite';
import { getStoryCharacterId } from '@/game/state/questState';
import { LevelUpBackdrop } from './LevelUpBackdrop';
import { getLevelUpGround } from './levelUpScene';
import { useI18n } from '@/game/i18n/i18n';
import { beatDuration, type CodeActor, type CodeBeat, type CodeCutscene, type CodeFade, type CodeKey, type CodePose } from './codeCutscenes';
import { resolveCutsceneText } from './cutsceneText';
import { CUTSCENE_TEXTS } from './campaigns';

const TYPE_MS = 26;

/** Apelido do jogador (é o que as falas dizem no lugar do nome do personagem). */
export function playerName(): string {
  return getAccount().nick?.trim() || 'Jogador';
}

type BgSource = { kind: 'scene'; key: SceneKey } | { kind: 'image'; src: number; particles: SceneKey | null } | { kind: 'black' };

/** Fundo de um quadro: cenário novo, arena antiga (com entardecer/noite), mar gerado ou preto. */
function resolveBg(bg: string): BgSource {
  if (bg in SCENES) return { kind: 'scene', key: bg as SceneKey };
  const st = /^stage(\d+)(?:_(dusk|night))?$/.exec(bg);
  if (st) {
    const base = `stage_${st[1]}`;
    const variant = st[2] ? STAGE_ART_VARIANT[base]?.[st[2] as 'dusk' | 'night'] : undefined;
    const src = variant ?? STAGE_ART[base];
    if (src !== undefined) return { kind: 'image', src, particles: null };
  }
  if (SEA_BG_IMAGES[bg] !== undefined) return { kind: 'image', src: SEA_BG_IMAGES[bg], particles: 'sea' };
  return { kind: 'black' };
}

interface Props {
  script: CodeCutscene;
  /** Chamado UMA vez: ao terminar ou ao pular. */
  onDone: () => void;
}

/**
 * Toca uma cutscene feita por código: cenário + partículas + personagens animados + fala com efeito de digitação.
 * O personagem do jogador aparece com a skin, o chapéu e a capa que ele está vestindo. As falas usam o apelido do jogador
 * e a língua escolhida. Toque na tela: completa a fala e depois avança. PULAR sempre visível.
 */
export function CodeCutscenePlayer({ script, onDone }: Props) {
  const { t, lang } = useI18n();
  const name = playerName();
  const [index, setIndex] = useState(0);
  const doneRef = useRef(false);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  // música e ambiente da cena; ao sair, volta a música de antes
  useEffect(() => {
    const prev = getPlayingMusic();
    stopAmbients();
    playMusic((script.music as MusicKey | undefined) ?? null);
    if (script.ambient) setAmbient(script.ambient as AmbientKey, 0.3);
    return () => {
      stopAmbients();
      playMusic(prev);
    };
  }, [script]);

  const beat = script.beats[index];
  const next = useCallback(() => {
    if (index >= script.beats.length - 1) finish();
    else setIndex((i) => i + 1);
  }, [index, script.beats.length, finish]);

  // avanço automático depois do tempo de leitura (o toque adianta)
  useEffect(() => {
    if (!beat) {
      finish();
      return;
    }
    const id = setTimeout(next, beatDuration(beat));
    return () => clearTimeout(id);
  }, [beat, next, finish]);

  if (!beat) return null;
  return (
    <View style={styles.root} testID="code-cutscene">
      <BeatView key={`${script.id}:${index}`} beat={beat} lang={lang} name={name} onTap={next} />
      <View style={styles.dots} pointerEvents="none">
        {script.beats.length <= 24 &&
          script.beats.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotOn, i < index && styles.dotPast]} />)}
      </View>
      <Pressable style={styles.skip} onPress={finish} testID="cutscene-skip" hitSlop={10}>
        <Text style={styles.skipText}>{t('ending_skip')}</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Linha do tempo de um quadro: um relógio (ms) e trilhas suaves        */
/* ------------------------------------------------------------------ */
function smooth(x: number): number {
  'worklet';
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
}

/** Posição no instante t: parada antes do primeiro ponto e depois do último, suave entre eles. */
function sampleXY(keys: CodeKey[], t: number): { x: number; y: number } {
  'worklet';
  const n = keys.length;
  if (t <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
  for (let i = 0; i < n - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t < b.t) {
      const p = smooth((t - a.t) / Math.max(b.t - a.t, 1));
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
    }
  }
  return { x: keys[n - 1].x, y: keys[n - 1].y };
}

function sampleFade(f: CodeFade[], t: number): number {
  'worklet';
  const n = f.length;
  if (t <= f[0].t) return f[0].a;
  for (let i = 0; i < n - 1; i++) {
    if (t < f[i + 1].t) return f[i].a + (f[i + 1].a - f[i].a) * smooth((t - f[i].t) / Math.max(f[i + 1].t - f[i].t, 1));
  }
  return f[n - 1].a;
}

function BeatView({ beat, lang, name, onTap }: { beat: CodeBeat; lang: string; name: string; onTap: () => void }) {
  const { width, height } = useWindowDimensions();
  const dur = beatDuration(beat);
  const text = resolveCutsceneText(beat.text, lang, name, CUTSCENE_TEXTS);
  const speaker = resolveCutsceneText(beat.speaker, lang, name, CUTSCENE_TEXTS);
  const title = resolveCutsceneText(beat.title, lang, name, CUTSCENE_TEXTS);
  const subtitle = resolveCutsceneText(beat.subtitle, lang, name, CUTSCENE_TEXTS);
  const [shown, setShown] = useState(0);
  const [textOn, setTextOn] = useState(true);
  const [effects, setEffects] = useState<{ id: number; name: EffectName; x: number; y: number; size: number }[]>([]);
  const typedAll = shown >= text.length;
  const bg = useMemo(() => resolveBg(beat.bg), [beat.bg]);
  const startRef = useRef(Date.now());

  // digitação da fala
  useEffect(() => {
    if (!text) return;
    const id = setInterval(() => setShown((n) => (n >= text.length ? n : n + 1)), TYPE_MS);
    return () => clearInterval(id);
  }, [text]);

  // a fala some quando o personagem termina de falar (o quadro continua com a ação)
  useEffect(() => {
    if (beat.textFor === undefined) return;
    const id = setTimeout(() => setTextOn(false), beat.textFor);
    return () => clearTimeout(id);
  }, [beat.textFor]);

  // sons e efeitos de golpe, cada um no seu instante
  useEffect(() => {
    const ids = (beat.sfx ?? []).map((sfx) => setTimeout(() => playSfx(sfx.key as SfxKey, { gain: sfx.vol ?? 1 }), sfx.at));
    (beat.effects ?? []).forEach((e, i) => ids.push(setTimeout(() => setEffects((l) => [...l, { id: i, name: e.name as EffectName, x: e.x * width, y: e.y * height, size: e.size * height }]), e.t)));
    return () => ids.forEach(clearTimeout);
  }, [beat, width, height]);

  const clock = useSharedValue(0);
  const flash = useSharedValue(0);
  const shake = useSharedValue(0);
  const dark = useSharedValue(0);
  const fade = useSharedValue(0);
  const cut = useSharedValue(beat.shot ? 1 : 0);
  useEffect(() => {
    const fx = beat.fx ?? [];
    clock.value = withTiming(dur, { duration: dur, easing: Easing.linear });
    fade.value = withTiming(1, { duration: 380 });
    if (beat.shot) cut.value = withTiming(0, { duration: 800 });
    if (fx.includes('flash')) flash.value = withSequence(withTiming(0.85, { duration: 60 }), withTiming(0, { duration: 560 }));
    if (fx.includes('shake')) shake.value = withSequence(...Array.from({ length: 10 }, (_, i) => withTiming(i % 2 ? 9 : -9, { duration: 70 })), withTiming(0, { duration: 70 }));
    if (fx.includes('darken')) dark.value = withTiming(0.38, { duration: 600 });
    return () => {
      cancelAnimation(clock);
    };
  }, [beat, dur, clock, flash, shake, dark, fade, cut]);

  const cam = beat.cam ?? { z0: 1, z1: beat.fx?.includes('zoom') ? 1.14 : 1.05 };
  const bgStyle = useAnimatedStyle(() => {
    const p = smooth(clock.value / Math.max(dur, 1));
    const z = cam.z0 + (cam.z1 - cam.z0) * p;
    const fx0 = cam.fx ?? 0.5;
    const fy0 = cam.fy ?? 0.5;
    // o foco da câmera continua no mesmo ponto enquanto o zoom muda; o deslize move o cenário devagar
    const tx = width * (z - 1) * (0.5 - fx0) - (cam.pan ?? 0) * width * p * z + shake.value;
    const ty = height * (z - 1) * (0.5 - fy0);
    return { transform: [{ translateX: tx }, { translateY: ty }, { scale: z }] };
  });
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const darkStyle = useAnimatedStyle(() => ({ opacity: dark.value }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cutStyle = useAnimatedStyle(() => ({ opacity: cut.value }));
  const bar = Math.round(height * 0.09);

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={() => (!typedAll ? setShown(text.length) : onTap())}>
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        {beat.levelUp ? (
          <LevelUpBackdrop characterId={getStoryCharacterId()} ground={getLevelUpGround()} />
        ) : bg.kind === 'scene' ? (
          <ExpoImage source={SCENE_IMAGES[bg.key]} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ right: 0, bottom: 0 }} transition={0} />
        ) : bg.kind === 'image' ? (
          <Image source={bg.src} resizeMode="cover" style={{ width, height }} />
        ) : null}
      </Animated.View>
      {beat.tint ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: beat.tint }]} /> : null}
      {bg.kind === 'scene' ? <SceneParticles scene={bg.key} /> : bg.kind === 'image' && bg.particles ? <SceneParticles scene={bg.particles} /> : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, darkStyle]} />

      {(beat.icons ?? []).map((ic, i) => (
        <Animated.View key={i} pointerEvents="none" style={[{ position: 'absolute', left: ic.x * width - ic.size / 2, top: ic.y * height - ic.size / 2 }, fadeStyle]}>
          <GameIcon name={ic.name as IconName} size={ic.size} />
        </Animated.View>
      ))}
      {[...(beat.actors ?? [])]
        .sort((p, q) => (p.path ? p.path[0].y : p.y) - (q.path ? q.path[0].y : q.y))
        .map((a, i) => (
          <Actor key={`${a.char}:${i}`} a={a} width={width} height={height} entering={!!beat.shot} clock={clock} startRef={startRef} />
        ))}
      {effects.map((e) => (
        <SpriteEffect key={e.id} name={e.name} x={e.x} y={e.y} size={e.size} onDone={() => setEffects((l) => l.filter((q) => q.id !== e.id))} />
      ))}

      {title ? (
        <Animated.View pointerEvents="none" style={[styles.titleWrap, fadeStyle]}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </Animated.View>
      ) : null}

      <View pointerEvents="none" style={[styles.bar, { top: 0, height: bar }]} />
      <View pointerEvents="none" style={[styles.bar, { bottom: 0, height: bar }]} />

      {text && textOn ? (
        <Animated.View pointerEvents="none" style={[styles.caption, { bottom: bar + 10 }, fadeStyle]}>
          {speaker ? <Text style={styles.speaker}>{speaker}</Text> : null}
          <Text style={styles.captionText}>{text.slice(0, shown)}</Text>
        </Animated.View>
      ) : null}

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }, flashStyle]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, cutStyle]} />
    </Pressable>
  );
}

interface ActorProps {
  a: CodeActor;
  width: number;
  height: number;
  entering: boolean;
  clock: SharedValue<number>;
  startRef: React.MutableRefObject<number>;
}

function Actor(props: ActorProps) {
  // '@player' = o personagem de história do mundo atual (cenas que valem para todos, como subir de nível)
  const a = props.a.char === '@player' ? { ...props.a, char: getStoryCharacterId() } : props.a;
  const p = { ...props, a };
  if (a.kind === 'npc') return <NpcActor {...p} />;
  if (a.kind === 'icon') return <IconActor {...p} />;
  return <FighterActor {...p} />;
}

/** Trajeto e opacidade do ator ao longo do relógio do quadro (movimento suave, sem pressa). */
function useActorTrack(a: CodeActor, clock: SharedValue<number>, width: number, height: number, w: number, h: number, entering: boolean, footAnchor: boolean) {
  const keys = useMemo<CodeKey[]>(() => {
    if (a.path && a.path.length > 0) return a.path;
    const enter = a.enter ?? (entering ? 'fade' : 'none');
    if (enter === 'left' || enter === 'right') return [{ t: 0, x: a.x + (enter === 'left' ? -0.3 : 0.3), y: a.y }, { t: 900, x: a.x, y: a.y }];
    if (enter === 'bottom') return [{ t: 0, x: a.x, y: a.y + 0.2 }, { t: 700, x: a.x, y: a.y }];
    return [{ t: 0, x: a.x, y: a.y }];
  }, [a]);
  const fades = useMemo<CodeFade[]>(() => {
    if (a.fades && a.fades.length > 0) return a.fades;
    const enter = a.enter ?? (entering ? 'fade' : 'none');
    return enter === 'none' ? [{ t: 0, a: 1 }] : [{ t: 0, a: 0 }, { t: 700, a: 1 }];
  }, [a, entering]);
  const anim = a.anim ?? 'bob';
  const base = a.opacity ?? 1;
  return useAnimatedStyle(() => {
    const t = clock.value;
    const p = sampleXY(keys, t);
    const idle = anim === 'bob' ? Math.sin(t / 223) * 3 : anim === 'jump' ? -Math.abs(Math.sin(t / 330)) * h * 0.1 : anim === 'shake' ? Math.sin(t / 19) * 3 : 0;
    return {
      opacity: base * sampleFade(fades, t),
      transform: [{ translateX: p.x * width - w / 2 + (anim === 'shake' ? idle : 0) }, { translateY: p.y * height - (footAnchor ? h : h / 2) + (anim === 'shake' ? 0 : idle) }],
    };
  });
}

/** Pose e quadro de caminhada: leem a hora em um intervalo curto (só atualiza o estado quando algo muda). */
function useActorPose(a: CodeActor, startRef: React.MutableRefObject<number>) {
  const moving = !!a.path && a.path.length > 1;
  const dynamic = moving || !!(a.poses && a.poses.length > 0);
  const [state, setState] = useState<{ pose: CodePose; frame: number; walking: boolean; dx: number }>({ pose: a.pose ?? 'idle', frame: 0, walking: false, dx: 0 });
  useEffect(() => {
    if (!dynamic) return;
    const tick = () => {
      const t = Date.now() - startRef.current;
      let pose: CodePose = a.pose ?? 'idle';
      for (const k of a.poses ?? []) if (t >= k.t) pose = k.pose;
      let walking = false;
      let dx = 0;
      if (a.path && a.path.length > 1) {
        const p0 = sampleXY(a.path, t);
        const p1 = sampleXY(a.path, t + 120);
        dx = p1.x - p0.x;
        walking = Math.abs(dx) + Math.abs(p1.y - p0.y) > 0.0008;
      }
      const frame = Math.floor(t / 140);
      setState((o) => (o.pose === pose && o.walking === walking && (!walking || o.frame === frame) && o.dx === Math.sign(dx) ? o : { pose, frame, walking, dx: Math.sign(dx) }));
    };
    tick();
    const id = setInterval(tick, 70);
    return () => clearInterval(id);
  }, [a, dynamic, startRef]);
  return state;
}

function IconActor({ a, width, height, entering, clock }: ActorProps) {
  const size = a.h * height;
  const style = useActorTrack(a, clock, width, height, size, size, entering, false);
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <GameIcon name={a.char as IconName} size={size} />
    </Animated.View>
  );
}

/** NPC do pacote (c08...): o tamanho é a escala do sprite original, como no vídeo antigo (1280x720). */
function NpcActor({ a, width, height, entering, clock, startRef }: ActorProps) {
  const k = height / 720;
  const walkSheet = hasWalkSheet(a.char);
  const sheet = NPC_SHEET[a.char];
  const scale = (walkSheet ? a.h * k : 4 * a.h * k) / 1.3;
  const w = walkSheet ? 128 * a.h * k : (sheet ? sheet.w * 4 : 128) * a.h * k;
  const h = walkSheet ? 192 * a.h * k : (sheet ? sheet.h * 4 : 128) * a.h * k;
  const style = useActorTrack(a, clock, width, height, w, h, entering, true);
  const st = useActorPose(a, startRef);
  const facing = st.walking ? (st.dx > 0 ? 'right' : st.dx < 0 ? 'left' : (a.dir ?? 'down')) : (a.dir ?? 'down');
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h }, style]}>
      <View style={{ transform: [{ scaleX: a.flip ? -1 : 1 }] }}>
        <NpcSprite char={a.char} scale={scale} walk={{ facing, walking: st.walking, frame: st.frame }} />
      </View>
    </Animated.View>
  );
}

/** Lutador. O personagem do jogador usa o corpo com a skin e os chapéus/capas vestidos (igual ao jogo). */
function FighterActor({ a, width, height, entering, clock, startRef }: ActorProps) {
  const st = useActorPose(a, startRef);
  const wears = !!a.player && canWearCosmetics(a.char);
  const eq = getEquipped();
  const skin = wears ? eq.skin : null;
  const frames = useMemo(() => walkFrames(a.char as never), [a.char]);
  const wanted: string = st.walking && st.pose === 'idle' ? frames[st.frame % frames.length] : st.pose === 'walk' ? frames[st.frame % frames.length] : st.pose;
  // se a skin não tem essa pose, usa a parada (assim a skin e o chapéu nunca ficam em desacordo com o corpo)
  const pose = skin && !SKIN_SPRITES_V2[a.char]?.[skinFolder(skin)]?.[wanted] ? 'idle' : wanted;
  const aspects = SPRITE_ASPECTS[a.char as keyof typeof SPRITE_ASPECTS];
  const aspect = aspects?.[pose] ?? aspects?.idle ?? 0.8;
  const h = a.h * height;
  const w = h * aspect;
  const boxW = h * 1.5;
  const dir: 1 | -1 = a.flip ? -1 : 1;
  // um contêiner de largura fixa (a pose pode mudar de largura sem o personagem "pular" de lugar)
  const style = useActorTrack(a, clock, width, height, boxW, h * 1.22, entering, true);

  if (wears) {
    const box: PoseBox = { left: (boxW - w) / 2, top: h * 0.22, width: w, height: h };
    return (
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: boxW, height: h * 1.22 }, style]}>
        <CapeLayer characterKey={a.char} poseKey={pose} box={box} dir={dir} cosmeticId={eq.cape} />
        <Image source={getBodySprite(a.char, pose, skin)} resizeMode="stretch" style={{ position: 'absolute', left: box.left, top: box.top, width: w, height: h, transform: [{ scaleX: dir }] }} />
        <HatLayer characterKey={a.char} poseKey={pose} box={box} dir={dir} cosmeticId={eq.hat} />
      </Animated.View>
    );
  }
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: boxW, height: h * 1.22 }, style]}>
      <Image source={getSprite(a.char as never, pose)} resizeMode="contain" style={{ position: 'absolute', left: (boxW - w) / 2, top: h * 0.22, width: w, height: h, transform: [{ scaleX: dir }] }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bar: { position: 'absolute', left: 0, right: 0, backgroundColor: '#000' },
  caption: { position: 'absolute', left: 28, right: 28, alignSelf: 'center', maxWidth: 760, backgroundColor: 'rgba(8,6,16,0.78)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.45)', paddingHorizontal: 18, paddingVertical: 10 },
  speaker: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 1, marginBottom: 3 },
  captionText: { color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 22 },
  titleWrap: { position: 'absolute', left: 0, right: 0, top: '30%', alignItems: 'center', paddingHorizontal: 24 },
  title: { color: '#FFD700', fontSize: 30, fontWeight: '900', letterSpacing: 3, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.85)', textShadowRadius: 8 },
  subtitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 8, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.85)', textShadowRadius: 6 },
  dots: { position: 'absolute', top: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 14, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotOn: { backgroundColor: '#FFD700' },
  dotPast: { backgroundColor: 'rgba(255,255,255,0.7)' },
  skip: { position: 'absolute', right: 16, bottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.45)' },
  skipText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});
