import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { getPlayingMusic, playMusic, setAudioPaused } from '@/game/audio/audioManager';
import { getSettings } from '@/game/state/settingsState';
import { useI18n } from '@/game/i18n/i18n';
import { CUTSCENE_ASSETS } from './cutsceneAssets';

/** Se o vídeo não ficar pronto neste tempo (arquivo ruim, sem codec), a cena é pulada em vez de travar. */
const LOAD_TIMEOUT_MS = 10000;

interface Props {
  /** id da cutscene (nome do arquivo em assets/cutscenes). */
  id: string;
  /** Chamado UMA vez: ao terminar, ao pular ou se o vídeo não puder tocar. */
  onDone: () => void;
}

/**
 * Toca um vídeo pré-renderizado em tela cheia (decodificação nativa, sem animação por código).
 * PULAR fica sempre visível. Nunca trava: erro, arquivo ausente ou carregamento lento chamam onDone.
 * Durante o vídeo a música/ambiente do jogo ficam em silêncio e voltam ao fim.
 */
export function CutscenePlayer({ id, onDone }: Props) {
  const { t } = useI18n();
  const source = CUTSCENE_ASSETS[id] ?? null;
  const doneRef = useRef(false);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);
  const [ready, setReady] = useState(false);

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.muted = false;
    const s = getSettings();
    // Volume das Opções: o vídeo mistura música e efeitos, então usa o maior dos dois controles.
    p.volume = Math.max(s.musicVolume, s.sfxVolume);
    p.keepScreenOnWhilePlaying = true;
    p.play();
  });

  // música/ambiente do mundo em silêncio enquanto o vídeo toca; volta ao terminar
  useEffect(() => {
    const prev = getPlayingMusic();
    playMusic(null);
    setAudioPaused(true);
    return () => {
      setAudioPaused(false);
      playMusic(prev);
    };
  }, []);

  useEffect(() => {
    if (!source) finish();
  }, [source, finish]);

  useEffect(() => {
    const subEnd = player.addListener('playToEnd', finish);
    const subStatus = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') setReady(true);
      if (status === 'error') finish();
    });
    const timer = setTimeout(() => {
      if (!ready && player.status !== 'readyToPlay') finish();
    }, LOAD_TIMEOUT_MS);
    const app = AppState.addEventListener('change', (st) => {
      try {
        if (st === 'active') player.play();
        else player.pause();
      } catch {
        // player já liberado
      }
    });
    return () => {
      subEnd.remove();
      subStatus.remove();
      clearTimeout(timer);
      app.remove();
    };
  }, [player, finish, ready]);

  // Na web o navegador pode bloquear o autoplay com som: um toque na tela inicia/retoma.
  const tapToPlay = () => {
    try {
      if (!player.playing) player.play();
    } catch {
      // ignorado
    }
  };

  return (
    <View style={styles.root} testID="cutscene-player">
      <Pressable style={StyleSheet.absoluteFill} onPress={tapToPlay}>
        <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls={false} contentFit="contain" allowsPictureInPicture={false} />
      </Pressable>
      <Pressable style={styles.skip} onPress={finish} testID="cutscene-skip" hitSlop={10}>
        <Text style={styles.skipText}>{t('ending_skip')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  skip: { position: 'absolute', right: 16, bottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.5)' },
  skipText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});
