/**
 * TRAVESSIA COMPLETA DO MUNDO SUBMERSO (de ponta a ponta, com a física real do jogo).
 *
 * Diferente de test-mar-aberto (que confere a grade e o ar por busca em tiles), aqui um "jogador-robô" NADA de verdade:
 * usa o mesmo `resolveMoveBoxes` (colisão), a mesma caixa de pés, a mesma velocidade de nado e o mesmo `stepBreath` (fôlego,
 * afogamento, pressão) da cena `DiveOverlay`. Cobre:
 *  1. conectividade do mar: os 9 cais e as 9 entradas estão na mesma massa de água; lagos fechados são seguros;
 *  2. barreiras invisíveis: o que é desenhado como água deixa passar e o que é rocha bloqueia (mesma fonte, colisão real);
 *  3. limites do mapa;
 *  4. o jogador nunca reaparece dentro da parede (volta dos locais, início do mergulho);
 *  5. ciclo completo: costa -> nado -> entrada -> local -> baús/saída -> mar -> superfície;
 *  6. as 8 travessias entre ilhas simuladas quadro a quadro, com fôlego e pressão, por nível de equipamento.
 * `node tests/unit/mar/travessia-completa.test.mjs`
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
const S = require('../../../src/game/dive/seaWorld.ts');
const W = require('../../../src/game/world/worldGen.ts');
const Sites = require('../../../src/game/dive/diveSites.ts');
const B = require('../../../src/game/dive/breath.ts');
const C = require('../../../src/game/collision/collision.ts');
const { ARMORS } = require('../../../src/game/items/armorDefs.ts');
const { MAR_MISSIONS } = require('../../../src/game/story/missionsMar.ts');
const read = (p) => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');

// ---- constantes da cena (lidas do código-fonte: se mudarem lá, o teste acompanha) -----------------------------------
const overlay = read('src/game/dive/DiveOverlay.tsx');
const grab = (re, n) => { const m = overlay.match(re); assert.ok(m, `constante não encontrada em DiveOverlay: ${re}`); return m.slice(1, n + 1).map(Number); };
const [PW, PH] = grab(/const PLAYER_SIZE = \{ x: (\d+), y: (\d+) \};/, 2);
const [FX, FY, FW, FH] = grab(/const FEET = \{ x: (\d+), y: (\d+), w: (\d+), h: (\d+) \};/, 4);
const PLAYER_SIZE = { x: PW, y: PH };
const FEET = { x: FX, y: FY, w: FW, h: FH };
const TILE = Sites.TILE;
const SPEED = Sites.SWIM_SPEED;
const DT = 1 / 30;
const SEC_PER_TILE = TILE / SPEED;
const { SEA_W, SEA_H } = S;
const N = SEA_W * SEA_H;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// ---- mapa e jogador, como na cena -------------------------------------------------------------------------------------
const mapOf = (charAt, w, h) => ({ id: 'dive', name: 'x', tileSize: TILE, width: w, height: h, getTile: (x, y) => (Sites.isSolidChar(charAt(x, y)) ? 'wall' : 'sand'), spawns: [], exits: [], npcs: [], objects: [] });
const WORLD_MAP = mapOf((x, y) => S.seaChar(x, y), SEA_W, SEA_H);
const placeAt = (tx, ty) => ({ x: tx * TILE + TILE / 2 - PLAYER_SIZE.x / 2, y: ty * TILE + TILE / 2 - PLAYER_SIZE.y + FEET.h / 2 + 8 });
const feetBox = (p) => ({ x: p.x + FEET.x, y: p.y + FEET.y, width: FEET.w, height: FEET.h });
const feetCenter = (p) => ({ x: p.x + FEET.x + FEET.w / 2, y: p.y + FEET.y + FEET.h / 2 });
const tileOf = (p) => { const c = feetCenter(p); return { x: Math.floor(c.x / TILE), y: Math.floor(c.y / TILE) }; };

/** Um passo de nado igual ao da cena. Devolve { pos, moved }. */
function swimStep(map, pos, dx, dy, dt = DT) {
  const len = Math.hypot(dx, dy) || 1;
  const step = { x: (dx / len) * SPEED * dt, y: (dy / len) * SPEED * dt };
  const r = C.resolveMoveBoxes(map, { x: pos.x + FEET.x, y: pos.y + FEET.y }, { x: FEET.w, y: FEET.h }, step, []);
  const np = { x: r.position.x - FEET.x, y: r.position.y - FEET.y };
  return { pos: np, moved: Math.abs(np.x - pos.x) + Math.abs(np.y - pos.y) > 1e-9 };
}

