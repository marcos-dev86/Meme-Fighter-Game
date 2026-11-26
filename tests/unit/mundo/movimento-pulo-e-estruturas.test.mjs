/**
 * Mundo: uma direção por vez, NPCs/inimigos/chefes sólidos, pulo útil (pedras, troncos, inimigos, NPCs) e todas as estruturas
 * do mapa com porta.
 *   node tests/unit/mundo/movimento-pulo-e-estruturas.test.mjs
 */
import Module, { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const stub = () => new Proxy(function () {}, { get: (t, p) => (p === '__esModule' ? true : p === 'default' ? stub() : p === Symbol.toPrimitive ? () => 0 : stub()), apply: () => stub() });
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (/^(react-native|expo|@expo|react-native-)/.test(req)) return stub();
  if (req === '@react-native-async-storage/async-storage') return { __esModule: true, default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } };
  return origLoad.call(this, req, ...rest);
};
require('../../_support/ts-register.cjs');
const C = require('../../../src/game/collision/collision.ts');
const W = require('../../../src/game/world/worldGen.ts');
const read = (p) => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');

/** Mapa de teste: 20x9 de grama; `rows` desenha por cima ('#' rocha, 'T' árvore, '~' água, '.' grama). */
function mapOf(rows) {
  const h = rows.length, w = rows[0].length;
  const names = { '.': 'grass', '#': 'rock', T: 'tree', '~': 'water' };
  return { width: w, height: h, tileSize: 32, getTile: (x, y) => names[rows[y]?.[x]] ?? 'grass' };
}
const SIZE = { x: 22, y: 30 };

describe('uma direção por vez', () => {
  const none = { left: false, right: false, up: false, down: false };
  it('sem diagonal: vale o eixo apertado por último', () => {
    let r = C.singleAxisInput({ ...none, right: true }, { x: false, y: false }, 'x');
    assert.deepEqual([r.dx, r.dy], [1, 0]);
    r = C.singleAxisInput({ ...none, right: true, down: true }, r.held, r.axis); // apertou "baixo" depois
    assert.deepEqual([r.dx, r.dy], [0, 1]);
    r = C.singleAxisInput({ ...none, right: true, down: true }, r.held, r.axis); // segurando os dois: continua descendo
    assert.deepEqual([r.dx, r.dy], [0, 1]);
    r = C.singleAxisInput({ ...none, right: true }, r.held, r.axis); // soltou "baixo": volta para a direita
    assert.deepEqual([r.dx, r.dy], [1, 0]);
  });
  it('esquerda e direita juntas se anulam, e nunca sai um vetor diagonal', () => {
    let r = C.singleAxisInput({ ...none, left: true, right: true }, { x: false, y: false }, 'x');
    assert.equal(r.dx, 0);
    for (const combo of [{ left: true, up: true }, { right: true, up: true }, { left: true, down: true }, { right: true, down: true }]) {
      r = C.singleAxisInput({ ...none, ...combo }, { x: false, y: false }, 'x');
      assert.ok(r.dx === 0 || r.dy === 0, JSON.stringify(combo));
    }
  });
});

