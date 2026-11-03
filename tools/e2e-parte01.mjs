/**
 * Teste de navegador da Parte 1 (flash de dano, números de dano, impacto, pausa, desempenho).
 *
 *   npx expo export --platform web --output-dir dist
 *   node tools/e2e-parte01.mjs dist            # opcional: CRIT=1 para o build "crítico garantido" de teste
 *
 * Abre /battle de verdade (Expo Web + Chromium via Playwright), contra a CPU, e AMOSTRA o DOM a cada
 * quadro para medir o que aparece na tela. Não usa o projeto como biblioteca: só o que o navegador renderiza.
 * Usa o Playwright já instalado no ambiente (não está no package.json do jogo de propósito).
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PW = process.env.PLAYWRIGHT_PATH || '/opt/npm-tools/node_modules/playwright';
const { chromium } = require(PW);
const sharp = require(process.env.SHARP_PATH || '/opt/npm-tools/node_modules/sharp');

const DIST = path.resolve(process.argv[2] || 'dist');
const EXPECT_CRIT = process.env.CRIT === '1';
const SHOTS = process.env.SHOTS_DIR || '';
const OPPONENTS = (process.env.ONLY || 'gadigago,orc,soldier,dogking,tank,ninja,mystic,ice_dragon,green_dragon,shadow_dragon').split(',');

/** drawWidth de cada lutador (Fighter.createFighter), para saber de quem é o flash congelado. */
const DRAW_WIDTH = { gadigago: 150, orc: 170, soldier: 165, dogking: 230, tank: 200, ninja: 150, mystic: 130, ice_dragon: 250, green_dragon: 240, shadow_dragon: 400 };

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.ico': 'image/x-icon' };
function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(DIST, p);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = fs.existsSync(file + '.html') ? file + '.html' : path.join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const results = [];
let failed = 0;
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  —  ' + detail : ''}`);
}