/** Segue um caminho de tiles (4-conexo) pelo centro de cada um. Devolve { pos, stuckAt, frames }. `onFrame(pos)` roda a cada quadro. */
function follow(map, pos, path, onFrame) {
  let frames = 0;
  for (const [tx, ty] of path) {
    const tgt = { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
    for (let guard = 0; ; guard++) {
      const fc = feetCenter(pos);
      const ddx = tgt.x - fc.x;
      const ddy = tgt.y - fc.y;
      if (Math.abs(ddx) <= 0.75 && Math.abs(ddy) <= 0.75) break;
      let dx = 0, dy = 0;
      if (Math.abs(ddx) > 0.75) dx = Math.sign(ddx); else dy = Math.sign(ddy);
      const maxStep = Math.abs(dx ? ddx : ddy);
      const dt = Math.min(DT, maxStep / SPEED);
      const r = swimStep(map, pos, dx, dy, dt);
      if (!r.moved || guard > 200) return { pos, stuckAt: { x: tx, y: ty }, frames };
      pos = r.pos;
      frames++;
      if (onFrame) onFrame(pos, dt);
    }
  }
  return { pos, stuckAt: null, frames };
}

/** BFS de tiles genérica (4-conexa) devolvendo o caminho [x,y] (sem o ponto de partida) ou null. */
function bfsPath(isOpen, w, h, from, to, maxLen = Infinity) {
  const key = (x, y) => y * w + x;
  if (!isOpen(from.x, from.y) || !isOpen(to.x, to.y)) return null;
  const par = new Map([[key(from.x, from.y), -1]]);
  let layer = [[from.x, from.y]];
  for (let d = 0; layer.length && d <= maxLen; d++) {
    const next = [];
    for (const [x, y] of layer) {
      if (x === to.x && y === to.y) {
        const out = [];
        for (let k = key(x, y); k !== key(from.x, from.y); k = par.get(k)) out.push([k % w, (k / w) | 0]);
        return out.reverse();
      }
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || !isOpen(nx, ny)) continue;
        const k = key(nx, ny);
        if (par.has(k)) continue;
        par.set(k, key(x, y));
        next.push([nx, ny]);
      }
    }
    layer = next;
  }
  return null;
}

// ---- tiers de equipamento (valores REAIS dos equipamentos do jogo) ----------------------------------------------------
const modsOf = (armorId) => B.combineMods(armorId ? ARMORS[armorId].breath : undefined, undefined);
const TIERS = [
  { id: 'none', armor: null },
  { id: 'armor_snorkel', armor: 'armor_snorkel' },
  { id: 'armor_wetsuit', armor: 'armor_wetsuit' },
  { id: 'armor_coral', armor: 'armor_coral' },
].map((t) => ({ ...t, mods: modsOf(t.armor) }));

// ---- componentes de água ------------------------------------------------------------------------------------------------
const comp = new Int32Array(N).fill(-1);
const compInfo = [];
{
  const q = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (comp[s] >= 0 || S.isSeaSolid(s % SEA_W, (s / SEA_W) | 0)) continue;
    const id = compInfo.length;
    let qh = 0, qt = 0, deep = 0, air = 0, shore = 0;
    q[qt++] = s; comp[s] = id;
    while (qh < qt) {
      const i = q[qh++];
      const x = i % SEA_W, y = (i / SEA_W) | 0;
      const c = S.seaCode(x, y);
      if (c === S.SEA.DEEP) deep++; else if (c === S.SEA.AIR) air++; else if (c === S.SEA.SHORE) shore++;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= SEA_W || ny >= SEA_H) continue;
        const j = ny * SEA_W + nx;
        if (comp[j] >= 0 || S.isSeaSolid(nx, ny)) continue;
        comp[j] = id; q[qt++] = j;
      }
    }
    compInfo.push({ id, n: qt, deep, air, shore });
  }
}
const MAIN = compInfo.reduce((a, b) => (b.n > a.n ? b : a)).id;
const compAt = (x, y) => comp[y * SEA_W + x];
/** Faixa de costa (superfície, respirável) mais perto do cais: onde o jogador mergulha e emerge de verdade. */
const dockStart = (k) => {
  const b = W.FERRY_DOCKS[k].boat;
  let best = null, bd = 1e9;
  for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) {
    const x = b.x + dx, y = b.y + dy;
    if (x < 1 || y < 1 || x >= SEA_W - 1 || y >= SEA_H - 1 || S.seaCode(x, y) !== S.SEA.SHORE || compAt(x, y) !== MAIN) continue;
    const d = Math.hypot(dx, dy);
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
};
const DOCKS = Object.keys(W.FERRY_DOCKS);

