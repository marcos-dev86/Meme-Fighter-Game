/**
 * Teste de navegador da Parte 4 (VERSUS estilo Mortal Kombat): grade de seleção (cursor por teclado e toque, bloqueados),
 * escolha do Jogador 1 e do adversário, tela VS animada, abertura "ROUND 1" -> "LUTE!" e volta da luta sem repetir a tela VS.
 * Uso: node tools/e2e-versus.mjs dist   (SHOTS_DIR opcional para salvar capturas de tela)
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/npm-tools/node_modules/playwright');
const DIST = path.resolve(process.argv[2] || 'dist');
const SHOTS = process.env.SHOTS_DIR || '';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.ttf': 'font/ttf' };
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
const shot = async (page, n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, n + '.png') }); } };

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => !/NotAllowedError|play\(\) failed|#418/i.test(String(e)) && errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource|#418|NotAllowedError|AbortError/i.test(m.text()) && errors.push(m.text()));
const txt = (id) => page.getByTestId(id).first().innerText({ timeout: 8000 });

try {
  await page.goto(`${base}/versus`, { waitUntil: 'load' });
  await page.getByText('VS CPU', { exact: true }).first().click({ timeout: 30000 });
  await page.getByText('CONTINUAR', { exact: true }).first().click({ timeout: 10000 });

  // ---- grade + logo + dois toques
  await page.getByTestId('vs-tile-dogge').waitFor({ timeout: 10000 });
  const tiles = await page.locator('[data-testid^="vs-tile-"]').count();
  check(tiles === 16, 'grade com os 16 lutadores', String(tiles));
  check((await page.getByTestId('vs-logo').count()) === 1, 'logo do Meme Fighter no centro da grade');
  const geo = await page.evaluate(() => {
    const r = (id) => document.querySelector(`[data-testid="${id}"]`).getBoundingClientRect();
    const rects = [...document.querySelectorAll('[data-testid^="vs-tile-"]')].map((e) => e.getBoundingClientRect());
    const logo = r('vs-logo'); const prev = r('vs-preview');
    let overlap = 0;
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap++;
    }
    for (const a of rects) if (a.left < logo.right - 1 && logo.left < a.right - 1 && a.top < logo.bottom - 1 && logo.top < a.bottom - 1) overlap++;
    return { overlap, minTile: Math.min(...rects.map((x) => Math.min(x.width, x.height))), logoMid: (logo.left + logo.right) / 2, gridMid: (Math.min(...rects.map((x) => x.left)) + Math.max(...rects.map((x) => x.right))) / 2, prevRight: prev.right, firstTileLeft: Math.min(...rects.map((x) => x.left)), logoTop: logo.top, rowsAbove: rects.filter((x) => x.bottom <= logo.top + 1).length, rowsBelow: rects.filter((x) => x.top >= logo.bottom - 1).length };
  });
  check(geo.overlap === 0, 'tiles e logo sem sobreposição', String(geo.overlap));
  check(geo.minTile >= 48, 'área de toque de pelo menos 48 px', String(geo.minTile));
  check(Math.abs(geo.logoMid - geo.gridMid) < 4, 'logo centralizada na grade');
  check(geo.rowsAbove > 0 && geo.rowsBelow > 0, 'logo no meio da grade (lutadores acima e abaixo)', `${geo.rowsAbove}/${geo.rowsBelow}`);
  check(geo.prevRight <= geo.firstTileLeft + 1, 'prévia fica à esquerda da grade');
  check((await txt('vs-title')).includes('JOGADOR 1'), 'título pede o Jogador 1');
  check((await page.getByTestId('vs-preview-name').count()) === 0, 'antes do 1º toque não há prévia (nada pré-selecionado)');
  await shot(page, '1-grade');

  // 1º toque só seleciona; 2º toque no mesmo confirma
  await page.getByTestId('vs-tile-dogge').click();
  check((await txt('vs-preview-name')) === 'DOGGE', '1º toque mostra a prévia ampliada (Dogge)');
  check((await txt('vs-title')).includes('JOGADOR 1'), '1º toque NÃO confirma');
  const imgBox = await page.getByTestId('vs-preview-img').boundingBox();
  check(imgBox && imgBox.height > 90, 'prévia ampliada', String(imgBox && imgBox.height));
  check((await page.getByTestId('vs-stats').count()) === 1 || (await page.getByTestId('vs-preview-hint').count()) === 1, 'prévia traz informações (barras / dica)');
  await page.getByTestId('vs-tile-gadigago').click();
  check((await txt('vs-preview-name')) === 'GADIGAGO', 'tocar em outro antes de confirmar troca a prévia');
  check((await txt('vs-title')).includes('JOGADOR 1'), 'troca de prévia também não confirma');
  await page.keyboard.press('ArrowLeft');
  check((await txt('vs-preview-name')) === 'DOGGE', 'seta esquerda move a prévia (Dogge)');
  await page.keyboard.press('ArrowUp');
  check((await txt('vs-preview-name')) === 'CARA TRANQUILO', 'seta para cima dá a volta na grade', await txt('vs-preview-name'));
  await page.keyboard.press('ArrowDown');

  // bloqueado: prévia aparece, mas não confirma nem com 2º toque
  await page.getByTestId('vs-tile-orc').click();
  check((await txt('vs-preview-name')) === 'ORC', 'lutador bloqueado também mostra a prévia');
  check((await txt('vs-preview-hint')).includes('BLOQUEADO'), 'bloqueado mostra o aviso e como liberar', await txt('vs-preview-hint'));
  await page.getByTestId('vs-tile-orc').click();
  check((await txt('vs-title')).includes('JOGADOR 1'), '2º toque num bloqueado não confirma');
  await shot(page, '2-bloqueado');

  // confirma o P1 (Dogge) com dois toques e escolhe o adversário (CPU pode escolher qualquer um)
  await page.getByTestId('vs-tile-dogge').click();
  await page.getByTestId('vs-tile-dogge').click();
  check((await txt('vs-title')).includes('CPU'), '2º toque confirma: agora a CPU escolhe o adversário', await txt('vs-title'));
  check((await txt('vs-slot-name')) === 'DOGGE', 'espaço do P1 mostra Dogge');
  check((await page.getByTestId('vs-preview-name').count()) === 0, 'nova escolha começa sem prévia');
  await page.getByTestId('vs-tile-orc').click();
  check((await txt('vs-preview-name')) === 'ORC', 'prévia do adversário (Orc)');
  await shot(page, '3-adversario');
  await page.getByText('< TROCAR JOGADOR 1', { exact: true }).click();
  check((await txt('vs-title')).includes('JOGADOR 1'), 'TROCAR JOGADOR 1 volta ao passo do P1');
  await page.getByTestId('vs-tile-dogge').click();
  await page.getByTestId('vs-tile-dogge').click();
  await page.getByTestId('vs-tile-orc').click();
  await page.getByTestId('vs-tile-orc').click(); // confirma

  // ---- arena -> itens -> tela VS
  await page.getByText('ESCOLHA A ARENA').first().waitFor({ timeout: 8000 });
  await page.getByText('PRÓXIMO >', { exact: true }).first().click();
  await page.getByText('COMEÇAR', { exact: true }).first().click({ timeout: 8000 });
  await page.getByTestId('vs-splash').waitFor({ timeout: 5000 });
  check(true, 'tela VS aparece');
  await page.waitForTimeout(1300);
  check((await txt('vs-big')) === 'VS', 'VS estoura no meio');
  check((await txt('vs-name-left')) === 'DOGGE' && (await txt('vs-name-right')) === 'ORC', 'nomes dos dois lutadores');
  await shot(page, '4-vs');

  // ---- abre a luta sozinha e mostra ROUND 1 -> LUTE!
  const seen = new Set();
  const t0 = Date.now();
  while (Date.now() - t0 < 9000) {
    const l = await page.getByTestId('battle-intro-label').first().innerText({ timeout: 300 }).catch(() => '');
    if (l) seen.add(l.trim());
    if (seen.has('LUTE!')) break;
    await page.waitForTimeout(40);
  }
  check(/\/battle/.test(page.url()), 'a tela VS abre a luta sozinha', page.url());
  check(seen.has('ROUND 1') && seen.has('LUTE!'), 'abertura mostra ROUND 1 e depois LUTE!', [...seen].join(' | '));
  await shot(page, '5-luta');

  // ---- voltar da luta não repete a tela VS
  await page.goBack();
  await page.waitForTimeout(800);
  const splashAgain = await page.getByTestId('vs-splash').count();
  check(splashAgain === 0, 'voltar da luta não reabre a tela VS');
  check(/versus/.test(page.url()), 'volta para o Versus', page.url());

  // ---- tela VS pode ser pulada com um toque
  await page.getByText('COMEÇAR', { exact: true }).first().click({ timeout: 8000 });
  await page.getByTestId('vs-splash').waitFor({ timeout: 5000 });
  const t1 = Date.now();
  await page.getByTestId('vs-splash').click();
  await page.waitForURL(/battle/, { timeout: 3000 });
  check(Date.now() - t1 < 1500, 'toque pula a tela VS', `${Date.now() - t1} ms`);
} catch (e) {
  check(false, 'fluxo do Versus sem exceção', String(e).split('\n')[0]);
  await shot(page, 'erro');
}
check(errors.length === 0, 'sem erros de JavaScript no fluxo todo', errors.slice(0, 2).join(' | '));
await browser.close();
server.close();
console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
