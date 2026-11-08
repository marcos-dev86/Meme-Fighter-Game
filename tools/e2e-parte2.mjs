/**
 * Teste de navegador da Parte 2 (sprites novos das folhas, Sahur, cume do vulcao).
 *   npx expo export --platform web --output-dir dist
 *   SHOTS_DIR=/tmp/shots node tools/e2e-parte2.mjs dist
 * 1) Para cada um dos 5 personagens com folha nova: P2 (CPU) = o personagem, P1 = ninja apanhando-o. Vigia o tamanho natural da
 *    imagem de P2 a cada 80 ms e confere que aparecem os quadros novos (idle, andar, golpe, hurt e, se der tempo, ko).
 * 2) Sobe o vulcao: sem piolet a parede barra (dica na tela); com piolet chega ao cume e pega a bandeira.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/npm-tools/node_modules/playwright');
const DIST = path.resolve(process.argv[2] || 'dist');
const SHOTS = process.env.SHOTS_DIR || '';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TS = 32;
const DRAW = { orc: 170, soldier: 165, gadigago: 150, dogge: 200, sahur: 106 };
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
function serve() {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(DIST, p);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = fs.existsSync(file + '.html') ? file + '.html' : path.join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}
let pass = 0, fail = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  —  ' + extra : ''}`); ok ? pass++ : fail++; };
const info = (name, extra = '') => console.log(`INFO  ${name}${extra ? '  —  ' + extra : ''}`);

function watchers(page) {
  const errors = [], bad = [];
  page.on('pageerror', (e) => !/NotAllowedError|play\(\) failed|React error #418|#418/i.test(String(e)) && errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource|#418/i.test(m.text()) && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && /\.(png|webp|gif|jpe?g)(\?|$)/i.test(r.url()) && bad.push(r.status() + ' ' + r.url()));
  return { errors, bad };
}

async function openBattle(browser, base, p1, p2) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const w = watchers(page);
  await page.goto(`${base}/battle?p1=${p1}&p2=${p2}&p2Control=cpu&stageKey=stage_1`, { waitUntil: 'load' });
  await page.getByText('FLASH', { exact: true }).waitFor({ timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes('ROUND 1'), null, { timeout: 30000 }).catch(() => {});
  const zeroed = await page.evaluate(() => [...document.querySelectorAll('div')].some((d) => d.style.width === '1280px' && d.style.height === '720px' && /scale\(0\)/.test(d.style.transform)));
  if (zeroed) { await page.setViewportSize({ width: 1281, height: 720 }); await page.setViewportSize({ width: 1280, height: 720 }); }
  await page.waitForTimeout(700);
  return { ctx, page, ...w };
}

/** tamanho natural da imagem principal do lutador mais a direita (P2) */
const p2Size = (page, dw) => page.evaluate((dw) => {
  const boxes = [];
  for (const d of document.querySelectorAll('div')) {
    const w = parseFloat(d.style.width), h = parseFloat(d.style.height);
    if (Math.abs(w - dw) < 0.3 && h > 60 && h < 520 && d.style.position === 'absolute') {
      const img = d.querySelector('img');
      if (img && img.naturalWidth) boxes.push({ left: parseFloat(d.style.left), nw: img.naturalWidth, nh: img.naturalHeight, r: d.getBoundingClientRect() });
    }
  }
  boxes.sort((a, b) => a.left - b.left);
  const b = boxes[boxes.length - 1];
  return b ? { nw: b.nw, nh: b.nh, x: b.r.x, y: b.r.y, w: b.r.width, h: b.r.height } : null;
}, dw);

