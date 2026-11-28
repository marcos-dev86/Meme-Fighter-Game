import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { playSfx } from '@/game/audio/audioManager';
import type { CharacterKey } from '@/game/battle/Fighter';
import { useI18n } from '@/game/i18n/i18n';
import { GameIcon } from '@/game/ui/GameIcon';
import { MenuButton } from '@/game/menu/MenuButton';
import { getFighterRegistry, type FighterEntry } from './fighterRegistry';
import { canPick, firstPickable, gridLayout, moveCursor, type Dir } from './versusLogic';

type Mode = 'cpu' | '2p';
const P1_COLOR = '#4aa3ff';
const P2_COLOR = '#ff5a4a';
const GAP = 6;

interface Props {
  mode: Mode;
  /** Lutadores liberados na conta (vale para o Jogador 1 e, no 2 jogadores, para o Jogador 2). */
  unlocked: CharacterKey[];
  /** Lutadores já liberados pela história mas ainda não comprados (mostram o preço em diamantes e podem ser comprados aqui). */
  earned?: CharacterKey[];
  /** Diamantes que o jogador tem agora (só para avisar se falta saldo). */
  diamonds?: number;
  /** Preço em diamantes de um lutador à venda. */
  priceOf?: (key: CharacterKey) => number;
  /** Tenta comprar. true = comprou (o `unlocked` do pai passa a incluir o lutador). */
  onBuy?: (key: CharacterKey) => boolean;
  initialP1: CharacterKey;
  initialP2: CharacterKey;
  onDone: (p1: CharacterKey, p2: CharacterKey) => void;
  /** Registro de lutadores (padrão: o do jogo). Qualquer quantidade funciona; a grade se ajusta. */
  entries?: FighterEntry[];
  /**
   * ESCOLHA ÚNICA (Criar mundo da história): um só passo, sem Jogador 2. A prévia já abre no `initialP1`, o botão confirma e
   * `onDone(escolhido, escolhido)` é chamado. Mesma grade, mesmos dois toques e mesmo teclado do Versus.
   */
  single?: boolean;
  /** Título e etiqueta da prévia no modo de escolha única. */
  title?: string;
  tagText?: string;
  /** Painel extra à direita (telas largas) para o lutador em prévia: usado para mostrar história e habilidades. */
  detail?: (key: CharacterKey, maxHeight: number) => React.ReactNode;
}

const KEY_DIR: Record<string, Dir> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down',
};

/**
 * Seleção de lutadores do VERSUS (inspirada na organização clássica de seleção de lutadores):
 *  - grade de retratos com a LOGO do Meme Fighter no centro (a grade se divide em duas metades em volta dela);
 *  - DOIS TOQUES: o 1º toque seleciona (prévia ampliada à ESQUERDA com nome e barras de vida/velocidade/força), o 2º toque no mesmo
 *    lutador confirma; tocar em outro antes de confirmar só troca a prévia. Nunca confirma no primeiro toque;
 *  - sem hover; células de, no mínimo, 48 px; grade e prévia se ajustam a qualquer tela e a qualquer quantidade de lutadores;
 *  - teclado (web): setas/WASD movem a prévia, Enter/Espaço confirmam, Backspace volta ao Jogador 1.
 * Primeiro o Jogador 1 escolhe; depois o Jogador 2 (ou a CPU).
 */