describe('corpos sólidos', () => {
  const map = mapOf(Array(9).fill('.'.repeat(20)));
  const body = C.bodyBox(200, 160, 32);
  it('não atravessa um NPC/inimigo andando de frente', () => {
    let pos = { x: 140, y: 140 };
    for (let i = 0; i < 60; i++) pos = C.resolveMoveSolid(map, pos, SIZE, { x: 3, y: 0 }, [body], false).position;
    assert.ok(pos.x + SIZE.x <= body.x + 0.01, `atravessou: ${pos.x}`);
  });
  it('bate no corpo e avisa (blockedX), como em uma parede', () => {
    const r = C.resolveMoveSolid(map, { x: body.x - SIZE.x - 1, y: 140 }, SIZE, { x: 5, y: 0 }, [body], false);
    assert.equal(r.blockedX, true);
  });
  it('pulando, passa por cima do corpo', () => {
    let pos = { x: 140, y: 140 };
    for (let i = 0; i < 60; i++) pos = C.resolveMoveSolid(map, pos, SIZE, { x: 3, y: 0 }, [body], true).position;
    assert.ok(pos.x > body.x + body.width, `não passou: ${pos.x}`);
  });
  it('um corpo que já encosta no jogador é ignorado: nunca fica preso dentro de um NPC', () => {
    const on = { x: 190, y: 150 };
    const near = C.bodyBox(on.x + 10, on.y + 30, 32);
    const r = C.resolveMoveSolid(map, on, SIZE, { x: -4, y: 0 }, [near], false);
    assert.equal(r.position.x, on.x - 4);
  });
});

describe('pulo útil: obstáculos finos', () => {
  const rows = [
    '..................',
    '..................',
    '.......#..........', // pedra solta
    '..................',
    '.....TTTT.........', // floresta fechada (4 de largura, 1 de altura: fina na vertical)
    '..................',
    '.......##.........',
    '.......##.........', // pedra grossa 2x2: intransponível
    '..................',
  ];
  const map = mapOf(rows);
  it('uma pedra isolada é obstáculo fino; um bloco 2x2 não', () => {
    assert.equal(C.isThinObstacle(map, 7, 2), true);
    assert.equal(C.isThinObstacle(map, 7, 6), false);
    assert.equal(C.isThinObstacle(map, 7, 7), false);
    assert.equal(C.isThinObstacle(map, 1, 1), false, 'grama não é obstáculo');
  });
  it('sem pulo, a pedra bloqueia; com pulo, atravessa', () => {
    const walk = (air) => { let p = { x: 100, y: 66 }; for (let i = 0; i < 90; i++) p = C.resolveMoveSolid(map, p, SIZE, { x: 3, y: 0 }, [], air).position; return p; };
    assert.ok(walk(false).x < 7 * 32, 'sem pulo para na pedra');
    assert.ok(walk(true).x > 8 * 32, 'com pulo passa');
  });
  it('o bloco grosso continua intransponível mesmo pulando', () => {
    let p = { x: 100, y: 7 * 32 + 1 };
    for (let i = 0; i < 90; i++) p = C.resolveMoveSolid(map, p, SIZE, { x: 3, y: 0 }, [], true).position;
    assert.ok(p.x < 7 * 32, `atravessou o bloco grosso: ${p.x}`);
  });
  it('a água nunca é pulável', () => {
    const sea = mapOf(['......', '..~~..', '..~~..', '......']);
    let p = { x: 20, y: 40 };
    for (let i = 0; i < 40; i++) p = C.resolveMoveSolid(sea, p, SIZE, { x: 3, y: 0 }, [], true).position;
    assert.ok(p.x < 2 * 32, 'pulou a água');
  });
  it('pousar dentro da pedra empurra para o chão livre; sem saída, volta ao último ponto seguro', () => {
    const inside = { x: 7 * 32 + 5, y: 2 * 32 + 1 };
    const land = C.landFromJump(map, inside, SIZE, { x: 1, y: 0 }, { x: 100, y: 66 });
    assert.equal(C.isAreaSolid(map, { x: land.x, y: land.y, width: SIZE.x, height: SIZE.y }), false);
    const trapped = mapOf(['#####', '#####', '#####']);
    const back = C.landFromJump(trapped, { x: 40, y: 30 }, SIZE, { x: 1, y: 0 }, { x: 5, y: 5 });
    assert.deepEqual(back, { x: 5, y: 5 });
  });
  it('o pulo cobre a pedra: a distância do pulo é maior que um bloco mais o corpo', () => {
    const w = read('src/screens/WorldScreen.tsx');
    const ms = Number(/const JUMP_MS = (\d+)/.exec(w)[1]);
    const speed = Number(/const PLAYER_SPEED = (\d+)/.exec(w)[1]);
    assert.ok((speed * ms) / 1000 > 32 + 22 + 8, `pulo curto: ${(speed * ms) / 1000}px`);
  });
});