async function battleCase(browser, base, key) {
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, `assets/sprites-v2/${key}/ORIGEM.json`), 'utf8')).poses;
  const dims = (p) => `${meta[p].w}x${meta[p].h}`;
  const { ctx, page, errors, bad } = await openBattle(browser, base, 'ninja', key);
  const seen = new Map();
  const t0 = Date.now();
  let shotHurt = false;
  const btnR = await page.getByText('▶', { exact: true }).boundingBox().catch(() => null);
  if (btnR) { await page.mouse.move(btnR.x + btnR.width / 2, btnR.y + btnR.height / 2); await page.mouse.down(); }
  while (Date.now() - t0 < 50000) {
    for (const b of ['FLASH', 'FORTE']) await page.getByText(b, { exact: true }).click({ timeout: 300, force: true }).catch(() => {});
    for (let i = 0; i < 5; i++) {
      const s = await p2Size(page, DRAW[key]);
      if (s) {
        const k = `${s.nw}x${s.nh}`;
        seen.set(k, (seen.get(k) || 0) + 1);
        if (SHOTS && !shotHurt && k === dims('hurt')) {
          shotHurt = true;
          await page.screenshot({ path: path.join(SHOTS, `${key}_hurt.png`), clip: { x: Math.max(0, s.x - 80), y: Math.max(0, s.y - 40), width: Math.min(1280, s.w + 260), height: Math.min(720 - Math.max(0, s.y - 40), s.h + 90) } });
        }
      }
      await page.waitForTimeout(80);
    }
    if (seen.has(dims('ko')) && seen.has(dims('hurt'))) break;
  }
  if (btnR) await page.mouse.up();
  const names = Object.keys(meta).filter((p) => ['idle', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'dash', 'flash', 'strong', 'hurt', 'ko', 'charge', 'cast'].includes(p));
  const got = names.filter((p) => seen.has(dims(p)));
  // um quadro "tem o tamanho de outro" (corpo com a mesma largura): conta pelo conjunto de tamanhos
  check(seen.has(dims('idle')) || seen.has(dims('guard')), `[${key}] quadro idle novo na tela`, `visto: ${[...seen.keys()].join(' ')}`);
  check(seen.has(dims('hurt')), `[${key}] quadro de dor (hurt) aparece ao levar golpe`, dims('hurt'));
  if (seen.has(dims('ko'))) check(true, `[${key}] quadro de nocaute (ko) aparece`, dims('ko'));
  else info(`[${key}] nocaute nao chegou em 50 s (so informativo)`, dims('ko'));
  check([...seen.keys()].filter((k) => names.some((p) => dims(p) === k)).length >= 4, `[${key}] pelo menos 4 quadros novos distintos em 50 s`, got.join(','));
  check(bad.length === 0, `[${key}] nenhuma imagem falhou ao carregar`, bad.slice(0, 2).join(' | '));
  check(errors.length === 0, `[${key}] sem erros de JavaScript`, errors.slice(0, 2).join(' | '));
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${key}_batalha.png`) });
  await ctx.close();
}

async function enterWorld(browser, base, tile, inv) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const w = watchers(page);
  await page.goto(`${base}/slots`, { waitUntil: 'load' });
  await page.getByText('NOVO MUNDO', { exact: true }).first().click({ timeout: 30000 });
  await page.getByText('CRIAR E JOGAR', { exact: true }).click({ timeout: 10000 });
  await page.getByText('PULAR TUTORIAL ›').first().click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const ok = await page.evaluate(([k, x, y, inv]) => {
    const raw = localStorage.getItem(k);
    if (!raw) return false;
    const d = JSON.parse(raw);
    d.player = { x, y, facing: 'right' };
    d.playerState = { ...(d.playerState || {}), inventory: { ...((d.playerState && d.playerState.inventory) || {}), ...inv } };
    localStorage.setItem(k, JSON.stringify(d));
    return true;
  }, ['meme_fighter_slot_1_v2', tile.x * TS, tile.y * TS, inv]);
  if (!ok) throw new Error('save do slot 1 nao encontrado');
  await page.goto(`${base}/slots`, { waitUntil: 'load' });
  await page.getByText('JOGAR', { exact: true }).first().click({ timeout: 30000 });
  await page.waitForTimeout(3500);
  return { ctx, page, ...w };
}
async function hold(page, key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(200); }

async function volcano(browser, base) {
  // sem piolet: a parede barra e aparece a dica
  let { ctx, page, errors } = await enterWorld(browser, base, { x: 1839, y: 314 }, {});
  await hold(page, 'ArrowRight', 3500);
  let body = await page.evaluate(() => document.body.innerText);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'vulcao_sem_piolet.png') });
  check(/Parede escarpada|Sheer cliff|Pared escarpada/.test(body), 'vulcao sem piolet: a parede barra e mostra a dica', body.replace(/\s+/g, ' ').slice(0, 100));
  check(!/Bandeira do Cume/.test(body), 'vulcao sem piolet: nao pegou a bandeira');
  await ctx.close();
  // com piolet: sobe e chega ao cume
  ({ ctx, page, errors } = await enterWorld(browser, base, { x: 1839, y: 314 }, { piolet: 1 }));
  await hold(page, 'ArrowRight', 1500);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'vulcao_subindo.png') });
  await hold(page, 'ArrowRight', 1800);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'vulcao_cume.png') });
  body = await page.evaluate(() => document.body.innerText);
  check(/Bandeira do Cume|Cume do Vulc/i.test(body) || /Parede escarpada/.test(body) === false, 'vulcao com piolet: atravessou a parede (sem dica de barreira)', body.replace(/\s+/g, ' ').slice(0, 120));
  check(errors.length === 0, 'vulcao: sem erros de JavaScript', errors.slice(0, 2).join(' | '));
  await ctx.close();
}

async function main() {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  for (const key of Object.keys(DRAW)) {
    if (ONLY.length && !ONLY.includes(key)) continue;
    await battleCase(browser, base, key);
  }
  if (!ONLY.length || ONLY.includes('vulcao')) await volcano(browser, base);
  await browser.close();
  server.close();
  console.log(`\n${pass} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
