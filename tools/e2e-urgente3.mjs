/**
 * Teste de navegador da Urgente 3: entra no CASSINO GIGANTE (teleporta ate a porta com o Troll Face ja vencido), confere
 * mesas, NPCs, falas, botao JOGAR (abre o jogo certo) e a saida. Uso: node tools/e2e-urgente3.mjs dist (SHOTS_DIR opcional).
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

async function enterWorld(browser, base, tile, mutate, flags) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [], bad = [];
  page.on('pageerror', (e) => !/NotAllowedError|play\(\) failed|#418/i.test(String(e)) && errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource|#418/i.test(m.text()) && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && /\.(png|webp|gif|jpe?g)(\?|$)/i.test(r.url()) && bad.push(r.status() + ' ' + r.url()));
  await page.goto(`${base}/slots`, { waitUntil: 'load' });
  await page.getByText('NOVO MUNDO', { exact: true }).first().click({ timeout: 30000 });
  await page.getByText('CRIAR E JOGAR', { exact: true }).click({ timeout: 10000 });
  await page.getByText('PULAR TUTORIAL ›').first().click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const ok = await page.evaluate(([k, x, y, m, fl]) => {
    const raw = localStorage.getItem(k);
    if (!raw) return false;
    const d = JSON.parse(raw);
    d.player = { x, y, facing: 'up' };
    d.ext = { ...(d.ext || {}), bosses: { defeated: ['boss_troll'] } };
    if (m) d.coins = m;
    if (fl && fl.length) d.ext.story = { ...(d.ext.story || {}), flags: [...new Set([...((d.ext.story && d.ext.story.flags) || []), ...fl])] };
    localStorage.setItem(k, JSON.stringify(d));
    return true;
  }, ['meme_fighter_slot_1_v2', tile.x * TS, tile.y * TS, mutate || 0, flags || []]);
  if (!ok) throw new Error('save do slot 1 nao encontrado');
  await page.goto(`${base}/slots`, { waitUntil: 'load' });
  await page.getByText('JOGAR', { exact: true }).first().click({ timeout: 30000 });
  await page.waitForTimeout(3500);
  return { ctx, page, errors, bad };
}
async function hold(page, key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(150); }

async function main() {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const shot = (page, n) => (SHOTS ? page.screenshot({ path: path.join(SHOTS, n) }) : null);

  const { ctx, page, errors, bad } = await enterWorld(browser, base, { x: 1128, y: 222 }, 5000);
  await shot(page, 'cassino_fora.png');
  await hold(page, 'ArrowUp', 2000); // atravessa a calcada (5 tiles) e entra pela porta
  await page.waitForTimeout(800);
  let body = await page.evaluate(() => document.body.innerText);
  await shot(page, 'cassino_entrada.png');
  check(/Cassino Misterioso/.test(body) && /Zona de paz/.test(body), 'entrou no interior do cassino gigante (zona de paz)', body.replace(/\s+/g, ' ').slice(0, 100));
  // sobe pelo corredor central ate o meio do salao
  await hold(page, 'ArrowUp', 1800);
  await shot(page, 'cassino_centro.png');
  body = await page.evaluate(() => document.body.innerText);
  check(/FALAR/.test(body) || /JOGAR/.test(body), 'perto de um morador/mesa aparece FALAR ou JOGAR', body.replace(/\s+/g, ' ').slice(-120));
  // vai ate a mesa de cartas VIP (centro, y=12-13): para na frente dela
  // abre JOGAR
  const play = page.getByText('JOGAR:', { exact: false }).first();
  if (await play.isVisible().catch(() => false)) {
    await play.click();
    await page.waitForTimeout(600);
    const b2 = await page.evaluate(() => document.body.innerText);
    await shot(page, 'cassino_jogo.png');
    check(/(CARTAS|ROLETA|DADOS|MOEDA|CAÇA|SLOT)/i.test(b2) && /(APOSTAR|BET|aposta)/i.test(b2), 'JOGAR abre o jogo da mesa', b2.replace(/\s+/g, ' ').slice(0, 140));
    await page.getByText('FECHAR', { exact: false }).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
  } else check(false, 'botao JOGAR apareceu no centro do salao');
  // fala com alguem
  const talk = page.getByText('FALAR', { exact: false }).first();
  if (await talk.isVisible().catch(() => false)) {
    await talk.click();
    await page.waitForTimeout(500);
    const b3 = await page.evaluate(() => document.body.innerText);
    await shot(page, 'cassino_fala.png');
    check(b3.length > 20, 'FALAR abre uma conversa', b3.replace(/\s+/g, ' ').slice(0, 120));
    for (let i = 0; i < 8; i++) {
      const txt = await page.evaluate(() => document.body.innerText);
      if (/SAIR/.test(txt) && !/Madame Ás Mesa VIP|toque|TOQUE/.test(txt) && !/Mesa VIP das Cartas/.test(txt)) break;
      await page.mouse.click(640, 600); await page.waitForTimeout(300);
    }
  }
  // sobe ao mezanino VIP (2o andar) pela escada da direita e volta
  await hold(page, 'ArrowDown', 1800);
  await hold(page, 'ArrowRight', 4200);
  body = await page.evaluate(() => document.body.innerText);
  await shot(page, 'cassino_mezanino.png');
  check(/Mezanino VIP/.test(body), '2o andar: escada do terreo leva ao Mezanino VIP', body.replace(/\s+/g, ' ').slice(0, 100));
  await hold(page, 'ArrowDown', 700);
  body = await page.evaluate(() => document.body.innerText);
  check(/Cassino Misterioso/.test(body) && !/Mezanino/.test(body), 'volta ao terreo pela escada do mezanino', body.replace(/\s+/g, ' ').slice(0, 100));
  // sai pelo botao SAIR
  const sair = page.getByText('SAIR', { exact: true }).first();
  if (await sair.isVisible().catch(() => false)) { await sair.click(); await page.waitForTimeout(1200); }
  body = await page.evaluate(() => document.body.innerText);
  check(!/Zona de paz/.test(body), 'saiu do cassino de volta ao mundo');
  await shot(page, 'cassino_saida.png');
  check(bad.length === 0, 'nenhuma imagem com erro', bad.slice(0, 3).join(' | '));
  check(errors.length === 0, 'sem erros de JavaScript', errors.slice(0, 2).join(' | '));
  await ctx.close();

  // subsolo (-1): so com a passagem aberta (bandeira cassino_porao). Sem a bandeira a escada nao existe; com ela, desce.
  for (const open of [false, true]) {
    const w = await enterWorld(browser, base, { x: 1128, y: 222 }, 0, open ? ['cassino_porao'] : []);
    await hold(w.page, 'ArrowUp', 2000);
    await w.page.waitForTimeout(600);
    await hold(w.page, 'ArrowUp', 350);
    await hold(w.page, 'ArrowLeft', 3500);
    await hold(w.page, 'ArrowDown', 450);
    await hold(w.page, 'ArrowLeft', 1000);
    const t = await w.page.evaluate(() => document.body.innerText);
    await shot(w.page, open ? 'cassino_subsolo.png' : 'cassino_sem_passagem.png');
    if (open) check(/Subsolo Secreto/.test(t), 'subsolo (-1): com a passagem aberta a escada escondida desce', t.replace(/\s+/g, ' ').slice(0, 100));
    else check(!/Subsolo/.test(t), 'subsolo (-1): sem a passagem aberta a escada nao existe', t.replace(/\s+/g, ' ').slice(0, 100));
    check(w.errors.length === 0, `sem erros de JavaScript (subsolo ${open ? 'aberto' : 'fechado'})`, w.errors.slice(0, 2).join(' | '));
    await w.ctx.close();
  }

  // cenarios novos: todos abrem em batalha sem imagem quebrada, e a tela VERSUS lista os 12
  for (let n = 4; n <= 12; n++) {
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const pg = await ctx2.newPage();
    const errs = [], badImg = [];
    pg.on('pageerror', (e) => !/NotAllowedError|play\(\) failed|#418/i.test(String(e)) && errs.push(String(e)));
    pg.on('response', (r) => r.status() >= 400 && /\.(png|webp|gif|jpe?g)(\?|$)/i.test(r.url()) && badImg.push(r.status() + ' ' + r.url()));
    await pg.goto(`${base}/battle?p1=capiroto&p2=serafim&p2Control=cpu&stageKey=stage_${n}`, { waitUntil: 'load' });
    await pg.getByText('FLASH', { exact: true }).waitFor({ timeout: 30000 });
    await pg.waitForFunction(() => !document.body.innerText.includes('ROUND 1'), null, { timeout: 30000 }).catch(() => {});
    await pg.setViewportSize({ width: 1281, height: 720 }); await pg.setViewportSize({ width: 1280, height: 720 });
    await pg.waitForTimeout(900);
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `cenario_${n}.png`) });
    check(badImg.length === 0 && errs.length === 0, `cenario stage_${n} abre em batalha sem erro`, [...badImg, ...errs].slice(0, 2).join(' | '));
    await ctx2.close();
  }
  {
    const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const pg = await ctx3.newPage();
    await pg.goto(`${base}/versus?skipMode=1`, { waitUntil: 'load' });
    await pg.getByText('PRÓXIMO >', { exact: true }).first().click({ timeout: 30000 });
    await pg.waitForTimeout(800);
    const txt = await pg.evaluate(() => document.body.innerText);
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'versus_cenarios.png') });
    const names = ['MONTANHAS', 'VILAREJO', 'RIO OUTONAL', 'VULCÃO', 'NEVE', 'TREVAS', 'ILHA MISTERIOSA', 'CASSINO', 'FLORESTA', 'ACAMPAMENTO', 'PRAIA', 'CAVERNA'];
    check(names.every((n) => txt.includes(n)), 'VERSUS lista os 12 cenarios', names.filter((n) => !txt.includes(n)).join(','));
    await ctx3.close();
  }
  await browser.close();
  server.close();
  console.log(`\n${pass} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
