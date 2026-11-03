import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { getSprite, SPRITE_ASPECTS } from '@/game/battle/sprites';
import { getBodySprite } from '@/game/cosmetics/CosmeticLayers';
import { WeatherLayer } from '@/game/world/WeatherLayer';
import { GameIcon } from '@/game/ui/GameIcon';
import type { IconName } from '@/game/ui/iconRegistry';
import { CREDITS, ENDING_TEXT, computeEnding } from '@/game/story/storyEnding';
import { getEnding, setEnding, type Ending } from '@/game/state/storyFlags';
import { getLang, useI18n } from '@/game/i18n/i18n';
import { playSfx } from '@/game/audio/audioManager';

/* eslint-disable @typescript-eslint/no-require-imports */
const BG = {
  stage1: require('../../assets/legacy-art/stages/stage1.webp'),
  stage2: require('../../assets/legacy-art/stages/stage2.webp'),
  stage3: require('../../assets/legacy-art/stages/stage3.webp'),
};
/* eslint-enable @typescript-eslint/no-require-imports */
const LANGS = ['pt', 'en', 'es', 'fr', 'ja'] as const;

/** Um personagem na cena: posição (fração da tela), altura (fração) e espelhamento. */
interface Actor {
  char: string;
  x: number;
  y: number;
  h: number;
  flip?: boolean;
  skin?: string | null;
  opacity?: number;
}
interface Scene {
  bg: keyof typeof BG;
  tint: string;
  actors: Actor[];
  icons: { name: IconName; x: number; y: number; size: number }[];
  weather?: 'rain' | null;
}

const SCENES: Record<Ending, Scene> = {
  union: {
    bg: 'stage1',
    tint: 'rgba(255,230,160,0.12)',
    actors: [
      { char: 'gadigago', x: 0.2, y: 0.84, h: 0.34 },
      { char: 'soldier', x: 0.34, y: 0.84, h: 0.3 },
      { char: 'dogge', x: 0.5, y: 0.86, h: 0.42 },
      { char: 'dogking', x: 0.66, y: 0.84, h: 0.32, flip: true },
      { char: 'mystic', x: 0.8, y: 0.84, h: 0.3, flip: true },
    ],
    icons: [
      { name: 'house', x: 0.08, y: 0.3, size: 34 },
      { name: 'sparkle', x: 0.3, y: 0.2, size: 26 },
      { name: 'heart', x: 0.5, y: 0.18, size: 34 },
      { name: 'sparkle', x: 0.72, y: 0.22, size: 26 },
      { name: 'boat', x: 0.9, y: 0.32, size: 34 },
    ],
  },
  glory: {
    bg: 'stage2',
    tint: 'rgba(255,200,60,0.1)',
    actors: [
      { char: 'ninja', x: 0.15, y: 0.8, h: 0.26 },
      { char: 'orc', x: 0.28, y: 0.82, h: 0.24 },
      { char: 'dogge', x: 0.5, y: 0.82, h: 0.46 },
      { char: 'gadigago', x: 0.74, y: 0.82, h: 0.3, flip: true },
      { char: 'soldier', x: 0.86, y: 0.8, h: 0.26, flip: true },
    ],
    icons: [
      { name: 'trophy', x: 0.5, y: 0.14, size: 54 },
      { name: 'flag', x: 0.3, y: 0.2, size: 34 },
      { name: 'flag', x: 0.7, y: 0.2, size: 34 },
      { name: 'star', x: 0.42, y: 0.28, size: 24 },
      { name: 'star', x: 0.58, y: 0.28, size: 24 },
    ],
  },
  power: {
    bg: 'stage1',
    tint: 'rgba(25,0,45,0.66)',
    actors: [
      { char: 'shadow_dragon', x: 0.5, y: 0.7, h: 0.7, opacity: 0.35 },
      { char: 'dogge', x: 0.5, y: 0.86, h: 0.44, skin: 'skin_sombra' },
    ],
    icons: [
      { name: 'crown', x: 0.5, y: 0.2, size: 48 },
      { name: 'skull', x: 0.22, y: 0.3, size: 26 },
      { name: 'skull', x: 0.78, y: 0.3, size: 26 },
    ],
    weather: 'rain',
  },
};

