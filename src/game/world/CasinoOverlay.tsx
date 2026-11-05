import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GameIcon, IconLabel } from '@/game/ui/GameIcon';
import type { IconName } from '@/game/ui/iconRegistry';
import { CURRENCY_ABBR } from '@/game/items/itemDefs';
import { addCoins, spendCoins, usePlayerState } from '@/game/state/playerState';
import { reportCasinoWin } from '@/game/state/questState';
import { tip } from '@/game/state/tipsState';
import { setFlag } from '@/game/state/storyFlags';
import { playSfx } from '@/game/audio/audioManager';
import { haptic } from '@/game/audio/haptics';
import { MenuButton } from '@/game/menu/MenuButton';
import { useI18n } from '@/game/i18n/i18n';
import { DieFace, PlayingCard, RouletteWheel, POCKET_COLOR } from '@/game/casino/casinoUi';
import {
  CARD_BETS,
  DICE_BETS,
  DICE_EXACT_MULT,
  DICE_HILO_MULT,
  FLIP_BETS,
  ROULETTE_BETS,
  ROULETTE_WHEEL,
  SLOT_BETS,
  SLOT_PAIR_PAYOUT,
  SLOT_SYMBOLS,
  cardMult,
  cardPayout,
  dicePayout,
  drawCard,
  flipPayout,
  rollDice,
  rollSlotSymbol,
  rouletteColor,
  rouletteLabel,
  rouletteMult,
  rouletteWins,
  slotMultiplier,
  spinRoulette,
  type CardGuess,
  type DiceBet,
  type RouletteBet,
} from '@/game/casino/casinoMath';

/**
 * Cassino da Ilha Misteriosa: cinco jogos pagos em Memecoins. A matemática está em
 * casino/casinoMath.ts (vantagem da casa ~5% em todos, provada por simulação em
 * tools/casino-sim.mjs). A aposta é debitada ao começar e o prêmio entra quando o
 * resultado aparece (ou, se o jogador sair no meio, ao fechar), então um resultado
 * nunca se perde. Ganhos do cassino NÃO recebem o bônus de moedas da mochila.
 */

type GameId = 'slots' | 'flip' | 'dice' | 'roulette' | 'cards';
const GAMES: { id: GameId; labelKey: string }[] = [
  { id: 'slots', labelKey: 'casino_slots' },
  { id: 'flip', labelKey: 'casino_flip' },
  { id: 'dice', labelKey: 'casino_dice' },
  { id: 'roulette', labelKey: 'casino_roulette' },
  { id: 'cards', labelKey: 'casino_cards' },
];
const BETS: Record<GameId, number[]> = { slots: SLOT_BETS, flip: FLIP_BETS, dice: DICE_BETS, roulette: ROULETTE_BETS, cards: CARD_BETS };

interface Result {
  bet: number;
  payout: number;
  net: number;
}

const fmtMult = (m: number) => `x${Number.isInteger(m) ? m : m.toFixed(2).replace(/0$/, '')}`;
const rand = () => Math.random();

interface Props {
  onClose: () => void;
  /** Jogo aberto de início (as mesas do cassino gigante abrem direto no jogo delas). */
  initialGame?: GameId;
}

