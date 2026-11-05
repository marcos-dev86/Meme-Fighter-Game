// Revanche: -50% na 2a tentativa, -70% da 3a em diante; zera ao vencer; so moedas e XP encolhem.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
const require = createRequire(import.meta.url);
require('./ts-register.cjs');
const R = require('../src/game/state/revanche.ts');
const { snapshotExts, restoreExts, resetExts } = require('../src/game/state/saveExt.ts');
const { STRINGS_URGENTE3 } = require('../src/game/i18n/stringsUrgente3.ts');
import fs from 'node:fs';

describe('revanche', () => {
  const boss = { kind: 'boss', boss: { id: 'boss_troll' } };
  const k = R.revancheKey(boss);
  it('chave por luta; torre e VERSUS nao contam', () => {
    assert.equal(k, 'boss:boss_troll');
    assert.equal(R.revancheKey({ kind: 'rival' }), 'rival');
    assert.equal(R.revancheKey({ kind: 'quest', questId: 'q1' }), 'quest:q1');
    assert.equal(R.revancheKey({ kind: 'tower' }), null);
    assert.equal(R.revancheKey({ kind: 'free' }), null);
    assert.equal(R.revancheMult(null), 1);
  });
  it('1a tentativa 100%, revanche 50%, revanche da revanche 30% e continua 30%', () => {
    resetExts();
    assert.equal(R.revancheMult(k), 1);
    R.recordLoss(k); assert.equal(R.revancheMult(k), 0.5); assert.equal(R.revancheLabel(R.revancheMult(k)), '-50%');
    R.recordLoss(k); assert.equal(R.revancheMult(k), 0.3); assert.equal(R.revancheLabel(R.revancheMult(k)), '-70%');
    for (let i = 0; i < 5; i++) { R.recordLoss(k); assert.equal(R.revancheMult(k), 0.3); }
    assert.equal(R.revancheLabel(1), '');
  });
  it('vencer zera a conta; lutas diferentes nao se misturam', () => {
    resetExts();
    R.recordLoss(k); R.recordLoss(k);
    R.recordLoss('rival');
    assert.equal(R.revancheMult('rival'), 0.5);
    R.recordWin(k);
    assert.equal(R.revancheMult(k), 1);
    assert.equal(R.revancheMult('rival'), 0.5);
  });
  it('desconto: arredonda, nunca zera premio positivo, 0 continua 0', () => {
    assert.equal(R.applyRevanche(100, 0.5), 50);
    assert.equal(R.applyRevanche(100, 0.3), 30);
    assert.equal(R.applyRevanche(1, 0.3), 1);
    assert.equal(R.applyRevanche(0, 0.3), 0);
    assert.equal(R.applyRevanche(333, 0.3), 100);
  });
  it('fica salvo no jogo e aceita save antigo sem a chave', () => {
    resetExts();
    R.recordLoss(k); R.recordLoss(k);
    const snap = JSON.parse(JSON.stringify(snapshotExts()));
    resetExts(); assert.equal(R.revancheMult(k), 1);
    restoreExts(snap); assert.equal(R.revancheMult(k), 0.3);
    restoreExts({}); assert.equal(R.revancheMult(k), 1);
    restoreExts({ revanche: { losses: { x: 'lixo', y: -3, z: 2 } } }); assert.equal(R.revancheLosses('z'), 2); assert.equal(R.revancheLosses('x'), 0);
  });
  it('grantVictory aplica o desconto so em moedas/XP (itens, bolsas e personagens liberados ficam inteiros)', () => {
    const src = fs.readFileSync(new URL('../src/game/battle/battleModes.ts', import.meta.url), 'utf8');
    assert.ok(src.includes('mult = 1): Granted'));
    assert.ok(src.includes('const coins = applyRevanche(coins0, mult);') && src.includes('const xp = applyRevanche(xp0, mult);'));
    assert.ok(/for \(const \[id, n\] of Object\.entries\(s\.boss\.reward\.items/.test(src)); // itens nao passam pelo desconto
    assert.ok(!/addItem\(id, applyRevanche/.test(src));
  });
  it('textos nos 5 idiomas e BattleScreen usa a revanche', () => {
    for (const l of ['pt', 'en', 'es', 'fr', 'ja']) { assert.ok(STRINGS_URGENTE3[l].revanche_next); assert.ok(STRINGS_URGENTE3[l].revanche_applied); }
    const src = fs.readFileSync(new URL('../src/screens/BattleScreen.tsx', import.meta.url), 'utf8');
    for (const w of ['recordLoss(rKey)', 'recordWin(rKey)', 'revancheMult(rKey)', 'applyRevanche(']) assert.ok(src.includes(w), w);
  });
});
