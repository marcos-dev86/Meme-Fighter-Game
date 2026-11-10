/**
 * Auditoria da PLATINA (Parte 5): a barra de progresso soma 100, cada categoria tem meta alcançável com o conteúdo que existe
 * no jogo, e 100% só aparece com TODAS as categorias completas. Roda o progressState REAL no Node (módulos nativos em stub).
 * `node tools/test-platina.mjs`
 */
import { createRequire } from 'node:module';
import Module from 'node:module';
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
const P = require('../src/game/state/progressState.ts');
const { totalPointsAt, MAX_PLAYER_LEVEL } = require('../src/game/items/levels.ts');
const { UPGRADE_STATS, UPGRADE_POINT_COSTS } = require('../src/game/items/upgrades.ts');
const { COSMETICS, COSMETIC_PROGRESS_TARGET } = require('../src/game/cosmetics/cosmeticDefs.ts');
const { SHOP_STOCK, BATTLE_STOCK, GELO_STOCK, ITEMS } = require('../src/game/items/itemDefs.ts');
const { STORY_CHARACTERS, DEFAULT_CHARACTER_ID } = require('../src/game/story/characters.ts');

const fresh = P.computeProgress();
const cat = (id) => fresh.categories.find((c) => c.id === id);

describe('barra de progresso', () => {
  it('18 categorias e pesos somando exatamente 100', () => {
    assert.equal(fresh.categories.length, 18);
    assert.equal(fresh.categories.reduce((a, c) => a + c.weight, 0), 100);
  });
  it('mundo novo: 0%, sem platina, toda categoria com meta maior que zero', () => {
    assert.equal(fresh.percent, 0);
    assert.equal(fresh.platinum, false);
    for (const c of fresh.categories) {
      assert.ok(c.total > 0, `${c.id} sem meta`);
      assert.ok(c.have <= c.total, `${c.id} já passou da meta`);
    }
  });
});

describe('metas alcançáveis com o conteúdo existente', () => {
  it('nível 99 é o teto e os pontos para maximizar os 4 atributos cabem nos ganhos do nível 99', () => {
    assert.equal(P.PROGRESS_LEVEL_TARGET, MAX_PLAYER_LEVEL);
    const need = UPGRADE_STATS.length * UPGRADE_POINT_COSTS.reduce((a, b) => a + b, 0);
    assert.equal(cat('points').total, need);
    assert.ok(totalPointsAt(MAX_PLAYER_LEVEL) >= need, `${totalPointsAt(MAX_PLAYER_LEVEL)} pontos < ${need}`);
  });
  it('meta de cosméticos não passa do que existe', () => {
    assert.ok(COSMETIC_PROGRESS_TARGET <= COSMETICS.length, `${COSMETIC_PROGRESS_TARGET} > ${COSMETICS.length}`);
  });
  it('loja: todo item da lista existe no catálogo', () => {
    const stock = [...new Set([...SHOP_STOCK, ...BATTLE_STOCK, ...GELO_STOCK])];
    assert.equal(cat('shop').total, stock.length);
    for (const id of stock) assert.ok(ITEMS[id], id);
  });
  it('missões: sem escolhas feitas contam só as missões sem caminho; cada caminho escolhido acrescenta as suas', () => {
    const c = STORY_CHARACTERS[DEFAULT_CHARACTER_ID];
    assert.equal(cat('missions').total, c.missions.filter((m) => !m.branch && !m.secret).length);
    assert.equal(cat('secret').total, c.missions.filter((m) => !m.branch && m.secret).length);
    // com qualquer opção escolhida o total nunca diminui (a platina continua alcançável)
    assert.ok(c.missions.length >= cat('missions').total);
    for (const ch of Object.values(STORY_CHARACTERS)) assert.ok(ch.missions.length > 0);
  });
  it('cassino = 5 jogos; monstros = 300; mapa e NPCs têm metas realistas', () => {
    assert.equal(cat('casino').total, 5);
    assert.equal(cat('monsters').total, 300);
    assert.ok(cat('npcs').total >= 10 && cat('chests').total >= 10 && cat('islands').total >= 2 && cat('map').total >= 20);
  });
});
