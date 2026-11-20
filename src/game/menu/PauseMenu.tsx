import { playSfx } from '@/game/audio/audioManager';
import { HUD_ART } from '@/game/hud/hudArt';
import React, { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ButtonColumn, MenuButton } from './MenuButton';
import { useI18n } from '@/game/i18n/i18n';
import { getSession, getPlayTimeMs, formatPlayTime } from '@/game/state/session';
import { DIFFICULTY_PARAMS } from '@/game/state/difficulty';
import { useButtonRects, withAlpha } from '@/game/input/controlsLayout';
import { computeProgress } from '@/game/state/progressState';
import { GameIcon } from '@/game/ui/GameIcon';
import { COIN_PACKS } from '@/game/account/accountConfig';
import { exchangeForCoins } from '@/game/account/exchange';
import { useAccount } from '@/game/account/accountState';
import { usePlayerState } from '@/game/state/playerState';

interface Props {
  visible: boolean;
  onResume: () => void;
  /** Writes the save file (position, quests, coins, inventory, lore) and
   * resolves whether it worked. Navigation is handled by PauseMenu itself
   * below (only for SALVAR E SAIR, and only once the save actually
   * succeeded) - the caller just needs to implement the write. */
  onSave: () => Promise<boolean>;
  /** Called after a successful save from the SALVAR E SAIR button - in
   * practice this navigates to the main menu (router.push('/')). Kept
   * external instead of importing `router` here so PauseMenu doesn't have
   * to assume it's only ever used from the world screen. */
  onExit: () => void;
}

