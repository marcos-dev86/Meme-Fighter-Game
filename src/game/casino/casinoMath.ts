/**
 * Matemática pura do cassino (sem React): é isto que o jogo usa E o que o script
 * `tools/casino-sim.mjs` simula 1 milhão de vezes por jogo. Todas as apostas têm
 * vantagem da casa de ~5% (dentro de 3% a 7%). Pagamentos em MOEDAS INTEIRAS:
 * os valores de aposta de cada jogo foram escolhidos para a conta fechar exata.
 */

export type Rng = () => number;

/** ---------- CAÇA-NÍQUEL (já existia) ---------- */
export const SLOT_SYMBOLS = [
  { id: 'dog', icon: 'dog', weight: 30, pay: 5 },
  { id: 'banana', icon: 'banana', weight: 25, pay: 8 },
  { id: 'moai', icon: 'moai', weight: 20, pay: 12 },
  { id: 'joker', icon: 'card', weight: 15, pay: 20 },
  { id: 'gem', icon: 'gem', weight: 8, pay: 50 },
  { id: 'seven', icon: 'seven', weight: 2, pay: 150 },
] as const;
export type SlotSymbol = (typeof SLOT_SYMBOLS)[number];
const SLOT_TOTAL = SLOT_SYMBOLS.reduce((a, s) => a + s.weight, 0);
export const SLOT_PAIR_PAYOUT = 1; // duas iguais: aposta de volta
export const SLOT_BETS = [5, 10, 25, 50];

export function rollSlotSymbol(rng: Rng): SlotSymbol {
  let r = rng() * SLOT_TOTAL;
  for (const s of SLOT_SYMBOLS) {
    r -= s.weight;
    if (r < 0) return s;
  }
  return SLOT_SYMBOLS[0];
}
/** Multiplicador (da aposta, já incluindo a própria aposta) para 3 rolos. */
export function slotMultiplier(reels: readonly SlotSymbol[]): number {
  const [a, b, c] = reels;
  if (a.id === b.id && b.id === c.id) return a.pay;
  if (a.id === b.id || b.id === c.id || a.id === c.id) return SLOT_PAIR_PAYOUT;
  return 0;
}
/** Retorno teórico exato do caça-níquel (enumera os 6^3 resultados). */
export function slotTheoreticalRtp(): number {
  let rtp = 0;
  for (const a of SLOT_SYMBOLS)
    for (const b of SLOT_SYMBOLS)
      for (const c of SLOT_SYMBOLS) {
        const p = (a.weight / SLOT_TOTAL) * (b.weight / SLOT_TOTAL) * (c.weight / SLOT_TOTAL);
        rtp += p * slotMultiplier([a, b, c]);
      }
  return rtp;
}

/** ---------- CARA OU COROA (já existia) ---------- */
export const FLIP_BETS = [10, 20, 50, 100];
export const FLIP_MULT = 1.9;
export function flipPayout(bet: number, won: boolean): number {
  return won ? Math.round(bet * FLIP_MULT) : 0;
}

/** ---------- DADOS: 2 dados ---------- */
export const DICE_BETS = [20, 40, 100, 200];
/** Maneiras de somar n com 2 dados (de 36). */
export function diceWays(n: number): number {
  if (n < 2 || n > 12) return 0;
  return 6 - Math.abs(7 - n);
}
/** Multiplicador (da aposta) do NÚMERO EXATO: ~95% de retorno, em passos de 0,25. */
export const DICE_EXACT_MULT: Record<number, number> = { 2: 34, 3: 17, 4: 11.5, 5: 8.5, 6: 6.75, 7: 5.75, 8: 6.75, 9: 8.5, 10: 11.5, 11: 17, 12: 34 };
/** MENOR (soma 2–6) ou MAIOR (soma 8–12): o 7 perde nas duas. 15/36 de chance. */
export const DICE_HILO_MULT = 2.3;
export type DiceBet = { kind: 'low' } | { kind: 'high' } | { kind: 'exact'; n: number };

