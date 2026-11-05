/**
 * Teste de navegador da entrega "Urgente 1" (sprites/cenarios/retratos recriados).
 *
 *   npx expo export --platform web --output-dir dist
 *   SHOTS_DIR=/tmp/shots node tools/e2e-urgente1.mjs dist
 *
 * Para cada um dos 11 lutadores abre /battle como P1 (contra orc/soldier), e confere:
 *  - o lutador aparece na tela com a ALTURA de referencia do desenho original (largura/proporcao de layout): os sprites
 *    recriados nao podem mudar o tamanho dos lutadores em jogo;
 *  - nenhuma imagem da pagina falhou ao carregar (404) e nao ha erro de JavaScript (fora o #418 preexistente);
 *  - capturas (parado e andando) em SHOTS_DIR para conferir a olho.
 * Usa o Playwright ja instalado no ambiente (nao esta no package.json do jogo de proposito).
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

/** drawWidth (Fighter.createFighter) e proporcao de LAYOUT do desenho original -> altura de referencia esperada. */
const CASES = {
  dogge: [200, 146 / 164],
  gadigago: [150, 237 / 359],
  orc: [170, 27 / 23],
  soldier: [165, 21 / 26],
  dogking: [230, 110 / 118],
  tank: [200, 124 / 122],
  ninja: [150, 172 / 240],
  mystic: [130, 158 / 300],
  ice_dragon: [250, 178 / 202],
  green_dragon: [240, 178 / 202],
  shadow_dragon: [400, 144 / 104], // redesenhado: largura 440 -> 400, altura nova ~289 px (documentado em docs/AUDIT.md)
  troll_face: [108, 170 / 337], // Urgente 2
  cara_tranquilo: [118, 134 / 235], // Urgente 2
  tocao: [106, 92 / 186], // Urgente 3
  serafim: [177, 170 / 216], // Urgente 3
  capiroto: [161, 160 / 224], // Urgente 3
};

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

let pass = 0;
let fail = 0;
function check(ok, name, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  —  ' + extra : ''}`);
  ok ? pass++ : fail++;
}

async function openBattle(browser, base, p1, p2) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  const bad = [];
  page.on('pageerror', (e) => !/NotAllowedError|play\(\) failed|React error #418/i.test(String(e)) && errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource|#418/i.test(m.text()) && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && /\.(png|webp|gif|jpe?g)(\?|$)/i.test(r.url()) && bad.push(r.status() + ' ' + r.url()));
  await page.goto(`${base}/battle?p1=${p1}&p2=${p2}&p2Control=cpu&stageKey=stage_1`, { waitUntil: 'load' });
  await page.getByText('FLASH', { exact: true }).waitFor({ timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes('ROUND 1'), null, { timeout: 30000 }).catch(() => {});
  // PREEXISTENTE (tambem no original, so na exportacao web): arena pode ficar em scale(0) ate um resize depois de hidratar.
  const zeroed = await page.evaluate(() => [...document.querySelectorAll('div')].some((d) => d.style.width === '1280px' && d.style.height === '720px' && /scale\(0\)/.test(d.style.transform)));
  if (zeroed) {
    await page.setViewportSize({ width: 1281, height: 720 });
    await page.setViewportSize({ width: 1280, height: 720 });
  }
  await page.waitForTimeout(700);
  return { ctx, page, errors, bad };
}

/** Acha a caixa do lutador (largura = drawWidth, com uma imagem dentro) mais proxima da esquerda (P1). */
async function fighterBox(page, drawWidth) {
  return page.evaluate((dw) => {
    const boxes = [];
    for (const d of document.querySelectorAll('div')) {
      const w = parseFloat(d.style.width);
      const h = parseFloat(d.style.height);
      if (Math.abs(w - dw) < 0.3 && h > 60 && h < 520 && d.style.position === 'absolute' && d.querySelector('div,img')) {
        const r = d.getBoundingClientRect();
        boxes.push({ x: r.x, y: r.y, w: r.width, h: r.height, styleH: h, left: parseFloat(d.style.left) });
      }
    }
    boxes.sort((a, b) => a.left - b.left);
    return boxes[0] || null;
  }, drawWidth);
}

async function main() {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  for (const [key, [dw, asp]] of Object.entries(CASES)) {
    if (ONLY.length && !ONLY.includes(key)) continue;
    const p2 = key === 'orc' ? 'soldier' : 'orc';
    const { ctx, page, errors, bad } = await openBattle(browser, base, key, p2);
    const want = dw / asp;
    const box = await fighterBox(page, dw);
    check(!!box, `[${key}] lutador encontrado na tela`);
    if (box) check(Math.abs(box.styleH - want) <= 1.5, `[${key}] altura de referencia = desenho original`, `${box.styleH.toFixed(1)} px (esperado ${want.toFixed(1)})`);
    const clip = box ? { x: Math.max(0, box.x - 60), y: Math.max(0, box.y - 40), width: Math.min(1280, box.w + 260), height: Math.min(720 - Math.max(0, box.y - 40), box.h + 90) } : undefined;
    if (SHOTS && clip) await page.screenshot({ path: path.join(SHOTS, `${key}_idle.png`), clip });
    const seen = new Set();
    // anda para a direita segurando o botao: captura quadros de andar
    const btn = await page.getByText('▶', { exact: true }).boundingBox().catch(() => null);
    if (btn) {
      await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
      await page.mouse.down();
      for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(160);
        const b2 = await fighterBox(page, dw);
        if (SHOTS && b2) await page.screenshot({ path: path.join(SHOTS, `${key}_walk${i}.png`), clip: { x: Math.max(0, b2.x - 60), y: Math.max(0, b2.y - 40), width: Math.min(1280, b2.w + 260), height: Math.min(720 - Math.max(0, b2.y - 40), b2.h + 90) } });
        seen.add(await page.evaluate((w) => [...document.querySelectorAll('div')].filter((d) => Math.abs(parseFloat(d.style.width) - w) < 0.3).map((d) => d.innerHTML.length).join(','), dw));
      }
      await page.mouse.up();
    }
    for (const b of ['FLASH', 'FORTE']) await page.getByText(b, { exact: true }).click({ timeout: 1500, force: true }).catch(() => {});
    await page.waitForTimeout(250);
    check(bad.length === 0, `[${key}] nenhuma imagem falhou ao carregar`, bad.slice(0, 2).join(' | '));
    check(errors.length === 0, `[${key}] sem erros de JavaScript`, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(`\n${pass} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(2);
});
