/**
 * Roda os testes de lógica (tests/unit, Node puro) e mostra um resumo por categoria.
 *   node tests/rodar-todos.mjs                 todos
 *   node tests/rodar-todos.mjs mar cassino     só essas categorias (nomes das pastas em tests/unit)
 * Os testes de navegador (tests/e2e) precisam de `npx expo export --platform web --output-dir dist` e do Playwright; veja o
 * cabeçalho de cada arquivo. O teste de assets (tests/assets/sprites-legados.test.py) roda com python3.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const unit = path.join(root, 'tests', 'unit');
const only = new Set(process.argv.slice(2));
const cats = fs.readdirSync(unit).filter((c) => fs.statSync(path.join(unit, c)).isDirectory() && (!only.size || only.has(c))).sort();
let failed = 0;
for (const cat of cats) {
  console.log(`\n== ${cat}`);
  for (const f of fs.readdirSync(path.join(unit, cat)).filter((x) => x.endsWith('.test.mjs')).sort()) {
    const r = spawnSync(process.execPath, [path.join(unit, cat, f)], { cwd: root, encoding: 'utf8', timeout: 300000 });
    const out = `${r.stdout}\n${r.stderr}`;
    const pass = /^# pass (\d+)/m.exec(out)?.[1] ?? '?';
    const fail = /^# fail (\d+)/m.exec(out)?.[1] ?? '?';
    const ok = r.status === 0;
    if (!ok) failed++;
    console.log(`${ok ? 'OK    ' : 'FALHA '} ${f}  (${pass} ok, ${fail} falhas)`);
  }
}
console.log(failed ? `\n${failed} arquivo(s) com falha` : '\nTudo passou');
process.exit(failed ? 1 : 0);