export function FighterSelect({ mode, unlocked, earned, diamonds = 0, priceOf, onBuy, initialP1, initialP2, onDone, entries, single = false, title, tagText, detail }: Props) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const list = useMemo(() => entries ?? getFighterRegistry(), [entries]);
  const keys = useMemo(() => list.map((e) => e.key as string), [list]);
  const pool1: readonly string[] = unlocked;
  const pool2: readonly string[] = mode === 'cpu' ? keys : unlocked;
  const idxOf = (k: CharacterKey, pool: readonly string[]) => (pool.includes(k) && keys.includes(k) ? keys.indexOf(k) : firstPickable(keys, pool));

  const [side, setSide] = useState<1 | 2>(1);
  const [c1, setC1] = useState(() => idxOf(initialP1, pool1));
  const [c2, setC2] = useState(() => idxOf(initialP2, pool2));
  /** Já houve o 1º toque (ou movimento do cursor) neste passo: a prévia está "armada" e o próximo toque nela confirma. */
  const [armed, setArmed] = useState(single);
  const [locked1, setLocked1] = useState<CharacterKey | null>(null);

  const cursor = side === 1 ? c1 : c2;
  const pool = side === 1 ? pool1 : pool2;
  const hovered = list[Math.min(cursor, list.length - 1)];
  const setCursor = side === 1 ? setC1 : setC2;
  const pickable = canPick(hovered.key, pool);
  /** À venda: a história já liberou, falta pagar (só quem tem preço e função de compra). */
  const forSale = (k: CharacterKey) => !!priceOf && !!onBuy && !!earned?.includes(k) && !unlocked.includes(k);
  const [buyMsg, setBuyMsg] = useState<string | null>(null);
  const sale = forSale(hovered.key);
  const salePrice = sale && priceOf ? priceOf(hovered.key) : 0;

  // ---- medidas (responsivo)
  const compact = width < 640;
  const leftW = compact ? Math.max(118, Math.round(width * 0.27)) : Math.max(160, Math.min(260, Math.round(width * 0.25)));
  const showDetail = single && !!detail && !compact;
  const rightW = showDetail ? Math.max(230, Math.min(340, Math.round(width * 0.3))) : single || compact ? 0 : Math.max(110, Math.min(190, Math.round(width * 0.15)));
  const logoH = Math.max(46, Math.min(104, Math.round(height * 0.17)));
  const centerW = Math.max(120, width - leftW - rightW - (compact ? 28 : 56));
  const chrome = 28 + 54 + 34 + logoH + 30; // título + botões + dica + logo + folgas
  const layout = useMemo(() => gridLayout(list.length, centerW, Math.max(96, height - chrome), GAP), [list.length, centerW, height, chrome]);
  const { cols, tile } = layout;
  const rowsArr: number[][] = [];
  for (let i = 0; i < list.length; i += cols) rowsArr.push(Array.from({ length: Math.min(cols, list.length - i) }, (_, k) => i + k));
  const logoAfter = rowsArr.length >= 2 ? Math.ceil(rowsArr.length / 2) : 0;

  const preview = useCallback((i: number) => {
    setCursor(i);
    setBuyMsg(null);
    setArmed(true);
    playSfx('ui_hover', { minGapMs: 60 });
  }, [setCursor]);

  const move = useCallback((d: Dir) => {
    setCursor((i) => moveCursor(i, d, list.length, cols));
    setArmed(true);
    playSfx('ui_hover', { minGapMs: 60 });
  }, [setCursor, list.length, cols]);

  const buy = useCallback(() => {
    if (!onBuy || !priceOf) return;
    if (onBuy(hovered.key)) {
      playSfx('ui_confirm');
      setBuyMsg(t('vs_bought'));
    } else {
      playSfx('ui_denied');
      setBuyMsg(t('vs_no_diamonds'));
    }
  }, [onBuy, priceOf, hovered, t]);

  const confirm = useCallback(() => {
    if (!canPick(hovered.key, pool)) {
      playSfx('ui_denied');
      return;
    }
    setArmed(false);
    if (single) {
      onDone(hovered.key, hovered.key);
    } else if (side === 1) {
      setLocked1(hovered.key);
      setSide(2);
    } else {
      onDone(locked1 ?? initialP1, hovered.key);
    }
  }, [hovered, pool, side, locked1, initialP1, onDone, single]);

  const onTile = (i: number) => {
    if (armed && i === cursor) {
      if (forSale(list[i].key)) buy();
      else {
        playSfx('ui_confirm');
        confirm();
      }
    } else preview(i);
  };

  const backToP1 = useCallback(() => {
    playSfx('ui_back');
    setSide(1);
    setLocked1(null);
    setArmed(false);
  }, []);

  const act = useRef({ move, confirm, backToP1, side, sale, buy });
  act.current = { move, confirm, backToP1, side, sale, buy };
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const d = KEY_DIR[e.key];
      if (d) { e.preventDefault(); act.current.move(d); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (act.current.sale) act.current.buy(); else { playSfx('ui_confirm'); act.current.confirm(); } return; }
      if (e.key === 'Backspace' && act.current.side === 2) { e.preventDefault(); act.current.backToP1(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const accent = side === 1 ? P1_COLOR : P2_COLOR;
  const tag = single ? tagText ?? '' : side === 1 ? 'P1' : mode === 'cpu' ? 'CPU' : 'P2';
  const lockedEntry = locked1 ? list.find((e) => e.key === locked1) ?? null : null;

  const gridBody = (
    <View style={{ alignItems: 'center' }}>
      {rowsArr.map((row, r) => (
        <React.Fragment key={r}>
          {logoAfter > 0 && r === logoAfter && <Logo h={logoH} />}
          <View style={styles.gridRow}>
            {row.map((i) => {
              const e = list[i];
              const ok = canPick(e.key, pool);
              const onSale = forSale(e.key);
              const isCur = i === cursor;
              const mine = side === 2 && e.key === locked1;
              return (
                <Pressable
                  key={e.key}
                  testID={`vs-tile-${e.key}`}
                  accessibilityRole="button"
                  accessibilityLabel={e.name}
                  onPress={() => onTile(i)}
                  style={[
                    styles.tile,
                    { width: tile, height: tile, margin: GAP / 2 },
                    mine && { borderColor: P1_COLOR },
                    isCur && armed && { borderColor: accent, borderWidth: 3, backgroundColor: 'rgba(255,255,255,0.16)' },
                    single && e.key === initialP1 && !(isCur && armed) && { borderColor: '#7ee0a0' },
                  ]}
                >
                  <Image source={e.avatar} style={[{ width: tile - 8, height: tile - 8, borderRadius: 4 }, !ok && { opacity: 0.3 }]} resizeMode="contain" fadeDuration={0} />
                  {!ok && !onSale && <GameIcon name="lock" size={Math.round(tile / 3)} style={styles.tileLock} />}
                  {onSale && priceOf && <Text style={styles.tilePrice}>{`💎${priceOf(e.key)}`}</Text>}
                  {mine && <Text style={[styles.tileTag, { backgroundColor: P1_COLOR }]}>P1</Text>}
                  {isCur && armed && !single && <Text style={[styles.tileTag, { backgroundColor: accent }]}>{tag}</Text>}
                </Pressable>
              );
            })}
          </View>
        </React.Fragment>
      ))}
      {logoAfter === 0 && <Logo h={logoH} />}
    </View>
  );

  return (
    <View style={[styles.root, single && { paddingBottom: 54 }]} testID="vs-select">
      <Text style={[styles.title, { color: accent }]} testID="vs-title">
        {single ? title ?? '' : side === 1 ? t('vs_pick_p1') : mode === 'cpu' ? t('vs_pick_cpu') : t('vs_pick_p2')}
      </Text>
      <View style={styles.row}>
        {/* prévia ampliada, sempre à esquerda */}
        <View style={[styles.preview, { width: leftW, borderColor: accent }]} testID="vs-preview">
          {tag ? <Text style={[styles.panelTag, { backgroundColor: accent }]}>{tag}</Text> : null}
          {armed ? (
            <>
              <View style={styles.previewArt}>
                <Image
                  source={hovered.portrait}
                  style={[{ width: '100%', height: '100%' }, Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as never) : null]}
                  resizeMode="contain"
                  fadeDuration={0}
                  testID="vs-preview-img"
                />
              </View>
              <Text style={styles.name} numberOfLines={2} testID="vs-preview-name">{hovered.name}</Text>
              {!compact || height > 330 ? <Stats entry={hovered} /> : null}
              <Text style={[styles.tapHint, !pickable && { color: sale ? '#7ee0a0' : '#ff8c7a' }]} numberOfLines={3} testID="vs-preview-hint">
                {pickable ? t('vs_tap_again') : sale ? (buyMsg ?? `${t('vs_for_sale')} · 💎 ${salePrice}`) : t('vs_locked')}
              </Text>
            </>
          ) : (
            <View style={styles.previewArt}>
              <Text style={styles.question}>?</Text>
              <Text style={styles.tapHint} testID="vs-preview-hint">{t('vs_tap_preview')}</Text>
            </View>
          )}
        </View>

        <View style={[styles.center, { width: centerW }]}>
          {layout.scroll ? (
            <ScrollView style={{ maxHeight: Math.max(96, height - chrome) }} showsVerticalScrollIndicator={false} testID="vs-scroll">{gridBody}</ScrollView>
          ) : (
            gridBody
          )}
          <View style={styles.actions}>
            {side === 2 && <MenuButton fit variant="ghost" label={t('vs_back_p1')} onPress={backToP1} />}
            {sale ? (
              <MenuButton fit label={`${t('vs_buy')} · ${salePrice} 💎`} onPress={buy} disabled={!armed || diamonds < salePrice} />
            ) : (
              <MenuButton fit label={t('vs_confirm')} onPress={confirm} disabled={!armed || !pickable} />
            )}
          </View>
        </View>

        {showDetail && (
          <View style={[styles.detail, { width: rightW, maxHeight: Math.max(160, height - 90) }]} testID="vs-detail">
            {detail?.(hovered.key, Math.max(150, height - 110))}
          </View>
        )}
        {rightW > 0 && !single && (
          <View style={[styles.slot, { width: rightW, borderColor: side === 2 ? P1_COLOR : 'rgba(255,255,255,0.25)' }]} testID="vs-slot">
            <Text style={[styles.panelTag, { backgroundColor: P1_COLOR }]}>P1</Text>
            {lockedEntry ? (
              <>
                <Image source={lockedEntry.portrait} style={styles.slotImg} resizeMode="contain" fadeDuration={0} />
                <Text style={styles.slotName} numberOfLines={2} testID="vs-slot-name">{lockedEntry.name}</Text>
              </>
            ) : (
              <Text style={styles.slotEmpty}>{t('vs_slot_empty')}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function Logo({ h }: { h: number }) {
  return <Image source={require('../../../assets/images/game-logo-gold.png')} style={{ height: h, width: h, marginVertical: 2 }} resizeMode="contain" testID="vs-logo" />;
}

function Stats({ entry }: { entry: FighterEntry }) {
  const { t } = useI18n();
  const rows: [string, number][] = [
    [t('vs_stat_health'), entry.stats.health],
    [t('vs_stat_speed'), entry.stats.speed],
    [t('vs_stat_force'), entry.stats.force],
  ];
  return (
    <View style={styles.stats} testID="vs-stats">
      {rows.map(([label, v]) => (
        <View key={label} style={styles.statRow}>
          <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
          <View style={styles.statBar}><View style={[styles.statFill, { width: `${Math.round(v * 100)}%` }]} /></View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', width: '100%', gap: 4 },
  title: { fontWeight: '900', fontSize: 17, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  center: { alignItems: 'center', gap: 4 },
  gridRow: { flexDirection: 'row', justifyContent: 'center' },
  tile: { borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,215,0,0.35)', backgroundColor: 'rgba(10,10,18,0.6)', alignItems: 'center', justifyContent: 'center' },
  tilePrice: { position: 'absolute', right: 1, bottom: 1, color: '#fff', backgroundColor: 'rgba(0,0,0,0.72)', fontSize: 9, fontWeight: '900', paddingHorizontal: 3, borderRadius: 4, overflow: 'hidden' },
  tileLock: { position: 'absolute', right: 1, bottom: 1 },
  tileTag: { position: 'absolute', top: -2, left: -2, color: '#fff', fontSize: 9, fontWeight: '900', paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  preview: { alignSelf: 'stretch', borderWidth: 3, borderRadius: 12, backgroundColor: 'rgba(10,10,18,0.7)', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 6, overflow: 'hidden', minHeight: 200 },
  previewArt: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 90 },
  panelTag: { color: '#fff', fontWeight: '900', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  name: { color: '#FFD700', fontWeight: '900', fontSize: 16, textAlign: 'center' },
  tapHint: { color: '#cfd6f5', fontSize: 11, textAlign: 'center', marginTop: 2 },
  question: { color: 'rgba(255,255,255,0.35)', fontSize: 56, fontWeight: '900' },
  stats: { width: '100%', gap: 3, marginTop: 4 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { color: '#cfd6f5', fontSize: 9, width: 58, fontWeight: '700' },
  statBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  statFill: { height: 6, backgroundColor: '#FFD700' },
  detail: { alignSelf: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 12, backgroundColor: 'rgba(10,10,18,0.55)', padding: 6, overflow: 'hidden' },
  slot: { alignSelf: 'center', borderWidth: 2, borderRadius: 12, backgroundColor: 'rgba(10,10,18,0.55)', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, gap: 6, minHeight: 150, justifyContent: 'center' },
  slotImg: { width: '100%', height: 90 },
  slotName: { color: '#FFD700', fontWeight: '900', fontSize: 12, textAlign: 'center' },
  slotEmpty: { color: 'rgba(255,255,255,0.4)', fontWeight: '900', fontSize: 14 },
});
