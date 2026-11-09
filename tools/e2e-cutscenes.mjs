/**
 * Teste de navegador da rota /cutscene (player de vídeo, PULAR, volta ao jogo, arquivo ausente).
 *   npx expo export --platform web --output-dir dist
 *   SHOTS_DIR=/tmp/shots node tools/e2e-cutscenes.mjs dist
 * Obs.: o Chromium do Playwright NÃO decodifica H.264; por isso o teste confere a tela e o PULAR, e que um vídeo que
 * não toca encerra sozinho (fallback). A reprodução real do .mp4 só pode ser conferida em Chrome/aparelho.
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
page.on('pageerror', (e) => errors.push(String(e)));
const here = () => new URL(page.url()).pathname;

// 1) abre uma cutscene (repetição) e vê o player + PULAR
await page.goto(`${base}/cutscene?id=final_poder&replay=1`, { waitUntil: 'load' });
await page.waitForSelector('[data-testid="cutscene-player"]', { timeout: 30000 }).catch(() => {});
check(await page.locator('[data-testid="cutscene-player"]').count() > 0, 'tela de cutscene abre');
check(await page.locator('[data-testid="cutscene-skip"]').count() > 0, 'botão PULAR existe');
check(await page.locator('video').count() > 0, 'elemento <video> existe');
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'cutscene_player.png') });
const src = await page.evaluate(() => document.querySelector('video')?.currentSrc || document.querySelector('video')?.src || '');
check(/final_poder.*\.mp4/.test(src), 'o vídeo certo foi carregado', src.slice(-60));
const r = await fetch(src);
check(r.status === 200 && Number(r.headers.get('content-length')) > 1_000_000, 'arquivo .mp4 é servido', `${r.status} ${r.headers.get('content-length')} bytes`);

// 2) PULAR leva embora da rota /cutscene
await page.locator('[data-testid="cutscene-skip"]').click();
await page.waitForTimeout(1500);
check(here() !== '/cutscene', 'PULAR sai da cutscene', here());

// 3) id inexistente não trava
await page.goto(`${base}/cutscene?id=nao_existe`, { waitUntil: 'load' });
await page.waitForTimeout(3000);
check(here() !== '/cutscene', 'id inexistente sai sozinho', here());

// 4) vídeo que não toca (Chromium sem H.264) encerra sozinho em até ~12 s
await page.goto(`${base}/cutscene?id=02_rival_gadigago&replay=1`, { waitUntil: 'load' });
await page.waitForSelector('[data-testid="cutscene-player"]', { timeout: 30000 }).catch(() => {});
const t0 = Date.now();
let left = false;
while (Date.now() - t0 < 16000) { if (here() !== '/cutscene') { left = true; break; } await page.waitForTimeout(500); }
const canH264 = await page.evaluate(() => document.createElement('video').canPlayType('video/mp4; codecs="avc1.4d401f"'));
console.log('INFO  canPlayType H.264 neste Chromium =', JSON.stringify(canH264));
check(left || canH264 !== '', 'sem codec: encerra sozinho (ou há codec e o vídeo toca)', `${Date.now() - t0} ms`);
check(errors.length === 0, 'sem erros de JavaScript na página', errors.slice(0, 2).join(' | '));

await browser.close();
server.close();
console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
