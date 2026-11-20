/**
 * Elenco do VERSUS: liberar pela história, COMPRAR com diamantes, preço pelos atributos, dica em vez de explicação na
 * seleção, e sem o rótulo "TEM" nos ícones. Roda a lógica real no Node. `node tools/test-roster-compra.mjs`
 */
import { createRequire } from 'node:module';
import Module from 'node:module';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const store = new Map();
const AS = { getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, v); }, removeItem: async (k) => { store.delete(k); } };
const stub = () => new Proxy(function () {}, { get: (t, p) => (p === '__esModule' ? true : p === 'default' ? stub() : p === Symbol.toPrimitive ? () => 0 : stub()), apply: () => stub() });
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (/^(react-native|expo|@expo|react-native-)/.test(req)) return stub();
  if (req === '@react-native-async-storage/async-storage') return { __esModule: true, default: AS };
  return origLoad.call(this, req, ...rest);
};
require('./ts-register.cjs');
const R = require('../src/game/state/rosterState.ts');
const P = require('../src/game/state/rosterPricing.ts');
const A = require('../src/game/account/accountState.ts');
const T = require('../src/game/state/rosterTips.ts');
const TS = require('../src/game/state/tipsState.ts');
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('preço em diamantes pelos atributos', () => {
  const priced = R.ROSTER.filter((r) => r.unlock.kind !== 'default').map((r) => [r.key, P.fighterPrice(r.key)]);
  it('todo lutador à venda custa de 30 a 150 (múltiplo de 5)', () => {
    for (const [k, p] of priced) {
      assert.ok(p >= 30 && p <= 150 && p % 5 === 0, `${k}: ${p}`);
    }
  });
  it('o mais fraco (Orc) custa 30 e o mais forte (Dragão Sombrio) custa 150', () => {
    assert.equal(P.fighterPrice('orc'), 30);
    assert.equal(P.fighterPrice('shadow_dragon'), 150);
  });
  it('mais forte custa mais: dragão do gelo > soldado > orc', () => {
    assert.ok(P.fighterPrice('ice_dragon') > P.fighterPrice('soldier'));
    assert.ok(P.fighterPrice('soldier') > P.fighterPrice('orc'));
  });
  it('um lutador mais forte que o Dragão Sombrio passa de 150 (sem teto)', () => {
    assert.ok(P.priceFromRaw({ health: 260, speed: 5, avgDamage: 45, procs: 3, immune: 1 }) > 150);
  });
  it('um lutador fraquíssimo nunca custa menos de 30', () => {
    assert.equal(P.priceFromRaw({ health: 10, speed: 1, avgDamage: 1, procs: 0, immune: 0 }), 30);
  });
});

describe('liberar pela história NÃO entrega: precisa comprar', () => {
  it('vencer o chefe libera para compra, mas continua não jogável', () => {
    assert.equal(R.isFighterUnlocked('ninja'), false);
    const out = R.unlockByEvent({ boss: 'boss_main' });
    assert.deepEqual(out, ['ninja']);
    assert.equal(R.isFighterEarned('ninja'), true);
    assert.equal(R.isFighterUnlocked('ninja'), false);
  });
  it('liberar de novo não repete o aviso', () => {
    assert.deepEqual(R.unlockByEvent({ boss: 'boss_main' }), []);
  });
  it('sem estar liberado, não dá para comprar nem com diamantes de sobra', () => {
    A.grantDiamonds(10000);
    const r = R.buyFighter('mystic');
    assert.deepEqual(r, { ok: false, reason: 'not_earned' });
    assert.equal(R.isFighterUnlocked('mystic'), false);
  });
  it('liberado + diamantes: compra, cobra o preço certo e vira jogável', () => {
    const before = A.getDiamonds();
    const price = P.fighterPrice('ninja');
    const r = R.buyFighter('ninja');
    assert.deepEqual(r, { ok: true, price });
    assert.equal(A.getDiamonds(), before - price);
    assert.equal(R.isFighterUnlocked('ninja'), true);
  });
  it('comprar duas vezes não cobra de novo', () => {
    const before = A.getDiamonds();
    assert.deepEqual(R.buyFighter('ninja'), { ok: false, reason: 'owned' });
    assert.equal(A.getDiamonds(), before);
  });
  it('sem diamantes suficientes: nada é cobrado e o lutador segue bloqueado', () => {
    R.unlockByEvent({ boss: 'boss_trevas' }); // Dragão Sombrio: 150
    A.spendDiamonds(A.getDiamonds() - 20); // sobram 20
    const r = R.buyFighter('shadow_dragon');
    assert.deepEqual(r, { ok: false, reason: 'poor' });
    assert.equal(A.getDiamonds(), 20);
    assert.equal(R.isFighterUnlocked('shadow_dragon'), false);
    assert.equal(R.isFighterEarned('shadow_dragon'), true);
  });
  it('torre andar 10 libera o Orc para compra (não entrega)', () => {
    assert.deepEqual(R.unlockByEvent({ floor: 10 }), ['orc']);
    assert.equal(R.isFighterUnlocked('orc'), false);
  });
});

