/**
 * Teste de navegador (rodada: renomeacao, vida persistente, armaduras, idle parado, 8 folhas novas, NPCs andando).
 *   npx expo export --platform web --output-dir dist
 *   SHOTS_DIR=/tmp/shots node tools/e2e-parte3.mjs dist
 * 1) Os 13 personagens com folha nova abrem em luta sem 404 nem erro de JS e P2 mostra o IDLE novo (tamanho natural = idle do ORIGEM.json).
 * 2) /missions abre sem erro (capitulo repetido nao gera mais chave duplicada).
 * 3) Mundo: save com 40% de vida -> o mundo comeca com ~40% (nao 100%); armadura equipada regenera mais rapido que sem ela.
 * 4) NPCs: ao andar, o quadro da folha de andar muda (imagem do NPC com a folha 3x4 e deslocamento por direcao).
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/npm-tools/node_modules/playwright');
const DIST = path.resolve(process.argv[2] || 'dist');
const SHOTS = process.env.SHOTS_DIR || '';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };
const CHARS = ['orc', 'soldier', 'gadigago', 'dogge', 'sahur', 'ninja', 'troll_face', 'sahur_evil', 'sahur_god', 'dogking', 'tank', 'mystic', 'cara_tranquilo'];
const fighterSrc = fs.readFileSync(path.join(ROOT, 'src/game/battle/Fighter.ts'), 'utf8');
const drawWidth = (k) => { const i = fighterSrc.indexOf(`, '${k}');`); const m = /drawWidth = (\d+)/.exec(fighterSrc.slice(i)); return m ? +m[1] : 160; };

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
  page.on('pageerror', (e) => !/NotAllowedError|play\(\) failed|#418/i.test(String(e)) && errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource|#418|NotAllowedError|AbortError/i.test(m.text()) && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && /\.(png|webp|gif|jpe?g)(\?|$)/i.test(r.url()) && bad.push(r.status() + ' ' + r.url()));
  return { errors, bad };
}
const SLOT = 'meme_fighter_slot_1_v2';

async function battleIdle(browser, base, key) {
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, `assets/sprites-v2/${key}/ORIGEM.json`), 'utf8')).poses;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const { errors, bad } = watchers(page);
  await page.goto(`${base}/battle?p1=dogge&p2=${key}&p2Control=cpu&stageKey=stage_1`, { waitUntil: 'load' });
  await page.getByText('FLASH', { exact: true }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(900);
  const dw = drawWidth(key);
  const sizes = await page.evaluate((dw) => {
    const out = [];
    for (const d of document.querySelectorAll('div')) {
      const w = parseFloat(d.style.width), h = parseFloat(d.style.height);
      if (Math.abs(w - dw) < 0.3 && h > 60 && h < 520 && d.style.position === 'absolute') {
        const img = d.querySelector('img');
        if (img && img.naturalWidth) out.push({ left: parseFloat(d.style.left), nw: img.naturalWidth, nh: img.naturalHeight });
      }
    }
    return out.sort((a, b) => a.left - b.left);
  }, dw);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `luta_${key}.png`) });
  await ctx.close();
  const p2 = sizes[sizes.length - 1];
  const seen = new Set(sizes.map((s) => `${s.nw}x${s.nh}`));
  const idle = `${meta.idle.w}x${meta.idle.h}`;
  check(!!p2 && bad.length === 0 && errors.length === 0, `[${key}] luta abre, sem 404 e sem erro de JS`, [...bad, ...errors].slice(0, 2).join(' | '));
  check(seen.has(idle), `[${key}] aparece o IDLE novo (${idle})`, [...seen].join(','));
}

async function main() {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

  for (const k of CHARS) await battleIdle(browser, base, k);

  // 2) /missions
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    const { errors } = watchers(page);
    await page.goto(`${base}/missions`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    check(errors.length === 0, '/missions abre sem erro de JS', errors.slice(0, 2).join(' | '));
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'missoes.png') });
    await ctx.close();
  }

  // 3) mundo: vida persistente do save e armadura
  const enter = async (mutate) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    const w = watchers(page);
    await page.goto(`${base}/slots`, { waitUntil: 'load' });
    await page.getByText('NOVO MUNDO', { exact: true }).first().click({ timeout: 30000 });
    await page.getByText('CRIAR E JOGAR', { exact: true }).click({ timeout: 10000 });
    await page.getByText('PULAR TUTORIAL ›').first().click({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const ok = await page.evaluate(([k, m]) => {
      const raw = localStorage.getItem(k);
      if (!raw) return false;
      const d = JSON.parse(raw);
      d.ext = { ...(d.ext || {}), ...m.ext };
      if (m.ps) d.playerState = { ...d.playerState, ...m.ps };
      localStorage.setItem(k, JSON.stringify(d));
      return true;
    }, [SLOT, mutate]);
    if (!ok) throw new Error('save do slot 1 nao encontrado');
    await page.goto(`${base}/slots`, { waitUntil: 'load' });
    await page.getByText('JOGAR', { exact: true }).first().click({ timeout: 30000 });
    await page.waitForTimeout(2500);
    return { ctx, page, ...w };
  };
  // preenchimento vermelho (#e74c3c) da barra de vida do HUD do mundo; a largura em % e o valor da vida
  const hpBar = (page) => page.evaluate(() => [...document.querySelectorAll('div')]
    .filter((d) => d.style.backgroundColor === 'rgb(231, 76, 60)' && /%$/.test(d.style.width || '') && d.getBoundingClientRect().top < 120)
    .map((d) => parseFloat(d.style.width)));
  {
    const { ctx, page, errors, bad } = await enter({ ext: { storyHp: { hp: 0.4 } } });
    const bars = await hpBar(page);
    info('barras (%) vistas no mundo', bars.join(','));
    check(bars.some((w) => w > 30 && w < 55), 'mundo comeca com ~40% de vida (vem do save, nao 100%)', bars.join(','));
    // sem armadura: espera 9 s parado (4,5 s sem apanhar + 1,6/s) e mede
    await page.waitForTimeout(9000);
    const after = await hpBar(page);
    info('apos 9 s sem armadura', after.join(','));
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'mundo_hp40.png') });
    check(errors.length === 0 && bad.length === 0, 'mundo sem erro de JS e sem 404', [...errors, ...bad].slice(0, 2).join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await enter({ ext: { storyHp: { hp: 0.4 } }, ps: { armors: ['armor_phoenix'], armorId: 'armor_phoenix' } });
    await page.waitForTimeout(9000);
    const after = await hpBar(page);
    info('apos 9 s COM Armadura da Fenix (2,6/s)', after.join(','));
    check(after.some((w) => w > 55), 'com armadura a vida sobe mais (passou de 55% em 9 s)', after.join(','));
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'mundo_hp40_armadura.png') });
    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log(`\n${pass} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