describe('estruturas do mapa', () => {
  const WW = W.WORLD_TILES_W, HH = W.WORLD_TILES_H;
  const isB = (t) => t === 'house' || t === 'shop';
  const comps = [];
  const seen = new Uint8Array(WW * HH);
  for (let y = 0; y < HH; y++) for (let x = 0; x < WW; x++) {
    if (seen[y * WW + x] || !isB(W.getWorldTile(x, y))) continue;
    const st = [[x, y]]; seen[y * WW + x] = 1;
    let minx = x, maxx = x, miny = y, maxy = y;
    while (st.length) {
      const [cx, cy] = st.pop();
      minx = Math.min(minx, cx); maxx = Math.max(maxx, cx); miny = Math.min(miny, cy); maxy = Math.max(maxy, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= WW || ny >= HH || seen[ny * WW + nx] || !isB(W.getWorldTile(nx, ny))) continue;
        seen[ny * WW + nx] = 1; st.push([nx, ny]);
      }
    }
    comps.push({ minx, maxx, miny, maxy, w: maxx - minx + 1, h: maxy - miny + 1 });
  }
  const hasDoor = (c) => { for (let y = c.miny - 1; y <= c.maxy + 1; y++) for (let x = c.minx - 1; x <= c.maxx + 1; x++) if (W.getWorldTile(x, y) === 'door') return true; return false; };

  it('toda estrutura de 4 blocos de largura ou mais tem porta registrada (só as barracas 2x2 e 3x2 ficam sem)', () => {
    assert.ok(comps.length >= 25, `estruturas lidas: ${comps.length}`);
    for (const c of comps) {
      if (c.w < 4) { assert.ok(c.h <= 2, `estrutura estreita e alta sem porta: ${JSON.stringify(c)}`); continue; }
      assert.ok(hasDoor(c), `sem porta: ${JSON.stringify(c)}`);
    }
  });
  it('as 8 casas novas existem, têm conteúdo (nome e baú) e a porta dá para um caminho livre', () => {
    const ids = ['casa_vila_1', 'casa_vila_2', 'casa_vila_3', 'casa_vila_4', 'casa_vila_5', 'casa_vila_6', 'casa_vila_7', 'casa_fragmentos'];
    const content = require('../../../src/game/world/buildingContent.ts').BUILDING_CONTENT;
    for (const id of ids) {
      const d = W.BUILDING_DOORS[id];
      assert.ok(d, id);
      assert.equal(W.getWorldTile(d.x, d.y), 'door');
      assert.equal(W.getBuildingAtDoor(d.x, d.y).id, id);
      assert.ok(['grass', 'path', 'sand', 'stone', 'flower'].includes(W.getWorldTile(d.x, d.y + 1)), `${id}: sem caminho na porta`);
      assert.ok(content[id]?.label && content[id]?.chest?.id, `${id}: sem conteúdo`);
    }
    const chestIds = Object.values(content).map((c) => c.chest?.id).filter(Boolean);
    assert.equal(new Set(chestIds).size, chestIds.length, 'ids de baú repetidos');
  });
});

describe('ligação no mundo', () => {
  it('o mundo usa uma direção, corpos sólidos e o pouso do pulo', () => {
    const w = read('src/screens/WorldScreen.tsx');
    assert.ok(/singleAxisInput\(/.test(w) && /resolveMoveSolid\(/.test(w) && /landFromJump\(/.test(w));
    assert.ok(/for \(const e of enemies\.enemies\)/.test(w) && /for \(const b of BOSSES\)/.test(w) && /for \(const p of OUTDOOR_NPCS\)/.test(w));
  });
});