export function PauseMenu({ visible, onResume, onSave, onExit }: Props) {
  const { t } = useI18n();
  // "Salvar" shows its result INSIDE this card - a toast on the screen
  // behind it wouldn't be visible, since RN's <Modal> renders in its own
  // native layer on top of everything else.
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'fail'>('idle');
  // CÂMBIO: troca Diamond Meme (conta) por Meme Coins deste mundo.
  const account = useAccount();
  const { coins } = usePlayerState();
  const [exchange, setExchange] = useState(false);
  const [exMsg, setExMsg] = useState<string | null>(null);
  const doExchange = (packId: string) => {
    const got = exchangeForCoins(packId);
    setExMsg(got > 0 ? `${t('exchange_done')} +${got}` : t('exchange_poor'));
  };

  const handleSave = async () => {
    if (status === 'saving') return;
    setStatus('saving');
    const ok = await onSave();
    setStatus(ok ? 'ok' : 'fail');
    setTimeout(() => setStatus('idle'), 1800);
  };

  const handleSaveAndExit = async () => {
    if (status === 'saving') return;
    setStatus('saving');
    const ok = await onSave();
    if (ok) {
      onExit(); // screen changes right after - no need to show the message
    } else {
      setStatus('fail');
      setTimeout(() => setStatus('idle'), 1800);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onResume}>
      <View style={styles.bg}>
        <View style={styles.card}>
          <Text style={styles.title}>{exchange ? t('exchange_title') : t('pause_title')}</Text>
          {exchange ? (
            <View style={{ alignItems: 'center', gap: 10 }} testID="exchange-panel">
              <Text style={styles.world}>
                💎 {account.diamonds}   ·   {coins} MC
              </Text>
              {COIN_PACKS.map((p) => (
                <MenuButton key={p.id} label={`${p.diamonds} 💎  →  ${p.coins} MC`} variant="ghost" onPress={() => doExchange(p.id)} disabled={account.diamonds < p.diamonds} />
              ))}
              {exMsg && <Text style={styles.status}>{exMsg}</Text>}
              <MenuButton label={t('exchange_back')} onPress={() => { setExchange(false); setExMsg(null); }} />
            </View>
          ) : (
          <>
          {visible && getSession() && (
            <View style={styles.worldRow}>
              <Text style={[styles.world, { color: DIFFICULTY_PARAMS[getSession()!.difficulty].color }]}>
                {getSession()!.name} · {t(`difficulty_${getSession()!.difficulty}`)} · {formatPlayTime(getPlayTimeMs())} ·
              </Text>
              <GameIcon name="trophy" size={14} />
              <Text style={[styles.world, { color: DIFFICULTY_PARAMS[getSession()!.difficulty].color }]}>{computeProgress().percent}%</Text>
            </View>
          )}
          <View style={styles.cols}>
            <ButtonColumn>
              <MenuButton label={t('pause_resume')} onPress={onResume} />
              <MenuButton label={t('pause_save')} variant="ghost" onPress={handleSave} disabled={status === 'saving'} />
              <MenuButton label={t('pause_missions')} variant="ghost" onPress={() => router.push('/missions' as never)} />
              <MenuButton label={t('pause_status')} variant="ghost" onPress={() => router.push('/status' as never)} />
            </ButtonColumn>
            <ButtonColumn>
              <MenuButton label={t('pause_options')} variant="ghost" onPress={() => router.push('/options')} />
              <MenuButton label={t('pause_inventory')} variant="ghost" onPress={() => router.push('/inventory')} />
              <MenuButton label={t('exchange_button')} variant="ghost" onPress={() => setExchange(true)} />
              <MenuButton label={t('pause_save_exit')} variant="danger" onPress={handleSaveAndExit} disabled={status === 'saving'} />
            </ButtonColumn>
          </View>
          {(status === 'ok' || status === 'fail') && (
            <Text style={[styles.status, status === 'fail' && styles.statusFail]}>{t(status === 'ok' ? 'save_success' : 'save_fail')}</Text>
          )}
          </>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** The pause button, placed/sized/coloured by the player's saved controls
 * layout ("EDITAR CONTROLES"). Renders nothing if the player removed it. */
export function PauseButton({ onPress, inert }: { onPress: () => void; inert?: boolean }) {
  const rect = useButtonRects().pause;
  if (rect.layout.hidden && !inert) return null;
  const color = rect.layout.color ?? '#FFD700';
  const k = rect.size / 56;
  if (!rect.layout.color) {
    // Arte do layout novo: círculo cinza com as duas barras brancas (só quando o jogador não recolorou o botão).
    const s = rect.size * 1.12;
    return (
      <Pressable
        style={{ position: 'absolute', left: rect.cx - s / 2, top: rect.cy - s / 2, width: s, height: s }}
        onPress={() => {
          playSfx('pause');
          onPress();
        }}
        hitSlop={12}
        testID="pause-button"
      >
        <Image source={HUD_ART.pause} resizeMode="contain" style={{ width: s, height: s }} />
      </Pressable>
    );
  }
  return (
    <Pressable
      style={[
        styles.pauseBtn,
        { left: rect.cx - rect.size / 2, top: rect.cy - rect.size / 2, width: rect.size, height: rect.size, borderRadius: 14 * k },
        rect.layout.color ? { borderColor: color, backgroundColor: withAlpha(color, 0.25) } : null,
      ]}
      onPress={() => {
        playSfx('pause');
        onPress();
      }}
      hitSlop={12}
    >
      <View style={[styles.pauseBars, { gap: 6 * k }]}>
        <View style={[styles.pauseBar, { width: 7 * k, height: 22 * k, backgroundColor: color }]} />
        <View style={[styles.pauseBar, { width: 7 * k, height: 22 * k, backgroundColor: color }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cols: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  card: {
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 16,
    backgroundColor: '#151022',
    paddingVertical: 20,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 14,
  },
  title: { color: '#FFD700', fontWeight: '800', fontSize: 22, letterSpacing: 2 },
  worldRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -12 },
  world: { fontWeight: '700', fontSize: 12 },
  status: { color: '#9be89b', fontWeight: '700', fontSize: 13, marginTop: -8 },
  statusFail: { color: '#ff8a65' },
  pauseBtn: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.7)',
    backgroundColor: 'rgba(10,10,18,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBars: { flexDirection: 'row', gap: 6 },
  pauseBar: { width: 7, height: 22, backgroundColor: '#FFD700', borderRadius: 2 },
});
