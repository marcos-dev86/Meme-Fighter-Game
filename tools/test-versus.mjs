/**
 * Testes da Parte 4: VERSUS estilo Mortal Kombat (grade de seleção, tela "VS", letreiro ROUND/FIGHT).
 * Lógica pura no Node: `node tools/test-versus.mjs`. A parte visual é conferida no navegador em tools/e2e-versus.mjs.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('./ts-register.cjs');
const V = require('../src/game/versus/versusLogic.ts');
const R = require('../src/game/versus/fighterRegistry.ts');
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const exists = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));
const ROSTER = [...read('src/game/state/rosterState.ts').matchAll(/\{ key: '([a-z_]+)', unlock/g)].map((m) => m[1]);

describe('cursor da grade', () => {
  it('17 lutadores = grade de 4 colunas', () => {
    assert.equal(ROSTER.length, 17);
    assert.equal(V.GRID_COLS, 4);
  });
  it('anda nas 4 direções e dá a volta nas bordas', () => {
    assert.equal(V.moveCursor(5, 'right', 16), 6);
    assert.equal(V.moveCursor(5, 'left', 16), 4);
    assert.equal(V.moveCursor(5, 'down', 16), 9);
    assert.equal(V.moveCursor(5, 'up', 16), 1);
    assert.equal(V.moveCursor(3, 'right', 16), 0);
    assert.equal(V.moveCursor(0, 'left', 16), 3);
    assert.equal(V.moveCursor(1, 'up', 16), 13);
    assert.equal(V.moveCursor(13, 'down', 16), 1);
  });
  it('nunca sai do intervalo, em qualquer tamanho e a partir de qualquer célula', () => {
    for (const total of [1, 2, 5, 7, 16, 17]) {
      for (let i = 0; i < total; i++) for (const d of ['left', 'right', 'up', 'down']) {
        const n = V.moveCursor(i, d, total);
        assert.ok(Number.isInteger(n) && n >= 0 && n < total, `${total}/${i}/${d}=${n}`);
      }
    }
  });
  it('última linha incompleta: cai na célula existente mais próxima da coluna', () => {
    assert.equal(V.moveCursor(3, 'down', 6), 5); // 6 itens: linha 2 tem só 2 células (4,5); coluna 3 -> 5
    assert.equal(V.moveCursor(5, 'right', 6), 4);
    assert.equal(V.moveCursor(4, 'left', 6), 5);
  });
  it('sem lutadores: índice 0 e nada quebra', () => {
    assert.equal(V.moveCursor(3, 'right', 0), 0);
  });
  it('escolha só vale dentro do conjunto permitido; cursor inicial = primeiro permitido', () => {
    assert.equal(V.canPick('dogge', ['dogge', 'gadigago']), true);
    assert.equal(V.canPick('orc', ['dogge', 'gadigago']), false);
    assert.equal(V.firstPickable(['orc', 'dogge'], ['dogge']), 1);
    assert.equal(V.firstPickable(['orc'], []), 0);
  });
});

describe('grade escalável (qualquer quantidade, qualquer tela)', () => {
  const SIZES = [[300, 150], [360, 200], [640, 320], [800, 360], [1280, 560], [2000, 900]];
  const TOTALS = [1, 2, 3, 7, 16, 17, 25, 40, 100];
  it('células nunca menores que 48 px (toque confortável) nem maiores que o máximo, e a grade nunca passa da largura', () => {
    for (const n of TOTALS) for (const [w, h] of SIZES) {
      const g = V.gridLayout(n, w, h);
      assert.ok(g.tile >= Math.min(V.MIN_TILE, Math.floor(Math.max(w, V.MIN_TILE + 6) / g.cols) - 6) && g.tile <= V.MAX_TILE, `${n}@${w}x${h} tile=${g.tile}`);
      assert.ok(g.cols * (g.tile + 6) <= Math.max(w, V.MIN_TILE + 6), `${n}@${w}x${h} estoura a largura`);
      assert.equal(g.rows, Math.ceil(n / g.cols));
      assert.ok(g.cols * g.rows >= n);
    }
  });
  it('sem rolagem a grade cabe inteira na altura; com rolagem a célula fica no mínimo', () => {
    for (const n of TOTALS) for (const [w, h] of SIZES) {
      const g = V.gridLayout(n, w, h);
      if (!g.scroll) assert.ok(g.rows * (g.tile + 6) <= Math.max(h, V.MIN_TILE + 6), `${n}@${w}x${h}`);
      else assert.ok(g.tile <= V.MIN_TILE);
    }
  });
  it('16 lutadores em tela larga: células grandes e poucas linhas; 100 lutadores numa tela pequena: rola', () => {
    const big = V.gridLayout(16, 800, 360);
    assert.ok(big.tile >= 60 && !big.scroll, JSON.stringify(big));
    assert.equal(V.gridLayout(100, 300, 150).scroll, true);
    assert.equal(V.gridLayout(1, 300, 150).cols, 1);
  });
  it('cursor funciona para qualquer quantidade/colunas', () => {
    for (const n of [1, 3, 17, 40]) for (const cols of [1, 2, 3, 5, 8]) for (let i = 0; i < n; i++) for (const d of ['left', 'right', 'up', 'down']) {
      const m = V.moveCursor(i, d, n, cols);
      assert.ok(m >= 0 && m < n, `${n}/${cols}/${i}/${d}=${m}`);
    }
  });
});

describe('registro de lutadores', () => {
  const reg = R.getFighterRegistry();
  it('uma entrada por lutador do elenco, sem repetição, com nome, ícone e retrato', () => {
    assert.equal(reg.length, ROSTER.length);
    assert.equal(new Set(reg.map((e) => e.key)).size, reg.length);
    for (const e of reg) {
      assert.ok(e.name && e.name.length > 0, e.key);
      assert.ok(e.avatar && e.portrait, e.key);
      assert.ok(e.portraitAspect > 0.1 && e.portraitAspect < 10, e.key);
      assert.ok(e.unlock && e.unlock.kind, e.key);
    }
  });
  it('barras de vida/velocidade/força entre 0,15 e 1 e o maior de cada uma chega a 1 (valores vêm do createFighter real)', () => {
    for (const s of ['health', 'speed', 'force']) {
      const v = reg.map((e) => e.stats[s]);
      assert.ok(v.every((x) => x >= 0.15 && x <= 1), s);
      assert.equal(Math.max(...v), 1, s);
    }
  });
  it('normalizeStats aceita qualquer quantidade (inclusive 1) sem dividir por zero', () => {
    for (const n of [1, 2, 30]) {
      const out = R.normalizeStats(Array.from({ length: n }, (_, i) => ({ health: 50 + i, speed: 3, force: 10 })));
      assert.equal(out.length, n);
      for (const o of out) for (const k of ['health', 'speed', 'force']) assert.ok(Number.isFinite(o[k]));
    }
  });
});

describe('tela VS (linha do tempo)', () => {
  it('começa com os lutadores fora da tela, sem VS, e termina "done"', () => {
    const a = V.splashFrame(0);
    assert.equal(a.slide, 0); assert.equal(a.vsScale, 0); assert.equal(a.flash, 0); assert.equal(a.done, false);
    const z = V.splashFrame(V.SPLASH_MS);
    assert.equal(z.done, true); assert.equal(z.fadeOut, 1); assert.equal(z.slide, 1);
  });
  it('os lutadores chegam ao lugar antes da batida do VS; o VS estoura e assenta em 1', () => {
    assert.ok(V.SPLASH_T.slideEnd <= V.SPLASH_T.vsHit);
    assert.equal(V.splashFrame(V.SPLASH_T.slideEnd).slide, 1);
    const peak = Math.max(...Array.from({ length: 40 }, (_, i) => V.splashFrame(V.SPLASH_T.vsHit + i * 8).vsScale));
    assert.ok(peak > 1.2 && peak <= 1.4, String(peak));
    assert.ok(Math.abs(V.splashFrame(V.SPLASH_T.vsHit + 400).vsScale - 1) < 1e-9);
  });
  it('clarão só na batida e some logo; nomes entram depois; saída só no fim', () => {
    assert.equal(V.splashFrame(V.SPLASH_T.vsHit - 1).flash, 0);
    assert.ok(V.splashFrame(V.SPLASH_T.vsHit).flash > 0.9);
    assert.equal(V.splashFrame(V.SPLASH_T.vsHit + 300).flash, 0);
    assert.equal(V.splashFrame(V.SPLASH_T.namesIn - 1).names, 0);
    assert.equal(V.splashFrame(V.SPLASH_T.namesIn + 400).names, 1);
    assert.equal(V.splashFrame(V.SPLASH_T.holdEnd - 1).fadeOut, 0);
  });
  it('tempo total curto (menos de 3 s) e valores sempre finitos, com tempo negativo ou enorme', () => {
    assert.ok(V.SPLASH_MS >= 2000 && V.SPLASH_MS < 3000);
    for (const t of [-500, 0, 1, 999, 2599, 2600, 10 ** 7]) {
      const f = V.splashFrame(t);
      for (const k of ['slide', 'vsScale', 'flash', 'names', 'fadeOut']) assert.ok(Number.isFinite(f[k]) && f[k] >= 0, `${t}/${k}`);
    }
  });
});

describe('letreiro da abertura do round', () => {
  it('"ROUND n" na maior parte e "FIGHT!" nos últimos instantes da abertura (1400 ms)', () => {
    const intro = Number(/const INTRO_MS = (\d+)/.exec(read('src/screens/BattleScreen.tsx'))[1]);
    assert.ok(V.FIGHT_MS > 0 && V.FIGHT_MS < intro / 2);
    assert.equal(V.introLabel(intro), 'round');
    assert.equal(V.introLabel(V.FIGHT_MS + 1), 'round');
    assert.equal(V.introLabel(V.FIGHT_MS), 'fight');
    assert.equal(V.introLabel(0), 'fight');
  });
});

describe('integração (código-fonte)', () => {
  const vs = read('src/screens/VersusScreen.tsx');
  const battle = read('src/screens/BattleScreen.tsx');
  it('arquivos da tela existem e usam só assets que já existem', () => {
    for (const f of ['src/game/versus/FighterSelect.tsx', 'src/game/versus/VersusSplash.tsx', 'src/game/versus/versusLogic.ts', 'src/game/versus/fighterRegistry.ts']) assert.ok(exists(f), f);
    for (const k of ROSTER) {
      assert.ok(exists(`assets/avatars/${k}.png`), `avatar ${k}`);
      assert.ok(exists(`assets/sprites-v2/${k}/portrait.png`), `portrait ${k}`);
    }
    for (const s of ['encounter', 'hit_heavy', 'ui_hover', 'ui_confirm', 'ui_denied', 'ui_back']) assert.ok(exists(`assets/audio/sfx/${s}.mp3`), s);
  });
  it('seleção: logo no centro, prévia à esquerda e confirmação só no segundo toque', () => {
    const fs_ = read('src/game/versus/FighterSelect.tsx');
    assert.match(fs_, /game-logo-gold\.png/);
    assert.match(fs_, /armed && i === cursor/); // só confirma se já estava selecionado
    assert.ok(fs_.indexOf('testID="vs-preview"') < fs_.indexOf('testID="vs-slot"'), 'prévia antes (à esquerda) do espaço do P1');
    assert.doesNotMatch(fs_, /onHover|onMouseEnter|onPointerEnter/);
    assert.match(fs_, /entries\?: FighterEntry\[\]/);
  });
  it('VersusScreen: troca "PRÓXIMO" por grade + tela VS, e a tela VS só empurra a luta uma vez (voltar da luta não repete)', () => {
    assert.match(vs, /FighterSelect/);
    assert.match(vs, /VersusSplash/);
    assert.match(vs, /setStep\('items'\)[\s\S]{0,80}router\.push|router\.push[\s\S]{0,400}/);
    assert.doesNotMatch(vs, /CharacterPicker/);
  });
  it('BattleScreen mostra FIGHT! no fim da abertura (não na Torre) e toca som', () => {
    assert.match(battle, /introLabel\(/);
    assert.match(battle, /battle_fight/);
    assert.match(battle, /hit_heavy/);
  });
  it('textos nos 5 idiomas', () => {
    const { STRINGS_VERSUS } = require('../src/game/i18n/stringsVersus.ts');
    for (const l of ['pt', 'en', 'es', 'fr', 'ja']) {
      for (const k of ['vs_pick_p1', 'vs_pick_p2', 'vs_pick_cpu', 'vs_confirm', 'vs_back_p1', 'vs_locked', 'vs_skip', 'battle_fight']) {
        assert.ok(STRINGS_VERSUS[l][k] && STRINGS_VERSUS[l][k].length > 0, `${l}/${k}`);
      }
    }
    assert.match(read('src/game/i18n/extraStrings.ts'), /STRINGS_VERSUS/);
  });
});