export function rollDice(rng: Rng): [number, number] {
  return [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
}
export function dicePayout(bet: number, wager: DiceBet, dice: [number, number]): number {
  const sum = dice[0] + dice[1];
  if (wager.kind === 'low') return sum < 7 ? Math.round(bet * DICE_HILO_MULT) : 0;
  if (wager.kind === 'high') return sum > 7 ? Math.round(bet * DICE_HILO_MULT) : 0;
  return sum === wager.n ? Math.round(bet * DICE_EXACT_MULT[wager.n]) : 0;
}
export function diceWinChance(wager: DiceBet): number {
  if (wager.kind === 'low' || wager.kind === 'high') return 15 / 36;
  return diceWays(wager.n) / 36;
}

/** ---------- ROLETA AMERICANA: 0, 00 e 1–36 (vantagem da casa 5,26%) ---------- */
export const ROULETTE_BETS = [10, 25, 50, 100];
/** Ordem real dos bolsos numa roleta americana (37 = "00"). */
export const ROULETTE_WHEEL: number[] = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, 37, 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export type RouletteColor = 'red' | 'black' | 'green';
export function rouletteColor(n: number): RouletteColor {
  if (n === 0 || n === 37) return 'green';
  return REDS.has(n) ? 'red' : 'black';
}
export const rouletteLabel = (n: number) => (n === 37 ? '00' : String(n));
export type RouletteBet =
  | { kind: 'color'; color: 'red' | 'black' }
  | { kind: 'parity'; odd: boolean }
  | { kind: 'dozen'; dozen: 1 | 2 | 3 }
  | { kind: 'number'; n: number }; // 0..36, 37 = "00"
/** Multiplicador (da aposta, com a aposta incluída): cor/paridade 2, dúzia 3, número cheio 36 ("35 para 1"). */
export function rouletteMult(b: RouletteBet): number {
  return b.kind === 'color' || b.kind === 'parity' ? 2 : b.kind === 'dozen' ? 3 : 36;
}
export function rouletteWins(b: RouletteBet, n: number): boolean {
  if (b.kind === 'number') return n === b.n;
  if (n === 0 || n === 37) return false; // 0 e 00 perdem as apostas externas
  if (b.kind === 'color') return rouletteColor(n) === b.color;
  if (b.kind === 'parity') return (n % 2 === 1) === b.odd;
  return Math.ceil(n / 12) === b.dozen;
}
/** Sorteio uniforme entre os 38 bolsos: 0..36 e 37 ("00"). */
export function spinRoulette(rng: Rng): number {
  return Math.floor(rng() * 38);
}

/** ---------- CARTAS: MAIOR OU MENOR ---------- */
export const CARD_BETS = [20, 40, 100, 200];
/** Cartas de 1 (Ás) a 13 (Rei), com reposição (baralho infinito). Empate PERDE. */
export type CardGuess = 'higher' | 'lower';
export function drawCard(rng: Rng): number {
  return 1 + Math.floor(rng() * 13);
}
/** Quantas cartas (de 13) ganham a aposta, dada a carta aberta. */
export function cardWinningRanks(card: number, guess: CardGuess): number {
  return guess === 'higher' ? 13 - card : card - 1;
}
/**
 * Multiplicador (da aposta) da escolha: ~95% de retorno em passos de 0,05, assim
 * as apostas de 20 em 20 pagam moedas inteiras. 0 = escolha impossível (Ás não tem "menor", Rei não tem "maior").
 */
export function cardMult(card: number, guess: CardGuess): number {
  const k = cardWinningRanks(card, guess);
  if (k <= 0) return 0;
  return Math.round(((0.95 * 13) / k) * 20) / 20;
}
export function cardPayout(bet: number, card: number, guess: CardGuess, next: number): number {
  const won = guess === 'higher' ? next > card : next < card;
  return won ? Math.round(bet * cardMult(card, guess)) : 0;
}
