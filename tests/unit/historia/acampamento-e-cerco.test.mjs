/**
 * Acampamento: ilha menor, cerco dos orcs em ondas (3 a 6 pela dificuldade), fluxo entre batalhas. `node tests/unit/historia/acampamento-e-cerco.test.mjs`
 */
import { createRequire } from 'node:module';
import Module from 'node:module';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const stub = () => new Proxy(function () {}, { get: (t, p) => (p === '__esModule' ? true : p === 'default' ? stub() : p === Symbol.toPrimitive ? () => 0 : stub()), apply: () => stub() });
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (/^(react-native|expo|@expo|react-native-)/.test(req)) return stub();
  if (req === '@react-native-async-storage/async-storage') return { __esModule: true, default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } };
  return origLoad.call(this, req, ...rest);
};
require('../../_support/ts-register.cjs');
const W = require('../../../src/game/world/worldGen.ts');
const Siege = require('../../../src/game/story/siege.ts');
const { DIFFICULTIES } = require('../../../src/game/state/difficulty.ts');
const Q = require('../../../src/game/state/questState.ts');
const { DOGGE_MISSIONS } = require('../../../src/game/story/missionsDogge.ts');
const BM = require('../../../src/game/battle/battleModes.ts');
const { NPCS } = require('../../../src/game/world/npcs.ts');
const read = (p) => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');

const R = W.CAMP_TILES;
const OLD = { x0: 260, y0: 1208, x1: 540, y1: 1368 };