/** Roda dentro da página: grava, a cada quadro, os flashes brancos e os números de dano visíveis. */
const SAMPLER = () => {
  window.__samples = [];
  window.__frames = [];
  let last = performance.now();
  const rgb = (c) => (c.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  const loop = (now) => {
    window.__frames.push(now - last);
    last = now;
    const bgOf = (el) => (el.querySelector('div[style*="background-image"]') || {}).style?.backgroundImage || '';
    const flashes = [...document.querySelectorAll('[data-testid="hit-flash"]')].map((el) => {
      const r = el.getBoundingClientRect();
      // O sprite "de verdade" é um irmão (mesmo lutador) cuja imagem de fundo é o mesmo arquivo.
      const bg = bgOf(el);
      const body = [...el.parentElement.children].find((c) => c !== el && c.getAttribute('data-testid') !== 'hit-flash' && bgOf(c) === bg);
      const b = body ? body.getBoundingClientRect() : null;
      return { x: r.x, y: r.y, w: r.width, h: r.height, op: parseFloat(getComputedStyle(el).opacity), bw: b && b.width, bh: b && b.height, bx: b && b.x, by: b && b.y };
    });
    // Posição relativa à ARENA: o tremor dos golpes fortes desloca a arena inteira (efeito desejado) e não pode contar como "descer".
    if (!window.__arena || !window.__arena.isConnected) window.__arena = [...document.querySelectorAll('div')].find((d) => d.style.width === '1280px' && d.style.height === '720px');
    const ar = window.__arena ? window.__arena.getBoundingClientRect() : { x: 0, y: 0 };
    const nums = [...document.querySelectorAll('[data-testid^="damage-number:"]')].map((el) => {
      const r0 = el.getBoundingClientRect();
      const r = { x: r0.x - ar.x, y: r0.y - ar.y, width: r0.width, height: r0.height };
      const txt = el.querySelector('div[dir]:last-child') || el.lastElementChild;
      return { id: el.id, kind: el.getAttribute('data-testid').split(':')[1], text: el.textContent, x: r.x, y: r.y, w: r.width, h: r.height, op: parseFloat(getComputedStyle(el).opacity), color: rgb(getComputedStyle(txt).color), size: parseFloat(getComputedStyle(txt).fontSize) };
    });
    if (flashes.length || nums.length) window.__samples.push({ t: now, flashes, nums });
    window.__raf = requestAnimationFrame(loop);
  };
  window.__raf = requestAnimationFrame(loop);
};

/** O HTML estático já tem os botões; a luta só roda depois de hidratar. A introdução ("ROUND 1") some sozinha quando o loop começa. */
async function waitHydrated(page) {
  await page.waitForFunction(() => !document.body.innerText.includes('ROUND 1'), null, { timeout: 30000 });
}

async function openBattle(browser, base, p2, extra = '', extraInit = null, p1 = 'dogge') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => !/NotAllowedError|play\(\) failed|React error #418/i.test(String(e)) && errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/favicon|404|Failed to load resource|#418/i.test(m.text()) && errors.push(m.text()));
  await page.addInitScript(SAMPLER);
  if (extraInit) await page.addInitScript(extraInit.fn, extraInit.arg);
  await page.goto(`${base}/battle?p1=${p1}&p2=${p2}&p2Control=cpu&stageKey=stage_1${extra}`, { waitUntil: 'load' });
  await page.getByText('FLASH', { exact: true }).waitFor({ timeout: 30000 });
  await waitHydrated(page);
  // PREEXISTENTE (também no código original, só na exportação web): com o oponente padrão (gadigago) a hidratação não remonta a tela e o
  // useWindowDimensions fica em 0x0, deixando a arena em scale(0). Um resize da janela DEPOIS de hidratar corrige; aqui só medimos e cutucamos.
  const zeroed = await page.evaluate(() => [...document.querySelectorAll('div')].some((d) => d.style.width === '1280px' && d.style.height === '720px' && /scale\(0\)/.test(d.style.transform)));
  if (zeroed) {
    globalThis.__zeroArena = (globalThis.__zeroArena || 0) + 1;
    await page.setViewportSize({ width: 1281, height: 720 });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(200);
  }
  return { ctx, page, errors };
}

/** Segura o botão ▶ por `ms` (o Dogge anda em direção ao oponente, que começa à direita). */
async function walkRight(page, ms) {
  const box = await page.getByText('▶', { exact: true }).boundingBox().catch(() => null);
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** Aperta os botões de ataque por `ms` milissegundos, andando até o oponente (a CPU contra-ataca sozinha). */
async function fightFor(page, ms, { strong = true } = {}) {
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < ms) {
    if (i % 3 === 1) await walkRight(page, 260);
    await page.getByText('FLASH', { exact: true }).click({ timeout: 1000, force: true }).catch(() => {});
    if (strong && i % 3 === 0) await page.getByText('FORTE', { exact: true }).click({ timeout: 1000, force: true }).catch(() => {});
    if (i % 9 === 0) await page.getByText('SUPER', { exact: true }).click({ timeout: 1000, force: true }).catch(() => {});
    await page.waitForTimeout(110);
    i++;
  }
}


/** Fração de pixels quase brancos (r,g,b > 235) de um PNG. */
async function whiteFraction(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let w = 0;
  for (let i = 0; i < data.length; i += 3) if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) w++;
  return w / (info.width * info.height);
}

/**
 * Roda na página (antes do jogo): congela o JOGO no instante em que o flash do OPONENTE entra no DOM. Intercepta o
 * requestAnimationFrame para que os quadros já agendados virem no-ops; o DOM fica parado com o flash real, na posição real,
 * e dá para fotografar sem corrida com os 130 ms do efeito. O oponente é identificado pela largura de desenho dele (drawWidth, ver Fighter.createFighter), com folga de 12% para a reação.
 */
