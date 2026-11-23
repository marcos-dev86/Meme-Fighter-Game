import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { getAccount } from '@/game/account/accountState';
import { playMusic, getPlayingMusic, playSfx, setAmbient, stopAmbients } from '@/game/audio/audioManager';
import type { AmbientKey, MusicKey, SfxKey } from '@/game/audio/audioAssets';
import { SPRITE_ASPECTS, getSprite } from '@/game/battle/sprites';
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
import { useI18n } from '@/game/i18n/i18n';
import { beatDuration, type CodeActor, type CodeBeat, type CodeCutscene } from './codeCutscenes';
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

function BeatView({ beat, lang, name, onTap }: { beat: CodeBeat; lang: string; name: string; onTap: () => void }) {
  const { width, height } = useWindowDimensions();
  const dur = beatDuration(beat);
  const text = resolveCutsceneText(beat.text, lang, name, CUTSCENE_TEXTS);
  const speaker = resolveCutsceneText(beat.speaker, lang, name, CUTSCENE_TEXTS);
  const title = resolveCutsceneText(beat.title, lang, name, CUTSCENE_TEXTS);
  const subtitle = resolveCutsceneText(beat.subtitle, lang, name, CUTSCENE_TEXTS);
  const [shown, setShown] = useState(0);
  const typedAll = shown >= text.length;
  const bg = useMemo(() => resolveBg(beat.bg), [beat.bg]);

  // digitação da fala
  useEffect(() => {
    if (!text) return;
    const id = setInterval(() => setShown((n) => (n >= text.length ? n : n + 1)), TYPE_MS);
    return () => clearInterval(id);
  }, [text]);

  // sons do quadro (cada um no seu instante)
  useEffect(() => {
    const ids = (beat.sfx ?? []).map((s) => setTimeout(() => playSfx(s.key as SfxKey, { gain: s.vol ?? 1 }), s.at));
    return () => ids.forEach(clearTimeout);
  }, [beat]);

  const zoom = useSharedValue(1);
  const flash = useSharedValue(0);
  const shake = useSharedValue(0);
  const dark = useSharedValue(0);
  const fade = useSharedValue(0);
  const cut = useSharedValue(beat.shot ? 1 : 0);
  useEffect(() => {
    const fx = beat.fx ?? [];
    zoom.value = withTiming(fx.includes('zoom') ? 1.14 : 1.05, { duration: dur + 600, easing: Easing.linear });
    fade.value = withTiming(1, { duration: 380 });
    if (beat.shot) cut.value = withTiming(0, { duration: 700 });
    if (fx.includes('flash')) flash.value = withSequence(withTiming(0.85, { duration: 60 }), withTiming(0, { duration: 520 }));
    if (fx.includes('shake')) shake.value = withSequence(...Array.from({ length: 8 }, (_, i) => withTiming(i % 2 ? 10 : -10, { duration: 55 })), withTiming(0, { duration: 55 }));
    if (fx.includes('darken')) dark.value = withTiming(0.38, { duration: 500 });
  }, [beat, dur, zoom, flash, shake, dark, fade, cut]);

  const bgStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }, { translateX: shake.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const darkStyle = useAnimatedStyle(() => ({ opacity: dark.value }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cutStyle = useAnimatedStyle(() => ({ opacity: cut.value }));
  const bar = Math.round(height * 0.09);

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={() => (!typedAll ? setShown(text.length) : onTap())}>
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        {bg.kind === 'scene' ? (
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
      {(beat.actors ?? []).map((a, i) => (
        <Actor key={i} a={a} width={width} height={height} entering={!!beat.shot} />
      ))}

      {title ? (
        <Animated.View pointerEvents="none" style={[styles.titleWrap, fadeStyle]}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </Animated.View>
      ) : null}

      <View pointerEvents="none" style={[styles.bar, { top: 0, height: bar }]} />
      <View pointerEvents="none" style={[styles.bar, { bottom: 0, height: bar }]} />

      {text ? (
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

/** Entrada e movimento de um personagem: desliza de fora da tela, aparece aos poucos e balança parado. */
function useActorMotion(a: CodeActor, width: number, h: number, entering: boolean) {
  const enter = a.enter ?? (entering ? 'fade' : 'none');
  const startX = enter === 'left' ? -width * 0.3 : enter === 'right' ? width * 0.3 : 0;
  const startY = enter === 'bottom' ? h * 0.6 : 0;
  const p = useSharedValue(enter === 'none' ? 1 : 0);
  const loop = useSharedValue(0);
  useEffect(() => {
    if (enter !== 'none') p.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    const anim = a.anim ?? 'bob';
    if (anim === 'bob') loop.value = withDelay(400, withRepeat(withSequence(withTiming(-4, { duration: 700 }), withTiming(0, { duration: 700 })), -1, false));
    else if (anim === 'jump') loop.value = withDelay(400, withRepeat(withSequence(withTiming(-h * 0.1, { duration: 260, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }), withTiming(0, { duration: 600 })), -1, false));
    else if (anim === 'shake') loop.value = withRepeat(withSequence(withTiming(-3, { duration: 60 }), withTiming(3, { duration: 60 })), -1, false);
    return () => {
      cancelAnimation(loop);
      cancelAnimation(p);
    };
  }, [a.anim, enter, h, p, loop]);
  return useAnimatedStyle(() => {
    const shaking = (a.anim ?? 'bob') === 'shake';
    return {
      opacity: (a.opacity ?? 1) * p.value,
      transform: [{ translateX: (1 - p.value) * startX + (shaking ? loop.value : 0) }, { translateY: (1 - p.value) * startY + (shaking ? 0 : loop.value) }],
    };
  });
}

function Actor({ a, width, height, entering }: { a: CodeActor; width: number; height: number; entering: boolean }) {
  if (a.kind === 'npc') return <NpcActor a={a} width={width} height={height} entering={entering} />;
  if (a.kind === 'icon') return <IconActor a={a} width={width} height={height} entering={entering} />;
  return <FighterActor a={a} width={width} height={height} entering={entering} />;
}

function IconActor({ a, width, height, entering }: { a: CodeActor; width: number; height: number; entering: boolean }) {
  const size = a.h * height;
  const style = useActorMotion(a, width, size, entering);
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: a.x * width - size / 2, top: a.y * height - size / 2 }, style]}>
      <GameIcon name={a.char as IconName} size={size} />
    </Animated.View>
  );
}

/** NPC do pacote (c08...): o tamanho é a escala do sprite original, como no vídeo antigo (1280x720). */
function NpcActor({ a, width, height, entering }: { a: CodeActor; width: number; height: number; entering: boolean }) {
  const k = height / 720;
  const walkSheet = hasWalkSheet(a.char);
  const sheet = NPC_SHEET[a.char];
  const scale = (walkSheet ? a.h * k : 4 * a.h * k) / 1.3;
  const w = walkSheet ? 128 * a.h * k : (sheet ? sheet.w * 4 : 128) * a.h * k;
  const h = walkSheet ? 192 * a.h * k : (sheet ? sheet.h * 4 : 128) * a.h * k;
  const style = useActorMotion(a, width, h, entering);
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: a.x * width - w / 2, top: a.y * height - h, width: w, height: h }, style]}>
      <View style={{ transform: [{ scaleX: a.flip ? -1 : 1 }] }}>
        <NpcSprite char={a.char} scale={scale} walk={{ facing: a.dir ?? 'down', walking: false, frame: 0 }} />
      </View>
    </Animated.View>
  );
}