describe('1. conectividade: o mar é uma massa de água só entre as ilhas', () => {
  it('o mar principal tem mais de 98% de toda a água navegável', () => {
    const total = compInfo.reduce((s, c) => s + c.n, 0);
    assert.ok(compInfo[MAIN].n / total > 0.98, `${compInfo[MAIN].n}/${total}`);
  });
  it('os 9 cais e as 9 entradas de locais estão no mar principal (nenhuma ilha ou local fica isolado)', () => {
    for (const k of DOCKS) { const b = W.FERRY_DOCKS[k].boat; const s = S.nearestSeaStart(b.x, b.y, 4); assert.ok(s, k); assert.equal(compAt(s.x, s.y), MAIN, `cais ${k}`); assert.ok(dockStart(k), `sem costa perto do cais ${k}`); }
    assert.equal(S.getPortals().length, 9);
    for (const p of S.getPortals()) assert.equal(compAt(p.x, p.y), MAIN, `entrada ${p.siteId}`);
  });
  it('lagos fechados (fora do mar principal) são pequenos, rasos e têm ar: ninguém fica preso sem fôlego', () => {
    const isolated = compInfo.filter((c) => c.id !== MAIN);
    assert.ok(isolated.length <= 14, String(isolated.length));
    for (const c of isolated) {
      assert.equal(c.deep, 0, `lago ${c.id} tem zona funda`);
      assert.ok(c.shore > 0, `lago ${c.id} sem superfície para respirar`);
      assert.ok(c.n < 12000, `lago ${c.id} grande demais: ${c.n}`);
    }
  });
  it('toda água de todo lago tem ar ao alcance de um fôlego base (24 s) a partir da superfície ou de um bolsão', () => {
    // BFS multi-fonte de ar dentro de cada componente
    const d = new Int32Array(N).fill(-1);
    const q = new Int32Array(N);
    let qh = 0, qt = 0;
    for (let i = 0; i < N; i++) { const c = S.getSeaGrid().code[i]; if (c === S.SEA.SHORE || c === S.SEA.AIR) { d[i] = 0; q[qt++] = i; } }
    while (qh < qt) {
      const i = q[qh++]; const x = i % SEA_W, y = (i / SEA_W) | 0;
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= SEA_W || ny >= SEA_H) continue; const j = ny * SEA_W + nx; if (d[j] >= 0 || S.isSeaSolid(nx, ny)) continue; d[j] = d[i] + 1; q[qt++] = j; }
    }
    let worst = 0, over = 0, total = 0;
    for (let i = 0; i < N; i++) { if (comp[i] < 0) continue; total++; if (d[i] < 0) assert.fail(`tile sem ar: ${i % SEA_W},${(i / SEA_W) | 0}`); worst = Math.max(worst, d[i]); if (d[i] * SEC_PER_TILE > B.BREATH_CONFIG.baseMaxSec * 0.5) over++; }
    // ida e volta: metade do fôlego base de ar de cada lado => quase todo o mar é de ida e volta sem equipamento
    assert.ok(over / total < 0.55, `${(over / total).toFixed(3)}`);
    assert.ok(worst * SEC_PER_TILE <= B.breathMax(modsOf('armor_wetsuit')) / 0.85, `pior ponto a ${worst} tiles do ar`);
  });
});

describe('2. barreiras invisíveis: o desenhado é o que bloqueia (colisão real)', () => {
  // amostra determinística de tiles do mar principal
  const sample = [];
  for (let i = 12345; i < N && sample.length < 6000; i += 977) { const x = i % SEA_W, y = (i / SEA_W) | 0; if (!S.isSeaSolid(x, y) && x > 2 && y > 2 && x < SEA_W - 3 && y < SEA_H - 3) sample.push([x, y]); }
  it('de qualquer tile de água, o jogador chega ao centro do vizinho de água em qualquer direção (nenhuma parede invisível)', () => {
    let tried = 0;
    for (const [x, y] of sample) {
      for (const [dx, dy] of DIRS) {
        if (S.isSeaSolid(x + dx, y + dy)) continue;
        const r = follow(WORLD_MAP, placeAt(x, y), [[x + dx, y + dy]]);
        assert.equal(r.stuckAt, null, `barreira invisível entre ${x},${y} e ${x + dx},${y + dy}`);
        tried++;
      }
    }
    assert.ok(tried > 5000, String(tried));
  });
  it('de qualquer tile de água, empurrar contra rocha nunca entra na rocha (colisão fecha)', () => {
    let tried = 0;
    // tiles de água encostados em rocha: costa, pilares e paredes
    const edge = [];
    for (let y = 5; y < SEA_H - 5 && edge.length < 1500; y += 3) for (let x = 5; x < SEA_W - 5 && edge.length < 1500; x += 3) { if (S.isSeaSolid(x, y)) continue; if (DIRS.some(([dx, dy]) => S.isSeaSolid(x + dx, y + dy))) edge.push([x, y]); }
    assert.ok(edge.length > 800, String(edge.length));
    for (const [x, y] of edge) {
      for (const [dx, dy] of DIRS) {
        if (!S.isSeaSolid(x + dx, y + dy)) continue;
        let pos = placeAt(x, y);
        for (let i = 0; i < 90; i++) pos = swimStep(WORLD_MAP, pos, dx, dy).pos;
        assert.equal(C.isAreaSolid(WORLD_MAP, feetBox(pos)), false, `entrou na rocha a partir de ${x},${y}`);
        const t = tileOf(pos);
        assert.ok(!S.isSeaSolid(t.x, t.y));
        tried++;
      }
    }
    assert.ok(tried > 300, String(tried));
  });
  it('a caixa de pés cabe em corredores de 1 tile (a passagem mais estreita dos locais)', () => {
    assert.ok(FEET.w < TILE && FEET.h < TILE, 'caixa menor que um tile');
    for (const site of Object.values(Sites.SITES)) {
      const g = Sites.buildGrid(site);
      const charAt = (x, y) => g[y]?.[x];
      const map = mapOf(charAt, site.w, site.h);
      let narrow = 0;
      for (let y = 1; y < site.h - 1; y++) for (let x = 1; x < site.w - 1; x++) {
        if (Sites.isSolidChar(g[y][x])) continue;
        for (const [dx, dy] of DIRS) {
          if (Sites.isSolidChar(g[y + dy]?.[x + dx])) continue;
          // a passagem entre dois tiles abertos precisa funcionar
          const r = follow(map, placeAt(x, y), [[x + dx, y + dy]]);
          assert.equal(r.stuckAt, null, `${site.id}: preso entre ${x},${y} e ${x + dx},${y + dy}`);
          narrow++;
        }
      }
      assert.ok(narrow > 40, site.id);
    }
  });
});