const FREEZER = (expected) => {
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => { if (!window.__freeze) cb(t); });
  const watch = () => {
    new MutationObserver(() => {
      if (window.__freeze) return;
      for (const f of document.querySelectorAll('[data-testid="hit-flash"]')) {
        const w = f.parentElement.getBoundingClientRect().width;
        const k = Math.min(innerWidth / 1280, innerHeight / 720);
        if (w > 2 && Math.abs(w / k - expected) < expected * 0.12) { window.__freeze = true; window.__frozenFlash = f; window.__frozenW = w / k; return; }
      }
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) watch(); else document.addEventListener('DOMContentLoaded', watch);
};

/**
 * Prova VISUAL do flash: congela o jogo com o flash do oponente na tela, fotografa a caixa do sprite e mede quanto dela é
 * branco; depois esconde só o flash, fotografa de novo e mede o sprite normal (controle: a medição precisa distinguir os dois).
 */
async function visualFlash(browser, base, who, outDir) {
  // O lutador fotografado é `who`. Os que a CPU enfrenta bem são fotografados como OPONENTE do Dogge; o gadigago (ágil demais para o clicador cego) como JOGADOR contra um orc.
  const asPlayer = who === 'gadigago';
  const p2 = asPlayer ? 'orc' : who;
  const { ctx, page } = await openBattle(browser, base, p2, '', { fn: FREEZER, arg: DRAW_WIDTH[who] }, asPlayer ? 'gadigago' : 'dogge');
  const stop = { v: false };
  const clicker = (async () => {
    let n = 0;
    while (!stop.v) {
      if (n++ % 3 === 1) await walkRight(page, 260);
      await page.getByText('FLASH', { exact: true }).click({ timeout: 800, force: true }).catch(() => {});
      await page.getByText('FORTE', { exact: true }).click({ timeout: 800, force: true }).catch(() => {});
      await page.waitForTimeout(90);
    }
  })();
  const t0 = Date.now();
  while (Date.now() - t0 < 40000 && !(await page.evaluate(() => !!window.__freeze))) await page.waitForTimeout(100);
  stop.v = true;
  await clicker;
  if (process.env.DEBUG_VISUAL) console.log('      larguras de flash vistas:', JSON.stringify(await page.evaluate(() => { const m = {}; for (const s of window.__samples) for (const f of s.flashes) m[Math.round(f.w)] = (m[Math.round(f.w)] || 0) + 1; return m; })), 'congelou:', await page.evaluate(() => !!window.__freeze), 'texto:', (await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 90))));
  let out = null;
  const rectOk = await page.evaluate(() => !!window.__freeze && window.__frozenFlash.getBoundingClientRect().width > 2);
  if (rectOk) {
    const rect = await page.evaluate(() => { const r = window.__frozenFlash.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, op: parseFloat(getComputedStyle(window.__frozenFlash).opacity) }; });
    const clip = { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: Math.min(rect.w, 1280 - Math.max(0, rect.x)), height: Math.min(rect.h, 720 - Math.max(0, rect.y)) };
    const a = await page.screenshot({ clip });
    await page.evaluate(() => (window.__frozenFlash.style.display = 'none'));
    const b = await page.screenshot({ clip });
    out = { flash: await whiteFraction(a), normal: await whiteFraction(b), w: Math.round(rect.w), h: Math.round(rect.h), op: rect.op, fw: Math.round(await page.evaluate(() => window.__frozenW)) };
    if (outDir) { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, `flash-${who}-branco.png`), a); fs.writeFileSync(path.join(outDir, `flash-${who}-normal.png`), b); }
  }
  await ctx.close();
  return out;
}

const samplesOf = (page) => page.evaluate(() => window.__samples);
const framesOf = (page) => page.evaluate(() => window.__frames);