describe('persistência e contas antigas', () => {
  it('grava unlocked e earned', async () => {
    await new Promise((r) => setTimeout(r, 10));
    const d = JSON.parse(store.get('meme_fighter_roster_v1'));
    assert.ok(d.unlocked.includes('ninja') && !d.unlocked.includes('orc'));
    assert.ok(d.earned.includes('orc') && d.earned.includes('ninja'));
  });
  it('lê conta antiga (só "unlocked"): quem já tinha o lutador continua com ele', () => {
    const src = read('src/game/state/rosterState.ts');
    assert.match(src, /Saves antigos não tinham "earned"/);
    assert.match(src, /earned = Array\.from\(new Set\(\[\.\.\.unlocked/);
  });
});

describe('seleção do Versus não explica como conseguir; as dicas explicam', () => {
  const sel = read('src/game/versus/FighterSelect.tsx');
  it('FighterSelect não usa mais as frases de "como conseguir"', () => {
    assert.ok(!sel.includes('roster_hint_boss') && !sel.includes('roster_hint_tower'));
    assert.ok(!sel.includes('BOSS_BY_ID'));
  });
  it('a dica de um lutador bloqueado diz como liberar e que depois se compra', () => {
    const t = (k) => ({ roster_hint_boss: 'Derrote {name} na história.', roster_hint_tower: 'Chegue ao andar {n}.', roster_hint_pay: 'Compre com diamantes.' }[k]);
    const txt = T.rosterTipText(T.rosterTipId('mystic'), t);
    assert.match(txt, /Místico: Derrote Encapuzado Misterioso na história\. Compre com diamantes\./);
    assert.match(T.rosterTipText(T.rosterTipId('orc'), t), /Orc: Chegue ao andar 10\./);
    assert.equal(T.rosterTipText('night', t), null);
  });
  it('cada visita oferece a dica do próximo bloqueado ainda não visto', () => {
    const first = T.offerRosterTip();
    assert.ok(first && first.startsWith('roster_'));
    assert.ok(TS.hasSeenTip(first));
    const second = T.offerRosterTip();
    assert.notEqual(second, first);
  });
  it('lutador já liberado não gera dica de como conseguir', () => {
    for (let i = 0; i < 20; i++) {
      const id = T.offerRosterTip();
      if (!id) break;
      const key = id.slice('roster_'.length);
      assert.equal(R.isFighterEarned(key), false, `${key} já estava liberado`);
    }
  });
});

describe('sem o rótulo "TEM"', () => {
  it('as chaves cos_owned e look_free_owned não existem mais em nenhum idioma', () => {
    for (const f of fs.readdirSync(new URL('../src/game/i18n/', import.meta.url))) {
      const src = read(`src/game/i18n/${f}`);
      assert.ok(!/\bcos_owned\b/.test(src) && !/\blook_free_owned\b/.test(src), f);
    }
  });
  it('as telas não usam mais essas chaves', () => {
    assert.ok(!read('src/game/menu/CosmeticBrowser.tsx').includes('cos_owned'));
    assert.ok(!read('src/screens/ProfileScreen.tsx').includes('look_free_owned'));
  });
});

describe('Rei Poseidon (personagem subaquático): liberado pelo Sea Beast, comprado com diamantes', () => {
  it('é do elenco, com sprites reais, busto de perfil e preço pelos atributos', () => {
    assert.ok(R.ROSTER.some((r) => r.key === 'poseidon' && r.unlock.kind === 'boss' && r.unlock.bossId === 'boss_sea_beast'));
    const Sprites = require('../src/game/battle/sprites.ts');
    for (const pose of ['idle', 'walk1', 'walk2', 'walk3', 'walk4', 'dash', 'charge', 'ult', 'strong', 'flash', 'blast', 'hurt', 'guard', 'ko', 'portrait']) {
      assert.ok(Sprites.hasPose('poseidon', pose), pose);
      assert.ok(fs.existsSync(new URL(`../assets/sprites-v2/poseidon/${pose}.png`, import.meta.url)), pose);
    }
    assert.ok(fs.existsSync(new URL('../assets/avatars/poseidon.png', import.meta.url)));
    const price = P.fighterPrice('poseidon');
    assert.ok(price >= 30 && price % 5 === 0, String(price));
  });
  it('vencer o Sea Beast libera para compra (não entrega); sem diamantes não compra; com diamantes é jogável', () => {
    assert.equal(R.isFighterUnlocked('poseidon'), false);
    assert.deepEqual(R.unlockByEvent({ boss: 'boss_sea_beast' }), ['poseidon']);
    assert.equal(R.isFighterEarned('poseidon'), true);
    assert.equal(R.isFighterUnlocked('poseidon'), false);
    A.spendDiamonds(A.getDiamonds());
    assert.deepEqual(R.buyFighter('poseidon'), { ok: false, reason: 'poor' });
    A.grantDiamonds(1000);
    const before = A.getDiamonds();
    const r = R.buyFighter('poseidon');
    assert.equal(r.ok, true);
    assert.equal(A.getDiamonds(), before - P.fighterPrice('poseidon'));
    assert.equal(R.isFighterUnlocked('poseidon'), true);
  });
  it('a dica de como liberá-lo cita o Sea Beast', () => {
    const t = (k) => ({ roster_hint_boss: 'Derrote {name} na história.', roster_hint_tower: 'x', roster_hint_pay: 'Compre.' }[k]);
    assert.match(T.rosterTipText(T.rosterTipId('poseidon'), t), /Rei Poseidon: Derrote Sea Beast/);
  });
  it('o Sea Beast em si NÃO é jogável (só chefe)', () => {
    assert.ok(!R.ROSTER.some((r) => r.key === 'sea_beast'));
  });
});
