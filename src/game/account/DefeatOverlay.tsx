import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { MenuButton } from '@/game/menu/MenuButton';
import { useI18n } from '@/game/i18n/i18n';
import { CURRENCY_ABBR } from '@/game/items/itemDefs';
import { playSfx } from '@/game/audio/audioManager';
import { haptic } from '@/game/audio/haptics';

/**
 * Tela de DERROTA (mundo e lutas de história/Torre): animação de queda -> escolha.
 *  - REVIVER (Diamond Meme): animação de renascimento (clarão dourado + anel) e volta à ação com 100% de vida, no mesmo estado.
 *  - Recusar: paga a taxa em Meme Coins (pode ficar negativa) e volta ao checkpoint.
 * Quem usa decide o que "reviver" e "recusar" fazem de verdade; aqui só há a apresentação e a escolha.
 */
interface Props {
  /** taxa que será cobrada se recusar (0 = esta derrota não cobra, ex.: Torre) */
  fee: number;
  coins: number;
  diamonds: number;
  reviveCost: number;
  declineLabel: string;
  /** cobra os diamantes; false = sem saldo */
  onRevive: () => boolean;
  /** chamado no pico do clarão: é aqui que o personagem volta de verdade */
  onRevived: () => void;
  onDecline: () => void;
  /** Texto pronto de como/por quem o jogador morreu (deathCause.ts). Sem ele vale o aviso genérico. */
  cause?: string | null;
}

const native = Platform.OS !== 'web';
const DEFEAT_MS = 1100;
const REBIRTH_MS = 1500;

export function DefeatOverlay({ fee, coins, diamonds, reviveCost, declineLabel, onRevive, onRevived, onDecline, cause }: Props) {
  const { t } = useI18n();
  const [stage, setStage] = useState<'defeat' | 'choice' | 'rebirth'>('defeat');
  const dim = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(2.4)).current;
  const titleTilt = useRef(new Animated.Value(0)).current;
  const panel = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const revivedRef = useRef(false);

  useEffect(() => {
    playSfx('hit_flesh');
    haptic('heavy');
    Animated.parallel([
      Animated.timing(dim, { toValue: 1, duration: 700, useNativeDriver: native }),
      Animated.spring(titleScale, { toValue: 1, friction: 5, tension: 70, useNativeDriver: native }),
      Animated.sequence([
        Animated.timing(titleTilt, { toValue: 1, duration: 120, useNativeDriver: native }),
        Animated.timing(titleTilt, { toValue: -1, duration: 160, useNativeDriver: native }),
        Animated.timing(titleTilt, { toValue: 0, duration: 200, useNativeDriver: native }),
      ]),
    ]).start();
    const id = setTimeout(() => {
      setStage('choice');
      Animated.timing(panel, { toValue: 1, duration: 350, useNativeDriver: native }).start();
    }, DEFEAT_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revive = () => {
    if (stage !== 'choice' || revivedRef.current) return;
    if (!onRevive()) return;
    revivedRef.current = true;
    setStage('rebirth');
    playSfx('levelup');
    haptic('success');
    Animated.parallel([
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: REBIRTH_MS * 0.4, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        Animated.timing(flash, { toValue: 0, duration: REBIRTH_MS * 0.6, easing: Easing.in(Easing.quad), useNativeDriver: native }),
      ]),
      Animated.timing(ring, { toValue: 1, duration: REBIRTH_MS, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.timing(rise, { toValue: 1, duration: REBIRTH_MS, useNativeDriver: native }),
      Animated.timing(dim, { toValue: 0, duration: REBIRTH_MS * 0.9, useNativeDriver: native }),
      Animated.timing(panel, { toValue: 0, duration: 200, useNativeDriver: native }),
    ]).start();
    setTimeout(onRevived, REBIRTH_MS * 0.4); // o personagem volta quando o clarão está no máximo
  };

  const canRevive = diamonds >= reviveCost;
  const after = coins - fee;
  const tilt = titleTilt.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] });
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.1, 3.2] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.9, 0.6, 0] });
  const riseY = rise.interpolate({ inputRange: [0, 1], outputRange: [30, -50] });
  const riseOpacity = rise.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] });

  return (
    <View style={styles.root} testID="defeat-overlay">
      <Animated.View style={[styles.dim, { opacity: dim }]} />
      {stage !== 'rebirth' && (
        <Animated.Text style={[styles.title, cause ? styles.titleCause : null, { transform: [{ scale: titleScale }, { rotate: tilt }] }]} testID="defeat-title" numberOfLines={4}>
          {cause ?? t('death_title')}
        </Animated.Text>
      )}
      {stage !== 'defeat' && (
        <Animated.View style={[styles.panel, { opacity: panel }]} pointerEvents={stage === 'choice' ? 'auto' : 'none'}>
          {fee > 0 && (
            <>
              <Text style={styles.line}>
                {t('death_fee')}: <Text style={styles.red}>-{fee} {CURRENCY_ABBR}</Text>
              </Text>
              <Text style={styles.small}>
                {t('death_balance')}: <Text style={after < 0 ? styles.red : styles.gold}>{after} {CURRENCY_ABBR}</Text>
                {after < 0 ? `  (${t('death_debt')})` : ''}
              </Text>
            </>
          )}
          <Text style={[styles.small, { marginTop: 8 }]}>
            💎 {diamonds} {t('death_diamonds')}
          </Text>
          <View style={{ height: 14 }} />
          <MenuButton label={`${t('death_revive')} · ${reviveCost} 💎`} onPress={revive} disabled={!canRevive} />
          <Text style={styles.hint}>{canRevive ? t('death_revive_hint') : t('death_no_diamonds')}</Text>
          <View style={{ height: 10 }} />
          <MenuButton label={declineLabel} variant="ghost" onPress={onDecline} />
        </Animated.View>
      )}
      {stage === 'rebirth' && (
        <>
          <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
          <Animated.Text style={[styles.reborn, { opacity: riseOpacity, transform: [{ translateY: riseY }] }]} testID="rebirth-text">
            {t('death_reborn')}
          </Animated.Text>
          <Animated.View style={[styles.flash, { opacity: flash }]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(60,0,0,0.82)' },
  title: { color: '#FF5A4A', fontWeight: '900', fontSize: 44, letterSpacing: 3, marginBottom: 18, textShadowColor: '#000', textShadowRadius: 8, textShadowOffset: { width: 0, height: 3 } },
  // Aviso de causa é uma frase (não uma palavra só): fonte menor, centralizada e sem inclinar demais.
  titleCause: { fontSize: 26, letterSpacing: 0.5, lineHeight: 32, textAlign: 'center', paddingHorizontal: 24, maxWidth: 560 },
  panel: { alignItems: 'center', paddingHorizontal: 20 },
  line: { color: '#fff', fontSize: 17, fontWeight: '700' },
  small: { color: '#ddd', fontSize: 14, fontWeight: '600', marginTop: 4 },
  red: { color: '#FF6B5A', fontWeight: '800' },
  gold: { color: '#FFD700', fontWeight: '800' },
  hint: { color: '#bbb', fontSize: 12, marginTop: 6, textAlign: 'center', maxWidth: 280 },
  ring: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 6, borderColor: '#FFE08A' },
  reborn: { position: 'absolute', color: '#FFF3B0', fontWeight: '900', fontSize: 38, letterSpacing: 3, textShadowColor: '#B8860B', textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
  flash: { ...StyleSheet.absoluteFill, backgroundColor: '#FFF6CF' },
});