describe('a ilha do acampamento ficou bem menor', () => {
  it('menos de 1/6 da área original, mas ainda com espaço para o salão e os NPCs', () => {
    const area = (r) => (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
    assert.ok(area(R) < area(OLD) / 6, `${area(R)} vs ${area(OLD)}`);
    assert.ok(R.x1 - R.x0 >= 60 && R.y1 - R.y0 >= 60);
  });
  it('o portão sul e o cais ficam onde estavam (o barco continua chegando)', () => {
    assert.equal(R.y1, OLD.y1);
    const midX = Math.round((R.x0 + R.x1) / 2);
    assert.equal(W.getWorldTile(midX, R.y1), 'path', 'portão');
    assert.deepEqual(W.REGION_ANCHORS.camp, { x: 400, y: 1338 });
  });
  it('o que era camp e agora está fora é mar; o que ficou é parede e chão', () => {
    assert.equal(W.getWorldTile(270, 1300), 'water');
    assert.equal(W.getWorldTile(520, 1250), 'water');
    assert.equal(W.getWorldTile(R.x0, 1300), 'wall');
    assert.equal(W.getWorldTile(400, 1300) === 'water', false);
  });
  it('NPCs do acampamento, salão e dica estão DENTRO da ilha nova e em chão andável', () => {
    const inside = (x, y) => x > R.x0 && x < R.x1 && y > R.y0 && y < R.y1;
    const solid = new Set(['water', 'tree', 'rock', 'wall', 'lava', 'shop', 'house']);
    for (const [x, y] of [[376, 1330], [400, 1306], [400, 1348], [424, 1312], [424, 1336]]) {
      assert.ok(inside(x, y), `${x},${y} fora da ilha`);
      assert.equal(solid.has(W.getWorldTile(x, y)), false, `${x},${y} em tile sólido: ${W.getWorldTile(x, y)}`);
    }
    assert.equal(W.getWorldTile(400, 1318), 'house', 'salão do acampamento');
    assert.equal(W.islandAt ? W.islandAt(400, 1300) : 'camp', 'camp');
  });
  it('os NPCs do acampamento têm lugar fixo dentro da ilha nova (nenhum ficou na água)', () => {
    const src = read('src/game/world/npcs.ts');
    assert.match(src, /npcId: 'orc_guard', x: 376, y: 1330/);
    assert.match(src, /npcId: 'soldier_captain', x: 400, y: 1306/);
    assert.match(src, /npcId: 'tico', x: 400, y: 1348/);
  });
});

describe('a Ilha dos Cães ficou bem menor', () => {
  const D = W.DOGISLAND_TILES;
  const OLDD = { x0: 1050, y0: 1188, x1: 1400, y1: 1408 };
  const area = (r) => (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
  it('cerca de 1/3 da área anterior, com a borda norte (píer) no mesmo lugar', () => {
    assert.ok(area(D) < area(OLDD) / 2.5, `${area(D)} vs ${area(OLDD)}`);
    assert.equal(D.y0, OLDD.y0);
    assert.ok(D.x1 - D.x0 >= 120 && D.y1 - D.y0 >= 120, 'ainda dá para andar');
  });
  it('âncora de chegada, cais e NPCs continuam dentro da ilha, em chão andável', () => {
    assert.deepEqual(W.REGION_ANCHORS.dogisland, { x: 1225, y: 1298 });
    const dock = W.FERRY_DOCKS.dogisland;
    assert.deepEqual(dock.anchor, { x: 1224, y: 1182 });
    const solid = new Set(['water', 'tree', 'rock', 'wall', 'lava', 'shop', 'house']);
    const npcs = [[1166, 1277], [1164, 1319], [1264, 1299], [1229, 1295], [1202, 1303], [1189, 1339]];
    for (const [x, y] of npcs) {
      assert.ok(x > D.x0 && x < D.x1 && y > D.y0 && y < D.y1, `${x},${y} fora da ilha`);
    }
    assert.equal(W.getWorldTile(1050, 1250), 'water', 'o que era ilha e saiu virou mar');
    assert.equal(W.getWorldTile(1380, 1380), 'water');
    assert.equal(solid.has(W.getWorldTile(1225, 1298)), false, 'âncora em chão andável');
  });
});

describe('cerco dos orcs: de 3 a 6 batalhas conforme a dificuldade', () => {
  it('3 (iniciante/fácil), 4 (médio), 5 (difícil), 6 (hardcore)', () => {
    assert.deepEqual(DIFFICULTIES.map(Siege.siegeWavesFor), [3, 3, 4, 5, 6]);
    for (const d of DIFFICULTIES) { const n = Siege.siegeWavesFor(d); assert.ok(n >= 3 && n <= 6); }
  });
  it('a missão do acampamento é a do cerco: orcs, em ondas, mesmo id de antes', () => {
    const m = DOGGE_MISSIONS.find((x) => x.id === 'camp_showdown');
    assert.equal(m.objective.kind, 'battle'); assert.equal(m.objective.siege, true); assert.equal(m.objective.opponent, 'orc');
    assert.equal(Q.QUEST_BATTLE_DEFS.camp_showdown.siege, true);
    assert.ok(/orc/i.test(m.title + m.hint));
    assert.ok(m.requires.includes('talk_tico'));
  });
  it('as outras missões de batalha não viram cerco', () => {
    for (const [id, d] of Object.entries(Q.QUEST_BATTLE_DEFS)) if (id !== 'camp_showdown') assert.ok(!d.siege, id);
  });
  for (const d of DIFFICULTIES) {
    it(`${d}: percorre todas as ondas, só termina na última, perder reinicia`, () => {
      const n = Siege.siegeWavesFor(d);
      const run = Siege.startSiege('camp_showdown', d);
      assert.deepEqual([run.wave, run.total], [1, n]);
      for (let w = 1; w < n; w++) {
        const step = Siege.siegeWin();
        assert.equal(step.done, false); assert.equal(step.wave, w + 1);
      }
      assert.equal(Siege.siegeWin().done, true);
      assert.equal(Siege.getSiege(), null);
      Siege.startSiege('camp_showdown', d); Siege.siegeWin();
      Siege.siegeLose();
      assert.equal(Siege.getSiege(), null);
      assert.equal(Siege.startSiege('camp_showdown', d).wave, 1, 'recomeça da onda 1');
      Siege.siegeLose();
    });
  }
  it('cada onda é um pouco mais forte e a última é a do chefe orc', () => {
    for (const total of [3, 4, 5, 6]) {
      let prev = null;
      for (let w = 1; w <= total; w++) {
        const s = Siege.siegeWaveScale(w, total);
        if (prev) { assert.ok(s.hp > prev.hp && s.dmg > prev.dmg); }
        assert.equal(s.boss, w === total);
        assert.ok(s.hp >= 0.8 && s.hp <= 1.7 && s.dmg >= 0.85 && s.dmg <= 1.4, `${w}/${total}: ${s.hp} ${s.dmg}`);
        prev = s;
      }
    }
  });
  it('a luta de cada onda é contra um orc, com título da onda e escala própria', () => {
    for (const w of [1, 2, 4]) {
      const s = BM.resolveSetup({ questId: 'camp_showdown', siegeWave: String(w), siegeTotal: '4', p2: 'orc' }, {});
      assert.equal(s.kind, 'quest'); assert.equal(s.opponent, 'orc'); assert.equal(s.questId, 'camp_showdown');
      assert.equal(s.title, `ONDA ${w}/4`);
      assert.equal(s.bossFight, w === 4);
      const sc = Siege.siegeWaveScale(w, 4);
      assert.equal(s.hpMult, sc.hp); assert.equal(s.dmgMult, sc.dmg);
    }
    const plain = BM.resolveSetup({ questId: 'camp_showdown', p2: 'orc' }, {});
    assert.equal(plain.title, undefined);
  });
  it('o fluxo está ligado: o mundo inicia o cerco, a luta avança a onda e a derrota reinicia', () => {
    const w = read('src/screens/WorldScreen.tsx');
    assert.match(w, /startSiege\(questId, getStoryDifficulty\(\)\)/);
    assert.match(w, /siegeWave: String\(siege\.wave\), siegeTotal: String\(siege\.total\)/);
    const b = read('src/screens/BattleScreen.tsx');
    assert.match(b, /siegeWin\(\)/);
    assert.match(b, /siegeLose\(\); \/\/ perdeu no meio do cerco/);
    assert.match(b, /router\.replace\(\{ pathname: '\/battle', params: \{ \.\.\.params, siegeWave:/);
    assert.match(b, /siegeNext && <MenuButton label=\{t\('siege_next'\)\}/);
  });
  it('a missão só conclui na última onda (a vitória intermediária não chama setQuestStatus)', () => {
    const b = read('src/screens/BattleScreen.tsx');
    const i = b.indexOf('if (siegeStep && !siegeStep.done) {');
    const j = b.indexOf("setQuestStatus(params.questId, 'completed');");
    assert.ok(i > 0 && j > i);
    const between = b.slice(i, j);
    assert.equal((between.match(/setQuestStatus\(/g) || []).length, 0, 'onda intermediária não completa a missão');
  });
  it('textos do cerco nos 5 idiomas, com {n} na oferta', () => {
    const { EXTRA_STRINGS } = require('../../../src/game/i18n/extraStrings.ts');
    const tr = require('../../../src/game/i18n/translations.ts');
    for (const lang of ['pt', 'en', 'es', 'fr', 'ja']) {
      const tb = Object.assign({}, ...EXTRA_STRINGS.map((m) => m[lang]));
      for (const k of ['siege_wave_cleared', 'siege_next']) assert.ok(tb[k] && !/[—–]/.test(tb[k]), `${lang} ${k}`);
    }
    const src = read('src/game/i18n/translations.ts');
    assert.equal((src.match(/quest_camp_offer: '[^\n]*\{n\}/g) || []).length, 5);
  });
  it('o Capitão Ferro continua sendo quem oferece a missão', () => {
    assert.equal(Q.QUEST_BATTLE_DEFS.camp_showdown.giver, 'soldier_captain');
    assert.ok(NPCS.soldier_captain);
  });
});

describe('o Soldado ajuda no cerco: lanças na luta e itens entre as ondas', () => {
  const { ITEMS } = require('../../../src/game/items/itemDefs.ts');
  it('só ajuda a partir da onda 2, e mais rápido na onda final', () => {
    assert.equal(Siege.allyIntervalMs(1, 4), 0);
    assert.equal(Siege.allyIntervalMs(2, 4), Siege.SIEGE_ALLY.everyMs);
    assert.equal(Siege.allyIntervalMs(3, 4), Siege.SIEGE_ALLY.everyMs);
    assert.equal(Siege.allyIntervalMs(4, 4), Siege.SIEGE_ALLY.finalEveryMs);
    assert.ok(Siege.SIEGE_ALLY.finalEveryMs < Siege.SIEGE_ALLY.everyMs);
  });
  it('a lança tira 5% da vida do orc, mas NUNCA mata: o último golpe é do jogador', () => {
    assert.equal(Siege.allySpearDamage(200, 200), 10);
    assert.equal(Siege.allySpearDamage(200, 6), 5);
    assert.equal(Siege.allySpearDamage(200, 1), 0);
    assert.equal(Siege.allySpearDamage(50, 3), 2);
    for (let hp = 1; hp <= 300; hp += 7) assert.ok(hp - Siege.allySpearDamage(300, hp) >= 1, `hp ${hp}`);
  });
  it('cada onda vencida rende uma Poção de Vida P; antes da onda final vem também a Poção de Fúria', () => {
    for (const total of [3, 4, 5, 6]) {
      for (let cleared = 1; cleared < total; cleared++) {
        const g = Siege.allyGifts(cleared, total);
        assert.equal(g.potion_hp_s, 1);
        assert.equal(!!g.power_brew, cleared === total - 1, `${cleared}/${total}`);
        for (const id of Object.keys(g)) assert.ok(ITEMS[id] && ITEMS[id].rarity !== 'secret', id);
      }
    }
  });
  it('não quebra o equilíbrio: a cura total que ele dá é pequena perto da vida do jogador', () => {
    let heal = 0;
    for (let c = 1; c < 6; c++) heal += (Siege.allyGifts(c, 6).potion_hp_s ?? 0) * 20;
    assert.ok(heal <= 100);
  });
  it('a luta usa a lança e entrega os itens (e mostra o aviso)', () => {
    const b = read('src/screens/BattleScreen.tsx');
    assert.match(b, /allyIntervalMs\(Number\(params\.siegeWave\), Number\(params\.siegeTotal\)\)/);
    assert.match(b, /allySpearDamage\(p2\.maxHealth, p2\.health\)/);
    assert.match(b, /allyGifts\(siegeStep\.wave - 1, siegeStep\.total\)/);
    assert.match(b, /t\('siege_ally_gift'\)/);
    const { EXTRA_STRINGS } = require('../../../src/game/i18n/extraStrings.ts');
    for (const lang of ['pt', 'en', 'es', 'fr', 'ja']) { const tb = Object.assign({}, ...EXTRA_STRINGS.map((m) => m[lang])); for (const k of ['siege_ally_hit', 'siege_ally_gift']) assert.ok(tb[k] && !/[—–]/.test(tb[k]), `${lang} ${k}`); }
  });
});
