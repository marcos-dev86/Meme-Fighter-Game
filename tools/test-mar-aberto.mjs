/**
 * MUNDO SUBMERSO: o fundo do mar espelha 100% do mar da superfície, dá para mergulhar de qualquer costa e emergir em qualquer costa,
 * há ar suficiente por todo o oceano, entradas dos locais, baús e criaturas por região. `node tools/test-mar-aberto.mjs`
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
require('./ts-register.cjs');
const S = require('../src/game/dive/seaWorld.ts');
const W = require('../src/game/world/worldGen.ts');
const Sim = require('../src/game/dive/diveSim.ts');
const Cr = require('../src/game/dive/diveCreatures.ts');
const Sites = require('../src/game/dive/diveSites.ts');
const B = require('../src/game/dive/breath.ts');
const { ITEMS } = require('../src/game/items/itemDefs.ts');
const D = require('../src/game/account/deathCause.ts');
const { EXTRA_STRINGS } = require('../src/game/i18n/extraStrings.ts');
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SOLID = new Set(['water', 'tree', 'rock', 'wall', 'lava', 'shop', 'house']);
const WALK = new Set(['grass', 'path', 'sand', 'stone', 'snow', 'ash', 'dock']);

describe('o mundo submerso espelha 100% do mar da superfície', () => {
  it('constrói rápido (menos de 2 s) e tem o mesmo tamanho do mundo', () => {
    const t0 = Date.now(); const g = S.getSeaGrid(); const ms = Date.now() - t0;
    assert.ok(ms < 2000, `${ms} ms`);
    assert.equal(S.SEA_W, W.WORLD_TILES_W); assert.equal(S.SEA_H, W.WORLD_TILES_H);
    assert.equal(g.code.length, S.SEA_W * S.SEA_H);
  });
  it('todo tile de água da superfície é navegável embaixo (menos a borda do mapa) e toda terra vira rocha', () => {
    let water = 0, bad = 0, land = 0, landBad = 0;
    for (let y = 1; y < S.SEA_H - 1; y += 3) for (let x = 1; x < S.SEA_W - 1; x += 3) {
      const surf = W.getWorldTile(x, y);
      const solid = S.isSeaSolid(x, y);
      if (surf === 'water') { water++; if (solid && S.seaCode(x, y) === S.SEA.ROCK) bad++; } else { land++; if (!solid) landBad++; }
    }
    assert.ok(water > 100000);
    assert.equal(landBad, 0, 'terra virou água');
    assert.ok(bad === 0, `${bad} tiles de água viraram rocha`);
    assert.ok(land > 50000);
  });
  it('só 1,5% da água vira pilar de rocha (o mar é navegável)', () => {
    const g = S.getSeaGrid(); let water = 0, pillars = 0;
    for (let i = 0; i < g.code.length; i += 7) { const c = g.code[i]; if (c !== S.SEA.ROCK) water++; if (c === S.SEA.PILLAR) pillars++; }
    assert.ok(pillars / water < 0.03, String(pillars / water));
  });
  it('a água encostada na terra é a faixa de superfície (respirável)', () => {
    let checked = 0;
    for (let y = 5; y < S.SEA_H - 5 && checked < 4000; y += 5) for (let x = 5; x < S.SEA_W - 5; x += 5) {
      if (W.getWorldTile(x, y) !== 'water') continue;
      let touch = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (W.getWorldTile(x + dx, y + dy) !== 'water') touch = true;
      if (touch) { checked++; assert.equal(S.seaCode(x, y), S.SEA.SHORE, `${x},${y}`); assert.equal(S.isBreathableSea(x, y), true); }
    }
    assert.ok(checked > 500);
  });
  it('profundidade: raso perto da costa, fundo longe (o fundo tem pressão)', () => {
    let shallow = 0, deep = 0, abyss = 0;
    const g = S.getSeaGrid();
    for (let i = 0; i < g.code.length; i += 11) { if (g.code[i] === S.SEA.ROCK) continue; const t = g.dist[i] / 3; if (t > S.DEPTH.abyss) abyss++; else if (t > S.DEPTH.deep) deep++; else shallow++; }
    assert.ok(shallow > 1000 && deep > 1000 && abyss > 100, `${shallow} ${deep} ${abyss}`);
    for (let y = 400; y < 420; y++) for (let x = 100; x < 400; x += 7) if (S.seaCode(x, y) === S.SEA.DEEP) assert.equal(S.seaChar(x, y), ':');
  });
});

describe('mergulhar de qualquer ponto da costa e emergir em qualquer ponto da costa', () => {
  const coast = [];
  for (let y = 4; y < S.SEA_H - 4; y += 2) for (let x = 4; x < S.SEA_W - 4; x += 2) {
    if (!WALK.has(W.getWorldTile(x, y))) continue;
    let near = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (W.getWorldTile(x + dx, y + dy) === 'water') near = true;
    if (near) coast.push([x, y]);
  }
  it('há muita costa para testar', () => assert.ok(coast.length > 1500, String(coast.length)));
  it('de TODA costa andável dá para mergulhar, começando na água mais perto (a poucos tiles de onde estava)', () => {
    for (const [x, y] of coast) {
      const st = S.nearestSeaStart(x, y, 2);
      assert.ok(st, `${x},${y} sem água`);
      assert.ok(Math.hypot(st.x - x, st.y - y) <= 2.9);
      assert.equal(S.isSeaSolid(st.x, st.y), false);
      assert.equal(S.canDiveFrom(x, y), true);
    }
  });
  it('longe do mar não dá para mergulhar', () => {
    let far = 0;
    for (let y = 300; y < 340; y += 4) for (let x = 1100; x < 1180; x += 4) {
      if (!WALK.has(W.getWorldTile(x, y))) continue;
      let anyWater = false;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (W.getWorldTile(x + dx, y + dy) === 'water') anyWater = true;
      if (!anyWater) { far++; assert.equal(S.canDiveFrom(x, y), false); }
    }
    assert.ok(far > 0);
  });
  it('de TODA parte da faixa de superfície se emerge em chão andável e sólido nenhum (anéis de até 14 tiles)', () => {
    let tried = 0, nulls = 0;
    const g = S.getSeaGrid();
    for (let y = 4; y < S.SEA_H - 4; y += 4) for (let x = 4; x < S.SEA_W - 4; x += 4) {
      if (g.code[y * S.SEA_W + x] !== S.SEA.SHORE) continue;
      tried++;
      const land = S.findLanding(x, y);
      if (!land) { nulls++; continue; }
      assert.ok(WALK.has(W.getWorldTile(land.x, land.y)), `${land.x},${land.y}: ${W.getWorldTile(land.x, land.y)}`);
      assert.ok(Math.hypot(land.x - x, land.y - y) <= 14 * 1.5);
    }
    assert.ok(tried > 2000);
    // beira de parede (borda da ilha) não tem onde pisar: a cena avisa e não emerge ali (nunca teleporta para sólido)
    assert.ok(nulls / tried < 0.08, `${nulls}/${tried} sem chão por perto`);
    assert.match(read('src/game/dive/DiveOverlay.tsx'), /if \(!landing\) \{[\s\S]*dive_no_landing/);
  });
  it('ida e volta: mergulha de um ponto, sobe no mesmo lugar e pisa a poucos tiles de onde saiu', () => {
    for (const [x, y] of coast.filter((_, i) => i % 11 === 0)) {
      const st = S.nearestSeaStart(x, y, 2);
      assert.equal(S.isBreathableSea(st.x, st.y), true, 'começa respirando (costa)');
      const back = S.findLanding(st.x, st.y);
      assert.ok(back && Math.hypot(back.x - x, back.y - y) <= 6, `${x},${y} -> ${back && back.x},${back && back.y}`);
    }
  });
  it('os 9 cais continuam com mar ao lado para mergulhar', () => {
    for (const [k, d] of Object.entries(W.FERRY_DOCKS)) assert.equal(S.canDiveFrom(d.anchor.x, d.anchor.y) || !!S.nearestSeaStart(d.boat.x, d.boat.y, 2), true, k);
  });
});

describe('ar suficiente em todo o oceano (difícil, mas possível)', () => {
  const g = S.getSeaGrid();
  const N = S.SEA_W * S.SEA_H;
  const d = new Int32Array(N).fill(-1); const q = new Int32Array(N); let qh = 0, qt = 0;
  for (let i = 0; i < N; i++) { const c = g.code[i]; if (c === S.SEA.SHORE || c === S.SEA.AIR) { d[i] = 0; q[qt++] = i; } }
  while (qh < qt) {
    const i = q[qh++]; const x = i % S.SEA_W, y = (i / S.SEA_W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= S.SEA_W || ny >= S.SEA_H) continue;
      const j = ny * S.SEA_W + nx; const c = g.code[j];
      if (c === S.SEA.ROCK || c === S.SEA.PILLAR || d[j] >= 0) continue;
      d[j] = d[i] + 1; q[qt++] = j;
    }
  }
  let water = 0, unreachable = 0, max = 0, within64 = 0, over64 = 0;
  for (let i = 0; i < N; i++) { const c = g.code[i]; if (c === S.SEA.ROCK || c === S.SEA.PILLAR) continue; water++; if (d[i] < 0) { unreachable++; continue; } max = Math.max(max, d[i]); if (d[i] <= 64) within64++; else over64++; }
  const secs = (tiles) => (tiles * Sites.TILE) / Sites.SWIM_SPEED;
  it('nenhum ponto do mar fica sem ar alcançável', () => assert.equal(unreachable, 0));
  it('o pior ponto exige menos fôlego do que o Traje de Mergulho (loja) dá', () => {
    const wet = B.combineMods({ capacitySec: 18, drainMult: 0.85 }, undefined);
    assert.ok(B.airNeeded(secs(max), wet) <= B.breathMax(wet), `pior ponto ${max} tiles = ${secs(max).toFixed(1)} s`);
  });
  it('99% do mar cabe no fôlego base (24 s) a partir do ar mais perto, e o resto exige equipamento ou poção', () => {
    assert.ok(within64 / water > 0.99, String(within64 / water));
    assert.ok(over64 > 0, 'tem de haver partes difíceis');
  });
  it('com fôlego infinito não existe lugar impossível, e sem ele nenhum lugar é impossível com o equipamento da loja', () => {
    const snorkel = B.combineMods({ capacitySec: 10 }, undefined);
    const need = B.airNeeded(secs(max), snorkel);
    assert.ok(need <= B.breathMax(snorkel) + 30, 'Snorkel + 1 Frasco de Ar');
  });
  it('bolsões de ar: quantidade, 3x3 em água livre e sem repetição', () => {
    assert.ok(g.pockets.length > 600, String(g.pockets.length));
    const seen = new Set();
    for (const p of g.pockets) {
      const k = `${p.x},${p.y}`; assert.ok(!seen.has(k)); seen.add(k);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) assert.equal(S.seaCode(p.x + dx, p.y + dy), S.SEA.AIR);
    }
  });
  it('o fundo é espaçado (planejamento) e perto da costa é denso', () => {
    assert.ok(S.POCKET_CELL.far > S.POCKET_CELL.near);
  });
  it('o fôlego realmente reabastece num bolsão e gasta fora dele (mesma regra do resto do mergulho)', () => {
    const p = g.pockets[0];
    assert.equal(S.isBreathableSea(p.x, p.y), true);
    const r = B.stepBreath({ ...B.newBreath(), sec: 5 }, 1000, { submerged: true, breathable: S.isBreathableSea(p.x, p.y), deep: false, mods: B.NO_BREATH_MODS });
    assert.ok(r.state.sec > 5);
  });
});

describe('entradas dos 9 locais, no mar, junto ao cais de cada ilha', () => {
  const portals = S.getPortals();
  it('há uma por local, todas em água aberta e limpa', () => {
    assert.equal(portals.length, Object.keys(Sites.SITES).length);
    assert.deepEqual(portals.map((p) => p.siteId).sort(), Object.keys(Sites.SITES).sort());
    for (const p of portals) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) assert.ok([S.SEA.WATER, S.SEA.DEEP].includes(S.seaCode(p.x + dx, p.y + dy)), p.siteId);
  });
  it('ficam perto do cais da ilha certa (14 a 70 tiles do barco)', () => {
    for (const p of portals) {
      const boat = W.FERRY_DOCKS[p.dock].boat;
      const dd = Math.hypot(p.x - boat.x, p.y - boat.y);
      assert.ok(dd >= 12 && dd <= 70, `${p.siteId}: ${dd.toFixed(0)}`);
      assert.equal(Sites.SITES[p.siteId].island, p.dock);
      assert.equal(S.islandNear(p.x, p.y), p.dock, `${p.siteId} perto de outro cais`);
    }
  });
  it('dá para nadar da costa da ilha até a entrada (caminho de água sem rocha)', () => {
    const N = S.SEA_W * S.SEA_H; const seen = new Uint8Array(N); const q = [];
    for (const p of portals) {
      const boat = W.FERRY_DOCKS[p.dock].boat; const st = S.nearestSeaStart(boat.x, boat.y, 4) ?? boat;
      seen.fill(0); q.length = 0; q.push(st.y * S.SEA_W + st.x); seen[q[0]] = 1; let qh = 0, ok = false;
      while (qh < q.length && !ok) {
        const i = q[qh++]; const x = i % S.SEA_W, y = (i / S.SEA_W) | 0;
        if (Math.abs(x - p.x) <= 1 && Math.abs(y - p.y) <= 1) { ok = true; break; }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= S.SEA_W || ny >= S.SEA_H) continue; const j = ny * S.SEA_W + nx; if (seen[j] || S.isSeaSolid(nx, ny)) continue; if (Math.abs(nx - p.x) > 90 || Math.abs(ny - p.y) > 90) continue; seen[j] = 1; q.push(j); }
      }
      assert.ok(ok, `${p.siteId} inalcançável a nado`);
    }
  });
  it('portalAt acha a entrada e só ela', () => {
    const p = portals[0]; assert.equal(S.portalAt(p.x, p.y).siteId, p.siteId); assert.equal(S.portalAt(p.x + 20, p.y + 20), null);
  });
});

describe('baús do mar aberto', () => {
  it('determinísticos, em água aberta, longe da costa, com itens reais e nunca Secret', () => {
    let n = 0; const ids = new Set();
    for (let cy = 0; cy * S.CHEST_CELL < S.SEA_H; cy++) for (let cx = 0; cx * S.CHEST_CELL < S.SEA_W; cx++) {
      const c = S.chestInCell(cx, cy); if (!c) continue;
      n++; assert.ok(!ids.has(c.id)); ids.add(c.id);
      assert.deepEqual(S.chestInCell(cx, cy), c);
      assert.ok([S.SEA.WATER, S.SEA.DEEP].includes(S.seaCode(c.x, c.y)));
      assert.ok(S.coastTiles(c.x, c.y) >= 5);
      assert.ok(c.coins > 0 && c.xp > 0);
      for (const id of Object.keys(c.items)) { assert.ok(ITEMS[id], id); assert.notEqual(ITEMS[id].rarity, 'secret', 'baú comum não entrega Secret'); }
    }
    assert.ok(n > 300, String(n));
  });
  it('o fundo rende mais que o raso', () => {
    let sh = [], dp = [];
    for (let cy = 0; cy * S.CHEST_CELL < S.SEA_H; cy++) for (let cx = 0; cx * S.CHEST_CELL < S.SEA_W; cx++) { const c = S.chestInCell(cx, cy); if (!c) continue; (S.coastTiles(c.x, c.y) > S.DEPTH.deep ? dp : sh).push(c.coins); }
    const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    assert.ok(avg(dp) > avg(sh) * 1.5);
  });
});

describe('criaturas por região (áreas que carregam perto do jogador)', () => {
  it('determinístico: a mesma área tem sempre as mesmas criaturas', () => {
    for (const [cx, cy] of [[10, 10], [30, 25], [55, 40]]) assert.deepEqual(S.chunkSpawns(cx, cy), S.chunkSpawns(cx, cy));
  });
  it('todas existem, nascem em água livre, e cada profundidade tem a sua fauna', () => {
    const seen = { shallow: new Set(), mid: new Set(), deep: new Set() };
    for (let cy = 0; cy * S.CHUNK < S.SEA_H; cy += 1) for (let cx = 0; cx * S.CHUNK < S.SEA_W; cx += 1) {
      for (const sp of S.chunkSpawns(cx, cy)) {
        assert.ok(Cr.CREATURES[sp.creature], sp.creature);
        assert.ok([S.SEA.WATER, S.SEA.DEEP, S.SEA.VENT, S.SEA.COLD].includes(S.seaCode(sp.x, sp.y)));
        const t = S.coastTiles(sp.x, sp.y);
        (t > S.DEPTH.deep ? seen.deep : t > S.DEPTH.shallow ? seen.mid : seen.shallow).add(sp.creature);
      }
    }
    for (const id of seen.shallow) assert.equal(Cr.CREATURES[id].behavior === 'hostile', false, `hostil no raso: ${id}`);
    assert.ok(seen.deep.has('angler') && seen.deep.has('octopus'));
    assert.ok(seen.mid.has('moray') && seen.mid.has('jelly_pink'));
    assert.ok(seen.shallow.has('clownfish') && seen.shallow.has('turtle'));
    for (const id of S.SEA_ONLY_IN_SITES) for (const set of Object.values(seen)) assert.ok(!set.has(id), `${id} não nasce no mar aberto`);
  });
  it('visita rara só no fundo e a baleia só depois da missão', () => {
    let violet = 0, whaleNo = 0, whaleYes = 0;
    for (let cy = 0; cy * S.CHUNK < S.SEA_H; cy++) for (let cx = 0; cx * S.CHUNK < S.SEA_W; cx++) {
      for (const sp of S.chunkSpawns(cx, cy)) { if (sp.creature === 'jelly_violet') { violet++; assert.ok(S.coastTiles(sp.x, sp.y) > 70); } if (sp.creature === 'whale') whaleNo++; }
      for (const sp of S.chunkSpawns(cx, cy, { questWhale: true })) if (sp.creature === 'whale') whaleYes++;
    }
    assert.ok(violet > 0); assert.equal(whaleNo, 0); assert.ok(whaleYes > 0);
  });
  it('a simulação povoa ao redor, nunca em cima do jogador, e descarrega o que ficou longe', () => {
    const sim = Sim.createWorldSim();
    const start = S.nearestSeaStart(W.FERRY_DOCKS.main.boat.x, W.FERRY_DOCKS.main.boat.y, 4);
    const added = Sim.syncWorldChunks(sim, start.x, start.y);
    assert.ok(added.length > 5 && sim.entities.length === added.length);
    for (const e of sim.entities) assert.ok(Math.hypot(e.x / Sites.TILE - start.x, e.y / Sites.TILE - start.y) >= 9);
    assert.equal(Sim.syncWorldChunks(sim, start.x, start.y).length, 0, 'não duplica');
    const far = S.nearestSeaStart(W.FERRY_DOCKS.camp.boat.x, W.FERRY_DOCKS.camp.boat.y, 4);
    Sim.syncWorldChunks(sim, far.x, far.y);
    assert.ok(sim.entities.every((e) => Math.hypot(e.x / Sites.TILE - far.x, e.y / Sites.TILE - far.y) < S.CHUNK * 4));
    assert.ok(sim.chunks.size <= 25 + 9);
  });
  it('criatura morta não volta enquanto a área está carregada; ao voltar depois de se afastar, a área renasce', () => {
    const sim = Sim.createWorldSim();
    const a = S.nearestSeaStart(W.FERRY_DOCKS.main.boat.x, W.FERRY_DOCKS.main.boat.y, 4);
    Sim.syncWorldChunks(sim, a.x, a.y);
    const n0 = sim.entities.length; const victim = sim.entities[0]; victim.state = 'dead';
    Sim.syncWorldChunks(sim, a.x, a.y);
    assert.equal(sim.entities.filter((e) => e.uid === victim.uid).length, 1);
    const far = S.nearestSeaStart(W.FERRY_DOCKS.gelo.boat.x, W.FERRY_DOCKS.gelo.boat.y, 4);
    Sim.syncWorldChunks(sim, far.x, far.y);
    Sim.syncWorldChunks(sim, a.x, a.y);
    assert.ok(sim.entities.length >= n0 - 3);
    assert.ok(sim.entities.every((e) => e.state !== 'dead'));
  });
  it('sincronizar é barato (mil quadros em menos de meio segundo)', () => {
    const sim = Sim.createWorldSim(); const a = S.nearestSeaStart(W.FERRY_DOCKS.main.boat.x, W.FERRY_DOCKS.main.boat.y, 4);
    const t0 = Date.now(); for (let i = 0; i < 1000; i++) Sim.syncWorldChunks(sim, a.x + (i % 40), a.y);
    assert.ok(Date.now() - t0 < 500, `${Date.now() - t0} ms`);
  });
  it('as criaturas obedecem às paredes do mar aberto', () => {
    const sim = Sim.createWorldSim(); const a = S.nearestSeaStart(W.FERRY_DOCKS.main.boat.x, W.FERRY_DOCKS.main.boat.y, 4);
    Sim.syncWorldChunks(sim, a.x, a.y);
    const px = a.x * Sites.TILE, py = a.y * Sites.TILE;
    for (let t = 0; t < 4000; t += 50) Sim.stepSim(sim, 50, { x: px, y: py }, () => 0.5);
    for (const e of sim.entities) assert.equal(S.isSeaSolid(Math.floor(e.x / Sites.TILE), Math.floor(e.y / Sites.TILE)), false, e.def.id);
  });
});

describe('regiões do mar, travessias entre ilhas e aviso de morte', () => {
  it('cada cais tem a sua região com cor e nome próprios', () => {
    const moods = new Set(Object.values(W.FERRY_DOCKS).map((d) => S.moodAt(d.boat.x, d.boat.y)));
    assert.ok(moods.size >= 7, [...moods].join());
    for (const m of Object.keys(S.SEA_REGION_NAME)) assert.ok(S.SEA_REGION_NAME[m].length > 4 && !/[—–]/.test(S.SEA_REGION_NAME[m]));
  });
  it('as 8 rotas são entre cais diferentes, simétricas, e cada uma tem id estável', () => {
    assert.equal(new Set(Sites.CROSSINGS.map((c) => c.id)).size, 8);
    for (const c of Sites.CROSSINGS) { assert.notEqual(c.a, c.b); assert.equal(Sites.crossingFor(c.a, c.b), Sites.crossingFor(c.b, c.a)); assert.ok(W.FERRY_DOCKS[c.a] && W.FERRY_DOCKS[c.b]); }
    assert.equal(Sites.crossingFor('main', 'gelo'), null);
  });
  it('mergulhar numa ilha e emergir em outra conta como travessia; emergir na mesma não', () => {
    const o = read('src/game/dive/DiveOverlay.tsx');
    assert.match(o, /if \(endDock !== startDock\) \{\s*noteCrossing\(crossingFor\(startDock, endDock\)\?\.id\);/);
  });
  it('morrer afogado no mar cita a região', () => {
    const t = (k) => Object.assign({}, ...EXTRA_STRINGS.map((m) => m.pt))[k];
    assert.equal(D.describeDeath({ kind: 'hazard', hazard: 'drowning', region: S.regionNameAt(W.FERRY_DOCKS.main.boat.x, W.FERRY_DOCKS.main.boat.y) }, t), 'Você morreu durante a exploração de Mar do Recife, devido a afogamento.');
  });
  it('a cena ligou tudo: modos mar aberto e local, portais, emersão por chão andável, baús e criaturas por área', () => {
    const o = read('src/game/dive/DiveOverlay.tsx');
    for (const re of [/modeRef = useRef<'world' \| 'site'>/, /syncWorldChunks\(sim, ft\.x, ft\.y/, /chestsNear\(ft\.x, ft\.y, 1\)/, /portalAt\(ft\.x, ft\.y/, /findLanding\(ft2\.x, ft2\.y\)/, /<SeaTiles anchor=\{anchor\}/, /kind: 'portal'/, /leaveSite\(\)/]) assert.match(o, re);
    const w = read('src/screens/WorldScreen.tsx');
    assert.match(w, /nearestSeaStart\(Math\.floor\(cxp/);
    assert.ok(!/siteForIsland/.test(w), 'o botão não depende mais do cais');
  });
  it('textos novos nos 5 idiomas', () => {
    for (const lang of ['pt', 'en', 'es', 'fr', 'ja']) { const tb = Object.assign({}, ...EXTRA_STRINGS.map((m) => m[lang])); for (const k of ['dive_enter_site', 'dive_leave', 'dive_no_landing']) assert.ok(tb[k] && !/[—–]/.test(tb[k]), `${lang} ${k}`); }
  });
});