/** Lutador. O personagem do jogador usa o corpo com a skin e os chapéus/capas vestidos (igual ao jogo). */
function FighterActor({ a, width, height, entering }: { a: CodeActor; width: number; height: number; entering: boolean }) {
  const rawPose = a.pose === 'walk' ? 'walk1' : (a.pose ?? 'idle');
  const wears = !!a.player && canWearCosmetics(a.char);
  const eq = getEquipped();
  const skin = wears ? eq.skin : null;
  // se a skin não tem essa pose, usa a parada (assim a skin e o chapéu nunca ficam em desacordo com o corpo)
  const pose = skin && !SKIN_SPRITES_V2[a.char]?.[skinFolder(skin)]?.[rawPose] ? 'idle' : rawPose;
  const aspect = SPRITE_ASPECTS[a.char as keyof typeof SPRITE_ASPECTS]?.[pose] ?? SPRITE_ASPECTS[a.char as keyof typeof SPRITE_ASPECTS]?.idle ?? 0.8;
  const h = a.h * height;
  const w = h * aspect;
  const style = useActorMotion(a, width, h, entering);
  const dir: 1 | -1 = a.flip ? -1 : 1;

  if (wears) {
    const boxW = h * 1.5;
    const box: PoseBox = { left: (boxW - w) / 2, top: h * 0.22, width: w, height: h };
    return (
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: a.x * width - boxW / 2, top: a.y * height - h * 1.22, width: boxW, height: h * 1.22 }, style]}>
        <CapeLayer characterKey={a.char} poseKey={pose} box={box} dir={dir} cosmeticId={eq.cape} />
        <Image source={getBodySprite(a.char, pose, skin)} resizeMode="stretch" style={{ position: 'absolute', left: box.left, top: box.top, width: w, height: h, transform: [{ scaleX: dir }] }} />
        <HatLayer characterKey={a.char} poseKey={pose} box={box} dir={dir} cosmeticId={eq.hat} />
      </Animated.View>
    );
  }
  return (
    <Animated.Image
      source={getSprite(a.char as never, pose)}
      resizeMode="contain"
      style={[{ position: 'absolute', left: a.x * width - w / 2, top: a.y * height - h, width: w, height: h, transform: [{ scaleX: dir }] }, style]}
    />
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
