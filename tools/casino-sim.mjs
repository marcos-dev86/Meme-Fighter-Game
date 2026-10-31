// Simulação do cassino: 1.000.000 de rodadas por jogo usando a MESMA matemática do jogo
// (src/game/casino/casinoMath.ts). Exige Node 22+ (lê TypeScript direto).
//   node tools/casino-sim.mjs
import * as M from '../src/game/casino/casinoMath.ts';

const ROUNDS = 1_000_000;
// gerador pseudoaleatório determinístico (mulberry32) para o resultado ser reproduzível
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const results = [];
function report(name, bets, playOnce) {
  let wagered = 0, returned = 0;
  const perBet = {};
  const rng = mulberry32(20260518 + name.length);
  for (let i = 0; i < ROUNDS; i++) {
    const bet = bets[Math.floor(rng() * bets.length)];
    const pay = playOnce(rng, bet);
    wagered += bet; returned += pay;
    const p = (perBet[bet] ??= { w: 0, r: 0 });
    p.w += bet; p.r += pay;
  }
  const edge = (1 - returned / wagered) * 100;
  const worst = Object.entries(perBet).map(([b, v]) => ({ bet: +b, edge: (1 - v.r / v.w) * 100 }));
  const minE = Math.min(...worst.map((x) => x.edge)), maxE = Math.max(...worst.map((x) => x.edge));
  results.push({ name, edge, minE, maxE });
  console.log(`${name.padEnd(34)} vantagem da casa: ${edge.toFixed(2)}%  (por aposta: ${minE.toFixed(2)}% a ${maxE.toFixed(2)}%)`);
}

console.log(`Rodadas por jogo: ${ROUNDS.toLocaleString('pt-BR')}\n`);
console.log(`Caça-níquel: retorno teórico exato (enumeração) = ${(M.slotTheoreticalRtp() * 100).toFixed(2)}%`);
report('Caça-níquel', M.SLOT_BETS, (rng, bet) => bet * M.slotMultiplier([M.rollSlotSymbol(rng), M.rollSlotSymbol(rng), M.rollSlotSymbol(rng)]));
report('Cara ou coroa', M.FLIP_BETS, (rng, bet) => M.flipPayout(bet, rng() < 0.5));

// Dados: cada tipo de aposta separado, e depois uma mistura uniforme
const diceWagers = [{ kind: 'low' }, { kind: 'high' }];
for (let n = 2; n <= 12; n++) diceWagers.push({ kind: 'exact', n });
for (const w of diceWagers) report(`Dados ${w.kind === 'exact' ? 'número ' + w.n : w.kind === 'low' ? 'MENOR (2-6)' : 'MAIOR (8-12)'}`, M.DICE_BETS, (rng, bet) => M.dicePayout(bet, w, M.rollDice(rng)));
report('Dados (mistura de apostas)', M.DICE_BETS, (rng, bet) => M.dicePayout(bet, diceWagers[Math.floor(rng() * diceWagers.length)], M.rollDice(rng)));

// Roleta americana
const rWagers = [{ kind: 'color', color: 'red' }, { kind: 'color', color: 'black' }, { kind: 'parity', odd: true }, { kind: 'parity', odd: false }, { kind: 'dozen', dozen: 1 }, { kind: 'dozen', dozen: 2 }, { kind: 'dozen', dozen: 3 }];
for (let n = 0; n <= 37; n++) rWagers.push({ kind: 'number', n });
const rName = (w) => (w.kind === 'color' ? `cor ${w.color}` : w.kind === 'parity' ? (w.odd ? 'ímpar' : 'par') : w.kind === 'dozen' ? `${w.dozen}ª dúzia` : `número ${M.rouletteLabel(w.n)}`);
for (const w of [rWagers[0], rWagers[2], rWagers[4], rWagers[7], rWagers[rWagers.length - 1]]) report(`Roleta ${rName(w)}`, M.ROULETTE_BETS, (rng, bet) => (M.rouletteWins(w, M.spinRoulette(rng)) ? bet * M.rouletteMult(w) : 0));
report('Roleta (mistura de apostas)', M.ROULETTE_BETS, (rng, bet) => { const w = rWagers[Math.floor(rng() * rWagers.length)]; return M.rouletteWins(w, M.spinRoulette(rng)) ? bet * M.rouletteMult(w) : 0; });