describe('3. limites do mapa', () => {
  it('a borda do mundo submerso é parede: ninguém sai do mapa, nem nadando contra ela por 30 s', () => {
    for (const [dx, dy] of DIRS) {
      // um ponto de água livre perto da borda correspondente
      let start = null;
      for (let k = 2; k < 400 && !start; k++) {
        const x = dx === 1 ? SEA_W - 2 : dx === -1 ? 1 : 100 + k;
        const y = dy === 1 ? SEA_H - 2 : dy === -1 ? 1 : 100 + k;
        if (!S.isSeaSolid(x, y)) start = { x, y };
      }
      assert.ok(start, `sem água na borda ${dx},${dy}`);
      let pos = placeAt(start.x, start.y);
      for (let i = 0; i < 900; i++) pos = swimStep(WORLD_MAP, pos, dx, dy).pos;
      const fc = feetCenter(pos);
      assert.ok(fc.x > 0 && fc.y > 0 && fc.x < SEA_W * TILE && fc.y < SEA_H * TILE, `saiu do mapa ${fc.x},${fc.y}`);
      assert.equal(C.isAreaSolid(WORLD_MAP, feetBox(pos)), false);
    }
  });
  it('o mapa da cena tem exatamente o tamanho do mundo (sem faixa invisível)', () => {
    assert.match(overlay, /width: mode === 'world' \? SEA_W : site\.w/);
    assert.match(overlay, /height: mode === 'world' \? SEA_H : site\.h/);
    assert.equal(S.SEA_W, W.WORLD_TILES_W);
  });
});

