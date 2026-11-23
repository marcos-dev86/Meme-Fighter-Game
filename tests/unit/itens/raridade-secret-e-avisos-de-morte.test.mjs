/**
 * Expansão marítima, etapa 1: raridade SECRET (dados reais, bônus, cores, nomes, preços) e AVISOS DE MORTE
 * contextuais (causa ou responsável). Roda a lógica real no Node. `node tests/unit/itens/raridade-secret-e-avisos-de-morte.test.mjs`
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
const Rar = require('../../../src/game/items/rarity.ts');
const D = require('../../../src/game/account/deathCause.ts');
const BD = require('../../../src/game/account/battleDeath.ts');
const A = require('../../../src/game/account/accountState.ts');
const DR = require('../../../src/game/account/deathRules.ts');
const { EXTRA_STRINGS } = require('../../../src/game/i18n/extraStrings.ts');
const { Fighter, createFighter } = require('../../../src/game/battle/Fighter.ts');
const read = (p) => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');

const LANGS = ['pt', 'en', 'es', 'fr', 'ja'];
const table = (lang) => Object.assign({}, ...EXTRA_STRINGS.map((m) => m[lang]));
const tr = (lang) => (k) => {
  const v = table(lang)[k];
  assert.ok(v !== undefined, `faltou ${k} em ${lang}`);
  return v;
};

describe('raridade Secret é categoria real', () => {
  it('existe na ordem, acima da lendária', () => {
    assert.deepEqual(Rar.RARITY_ORDER.slice(-2), ['legendary', 'secret']);
    assert.ok(Rar.isRarity('secret') && !Rar.isRarity('mythic') && !Rar.isRarity(undefined));
  });
  it('é preto e branco: texto branco, fundo preto', () => {
    assert.equal(Rar.RARITY_COLOR.secret, '#FFFFFF');
    assert.equal(Rar.rarityBg('secret', 'x'), '#000000');
    assert.equal(Rar.rarityBg('rare', 'x'), 'x');
    assert.equal(Rar.rarityBg('rare'), undefined);
  });
  it('bônus acima da lendária, mas sem quebrar o jogo (≤ 1,3 nos multiplicadores)', () => {
    const b = Rar.rarityBonus ? Rar.rarityBonus('secret') : null;
    const src = read('src/game/items/rarity.ts');
    assert.match(src, /secret: \{ weaponDamage: 1\.2, guard: 0\.8/);
    if (b) assert.ok(b.weaponDamage > Rar.rarityBonus('legendary').weaponDamage && b.weaponDamage <= 1.3);
  });
  it('tem nome nos 5 idiomas', () => {
    const t = read('src/game/i18n/translations.ts');
    assert.equal((t.match(/rarity_secret:/g) || []).length, 5);
  });
  it('preços de cosmético, perfil e conquista cobrem a Secret (nada undefined)', () => {
    const cos = require('../../../src/game/cosmetics/cosmeticDefs.ts');
    const cfg = require('../../../src/game/account/accountConfig.ts');
    assert.ok(cos.COSMETIC_PRICE.secret > cos.COSMETIC_PRICE.legendary);
    for (const k of ['achievement', 'background', 'frame']) {
      const rec = cfg.REWARD?.[k] ?? cfg[k] ?? null;
      for (const r of Rar.RARITY_ORDER) if (rec) assert.ok(typeof rec[r] === 'number', `${k}.${r}`);
    }
    const src = read('src/game/account/accountConfig.ts');
    assert.equal((src.match(/secret: /g) || []).length, 3);
  });
});

describe('aviso de morte: entidades (citam nome e papel)', () => {
  const t = tr('pt');
  it('chefe', () => assert.equal(D.describeDeath({ kind: 'entity', role: 'boss', name: 'Dogking' }, t), 'Você perdeu para o Boss Dogking.'));
  it('rival', () => assert.equal(D.describeDeath({ kind: 'entity', role: 'rival', name: 'Gadigago' }, t), 'Você foi derrotado pelo seu rival Gadigago.'));
  it('inimigo, criatura e guardião', () => {
    assert.equal(D.describeDeath({ kind: 'entity', role: 'enemy', name: 'Morcego' }, t), 'Você foi derrotado pelo inimigo Morcego.');
    assert.equal(D.describeDeath({ kind: 'entity', role: 'creature', name: 'Água-viva' }, t), 'Você foi derrotado pela criatura Água-viva.');
    assert.equal(D.describeDeath({ kind: 'entity', role: 'guardian', name: 'Sentinela' }, t), 'Você foi derrotado pelo guardião Sentinela.');
  });
  it('morreu por veneno ou queimadura de uma criatura: diz o efeito e o responsável', () => {
    assert.equal(D.describeDeath({ kind: 'entity', role: 'creature', name: 'Baiacu', via: 'poison' }, t), 'Você morreu envenenado. Responsável: criatura Baiacu.');
    assert.equal(D.describeDeath({ kind: 'entity', role: 'boss', name: 'Dragão Sombrio', via: 'burn' }, t), 'Você morreu queimado. Responsável: Boss Dragão Sombrio.');
  });
  it('nome vazio não vira "inimigo" genérico: cai no aviso padrão (null)', () => {
    assert.equal(D.describeDeath({ kind: 'entity', role: 'enemy', name: '  ' }, t), null);
    assert.equal(D.describeDeath(null, t), null);
  });
});

describe('aviso de morte: perigos do cenário', () => {
  const t = tr('pt');
  const exp = { drowning: 'Você morreu afogado.', breath: 'Você morreu por falta de fôlego.', fire: 'Você morreu queimado.', lava: 'Você morreu queimado na lava.', fall: 'Você morreu em uma queda.', poison: 'Você morreu envenenado.', trap: 'Você morreu em uma armadilha.', cold: 'Você morreu congelado.', pressure: 'Você foi esmagado pela pressão das profundezas.', other: 'Você não resistiu aos ferimentos.' };
  for (const h of D.HAZARDS) it(`sem região: ${h}`, () => assert.equal(D.describeDeath({ kind: 'hazard', hazard: h }, t), exp[h]));
  it('com região: "durante a exploração de X, devido a Y"', () => {
    assert.equal(D.describeDeath({ kind: 'hazard', hazard: 'breath', region: 'Recife Coral' }, t), 'Você morreu durante a exploração de Recife Coral, devido a falta de fôlego.');
    assert.equal(D.describeDeath({ kind: 'hazard', hazard: 'drowning', region: 'Naufrágio do Pato' }, t), 'Você morreu durante a exploração de Naufrágio do Pato, devido a afogamento.');
  });
  it('região em branco é ignorada', () => assert.equal(D.describeDeath({ kind: 'hazard', hazard: 'lava', region: ' ' }, t), exp.lava));
});

describe('todas as causas existem nos 5 idiomas, sem travessão, e as frases não ficam vazias', () => {
  for (const lang of LANGS) it(lang, () => {
    const t = tr(lang);
    for (const role of D.ENTITY_ROLES) {
      for (const via of [undefined, 'poison', 'burn']) {
        const s = D.describeDeath({ kind: 'entity', role, name: 'ZZZ', via }, t);
        assert.ok(s && s.includes('ZZZ') && !/\{\w+\}/.test(s), `${lang} ${role} ${via}: ${s}`);
      }
    }
    for (const hz of D.HAZARDS) {
      for (const region of [undefined, 'RRR']) {
        const s = D.describeDeath({ kind: 'hazard', hazard: hz, region }, t);
        assert.ok(s && !/\{\w+\}/.test(s) && (!region || s.includes('RRR')), `${lang} ${hz}: ${s}`);
      }
    }
    const all = JSON.stringify(Object.entries(table(lang)).filter(([k]) => k.startsWith('death_')));
    assert.ok(!/[—–]/.test(all), 'travessão em ' + lang);
  });
});

describe('a última causa registrada é a final (nada inventado)', () => {
  it('vários danos: vale o último; limpar zera', () => {
    D.clearDamageCause();
    assert.equal(D.lastDamageCause(), null);
    D.noteDamage({ kind: 'entity', role: 'enemy', name: 'Slime' });
    D.noteDamage({ kind: 'hazard', hazard: 'drowning' });
    assert.deepEqual(D.lastDamageCause(), { kind: 'hazard', hazard: 'drowning' });
    D.clearDamageCause();
    assert.equal(D.lastDamageCause(), null);
  });
});

describe('mortes em luta: chefe, rival, torre e veneno', () => {
  const t = tr('pt');
  it('chefe usa o nome do chefe (não o do lutador)', () => {
    const c = BD.battleDeathCause({ kind: 'boss', opponentName: 'Dogking', bossName: 'Rei Dogking' });
    assert.equal(D.describeDeath(c, t), 'Você perdeu para o Boss Rei Dogking.');
  });
  it('rival, torre e duelo de missão', () => {
    assert.equal(D.describeDeath(BD.battleDeathCause({ kind: 'rival', opponentName: 'Gadigago' }), t), 'Você foi derrotado pelo seu rival Gadigago.');
    assert.equal(D.describeDeath(BD.battleDeathCause({ kind: 'tower', opponentName: 'Orc' }), t), 'Você foi derrotado pelo inimigo Orc.');
    assert.equal(D.describeDeath(BD.battleDeathCause({ kind: 'quest', opponentName: 'Ninja' }), t), 'Você foi derrotado pelo inimigo Ninja.');
  });
  it('criatura marinha: papel explícito', () => {
    const c = BD.battleDeathCause({ kind: 'quest', opponentName: 'Moreia', role: 'creature' });
    assert.equal(D.describeDeath(c, t), 'Você foi derrotado pela criatura Moreia.');
  });
  it('golpe final por veneno cita o responsável', () => {
    const c = BD.battleDeathCause({ kind: 'boss', opponentName: 'Dragão Verde', bossName: 'Dragão Verde', lastHurtBy: 'poison' });
    assert.equal(D.describeDeath(c, t), 'Você morreu envenenado. Responsável: Boss Dragão Verde.');
  });
  it('Fighter lembra o que feriu por último: golpe ou veneno', () => {
    const f = createFighter('dogge', 1);
    f.takeHit(5);
    assert.equal(f.lastHurtBy, 'hit');
    f.invulnTimer = 0;
    f.status = { poison: 4000 };
    f.update(100);
    assert.equal(f.lastHurtBy, 'poison');
    f.revive();
    assert.equal(f.lastHurtBy, 'hit');
  });
  it('dano que mata por queimadura vira "burn"', () => {
    const f = createFighter('dogge', 1);
    f.invulnTimer = 0;
    f.status = { burn: 4000 };
    f.health = 0.2;
    f.update(200);
    assert.ok(f.isKO);
    assert.equal(f.lastHurtBy, 'burn');
  });
});

describe('histórico: a causa vai para as estatísticas da conta', () => {
  it('deathStatKey', () => {
    assert.equal(D.deathStatKey({ kind: 'entity', role: 'boss', name: 'x' }), 'boss');
    assert.equal(D.deathStatKey({ kind: 'hazard', hazard: 'drowning' }), 'drowning');
    assert.equal(D.deathStatKey(null), 'unknown');
  });
  it('payDeathFee soma deaths e deaths_<causa> e limpa a causa', () => {
    D.noteDamage({ kind: 'hazard', hazard: 'drowning' });
    const before = A.getAccount().stats;
    DR.payDeathFee();
    const after = A.getAccount().stats;
    assert.equal((after.deaths ?? 0) - (before.deaths ?? 0), 1);
    assert.equal((after.deaths_drowning ?? 0) - (before.deaths_drowning ?? 0), 1);
    assert.equal(D.lastDamageCause(), null);
  });
  it('morte sem causa conhecida conta em deaths_unknown', () => {
    DR.payDeathFee();
    assert.ok((A.getAccount().stats.deaths_unknown ?? 0) >= 1);
  });
});

describe('a interface usa o aviso e preserva o fluxo', () => {
  it('derrota do mundo e da luta passam a causa à tela de derrota', () => {
    assert.match(read('src/screens/WorldScreen.tsx'), /cause=\{describeDeath\(lastDamageCause\(\), t\)\}/);
    assert.match(read('src/screens/BattleScreen.tsx'), /cause=\{describeDeath\(lastDamageCause\(\), t\)\}/);
    assert.match(read('src/game/account/DefeatOverlay.tsx'), /cause \?\? t\('death_title'\)/);
  });
  it('contato com inimigo do mundo registra o nome real', () => {
    assert.match(read('src/screens/WorldScreen.tsx'), /noteDamage\(\{ kind: 'entity', role: 'enemy', name: c\.name \}\)/);
    assert.match(read('src/game/enemies/enemySim.ts'), /name: e\.def\.name \}\)/);
  });
});