/** Episódios de flash: sequências contíguas (por quadro) em que há flash na tela, com tempo e opacidade. */
function flashEpisodes(samples) {
  const eps = [];
  let cur = null;
  for (const s of samples) {
    if (s.flashes.length) {
      if (!cur || s.t - cur.lastT > 40) {
        cur = { start: s.t, lastT: s.t, ops: [], boxes: [] };
        eps.push(cur);
      }
      cur.lastT = s.t;
      cur.ops.push(Math.max(...s.flashes.map((f) => f.op)));
      cur.boxes.push(...s.flashes);
    }
  }
  return eps.map((e) => ({ ...e, dur: e.lastT - e.start }));
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
console.log(`Servindo ${DIST} em ${base}${EXPECT_CRIT ? '  (build com crítico garantido, só para teste)' : ''}\n`);

try {
  // 1) Cada lutador: flash branco + números de dano + sem erros na página.
  const allNums = [];
  let flashDims = 0;
  for (const p2 of OPPONENTS) {
    const { ctx, page, errors } = await openBattle(browser, base, p2);
    await fightFor(page, 9000, { strong: true });
    const samples = await samplesOf(page);
    const eps = flashEpisodes(samples);
    if (eps.length === 0) {
      const diag = await page.evaluate(() => ({ quadros: window.__frames.length, texto: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160) }));
      console.log('      diagnóstico (0 acertos):', JSON.stringify(diag));
    }
    check(`[${p2}] flash branco apareceu ao levar golpe`, eps.length > 0, `${eps.length} episódios`);
    if (eps.length) {
      const longest = Math.max(...eps.map((e) => e.dur));
      check(`[${p2}] flash é rápido e some sozinho`, longest <= 260, `maior episódio ${longest.toFixed(0)} ms`);
      check(`[${p2}] flash começa forte e enfraquece`, eps.some((e) => e.ops[0] > 0.8 && e.ops.at(-1) < e.ops[0]), `ex.: ${eps[0].ops.map((o) => o.toFixed(2)).slice(0, 6).join(' → ')}`);
      const boxes = eps.flatMap((e) => e.boxes).filter((b) => b.bw);
      const maxDiff = boxes.length ? Math.max(...boxes.map((b) => Math.max(Math.abs(b.w - b.bw), Math.abs(b.h - b.bh), Math.abs(b.x - b.bx), Math.abs(b.y - b.by)))) : NaN;
      flashDims += boxes.length;
      check(`[${p2}] flash cobre exatamente a silhueta do sprite (qualquer tamanho)`, boxes.length > 0 && maxDiff <= 1.5, `${boxes.length} quadros, diferença máx ${Number.isNaN(maxDiff) ? 'n/a' : maxDiff.toFixed(2)} px`);
    }
    const nums = samples.flatMap((s) => s.nums);
    check(`[${p2}] números de dano apareceram`, nums.length > 0, `${nums.length} amostras`);
    allNums.push(...samples.map((s) => s.nums).filter((n) => n.length));
    check(`[${p2}] sem erros de JavaScript na página`, errors.length === 0, errors.slice(0, 2).join(' | '));
    (globalThis.__allSamples ||= []).push(samples);
    await ctx.close();
  }
  check('flash medido contra o sprite em vários quadros', flashDims > 20, `${flashDims} quadros`);

  // 1b) Prova visual do flash (pixels) em formatos bem diferentes: alto, estreito, largo e dragões.
  for (const p2 of process.env.VISUAL === 'none' ? [] : (process.env.VISUAL || 'gadigago,mystic,dogking,shadow_dragon,green_dragon').split(',')) {
    let r = null;
    for (let attempt = 0; attempt < 3 && !r; attempt++) r = await visualFlash(browser, base, p2, SHOTS); // a CPU pode derrubar o jogador antes do flash do oponente
    // Limite 15% (era 45%): a caixa do flash e o retangulo do quadro; os desenhos recriados (manto estreito do mystic, asas do dragao,
    // espada do dogking) ocupam bem menos que o retangulo. A cobertura exata e checada acima (diferenca <= 1.5 px) e o sprite normal fica ~0% branco.
    check(`[${p2}] o flash é a silhueta inteira em branco`, !!r && r.flash > 0.15, r ? `${(r.flash * 100).toFixed(0)}% branco numa caixa ${r.w}x${r.h} (opacidade ${r.op}; lutador de ${r.fw} px de largura)` : 'flash não capturado');
    check(`[${p2}] o sprite normal NÃO é branco (a medição distingue)`, !!r && r.normal < 0.15, r ? `${(r.normal * 100).toFixed(0)}% branco` : '');
  }

  // 2) Números de dano: vermelhos, sobem, somem, tamanho proporcional, sem sobreposição exata.
  const flat = allNums.flat();
  const reds = flat.filter((n) => n.color[0] > 150 && n.color[1] < 110 && n.color[2] < 110);
  check('números de dano são vermelhos', flat.length > 0 && reds.length / flat.length > 0.99, `${reds.length}/${flat.length}`);
  check('texto do número é um inteiro positivo', flat.every((n) => /^\d+$/.test(n.text.replace(/\D*(\d+)$/, '$1')) && parseInt(n.text.replace(/\D*(\d+)$/, '$1'), 10) >= 1));

  // Acompanha cada número individualmente (agrupando por proximidade entre quadros).
  const tracks = [];
  for (const samples of globalThis.__allSamples) {
    const byId = new Map();
    for (const s of samples) {
      for (const n of s.nums) {
        if (!byId.has(n.id)) byId.set(n.id, { id: n.id, kind: n.kind, pts: [] });
        byId.get(n.id).pts.push({ t: s.t, y: n.y + n.h / 2, op: n.op, h: n.h }); // centro: o estouro de escala mexe na borda de cima
      }
    }
    tracks.push(...byId.values());
  }
  // Só números que viveram a vida inteira: não foram cortados por troca de round, e o dano vermelho aparece desde o 1º quadro.
  const full = tracks.filter((k) => k.pts.length > 30 && k.pts.at(-1).op < 0.5);
  for (const k of full.filter((k) => k.pts[0].y - k.pts.at(-1).y < 25 || k.pts.some((p, i) => i && p.y > k.pts[i - 1].y + 1.5)).slice(0, 3)) {
    const ds = k.pts.map((p, i) => (i ? p.y - k.pts[i - 1].y : 0));
    const mi = ds.indexOf(Math.max(...ds));
    console.log('      número anômalo', k.id, k.kind, 'quadros', k.pts.length, `maior salto p/ baixo ${ds[mi].toFixed(1)} px no quadro ${mi} (t=${(k.pts[mi].t - k.pts[0].t).toFixed(0)} ms)`, 'y ao redor:', k.pts.slice(Math.max(0, mi - 3), mi + 3).map((p) => p.y.toFixed(1)).join(' '));
  }
  check('cada número sobe suavemente (nunca desce)', full.length > 0 && full.every((k) => k.pts.every((p, i) => i === 0 || p.y <= k.pts[i - 1].y + 1.5)), `${full.length} números acompanhados`);
  check('cada número sobe uma distância visível', full.every((k) => k.pts[0].y - k.pts.at(-1).y > 25), `ex.: ${full.slice(0, 3).map((k) => (k.pts[0].y - k.pts.at(-1).y).toFixed(0) + ' px').join(', ')}`);
  for (const k of full.filter((k) => !(k.pts.at(-1).op < 0.35 && k.pts.some((p) => p.op > 0.95))).slice(0, 2)) console.log('      não some direito:', k.id, k.kind, 'quadros', k.pts.length, 'duração', (k.pts.at(-1).t - k.pts[0].t).toFixed(0), 'ms, opacidade final', k.pts.at(-1).op.toFixed(2), 'máx', Math.max(...k.pts.map((p) => p.op)).toFixed(2));
  {
    const bad = full.filter((k) => !(k.pts.at(-1).op < 0.35 && k.pts.some((p) => p.op > 0.95)));
    check('cada número some gradualmente (opacidade cai até ~0); no máx. 3% cortados pelo teto de 8 números', bad.length / Math.max(1, full.length) <= 0.03, `${bad.length}/${full.length} fora do padrão; fim típico ${full.slice(0, 3).map((k) => k.pts.at(-1).op.toFixed(2)).join(', ')}`);
  }
  const lifes = full.map((k) => k.pts.at(-1).t - k.pts[0].t);
  check('número fica na tela entre 0,6 s e 1,4 s', lifes.every((l) => l > 600 && l < 1400), `${Math.min(...lifes).toFixed(0)}–${Math.max(...lifes).toFixed(0)} ms`);

  // Sobreposição: em nenhum quadro dois números têm o mesmo retângulo.
  let worst = Infinity;
  let pairs = 0;
  for (const g of allNums) {
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      pairs++;
      const dd = Math.hypot(g[i].x - g[j].x, g[i].y - g[j].y);
      if (dd < 1 && !globalThis.__dup) globalThis.__dup = [g[i], g[j]];
      worst = Math.min(worst, dd);
    }
  }
  if (globalThis.__dup) console.log('      par sobreposto:', JSON.stringify(globalThis.__dup.map((n) => ({ id: n.id, kind: n.kind, text: n.text, x: +n.x.toFixed(1), y: +n.y.toFixed(1), op: n.op }))));
  check('números simultâneos nunca ficam exatamente sobrepostos', pairs > 0 ? worst > 4 : true, pairs ? `${pairs} pares, menor distância ${worst.toFixed(1)} px` : 'sem pares simultâneos nesta rodada (cobertura pelo teste unitário)');

  // Tamanho proporcional à intensidade: o tamanho médio por tipo de golpe deve subir.
  const sizeBy = {};
  for (const n of flat) (sizeBy[n.kind] ||= []).push(n.size);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const kinds = Object.keys(sizeBy);
  console.log('      tamanhos médios por tipo:', kinds.map((k) => `${k}=${avg(sizeBy[k]).toFixed(1)}px (n=${sizeBy[k].length})`).join('  '));
  if (!EXPECT_CRIT) check('golpes comuns e fortes aparecem', kinds.includes('normal') && kinds.includes('strong'), kinds.join(', '));
  if (kinds.includes('normal') && kinds.includes('strong')) check('número do golpe FORTE é maior que o do comum', avg(sizeBy.strong) > avg(sizeBy.normal));
  if (EXPECT_CRIT) {
    check('golpe crítico apareceu (build de teste com crítico garantido)', kinds.includes('crit'), kinds.join(', '));
    const crit = flat.filter((n) => n.kind === 'crit');
    check('número crítico mostra o destaque "CRÍTICO!"', crit.length > 0 && crit.every((n) => /CR[IÍ]TICO!/.test(n.text)), crit[0]?.text);
    if (kinds.includes('strong') && sizeBy.crit) check('número crítico é maior que o do FORTE', avg(sizeBy.crit) > avg(sizeBy.strong));
  }

  // 3) Pausa: números e partículas congelam e voltam de onde pararam.
  {
    const { ctx, page, errors } = await openBattle(browser, base, 'orc');
    await fightFor(page, 4000);
    const pauseXY = await page.evaluate(() => {
      const gold = (d) => { const s = getComputedStyle(d); const r = d.getBoundingClientRect(); return s.backgroundColor === 'rgb(255, 215, 0)' && r.width > 3 && r.width < 14 && r.height > 10 && r.height < 40; };
      const btn = [...document.querySelectorAll('div')].find((d) => d.children.length === 2 && [...d.children].every(gold));
      if (!btn) return null;
      const r = btn.parentElement.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    check('botão de pausa encontrado', !!pauseXY);
    if (pauseXY) {
      await page.evaluate(() => (window.__samples.length = 0));
      await page.mouse.click(pauseXY.x, pauseXY.y);
      await page.getByText('PAUSADO', { exact: true }).waitFor({ timeout: 5000 });
      const snap1 = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="damage-number:"]')].map((e) => `${e.getBoundingClientRect().y.toFixed(1)}|${getComputedStyle(e).opacity}`));
      await page.waitForTimeout(1500);
      const snap2 = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="damage-number:"]')].map((e) => `${e.getBoundingClientRect().y.toFixed(1)}|${getComputedStyle(e).opacity}`));
      check('em pausa os números de dano ficam congelados', JSON.stringify(snap1) === JSON.stringify(snap2), `${snap1.length} números`);
      await page.getByText('CONTINUAR', { exact: true }).click();
      await page.waitForTimeout(1800);
      const after = await page.evaluate(() => document.querySelectorAll('[data-testid^="damage-number:"]').length);
      check('ao retomar os efeitos terminam e não ficam presos na tela', after <= 3, `${after} números`);
    }
    check('pausa sem erros de JavaScript', errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // 4) Regressão: uma luta completa chega ao fim (orc é o mais fraco), com tela final e sem travar.
  {
    const { ctx, page, errors } = await openBattle(browser, base, 'orc');
    const t0 = Date.now();
    let done = false;
    while (Date.now() - t0 < 120000 && !done) {
      await fightFor(page, 4000);
      done = await page.getByText('REVANCHE', { exact: true }).isVisible().catch(() => false);
    }
    check('a luta completa termina e mostra a tela final (REVANCHE)', done, `${((Date.now() - t0) / 1000).toFixed(0)} s`);
    const left = await page.evaluate(() => ({ nums: document.querySelectorAll('[data-testid^="damage-number:"]').length, flash: document.querySelectorAll('[data-testid="hit-flash"]').length }));
    check('nenhum flash/número preso na tela depois da luta', left.nums === 0 && left.flash === 0, JSON.stringify(left));
    if (done) {
      await page.getByText('REVANCHE', { exact: true }).click();
      await page.waitForTimeout(2500);
      const reset = await page.evaluate(() => document.querySelectorAll('[data-testid^="damage-number:"]').length);
      check('revanche começa limpa (sem números do round anterior)', reset === 0, `${reset}`);
    }
    check('luta completa sem erros de JavaScript', errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // 5) Desempenho no navegador (referência relativa: NÃO representa o Galaxy A14).
  for (const light of [false, true]) {
    const { ctx, page } = await openBattle(browser, base, 'dogking');
    if (light) {
      await page.evaluate(() => localStorage.setItem('meme_fighter_settings_v1', JSON.stringify({ lightMode: true })));
      await page.reload({ waitUntil: 'load' });
      await page.getByText('FLASH', { exact: true }).waitFor({ timeout: 30000 });
    }
    await page.waitForTimeout(1800);
    await page.evaluate(() => (window.__frames.length = 0));
    await fightFor(page, 8000);
    const fr = (await framesOf(page)).filter((d) => d < 1000);
    fr.sort((a, b) => a - b);
    const q = (p) => fr[Math.min(fr.length - 1, Math.floor(fr.length * p))];
    const maxParts = await page.evaluate(() => document.querySelectorAll('div[style*="border-radius"][style*="rgba("]').length);
    console.log(`      ${light ? 'MODO LEVE ' : 'NORMAL    '} quadros=${fr.length}  mediana=${q(0.5).toFixed(1)} ms  p95=${q(0.95).toFixed(1)} ms  máx=${fr.at(-1).toFixed(0)} ms`);
    check(`[${light ? 'modo leve' : 'normal'}] mediana de quadro razoável durante a luta (ref. navegador do servidor)`, q(0.5) < 40, `${q(0.5).toFixed(1)} ms`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (globalThis.__zeroArena) console.log(`\nNOTA: em ${globalThis.__zeroArena} carga(s) a arena veio com scale(0) da hidratação web (problema PREEXISTENTE, reproduzido no código original; corrigido aqui por um resize da janela).`);
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} verificações passaram${failed ? `, ${failed} FALHARAM` : ''}.`);
process.exit(failed ? 1 : 0);
