/**
 * Auditoria de textos (Parte 5): os 5 idiomas (pt, en, es, fr, ja) têm exatamente as mesmas chaves, nenhum texto vazio,
 * os {marcadores} batem com o português, toda chave usada em t('...') existe e não há texto fixo em português nas telas
 * conhecidas. `node tools/test-i18n.mjs`
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('./ts-register.cjs');
const { STRINGS } = require('../src/game/i18n/translations.ts');
require('../src/game/i18n/extraStrings.ts');
const LANGS = ['pt', 'en', 'es', 'fr', 'ja'];
const root = new URL('..', import.meta.url).pathname;

function walk(d, out = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}

describe('textos nos 5 idiomas', () => {
  const all = new Set(LANGS.flatMap((l) => Object.keys(STRINGS[l])));
  it('todas as chaves existem em todos os idiomas', () => {
    for (const l of LANGS) assert.deepEqual([...all].filter((k) => !(k in STRINGS[l])), [], l);
    assert.ok(all.size > 500);
  });
  it('nenhum texto vazio', () => {
    for (const l of LANGS) assert.deepEqual(Object.entries(STRINGS[l]).filter(([, v]) => typeof v !== 'string' || v.trim() === '').map(([k]) => k), [], l);
  });
  it('marcadores {x} iguais ao português', () => {
    const ph = (s) => (s.match(/\{[a-z0-9_]+\}/gi) || []).sort().join();
    const bad = [];
    for (const k of Object.keys(STRINGS.pt)) for (const l of LANGS.slice(1)) if (ph(STRINGS[l][k]) !== ph(STRINGS.pt[k])) bad.push(`${l}:${k}`);
    assert.deepEqual(bad, []);
  });
  it('só ficam iguais ao português os nomes próprios e termos universais', () => {
    const ALLOWED = new Set(['credits_title', 'tower_ranking', 'bag_use', 'options_edit_controls', 'controls_edit_title', 'shop_insufficient', 'progress_map', 'cas_station_cards_secret']);
    for (const l of ['en', 'fr', 'ja']) {
      const same = Object.keys(STRINGS.pt).filter((k) => STRINGS[l][k] === STRINGS.pt[k] && /[a-zçãõéíóúâê]{4,}/i.test(STRINGS.pt[k]) && STRINGS.pt[k].length > 12 && !ALLOWED.has(k));
      assert.deepEqual(same, [], l);
    }
  });
  it('toda chave usada em t(\'...\') ou nameKey existe', () => {
    const used = new Set();
    for (const p of walk(path.join(root, 'src'))) {
      const t = fs.readFileSync(p, 'utf8');
      for (const m of t.matchAll(/\bt\(\s*'([a-zA-Z0-9_]+)'\s*\)/g)) used.add(m[1]);
      for (const m of t.matchAll(/(?:nameKey|labelKey|titleKey|descKey|textKey)\s*:\s*'([a-zA-Z0-9_]+)'/g)) used.add(m[1]);
    }
    assert.ok(used.size > 300);
    assert.deepEqual([...used].filter((k) => !(k in STRINGS.pt)), []);
  });
  it('dica de controles da luta vem do idioma (sem texto fixo)', () => {
    const b = fs.readFileSync(path.join(root, 'src/screens/BattleScreen.tsx'), 'utf8');
    assert.doesNotMatch(b, /P1: mover\/pular/);
    assert.match(b, /t\('battle_hint_controls'\)/);
  });
});

import { spawnSync } from 'node:child_process';
import os from 'node:os';

describe('script de auditoria tools/check-i18n.mjs', () => {
  const run = (env = {}) => spawnSync(process.execPath, [path.join(root, 'tools/check-i18n.mjs'), '--json'], { env: { ...process.env, ...env }, encoding: 'utf8' });
  it('no projeto real: 0 problemas (chaves, duplicadas, não traduzidos, estrutura)', () => {
    const r = run();
    assert.equal(r.status, 0, r.stdout.slice(0, 800));
    assert.equal(JSON.parse(r.stdout).total, 0);
  });
  it('detecta chave faltando, duplicada, não traduzida e marcador diferente numa cópia alterada', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-'));
    for (const f of fs.readdirSync(path.join(root, 'src/game/i18n'))) fs.copyFileSync(path.join(root, 'src/game/i18n', f), path.join(dir, f));
    const extra = path.join(dir, 'stringsVersus.ts');
    let s = fs.readFileSync(extra, 'utf8');
    // 1) duplicada no mesmo bloco (pt)  2) falta no ja  3) en igual ao pt  4) marcador diferente no fr
    s = s.replace("vs_confirm: 'CONFIRMAR',", "vs_confirm: 'CONFIRMAR',\n    vs_confirm: 'OUTRA VEZ',");
    s = s.replace(/\n    vs_locked: 'ロック中',/, '');
    s = s.replace("vs_tap_again: 'Tap again to confirm',", "vs_tap_again: 'Toque de novo para confirmar',");
    fs.writeFileSync(extra, s);
    const r = run({ I18N_DIR: dir });
    assert.equal(r.status, 1);
    const out = JSON.parse(r.stdout).problems;
    assert.ok(out.duplicate.some((m) => /vs_confirm/.test(m)), 'duplicada');
    assert.ok(out.missing.some((m) => /^ja: falta "vs_locked"/.test(m)), 'faltando');
    assert.ok(out.untranslated.some((m) => /vs_tap_again/.test(m)), 'não traduzida');
    // marcador: {n} no pt que o es perde
    fs.writeFileSync(path.join(dir, 'stringsRivalElite.ts'), fs.readFileSync(path.join(dir, 'stringsRivalElite.ts'), 'utf8').replace('DESAFÍO DEL RIVAL {n}/5', 'DESAFÍO DEL RIVAL'));
    const r2 = run({ I18N_DIR: dir });
    assert.ok(JSON.parse(r2.stdout).problems.structure.some((m) => /rival_challenge/.test(m)), 'marcador');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