export function CasinoOverlay({ onClose, initialGame }: Props) {
  const { t } = useI18n();
  const { coins } = usePlayerState();
  const [game, setGame] = useState<GameId>(initialGame ?? 'slots');
  const [betIdx, setBetIdx] = useState<Record<GameId, number>>({ slots: 0, flip: 0, dice: 0, roulette: 0, cards: 0 });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  // caça-níquel
  const [reels, setReels] = useState<IconName[]>(['dog', 'banana', 'moai']);
  // cara ou coroa
  const [flipFace, setFlipFace] = useState<'heads' | 'tails' | null>(null);
  const [pick, setPick] = useState<'heads' | 'tails'>('heads');
  // dados
  const [diceBet, setDiceBet] = useState<DiceBet>({ kind: 'high' });
  const [dice, setDice] = useState<[number, number]>([3, 4]);
  // roleta
  const [rBet, setRBet] = useState<RouletteBet>({ kind: 'color', color: 'red' });
  const [rGroup, setRGroup] = useState<'color' | 'parity' | 'dozen' | 'number'>('color');
  const [ballIdx, setBallIdx] = useState(0);
  const [rResult, setRResult] = useState<number | null>(null);
  // cartas
  const [cur, setCur] = useState(() => drawCard(rand));
  const [nxt, setNxt] = useState<number | null>(null);
  const [suits, setSuits] = useState<[boolean, boolean]>([true, false]);

  const pending = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ticks = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    tip('casino');
    return () => {
      timers.current.forEach(clearTimeout);
      ticks.current.forEach(clearInterval);
      // saiu no meio da rodada: paga o que já estava decidido
      if (pending.current > 0) {
        addCoins(pending.current, false);
        pending.current = 0;
      }
    };
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const every = (fn: () => void, ms: number) => {
    const id = setInterval(fn, ms);
    ticks.current.push(id);
    return id;
  };
  const stopTick = (id: ReturnType<typeof setInterval>) => {
    clearInterval(id);
    ticks.current = ticks.current.filter((x) => x !== id);
  };

  const bets = BETS[game];
  const canBet = (b: number) => coins >= b;
  const chosen = bets[Math.min(betIdx[game], bets.length - 1)];
  // se a aposta escolhida ficou cara demais (depois de perder), usa a maior que ainda cabe
  const effectiveBet = canBet(chosen) ? chosen : [...bets].reverse().find(canBet) ?? 0;

  const begin = (bet: number): boolean => {
    if (busy) return false;
    if (bet <= 0 || !spendCoins(bet)) {
      playSfx('ui_denied');
      setResult(null);
      setMessage(t('shop_insufficient'));
      return false;
    }
    setBusy(true);
    setResult(null);
    setMessage(null);
    haptic('light');
    playSfx('ui_confirm');
    return true;
  };
  const settle = (bet: number, payout: number) => {
    pending.current = 0;
    if (payout > 0) addCoins(payout, false);
    if (payout > bet) {
      reportCasinoWin(game); // lucro líquido = vitória para missões/progresso (e conta o jogo vencido)
      if (game === 'slots') setFlag('found:sec_777');
    }
    const net = payout - bet;
    setResult({ bet, payout, net });
    setBusy(false);
    if (net > 0) {
      playSfx(payout >= bet * 10 ? 'levelup' : 'coin');
      haptic('success');
    } else if (net < 0) {
      playSfx('ui_denied');
      haptic('warning');
    } else {
      playSfx('ui_back');
    }
  };

  // ---------- jogos ----------
  const spinSlots = () => {
    const bet = effectiveBet;
    if (!begin(bet)) return;
    const final = [rollSlotSymbol(rand), rollSlotSymbol(rand), rollSlotSymbol(rand)];
    const payout = bet * slotMultiplier(final);
    pending.current = payout;
    if (final.every((s) => s.id === 'seven')) setFlag('secret_777'); // segredo: três setes
    const stopped = [false, false, false];
    const tick = every(() => setReels((cur2) => cur2.map((icon, i) => (stopped[i] ? icon : (SLOT_SYMBOLS[Math.floor(rand() * SLOT_SYMBOLS.length)].icon as IconName)))), 80);
    [700, 1100, 1500].forEach((ms, i) =>
      later(() => {
        stopped[i] = true;
        playSfx('ui_hover');
        setReels((cur2) => cur2.map((icon, k) => (k === i ? (final[i].icon as IconName) : icon)));
        if (i === 2) {
          stopTick(tick);
          settle(bet, payout);
        }
      }, ms),
    );
  };

  const toss = () => {
    const bet = effectiveBet;
    if (!begin(bet)) return;
    const res: 'heads' | 'tails' = rand() < 0.5 ? 'heads' : 'tails';
    const payout = flipPayout(bet, res === pick);
    pending.current = payout;
    let n = 0;
    const tick = every(() => {
      n += 1;
      setFlipFace(n % 2 ? 'heads' : 'tails');
    }, 100);
    later(() => {
      stopTick(tick);
      setFlipFace(res);
      settle(bet, payout);
    }, 1200);
  };

  const rollDiceGame = () => {
    const bet = effectiveBet;
    if (!begin(bet)) return;
    const final = rollDice(rand);
    const payout = dicePayout(bet, diceBet, final);
    pending.current = payout;
    const tick = every(() => {
      setDice([1 + Math.floor(rand() * 6), 1 + Math.floor(rand() * 6)]);
      playSfx('ui_hover');
    }, 90);
    later(() => {
      stopTick(tick);
      setDice(final);
      settle(bet, payout);
    }, 1000);
  };

  const spinWheel = () => {
    const bet = effectiveBet;
    if (!begin(bet)) return;
    const n = spinRoulette(rand);
    const target = ROULETTE_WHEEL.indexOf(n);
    const payout = rouletteWins(rBet, n) ? bet * rouletteMult(rBet) : 0;
    pending.current = payout;
    setRResult(null);
    const start = ballIdx;
    const total = ROULETTE_WHEEL.length + ((target - start + ROULETTE_WHEEL.length) % ROULETTE_WHEEL.length);
    let step = 0;
    const advance = () => {
      step += 1;
      setBallIdx((start + step) % ROULETTE_WHEEL.length);
      if (step % 3 === 0) playSfx('ui_hover', { gain: 0.5 });
      if (step >= total) {
        setRResult(n);
        settle(bet, payout);
        return;
      }
      // a bolinha vai freando: 30 ms por bolso no começo, ~260 ms no fim (a rodada dura de 3 a 6 s)
      later(advance, 30 + Math.pow(step / total, 3) * 230);
    };
    later(advance, 35);
  };

  const roundId = useRef(0);
  const guessCard = (guess: CardGuess) => {
    const bet = effectiveBet;
    const base = nxt ?? cur; // se a carta nova ainda está na mesa, ela já é a carta aberta
    if (cardMult(base, guess) <= 0) return;
    if (!begin(bet)) return;
    roundId.current += 1;
    const id = roundId.current;
    if (nxt !== null) {
      setCur(nxt);
      setSuits((s) => [s[1], rand() < 0.5]);
      setNxt(null);
    }
    const next = drawCard(rand);
    const payout = cardPayout(bet, base, guess, next);
    pending.current = payout;
    later(() => {
      setNxt(next);
      settle(bet, payout);
      // depois de mostrar o resultado, a carta revelada passa a ser a carta aberta da próxima rodada
      later(() => {
        if (roundId.current !== id) return;
        setCur(next);
        setSuits((s) => [s[1], rand() < 0.5]);
        setNxt(null);
      }, 1600);
    }, 750);
  };

  // ---------- interface ----------
  const resultCard = result && (
    <View style={[styles.resultBox, result.net > 0 ? styles.resultWin : result.net < 0 ? styles.resultLose : styles.resultPush]}>
      <Text style={styles.resultTitle}>{result.net > 0 ? t('casino_result_win') : result.net < 0 ? t('casino_result_lose') : t('casino_result_push')}</Text>
      <Text style={styles.resultNet}>
        {result.net > 0 ? '+' : ''}
        {result.net} {CURRENCY_ABBR}
      </Text>
    </View>
  );
  const tie = game === 'cards' && result && nxt !== null && nxt === cur && result.net < 0;

  const chip = (label: string, on: boolean, onPress: () => void, sub?: string, disabled?: boolean) => (
    <Pressable key={label + (sub ?? '')} style={[styles.opt, on && styles.optOn, disabled && styles.optOff]} onPress={() => !busy && !disabled && onPress()}>
      <Text style={styles.optText}>{label}</Text>
      {sub ? <Text style={styles.optSub}>{sub}</Text> : null}
    </Pressable>
  );

  const slotsPanel = (
    <View style={styles.reelRow}>
      {reels.map((icon, i) => (
        <View key={i} style={styles.reel}>
          <GameIcon name={icon} size={44} />
        </View>
      ))}
    </View>
  );

  const flipPanel = (
    <View style={styles.flipBox}>
      <View style={styles.row}>
        {(['heads', 'tails'] as const).map((side) => (
          <Pressable key={side} style={[styles.pickBtn, pick === side && styles.pickBtnOn]} onPress={() => !busy && setPick(side)}>
            <IconLabel icon={side === 'heads' ? 'dog' : 'moai'} size={20} textStyle={styles.tabText}>
              {side === 'heads' ? t('casino_heads') : t('casino_tails')}
            </IconLabel>
          </Pressable>
        ))}
      </View>
      <View style={styles.coinFace}>
        <GameIcon name={flipFace === null ? 'coin' : flipFace === 'heads' ? 'dog' : 'moai'} size={48} />
      </View>
    </View>
  );

  const dicePanel = (
    <View style={styles.panelCol}>
      <View style={styles.row}>
        <DieFace value={dice[0]} />
        <DieFace value={dice[1]} />
        <Text style={styles.sumText}>= {dice[0] + dice[1]}</Text>
      </View>
      <View style={styles.row}>
        {chip(`${t('casino_low')} 2–6`, diceBet.kind === 'low', () => setDiceBet({ kind: 'low' }), fmtMult(DICE_HILO_MULT))}
        {chip(`${t('casino_high')} 8–12`, diceBet.kind === 'high', () => setDiceBet({ kind: 'high' }), fmtMult(DICE_HILO_MULT))}
      </View>
      <Text style={styles.hint}>{t('casino_exact')}</Text>
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => chip(String(n), diceBet.kind === 'exact' && diceBet.n === n, () => setDiceBet({ kind: 'exact', n }), fmtMult(DICE_EXACT_MULT[n])))}
      </View>
    </View>
  );

  const groupBtn = (g: 'color' | 'parity' | 'dozen' | 'number', label: string, first: RouletteBet) =>
    chip(label, rGroup === g, () => {
      setRGroup(g);
      setRBet(first);
    });
  const roulettePanel = (
    <View style={styles.rouletteRow}>
      <RouletteWheel ballIndex={ballIdx} centerNumber={rResult} />
      <View style={styles.panelCol}>
        <View style={styles.row}>
          {groupBtn('color', t('casino_color'), { kind: 'color', color: 'red' })}
          {groupBtn('parity', t('casino_parity'), { kind: 'parity', odd: true })}
          {groupBtn('dozen', t('casino_dozen'), { kind: 'dozen', dozen: 1 })}
          {groupBtn('number', t('casino_number'), { kind: 'number', n: 17 })}
        </View>
        {rGroup === 'color' && (
          <View style={styles.row}>
            {chip(t('casino_red'), rBet.kind === 'color' && rBet.color === 'red', () => setRBet({ kind: 'color', color: 'red' }), 'x2')}
            {chip(t('casino_black'), rBet.kind === 'color' && rBet.color === 'black', () => setRBet({ kind: 'color', color: 'black' }), 'x2')}
          </View>
        )}
        {rGroup === 'parity' && (
          <View style={styles.row}>
            {chip(t('casino_odd'), rBet.kind === 'parity' && rBet.odd, () => setRBet({ kind: 'parity', odd: true }), 'x2')}
            {chip(t('casino_even'), rBet.kind === 'parity' && !rBet.odd, () => setRBet({ kind: 'parity', odd: false }), 'x2')}
          </View>
        )}
        {rGroup === 'dozen' && (
          <View style={styles.row}>
            {([1, 2, 3] as const).map((d) => chip(`${(d - 1) * 12 + 1}–${d * 12}`, rBet.kind === 'dozen' && rBet.dozen === d, () => setRBet({ kind: 'dozen', dozen: d }), 'x3'))}
          </View>
        )}
        {rGroup === 'number' && (
          <View style={[styles.row, { flexWrap: 'wrap', maxWidth: 430 }]}>
            {[0, 37, ...Array.from({ length: 36 }, (_, i) => i + 1)].map((n) => {
              const on = rBet.kind === 'number' && rBet.n === n;
              return (
                <Pressable key={n} style={[styles.numCell, { backgroundColor: POCKET_COLOR[rouletteColor(n)] }, on && styles.numCellOn]} onPress={() => !busy && setRBet({ kind: 'number', n })}>
                  <Text style={styles.numText}>{rouletteLabel(n)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        <Text style={styles.hint}>
          {rBet.kind === 'number' ? `${t('casino_number')} ${rouletteLabel(rBet.n)}` : ''} {fmtMult(rouletteMult(rBet))}
        </Text>
      </View>
    </View>
  );

  const cardsPanel = (
    <View style={styles.panelCol}>
      <View style={styles.row}>
        <PlayingCard rank={cur} red={suits[0]} />
        <Text style={styles.sumText}>→</Text>
        <PlayingCard rank={nxt ?? 1} hidden={nxt === null} red={suits[1]} />
      </View>
      <View style={styles.row}>
        {(['higher', 'lower'] as const).map((g) => {
          const base = nxt ?? cur;
          const m = cardMult(base, g);
          return <MenuButton key={g} compact label={`${g === 'higher' ? t('casino_high') : t('casino_low')} ${m > 0 ? fmtMult(m) : '–'}`} onPress={() => guessCard(g)} disabled={busy || effectiveBet === 0 || m <= 0} />;
        })}
      </View>
      <Text style={styles.hint}>{tie ? t('casino_tie') : t('casino_cards_note')}</Text>
    </View>
  );

  const action =
    game === 'slots' ? { label: t('casino_spin'), run: spinSlots } : game === 'flip' ? { label: t('casino_toss'), run: toss } : game === 'dice' ? { label: t('casino_roll'), run: rollDiceGame } : game === 'roulette' ? { label: t('casino_spin_wheel'), run: spinWheel } : null;

  return (
    <View style={styles.root}>
      <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator>
        <IconLabel icon="roulette" size={24} gap={8} textStyle={styles.title}>
          {t('casino_title')}
        </IconLabel>
        <Text style={styles.coins}>
          {coins} {CURRENCY_ABBR}
        </Text>

        <View style={styles.tabs}>
          {GAMES.map((g) => (
            <Pressable
              key={g.id}
              style={[styles.tab, game === g.id && styles.tabOn]}
              onPress={() => {
                if (busy) return;
                setGame(g.id);
                setResult(null);
                setMessage(null);
              }}
            >
              <Text style={styles.tabText}>{t(g.labelKey)}</Text>
            </Pressable>
          ))}
        </View>

        {game === 'slots' && slotsPanel}
        {game === 'flip' && flipPanel}
        {game === 'dice' && dicePanel}
        {game === 'roulette' && roulettePanel}
        {game === 'cards' && cardsPanel}

        <View style={styles.betRow}>
          <Text style={styles.betLabel}>{t('casino_bet')}</Text>
          {bets.map((b, i) => (
            <Pressable key={b} style={[styles.betChip, effectiveBet === b && styles.betChipOn, !canBet(b) && styles.betChipOff]} onPress={() => !busy && canBet(b) && setBetIdx((s) => ({ ...s, [game]: i }))}>
              <Text style={styles.betText}>{b}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.limits}>{t('casino_limits').replace('{min}', String(bets[0])).replace('{max}', String(bets[bets.length - 1]))}</Text>

        {resultCard}
        <Text style={styles.message}>{message ?? (effectiveBet === 0 && !result ? t('shop_insufficient') : ' ')}</Text>

        <View style={styles.actions}>
          {action && <MenuButton compact label={action.label} onPress={action.run} disabled={busy || effectiveBet === 0} />}
          <MenuButton compact label={t('ferry_close')} variant="ghost" onPress={onClose} disabled={busy} />
        </View>
        <Text style={styles.footnote}>{t('casino_note')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(30,6,14,0.97)' },
  scroll: { padding: 12, alignItems: 'center', gap: 6, flexGrow: 1, justifyContent: 'center' },
  title: { color: '#FFD700', fontSize: 19, fontWeight: '800' },
  coins: { color: '#fff', opacity: 0.85 },
  tabs: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  tab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,215,0,0.4)' },
  tabOn: { backgroundColor: 'rgba(255,215,0,0.25)', borderColor: '#FFD700' },
  tabText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  panelCol: { alignItems: 'center', gap: 6 },
  rouletteRow: { flexDirection: 'row', gap: 14, alignItems: 'center', justifyContent: 'center' },
  reelRow: { flexDirection: 'row', gap: 10 },
  reel: { width: 70, height: 70, borderRadius: 10, backgroundColor: '#fff', borderWidth: 3, borderColor: '#FFD700', alignItems: 'center', justifyContent: 'center' },
  flipBox: { alignItems: 'center', gap: 6 },
  pickBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  pickBtnOn: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.2)' },
  coinFace: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#f2c94c', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#b8860b' },
  sumText: { color: '#FFD700', fontWeight: '900', fontSize: 16, minWidth: 36, textAlign: 'center' },
  hint: { color: '#ffd9a0', fontSize: 11, fontWeight: '700' },
  opt: { minWidth: 40, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  optOn: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.22)' },
  optOff: { opacity: 0.3 },
  optText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  optSub: { color: '#ffd9a0', fontSize: 9, fontWeight: '700' },
  numCell: { width: 27, height: 24, borderRadius: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  numCellOn: { borderWidth: 3, borderColor: '#FFD700' },
  numText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  betRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  betLabel: { color: '#FFD700', fontWeight: '700', fontSize: 12 },
  betChip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  betChipOn: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  betChipOff: { opacity: 0.3 },
  betText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  limits: { color: '#fff', opacity: 0.55, fontSize: 10 },
  resultBox: { minWidth: 220, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, borderWidth: 2, alignItems: 'center' },
  resultWin: { backgroundColor: 'rgba(40,160,80,0.3)', borderColor: '#4cd964' },
  resultLose: { backgroundColor: 'rgba(200,50,60,0.28)', borderColor: '#ff6b6b' },
  resultPush: { backgroundColor: 'rgba(200,200,200,0.2)', borderColor: '#ccc' },
  resultTitle: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  resultNet: { color: '#fff', fontWeight: '800', fontSize: 13 },
  message: { color: '#9be89b', fontWeight: '800', fontSize: 12, minHeight: 16 },
  actions: { flexDirection: 'row', gap: 14 },
  footnote: { color: '#fff', opacity: 0.45, fontSize: 10 },
});
void SLOT_PAIR_PAYOUT;
