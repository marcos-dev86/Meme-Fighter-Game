/**
 * Mar, rodada 2: eventos aleatórios, mini-chefes (Dona Tentáculos, Tamboril Rei), conquistas ponta a ponta, diário e cenas de
 * revelação. Roda a lógica real. `node tests/unit/mar/eventos-chefes-e-diario.test.mjs`
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
const Ev = require('../../../src/game/dive/diveEvents.ts');
const Sites = require('../../../src/game/dive/diveSites.ts');
const Cr = require('../../../src/game/dive/diveCreatures.ts');
const Sim = require('../../../src/game/dive/diveSim.ts');
const DS = require('../../../src/game/dive/diveState.ts');
const Sc = require('../../../src/game/dive/diveScenes.ts');
const A = require('../../../src/game/account/accountState.ts');
const { ACHIEVEMENTS } = require('../../../src/game/account/achievementDefs.ts');
const SE = require('../../../src/game/state/saveExt.ts');
const P = require('../../../src/game/state/playerState.ts');
const { EXTRA_STRINGS } = require('../../../src/game/i18n/extraStrings.ts');
const { MAR_MISSIONS } = require('../../../src/game/story/missionsMar.ts');
const read = (p) => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const hub = Sites.SITES.recife_pato;
const grid = Sites.buildGrid(hub);
const entry = hub.exit;

describe('eventos aleatórios: temporários, com consequência e sem repetir', () => {
  it('há 6 tipos, todos com nome, texto e duração', () => {
    assert.equal(Ev.EVENT_KINDS.length, 6);
    for (const k of Ev.EVENT_KINDS) { const d = Ev.EVENTS[k]; assert.ok(d.name && d.line.length > 15 && d.durationMs > 15000 && !/[—–]/.test(d.name + d.line), k); }
  });
  it('sem sorte, nada acontece', () => {
    assert.equal(Ev.rollEvent(hub, grid, { last: null, counts: {} }, entry, { rng: () => 0.99 }), null);
  });
  it('chance zero (primeiro mergulho) não sorteia nunca', () => {
    for (let i = 0; i < 200; i++) assert.equal(Ev.rollEvent(hub, grid, { last: null, counts: {} }, entry, { chance: 0, rng: lcg(i + 1) }), null);
  });
  for (const kind of ['floating_chest', 'golden_school', 'lost_pup', 'sos_diver', 'rare_visit', 'tide_surge']) {
    it(`${kind}: pontos em água aberta e alcançável, longe da entrada`, () => {
      const ev = Ev.rollEvent(hub, grid, { last: null, counts: {} }, entry, { force: kind, rng: lcg(7), creaturesKnown: 5 });
      assert.ok(ev && ev.id === kind && ev.msLeft === Ev.EVENTS[kind].durationMs);
      for (const sp of ev.spots) {
        const t = Sites.tileAt(sp.x, sp.y);
        assert.ok(!Sites.isSolidChar(grid[t.y][t.x]));
        assert.ok(Sites.pathLength(grid, entry, t) >= 5);
      }
      if (kind === 'rare_visit') { assert.equal(ev.creature.id, 'jelly_violet'); assert.ok(Cr.CREATURES[ev.creature.id]); }
      if (kind === 'tide_surge') assert.ok(Math.abs(ev.surge.dx) > 0);
      if (kind === 'golden_school') assert.equal(ev.spots.length, 5);
    });
  }
  it('nunca repete o evento anterior, em 500 sorteios', () => {
    let last = null;
    for (let i = 0; i < 500; i++) {
      const ev = Ev.rollEvent(hub, grid, { last, counts: {} }, entry, { chance: 1, rng: lcg(i + 3), creaturesKnown: 6 });
      assert.ok(ev);
      assert.notEqual(ev.id, last);
      last = ev.id;
    }
  });
  it('todos os tipos aparecem com o tempo (variedade) e a visita rara só para quem já viu criaturas', () => {
    const seen = new Set();
    for (let i = 0; i < 600; i++) { const ev = Ev.rollEvent(hub, grid, { last: null, counts: {} }, entry, { chance: 1, rng: lcg(i + 11), creaturesKnown: 6 }); seen.add(ev.id); }
    assert.equal(seen.size, 6);
    for (let i = 0; i < 300; i++) assert.notEqual(Ev.rollEvent(hub, grid, { last: null, counts: {} }, entry, { chance: 1, rng: lcg(i + 5), creaturesKnown: 1 }).id, 'rare_visit');
  });
  it('termina por tempo e quando todos os pontos foram pegos', () => {
    const ev = Ev.rollEvent(hub, grid, { last: null, counts: {} }, entry, { force: 'golden_school', rng: lcg(2) });
    assert.equal(Ev.tickEvent(ev, 1000), true);
    for (const s of ev.spots) Ev.useSpot(s, () => false);
    assert.equal(Ev.tickEvent(ev, 10), false);
    const ev2 = Ev.rollEvent(hub, grid, { last: null, counts: {} }, entry, { force: 'tide_surge', rng: lcg(2) });
    assert.equal(Ev.tickEvent(ev2, ev2.msLeft - 1), true);
    assert.equal(Ev.tickEvent(ev2, 5), false);
  });
  it('cada ponto paga uma vez só; o mergulhador em apuros pede e gasta um item de fôlego', () => {
    const ev = Ev.rollEvent(hub, grid, { last: null, counts: {} }, entry, { force: 'sos_diver', rng: lcg(4) });
    const sp = ev.spots[0];
    assert.deepEqual(Ev.useSpot(sp, () => false), { ok: false, reason: 'need_item' });
    assert.equal(sp.taken, false, 'sem item não pega');
    const out = Ev.useSpot(sp, (id) => id === 'kelp_snack');
    assert.equal(out.ok, true); assert.equal(out.consumed, 'kelp_snack'); assert.ok(out.reward.coins > 0);
    assert.deepEqual(Ev.useSpot(sp, () => true), { ok: false, reason: 'taken' });
  });
  it('as recompensas são itens reais e nunca Secret (evento comum não entrega segredo)', () => {
    const { ITEMS } = require('../../../src/game/items/itemDefs.ts');
    for (let i = 0; i < 300; i++) {
      const ev = Ev.rollEvent(hub, grid, { last: null, counts: {} }, entry, { chance: 1, rng: lcg(i + 20), creaturesKnown: 6 });
      for (const sp of ev.spots) for (const id of Object.keys(sp.reward.items ?? {})) { assert.ok(ITEMS[id], id); assert.notEqual(ITEMS[id].rarity, 'secret'); }
    }
  });
  it('histórico: grava o último e a contagem, vai para o save e volta', () => {
    SE.resetExts();
    DS.noteEventStarted('floating_chest'); DS.noteEventStarted('lost_pup'); DS.noteEventStarted('lost_pup');
    assert.equal(DS.getEventHistory().last, 'lost_pup'); assert.equal(DS.getEventHistory().counts.lost_pup, 2);
    const snap = JSON.parse(JSON.stringify(SE.snapshotExts()));
    SE.resetExts(); assert.equal(DS.getEventHistory().last, null);
    SE.restoreExts(snap);
    assert.equal(DS.getEventHistory().last, 'lost_pup'); assert.equal(DS.getEventHistory().counts.floating_chest, 1);
    SE.restoreExts({ dive: { events: { last: 'lixo', counts: { floating_chest: 'x', tide_surge: 3 } } } });
    assert.equal(DS.getEventHistory().last, null); assert.deepEqual(DS.getEventHistory().counts, { tide_surge: 3 });
  });
  it('a cena só sorteia a partir do 2º mergulho e aplica a maré e a visita rara', () => {
    const o = read('src/game/dive/DiveOverlay.tsx');
    assert.match(o, /chance: getDiveData\(\)\.stats\.dives > 1 \? 0\.45 : 0/);
    assert.match(o, /evNow\?\.surge/);
    assert.match(o, /uid: 'event:rare'/);
  });
});

describe('mini-chefes: padrões com sinal, desviáveis, com recompensa', () => {
  const mk = (id, site) => { const sim = Sim.createSim(Sites.SITES[site], { rng: () => 0.5 }); return { sim, e: sim.entities.find((x) => x.def.id === id) }; };
  it('estão nos locais certos e têm identidade própria', () => {
    assert.ok(mk('kraken', 'fumarolas').e && mk('angler_king', 'abismo').e);
    for (const id of ['kraken', 'angler_king']) { const d = Cr.CREATURES[id]; assert.ok(d.boss && d.hp >= 200 && d.reward.coins >= 300 && d.role === 'guardian'); }
    assert.notDeepEqual(Cr.CREATURES.kraken.boss.patterns, Cr.CREATURES.angler_king.boss.patterns);
    assert.equal(Cr.CREATURES.angler_king.weak, 'heavy');
    assert.equal(Cr.CREATURES.kraken.learns, true);
  });
  it('sempre há um SINAL antes do golpe em área, e ele dura o tempo prometido', () => {
    const { sim, e } = mk('kraken', 'fumarolas');
    const player = { x: e.x + 50, y: e.y };
    let tg = null, t = 0;
    for (; t < 8000; t += 50) { Sim.stepSim(sim, 50, player, () => 0.5); if (e.boss.telegraph) { tg = { ...e.boss.telegraph }; break; } }
    assert.ok(tg, 'o chefe tem de sinalizar');
    assert.equal(tg.kind, 'sweep');
    assert.equal(tg.totalMs, Sim.BOSS_TELEGRAPH_MS.sweep);
    assert.ok(tg.r === Cr.CREATURES.kraken.boss.radius);
  });
  it('quem sai do círculo durante o sinal NÃO leva o golpe em área; quem fica leva dano maior', () => {
    const run = (stay) => {
      const { sim, e } = mk('kraken', 'fumarolas');
      let player = { x: e.x + 40, y: e.y };
      let dmg = 0, seen = false;
      for (let t = 0; t < 12000; t += 50) {
        const cs = Sim.stepSim(sim, 50, player, () => 0.5);
        if (e.boss.telegraph?.kind === 'sweep' && !seen) { seen = true; if (!stay) player = { x: e.boss.telegraph.x + 400, y: e.boss.telegraph.y }; }
        if (seen && !e.boss.telegraph) { dmg += cs.filter((c) => c.damageFrac > e.def.damageFrac * 1.5).length; if (dmg || t > 11000) break; }
        if (seen && !stay && !e.boss.telegraph) break;
      }
      return dmg;
    };
    assert.equal(run(false), 0);
    assert.ok(run(true) >= 1);
  });
  it('a Dona Tentáculos cicla varrer, tinta e invocar; filhotes são limitados a 4', () => {
    const { sim, e } = mk('kraken', 'fumarolas');
    const player = { x: e.x + 300, y: e.y };
    const kinds = [];
    let ink = false;
    for (let t = 0; t < 90000; t += 50) {
      Sim.stepSim(sim, 50, { x: e.x + 150, y: e.y }, () => 0.5);
      const k = e.boss.telegraph?.kind; if (k && kinds[kinds.length - 1] !== k) kinds.push(k);
      if (sim.inkMs > 0) ink = true;
      assert.ok(sim.entities.filter((x) => x.def.id === 'octopus_baby' && x.state !== 'dead').length <= 4);
    }
    assert.ok(['sweep', 'ink', 'summon'].every((k) => kinds.includes(k)), kinds.join());
    assert.ok(ink);
    assert.ok(sim.entities.some((x) => x.def.id === 'octopus_baby'));
    assert.ok(player);
  });
  it('as invocações aparecem em `spawned` para o diário registrar', () => {
    const { sim, e } = mk('kraken', 'fumarolas');
    let got = 0;
    for (let t = 0; t < 40000; t += 50) { Sim.stepSim(sim, 50, { x: e.x + 150, y: e.y }, () => 0.5); got += sim.spawned.length; }
    assert.ok(got >= 2);
  });
  it('a isca do Tamboril Rei puxa o jogador na direção da lanterna, e dá para nadar contra', () => {
    const { sim, e } = mk('angler_king', 'abismo');
    let pull = null;
    for (let t = 0; t < 20000 && !pull; t += 50) { Sim.stepSim(sim, 50, { x: e.x - 200, y: e.y }, () => 0.5); if (sim.pull.x !== 0 || sim.pull.y !== 0) pull = { ...sim.pull }; }
    assert.ok(pull && pull.x > 0, 'puxa para o chefe');
    assert.ok(Math.hypot(pull.x, pull.y) <= 71, 'puxão menor que o nado do jogador? ' + Math.hypot(pull.x, pull.y));
    assert.ok(Math.hypot(pull.x, pull.y) < Sites.SWIM_SPEED, 'nadando contra, dá para sair');
  });
  it('dá para derrotar: golpe forte funciona melhor no Tamboril Rei, e a morte paga a recompensa', () => {
    const { sim, e } = mk('angler_king', 'abismo');
    const pl = { x: e.x - 30, y: e.y };
    const light = Sim.playerStrike(sim, pl, { x: 1, y: 0 }, 'light', 20).hits[0].damage;
    const heavy = Sim.playerStrike(sim, pl, { x: 1, y: 0 }, 'heavy', 20).hits[0].damage;
    assert.ok(heavy > light * 2);
    let n = 0; while (e.state !== 'dead' && n++ < 400) Sim.playerStrike(sim, pl, { x: 1, y: 0 }, 'heavy', 20);
    assert.equal(e.state, 'dead');
  });
  it('a Dona Tentáculos aprende o golpe repetido mas nunca fica imune', () => {
    const { sim, e } = mk('kraken', 'fumarolas');
    e.hp = 1e9; const pl = { x: e.x - 30, y: e.y };
    const d = []; for (let i = 0; i < 20; i++) d.push(Sim.playerStrike(sim, pl, { x: 1, y: 0 }, 'light', 20).hits[0].damage);
    assert.ok(d[19] < d[0] && d[19] >= Math.round(20 * 0.6));
  });
  it('mini-chefe não entrega item Secret (é luta aberta, não esconderijo)', () => {
    const { ITEMS } = require('../../../src/game/items/itemDefs.ts');
    for (const id of ['kraken', 'angler_king', 'octopus_baby']) for (const it of Object.keys(Cr.CREATURES[id].reward.items ?? {})) assert.notEqual(ITEMS[it].rarity, 'secret');
  });
  it('missões novas dos mini-chefes existem e dependem do avanço certo', () => {
    const k = MAR_MISSIONS.find((m) => m.id === 'mar_dona_tentaculos'), r = MAR_MISSIONS.find((m) => m.id === 'mar_rei_lanterna');
    assert.equal(k.objective.flag, 'dive_beat_kraken'); assert.ok(k.requires.includes('mar_fumarolas'));
    assert.equal(r.objective.flag, 'dive_beat_angler_king'); assert.ok(r.requires.includes('mar_abismo'));
  });
});

describe('conquistas do mar: contadores reais e ícones', () => {
  const sea = ACHIEVEMENTS.filter((a) => a.id.startsWith('sea_'));
  it('20 conquistas do mar, ids únicos, todas com ícone próprio', () => {
    assert.equal(sea.length, 20);
    assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
    const art = read('src/game/account/achievementArt.ts');
    for (const a of sea) { assert.ok(fs.existsSync(new URL(`../../../assets/achievements/${a.id}.png`, import.meta.url)), a.id); assert.match(art, new RegExp(`\\b${a.id}: require`)); }
  });
  it('as metas batem com o conteúdo real do jogo', () => {
    const g = (id) => sea.find((a) => a.id === id).cond.gte;
    const allChests = Object.values(Sites.SITES).reduce((s, x) => s + (x.chests?.length ?? 0), 0);
    assert.equal(g('sea_chests_all'), allChests);
    assert.equal(g('sea_bestiary'), Object.keys(Cr.CREATURES).length);
    assert.equal(g('sea_cross_all'), Sites.CROSSINGS.length);
    assert.equal(g('sea_all_sites'), Object.keys(Sites.SITES).length);
    assert.equal(g('sea_secret_walls_4'), Object.values(Sites.SITES).reduce((s, x) => s + (x.hidden?.length ?? 0), 0));
  });
  it('cada conquista tem texto em português e inglês, sem travessão, e raridade válida', () => {
    for (const a of sea) { assert.ok(a.title.pt && a.title.en && a.desc.pt && a.desc.en, a.id); assert.ok(!/[—–]/.test(JSON.stringify([a.title, a.desc])), a.id); }
  });
  it('ponta a ponta: jogar de verdade desbloqueia as conquistas (e só uma vez)', async () => {
    await A.ensureAccountLoaded();
    SE.resetExts();
    const has = (id) => !!A.getAccount().achievements[id];
    assert.equal(has('sea_first_dive'), false);
    DS.noteDiveStart();
    assert.equal(has('sea_first_dive'), true);
    for (const c of Object.values(Sites.SITES).flatMap((s) => s.chests ?? []).slice(0, 5)) { if (c.hidden) for (const s of Object.values(Sites.SITES)) for (const h of s.hidden ?? []) DS.revealWall(h.id); DS.openChest(c); }
    assert.equal(has('sea_chests_5'), true);
    DS.noteCrossing('cross_recife_naufragio');
    assert.equal(has('sea_cross_first'), true); assert.equal(has('sea_cross_all'), false);
    for (const c of Sites.CROSSINGS) DS.noteCrossing(c.id);
    assert.equal(has('sea_cross_all'), true);
    for (const s of Object.values(Sites.SITES)) DS.markDiscovered(s.id);
    assert.equal(has('sea_all_sites'), true);
    for (const id of Object.keys(Cr.CREATURES)) DS.logCreatureSeen(id);
    assert.equal(has('sea_bestiary'), true);
    for (let i = 0; i < 25; i++) DS.logCreatureDefeated('crab');
    assert.equal(has('sea_hunter'), true);
    for (const id of ['clownfish', 'turtle', 'cleaner', 'whale', 'angel']) DS.logCreatureHelped(id);
    assert.equal(has('sea_friend'), true); assert.equal(has('sea_whale'), true);
    for (const h of ['h_cabine', 'h_ruinas', 'h_atlantis', 'h_abismo']) DS.revealWall(h);
    assert.equal(has('sea_secret_wall'), true); assert.equal(has('sea_secret_walls_4'), true);
    DS.noteSwim(130, true); assert.equal(has('sea_deep'), true);
    DS.noteSwim(61, false, true); assert.equal(has('sea_gills'), true);
    A.noteStat('dive_survived_empty'); assert.equal(has('sea_near_drown'), true);
    A.noteDeath(false, 'drowning'); assert.equal(has('sea_glub'), true);
    for (let i = 0; i < 5; i++) DS.noteEventDone('floating_chest');
    assert.equal(has('sea_events'), true);
    const d0 = A.getDiamonds(); DS.noteDiveStart(); assert.equal(A.getDiamonds(), d0, 'sem pagar duas vezes');
  });
  it('o fôlego infinito conta só tempo realmente nadando com ele, e a pressão só na zona funda', () => {
    SE.resetExts();
    const before = A.getAccount().stats.dive_infinite_sec ?? 0;
    DS.noteSwim(10, false, false);
    assert.equal(A.getAccount().stats.dive_infinite_sec ?? 0, before);
  });
});

describe('cenas de revelação e diário', () => {
  it('toda parede secreta tem a sua cena curta', () => {
    const walls = Object.values(Sites.SITES).flatMap((s) => (s.hidden ?? []).map((h) => h.id));
    assert.deepEqual(Object.keys(Sc.REVEAL_SCENES).sort(), walls.sort());
    for (const s of Object.values(Sc.REVEAL_SCENES)) assert.ok(s.title && s.line.length > 20 && !/[—–]/.test(s.title + s.line));
  });
  it('a cena devolve o controle em até 2 s e o diário pausa o mergulho', () => {
    const o = read('src/game/dive/DiveOverlay.tsx');
    assert.match(o, /setTimeout\(\(\) => setPhaseBoth\('play'\), 1700\)/);
    assert.match(o, /talk \|\| shopNpc \|\| journal\) return/);
  });
  it('o diário lista todas as criaturas e esconde as não encontradas', () => {
    const o = read('src/game/dive/DiveOverlay.tsx');
    assert.match(o, /known \? c\.name : '\?\?\?'/);
    assert.match(o, /Object\.values\(CREATURES\)\.map/);
  });
  it('textos novos existem nos 5 idiomas', () => {
    const keys = ['dive_journal', 'dive_journal_title', 'dive_j_creatures', 'dive_j_sites', 'dive_j_secrets', 'dive_j_unknown', 'dive_j_beaten', 'dive_j_helped', 'dive_j_weak', 'dive_j_resist', 'dive_j_hit_light', 'dive_j_hit_heavy', 'dive_ev_help', 'dive_ev_need', 'dive_ev_reward', 'dive_ev_end'];
    for (const lang of ['pt', 'en', 'es', 'fr', 'ja']) { const tb = Object.assign({}, ...EXTRA_STRINGS.map((m) => m[lang])); for (const k of keys) assert.ok(tb[k] && !/[—–]/.test(tb[k]), `${lang} ${k}`); }
  });
});
