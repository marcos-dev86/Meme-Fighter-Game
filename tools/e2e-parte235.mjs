/**
 * Teste de navegador das Partes 2/3/5: opções gráficas novas (persistem e viram o padrão ao recarregar) e as novas categorias
 * da barra de platina na tela PROGRESSO. Uso: node tools/e2e-parte235.mjs dist
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/npm-tools/node_modules/playwright');
const DIST = path.resolve(process.argv[2] || 'dist');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.ttf': 'font/ttf' };
const server = await new Promise((resolve) => {
  const s = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(DIST, p);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = fs.existsSync(file + '.html') ? file + '.html' : path.join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  s.listen(0, '127.0.0.1', () => resolve(s));
});
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  —  ' + extra : ''}`); ok ? pass++ : fail++; };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => !/NotAllowedError|play\(\) failed|#418/i.test(String(e)) && errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource|#418|NotAllowedError|AbortError/i.test(m.text()) && errors.push(m.text()));

try {
  await page.goto(`${base}/options`, { waitUntil: 'load' });
  await page.getByText('JOGO', { exact: true }).first().click({ timeout: 30000 });
  for (const label of ['PARTÍCULAS DO CLIMA', 'ONDAS ANIMADAS', 'ESCURECER À NOITE']) {
    const row = page.getByText(label, { exact: true }).first();
    await row.waitFor({ timeout: 8000 });
    check(true, `opção "${label}" aparece nas Opções`);
    // o botão LIGADO/DESLIGADO é irmão do rótulo na mesma linha
    const btn = row.locator('xpath=..').getByText(/^(LIGADO|DESLIGADO)$/).first();
    const before = (await btn.innerText()).trim();
    check(before === 'LIGADO', `"${label}" começa LIGADO (padrão seguro)`, before);
    await btn.click();
    const after = (await btn.innerText()).trim();
    check(after === 'DESLIGADO', `"${label}" desliga ao tocar`, after);
  }
  const stored = await page.evaluate(() => localStorage.getItem('meme_fighter_settings_v1'));
  const parsed = stored ? JSON.parse(stored) : {};
  check(parsed.weatherParticles === false && parsed.waveAnimation === false && parsed.nightDarkening === false, 'as 3 opções são gravadas', stored || '(vazio)');
  await page.reload({ waitUntil: 'load' });
  await page.getByText('JOGO', { exact: true }).first().click({ timeout: 30000 });
  const off = await page.getByText('ESCURECER À NOITE', { exact: true }).first().locator('xpath=..').getByText(/^(LIGADO|DESLIGADO)$/).first().innerText();
  check(off.trim() === 'DESLIGADO', 'a escolha sobrevive ao recarregar', off);

  // save antigo de opções (sem as chaves novas) volta ao padrão ligado
  await page.evaluate(() => localStorage.setItem('meme_fighter_settings_v1', JSON.stringify({ autoSave: true, autoSaveSeconds: 30, musicVolume: 0.5, sfxVolume: 0.5, ambientVolume: 0.5 })));
  await page.reload({ waitUntil: 'load' });
  await page.getByText('JOGO', { exact: true }).first().click({ timeout: 30000 });
  const on = await page.getByText('ONDAS ANIMADAS', { exact: true }).first().locator('xpath=..').getByText(/^(LIGADO|DESLIGADO)$/).first().innerText();
  check(on.trim() === 'LIGADO', 'opções antigas (sem as chaves novas) carregam com o padrão ligado', on);

  // barra de platina: novas categorias
  await page.goto(`${base}/progress`, { waitUntil: 'load' });
  await page.getByText('PROGRESSO', { exact: true }).first().waitFor({ timeout: 30000 });
  const body = await page.evaluate(() => document.body.innerText);
  for (const n of ['Missões secretas', 'Chefes derrotados', 'Torre dos Desafios', 'Árvore de habilidades']) check(body.includes(n), `PROGRESSO mostra "${n}"`);
} catch (e) {
  check(false, 'fluxo sem exceção', String(e).split('\n')[0]);
}
check(errors.length === 0, 'sem erros de JavaScript no fluxo todo', errors.slice(0, 2).join(' | '));
await browser.close();
server.close();
console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
