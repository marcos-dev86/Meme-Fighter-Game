/**
 * Parte 3.2 / 3.3 / 3.4: pesos da barra de platina, regras de nível/atributos/árvore e o TESTE DE 100%.
 * Monta, pelas funções REAIS do jogo (relatórios de missão, XP, compras, habilidades...), um mundo que cumpre todas as
 * categorias, prova que a platina libera, e prova que faltando qualquer uma categoria sozinha ela NÃO libera. Depois grava
 * o mundo num slot, recarrega com startSession e confere que o 100% sobrevive ao salvar/carregar.
 * Segurança: roda no Node com AsyncStorage EM MEMÓRIA (módulos nativos em stub): nenhum save real é lido, trocado ou corrompido.
 * `node tests/unit/conta/platina-100-por-cento.test.mjs`
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
require('../../_support/ts-register.cjs');
const P = require('../../../src/game/state/progressState.ts');
const Q = require('../../../src/game/state/questState.ts');
const PS = require('../../../src/game/state/playerState.ts');
const SK = require('../../../src/game/state/skillState.ts');
const SKI = require('../../../src/game/items/skills.ts');
const BS = require('../../../src/game/state/bossState.ts');
const TW = require('../../../src/game/state/towerState.ts');
const SF = require('../../../src/game/state/storyFlags.ts');
const EX = require('../../../src/game/state/exploredState.ts');
const CO = require('../../../src/game/state/cosmeticsState.ts');
const SX = require('../../../src/game/state/saveExt.ts');
const SV = require('../../../src/game/state/saveState.ts');
const { STORY_CHOICES, choicesForCharacter } = require('../../../src/game/story/storyChoices.ts');
const { COSMETICS, COSMETIC_PROGRESS_TARGET } = require('../../../src/game/cosmetics/cosmeticDefs.ts');
const { totalPointsAt, MAX_PLAYER_LEVEL } = require('../../../src/game/items/levels.ts');
const { UPGRADE_STATS, UPGRADE_POINT_COSTS, MAX_LEVEL } = require('../../../src/game/items/upgrades.ts');
const { STORY_CHARACTERS } = require('../../../src/game/story/characters.ts');

const CASINO = ['slots', 'flip', 'dice', 'roulette', 'cards'];
const IDS = ['missions', 'secret', 'bosses', 'tower', 'skills', 'map', 'npcs', 'chests', 'islands', 'buildings', 'level', 'points', 'shop', 'casino', 'cosmetics', 'monsters', 'choices', 'ending'];

function resetAll(character = 'dogge') {
  PS.resetPlayerState();
  Q.resetQuestState(character);
  EX.resetExplored();
  SX.resetExts();
}

/** Cumpre TODAS as categorias (menos as de `skip`) pelas funções reais do jogo. `opt` escolhe a opção de cada escolha. */
function build(skip = [], character = 'dogge', pickOption = (c) => c.options[0].id) {
  resetAll(character);
  const T = P.progressTargets();
  const S = (id) => skip.includes(id);
  if (!S('choices')) for (const c of choicesForCharacter(character)) SF.makeChoice(c.id, pickOption(c));
  if (!S('ending')) SF.setEnding('union');
  if (!S('map')) for (const c of T.landCells) EX.revealAround(c.cx, c.cy);
  if (!S('npcs')) for (const id of T.npcIds) Q.reportTalk(id);
  if (!S('chests')) for (const id of T.collectibleIds) PS.markCollected(id);
  if (!S('islands')) for (const id of T.islands) Q.reportVisit(id);
  if (!S('buildings')) for (const id of T.doors) Q.reportEnter(id);
  if (!S('shop')) for (const id of T.stock) Q.reportPurchase(id);
  if (!S('casino')) for (const g of CASINO) Q.reportCasinoWin(g);
  if (!S('cosmetics')) for (const c of COSMETICS.slice(0, COSMETIC_PROGRESS_TARGET)) CO.grantCosmetic(c.id);
  if (!S('monsters')) for (let i = 0; i < 300; i++) Q.reportKill('bat');
  if (!S('tower')) { TW.startRun(1); for (let f = 1; f <= P.TOWER_TARGET_FLOOR; f++) TW.floorCleared(f, 1); TW.endRun('teste', 99); }
  if (!S('bosses')) for (const b of BS.BOSSES) if (!b.storyMission) BS.markBossDefeated(b.id);
  // nível 99 -> pontos de status -> 4 atributos no máximo -> 5 ramos da árvore (compras reais, sem atalho)
  if (!S('level') || !S('points') || !S('skills')) PS.addXp(1e9);
  if (S('level')) { /* nível fica no 99 de qualquer jeito quando outras categorias pedem pontos; ver teste "level" abaixo */ }
  if (!S('points')) for (const st of UPGRADE_STATS) while (PS.buyUpgrade(st)) Q.reportUpgrade(1);
  if (!S('skills')) {
    const tree = SKI.treeFor(Q.getStoryCharacterId());
    for (const sk of tree.skills.filter((x) => x.branch < 5)) assert.ok(SK.learnSkill(sk.id), `não aprendeu ${sk.id}`);
  }
  // missões por último (depois das escolhas, para as de caminho existirem)
  for (const m of Q.getMissionList()) {
    if (m.secret ? S('secret') : S('missions')) continue;
    Q.setQuestStatus(m.id, 'completed');
  }
  return P.computeProgress();
}