/** Tela de FINAL (Parte 38): cena, 5 falas, título e créditos. O final vem das escolhas e das missões secretas. */
export function EndingScreen() {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const ending = useMemo<Ending>(() => getEnding() ?? computeEnding(), []);
  const lang = LANGS.indexOf(getLang() as (typeof LANGS)[number]);
  const text = ENDING_TEXT[ending];
  const scene = SCENES[ending];
  // 0 = título; 1..n = falas; n+1..n+3 = créditos
  const total = 1 + text.lines.length + CREDITS.length;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!getEnding()) setEnding(ending);
    playSfx('levelup');
  }, [ending]);
  useEffect(() => {
    if (step >= total - 1) return;
    const id = setTimeout(() => setStep((s) => Math.min(total - 1, s + 1)), step === 0 ? 4200 : 6500);
    return () => clearTimeout(id);
  }, [step, total]);

  const next = () => {
    playSfx('ui_hover', { gain: 0.6 });
    if (step < total - 1) setStep(step + 1);
  };
  const last = step >= total - 1;
  const label = step === 0 ? text.title[lang] : step <= text.lines.length ? text.lines[step - 1][lang] : CREDITS[step - 1 - text.lines.length][lang];
  const isTitle = step === 0 || step > text.lines.length;

  return (
    <Pressable style={styles.root} onPress={next}>
      <Image source={BG[scene.bg]} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width, height }} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: scene.tint }]} pointerEvents="none" />
      {scene.weather && <WeatherLayer width={width} height={height} weather="rain" flashKey={0} intensity={0.7} />}
      {scene.icons.map((ic, i) => (
        <View key={i} style={{ position: 'absolute', left: ic.x * width - ic.size / 2, top: ic.y * height - ic.size / 2 }} pointerEvents="none">
          <GameIcon name={ic.name} size={ic.size} />
        </View>
      ))}
      {scene.actors.map((a, i) => {
        const key = a.char;
        const aspect = SPRITE_ASPECTS[key as keyof typeof SPRITE_ASPECTS]?.idle ?? 0.8;
        const h = a.h * height;
        const src = a.skin && (key === 'dogge' || key === 'gadigago') ? getBodySprite(key, 'idle', a.skin) : getSprite(key as never, 'idle');
        return (
          <Image
            key={i}
            source={src}
            resizeMode="contain"
            style={{ position: 'absolute', left: a.x * width - (h * aspect) / 2, top: a.y * height - h, width: h * aspect, height: h, opacity: a.opacity ?? 1, transform: [{ scaleX: a.flip ? -1 : 1 }] }}
          />
        );
      })}
      <View style={styles.captionWrap} pointerEvents="none">
        <Text style={[styles.caption, isTitle && styles.captionTitle]}>{label}</Text>
      </View>
      {last && (
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>{t('ending_back')}</Text>
        </Pressable>
      )}
      {!last && (
        <Pressable style={styles.skip} onPress={() => setStep(total - 1)}>
          <Text style={styles.skipText}>{t('ending_skip')}</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  captionWrap: { position: 'absolute', left: 0, right: 0, top: 14, alignItems: 'center', paddingHorizontal: 24 },
  caption: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, overflow: 'hidden', maxWidth: 700 },
  captionTitle: { color: '#FFD700', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  btn: { position: 'absolute', bottom: 14, alignSelf: 'center', backgroundColor: '#FFD700', borderRadius: 12, paddingHorizontal: 22, paddingVertical: 9 },
  btnText: { color: '#1a1200', fontWeight: '900', letterSpacing: 1 },
  skip: { position: 'absolute', right: 14, bottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.4)' },
  skipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