describe('4. o jogador nunca reaparece dentro da parede', () => {
  it('REGRESSÃO: o retorno dos locais não cai em rocha (o antigo "3 tiles abaixo" caía num pilar no Naufrágio)', () => {
    const old = S.getPortals().filter((p) => S.isSeaSolid(p.x, p.y + 3));
    assert.ok(old.length >= 1, 'a regressão deixou de ser exercitada: o mundo mudou, revise');
    assert.ok(old.some((p) => p.siteId === 'naufragio') || old.length > 0);
    for (const p of S.getPortals()) {
      const r = S.seaReturnTile(p);
      assert.equal(S.isSeaSolid(r.x, r.y), false, `${p.siteId}: retorno em rocha`);
      assert.equal(C.isAreaSolid(WORLD_MAP, feetBox(placeAt(r.x, r.y))), false, `${p.siteId}: caixa de pés em rocha`);
      assert.equal(S.portalAt(r.x, r.y, 1.9), null, `${p.siteId}: volta já dentro do alcance do botão de entrar`);
      assert.equal(compAt(r.x, r.y), MAIN, `${p.siteId}: retorno fora do mar principal`);
      assert.ok(Math.hypot(r.x - p.x, r.y - p.y) <= 6, `${p.siteId}: longe demais da entrada`);
    }
  });
  it('do retorno de cada local o jogador anda em todas as direções livres e consegue voltar à entrada', () => {
    for (const p of S.getPortals()) {
      const r = S.seaReturnTile(p);
      let free = 0;
      for (const [dx, dy] of DIRS) if (!S.isSeaSolid(r.x + dx, r.y + dy)) { free++; assert.equal(follow(WORLD_MAP, placeAt(r.x, r.y), [[r.x + dx, r.y + dy]]).stuckAt, null); }
      assert.ok(free >= 2, `${p.siteId}: encurralado (${free} saídas)`);
      const path = bfsPath((x, y) => !S.isSeaSolid(x, y), SEA_W, SEA_H, r, p, 20);
      assert.ok(path, `${p.siteId}: sem caminho de volta`);
      const res = follow(WORLD_MAP, placeAt(r.x, r.y), path);
      assert.equal(res.stuckAt, null);
      const t = tileOf(res.pos);
      assert.equal(S.portalAt(t.x, t.y, 1.9)?.siteId, p.siteId, 'chegou na entrada e o botão de entrar aparece');
    }
  });
  it('clearSeaTile: tile pedido livre fica onde está; tile em rocha vai para o livre mais perto; sem água por perto devolve null', () => {
    const p = S.getPortals().find((x) => x.siteId === 'naufragio');
    assert.deepEqual(S.clearSeaTile(p.x, p.y), { x: p.x, y: p.y });
    const rock = { x: p.x, y: p.y + 3 };
    assert.equal(S.isSeaSolid(rock.x, rock.y), true);
    const fix = S.clearSeaTile(rock.x, rock.y);
    assert.ok(fix && !S.isSeaSolid(fix.x, fix.y) && Math.hypot(fix.x - rock.x, fix.y - rock.y) <= 2.3);
    // terra firme bem no meio de uma ilha: sem água num anel de 1 tile
    let land = null;
    for (let y = 300; y < SEA_H - 300 && !land; y += 7) for (let x = 300; x < SEA_W - 300 && !land; x += 7) { let ok = true; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (!S.isSeaSolid(x + dx, y + dy)) ok = false; if (ok) land = { x, y }; }
    assert.ok(land);
    assert.equal(S.clearSeaTile(land.x, land.y, { maxRing: 1 }), null, 'em terra firme, sem água num anel de 1');
  });
  it('o começo do mergulho (qualquer costa) e a cena usam o tile livre', () => {
    assert.match(overlay, /const tile = clearSeaTile\(want\.x, want\.y\) \?\? want;/);
    assert.match(overlay, /enterWorld\(seaReturnTile\(ret\), false\)/);
    let n = 0;
    for (let y = 4; y < SEA_H - 4; y += 6) for (let x = 4; x < SEA_W - 4; x += 6) {
      const st = S.nearestSeaStart(x, y, 2);
      if (!st) continue;
      n++;
      assert.deepEqual(S.clearSeaTile(st.x, st.y), st);
      assert.equal(C.isAreaSolid(WORLD_MAP, feetBox(placeAt(st.x, st.y))), false);
    }
    assert.ok(n > 800, String(n));
  });
});

