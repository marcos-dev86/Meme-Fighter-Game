/**
 * Testes da Parte 2 (Urgente 4): Sahur/Sahur God/Sahur Evil, cume do vulcao (piolet), sprites novos (assets/sprites-v2).
 * Logica pura no Node: `node tools/test-parte2.mjs`
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('./ts-register.cjs');
const wg = require('../src/game/world/worldGen.ts');
const { WORLD_PICKUPS } = require('../src/game/world/pickups.ts');
const { DOGGE_MISSIONS } = require('../src/game/story/missionsDogge.ts');
const { ITEMS } = require('../src/game/items/itemDefs.ts');
const { ENEMY_SPAWNS } = require('../src/game/enemies/enemySpawns.ts');
const { FIGHTER_NAME } = require('../src/game/state/rosterState.ts');
const { NPCS, OUTDOOR_NPCS } = require('../src/game/world/npcs.ts');
const { createFighter } = require('../src/game/battle/Fighter.ts');
const S = require('../src/game/battle/sprites.ts');
const V2 = require('../src/game/battle/spritesV2.ts');
const W = require('../src/game/cosmetics/wearV2.ts');
const T = require('../src/game/cosmetics/anchors.ts');
const H = require('../src/game/battle/handAnchors.ts');
const bossSrc = fs.readFileSync(new URL('../src/game/state/bossState.ts', import.meta.url), 'utf8');
const url = (p) => new URL(`../${p}`, import.meta.url);

const SOLID = new Set(['water', 'tree', 'rock', 'wall', 'lava', 'shop', 'house']);

function reach(from, climb) {
  const seen = new Set([from.x + from.y * wg.WORLD_TILES_W]);
  const q = [[from.x, from.y]];
  while (q.length && seen.size < 400000) {
    const [x, y] = q.pop();
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + ox, ny = y + oy, k = nx + ny * wg.WORLD_TILES_W;
      if (seen.has(k)) continue;
      const t = wg.getWorldTile(nx, ny);
      if (SOLID.has(t) || (t === 'cliff' && !climb)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

describe('cume do vulcao: o mesmo piolet da montanha de neve', () => {
  const foot = wg.VOLCANO_GATE_FOOT, summit = wg.VOLCANO_SUMMIT_TILE, cache = wg.VOLCANO_CHEST_TILE;
  const key = (p) => p.x + p.y * wg.WORLD_TILES_W;
  it('o pe da parede e chao andavel e o cume e cinza (platô)', () => {
    assert.ok(!SOLID.has(wg.getWorldTile(foot.x, foot.y)) && wg.getWorldTile(foot.x, foot.y) !== 'cliff');
    assert.equal(wg.getWorldTile(summit.x, summit.y), 'ash');
    assert.equal(wg.getWorldTile(cache.x, cache.y), 'ash');
  });
  it('sem piolet nao chega ao cume; com piolet chega (a parede e o unico caminho)', () => {
    assert.ok(!reach(foot, false).has(key(summit)), 'sem piolet alcancou o cume');
    assert.ok(!reach(foot, false).has(key(cache)), 'sem piolet alcancou o bau');
    assert.ok(reach(foot, true).has(key(summit)), 'com piolet nao chegou ao cume');
    assert.ok(reach(foot, true).has(key(cache)));
  });
  it('a parede do vulcao e escarpada (cliff) e fica na leste do mapa', () => {
    let n = 0;
    for (let y = 300; y < 330; y++) for (let x = 1838; x < 1862; x++) if (wg.getWorldTile(x, y) === 'cliff') n++;
    assert.ok(n >= 20, `so ${n} tiles de parede`);
    assert.equal(wg.getWorldTile(1845, 314), 'cliff');
  });
  it('a colisao usa o mesmo item (piolet) e vale para qualquer tile cliff', () => {
    const cl = fs.readFileSync(url('src/game/world/cliff.ts'), 'utf8');
    assert.match(cl, /CLIMB_ITEM = 'piolet'/);
    const col = fs.readFileSync(url('src/game/collision/collision.ts'), 'utf8');
    assert.match(col, /type === 'cliff'\) return !canClimbCliff\(\)/);
  });
  it('bandeira e missao do cume existem, exigem o piolet e a coleta existe no mapa', () => {
    assert.ok(ITEMS.volcano_flag, 'item volcano_flag');
    const m = DOGGE_MISSIONS.find((x) => x.id === 'volcano_summit');
    assert.ok(m && m.requires.includes('buy_piolet'));
    const p = WORLD_PICKUPS.find((x) => x.id === 'volcano_summit');
    assert.ok(p && p.x === summit.x && p.y === summit.y && p.itemId === 'volcano_flag' && p.questId === 'volcano_summit');
    assert.deepEqual(m.objective.ids, ['volcano_summit']);
    assert.ok(WORLD_PICKUPS.find((x) => x.id === 'volcano_cache'));
  });
  it('nenhuma criatura nasce no platô do cume', () => {
    for (const [, , x, y] of ENEMY_SPAWNS.map((s) => s)) {
      assert.ok(!(x >= 1846 && x <= 1860 && y >= 298 && y <= 330), `spawn em ${x},${y}`);
    }
  });
  it('nao fechou nada que ja existia: portas do vilarejo do vulcao e o chefe seguem alcancaveis', () => {
    const r = reach(wg.getWorldTile(1840, 330) === 'path' ? { x: 1840, y: 330 } : foot, false);
    const d = wg.BUILDING_DOORS.loja_vulcao;
    assert.ok(r.has(d.x + (d.y + 2) * wg.WORLD_TILES_W), 'porta da loja do vulcao');
  });
});

describe('renomeados: Sahur, Sahur God, Sahur Evil (ids novos: sahur, sahur_god, sahur_evil)', () => {
  it('nomes no VERSUS, chefes e NPCs', () => {
    assert.equal(FIGHTER_NAME.sahur, 'Sahur');
    assert.equal(FIGHTER_NAME.sahur_god, 'Sahur God');
    assert.equal(FIGHTER_NAME.sahur_evil, 'Sahur Evil');
    for (const [id, nome] of [['boss_sahur', 'Sahur'], ['boss_sahur_god', 'Sahur God'], ['boss_sahur_evil', 'Sahur Evil']]) assert.match(bossSrc, new RegExp(`id: '${id}'[^\\n]*name: '${nome}'`));
    const byId = Object.fromEntries([...Object.values(NPCS), ...OUTDOOR_NPCS].map((n) => [n.id, n.name]));
    assert.equal(byId.sahur_npc, 'Sahur'); assert.equal(byId.sahur_god_npc, 'Sahur God'); assert.equal(byId.sahur_evil_npc, 'Sahur Evil');
  });
  it('lutadores em batalha usam o nome novo', () => {
    assert.equal(createFighter('sahur', 0.5).name, 'Sahur');
    assert.equal(createFighter('sahur_god', 0.7).name, 'Sahur God');
    assert.equal(createFighter('sahur_evil', 0.7).name, 'Sahur Evil');
  });
  it('nenhum texto do jogo usa os nomes antigos (Capiroto/Tocao/Serafim/Sahur Evl)', () => {
    for (const f of ['src/game/i18n/stringsUrgente3.ts', 'src/game/story/missionsCassino.ts', 'src/game/story/npcDialogue.ts', 'src/game/story/bossLore.ts', 'src/game/world/npcs.ts', 'src/game/state/rosterState.ts', 'src/game/state/bossState.ts']) {
      const s = fs.readFileSync(url(f), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'));
      for (const l of s) assert.ok(!/Capiroto|Serafim|Toc[aã]o|Sahur Evl|セラフィム|カピロト/.test(l), `${f}: ${l.trim().slice(0, 90)}`);
    }
  });
});

const CHARS = ['orc', 'soldier', 'gadigago', 'dogge', 'sahur'];
const CORE = ['idle', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'dash', 'flash', 'strong', 'ult', 'hurt', 'ko'];

function png(file) {
  const b = fs.readFileSync(url(file));
  assert.equal(b.subarray(1, 4).toString(), 'PNG', file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

describe('sprites novos (assets/sprites-v2): importados das folhas, antigos intactos', () => {
  it('as 5 folhas originais estao guardadas e cada personagem tem os quadros do motor', () => {
    for (const c of CHARS) {
      assert.ok(fs.existsSync(url(`tools/art_src/sheets/${c}.png`)), `folha ${c}`);
      const meta = JSON.parse(fs.readFileSync(url(`assets/sprites-v2/${c}/ORIGEM.json`), 'utf8'));
      for (const p of CORE) assert.ok(meta.poses[p], `${c}/${p}`);
      assert.ok(meta.poses.portrait && meta.poses.cast && meta.poses.orb, c);
      if (c !== 'orc') assert.ok(meta.poses.charge, `${c}/charge (so o orc nao traz aura na folha)`);
    }
  });
  it('proporcao registrada no codigo bate com o tamanho real de cada PNG', () => {
    for (const c of CHARS) for (const [p, asp] of Object.entries(V2.ASPECTS_V2[c])) {
      const [w, h] = png(`assets/sprites-v2/${c}/${p}.png`);
      assert.ok(Math.abs(w / h - asp) < 1e-9, `${c}/${p}`);
    }
  });
  it('quadros do corpo tem todos a mesma altura (a escala nao muda entre poses)', () => {
    for (const c of CHARS) {
      const meta = JSON.parse(fs.readFileSync(url(`assets/sprites-v2/${c}/ORIGEM.json`), 'utf8'));
      const hs = new Set(Object.entries(meta.poses).filter(([, m]) => m.tipo === 'corpo').map(([p]) => png(`assets/sprites-v2/${c}/${p}.png`)[1]));
      assert.equal(hs.size, 1, `${c}: ${[...hs]}`);
    }
  });
  it('os desenhos antigos foram apagados: so existem sprites-v2 e nenhuma chave liga/desliga', () => {
    assert.ok(!fs.existsSync(url('assets/legacy-sprites')));
    assert.ok(!fs.existsSync(url('assets/sprites-v2/ACTIVE.json')));
    for (const c of CHARS) for (const p of ['idle', 'walk1', 'walk2', 'walk3', 'dash', 'flash', 'strong', 'ult']) assert.ok(fs.existsSync(url(`assets/sprites-v2/${c}/${p}.png`)), `${c}/${p}`);
  });
  it('motor: andar 5 passos, hurt/ko/charge com quadro proprio, ultimate na pose de conjurar', () => {
    for (const c of CHARS) {
      assert.deepEqual(S.walkFrames(c), ['walk1', 'walk2', 'walk3', 'walk4', 'walk5']);
      for (const p of ['hurt', 'ko', 'charge', 'cast']) assert.equal(S.resolvePose(c, p), S.hasPose(c, p) ? p : 'idle', `${c}/${p}`);
      assert.ok(S.hasPose(c, 'hurt') && S.hasPose(c, 'ko') && S.hasPose(c, 'cast'), c);
      const f = createFighter(c, S.getLayoutAspect(c));
      f.setState('hurt'); assert.equal(f.currentSpriteKey, 'hurt');
      f.setState('ko'); assert.equal(f.currentSpriteKey, 'ko');
      const g = createFighter(c, S.getLayoutAspect(c)); g.energy = g.maxEnergy; assert.ok(g.startAttack('ultimate'));
      assert.equal(g.currentSpriteKey, 'cast');
    }
  });
  it('a altura em tela de cada lutador nao mudou (layout usa a proporcao do idle ANTIGO)', () => {
    const exp = { orc: 27 / 23, soldier: 21 / 26, gadigago: 237 / 359, dogge: 146 / 164, sahur: 92 / 186 };
    for (const c of CHARS) assert.ok(Math.abs(S.getLayoutAspect(c) - exp[c]) < 1e-9, c);
  });
  it('os 3 dragoes usam a folha nova, com o voo (idle e andar de 3 passos) vindo dos sprites antigos', () => {
    for (const c of ['ice_dragon', 'green_dragon', 'shadow_dragon']) {
      assert.equal(S.walkFrames(c).length, 3, c); // o andar so tem os 3 quadros antigos (walk4/walk5 da folha nova nao entram)
      assert.equal(S.hasPose(c, 'walk4'), false, c);
      assert.equal(S.resolvePose(c, 'cast'), 'cast');
      assert.equal(S.resolvePose(c, 'hurt'), 'hurt');
      assert.equal(S.resolvePose(c, 'ko'), 'ko');
      const o = JSON.parse(fs.readFileSync(new URL(`../assets/sprites-v2/${c}/ORIGEM.json`, import.meta.url), 'utf8'));
      assert.match(o.notas, /sprites ANTIGOS/);
      // o voo antigo (idle/walk1-3) foi ampliado para o MESMO tamanho de canvas dos quadros novos
      for (const p of ['idle', 'walk1', 'walk2', 'walk3', 'guard', 'flash', 'strong', 'dash', 'hurt', 'ko']) assert.equal(o.poses[p].h, o.altura_corpo_px, `${c}/${p}`);
    }
  });
  it('dragoes: a pegada em tela (largura visivel do idle) continua a de antes', () => {
    for (const [c, w] of [['ice_dragon', 250], ['green_dragon', 240], ['shadow_dragon', 400]]) {
      const refH = w / S.getLayoutAspect(c);
      assert.ok(Math.abs(refH * S.SPRITE_ASPECTS[c].idle - w) < 1e-6, c);
    }
  });
  it('orc: a 2a folha traz guard/charge/cast/dash2 e o hurt (da 1a folha) tem a escala do corpo novo', () => {
    const o = JSON.parse(fs.readFileSync(new URL('../assets/sprites-v2/orc/ORIGEM.json', import.meta.url), 'utf8'));
    for (const p of ['guard', 'charge', 'cast', 'dash', 'dash2', 'flash', 'strong', 'hurt', 'ko', 'idle', 'walk1', 'walk5', 'ult', 'face1']) assert.ok(o.poses[p], p);
    assert.equal(o.layout, 'orc2');
    assert.equal(S.resolvePose('orc', 'guard'), 'guard');
    assert.equal(S.resolvePose('orc', 'charge'), 'charge');
  });
});

describe('Dogge e Gadigago com sprites novos: skins, chapeu, capa e arma na mao', () => {
  it('4 skins x quadros do corpo existem em disco e tem o mesmo tamanho do sprite base', () => {
    for (const c of ['dogge', 'gadigago']) for (const sk of ['gelo', 'floresta', 'sombra', 'ouro']) for (const p of ['idle', 'walk1', 'walk5', 'dash', 'flash', 'strong', 'hurt', 'ko', 'charge', 'cast']) {
      assert.deepEqual(png(`assets/skins-v2/${c}/${sk}/${p}.png`), png(`assets/sprites-v2/${c}/${p}.png`), `${c}/${sk}/${p}`);
      assert.ok(W.SKIN_SPRITES_V2[c][sk][p] !== undefined);
    }
  });
  it('ancoras de chapeu/capa e de mao existem para cada quadro e ficam dentro da imagem', () => {
    for (const c of ['dogge', 'gadigago']) for (const p of ['idle', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'dash', 'flash', 'strong', 'hurt', 'cast']) {
      const a = W.COSMETIC_ANCHORS_V2[c][p], h = W.HAND_ANCHORS_V2[c][p];
      assert.ok(a && h, `${c}/${p}`);
      for (const v of [a.hat.x, a.hat.y, a.back.x, h.x, h.y]) assert.ok(v >= 0 && v <= 1, `${c}/${p} ${v}`);
      assert.ok(a.hat.s >= 0.26 && a.hat.s <= 0.46);
      assert.deepEqual(T.getCosmeticAnchors(c, p), a); assert.deepEqual(H.getHandAnchor(c, p), h);
    }
    assert.ok(T.canWearCosmetics('dogge') && T.canWearCosmetics('gadigago') && H.canHoldWeapon('dogge'));
  });
});
