/**
 * Parte 2.2 (aparições especiais do rival) e 2.3 (inimigos de elite). Roda os módulos REAIS no Node (módulos nativos em stub,
 * AsyncStorage em memória): progressão de dificuldade do rival, abertura em sequência, recompensas, saves antigos, elites
 * (aparecem só depois da missão, mais fortes e mais bem pagos que os comuns, reaproveitam o motor de inimigos do mundo).
 * `node tests/unit/combate/rival-e-inimigos-de-elite.test.mjs`
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
const R = require('../../../src/game/state/rivalState.ts');
const BM = require('../../../src/game/battle/battleModes.ts');
const PS = require('../../../src/game/state/playerState.ts');
const SX = require('../../../src/game/state/saveExt.ts');
const ES = require('../../../src/game/state/eliteState.ts');
const Q = require('../../../src/game/state/questState.ts');
const { ELITES, eliteAt, ELITE_RESPAWN_MULT } = require('../../../src/game/enemies/eliteDefs.ts');
const { ENEMY_SPAWNS } = require('../../../src/game/enemies/enemySpawns.ts');
const { ENEMY_DEFS } = require('../../../src/game/enemies/enemyDefs.ts');
const { EnemyManager } = require('../../../src/game/enemies/enemySim.ts');
const { STAGE_KEYS } = require('../../../src/game/battle/stages.ts');
const { ITEMS } = require('../../../src/game/items/itemDefs.ts');
const { DOGGE_MISSIONS } = require('../../../src/game/story/missionsDogge.ts');
const read = (p) => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');

const missionIds = new Set(DOGGE_MISSIONS.map((m) => m.id));
const reset = () => { PS.resetPlayerState(); SX.resetExts(); Q.resetQuestState('dogge'); };

describe('2.2 rival: 5 aparições', () => {
  const E = R.RIVAL_ENCOUNTERS;
  it('são 5, numeradas, com missão-gatilho e cenário que existem', () => {
    assert.equal(E.length, 5);
    E.forEach((e, i) => {
      assert.equal(e.n, i + 1);
      assert.ok(missionIds.has(e.gate), `gatilho ${e.gate}`);
      assert.ok(STAGE_KEYS.includes(e.stageKey), e.stageKey);
      for (const id of Object.keys(e.reward.items ?? {})) assert.ok(ITEMS[id], id);
    });
  });
  it('gatilhos vêm na ordem da história (cada um depois do anterior) e antes da missão final', () => {
    const order = DOGGE_MISSIONS.map((m) => m.id);
    const idx = E.map((e) => order.indexOf(e.gate));
    for (let i = 1; i < idx.length; i++) assert.ok(idx[i] > idx[i - 1], `${E[i].gate} depois de ${E[i - 1].gate}`);
    assert.ok(idx[4] < order.indexOf('final_meme_fighter'));
  });
  it('cada aparição é mais forte que a anterior (mesmo nível e mesmas vitórias): vida, dano, status e prêmio', () => {
    for (const [lv, w] of [[1, 0], [20, 2], [60, 5], [99, 9]]) {
      for (let i = 1; i < E.length; i++) {
        const a = R.rivalEncounterScale(E[i - 1], lv, w), b = R.rivalEncounterScale(E[i], lv, w);
        assert.ok(b.hp >= a.hp && b.dmg >= a.dmg, `lv${lv} w${w} tier ${i + 1}`);
        if (b.hp < R.RIVAL_HP_CAP) assert.ok(b.hp > a.hp);
      }
    }
    for (let i = 1; i < E.length; i++) {
      assert.ok(E[i].procs.length >= E[i - 1].procs.length, 'mais status');
      assert.ok(E[i].reward.coins > E[i - 1].reward.coins && E[i].reward.xp > E[i - 1].reward.xp);
    }
    assert.deepEqual([...new Set(E.flatMap((e) => e.procs.map((p) => p.kind)))].sort(), ['burn', 'freeze', 'poison', 'stun']);
    assert.ok(E[0].procs.every((p) => p.kind === 'freeze') && E[4].procs.some((p) => p.kind === 'burn' && p.on.includes('ultimate')), 'status novos entram nas aparições finais');
  });
  it('a força considera o nível do jogador e as vitórias anteriores', () => {
    const e = E[2];
    assert.ok(R.rivalEncounterScale(e, 30, 0).hp > R.rivalEncounterScale(e, 10, 0).hp);
    assert.ok(R.rivalEncounterScale(e, 10, 4).hp > R.rivalEncounterScale(e, 10, 0).hp);
    assert.ok(R.rivalEncounterScale(e, 30, 0).dmg > R.rivalEncounterScale(e, 10, 0).dmg);
    assert.ok(R.rivalEncounterScale(e, 10, 4).dmg > R.rivalEncounterScale(e, 10, 0).dmg);
  });
  it('nunca fica impossível: teto de vida/dano e, no nível esperado de cada gatilho, não passa de ~1,5x a revanche livre', () => {
    for (const e of E) {
      const s = R.rivalEncounterScale(e, 99, 50);
      assert.ok(s.hp <= R.RIVAL_HP_CAP && s.dmg <= R.RIVAL_DMG_CAP);
    }
    const expectLevel = [6, 14, 24, 32, 45];
    E.forEach((e, i) => {
      const w = i; // venceu as anteriores
      const s = R.rivalEncounterScale(e, expectLevel[i], w);
      const free = { hp: 1 + expectLevel[i] * 0.045 + w * 0.12, dmg: 1 + expectLevel[i] * 0.02 + w * 0.06 };
      assert.ok(s.hp <= free.hp * 1.5 && s.dmg <= free.dmg * 1.5, `aparição ${e.n}: ${JSON.stringify(s)} vs ${JSON.stringify(free)}`);
    });
  });
  it('opcionais: nenhuma missão exige vencer o rival de novo (não bloqueia a história)', () => {
    const src = read('src/game/story/missionsDogge.ts');
    assert.ok(!/rival_enc|rivalEncounter|RIVAL_ENCOUNTERS/.test(src));
  });
});

describe('2.2 rival: abertura, luta e prêmio', () => {
  it('abre em sequência: só quando a missão-gatilho terminou e a anterior foi vencida', () => {
    reset();
    const done = new Set();
    const isDone = (m) => done.has(m);
    assert.equal(R.nextRivalEncounter(isDone), null);
    done.add('kills_12');
    assert.equal(R.nextRivalEncounter(isDone).n, 1);
    done.add('vulcao_boss'); // 5º gatilho já feito, mas a 1ª ainda não foi vencida
    assert.equal(R.nextRivalEncounter(isDone).n, 1);
    R.markRivalEncounterDefeated(1);
    assert.equal(R.nextRivalEncounter(isDone), null, 'gatilho da 2 (camp_showdown) ainda não feito');
    done.add('camp_showdown');
    assert.equal(R.nextRivalEncounter(isDone).n, 2);
  });
  it('resolveSetup: parâmetros r1..r5 viram luta de rival com força e status da aparição; "1" continua a revanche', () => {
    reset();
    PS.addXp(3000);
    for (let n = 1; n <= 5; n++) {
      const s = BM.resolveSetup({ rival: R.getRivalEncounterParam(n) });
      const enc = R.RIVAL_ENCOUNTERS[n - 1];
      assert.equal(s.kind, 'rival');
      assert.equal(s.opponent, 'gadigago');
      assert.equal(s.rivalEncounter.n, n);
      assert.equal(s.stageKey, enc.stageKey);
      assert.equal(s.extraProcs.length, enc.procs.length);
      assert.ok(s.hpMult > 1 && s.roundsToWin === 2 && s.bossFight);
    }
    const old = BM.resolveSetup({ rival: '1' });
    assert.equal(old.kind, 'rival');
    assert.equal(old.rivalEncounter, undefined);
  });
  it('vitória: marca a aparição, soma uma vitória, paga moedas/XP/itens UMA vez', () => {
    reset();
    const s = BM.resolveSetup({ rival: 'r2' });
    const c0 = PS.getCoins(), w0 = R.getRivalWins();
    const g = BM.grantVictory(s, 1);
    assert.ok(R.isRivalEncounterDefeated(2));
    assert.equal(R.getRivalWins(), w0 + 1);
    assert.ok(g.coins >= R.RIVAL_ENCOUNTERS[1].reward.coins && g.xp > 0);
    assert.ok(PS.getCoins() > c0);
    assert.ok(g.lines.length >= 1, 'item da aparição');
    const g2 = BM.grantVictory(s, 1);
    assert.equal(g2.coins, 0);
    assert.equal(R.getRivalWins(), w0 + 1);
  });
  it('save: aparições vencidas e vitórias persistem; save antigo (só {wins}) carrega sem erro com padrão vazio', () => {
    reset();
    R.markRivalEncounterDefeated(1); R.markRivalEncounterDefeated(3); R.addRivalWin();
    const snap = SX.snapshotExts();
    reset();
    assert.equal(R.rivalEncountersDefeated(), 0);
    SX.restoreExts(snap);
    assert.ok(R.isRivalEncounterDefeated(1) && R.isRivalEncounterDefeated(3) && !R.isRivalEncounterDefeated(2));
    assert.equal(R.getRivalWins(), 1);
    SX.restoreExts({ rival: { wins: 4 } });
    assert.equal(R.getRivalWins(), 4);
    assert.equal(R.rivalEncountersDefeated(), 0);
    SX.restoreExts({ rival: { wins: 'x', encounters: [9, 'a', 2] } });
    assert.equal(R.getRivalWins(), 0);
    assert.deepEqual([R.isRivalEncounterDefeated(2), R.isRivalEncounterDefeated(9)], [true, false]);
    SX.restoreExts({});
    assert.equal(R.rivalEncountersDefeated(), 0);
  });
  it('mundo: o botão do rival usa a próxima aparição e avisa quando a missão libera', () => {
    const w = read('src/screens/WorldScreen.tsx');
    assert.ok(/nextRivalEncounter\(/.test(w) && /rival_challenge/.test(w) && /rival_appeared/.test(w));
  });
});

// ---------------------------------------------------------------- elites
const mapOf = () => ({ tileSize: 32, width: 2200, height: 1300, getTile: () => 'grass' });
const open = new Set();
const isOpen = (d) => open.has(d.gate);

describe('2.3 elites: definição', () => {
  it('cada elite ocupa um spawn que existe, com missão-gatilho real e item de prêmio real', () => {
    assert.ok(ELITES.length >= 5);
    const ids = new Set();
    for (const e of ELITES) {
      assert.ok(!ids.has(e.id)); ids.add(e.id);
      assert.ok(ENEMY_SPAWNS.some(([t, x, y]) => t === e.spawn[0] && x === e.spawn[1] && y === e.spawn[2]), `spawn de ${e.id}`);
      assert.ok(missionIds.has(e.gate), e.gate);
      assert.ok(ITEMS[e.firstDrop.id], e.firstDrop.id);
      assert.equal(eliteAt(...e.spawn).id, e.id);
    }
    assert.equal(new Set(ELITES.map((e) => e.spawn.join())).size, ELITES.length, 'spawns distintos');
  });
  it('mais difícil que o comum (vida, dano, velocidade) e recompensa cresce mais que a vida', () => {
    for (const e of ELITES) {
      assert.ok(e.hp >= 3 && e.dmg > 1.3 && e.speed >= 1 && e.aggro >= 1);
      assert.ok(e.xp >= e.hp && e.coins >= e.hp, `${e.id}: prêmio (${e.coins}/${e.xp}) deve acompanhar a vida (${e.hp})`);
    }
    for (let i = 1; i < ELITES.length; i++) assert.ok(ELITES[i].hp >= ELITES[i - 1].hp, 'elites crescem com a história');
  });
  it('elite não duplica sistemas: usa o EnemyManager e ENEMY_DEFS existentes (sem sprite nem tipo novo)', () => {
    const src = read('src/game/enemies/eliteDefs.ts');
    assert.ok(!/require\(|\.png|\.mp3/.test(src));
    assert.equal(Object.keys(ENEMY_DEFS).length, 4);
  });
});

describe('2.3 elites: no mundo (EnemyManager real)', () => {
  const find = (m, el) => m.enemies.find((e) => e.type === el.spawn[0] && Math.floor(e.homeX / 32) === el.spawn[1] && Math.floor(e.homeY / 32) === el.spawn[2]);
  it('antes da missão o spawn é comum; depois vira elite mais forte (mesmo tipo e sprite)', () => {
    open.clear();
    const m = new EnemyManager(mapOf(), 'medium', isOpen);
    const el = ELITES[0];
    const e = find(m, el);
    assert.equal(e.elite, null);
    const base = { hp: e.maxHp, dmg: e.damage };
    open.add(el.gate);
    const fresh = m.refreshElites(isOpen);
    assert.ok(fresh.includes(el.id));
    assert.equal(e.elite.id, el.id);
    assert.equal(e.type, el.spawn[0]);
    assert.ok(e.maxHp >= base.hp * el.hp - 1 && e.damage > base.dmg * 1.3 && e.hp === e.maxHp);
    assert.deepEqual(m.refreshElites(isOpen), [], 'não promove duas vezes');
    for (const other of m.enemies.filter((x) => x !== e && x.type === e.type && x.lv === e.lv && !x.elite)) assert.ok(other.maxHp < e.maxHp, 'comum do mesmo tipo e nível é mais fraco');
    assert.equal(m.enemies.filter((x) => x.elite).length, 1);
  });
  it('todos os elites liberados aparecem; o resto da população continua comum', () => {
    open.clear();
    for (const e of ELITES) open.add(e.gate);
    const m = new EnemyManager(mapOf(), 'medium', isOpen);
    assert.equal(m.enemies.filter((x) => x.elite).length, ELITES.length);
    assert.equal(m.enemies.length, ENEMY_SPAWNS.length);
  });
  it('matar o elite rende moedas/XP multiplicados, id do elite e prêmio da 1ª vez; respawn mais lento', () => {
    open.clear(); open.add(ELITES[0].gate);
    const m = new EnemyManager(mapOf(), 'medium', isOpen);
    const el = ELITES[0];
    const e = find(m, el);
    e.slot = 0; m.slots ? (m.slots[0] = e) : null; // visível, como se estivesse perto
    const kills = m.playerAttack(e.x - 30, e.y, 'right', 'ultimate', 1e9).kills;
    assert.equal(kills.length, 1);
    const k = kills[0];
    assert.equal(k.eliteId, el.id);
    assert.deepEqual(k.firstDrop, el.firstDrop);
    const lv = e.lv, def = ENEMY_DEFS[e.type];
    assert.ok(k.xp >= Math.round(def.xp * (1 + 0.5 * (lv - 1))) * el.xp * 0.99);
    assert.ok(k.coins >= def.coins[0] * lv * el.coins * 0.99);
    e.dyingT = 1;
    m.update(50, { x: e.x - 600, y: e.y }, false);
    assert.equal(e.mode, 'dead');
    assert.equal(e.respawnT, 70000 * ELITE_RESPAWN_MULT);
  });
  it('comum continua igual: mesmo prêmio e sem eliteId', () => {
    open.clear();
    const m = new EnemyManager(mapOf(), 'medium', isOpen);
    const e = m.enemies[0];
    e.slot = 0; m.slots[0] = e;
    const k = m.playerAttack(e.x - 30, e.y, 'right', 'ultimate', 1e9).kills[0];
    assert.equal(k.eliteId, null);
    assert.equal(k.firstDrop, null);
  });
  it('visual: aura e coroa só para elite (sem sprite novo) e prêmio da 1ª derrota só uma vez', () => {
    const layer = read('src/game/enemies/EnemyLayer.tsx');
    assert.ok(/slot\?\.elite/.test(layer) && /GameIcon name="crown"/.test(layer));
    reset();
    assert.equal(ES.markEliteDefeated('elite_bat'), true);
    assert.equal(ES.markEliteDefeated('elite_bat'), false);
  });
  it('save: elites derrotados persistem; save antigo sem a chave carrega vazio', () => {
    reset();
    ES.markEliteDefeated('elite_slime');
    const snap = SX.snapshotExts();
    assert.deepEqual(snap.elites, { defeated: ['elite_slime'] });
    reset();
    assert.equal(ES.isEliteDefeated('elite_slime'), false);
    SX.restoreExts(snap);
    assert.equal(ES.isEliteDefeated('elite_slime'), true);
    SX.restoreExts({});
    assert.equal(ES.eliteDefeatedCount(), 0);
    SX.restoreExts({ elites: { defeated: [1, 'elite_bat', null] } });
    assert.equal(ES.eliteDefeatedCount(), 1);
  });
  it('mundo: promove elites ao terminar a missão, avisa e usa o prêmio da 1ª derrota', () => {
    const w = read('src/screens/WorldScreen.tsx');
    assert.ok(/refreshElites\(/.test(w) && /elite_appeared/.test(w) && /markEliteDefeated\(/.test(w) && /elite_defeated/.test(w));
  });
});
