/**
 * Testes da rodada "renomeacao + vida persistente + armaduras + NPCs animados".
 * Logica pura no Node: `node tools/test-parte3.mjs`
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('./ts-register.cjs');
const L = require('../src/game/state/legacyIds.ts');
const H = require('../src/game/state/healthState.ts');
const E = require('../src/game/state/saveExt.ts');
const A = require('../src/game/items/armorDefs.ts');
const { ITEMS } = require('../src/game/items/itemDefs.ts');
const { createFighter } = require('../src/game/battle/Fighter.ts');
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const walk = (dir, out = []) => {
  for (const f of fs.readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) {
    const p = `${dir}/${f.name}`;
    if (f.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

describe('renomeacao: ids novos, saves antigos migram', () => {
  it('migra ids antigos dentro de um save inteiro', () => {
    const old = JSON.stringify({
      version: 3,
      playerState: { collected: ['chest_tocao', 'x'] },
      quest: { quests: { tronco_tocao: 'completed', tronco_serafim: 'active', tronco_capiroto: 'available' } },
      ext: { bosses: { defeated: ['boss_tocao', 'boss_serafim', 'boss_capiroto', 'boss_gelo'] }, revanche: { losses: { 'boss:boss_capiroto': 2 } } },
      flags: { talked: 'capiroto_npc' },
    });
    const migrated = JSON.parse(L.migrateLegacyIds(old));
    assert.deepEqual(migrated.ext.bosses.defeated, ['boss_sahur', 'boss_sahur_god', 'boss_sahur_evil', 'boss_gelo']);
    assert.equal(migrated.ext.revanche.losses['boss:boss_sahur_evil'], 2);
    assert.equal(migrated.quest.quests.tronco_sahur, 'completed');
    assert.equal(migrated.quest.quests.tronco_sahur_god, 'active');
    assert.equal(migrated.flags.talked, 'sahur_evil_npc');
    assert.ok(!/tocao|serafim|capiroto/.test(JSON.stringify(migrated)));
  });
  it('save novo nao muda (idempotente)', () => {
    const s = JSON.stringify({ a: 'boss_sahur_evil', b: ['sahur', 'sahur_god'] });
    assert.equal(L.migrateLegacyIds(s), s);
    assert.equal(L.migrateLegacyIds(L.migrateLegacyIds('tocao')), 'sahur');
  });
  it('saveState, rosterState e profileState passam pela migracao', () => {
    for (const f of ['saveState', 'rosterState', 'profileState']) assert.match(read(`src/game/state/${f}.ts`), /migrateLegacyIds\(/, f);
  });
  it('nenhum arquivo do projeto ainda usa os nomes/ids antigos (fora de legacyIds e dos testes de migracao)', () => {
    const bad = [];
    for (const dir of ['src', 'tools', 'docs', 'assets/sprites-v2']) {
      for (const p of walk(dir)) {
        if (/\.(png|jpg|mp3|wav|ogg|mp4|woff2?)$/i.test(p)) { if (/tocao|serafim|capiroto/i.test(p)) bad.push(p); continue; }
        if (/legacyIds\.ts$|docs\/AUDIT\.md$|test-parte3\.mjs$|test-parte2\.mjs$|test-saves\.mjs$/.test(p)) continue;
        const txt = read(p);
        if (/tocao|serafim|capiroto|Sahur Evl/i.test(txt) || /Toc[ãa]o/.test(txt)) bad.push(p);
        if (/tocao|serafim|capiroto/i.test(p)) bad.push(p);
      }
    }
    assert.deepEqual(bad, []);
  });
  it('pastas dos sprites com os ids novos', () => {
    for (const k of ['sahur', 'sahur_god', 'sahur_evil']) assert.ok(fs.existsSync(new URL(`../assets/sprites-v2/${k}/idle.png`, import.meta.url)), k);
    assert.ok(fs.existsSync(new URL('../assets/sprites-v2/sahur/idle.png', import.meta.url)));
    assert.ok(fs.existsSync(new URL('../tools/art_src/sheets/sahur.png', import.meta.url)));
  });
  it('"Sahur Evil" (nao "Evl") em todo texto do jogo', () => {
    assert.match(read('src/game/battle/Fighter.ts'), /new Fighter\('Sahur Evil', 'sahur_evil'\)/);
    assert.match(read('src/game/state/rosterState.ts'), /sahur_evil: 'Sahur Evil'/);
  });
});

describe('vida persistente (mundo <-> luta de historia)', () => {
  it('piso de derrota e regras por tipo de luta', () => {
    assert.equal(H.storyHpAfterFight(0), H.DEFEAT_FLOOR);
    assert.equal(H.storyHpAfterFight(-3), H.DEFEAT_FLOOR);
    assert.equal(H.storyHpAfterFight(0.5), 0.5);
    assert.ok(H.storyHpAfterFight(0.0001) >= 0.01);
    assert.equal(H.storyHpAfterFight(7), 1);
    for (const k of ['quest', 'boss', 'rival']) assert.ok(H.usesStoryHp(k), k);
    for (const k of ['free', 'tower', 'versus']) assert.ok(!H.usesStoryHp(k), k);
  });
  it('50% no mundo => luta comeca com 50%; sai da luta com X => mundo volta com X', () => {
    H.setStoryHp(0.5);
    const entra = H.getStoryHp();
    assert.equal(entra, 0.5);
    // a luta grava a vida final quadro a quadro
    H.setStoryHp(H.storyHpAfterFight(0.18));
    assert.equal(H.getStoryHp(), 0.18);
    // perdeu: volta com o piso, nunca com 0
    H.setStoryHp(H.storyHpAfterFight(0));
    assert.equal(H.getStoryHp(), H.DEFEAT_FLOOR);
  });
  it('vai e volta no save (ext storyHp); save antigo sem o campo comeca cheio; lixo e limitado', () => {
    H.setStoryHp(0.37);
    const snap = E.snapshotExts();
    assert.deepEqual(snap.storyHp, { hp: 0.37 });
    H.setStoryHp(1);
    E.restoreExts(snap);
    assert.equal(H.getStoryHp(), 0.37);
    E.restoreExts({});
    assert.equal(H.getStoryHp(), 1);
    E.restoreExts({ storyHp: { hp: -5 } });
    assert.ok(H.getStoryHp() >= 0.01);
    E.restoreExts({ storyHp: { hp: 'x' } });
    assert.equal(H.getStoryHp(), 1);
    E.resetExts();
    assert.equal(H.getStoryHp(), 1);
  });
  it('BattleScreen: so quest/boss/rival levam a vida; grava a cada quadro; round seguinte nao enche a vida', () => {
    const b = read('src/screens/BattleScreen.tsx');
    assert.match(b, /const carryStoryHp = usesStoryHp\(setup\.kind\)/);
    assert.match(b, /if \(carryStoryHp\) setStoryHp\(storyHpAfterFight\(p1\.health \/ p1\.maxHealth\)\)/);
    assert.equal((b.match(/if \(carryStoryHp\) p1\.health = Math\.max\(1, getStoryHp\(\) \* p1\.maxHealth\)/g) ?? []).length, 2, 'entrada + inicio de cada round');
  });
  it('WorldScreen: le ao ganhar foco, grava a cada quadro, desmaio acorda com metade', () => {
    const w = read('src/screens/WorldScreen.tsx');
    assert.match(w, /setStoryHp\(fighter\.health \/ fighter\.maxHealth\)/);
    assert.match(w, /fighter\.health = Math\.max\(1, getStoryHp\(\) \* fighter\.maxHealth\)/);
    assert.match(w, /wakeAt\(checkpointPos\(\), FAINT_HP\)/); // rodada 3: derrota aceita acorda no checkpoint com metade da vida
    assert.match(w, /hpFrac \* fighter\.maxHealth/);
    assert.match(w, /!worldFocused \|\|/);
    assert.equal(H.FAINT_HP, 0.5);
  });
});

describe('armaduras (regeneram vida no mundo e na luta)', () => {
  const ids = Object.keys(A.ARMORS);
  it('4 armaduras; regeneracao cresce com a raridade; precos so onde ha loja', () => {
    for (const c of ['armor_arcane', 'armor_iron', 'armor_leather', 'armor_phoenix']) assert.ok(ids.includes(c), c); // as 4 clássicas continuam
    // armaduras de mergulho (expansão marítima): regeneram MENOS que a clássica da mesma raridade (trocam vida por fôlego)
    for (const [dive, classic] of [['armor_snorkel', 'armor_leather'], ['armor_wetsuit', 'armor_iron'], ['armor_coral', 'armor_arcane']]) assert.ok(A.ARMORS[dive].regenPerSec <= A.ARMORS[classic].regenPerSec && A.ARMORS[dive].rarity === A.ARMORS[classic].rarity, dive);
    const order = ['armor_leather', 'armor_iron', 'armor_arcane', 'armor_phoenix'];
    for (let i = 1; i < order.length; i++) assert.ok(A.ARMORS[order[i]].regenPerSec > A.ARMORS[order[i - 1]].regenPerSec);
    for (const id of [...A.PLAZA_ARMORS, ...A.GELO_ARMORS]) assert.ok(A.ARMORS[id] && A.ARMORS[id].price > 0, id);
    for (const id of ['armor_arcane', 'armor_phoenix', 'armor_coral', 'armor_leviathan', 'armor_gills']) assert.equal(A.ARMORS[id].price, null);
    assert.equal(A.armorRegenOf(null), 0);
    assert.equal(A.armorRegenOf('x'), 0);
    assert.equal(A.armorRegenOf('armor_iron'), 1);
  });
  it('icones existem no registro (provisorios) e nao colidem com ids de itens', () => {
    const icons = read('src/game/ui/iconRegistry.ts');
    for (const a of Object.values(A.ARMORS)) { assert.match(icons, new RegExp(`\\b${a.icon}:`), a.icon); assert.ok(!ITEMS[a.id], a.id); }
  });
  it('lutador com regenPerSec recupera vida por segundo, e nao ressuscita KO nem passa do maximo', () => {
    const f = createFighter('dogge', 1);
    f.health = 50;
    f.regenPerSec = 2.6;
    f.update(1000, 60);
    assert.ok(Math.abs(f.health - 52.6) < 0.05, `vida ${f.health}`);
    f.health = f.maxHealth - 0.5;
    f.update(1000, 60);
    assert.equal(f.health, f.maxHealth);
    f.health = 0; f.isKO = true;
    f.update(1000, 60);
    assert.equal(f.health, 0);
  });
  it('armadura soma com a regeneracao das habilidades (nao substitui)', () => {
    const src = read('src/game/items/armor.ts');
    assert.match(src, /fighter\.regenPerSec = baseRegen \+ getArmorRegen\(\)/);
    assert.match(read('src/screens/BattleScreen.tsx'), /applyArmorRegen\(p1, p1\.regenPerSec\)/);
    assert.match(read('src/screens/WorldScreen.tsx'), /applyArmorRegen\(fighter, baseRegenRef\.current\)/);
  });
  it('playerState: guarda, equipa, salva e restaura as armaduras; save antigo comeca sem armadura', () => {
    const p = read('src/game/state/playerState.ts');
    for (const re of [/export function giveArmor/, /export function equipArmor/, /export function getOwnedArmors/, /armors: \[\.\.\.state\.armors\]/, /state\.armors = Array\.from\(new Set\(\(data\.armors \?\? \[\]\)/, /state\.armorId = null/]) assert.match(p, re);
  });
  it('fontes: lojas (praca e gelo), chefe Sahur Evil e torre andar 40', () => {
    assert.match(read('src/game/world/buildingContent.ts'), /armors: GELO_ARMORS/);
    assert.match(read('src/game/world/ShopOverlay.tsx'), /armors = PLAZA_ARMORS/);
    assert.match(read('src/game/world/InteriorOverlay.tsx'), /armors=\{building\?\.stock \? building\.armors \?\? \[\] : undefined\}/);
    assert.match(read('src/game/state/bossState.ts'), /id: 'boss_sahur_evil'[^\n]*armor: 'armor_arcane'/);
    assert.match(read('src/game/battle/battleModes.ts'), /f === 40 && claim\('tower_40'\) && giveArmor\('armor_phoenix'\)/);
    for (const k of ['armor_arcane', 'armor_phoenix']) assert.ok(A.ARMORS[k]);
  });
  it('textos nos 5 idiomas com as mesmas chaves', () => {
    const { STRINGS_ARMADURA: S } = require('../src/game/i18n/stringsArmadura.ts');
    const base = Object.keys(S.pt).sort();
    for (const l of ['en', 'es', 'fr', 'ja']) assert.deepEqual(Object.keys(S[l]).sort(), base, l);
    assert.match(read('src/game/i18n/extraStrings.ts'), /STRINGS_ARMADURA[,\]]/);
  });
});

describe('NPCs animados (folhas de andar em assets/npc-walk)', () => {
  const W = require('../src/game/world/npcWalk.ts');
  const R = require('../src/game/world/npcRoutine.ts');
  const { NPC_SHEET } = require('../src/game/world/npcSheet.ts');
  const { OUTDOOR_NPCS } = require('../src/game/world/npcs.ts');
  const png = (p) => {
    const b = fs.readFileSync(new URL(`../${p}`, import.meta.url));
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), size: b.length };
  };
  it('32 personagens importados das 4 folhas; os 8 da folha 4 ligados a c08..c15; originais guardados', () => {
    assert.equal(Object.keys(W.NPC_WALK_SHEETS).length, 32);
    assert.deepEqual(Object.keys(W.NPC_WALK_FOR), ['c08', 'c09', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15']);
    for (const [c, w] of Object.entries(W.NPC_WALK_FOR)) {
      assert.ok(NPC_SHEET[c], `${c} existe no pacote antigo`);
      assert.ok(W.NPC_WALK_SHEETS[w] !== undefined, w);
    }
    for (let i = 1; i <= 4; i++) assert.ok(fs.existsSync(new URL(`../tools/art_src/npc_sheets/npc_sheet_${i}.jpg`, import.meta.url)), `folha ${i}`);
    assert.deepEqual(JSON.parse(read('assets/npc-walk/MAP.json')), W.NPC_WALK_FOR, 'MAP.json = codigo gerado');
  });
  it('cada PNG tem 3 colunas x 4 linhas de 32x48 ampliado 4x e e leve', () => {
    for (let s = 1; s <= 4; s++) for (let n = 0; n < 8; n++) {
      const p = png(`assets/npc-walk/w${s}_${n}.png`);
      assert.equal(p.w, 3 * 32 * W.NPC_WALK_FRAME.scale);
      assert.equal(p.h, 4 * 48 * W.NPC_WALK_FRAME.scale);
      assert.ok(p.size < 60 * 1024, `w${s}_${n} pesa ${p.size}`);
    }
  });
  it('fundo branco virou transparente e nenhum quadro esta vazio (python/PIL)', async () => {
    const { execFileSync } = await import('node:child_process');
    const out = execFileSync('python3', ['-I', '-c', `
import numpy as np, glob
from PIL import Image
bad=[]
for f in sorted(glob.glob('assets/npc-walk/w*.png')):
    a=np.array(Image.open(f).convert('RGBA'))
    if a[0,0,3]!=0 or a[-1,-1,3]!=0: bad.append(f+' canto opaco')
    for r in range(4):
        for c in range(3):
            q=a[r*192:(r+1)*192, c*128:(c+1)*128, 3]
            if (q>0).sum() < 0.12*q.size: bad.append(f'{f} quadro {r},{c} vazio')
print('OK' if not bad else bad[:5])
`], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
    assert.equal(out.trim(), 'OK', out);
  });
  it('direcao do rosto: horizontal quando |dx|>=|dy|, senao vertical; parado = de frente', () => {
    assert.equal(R.facingOf(3, 1), 'right');
    assert.equal(R.facingOf(-3, 1), 'left');
    assert.equal(R.facingOf(1, 3), 'down');
    assert.equal(R.facingOf(1, -3), 'up');
    const seen = new Set();
    for (const pl of OUTDOOR_NPCS) for (let c = 0; c < 1_200_000; c += 20_000) {
      const q = R.npcPose(pl, c);
      assert.ok(['down', 'left', 'right', 'up'].includes(q.facing));
      if (!q.walking) assert.equal(q.facing, 'down');
      else seen.add(q.facing);
    }
    assert.ok(seen.size >= 3, `so viu ${[...seen]}`);
  });
  it('quem tem folha anda animado; quem nao tem (c00-c07, c16-c23) segue com a imagem parada', () => {
    const sprite = read('src/game/world/NpcSprite.tsx');
    assert.match(sprite, /WALK_CYCLE = \[0, 1, 2, 1\]/);
    assert.match(sprite, /if \(sheet !== undefined\)/);
    assert.match(sprite, /source=\{c\.src\}/, 'fallback parado');
    const out = read('src/game/world/OutdoorNpcs.tsx');
    assert.match(out, /hasWalkSheet\(npc\.sheetChar\)/);
    assert.match(out, /!animated && pose\.walking && pose\.dir < 0 && styles\.flip/);
  });
});

describe('PNGs novos otimizados', () => {
  it('nenhum quadro de sprites-v2 / skins-v2 passa de 64 KB e as pastas ficaram leves', () => {
    let total = 0;
    for (const dir of ['assets/sprites-v2', 'assets/skins-v2']) for (const p of walk(dir)) {
      if (!p.endsWith('.png')) continue;
      const sz = fs.statSync(new URL(`../${p}`, import.meta.url)).size;
      total += sz;
      assert.ok(sz < 64 * 1024, `${p} pesa ${sz}`);
    }
    assert.ok(total < 6 * 1024 * 1024, `total ${total}`);
  });
  it('proporcoes: a altura do corpo reduzida e igual em todos os quadros de corpo do personagem', () => {
    for (const c of ['dogge', 'sahur_evil', 'ninja']) {
      const meta = JSON.parse(read(`assets/sprites-v2/${c}/ORIGEM.json`));
      assert.ok(meta.reducao <= 1 && meta.altura_corpo_px <= 200 + 1, c);
      for (const p of ['idle', 'walk1', 'dash', 'hurt', 'ko']) assert.equal(meta.poses[p].h, meta.altura_corpo_px, `${c}/${p}`);
    }
  });
  it('idle de TODOS os personagens novos = o retrato parado (nao a guarda): idle e guard sao quadros diferentes', () => {
    const chars = ['orc', 'soldier', 'gadigago', 'dogge', 'sahur', 'ninja', 'troll_face', 'sahur_evil', 'sahur_god', 'dogking', 'tank', 'mystic', 'cara_tranquilo'];
    for (const c of chars) {
      const o = JSON.parse(read(`assets/sprites-v2/${c}/ORIGEM.json`));
      assert.ok(o.poses.idle && o.poses.portrait, c);
      if (c !== 'orc') assert.notEqual(fs.readFileSync(new URL(`../assets/sprites-v2/${c}/idle.png`, import.meta.url)).toString('hex'), fs.readFileSync(new URL(`../assets/sprites-v2/${c}/guard.png`, import.meta.url)).toString('hex'), c);
      assert.match(o.notas, /idle = (o )?retrato/i, `${c}: notas dizem que o idle e o retrato`);
    }
  });
});