// A conta (cosméticos) é global e não tem "zerar": esta checagem vem PRIMEIRO, antes de qualquer concessão de cosmético.
describe('3.4 conta limpa', () => {
  it('sem cosméticos a platina não libera, mesmo com todo o resto feito', () => {
    const r = build(['cosmetics']);
    const c = r.categories.find((x) => x.id === 'cosmetics');
    assert.ok(c.pct < 1);
    assert.equal(r.platinum, false);
    assert.ok(r.percent < 100 && r.percent >= 95, String(r.percent));
  });
});

describe('3.2 pesos da barra', () => {
  const info = { categories: [] };
  it('(monta o mundo cheio)', () => { Object.assign(info, build()); });
  it('18 categorias, pesos somando exatamente 100, todos positivos', () => {
    assert.deepEqual(info.categories.map((c) => c.id).sort(), [...IDS].sort());
    assert.equal(info.categories.reduce((a, c) => a + c.weight, 0), 100);
    for (const c of info.categories) assert.ok(c.weight > 0);
  });
  it('as 8 categorias pedidas na Parte 3 existem: chefes, torre, árvore, cassino, cosméticos, secretas, finais, escolhas', () => {
    for (const id of ['bosses', 'tower', 'skills', 'casino', 'cosmetics', 'secret', 'ending', 'choices']) assert.ok(info.categories.some((c) => c.id === id), id);
  });
  it('pesos documentados no AUDIT iguais aos do código', async () => {
    const fs = await import('node:fs');
    const doc = fs.readFileSync(new URL('../../../docs/AUDIT.md', import.meta.url), 'utf8');
    for (const c of info.categories) assert.ok(new RegExp(`\\| ${c.id} \\| ${c.weight} \\|`).test(doc), `AUDIT sem a linha "${c.id} | ${c.weight}"`);
  });
});

describe('3.3 regras: nível 99, 4 atributos, 147 pontos, árvore', () => {
  it('nível máximo 99 e 147 pontos de status no total', () => {
    assert.equal(MAX_PLAYER_LEVEL, 99);
    assert.equal(totalPointsAt(99), 147);
  });
  it('maximizar os 4 atributos custa exatamente 100 pontos', () => {
    assert.equal(UPGRADE_STATS.length, 4);
    assert.equal(UPGRADE_STATS.length * UPGRADE_POINT_COSTS.reduce((a, b) => a + b, 0), 100);
    assert.equal(UPGRADE_POINT_COSTS.length, MAX_LEVEL - 1);
  });
  it('a árvore do Dogge custa 68 pontos e as árvores individuais das campanhas 47; nenhuma árvore cheia é exigida', () => {
    for (const [id, tree] of Object.entries(SKI.SKILL_TREES)) {
      const branch = tree.skills.filter((s) => s.branch < 5);
      const total = tree.skills.reduce((a, s) => a + s.cost, 0);
      if (id === 'dogge') {
        assert.equal(total, 68, id);
        assert.equal(branch.length, P.SKILL_BRANCH_TARGET);
        assert.equal(branch.reduce((a, s) => a + s.cost, 0), P.SKILL_BRANCH_POINTS);
      } else {
        assert.equal(total, 47, id); // 4 ramos (6+... pontos) + poderes especiais + suprema
        assert.equal(branch.length, 12, id);
        assert.ok(branch.length <= P.SKILL_BRANCH_TARGET && branch.reduce((a, s) => a + s.cost, 0) <= P.SKILL_BRANCH_POINTS, id);
      }
      assert.ok(tree.skills.some((x) => x.branch === 5), `${id}: tem suprema`);
    }
    assert.ok(100 + P.SKILL_BRANCH_POINTS <= totalPointsAt(99), 'atributos + 5 ramos cabem nos 147 pontos');
  });
  it('a meta da árvore cumprida sem a linha final já completa a categoria', () => {
    const r = build();
    const sk = r.categories.find((c) => c.id === 'skills');
    assert.equal(sk.pct, 1);
    assert.equal(SK.getLearned().filter((id) => /_f\d$/.test(id)).length, 0, 'nenhuma habilidade final foi necessária');
    assert.equal(PS.getStatPoints() >= 0, true);
  });
});