// ---- planejador de rota com ar (para as travessias e a ida até as entradas) ------------------------------------------------------
function makePlanner(mods) {
  const infinite = mods.infinite;
  const maxTiles = infinite ? 1e9 : Math.floor(((B.breathMax(mods) / (B.BREATH_CONFIG.drainPerSec * mods.drainMult)) / SEC_PER_TILE) * 0.9);
  const g = S.getSeaGrid();
  const nodes = [];
  const nodeAt = new Int32Array(N).fill(-1);
  for (const p of g.pockets) { nodeAt[p.y * SEA_W + p.x] = nodes.length; nodes.push({ x: p.x, y: p.y }); }
  const cell = new Set();
  for (let y = 1; y < SEA_H - 1; y += 2) for (let x = 1; x < SEA_W - 1; x += 2) {
    if (g.code[y * SEA_W + x] !== S.SEA.SHORE) continue;
    const k = (y >> 3) * 4096 + (x >> 3);
    if (cell.has(k)) continue;
    cell.add(k); nodeAt[y * SEA_W + x] = nodes.length; nodes.push({ x, y });
  }
  const dist = new Int32Array(N).fill(-1);
  const par = new Int32Array(N);
  const deepCnt = new Int32Array(N);
  const queue = new Int32Array(N);
  const touched = [];
  const open = (x, y) => { if (x < 1 || y < 1 || x >= SEA_W - 1 || y >= SEA_H - 1) return false; const c = g.code[y * SEA_W + x]; return c !== S.SEA.ROCK && c !== S.SEA.PILLAR; };
  /** BFS limitada a partir de (x,y); `visit(j, len, deep)` em cada tile novo. */
  function explore(x0, y0, limit, visit) {
    let qh = 0, qt = 0;
    const s = y0 * SEA_W + x0;
    dist[s] = 0; par[s] = -1; deepCnt[s] = 0; queue[qt++] = s; touched.push(s);
    while (qh < qt) {
      const i = queue[qh++]; const d = dist[i];
      if (d >= limit) continue;
      const x = i % SEA_W, y = (i / SEA_W) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!open(nx, ny)) continue;
        const j = ny * SEA_W + nx;
        if (dist[j] >= 0) continue;
        dist[j] = d + 1; par[j] = i;
        const c = g.code[j];
        deepCnt[j] = deepCnt[i] + (c === S.SEA.DEEP ? 1 : 0);
        queue[qt++] = j; touched.push(j);
        if (visit(j, d + 1, deepCnt[j]) === true) return;
      }
    }
  }
  const reset = () => { for (const t of touched) dist[t] = -1; touched.length = 0; };
  const edges = nodes.map(() => []);
  if (!infinite) {
    for (let a = 0; a < nodes.length; a++) {
      explore(nodes[a].x, nodes[a].y, maxTiles, (j, len, dp) => { const b = nodeAt[j]; if (b >= 0 && b !== a) edges[a].push({ to: b, len, deep: dp }); });
      reset();
    }
  }
  const pathBetween = (a, b) => { // caminho de tiles de a até b (BFS limitada: o mesmo que gerou a aresta)
    let out = null;
    explore(a.x, a.y, maxTiles, (j) => { if (j === b.y * SEA_W + b.x) { out = []; for (let k = j; k !== a.y * SEA_W + a.x; k = par[k]) out.push([k % SEA_W, (k / SEA_W) | 0]); out.reverse(); return true; } return false; });
    reset();
    return out;
  };
  /** Rota de `from` a `to` (tiles) em pernas de um fôlego cada, ou null. `wDeep` pune a zona funda. */
  function route(from, to, wDeep) {
    const ex = nodes.length;
    const all = [...nodes, { x: from.x, y: from.y }, { x: to.x, y: to.y }];
    const E = edges.map((l) => l.slice());
    E.push([], []);
    const S0 = ex, G0 = ex + 1;
    if (infinite) {
      const p = pathBetweenInf(from, to);
      return p ? { legs: [{ path: p }], tiles: p.length, deepTiles: p.filter(([x, y]) => S.seaCode(x, y) === S.SEA.DEEP).length } : null;
    }
    for (const [idx, pt] of [[S0, from], [G0, to]]) {
      explore(pt.x, pt.y, maxTiles, (j, len, dp) => {
        const b = nodeAt[j];
        if (b >= 0) { if (idx === S0) E[S0].push({ to: b, len, deep: dp }); else E[b].push({ to: G0, len, deep: dp }); }
        if (idx === S0 && j === to.y * SEA_W + to.x) E[S0].push({ to: G0, len, deep: dp });
      });
      reset();
    }
    // Dijkstra (heap binário)
    const D = new Float64Array(all.length).fill(Infinity);
    const prev = new Int32Array(all.length).fill(-1);
    const heap = [[0, S0]];
    const push = (it) => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    D[S0] = 0;
    while (heap.length) {
      const [d, u] = pop();
      if (d > D[u]) continue;
      if (u === G0) break;
      for (const e of E[u]) { const nd = d + e.len + e.deep * wDeep; if (nd < D[e.to]) { D[e.to] = nd; prev[e.to] = u; push([nd, e.to]); } }
    }
    if (!Number.isFinite(D[G0])) return null;
    const chain = [];
    for (let u = G0; u !== -1; u = prev[u]) chain.push(u);
    chain.reverse();
    const legs = [];
    let tiles = 0, deepTiles = 0;
    for (let i = 0; i + 1 < chain.length; i++) {
      const a = all[chain[i]], b = all[chain[i + 1]];
      const path = pathBetween(a, b);
      assert.ok(path, `perna sem caminho ${a.x},${a.y} -> ${b.x},${b.y}`);
      tiles += path.length;
      deepTiles += path.filter(([x, y]) => S.seaCode(x, y) === S.SEA.DEEP).length;
      legs.push({ from: a, to: b, path });
    }
    return { legs, tiles, deepTiles };
  }
  function pathBetweenInf(a, b) { return bfsPath((x, y) => open(x, y), SEA_W, SEA_H, a, b); }
  return { maxTiles, nodes: nodes.length, edges: edges.reduce((s, e) => s + e.length, 0), route };
}

/** Nada uma rota inteira com a física real e o fôlego real. Espera encher o ar em cada parada. */
function swimRoute(route, mods, start) {
  let pos = placeAt(start.x, start.y);
  let breath = B.newBreath(mods);
  const out = { seconds: 0, minAir: breath.sec, drownTicks: 0, pressureTicks: 0, damage: 0, empty: false, stuck: null, frames: 0 };
  const tick = (dtMs) => {
    const t = tileOf(pos);
    const ch = S.seaChar(t.x, t.y);
    const r = B.stepBreath(breath, dtMs, { submerged: true, breathable: ch === 'A' || ch === 'U', deep: ch === ':', mods });
    breath = r.state;
    out.seconds += dtMs / 1000;
    out.minAir = Math.min(out.minAir, breath.sec);
    if (r.events.includes('empty')) out.empty = true;
    out.drownTicks += r.events.filter((e) => e === 'drown').length;
    out.pressureTicks += r.events.filter((e) => e === 'pressure').length;
    out.damage += r.damageFrac;
  };
  for (const leg of route.legs) {
    // parada no ar: enche o fôlego (nos tiles respiráveis o ar volta a 9 s por segundo)
    for (let i = 0; i < 4000 && breath.sec < B.breathMax(mods) - 0.01 && !mods.infinite; i++) tick(DT * 1000);
    const res = follow(WORLD_MAP, pos, leg.path, (p, dt) => { pos = p; tick(dt * 1000); });
    pos = res.pos;
    out.frames += res.frames;
    if (res.stuckAt) { out.stuck = res.stuckAt; break; }
  }
  out.end = tileOf(pos);
  return out;
}