// Cartas: maior ou menor (escolha aleatória entre as possíveis para a carta aberta)
function cardRound(rng, bet, strategy) {
  const card = M.drawCard(rng);
  const options = ['higher', 'lower'].filter((g) => M.cardMult(card, g) > 0);
  const guess = strategy === 'random' ? options[Math.floor(rng() * options.length)] : (strategy === 'best' ? options.sort((a, b) => M.cardWinningRanks(card, b) - M.cardWinningRanks(card, a))[0] : options[0]);
  return M.cardPayout(bet, card, guess, M.drawCard(rng));
}
report('Cartas maior/menor (escolha aleatória)', M.CARD_BETS, (rng, bet) => cardRound(rng, bet, 'random'));
report('Cartas maior/menor (sempre a mais provável)', M.CARD_BETS, (rng, bet) => cardRound(rng, bet, 'best'));

// ---- Contas EXATAS (sem sorteio): a vantagem teórica de cada aposta ----
console.log('\nVantagem teórica exata (probabilidade x multiplicador):');
const theo = [];
const T = (name, rtp) => { theo.push({ name, edge: (1 - rtp) * 100 }); console.log(`  ${name.padEnd(34)} ${((1 - rtp) * 100).toFixed(2)}%`); };
T('Caça-níquel', M.slotTheoreticalRtp());
T('Cara ou coroa', 0.5 * M.FLIP_MULT);
T('Dados MENOR / MAIOR', M.diceWinChance({ kind: 'low' }) * M.DICE_HILO_MULT);
for (let n = 2; n <= 12; n++) T(`Dados número ${n}`, M.diceWinChance({ kind: 'exact', n }) * M.DICE_EXACT_MULT[n]);
for (const w of rWagers.slice(0, 7).concat([rWagers[7], rWagers[rWagers.length - 1]])) {
  let wins = 0; for (let n = 0; n < 38; n++) if (M.rouletteWins(w, n)) wins++;
  T(`Roleta ${rName(w)}`, (wins / 38) * M.rouletteMult(w));
}
for (const g of ['higher', 'lower']) {
  let num = 0, den = 0;
  for (let c = 1; c <= 13; c++) { if (M.cardMult(c, g) > 0) { num += (M.cardWinningRanks(c, g) / 13) * M.cardMult(c, g); den++; } }
  T(`Cartas ${g === 'higher' ? 'MAIOR' : 'MENOR'} (média das cartas)`, num / den);
}
for (let c = 1; c <= 13; c++) for (const g of ['higher', 'lower']) if (M.cardMult(c, g) > 0) theo.push({ name: `carta ${c} ${g}`, edge: (1 - (M.cardWinningRanks(c, g) / 13) * M.cardMult(c, g)) * 100 });
const theoBad = theo.filter((t) => t.edge < 3 || t.edge > 7);
console.log(theoBad.length ? `Fora de 3%–7% (teórico): ${theoBad.map((t) => `${t.name} ${t.edge.toFixed(2)}%`).join('; ')}` : 'Todas as apostas têm vantagem teórica entre 3% e 7%.');

const bad = results.filter((r) => r.edge < 3 || r.edge > 7);
console.log(bad.length ? `\nFORA DA FAIXA 3%–7% (média por jogo): ${bad.map((b) => b.name).join(', ')}` : '\nTodas as médias ficaram entre 3% e 7%.');
const outPerBet = results.filter((r) => r.minE < 2.5 || r.maxE > 7.5);
if (outPerBet.length) console.log(`Atenção (apostas individuais fora de 2,5%–7,5% por ruído ou arredondamento): ${outPerBet.map((b) => b.name).join(', ')}`);
process.exit(bad.length || theoBad.length ? 1 : 0);
