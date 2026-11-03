/**
 * Testes da Urgente 2 (Troll Face e Cara Tranquilo no jogo). Logica pura no Node: `node tools/test-urgente2.mjs`
 * (usa tools/ts-register.cjs). O que depende de tela fica em tools/e2e-urgente1.mjs (lutadores) e na checagem manual no celular.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('./ts-register.cjs');
const wg = require('../src/game/world/worldGen.ts');
const { createFighter } = require('../src/game/battle/Fighter.ts');
const { ROSTER, FIGHTER_NAME } = require('../src/game/state/rosterState.ts');
const { getLayoutAspect, SPRITE_ASPECTS } = require('../src/game/battle/sprites.ts');
const { STRINGS_URGENTE2 } = require('../src/game/i18n/stringsUrgente2.ts');
const { NPCS, OUTDOOR_NPCS } = require('../src/game/world/npcs.ts');

const LANGS = ['pt', 'en', 'es', 'fr', 'ja'];
const SOLID = new Set(['water', 'tree', 'rock', 'wall', 'lava', 'shop', 'house', 'cliff']);
const walkable3x3 = (x, y) => {
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (SOLID.has(wg.getWorldTile(x + ox, y + oy))) return false;
  return true;
};
const bossSrc = fs.readFileSync(new URL('../src/game/state/bossState.ts', import.meta.url), 'utf8');
const BOSSES = [...bossSrc.matchAll(/\{ id: '(\w+)', island: '(\w+)', name: '([^']+)', character: '(\w+)'[^\n]*?spot: (null|\{ x: (\d+), y: (\d+) \})/g)].map((m) => ({
  id: m[1], island: m[2], name: m[3], character: m[4], spot: m[5] === 'null' ? null : { x: +m[6], y: +m[7] },
}));
const boss = (id) => BOSSES.find((b) => b.id === id);

describe('lutadores', () => {
  it('stats e altura de referencia', () => {
    const t = createFighter('troll_face', 170 / 337);
    const c = createFighter('cara_tranquilo', 134 / 235);
    assert.equal(t.characterKey, 'troll_face');
    assert.equal(c.characterKey, 'cara_tranquilo');
    assert.ok(Math.abs(t.getReferenceHeight() - 214) < 3, `troll ${t.getReferenceHeight()}`);
    assert.ok(Math.abs(c.getReferenceHeight() - 207) < 3, `chill ${c.getReferenceHeight()}`);
    assert.ok(t.speed > c.speed && t.maxHealth < c.maxHealth, 'troll mais rapido e fragil; cara tranquilo mais resistente');
    assert.ok(c.immune.includes('stun'));
    for (const f of [t, c]) {
      assert.equal(f.health, f.maxHealth);
      assert.ok(f.flashDamage > 0 && f.strongDamage > f.flashDamage && f.ultimateDamage > f.strongDamage);
    }
  });
  it('tabelas de sprites cobrem os dois', () => {
    for (const k of ['troll_face', 'cara_tranquilo']) {
      assert.deepEqual(Object.keys(SPRITE_ASPECTS[k]).sort(), ['dash', 'flash', 'idle', 'strong', 'ult', 'walk1', 'walk2', 'walk3']);
      assert.equal(getLayoutAspect(k), SPRITE_ASPECTS[k].idle);
    }
  });
});

describe('elenco e chefes', () => {
  it('Versus: os dois estao no elenco, desbloqueados por chefes que existem', () => {
    for (const [key, bossId] of [['troll_face', 'boss_troll'], ['cara_tranquilo', 'boss_chill']]) {
      const e = ROSTER.find((r) => r.key === key);
      assert.ok(e, key);
      assert.deepEqual(e.unlock, { kind: 'boss', bossId });
      assert.ok(boss(bossId), `chefe ${bossId} nao existe`);
      assert.equal(boss(bossId).character, key);
      assert.ok(FIGHTER_NAME[key]);
    }
    assert.equal(new Set(ROSTER.map((r) => r.key)).size, ROSTER.length, 'sem duplicados');
  });
  it('Troll Face fica na trilha em frente a porta do cassino (so caminho de entrada)', () => {
    const door = wg.BUILDING_DOORS.loja_misteriosa;
    const b = boss('boss_troll');
    assert.equal(b.island, 'misteriosa');
    assert.ok(Math.abs(b.spot.x - door.x) <= 1 && b.spot.y > door.y && b.spot.y - door.y <= 10, `spot ${JSON.stringify(b.spot)} porta ${JSON.stringify(door)}`);
    assert.equal(wg.getWorldTile(b.spot.x, b.spot.y), 'path');
  });
  it('todo marcador de chefe novo esta em chao andavel', () => {
    for (const id of ['boss_troll', 'boss_chill', 'boss_chill_2']) assert.ok(walkable3x3(boss(id).spot.x, boss(id).spot.y), id);
  });
  it('o aviso da porta usa o mesmo id de cassino e chefe do codigo', () => {
    const w = fs.readFileSync(new URL('../src/screens/WorldScreen.tsx', import.meta.url), 'utf8');
    assert.match(w, /CASINO_BUILDING_ID = 'loja_misteriosa'/);
    assert.match(w, /TROLL_BOSS_ID = 'boss_troll'/);
    assert.ok(wg.BUILDING_DOORS.loja_misteriosa);
  });
});

describe('NPCs', () => {
  const placed = (id) => OUTDOOR_NPCS.filter((p) => p.npcId === id);
  it('existem, usam o sprite do lutador e estao em chao andavel', () => {
    assert.equal(NPCS.troll_trapaceiro.fighterSprite, 'troll_face');
    assert.equal(NPCS.cara_tranquilo.fighterSprite, 'cara_tranquilo');
    assert.ok(placed('troll_trapaceiro').length >= 3 && placed('cara_tranquilo').length >= 6);
    for (const p of [...placed('troll_trapaceiro'), ...placed('cara_tranquilo')]) assert.ok(walkable3x3(p.x, p.y), `${p.npcId} ${p.x},${p.y}`);
  });
  it('Troll Face perto de cais (3 a 6 tiles de um barqueiro); nenhum NPC novo colado em barqueiro', () => {
    const men = Object.values(wg.FERRY_DOCKS).map((d) => d.ferryman);
    const dist = (p, m) => Math.hypot(p.x - m.x, p.y - m.y);
    for (const p of placed('troll_trapaceiro')) {
      const d = Math.min(...men.map((m) => dist(p, m)));
      assert.ok(d >= 3 && d <= 6, `troll ${p.x},${p.y} a ${d.toFixed(1)} tiles do barqueiro`);
    }
    for (const p of placed('cara_tranquilo')) assert.ok(Math.min(...men.map((m) => dist(p, m))) >= 3, `chill ${p.x},${p.y} colado em barqueiro`);
  });
  it('nenhum NPC novo em cima de outro NPC (menos de 2 tiles)', () => {
    const news = [...placed('troll_trapaceiro'), ...placed('cara_tranquilo')];
    for (const n of news) for (const o of OUTDOOR_NPCS) {
      if (o === n) continue;
      assert.ok(Math.hypot(n.x - o.x, n.y - o.y) >= 2, `${n.npcId} ${n.x},${n.y} sobre ${o.npcId}`);
    }
  });
});

describe('textos nos 5 idiomas', () => {
  const keys = Object.keys(STRINGS_URGENTE2.pt);
  it('todas as chaves existem em todos os idiomas, sem vazio nem {} sobrando', () => {
    for (const l of LANGS) {
      assert.deepEqual(Object.keys(STRINGS_URGENTE2[l]).sort(), [...keys].sort(), l);
      for (const k of keys) {
        const s = STRINGS_URGENTE2[l][k];
        assert.ok(s && s.trim().length > 4, `${l}.${k} vazio`);
        assert.ok(!/[{}]/.test(s), `${l}.${k} tem chave sobrando`);
      }
    }
  });
  it('as 8 dicas, 3 cumprimentos e as 3 pegadinhas do Troll estao completos', () => {
    for (let i = 1; i <= 8; i++) assert.ok(STRINGS_URGENTE2.pt[`chill_tip_${i}`], `tip ${i}`);
    for (let i = 1; i <= 3; i++) assert.ok(STRINGS_URGENTE2.pt[`chill_hi_${i}`]);
    for (const g of 'abc') for (let i = 1; i <= 3; i++) assert.ok(STRINGS_URGENTE2.pt[`troll_${g}${i}`]);
    assert.ok(STRINGS_URGENTE2.pt.troll_won1 && STRINGS_URGENTE2.pt.casino_troll_blocked);
    const src = fs.readFileSync(new URL('../src/game/story/npcDialogue.ts', import.meta.url), 'utf8');
    assert.match(src, /CHILL_TIP_COUNT = 8/);
    assert.match(src, /CHILL_GREETING_COUNT = 3/);
  });
  it('os textos novos nao usam emoji', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for (const l of LANGS) for (const k of keys) assert.ok(!emoji.test(STRINGS_URGENTE2[l][k]), `${l}.${k}`);
  });
});
