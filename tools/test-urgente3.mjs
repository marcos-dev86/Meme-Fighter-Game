/**
 * Testes da Urgente 3 (cassino gigante, memes estaticos). Logica pura no Node: `node tools/test-urgente3.mjs`
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('./ts-register.cjs');
const wg = require('../src/game/world/worldGen.ts');
const L = require('../src/game/world/casinoLayout.ts');
const { NPCS, OUTDOOR_NPCS } = require('../src/game/world/npcs.ts');
const { CASSINO_MISSIONS } = require('../src/game/story/missionsCassino.ts');
const { STRINGS_URGENTE3 } = require('../src/game/i18n/stringsUrgente3.ts');
const { BUILDING_DOORS } = wg;
const { createFighter } = require('../src/game/battle/Fighter.ts');
const { ROSTER, FIGHTER_NAME } = require('../src/game/state/rosterState.ts');
const { getLayoutAspect, SPRITE_ASPECTS } = require('../src/game/battle/sprites.ts');
const bossSrc = fs.readFileSync(new URL('../src/game/state/bossState.ts', import.meta.url), 'utf8');
const BOSSES = [...bossSrc.matchAll(/\{ id: '(\w+)', island: '(\w+)', name: '([^']+)', character: '(\w+)'[^\n]*?spot: (null|\{ x: (\d+), y: (\d+) \})/g)].map((m) => ({ id: m[1], island: m[2], name: m[3], character: m[4], spot: m[5] === 'null' ? null : { x: +m[6], y: +m[7] } }));

const LANGS = ['pt', 'en', 'es', 'fr', 'ja'];
const SOLID = new Set(['water', 'tree', 'rock', 'wall', 'lava', 'shop', 'house', 'cliff']);

describe('cassino gigante: fora', () => {
  const d = BUILDING_DOORS.loja_misteriosa;
  const house = () => {
    const tiles = [];
    for (let y = 100; y < 260; y++) for (let x = 1000; x < 1260; x++) if (wg.getWorldTile(x, y) === 'house') tiles.push([x, y]);
    return tiles;
  };
  it('footprint gigante 176x66 e porta na base, no centro', () => {
    const tiles = house();
    const xs = tiles.map((t) => t[0]), ys = tiles.map((t) => t[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    assert.equal(x1 - x0 + 1, 176);
    assert.equal(y1 - y0 + 1, 66);
    assert.ok(d.x >= x0 && d.x <= x1 && d.y === y1);
  });
  it('ocupa de 75% a 85% da terra firme da Ilha Misteriosa (retangulo 1040..1215 x 152..236)', () => {
    let land = 0, casa = 0;
    for (let y = 152; y <= 236; y++) for (let x = 1040; x <= 1215; x++) {
      const t = wg.getWorldTile(x, y);
      if (t === 'water') continue;
      land++; if (t === 'house') casa++;
    }
    const pct = (100 * casa) / land;
    assert.ok(pct >= 75 && pct <= 85, `cobertura ${pct.toFixed(1)}%`);
  });
  it('porta e calcada andaveis, caminho da praia ate a porta existe (BFS)', () => {
    for (let dx = -20; dx <= 20; dx++) for (let dy = 1; dy <= 5; dy++) assert.ok(!SOLID.has(wg.getWorldTile(d.x + dx, d.y + dy)), `calcada x${d.x + dx} y${d.y + dy}`);
    const a = wg.REGION_ANCHORS.misteriosa;
    const W = wg.WORLD_TILES_W;
    const seen = new Set([a.x + a.y * W]);
    const q = [[a.x, a.y]];
    let found = false;
    while (q.length) {
      const [x, y] = q.shift();
      if (x === d.x && y === d.y + 1) { found = true; break; }
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + ox, ny = y + oy, k = nx + ny * W;
        if (seen.has(k) || SOLID.has(wg.getWorldTile(nx, ny))) continue;
        seen.add(k); q.push([nx, ny]);
      }
    }
    assert.ok(found);
  });
  it('chefes da ilha (Troll e Misteriosa) ficam em terreno livre 5x5 e afastados da porta', () => {
    for (const id of ['boss_troll', 'boss_misteriosa']) {
      const b = BOSSES.find((x) => x.id === id);
      assert.ok(b && b.spot, id);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) assert.ok(!SOLID.has(wg.getWorldTile(b.spot.x + dx, b.spot.y + dy)), `${id} bloqueado`);
      assert.ok(Math.hypot(b.spot.x - d.x, b.spot.y - d.y) >= 3, `${id} em cima da porta`);
    }
    const t = BOSSES.find((x) => x.id === 'boss_troll').spot, m = BOSSES.find((x) => x.id === 'boss_misteriosa').spot;
    assert.ok(Math.hypot(t.x - m.x, t.y - m.y) >= 6);
  });
  it('nenhum spawn de inimigo a menos de 30 tiles do cassino (zona de paz)', () => {
    const src = fs.readFileSync(new URL('../src/game/enemies/enemySpawns.ts', import.meta.url), 'utf8');
    let n = 0;
    for (const m of src.matchAll(/\['(\w+)', (\d+), (\d+), (\d)\]/g)) {
      const x = +m[2], y = +m[3];
      const dd = Math.hypot(Math.max(1040 - x, 0, x - 1215), Math.max(152 - y, 0, y - 217));
      assert.ok(dd >= 30, `${m[0]} esta a ${dd.toFixed(1)} tiles`); n++;
    }
    assert.ok(n > 50);
  });
});

describe('Troll Face: de fora do cassino, porta obrigatoria', () => {
  it('nenhum Troll Face (NPC ou chefe) dentro do cassino, em nenhum andar', () => {
    for (const f of L.FLOOR_IDS) for (const p of L.CASINO_FLOORS[f].npcs) {
      assert.ok(!/troll/i.test(p.npcId), `${p.npcId} no andar ${f}`);
      assert.notEqual(NPCS[p.npcId].fighterSprite, 'troll_face', `${p.npcId} usa o sprite do Troll Face`);
    }
  });
  it('o chefe fica na calcada, de frente para a porta, e a porta barra ate vencer a luta (sem atalho)', () => {
    const b = BOSSES.find((x) => x.id === 'boss_troll');
    assert.ok(b.spot.y > BUILDING_DOORS.loja_misteriosa.y && Math.abs(b.spot.x - BUILDING_DOORS.loja_misteriosa.x) <= 3);
    assert.ok(!/id: 'boss_troll'[^\n]*(friendly|storyMission)/.test(bossSrc), 'Troll nao pode ser amigavel nem de historia: a luta e obrigatoria');
    const src = fs.readFileSync(new URL('../src/screens/WorldScreen.tsx', import.meta.url), 'utf8');
    assert.ok(/building\?\.id === CASINO_BUILDING_ID && !isBossDefeated\(TROLL_BOSS_ID\)/.test(src));
    assert.ok(src.includes('setBossOffer(BOSS_BY_ID[TROLL_BOSS_ID])'));
  });
});

describe('cassino gigante: 3 andares', () => {
  const FL = L.CASINO_FLOORS;
  const allNpcs = (f) => FL[f].npcs;
  it('tem terreo, mezanino VIP (2o andar) e subsolo (-1)', () => {
    assert.deepEqual(L.FLOOR_IDS, ['ground', 'upper', 'basement']);
    assert.equal(L.CASINO_W, 28); assert.equal(L.CASINO_H, 20);
    assert.equal(L.casinoWallTile(L.CASINO_DOOR.x, L.CASINO_DOOR.y), 'door');
    assert.equal(L.casinoWallTile(L.CASINO_DOOR.x, L.CASINO_DOOR.y, 'upper'), 'wall');
  });
  for (const f of ['ground', 'upper', 'basement']) {
    describe(`andar ${f}`, () => {
      const solid = L.casinoSolidTiles(f);
      const npcTiles = new Set(allNpcs(f).map((p) => `${p.x},${p.y}`));
      it('pecas dentro da sala e sem sobreposicao', () => {
        const occ = new Set();
        for (const p of FL[f].pieces) {
          assert.ok(p.x >= 1 && p.y >= 1 && p.x + p.w <= L.CASINO_W - 1 && p.y + p.h <= L.CASINO_H - 1, JSON.stringify(p));
          for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) {
            const k = `${x},${y}`; assert.ok(!occ.has(k), `sobreposicao em ${k}`); occ.add(k);
          }
        }
      });
      it('NPCs: definidos, nenhum hostil, tiles livres e sem repeticao de tile', () => {
        assert.equal(npcTiles.size, allNpcs(f).length);
        for (const p of allNpcs(f)) {
          const n = NPCS[p.npcId];
          assert.ok(n, `NPC ${p.npcId} nao existe`);
          assert.notEqual(n.kind, 'enemy');
          assert.ok(!solid.has(`${p.x},${p.y}`), `${p.npcId} em cima de movel`);
          assert.equal(L.casinoWallTile(p.x, p.y, f), 'floor');
        }
      });
      it('inicio, escadas, bau e estacoes sao alcancaveis; todo NPC tem vizinho alcancavel', () => {
        const blocked = (x, y) => L.casinoWallTile(x, y, f) !== 'floor' || solid.has(`${x},${y}`) || npcTiles.has(`${x},${y}`);
        const st = FL[f].start;
        assert.ok(!blocked(st.x, st.y), 'inicio bloqueado');
        const seen = new Set([`${st.x},${st.y}`]);
        const q = [[st.x, st.y]];
        while (q.length) {
          const [x, y] = q.shift();
          for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + ox, ny = y + oy;
            if (seen.has(`${nx},${ny}`) || blocked(nx, ny)) continue;
            seen.add(`${nx},${ny}`); q.push([nx, ny]);
          }
        }
        const near = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => seen.has(`${x + ox},${y + oy}`));
        for (const p of allNpcs(f)) assert.ok(near(p.x, p.y), `${p.npcId} (${p.x},${p.y}) inalcancavel`);
        for (const s of FL[f].stairs) { assert.ok(!solid.has(`${s.x},${s.y}`) && !npcTiles.has(`${s.x},${s.y}`), `escada em obstaculo ${s.x},${s.y}`); assert.ok(near(s.x, s.y), `escada ${s.x},${s.y} inalcancavel`); }
        if (FL[f].chest) { const c = FL[f].chest; assert.ok(!solid.has(`${c.x},${c.y}`) && !npcTiles.has(`${c.x},${c.y}`)); assert.ok(near(c.x, c.y), 'bau inalcancavel'); }
        for (const s of FL[f].stations) {
          const ok = [...seen].some((k) => { const [x, y] = k.split(',').map(Number); return Math.hypot(x + 0.5 - s.cx, y + 0.5 - s.cy) < 2.1; });
          assert.ok(ok, `estacao ${s.id} inalcancavel`);
        }
      });
    });
  }
  it('muitos NPCs: >=26 no terreo, >=20 no mezanino, >=8 no subsolo; mesas e maquinas em varios jogos', () => {
    assert.ok(FL.ground.npcs.length >= 26 && FL.upper.npcs.length >= 20 && FL.basement.npcs.length >= 8);
    const games = new Set([...FL.ground.stations, ...FL.upper.stations].map((s) => s.game));
    assert.deepEqual([...games].sort(), ['cards', 'dice', 'flip', 'roulette', 'slots']);
    const strings = STRINGS_URGENTE3.pt;
    for (const f of L.FLOOR_IDS) for (const s of FL[f].stations) assert.ok(strings[s.labelKey], s.labelKey);
    assert.ok(FL.ground.stations.length + FL.upper.stations.length + FL.basement.stations.length >= 35);
  });
  it('escadas ligam os andares nos dois sentidos; a do subsolo e escondida ate a bandeira', () => {
    const to = (f, t) => FL[f].stairs.filter((s) => s.to === t);
    assert.equal(to('ground', 'upper').length, 1); assert.equal(to('upper', 'ground').length, 1);
    assert.equal(to('ground', 'basement').length, 1); assert.equal(to('basement', 'ground').length, 1);
    assert.ok(to('ground', 'basement')[0].hidden);
    assert.ok(!to('ground', 'upper')[0].hidden);
    assert.equal(L.CASINO_CELLAR_FLAG, 'cassino_porao');
  });
  it('baus: um no mezanino e um no subsolo, com ids registrados em BUILDING_CONTENT', () => {
    assert.equal(FL.upper.chest.id, 'chest_cassino_mezanino');
    assert.equal(FL.basement.chest.id, 'chest_cassino_cofre');
    const src = fs.readFileSync(new URL('../src/game/world/buildingContent.ts', import.meta.url), 'utf8');
    assert.ok(src.includes('chest_cassino_mezanino') && src.includes('chest_cassino_cofre'));
  });
  it('nenhum NPC do cassino e hostil e todos sao conhecidos pelo mapa de missoes', () => {
    assert.ok(L.CASINO_NPC_IDS.size >= 40);
    for (const id of L.CASINO_NPC_IDS) assert.notEqual(NPCS[id].kind, 'enemy');
  });
});

describe('memes estaticos', () => {
  const MEMES = ['azulao', 'vermelhao', 'rei_dourado', 'corvao', 'gato_arco_iris', 'gato_bocao', 'shiba_manso', 'bebe_risonho', 'seis_sete'];
  const insideCount = (id) => L.FLOOR_IDS.reduce((n, f) => n + L.CASINO_FLOORS[f].npcs.filter((p) => p.npcId === id).length, 0);
  it('9 memes com arte, sem animacao (portrait), kind meme', () => {
    for (const id of MEMES) {
      assert.ok(NPCS[id], id); assert.equal(NPCS[id].kind, 'meme');
      assert.ok(NPCS[id].portraitSprite !== undefined && NPCS[id].portraitAspect > 0);
      assert.ok(NPCS[id].dialogue.length >= 2);
      assert.ok(fs.existsSync(new URL(`../assets/npcs/meme_${id}.png`, import.meta.url)), id);
    }
  });
  it('cada meme aparece exatamente 3 vezes no jogo (cassino + mapa), nunca mais que 3', () => {
    for (const id of MEMES) {
      const outs = OUTDOOR_NPCS.filter((p) => p.npcId === id);
      assert.equal(insideCount(id) + outs.length, 3, `${id}: ${insideCount(id)} dentro + ${outs.length} fora`);
      assert.ok(outs.length >= 1, `${id} nao aparece fora`);
    }
  });
  it('lugares de fora: terreno livre 5x5, alcancavel, longe de chefes/portas/outros NPCs, e em varias ilhas', () => {
    const W = wg.WORLD_TILES_W, H = wg.WORLD_TILES_H;
    const A = wg.REGION_ANCHORS;
    const bfs = (a) => { const seen = new Set([a.x + a.y * W]); const q = [[a.x, a.y]]; while (q.length) { const [x, y] = q.shift(); for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + ox, ny = y + oy, k = nx + ny * W; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k) || SOLID.has(wg.getWorldTile(nx, ny))) continue; seen.add(k); q.push([nx, ny]); } } return seen; };
    const reach = Object.values(A).map(bfs);
    const outs = OUTDOOR_NPCS.filter((p) => MEMES.includes(p.npcId));
    assert.equal(outs.length, MEMES.map((id) => OUTDOOR_NPCS.filter((p) => p.npcId === id).length).reduce((a, b) => a + b, 0));
    for (const o of outs) {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) assert.ok(!SOLID.has(wg.getWorldTile(o.x + dx, o.y + dy)), `${o.npcId} (${o.x},${o.y}) em terreno bloqueado`);
      assert.ok(reach.some((r) => r.has(o.x + o.y * W)), `${o.npcId} (${o.x},${o.y}) inalcancavel`);
      for (const b of BOSSES) if (b.spot) assert.ok(Math.hypot(b.spot.x - o.x, b.spot.y - o.y) >= 6, `${o.npcId} perto do chefe ${b.id}`);
      for (const dd of Object.values(BUILDING_DOORS)) assert.ok(Math.hypot(dd.x - o.x, dd.y - o.y) >= 6, `${o.npcId} perto de porta`);
      for (const p of OUTDOOR_NPCS) if (p !== o) assert.ok(Math.hypot(p.x - o.x, p.y - o.y) >= 4, `${o.npcId} colado em ${p.npcId}`);
    }
    // espalhados: nenhum meme com 2 lugares a menos de 40 tiles um do outro
    for (const id of MEMES) { const m = outs.filter((p) => p.npcId === id); for (let a = 0; a < m.length; a++) for (let b = a + 1; b < m.length; b++) assert.ok(Math.hypot(m[a].x - m[b].x, m[a].y - m[b].y) >= 40, `${id} repetido muito perto`); }
  });
});

describe('missoes do cassino', () => {
  const all = [...CASSINO_MISSIONS];
  it('ids unicos e que ainda nao existem nas outras missoes', () => {
    const src = fs.readFileSync(new URL('../src/game/story/missionsDogge.ts', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/game/story/missionsStory.ts', import.meta.url), 'utf8');
    for (const m of all) assert.ok(!new RegExp(`id: '${m.id}'`).test(src), m.id);
    assert.equal(new Set(all.map((m) => m.id)).size, all.length);
  });
  it('todo NPC das missoes existe e mora no cassino ou fora, requires apontam para ids reais', () => {
    const ids = new Set(all.map((m) => m.id));
    for (const m of all) {
      for (const r of m.requires ?? []) assert.ok(ids.has(r) || r === 'casino_lucky', r);
      for (const st of m.objective.steps ?? []) if (st.kind === 'talk') {
        assert.ok(NPCS[st.npcId], st.npcId);
        assert.ok(L.CASINO_NPC_IDS.has(st.npcId), `${st.npcId} nao esta no cassino`);
      }
    }
    assert.ok(all.length >= 4);
  });
});

describe('cenarios de batalha (um por lugar)', () => {
  const { STAGE_DEFS, STAGE_KEYS, STAGE_FEET } = require('../src/game/battle/stages.ts');
  const { stageForTile } = require('../src/game/battle/battleContext.ts');
  const artSrc = fs.readFileSync(new URL('../src/game/menu/art.ts', import.meta.url), 'utf8');
  it('12 cenarios, chaves unicas, arte existe (webp) e esta registrada, pes no chao 560..690', () => {
    assert.equal(STAGE_DEFS.length, 12);
    assert.equal(new Set(STAGE_KEYS).size, 12);
    STAGE_DEFS.forEach((d, i) => {
      assert.equal(d.key, `stage_${i + 1}`);
      assert.ok(fs.statSync(new URL(`../assets/legacy-art/stages/stage${i + 1}.webp`, import.meta.url)).size > 2000, d.key);
      assert.ok(artSrc.includes(`stage_${i + 1}: require('../../../assets/legacy-art/stages/stage${i + 1}.webp')`), d.key);
      assert.ok(STAGE_FEET[d.key] >= 560 && STAGE_FEET[d.key] <= 690);
    });
  });
  it('cenarios ao ar livre tem 3 versoes (dia, entardecer, noite); caverna e cassino so uma', () => {
    const { stageVariantForLight, hasStageVariants } = require('../src/game/battle/stages.ts');
    for (const d of STAGE_DEFS) {
      const n = d.key.split('_')[1];
      const closed = d.key === 'stage_8' || d.key === 'stage_12';
      assert.equal(hasStageVariants(d.key), !closed, d.key);
      for (const v of ['dusk', 'night']) {
        const f = new URL(`../assets/legacy-art/stages/stage${n}_${v}.webp`, import.meta.url);
        assert.equal(fs.existsSync(f), !closed, `${d.key} ${v}`);
        if (!closed) assert.ok(artSrc.includes(`stage{n}_${v}.webp`.replace('{n}', n)), `${d.key} ${v} no art.ts`);
      }
    }
    assert.equal(stageVariantForLight(1), 'day'); assert.equal(stageVariantForLight(0.9), 'day');
    assert.equal(stageVariantForLight(0.6), 'dusk'); assert.equal(stageVariantForLight(0.2), 'night'); assert.equal(stageVariantForLight(0), 'night');
  });
  it('nomes do cenario existem nos 5 idiomas', () => {
    for (const l of LANGS) for (const d of STAGE_DEFS) assert.ok(STRINGS_URGENTE3[l][d.nameKey], `${l} ${d.nameKey}`);
  });
  it('cada lugar escolhe o seu cenario', () => {
    const cases = [['gelo', 326, 1059, 'stage_5'], ['vulcao', 1905, 345, 'stage_4'], ['trevas', 119, 244, 'stage_6'], ['misteriosa', 1128, 221, 'stage_8'], ['misteriosa', 1190, 320, 'stage_7'],
      ['fragments', 1690, 1040, 'stage_9'], ['camp', 400, 1260, 'stage_10'], ['dogisland', 1189, 1339, 'stage_11'], ['main', 1522, 896, 'stage_3'], ['main', 675, 996, 'stage_5'], ['main', 990, 840, 'stage_1']];
    for (const [isl, x, y, want] of cases) assert.equal(stageForTile(x, y, isl), want, `${isl} ${x},${y}`);
    assert.equal(stageForTile(1128, 221, null), stageForTile(1128, 221, undefined));
  });
  it('chefes de ilhas especiais usam o cenario do lugar e o resto do jogo so usa chaves validas', () => {
    const src = fs.readFileSync(new URL('../src/game/state/bossState.ts', import.meta.url), 'utf8');
    for (const m of src.matchAll(/stageKey: '(\w+)'/g)) assert.ok(STAGE_KEYS.includes(m[1]), m[1]);
    for (const [id, st] of [['boss_gelo', 'stage_5'], ['boss_vulcao', 'stage_4'], ['boss_trevas', 'stage_6'], ['boss_troll', 'stage_8'], ['boss_dogisland', 'stage_11'], ['boss_camp', 'stage_10']]) assert.ok(new RegExp(`id: '${id}'[^\\n]*stageKey: '${st}'`).test(src), id);
  });
});

describe('i18n do cassino', () => {
  it('mesmas chaves nos 5 idiomas', () => {
    const base = Object.keys(STRINGS_URGENTE3.pt).sort();
    for (const l of LANGS) assert.deepEqual(Object.keys(STRINGS_URGENTE3[l]).sort(), base, l);
  });
});

describe('os 3 troncos: Tocao, Serafim, Capiroto', () => {
  const KEYS = ['tocao', 'serafim', 'capiroto'];
  it('lutadores distintos (nao sao skins): stats e imunidades proprias', () => {
    const f = Object.fromEntries(KEYS.map((k) => [k, createFighter(k, getLayoutAspect(k))]));
    const sig = KEYS.map((k) => JSON.stringify([f[k].maxHealth, f[k].speed, f[k].strongDamage, f[k].flashDamage, f[k].ultimateDamage, f[k].immune, f[k].onHitStatus.map((s) => s.kind + s.on.join())]));
    assert.equal(new Set(sig).size, 3);
    assert.deepEqual(f.tocao.immune, ['poison']); assert.deepEqual(f.serafim.immune, ['freeze']); assert.deepEqual(f.capiroto.immune, ['burn']);
    for (const k of KEYS) assert.ok(f[k].getReferenceHeight() > 200 && f[k].getReferenceHeight() < 270, `${k} altura ${f[k].getReferenceHeight()}`);
  });
  it('andar usa 4 quadros distintos; os outros lutadores seguem com 3; poses de ataque trocam o quadro', () => {
    for (const k of KEYS) {
      const f = createFighter(k, getLayoutAspect(k));
      f.setState('walk');
      const seen = new Set();
      for (let i = 0; i < 12; i++) { seen.add(f.currentSpriteKey); f.update(130, 1); }
      assert.deepEqual([...seen].sort(), ['walk1', 'walk2', 'walk3', 'walk4'], k);
      for (const st of ['dash', 'flash', 'strong']) { f.setState(st); assert.equal(f.currentSpriteKey, st); }
    }
    const d = createFighter('dogge', getLayoutAspect('dogge')); d.setState('walk');
    const seen = new Set(); for (let i = 0; i < 12; i++) { seen.add(d.currentSpriteKey); d.update(130, 1); }
    assert.deepEqual([...seen].sort(), ['walk1', 'walk2', 'walk3']);
  });
  it('9 poses existem em disco e as proporcoes batem com as imagens', () => {
    for (const k of KEYS) {
      assert.deepEqual(Object.keys(SPRITE_ASPECTS[k]).sort(), ['dash', 'flash', 'idle', 'strong', 'ult', 'walk1', 'walk2', 'walk3', 'walk4']);
      for (const p of Object.keys(SPRITE_ASPECTS[k])) assert.ok(fs.existsSync(new URL(`../assets/legacy-sprites/${k}/${p}.png`, import.meta.url)), `${k}/${p}`);
      assert.ok(getLayoutAspect(k) > 0);
    }
  });
  it('no VERSUS (roster) com desbloqueio por chefe proprio e nome', () => {
    for (const k of KEYS) {
      const r = ROSTER.find((x) => x.key === k);
      assert.ok(r && r.unlock.kind === 'boss' && BOSSES.some((b) => b.id === r.unlock.bossId && b.character === k), k);
      assert.ok(FIGHTER_NAME[k]);
    }
  });
  it('cada um tem chefe no mapa, em terreno livre 5x5, longe de outros chefes/NPCs, e vira morador depois', () => {
    const spots = BOSSES.filter((b) => b.spot);
    for (const k of KEYS) {
      const b = BOSSES.find((x) => x.character === k);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) assert.ok(!SOLID.has(wg.getWorldTile(b.spot.x + dx, b.spot.y + dy)), `${k} bloqueado`);
      for (const o of spots) if (o.id !== b.id) assert.ok(Math.hypot(o.spot.x - b.spot.x, o.spot.y - b.spot.y) >= 6, `${k} perto de ${o.id}`);
      const npc = OUTDOOR_NPCS.find((p) => p.npcId === `${k}_npc`);
      assert.ok(npc && npc.after === b.id, `${k}_npc depois do chefe`);
      assert.ok(!SOLID.has(wg.getWorldTile(npc.x, npc.y)));
      assert.ok(NPCS[`${k}_npc`].fighterSprite === k);
    }
  });
  it('falas de historia nos 5 idiomas (4 por personagem)', () => {
    for (const l of LANGS) for (const k of KEYS) for (let i = 1; i <= 4; i++) assert.ok(STRINGS_URGENTE3[l][`tronco_${k}_${i}`], `${l} ${k} ${i}`);
  });
  it('missoes dos troncos existem e encadeiam (ids unicos)', () => {
    const { TRONCOS_MISSIONS } = require('../src/game/story/missionsCassino.ts');
    assert.equal(TRONCOS_MISSIONS.length, 3);
    assert.deepEqual(TRONCOS_MISSIONS.map((m) => m.objective.steps[0].npcId), ['tocao_npc', 'serafim_npc', 'capiroto_npc']);
  });
  it('corvao nao esta em cima do chefe das trevas', () => {
    const c = OUTDOOR_NPCS.find((p) => p.npcId === 'corvao');
    for (const b of BOSSES.filter((x) => x.spot)) assert.ok(Math.hypot(b.spot.x - c.x, b.spot.y - c.y) >= 6, b.id);
  });
});
