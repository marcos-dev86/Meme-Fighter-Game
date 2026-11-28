/**
 * Alterações extras 01: slots de mundo extras comprados com diamantes (conta), listagem de slots e o seletor de personagem do
 * Criar mundo (mesma grade do Versus em modo de escolha única). Lógica pura em Node, AsyncStorage EM MEMÓRIA (nenhum save real).
 *   node tests/unit/conta/slots-extras-e-selecao-personagem.test.mjs
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
require('../../_support/ts-register.cjs');
const CFG = require('../../../src/game/account/accountConfig.ts');
const CORE = require('../../../src/game/account/accountCore.ts');
const S = require('../../../src/game/state/saveState.ts');
const { STRINGS_EXTRAS01 } = require('../../../src/game/i18n/stringsExtras01.ts');
const CH = require('../../../src/game/story/characters.ts');
const REGF = require('../../../src/game/versus/fighterRegistry.ts');

const LANGS = ['pt', 'en', 'es', 'fr', 'ja'];
const read = (p) => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
const rich = (n) => ({ ...CORE.emptyAccount(), diamonds: n });

describe('preços e limites dos slots extras', () => {
  it('3 slots grátis, preços de 100 a 150 diamantes, nunca em queda, até 6 extras (9 no total)', () => {
    assert.equal(CFG.SLOT_SHOP.base, 3);
    assert.ok(CFG.SLOT_SHOP.prices.length >= 1);
    for (const p of CFG.SLOT_SHOP.prices) assert.ok(p >= 100 && p <= 150, `preço ${p}`);
    for (let i = 1; i < CFG.SLOT_SHOP.prices.length; i++) assert.ok(CFG.SLOT_SHOP.prices[i] >= CFG.SLOT_SHOP.prices[i - 1]);
    assert.equal(CFG.MAX_EXTRA_SLOTS, CFG.SLOT_SHOP.prices.length);
    assert.equal(CFG.MAX_SLOTS, 3 + CFG.MAX_EXTRA_SLOTS);
    assert.equal(S.SLOT_COUNT, 3, 'o número de slots grátis continua 3');
  });
});

describe('compra na conta', () => {
  it('conta nova e conta antiga (sem o campo) começam com 0 extras e 3 slots', () => {
    assert.equal(CORE.emptyAccount().extraSlots, 0);
    const old = CORE.sanitizeAccount({ v: 1, nick: 'Ana', diamonds: 40 });
    assert.equal(old.extraSlots, 0);
    assert.equal(old.diamonds, 40);
    assert.equal(CORE.slotTotal(old), 3);
  });
  it('valores estranhos são limpos: negativo vira 0, acima do máximo é cortado, texto vira 0', () => {
    assert.equal(CORE.sanitizeAccount({ extraSlots: -4 }).extraSlots, 0);
    assert.equal(CORE.sanitizeAccount({ extraSlots: 99 }).extraSlots, CFG.MAX_EXTRA_SLOTS);
    assert.equal(CORE.sanitizeAccount({ extraSlots: 'x' }).extraSlots, 0);
    assert.equal(CORE.sanitizeAccount({ extraSlots: 2.9 }).extraSlots, 2);
  });
  it('comprar gasta exatamente o preço, soma 1 slot e conta a estatística', () => {
    const r = CORE.buySlot(rich(130));
    assert.equal(r.ok, true);
    assert.equal(r.price, 100);
    assert.equal(r.account.diamonds, 30);
    assert.equal(r.account.extraSlots, 1);
    assert.equal(CORE.slotTotal(r.account), 4);
    assert.equal(r.account.stats.bought_slots, 1);
  });
  it('sem diamantes suficientes nada muda (nem 1 diamante a menos)', () => {
    const a = rich(99);
    const r = CORE.buySlot(a);
    assert.deepEqual(r, { ok: false, reason: 'poor' });
    assert.equal(a.diamonds, 99);
    assert.equal(a.extraSlots, 0);
  });
  it('o preço sobe a cada compra, segue a lista e no limite não vende mais', () => {
    let a = rich(5000);
    const paid = [];
    for (let i = 0; i < CFG.MAX_EXTRA_SLOTS; i++) {
      assert.equal(CORE.nextSlotPrice(a), CFG.SLOT_SHOP.prices[i]);
      const r = CORE.buySlot(a);
      assert.equal(r.ok, true);
      paid.push(r.price);
      a = r.account;
    }
    assert.deepEqual(paid, [...CFG.SLOT_SHOP.prices]);
    assert.equal(a.extraSlots, CFG.MAX_EXTRA_SLOTS);
    assert.equal(CORE.nextSlotPrice(a), null);
    const before = a.diamonds;
    assert.deepEqual(CORE.buySlot(a), { ok: false, reason: 'max' });
    assert.equal(a.diamonds, before);
  });
  it('a conta guardada e relida mantém os slots comprados', () => {
    const bought = CORE.buySlot(rich(300)).account;
    const back = CORE.sanitizeAccount(JSON.parse(JSON.stringify(bought)));
    assert.equal(back.extraSlots, 1);
    assert.equal(back.diamonds, bought.diamonds);
  });
});

describe('slots no armazenamento', () => {
  const key = (i) => `meme_fighter_slot_${i + 1}_v2`;
  it('listSlots sem argumento devolve 3 vazios e com 5 visíveis devolve 5', async () => {
    store.clear();
    assert.deepEqual(await S.listSlots(), [null, null, null]);
    assert.equal((await S.listSlots(5)).length, 5);
    assert.equal((await S.listSlots(999)).length, CFG.MAX_SLOTS, 'nunca passa do máximo');
    assert.equal((await S.listSlots(1)).length, 3, 'nunca abaixo dos 3 grátis');
  });
  it('um mundo criado no 4º slot é gravado na chave nova, lido de volta e não mexe nos 3 primeiros', async () => {
    store.clear();
    const d1 = await S.createWorld(0, 'Antigo', 'medium', 'dogge');
    assert.ok(d1);
    const d4 = await S.createWorld(3, 'Quarto', 'hard', 'gadigago');
    assert.ok(d4);
    assert.ok(store.has(key(3)));
    const list = await S.listSlots(4);
    assert.equal(list.length, 4);
    assert.equal(list[0].name, 'Antigo');
    assert.equal(list[3].name, 'Quarto');
    assert.equal(list[3].characterId, 'gadigago');
    assert.equal(list[1], null);
  });
  it('mundo num slot acima do que a conta tem continua aparecendo (nenhum save some)', async () => {
    store.clear();
    await S.createWorld(5, 'Escondido', 'easy', 'dogge');
    const list = await S.listSlots(3);
    assert.equal(list.length, 6);
    assert.equal(list[5].name, 'Escondido');
  });
  it('apagar um slot extra deixa o slot vazio e a lista volta ao tamanho visível', async () => {
    store.clear();
    await S.createWorld(4, 'Temp', 'medium', 'dogge');
    await S.deleteSlot(4);
    assert.equal((await S.listSlots(3)).length, 3);
    assert.ok(!store.has(key(4)));
  });
});

describe('seletor de personagem do Criar mundo', () => {
  it('todo personagem da história aparece no registro do seletor com retrato e miniatura', () => {
    const all = REGF.getFighterRegistry();
    for (const id of Object.keys(CH.STORY_CHARACTERS)) {
      const e = all.find((x) => x.key === id);
      assert.ok(e, `${id} fora do registro`);
      assert.ok(e.avatar && e.portrait, id);
    }
  });
  it('o padrão enquanto nada é escolhido é o Dogge', () => {
    assert.equal(CH.DEFAULT_CHARACTER_ID, 'dogge');
    const src = read('src/screens/SaveSlotsScreen.tsx');
    assert.match(src, /useState\(DEFAULT_CHARACTER_ID\)/);
  });
  it('a tela tem o botão com foto e nome, abre o FighterSelect em escolha única e mostra o painel de habilidades', () => {
    const src = read('src/screens/SaveSlotsScreen.tsx');
    for (const w of ['select-character-btn', 'select-character-img', 'select-character-name', 'char_select_btn', '<FighterSelect', 'single', 'CharacterInfoPanel', 'detail=']) assert.ok(src.includes(w), w);
    assert.ok(src.includes('slot-buy-card') && src.includes('buyWorldSlot') && src.includes('slots_buy_confirm'), 'cartão de compra com confirmação');
  });
  it('o FighterSelect continua com o fluxo de 2 jogadores e ganhou só o modo single', () => {
    const src = read('src/game/versus/FighterSelect.tsx');
    for (const w of ['vs_pick_p1', 'vs_pick_cpu', 'vs_back_p1', 'backToP1', 'if (single)', 'useState(single)', 'showDetail']) assert.ok(src.includes(w), w);
  });
});

describe('textos', () => {
  it('chaves iguais nos 5 idiomas, com os marcadores certos e sem travessão', () => {
    const base = Object.keys(STRINGS_EXTRAS01.pt).sort();
    for (const l of LANGS) {
      assert.deepEqual(Object.keys(STRINGS_EXTRAS01[l]).sort(), base, l);
      for (const [k, v] of Object.entries(STRINGS_EXTRAS01[l])) {
        assert.ok(v.length > 0, `${l}.${k}`);
        assert.ok(!/[–—]/.test(v), `${l}.${k} travessão`);
      }
      assert.ok(STRINGS_EXTRAS01[l].slots_buy_button.includes('{price}'), l);
      assert.ok(STRINGS_EXTRAS01[l].slots_buy_confirm.includes('{price}'), l);
      assert.ok(STRINGS_EXTRAS01[l].slots_buy_poor.includes('{missing}'), l);
      assert.ok(STRINGS_EXTRAS01[l].slots_diamonds.includes('{n}'), l);
    }
    assert.equal(new Set(LANGS.map((l) => STRINGS_EXTRAS01[l].char_select_btn)).size, 5);
  });
});
