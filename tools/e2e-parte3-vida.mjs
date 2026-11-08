/**
 * Vida persistente no navegador: save com 40% -> mundo mostra 40% -> abre luta de chefe (client-side) -> sai da luta (derrota = piso 25%) -> mundo volta com 25%.
 *   SHOT=/tmp/hp.png node tools/e2e-parte3-vida.mjs dist
 */
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/npm-tools/node_modules/playwright');
const DIST = path.resolve(process.argv[2] || 'dist');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); let file = path.join(DIST, p); if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = fs.existsSync(file + '.html') ? file + '.html' : path.join(DIST, 'index.html'); res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(`${base}/slots`, { waitUntil: 'load' });
await page.getByText('NOVO MUNDO', { exact: true }).first().click({ timeout: 30000 });
await page.getByText('CRIAR E JOGAR', { exact: true }).click({ timeout: 10000 });
await page.getByText('PULAR TUTORIAL ›').first().click({ timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.evaluate(() => { const k='meme_fighter_slot_1_v2'; const d=JSON.parse(localStorage.getItem(k)); d.ext={...(d.ext||{}), storyHp:{hp:0.4}}; localStorage.setItem(k, JSON.stringify(d)); });
await page.goto(`${base}/slots`, { waitUntil: 'load' });
await page.getByText('JOGAR', { exact: true }).first().click({ timeout: 30000 });
await page.waitForTimeout(2500);
const worldBar = () => page.evaluate(() => [...document.querySelectorAll('div')].filter((d) => d.style.backgroundColor === 'rgb(231, 76, 60)' && /%$/.test(d.style.width||'')).map(d => parseFloat(d.style.width)));
console.log('mundo antes', await worldBar());
// navegacao do cliente (mantem o estado em memoria): abre a luta de chefe pelo historico
await page.evaluate(() => { history.pushState({}, '', '/battle?p1=dogge&p2Control=cpu&bossId=boss_sahur'); window.dispatchEvent(new PopStateEvent('popstate', { state: {} })); });
await page.getByText('FLASH', { exact: true }).waitFor({ timeout: 20000 });
await page.waitForTimeout(3500);
const bars = await page.evaluate(() => [...document.querySelectorAll('div')].filter((d) => /%$/.test(d.style.width||'') && d.style.height==='100%' && d.style.alignSelf).map(d => ({ w: parseFloat(d.style.width), bg: d.style.backgroundColor, a: d.style.alignSelf })));
console.log('barras da luta', JSON.stringify(bars));
await page.screenshot({ path: process.env.SHOT || 'hp_battle.png' });
await page.waitForTimeout(16000);
const p1bar = () => page.evaluate(() => { const bs=[...document.querySelectorAll('div')].filter((d) => /%$/.test(d.style.width||'') && d.style.height==='100%' && d.style.alignSelf==='flex-start'); return bs.map(d=>parseFloat(d.style.width)); });
console.log('P1 antes de sair', await p1bar());
await page.evaluate(() => history.back());
await page.waitForTimeout(2500);
console.log('mundo depois', await worldBar(), errs.slice(0,2));
await page.screenshot({ path: (process.env.SHOT || 'hp_battle.png').replace('.png','_volta.png') });
await browser.close(); server.close();