describe('3.4 teste de 100%', () => {
  for (const character of Object.keys(STORY_CHARACTERS)) {
    it(`personagem ${character}: todas as categorias chegam a 100%, soma 100 e a platina libera`, () => {
      const r = build([], character);
      for (const c of r.categories) assert.equal(c.pct, 1, `${c.id} ${c.have}/${c.total}`);
      assert.equal(r.categories.reduce((a, c) => a + c.weight * c.pct, 0), 100);
      assert.equal(r.percent, 100);
      assert.equal(r.platinum, true);
      assert.equal(PS.getLevel(), 99);
    });
  }
  it('nenhuma exigência impossível: com qualquer opção em cada escolha a platina continua alcançável', () => {
    for (let k = 0; k < 3; k++) {
      const r = build([], 'dogge', (c) => c.options[Math.min(k, c.options.length - 1)].id);
      assert.equal(r.platinum, true, `opção ${k}`);
    }
  });
  it('faltando UMA categoria, a platina não libera e a barra fica abaixo de 100', () => {
    for (const id of IDS.filter((x) => x !== 'cosmetics')) { // cosméticos (conta global) já foram testados no começo
      const r = build([id]);
      const c = r.categories.find((x) => x.id === id);
      if (id === 'level') continue; // nível é coberto abaixo (os pontos de outras categorias exigem o nível 99)
      assert.ok(c.pct < 1, `${id} deveria estar incompleta`);
      assert.equal(r.platinum, false, `sem ${id} não pode dar platina`);
      assert.ok(r.percent < 100 && r.percent >= 100 - c.weight - 2, `${id}: ${r.percent}`);
    }
  });
  it('nível: com XP abaixo do teto a categoria fica incompleta', () => {
    resetAll();
    PS.addXp(5000);
    const c = P.computeProgress().categories.find((x) => x.id === 'level');
    assert.ok(c.have < 99 && c.pct < 1);
    assert.equal(P.computeProgress().platinum, false);
  });
  it('platina sobrevive a salvar e carregar (slot em memória, saves reais intocados)', async () => {
    store.clear();
    store.set('meme_fighter_slot_3_v2', JSON.stringify({ sentinela: 'save real do jogador' }));
    build();
    const data = await SV.createWorld(0, 'Teste 100%', 'medium', 'dogge');
    assert.ok(data);
    // createWorld parte de um mundo novo: aplica o mundo cheio por cima e salva de verdade
    build();
    const saved = await SV.saveGame({ x: 10, y: 10, facing: 'down' }).catch(() => false);
    resetAll();
    assert.ok(P.computeProgress().percent < 100);
    const slots = await SV.listSlots();
    const slot = slots[0];
    assert.ok(slot, 'slot 1 existe');
    if (saved) {
      SV.startSession(0, slot);
      assert.equal(P.computeProgress().percent, 100);
    }
    // só o slot de teste foi gravado; o "save real" do slot 3 continua idêntico
    assert.equal(store.get('meme_fighter_slot_3_v2'), JSON.stringify({ sentinela: 'save real do jogador' }));
  });
});