const planners = new Map();
const plannerFor = (tier) => { if (!planners.has(tier.id)) planners.set(tier.id, makePlanner(tier.mods)); return planners.get(tier.id); };

describe('5. ciclo completo: costa -> nado -> entrada -> local -> mar -> superfície (todos os 9 locais)', () => {
  const base = TIERS[0];
  for (const site of Object.values(Sites.SITES)) {
    it(`${site.id}: da costa de ${site.island} até a entrada, dentro do local (baús, ar, criaturas), de volta ao mar e à superfície`, () => {
      const portal = S.getPortals().find((p) => p.siteId === site.id);
      const dock = dockStart(portal.dock);
      // 5a. nada da costa até a entrada com o fôlego base, com a física real
      const r = plannerFor(base).route(dock, portal, 0);
      assert.ok(r, 'sem rota até a entrada com o fôlego base');
      const sw = swimRoute(r, base.mods, dock);
      assert.equal(sw.stuck, null, `preso em ${JSON.stringify(sw.stuck)}`);
      assert.equal(sw.empty, false, `ficou sem fôlego indo à entrada (min ${sw.minAir.toFixed(1)} s)`);
      assert.equal(S.portalAt(sw.end.x, sw.end.y, 1.9)?.siteId, site.id, 'o botão de entrar aparece ao chegar');
      // 5b. dentro do local: da saída a cada baú, bolsão de ar, NPC e portão, com colisão real; baús escondidos só depois de revelar a parede
      const g = Sites.buildGrid(site);
      const map = mapOf((x, y) => g[y]?.[x], site.w, site.h);
      const goals = [...(site.chests ?? []).filter((c) => !c.hidden), ...site.air, ...(site.spawns ?? []), ...(site.npcs ?? []), ...(site.gates ?? [])];
      for (const goal of goals) {
        const path = bfsPath((x, y) => !Sites.isSolidChar(g[y]?.[x]), site.w, site.h, site.exit, goal);
        assert.ok(path, `${site.id}: sem caminho até ${JSON.stringify(goal)}`);
        const res = follow(map, placeAt(site.exit.x, site.exit.y), path);
        assert.equal(res.stuckAt, null, `${site.id}: preso a caminho de ${JSON.stringify(goal)} em ${JSON.stringify(res.stuckAt)}`);
      }
      for (const h of site.hidden ?? []) {
        const hc = (site.chests ?? []).find((c) => c.hidden);
        if (!hc) continue;
        assert.equal(bfsPath((x, y) => !Sites.isSolidChar(g[y]?.[x]), site.w, site.h, site.exit, hc), null, `${site.id}: o baú escondido não pode ser alcançado antes da parede`);
        const g2 = Sites.buildGrid(site, new Set([h.id]));
        const path = bfsPath((x, y) => !Sites.isSolidChar(g2[y]?.[x]), site.w, site.h, site.exit, hc);
        assert.ok(path, `${site.id}: baú escondido inalcançável depois da parede`);
        const res = follow(mapOf((x, y) => g2[y]?.[x], site.w, site.h), placeAt(site.exit.x, site.exit.y), path);
        assert.equal(res.stuckAt, null, `${site.id}: preso ao baú escondido`);
      }
      // 5c. de volta ao mar: o tile de retorno é livre e dali se nada até a superfície mais próxima (costa do cais)
      const ret = S.seaReturnTile(portal);
      assert.equal(C.isAreaSolid(WORLD_MAP, feetBox(placeAt(ret.x, ret.y))), false);
      const back = plannerFor(base).route(ret, dock, 0);
      assert.ok(back, 'sem rota de volta ao cais');
      const sb = swimRoute(back, base.mods, ret);
      assert.equal(sb.stuck, null);
      assert.equal(sb.empty, false, 'ficou sem fôlego voltando');
      // 5d. emerge: a costa do cais tem chão para pisar e tira o jogador do mar
      assert.equal(S.isBreathableSea(sb.end.x, sb.end.y), true, 'chega em tile respirável (superfície)');
      const land = S.findLanding(sb.end.x, sb.end.y);
      assert.ok(land, 'sem chão andável onde emergiu');
      assert.ok(['grass', 'path', 'sand', 'stone', 'snow', 'ash', 'dock'].includes(W.getWorldTile(land.x, land.y)));
    });
  }
});

