/**
 * Teste de navegador da rodada 3 (conta global, perfil, conquistas, Diamond Meme, derrota/reviver/checkpoint, câmbio).
 *   npx expo export --platform web --output-dir dist
 *   SHOTS_DIR=/tmp/shots node tests/e2e/conta/perfil-e-conquistas.e2e.mjs dist
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/npm-tools/node_modules/playwright');
const DIST = path.resolve(process.argv[2] || 'dist');
const SHOTS = process.env.SHOTS_DIR || '';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };
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
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); };
const account = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('meme_fighter_account_v1') || 'null'));

const findPause = (page) => page.evaluate(() => {
  const gold = (d) => { const st = getComputedStyle(d); const r = d.getBoundingClientRect(); return st.backgroundColor === 'rgb(255, 215, 0)' && r.width > 3 && r.width < 14 && r.height > 10 && r.height < 40; };
  const btn = [...document.querySelectorAll('div')].find((d) => d.children.length === 2 && [...d.children].every(gold));
  if (!btn) return null;
  const r = btn.parentElement.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => !/NotAllowedError|play\(\) failed|#418/i.test(String(e)) && errors.push(String(e)));

// ───── A) primeiro acesso: apelido ─────
await page.goto(`${base}/`, { waitUntil: 'load' });
await page.getByTestId('nickname-dialog').waitFor({ timeout: 30000 });
check(true, 'primeiro acesso pede o apelido');
await shot(page, '01_apelido');
await page.getByTestId('nickname-input').fill('Marcos');
await page.getByText('CONFIRMAR', { exact: true }).click();
await page.waitForTimeout(600);
check((await page.getByTestId('nickname-dialog').count()) === 0, 'diálogo some depois de confirmar');
let acc = await account(page);
check(acc?.nick === 'Marcos', 'apelido gravado na conta global', JSON.stringify(acc?.nick));
await page.getByTestId('achievement-toast').waitFor({ timeout: 5000 }).then(() => check(true, 'toast de conquista (BEM-VINDO AO REINO) aparece'), () => check(false, 'toast de conquista não apareceu'));
await shot(page, '02_menu_toast');
check(acc?.achievements && 'welcome' in acc.achievements && acc.diamonds === 1, 'conquista "welcome" rendeu 1 💎', `diamonds=${acc?.diamonds}`);
// recarrega: não pergunta de novo
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1500);
check((await page.getByTestId('nickname-dialog').count()) === 0, 'depois de escolher, não pergunta o apelido de novo');
check((await page.getByText('PERFIL', { exact: true }).count()) > 0, 'menu inicial tem a opção PERFIL');

// ───── B) tela de perfil ─────
await page.getByText('PERFIL', { exact: true }).first().click();
await page.getByTestId('profile-nick').waitFor({ timeout: 15000 });
check((await page.getByTestId('profile-nick').innerText()) === 'Marcos', 'perfil mostra o apelido');
check((await page.getByTestId('profile-diamonds').innerText()).includes('1'), 'perfil mostra os diamantes');
await shot(page, '03_perfil_info');
await page.getByTestId('profile-tab-ach').click();
await page.getByTestId('ach-count').waitFor();
const cnt = await page.getByTestId('ach-count').innerText();
check(/^1\/\d+/.test(cnt.trim()), 'aba conquistas mostra 1/N', cnt);
await shot(page, '04_conquistas');
await page.getByTestId('ach-filter-todo').click();
check((await page.getByTestId('ach-isl_gelo').count()) > 0, 'conquista NEVOU!! aparece entre as que faltam');
const iconInfo = await page.evaluate(() => { const i = document.querySelector('[data-testid="ach-icon-isl_gelo"]'); const im = i && (i.tagName === 'IMG' ? i : i.querySelector('img')); const els = i ? [i, ...i.querySelectorAll('*')] : []; const bg = els.map((e) => getComputedStyle(e).backgroundImage).find((b) => b && b !== 'none') || (i && i.querySelector('img') ? i.querySelector('img').src : ''); return { found: !!i, bg: bg ? bg.slice(0, 90) : '', style: i ? getComputedStyle(i).imageRendering : '' }; });
check(iconInfo.found && /assets\/achievements|achievements/.test(iconInfo.bg || '') && iconInfo.style === 'pixelated', 'NEVOU!! desenha a própria imagem pixel-art (16x16 ampliada sem borrar)', JSON.stringify(iconInfo));
check((await page.getByText('NEVOU!!', { exact: true }).count()) > 0 && (await page.getByText('Vá até a Ilha de Gelo.', { exact: true }).count()) > 0, 'NEVOU!! com a descrição pedida');
await page.getByTestId('profile-tab-look').click();
await page.getByTestId('tile-bg-solid_red').waitFor();
await page.getByTestId('tile-bg-solid_red').click();
await page.getByText('EQUIPAR', { exact: true }).first().click();
await page.waitForTimeout(400);
acc = await account(page);
check(acc.bg === 'solid_red', 'cor lisa é de graça e equipa', acc.bg);
await page.getByTestId('tile-avatar-gadigago').click();
await page.getByText('EQUIPAR', { exact: true }).first().click();
await page.waitForTimeout(300);
check((await account(page)).avatar === 'gadigago', 'Gadigago é ícone grátis');
await page.getByTestId('tile-avatar-orc').click();
await page.waitForTimeout(300);
check((await page.getByText('Libere este personagem primeiro.', { exact: true }).count()) > 0, 'ícone de personagem não liberado fica travado');
await page.getByTestId('tile-bg-fx_stars').click();
await page.getByText(/COMPRAR/).first().click();
await page.waitForTimeout(300);
check((await page.getByText('Diamond Meme insuficiente.', { exact: true }).count()) > 0, 'sem diamantes não compra fundo com efeito');
await shot(page, '05_visual');

// ───── C) compra com diamantes (conta com saldo + Orc liberado) ─────
await page.evaluate(() => {
  const a = JSON.parse(localStorage.getItem('meme_fighter_account_v1'));
  a.diamonds = 300;
  localStorage.setItem('meme_fighter_account_v1', JSON.stringify(a));
  localStorage.setItem('meme_fighter_roster_v1', JSON.stringify({ unlocked: ['dogge', 'gadigago', 'orc'] }));
});
await page.goto(`${base}/profile`, { waitUntil: 'load' });
await page.getByTestId('profile-tab-look').click();
await page.getByTestId('tile-avatar-orc').click();
await page.getByText(/COMPRAR/).first().click();
await page.waitForTimeout(300);
await page.getByTestId('tile-bg-fx_stars').click();
await page.getByText(/COMPRAR/).first().click();
await page.waitForTimeout(300);
await page.getByTestId('tile-frame-frame_gold').click();
await page.getByText(/COMPRAR/).first().click();
await page.waitForTimeout(400);
acc = await account(page);
check(acc.avatarsOwned.includes('orc') && acc.avatar === 'orc', 'comprou e equipou o ícone do Orc (liberado + diamantes)', acc.avatar);
check(acc.bgOwned.includes('fx_stars') && acc.bg === 'fx_stars', 'comprou fundo com efeito', acc.bg);
check(acc.framesOwned.includes('frame_gold') && acc.frame === 'frame_gold', 'comprou moldura', acc.frame);
check(acc.diamonds < 300 && acc.diamonds > 100, 'diamantes foram gastos', String(acc.diamonds));
check(['buy_avatar', 'buy_bg', 'buy_frame'].every((k) => k in acc.achievements), 'conquistas de compra saíram');
await shot(page, '06_visual_comprado');
// meme/amigo NÃO jogável: compra direta, sem ter sido encontrado nem liberado
await page.getByTestId('tile-avatar-npc_azulao').scrollIntoViewIfNeeded();
await page.getByTestId('tile-avatar-npc_azulao').click();
await page.getByText(/COMPRAR/).first().click();
await page.waitForTimeout(300);
acc = await account(page);
check(acc.avatarsOwned.includes('npc_azulao') && acc.avatar === 'npc_azulao', 'meme não jogável (Azulão) compra direto, sem liberar', acc.avatar);
await page.getByTestId('tile-avatar-npc_bento').scrollIntoViewIfNeeded();
await shot(page, '06b_visual_memes');
await page.getByTestId('profile-tab-info').click();
await page.getByTestId('fav-orc').click();
await page.waitForTimeout(300);
check((await account(page)).favorite === 'orc', 'favorito: só aparece/aceita personagem liberado (Orc)');
check((await page.getByTestId('fav-tank').count()) === 0, 'personagem não liberado não aparece como favorito');
await shot(page, '07_perfil_final');

// ───── D) skins/conta sobrevivem a apagar save ─────
await page.evaluate(() => {
  const a = JSON.parse(localStorage.getItem('meme_fighter_account_v1'));
  a.cosmetics = ['skin_gelo', 'hat_crown'];
  a.diamonds = 20;
  localStorage.setItem('meme_fighter_account_v1', JSON.stringify(a));
});
await page.goto(`${base}/slots`, { waitUntil: 'load' });
await page.getByText('NOVO MUNDO', { exact: true }).first().click({ timeout: 30000 });
await page.getByText('CRIAR E JOGAR', { exact: true }).click({ timeout: 10000 });
await page.getByText('PULAR TUTORIAL ›').first().click({ timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
let slot = await page.evaluate(() => JSON.parse(localStorage.getItem('meme_fighter_slot_1_v2')));
check(slot?.ext?.cosmetics?.owned?.includes('skin_gelo'), 'mundo NOVO já enxerga a skin da conta (valem em todos os saves)', JSON.stringify(slot?.ext?.cosmetics));
acc = await account(page);
check(acc.stats.worlds_created >= 1 && 'first_world' in acc.achievements, 'criar mundo conta para a conquista NOVO MUNDO');
await page.evaluate(() => localStorage.removeItem('meme_fighter_slot_1_v2')); // "apaga" o save 1
await page.goto(`${base}/`, { waitUntil: 'load' });
await page.waitForTimeout(800);
acc = await account(page);
check(acc.cosmetics.includes('skin_gelo') && acc.cosmetics.includes('hat_crown') && acc.nick === 'Marcos', 'apagar o save 1 não apaga skins, apelido nem diamantes', `cosmetics=${acc.cosmetics}`);

// ───── E) derrota: reviver com diamantes + taxa + checkpoint ─────
await page.goto(`${base}/slots`, { waitUntil: 'load' });
await page.getByText('NOVO MUNDO', { exact: true }).first().click({ timeout: 30000 });
await page.getByText('CRIAR E JOGAR', { exact: true }).click({ timeout: 10000 });
await page.getByText('PULAR TUTORIAL ›').first().click({ timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
{ // salva uma vez só para descobrir onde é o início do mundo (o save novo ainda não tem posição)
  const xy = await findPause(page);
  if (xy) { await page.mouse.click(xy.x, xy.y); await page.getByText('SALVAR E SAIR', { exact: false }).click(); await page.waitForTimeout(2500); }
}
await page.evaluate(() => {
  const k = 'meme_fighter_slot_1_v2';
  const d = JSON.parse(localStorage.getItem(k));
  d.playerState.coins = 5; // taxa maior que o saldo: deve ficar NEGATIVO
  d.ext = { ...(d.ext || {}), storyHp: { hp: 0.05 }, checkpoint: { point: { x: d.player.x + 64, y: d.player.y } } }; // checkpoint 2 blocos ao lado da vila
  localStorage.setItem('__spawn', JSON.stringify({ x: d.player.x, y: d.player.y }));
  localStorage.setItem(k, JSON.stringify(d));
  const a = JSON.parse(localStorage.getItem('meme_fighter_account_v1'));
  a.diamonds = 10;
  localStorage.setItem('meme_fighter_account_v1', JSON.stringify(a));
});
await page.goto(`${base}/slots`, { waitUntil: 'load' });
await page.getByText('JOGAR', { exact: true }).first().click({ timeout: 30000 });
await page.waitForTimeout(2500);
await page.evaluate(() => { history.pushState({}, '', '/battle?p1=dogge&p2Control=cpu&bossId=boss_sahur'); window.dispatchEvent(new PopStateEvent('popstate', { state: {} })); });
await page.getByText('FLASH', { exact: true }).waitFor({ timeout: 20000 });
// o jogador não age: a CPU vence 2 rounds; o 2º nocaute abre a tela de derrota
await page.getByTestId('defeat-overlay').waitFor({ timeout: 150000 });
check(true, 'perder a luta de história abre a tela de derrota (fase "downed")');
await page.waitForTimeout(400);
await shot(page, '08_derrota_anim');
await page.getByText('REVIVER', { exact: false }).first().waitFor({ timeout: 8000 });
check((await page.getByText(/Taxa de derrota/).count()) > 0, 'mostra a taxa de derrota em Meme Coins');
check((await page.getByText(/dívida/).count()) > 0, 'taxa maior que o saldo: avisa que vai ficar em dívida (saldo negativo)');
await shot(page, '09_derrota_escolha');
await page.getByText(/REVIVER/).first().click();
await page.getByTestId('rebirth-text').waitFor({ timeout: 4000 });
check(true, 'animação de renascimento (RENASCEU!)');
await page.waitForTimeout(500);
await shot(page, '10_renascimento');
await page.waitForTimeout(1600);
check((await page.getByTestId('defeat-overlay').count()) === 0, 'depois do renascimento a tela some e a luta continua');
acc = await account(page);
check(acc.diamonds === 7 + 2 && acc.stats.revives === 1 && 'revive_1' in acc.achievements, 'reviver custou 3 💎 (+2 💎 da conquista RENASCIDO) e contou como renascimento', `diamonds=${acc.diamonds} revives=${acc.stats.revives}`);
const p1bar = await page.evaluate(() => [...document.querySelectorAll('div')].filter((d) => { const r = d.getBoundingClientRect(); return /%$/.test(d.style.width || '') && r.x < 330 && r.y < 100 && Math.round(r.height) === 12; }).map((d) => parseFloat(d.style.width)));
check(p1bar.some((w) => w >= 90), 'voltou com ~100% de vida', JSON.stringify(p1bar));
check((await page.getByText('FLASH', { exact: true }).count()) > 0, 'controles de luta continuam (mesmo estado da luta)');
// morre de novo: agora recusa a derrota
// 2ª derrota: ou o nocaute abre a tela de derrota (aceita), ou o tempo do round acaba e a luta termina direto na tela final
await page.getByTestId('defeat-overlay').or(page.getByTestId('death-fee')).first().waitFor({ timeout: 170000 });
if ((await page.getByTestId('defeat-overlay').count()) > 0) {
  await page.getByText('ACEITAR A DERROTA', { exact: true }).waitFor({ timeout: 8000 });
  await page.getByText('ACEITAR A DERROTA', { exact: true }).click();
}
await page.getByTestId('death-fee').waitFor({ timeout: 15000 });
const feeText = await page.getByTestId('death-fee').innerText();
check(/Taxa de derrota: -\d+/.test(feeText) && /Saldo: -\d+/.test(feeText), 'derrota aceita: taxa cobrada e saldo NEGATIVO', feeText);
acc = await account(page);
check(acc.stats.deaths === 1 && acc.stats.debt_events === 1 && 'death_1' in acc.achievements && 'debt' in acc.achievements && 'revive_1' in acc.achievements, 'conquistas ISSO FOI DE PROPÓSITO / NO VERMELHO / RENASCIDO');
check((await page.getByText('TENTAR DE NOVO', { exact: true }).count()) === 0, 'tela de derrota NÃO tem "TENTAR DE NOVO" (só voltar ao checkpoint)');
await shot(page, '11_derrota_final');
await page.getByText('VOLTAR AO CHECKPOINT', { exact: true }).click();
await page.waitForTimeout(1200);
// a rota da luta foi aberta por pushState (o roteador não empilhou): se o router.back() não saiu, volta pelo histórico
if ((await page.getByText('DERROTA...', { exact: true }).count()) > 0) await page.evaluate(() => history.back());
await page.getByText('Você voltou ao último cais (checkpoint).', { exact: false }).waitFor({ timeout: 15000 }).then(() => check(true, 'volta ao mundo e avisa que voltou ao checkpoint'), () => check(false, 'aviso de checkpoint não apareceu'));
await shot(page, '12_mundo_checkpoint');

// ───── F) câmbio no menu de pausa ─────
const pauseXY = await findPause(page);
check(!!pauseXY, 'botão de pausa encontrado no mundo');
if (pauseXY) {
  await page.mouse.click(pauseXY.x, pauseXY.y);
  await page.getByText('PAUSADO', { exact: true }).waitFor({ timeout: 5000 });
  await page.getByText('CÂMBIO 💎', { exact: true }).click();
  await page.getByTestId('exchange-panel').waitFor({ timeout: 3000 });
  await shot(page, '13_cambio');
  const before = (await account(page)).diamonds;
  await page.getByText('1 💎  →  100 MC', { exact: true }).click();
  await page.waitForTimeout(400);
  acc = await account(page);
  check(acc.diamonds === before - 1 + 1 && acc.stats.exchanges === 1 && 'exchange' in acc.achievements, 'câmbio gastou 1 💎 (e a conquista CÂMBIO DO MEME devolveu +1 💎) e entregou 100 MC', `diamonds ${before} -> ${acc.diamonds}`);
  check((await page.getByText(/Moedas recebidas/).count()) > 0, 'aviso de moedas recebidas');
}
if (pauseXY) {
  await page.getByText('VOLTAR', { exact: true }).click(); // sai do câmbio, volta ao menu de pausa
  await page.getByText('SALVAR E SAIR', { exact: false }).click();
  await page.waitForTimeout(2500);
  const slotNow = await page.evaluate(() => JSON.parse(localStorage.getItem('meme_fighter_slot_1_v2')));
  const spawn = await page.evaluate(() => JSON.parse(localStorage.getItem('__spawn')));
  check(Math.abs(slotNow.player.x - (spawn.x + 64)) < 3 && Math.abs(slotNow.player.y - spawn.y) < 3, 'derrota levou o jogador ao checkpoint (posição salva = checkpoint)', JSON.stringify({ spawn, player: slotNow.player }));
  check(slotNow.ext.checkpoint?.point?.x === spawn.x + 64, 'checkpoint fica no save');
  check(slotNow.playerState.coins >= 100 - 25 - 30 - 1, 'moedas do câmbio entraram no mundo (dívida paga primeiro)', String(slotNow.playerState.coins));
}
check(errors.length === 0, 'sem erros de JavaScript no fluxo todo', errors.slice(0, 3).join(' | '));

await browser.close();
server.close();
console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
