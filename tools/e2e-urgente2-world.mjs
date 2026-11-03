/**
 * Teste de navegador do MUNDO para a Urgente 2: cria um mundo pela interface, teleporta o jogador (editando a posicao no
 * save do navegador) e confere (1) a porta do cassino barrada pelo Troll Face, (2) o Troll Face/Cara Tranquilo aparecendo
 * e falando, (3) o desafio dos chefes novos. Uso: npx expo export --platform web --output-dir dist && node tools/e2e-urgente2-world.mjs dist
 * Variaveis: SHOTS_DIR, PLAYWRIGHT_PATH.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/npm-tools/node_modules/playwright');
const DIST = path.resolve(process.argv[2] || 'dist');
const SHOTS = process.env.SHOTS_DIR || '';
const TS = 32;
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

async function enterWorld(browser, base, tile) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [], bad = [];
  page.on('pageerror', (e) => !/NotAllowedError|play\(\) failed|React error #418|Minified React error #418/i.test(String(e)) && errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource|#418/i.test(m.text()) && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && /\.(png|webp|gif|jpe?g)(\?|$)/i.test(r.url()) && bad.push(r.status() + ' ' + r.url()));
  await page.goto(`${base}/slots`, { waitUntil: 'load' });
  await page.getByText('NOVO MUNDO', { exact: true }).first().click({ timeout: 30000 });
  await page.getByText('CRIAR E JOGAR', { exact: true }).click({ timeout: 10000 });
  await page.getByText('PULAR TUTORIAL ›').first().click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // teleporta: edita o save do slot 1 e volta pelo menu de slots
  const key = 'meme_fighter_slot_1_v2';
  const ok = await page.evaluate(([k, x, y]) => {
    const raw = localStorage.getItem(k);
    if (!raw) return false;
    const d = JSON.parse(raw);
    d.player = { x, y, facing: 'up' };
    localStorage.setItem(k, JSON.stringify(d));
    return true;
  }, [key, tile.x * TS, tile.y * TS]);
  if (!ok) throw new Error('save do slot 1 nao encontrado no localStorage');
  await page.goto(`${base}/slots`, { waitUntil: 'load' });
  await page.getByText('JOGAR', { exact: true }).first().click({ timeout: 30000 });
  await page.waitForTimeout(3500);
  return { ctx, page, errors, bad };
}

async function main() {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const shot = (page, n) => (SHOTS ? page.screenshot({ path: path.join(SHOTS, n) }) : null);

  // 1) Porta do cassino: Troll Face na trilha a 6 tiles, jogador logo abaixo da porta.
  {
    const { ctx, page, errors, bad } = await enterWorld(browser, base, { x: 1128, y: 177 });
    await shot(page, 'mundo_troll_chefe.png');
    check(await page.getByText('DESAFIAR', { exact: false }).first().isVisible().catch(() => false), 'botao DESAFIAR aparece ao lado do Troll Face');
    // anda para cima (entra na porta): deve abrir o desafio do Troll Face, nao o interior do cassino
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(2500);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(400);
    const body = await page.evaluate(() => document.body.innerText);
    await shot(page, 'mundo_troll_porta.png');
    check(/Troll Face/.test(body) && /Nível recomendado: 20/.test(body) && /ACEITAR/.test(body), 'porta do cassino mostra o desafio do Troll Face (nivel 20, ACEITAR)', body.replace(/\s+/g, ' ').slice(0, 120));
    check(!/Cassino Misterioso/.test(body), 'o interior do cassino NAO abriu antes de vencer o Troll Face');
    check(bad.length === 0, 'mundo: nenhuma imagem com erro', bad.slice(0, 2).join(' | '));
    check(errors.length === 0, 'mundo: sem erros de JavaScript', errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // 2) Cara Tranquilo na praca: FALAR abre a fala com cumprimento + dica
  {
    const { ctx, page, errors } = await enterWorld(browser, base, { x: 863, y: 945 });
    await shot(page, 'mundo_chill.png');
    const talk = page.getByText('FALAR', { exact: false }).first();
    check(await talk.isVisible().catch(() => false), 'botao FALAR aparece perto do Cara Tranquilo');
    await talk.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
    const t1 = await page.evaluate(() => document.body.innerText);
    await shot(page, 'mundo_chill_fala.png');
    check(/Cara Tranquilo/.test(t1) && /(Tá tudo tranquilo|de boa|Só passando)/.test(t1), 'fala do Cara Tranquilo abriu', t1.replace(/\s+/g, ' ').slice(0, 140));
    await page.mouse.click(640, 600);
    await page.waitForTimeout(400);
    const t2 = await page.evaluate(() => document.body.innerText);
    check(/Dica:/.test(t2), 'segunda fala e uma dica do jogo', t2.replace(/\s+/g, ' ').slice(0, 160));
    check(errors.length === 0, 'chill: sem erros de JavaScript', errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // 3) Troll Face perto do barco (cais principal)
  {
    const { ctx, page, errors } = await enterWorld(browser, base, { x: 1518, y: 892 });
    await shot(page, 'mundo_troll_cais.png');
    const talk = page.getByText('FALAR', { exact: false }).first();
    check(await talk.isVisible().catch(() => false), 'botao FALAR aparece perto do Troll Face no cais');
    await talk.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
    const t1 = await page.evaluate(() => document.body.innerText);
    check(/Troll Face/.test(t1) && /(Psiu|olha atrás|Aposto)/.test(t1), 'fala do Troll Face (pegadinha) abriu', t1.replace(/\s+/g, ' ').slice(0, 140));
    check(errors.length === 0, 'troll: sem erros de JavaScript', errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // 4) Lutas de chefe novas: o oponente certo aparece, sem 404 e sem erro de JS
  for (const [bossId, name] of [['boss_troll', 'Troll Face'], ['boss_chill', 'Cara Tranquilo'], ['boss_chill_2', 'Cara Tranquilo']]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    const errors = [], bad = [];
    page.on('pageerror', (e) => !/NotAllowedError|play\(\) failed|#418/i.test(String(e)) && errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource|#418/i.test(m.text()) && errors.push(m.text()));
    page.on('response', (r) => r.status() >= 400 && /\.(png|webp|gif|jpe?g)(\?|$)/i.test(r.url()) && bad.push(r.status() + ' ' + r.url()));
    await page.goto(`${base}/battle?p1=dogge&p2Control=cpu&bossId=${bossId}`, { waitUntil: 'load' });
    await page.getByText('FLASH', { exact: true }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(1500);
    const body = await page.evaluate(() => document.body.innerText);
    await shot(page, `luta_${bossId}.png`);
    check(body.includes(name.toUpperCase()) || body.includes(name), `[${bossId}] luta abre contra ${name}`, body.replace(/\s+/g, ' ').slice(0, 100));
    check(bad.length === 0 && errors.length === 0, `[${bossId}] sem 404 e sem erro de JS`, [...bad, ...errors].slice(0, 2).join(' | '));
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(`\n${pass} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