describe('6. as 8 travessias entre ilhas, nadadas quadro a quadro', () => {
  const results = new Map(); // crossingId -> { tierId -> resultado }
  const survive = (r) => !r.stuck && !r.empty && r.drownTicks === 0 && r.damage <= 0.5; // sem se afogar e com no máximo 50% da vida perdida na pressão
  for (const c of Sites.CROSSINGS) {
    it(`${c.id}: viável com o equipamento certo, e o jogo diz qual é o necessário`, () => {
      const from = dockStart(c.a);
      const to = dockStart(c.b);
      const row = {};
      for (const tier of TIERS) {
        const pl = plannerFor(tier);
        const rt = pl.route(from, to, tier.mods.pressureSafe ? 0 : 60);
        if (!rt) { row[tier.id] = { ok: false, why: 'sem rota de ar' }; continue; }
        const sw = swimRoute(rt, tier.mods, from);
        row[tier.id] = { ok: survive(sw), why: sw.stuck ? 'preso' : sw.empty ? 'sem fôlego' : sw.damage > 0.5 ? `pressão ${(sw.damage * 100).toFixed(0)}%` : '', minutes: sw.seconds / 60, damage: sw.damage, deepTiles: rt.deepTiles, stuck: sw.stuck, end: sw.end, minAir: sw.minAir };
      }
      results.set(c.id, row);
      // nunca fica preso numa rota que o planejador achou: isso seria uma barreira invisível
      for (const [id, r] of Object.entries(row)) assert.equal(r.stuck ?? null, null, `${c.id} com ${id}: preso em ${JSON.stringify(r.stuck)}`);
      // com a Armadura de Coral (resiste à pressão) TODA travessia é possível, sem poção
      assert.ok(row.armor_coral.ok, `${c.id}: inviável até com a Armadura de Coral (${row.armor_coral.why})`);
      // a travessia termina de verdade na costa da outra ilha
      const e = row.armor_coral.end;
      assert.equal(S.islandNear(e.x, e.y), c.b, `${c.id}: terminou perto de ${S.islandNear(e.x, e.y)} em vez de ${c.b}`);
      assert.equal(S.isBreathableSea(e.x, e.y), true);
    });
  }
  it('quadro de equipamento mínimo por travessia (informativo) e garantias de progressão', () => {
    const order = TIERS.map((t) => t.id);
    const lines = [];
    for (const c of Sites.CROSSINGS) {
      const row = results.get(c.id);
      const min = order.find((id) => row[id].ok) ?? 'nenhum';
      lines.push(`${c.id.padEnd(26)} mínimo: ${min.padEnd(14)} ${order.map((id) => `${id.replace('armor_', '')}=${row[id].ok ? `ok(${row[id].minutes.toFixed(1)}min,${(row[id].damage * 100).toFixed(0)}%)` : row[id].why}`).join('  ')}`);
    }
    console.log('\n' + lines.join('\n') + '\n');
    // "A Primeira Travessia" é cedo: tem de haver travessias sem equipamento nenhum
    const free = Sites.CROSSINGS.filter((c) => results.get(c.id).none.ok);
    assert.ok(free.length >= 3, `só ${free.length} travessias sem equipamento`);
    // a primeira travessia do jogo (recife -> naufrágio) é feita sem equipamento e sem dano
    assert.ok(results.get('cross_recife_naufragio').none.ok && results.get('cross_recife_naufragio').none.damage === 0);
  });
  it('as travessias que exigem proteção contra a pressão avisam isso na dica da missão', () => {
    const needsPressure = Sites.CROSSINGS.filter((c) => !TIERS.filter((t) => !t.mods.pressureSafe).some((t) => results.get(c.id)[t.id].ok));
    assert.ok(needsPressure.length >= 1);
    const hintOf = { cross_lagoa_fumarolas: 'mar_travessia_dura', cross_gruta_abismo: 'mar_travessia_abismo' };
    for (const c of needsPressure) {
      const m = MAR_MISSIONS.find((x) => x.id === hintOf[c.id]);
      if (!m) continue; // só as travessias que têm missão própria
      assert.match(m.hint, /press/i, `${m.id}: a dica não avisa da pressão`);
    }
  });
  it('a proteção contra a pressão é obtível sem fazer nenhuma travessia: Armadura de Coral no baú do Abismo (chega-se pelo cais da ilha das Trevas)', () => {
    const chest = Sites.SITES.abismo.chests.find((c) => c.armor === 'armor_coral');
    assert.ok(chest, 'baú do Abismo com a Armadura de Coral');
    assert.equal(ARMORS.armor_coral.breath.pressureSafe, true);
    const p = S.getPortals().find((x) => x.siteId === 'abismo');
    assert.ok(Math.hypot(p.x - W.FERRY_DOCKS.trevas.boat.x, p.y - W.FERRY_DOCKS.trevas.boat.y) <= 70, 'entrada do Abismo perto do cais (de balsa, sem travessia)');
  });
});
