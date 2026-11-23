/**
 * Interface do modo história (layout novo) e movimento em UMA direção por vez. `node tests/unit/historia/interface-e-movimento.test.mjs`
 */
import { createRequire } from 'node:module';
import Module from 'node:module';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const stub = () => new Proxy(function () {}, { get: (t, p) => (p === '__esModule' ? true : p === 'default' ? stub() : p === Symbol.toPrimitive ? () => 0 : stub()), apply: () => stub() });
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (/^(react-native|expo|@expo|react-native-)/.test(req) || req === 'react') return stub();
  if (req === '@react-native-async-storage/async-storage') return { __esModule: true, default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } };
  return origLoad.call(this, req, ...rest);
};
require('../../_support/ts-register.cjs');
const { resolveSingleAxis } = require('../../../src/game/input/useDirectionalInput.ts');
const read = (p) => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
const png = (rel) => { const b = fs.readFileSync(new URL(`../../../${rel}`, import.meta.url)); assert.equal(b.slice(1, 4).toString(), 'PNG', rel); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] }; };

// ---- simulação de quem segura botões (como o hook faz) ----
function pad() {
  let held = [];
  let state = resolveSingleAxis(held);
  return {
    press(k) { held = [...held.filter((x) => x !== k), k]; state = resolveSingleAxis(held); return state; },
    release(k) { held = held.filter((x) => x !== k); state = resolveSingleAxis(held); return state; },
    get state() { return state; },
  };
}
const dirs = (s) => ['up', 'down', 'left', 'right'].filter((k) => s[k]);

describe('anda em UMA direção por vez (sem diagonal)', () => {
  it('um botão: anda nessa direção', () => {
    const p = pad();
    for (const k of ['up', 'down', 'left', 'right']) { assert.deepEqual(dirs(p.press(k)), [k]); p.release(k); }
  });
  it('dois botões juntos: vale só o último apertado, nunca os dois', () => {
    const p = pad();
    p.press('up');
    assert.deepEqual(dirs(p.press('right')), ['right']);
    assert.deepEqual(dirs(p.press('left')), ['left']);
  });
  it('soltou o último: volta a valer o anterior que ainda está segurado; soltou tudo: para', () => {
    const p = pad();
    p.press('up'); p.press('right');
    assert.deepEqual(dirs(p.release('right')), ['up']);
    assert.deepEqual(dirs(p.release('up')), []);
  });
  it('soltar um botão que não é o ativo não muda a direção', () => {
    const p = pad();
    p.press('up'); p.press('left');
    assert.deepEqual(dirs(p.release('up')), ['left']);
  });
  it('em NENHUMA combinação há dois eixos ativos ao mesmo tempo (força bruta)', () => {
    const keys = ['up', 'down', 'left', 'right'];
    let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const p = pad();
    for (let i = 0; i < 5000; i++) {
      const k = keys[Math.floor(rnd() * 4)];
      const s = rnd() < 0.5 ? p.press(k) : p.release(k);
      assert.ok(dirs(s).length <= 1, JSON.stringify(s));
    }
  });
  it('o hook usa isso no toque E no teclado, e o mundo, os interiores e o mergulho usam o hook', () => {
    const h = read('src/game/input/useDirectionalInput.ts');
    assert.match(h, /Object\.assign\(stateRef\.current, resolveSingleAxis\(heldRef\.current\)\)/);
    assert.equal((h.match(/setPressed\(dir, (true|false)\)/g) || []).length, 2);
    for (const f of ['src/screens/WorldScreen.tsx', 'src/game/world/InteriorOverlay.tsx', 'src/game/dive/DiveOverlay.tsx']) assert.match(read(f), /useDirectionalInput/, f);
  });
});

