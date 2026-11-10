import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { playSfx } from '@/game/audio/audioManager';
import { getSprite, SPRITE_ASPECTS } from '@/game/battle/sprites';
import type { CharacterKey } from '@/game/battle/Fighter';
import { STAGE_ART } from '@/game/menu/art';
import { useI18n } from '@/game/i18n/i18n';
import { CHAR_LABEL } from './fighterLabels';
import { SPLASH_MS, SPLASH_T, splashFrame } from './versusLogic';

interface Props {
  p1: CharacterKey;
  p2: CharacterKey;
  p2Label: string;
  stageKey: string;
  stageName: string;
  onDone: () => void;
}

const P1_COLOR = '#4aa3ff';
const P2_COLOR = '#ff5a4a';

/**
 * Tela "VS" antes da luta (estilo Mortal Kombat): a arena escurecida ao fundo, os dois lutadores deslizam dos lados,
 * "VS" estoura no meio com um clarão, os nomes entram e a tela escurece para abrir o round. Toque pula.
 */
export function VersusSplash({ p1, p2, p2Label, stageKey, stageName, onDone }: Props) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const [now, setNow] = useState(0);
  const doneRef = useRef(false);
  const finish = useRef(onDone);
  finish.current = onDone;

  useEffect(() => {
    let raf = 0;
    const t0 = Date.now();
    let hit = false;
    playSfx('encounter');
    const loop = () => {
      const el = Date.now() - t0;
      setNow(el);
      if (!hit && el >= SPLASH_T.vsHit) {
        hit = true;
        playSfx('hit_heavy');
      }
      if (el >= SPLASH_MS) {
        if (!doneRef.current) {
          doneRef.current = true;
          finish.current();
        }
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const f = splashFrame(now);
  const skip = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    finish.current();
  };

  const art = Math.min(height * 0.62, width * 0.34);
  const asp = (k: CharacterKey) => SPRITE_ASPECTS[k]?.portrait ?? SPRITE_ASPECTS[k]?.idle ?? 1;
  const fighterStyle = (k: CharacterKey) => ({ height: art, width: art * asp(k) });
  const off = width * 0.5;
  const px = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as never) : null;

  return (
    <Pressable style={styles.root} onPress={skip} testID="vs-splash">
      {STAGE_ART[stageKey] ? <Image source={STAGE_ART[stageKey]} style={[StyleSheet.absoluteFill, { opacity: 0.55 * (0.4 + 0.6 * f.names) }]} resizeMode="cover" /> : null}
      <View style={styles.shade} />
      <View style={[styles.side, { left: width * 0.06, transform: [{ translateX: -off * (1 - f.slide) }] }]}>
        <Image source={getSprite(p1, 'portrait')} style={[fighterStyle(p1), px]} resizeMode="contain" fadeDuration={0} />
        <Text style={[styles.tag, { backgroundColor: P1_COLOR }]}>P1</Text>
        <Text style={[styles.name, { opacity: f.names }]} testID="vs-name-left">{CHAR_LABEL[p1]}</Text>
      </View>
      <View style={[styles.side, { right: width * 0.06, transform: [{ translateX: off * (1 - f.slide) }] }]}>
        <Image source={getSprite(p2, 'portrait')} style={[fighterStyle(p2), { transform: [{ scaleX: -1 }] }, px]} resizeMode="contain" fadeDuration={0} />
        <Text style={[styles.tag, { backgroundColor: P2_COLOR }]}>{p2Label}</Text>
        <Text style={[styles.name, { opacity: f.names }]} testID="vs-name-right">{CHAR_LABEL[p2]}</Text>
      </View>
      <View style={styles.vsWrap} pointerEvents="none">
        <Text style={[styles.vs, { opacity: f.vsScale > 0 ? 1 : 0, transform: [{ scale: f.vsScale }] }]} testID="vs-big">VS</Text>
        <Text style={[styles.stage, { opacity: f.names }]}>{stageName}</Text>
      </View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: f.flash * 0.85 }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: f.fadeOut }]} />
      <Text style={[styles.skip, { opacity: f.names * 0.8 }]}>{t('vs_skip')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill as object, backgroundColor: '#0a0612', zIndex: 50 },
  shade: { ...StyleSheet.absoluteFill as object, backgroundColor: 'rgba(8,4,16,0.55)' },
  side: { position: 'absolute', top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tag: { color: '#fff', fontWeight: '900', fontSize: 14, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  name: { color: '#FFD700', fontWeight: '900', fontSize: 22, textShadowColor: '#000', textShadowRadius: 6, textAlign: 'center' },
  vsWrap: { ...StyleSheet.absoluteFill as object, alignItems: 'center', justifyContent: 'center' },
  vs: { color: '#FFD700', fontWeight: '900', fontSize: 96, textShadowColor: '#c1421b', textShadowRadius: 14, textShadowOffset: { width: 0, height: 4 } },
  stage: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 2, marginTop: 4 },
  skip: { position: 'absolute', bottom: 14, alignSelf: 'center', color: '#cfd6f5', fontSize: 11 },
});
