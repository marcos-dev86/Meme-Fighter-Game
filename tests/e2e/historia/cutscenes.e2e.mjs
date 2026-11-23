/**
 * Teste de navegador da rota /cutscene (cutscene feita por código: quadros, PULAR, avanço por toque, volta ao jogo, id ausente).
 *   npx expo export --platform web --output-dir dist
 *   SHOTS_DIR=/tmp/shots node tests/e2e/historia/cutscenes.e2e.mjs dist
 * Obs.: não há mais vídeo: tudo é desenhado pelo jogo, então este teste roda no Chromium do Playwright sem codec.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/npm-tools/node_modules/playwright');
const DIST = path.resolve(process.argv[2] || 'dist');
const SHOTS = process.env.SHOTS_DIR || '';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const server = await new Promise((resolve) => {
  const s = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(DIST, p);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = fs.existsSync(file + '.html') ? file + '.html' : path.join(DIST, 'index.html');
    const size = fs.statSync(file).size;
    const type = MIME[path.extname(file)] || 'application/octet-stream';
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (m) {
      const a = m[1] ? +m[1] : 0, b = m[2] ? +m[2] : size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': b - a + 1 });
      fs.createReadStream(file, { start: a, end: b }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': size });
      fs.createReadStream(file).pipe(res);
    }
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
const here = () => new URL(page.url()).pathname;

// 1) abre uma cutscene (repetição) e vê o player + PULAR
await page.goto(`${base}/cutscene?id=final_poder&replay=1`, { waitUntil: 'load' });
await page.waitForSelector('[data-testid="code-cutscene"]', { timeout: 30000 }).catch(() => {});
check(await page.locator('[data-testid="code-cutscene"]').count() > 0, 'cutscene em código abre');
check(await page.locator('[data-testid="cutscene-skip"]').count() > 0, 'botão PULAR existe');
check(await page.locator('video').count() === 0, 'não usa elemento <video>');
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'cutscene_player.png') });
// um toque completa a fala e outro avança o quadro (os pontinhos do topo mostram o quadro atual)
const dots = () => page.locator('[data-testid="code-cutscene"] >> xpath=.//div[contains(@style,"width: 14px")]').count();
check((await dots()) > 1, 'a cena tem vários quadros', String(await dots()));

// 2) PULAR leva embora da rota /cutscene
await page.locator('[data-testid="cutscene-skip"]').click();
await page.waitForTimeout(1500);
check(here() !== '/cutscene', 'PULAR sai da cutscene', here());

// 3) id inexistente não trava
await page.goto(`${base}/cutscene?id=nao_existe`, { waitUntil: 'load' });
await page.waitForTimeout(3000);
check(here() !== '/cutscene', 'id inexistente sai sozinho', here());

// 4) uma cena curta (cassino) toca e termina sozinha em até ~12 s
await page.goto(`${base}/cutscene?id=cassino_cara_coroa&replay=1`, { waitUntil: 'load' });
await page.waitForSelector('[data-testid="code-cutscene"]', { timeout: 30000 }).catch(() => {});
const t0 = Date.now();
let left = false;
while (Date.now() - t0 < 14000) { if (here() !== '/cutscene') { left = true; break; } await page.waitForTimeout(500); }
check(left, 'cena curta termina sozinha', `${Date.now() - t0} ms`);
check(errors.length === 0, 'sem erros de JavaScript na página', errors.slice(0, 2).join(' | '));

await browser.close();
server.close();
console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