describe('arte da interface nova (recortada do layout enviado)', () => {
  it('todas as peças existem como PNG com transparência e o registro aponta para elas', () => {
    const art = read('src/game/hud/hudArt.ts');
    for (const n of ['bar_red', 'bar_blue', 'pause', 'coin', 'gem', 'dpad_up', 'dpad_left', 'dpad_right', 'dpad_down']) {
      const d = png(`assets/ui/hud/${n}.png`);
      assert.ok(d.w >= 20 && d.h >= 15, n);
      assert.equal(d.colorType === 6 || d.colorType === 3, true, `${n} precisa de canal alfa ou paleta`);
      assert.match(art, new RegExp(`${n}: require\\('\\.\\./\\.\\./\\.\\./assets/ui/hud/${n}\\.png'\\)`));
    }
  });
  it('os 4 botões do direcional têm o mesmo tamanho (cruz simétrica)', () => {
    const s = ['up', 'left', 'right', 'down'].map((n) => png(`assets/ui/hud/dpad_${n}.png`));
    for (const d of s) { assert.ok(Math.abs(d.w - s[0].w) <= 3 && Math.abs(d.h - s[0].h) <= 3); }
  });
  it('barra vermelha (vida) e azul (energia) são faixas largas', () => {
    assert.ok(png('assets/ui/hud/bar_red.png').w / png('assets/ui/hud/bar_red.png').h > 8);
    assert.ok(png('assets/ui/hud/bar_blue.png').w / png('assets/ui/hud/bar_blue.png').h > 12);
  });
});

describe('o HUD do mundo segue o layout da imagem', () => {
  const w = read('src/screens/WorldScreen.tsx');
  it('barra vermelha e azul no topo à esquerda, MISSÃO logo abaixo', () => {
    assert.match(w, /<HudBar art="bar_red"/);
    assert.match(w, /<HudBar art="bar_blue"/);
    const iBars = w.indexOf('<HudBar art="bar_blue"');
    const iMission = w.indexOf('<MissionHud top={insets.top + 74}');
    assert.ok(iBars > 0 && iMission > iBars, 'MISSÃO vem depois das barras');
  });
  it('pausa no centro de cima, mapa à direita com moedas e diamantes embaixo', () => {
    assert.match(w, /<PauseButton/);
    assert.match(read('src/game/input/controlsLayout.ts'), /pause: \{ cx: W \/ 2, cy: insets\.top \+ 58 \}/);
    const iMap = w.indexOf('<Minimap playerChunkX');
    const iCoin = w.indexOf('<CurrencyPill kind="coin"');
    const iGem = w.indexOf('<CurrencyPill kind="gem"');
    assert.ok(iMap > 0 && iCoin > iMap && iGem > iCoin, 'mapa, depois moedas, depois diamantes');
    assert.match(w, /value=\{account\.diamonds\}/);
    assert.match(w, /<CurrencyPill kind="coin" value=\{coins\}/);
  });
  it('o antigo selo de moedas em texto saiu e a vida/energia continuam animadas pelos mesmos valores', () => {
    assert.ok(!/styles\.coinPill/.test(w));
    assert.match(w, /fillStyle=\{healthBarStyle\}/);
    assert.match(w, /fillStyle=\{energyBarStyle\}/);
  });
  it('a ordem dos controles não mudou: cruz à esquerda e flor de ações à direita', () => {
    const c = read('src/game/input/controlsLayout.ts');
    assert.match(c, /up: c\(step, 0\),\s*left: c\(0, step\),\s*right: c\(step \* 2, step\),\s*down: c\(step, step \* 2\),/);
    assert.match(c, /flash: a\('flash'\),\s*shield: a\('shield'\),\s*strong: a\('strong'\),\s*super: a\('super'\),\s*aura: a\('aura'\),\s*item: a\('item'\),/);
  });
  it('o direcional e a pausa usam a arte nova; recolorir o botão ainda funciona', () => {
    const d = read('src/game/input/DPad.tsx');
    assert.match(d, /HUD_ART\[`dpad_\$\{dKey\}`\]/);
    assert.match(d, /withAlpha\(color, 0\.35\)/);
    const p = read('src/game/menu/PauseMenu.tsx');
    assert.match(p, /HUD_ART\.pause/);
    assert.match(p, /if \(!rect\.layout\.color\)/);
  });
  it('a luta usa o mesmo direcional (arte nova), mas SEM a regra de uma direção: pular e andar juntos continuam valendo', () => {
    const b = read('src/screens/BattleScreen.tsx');
    assert.match(b, /import \{ DPad \} from '@\/game\/input\/DPad'/);
    assert.ok(!/useDirectionalInput/.test(b));
  });
});
