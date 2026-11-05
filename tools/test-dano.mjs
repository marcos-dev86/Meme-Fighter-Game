/**
 * Testes do DANO ALEATORIO e do CRITICO (Parte 2/crit): `node tools/test-dano.mjs` (logica pura no Node, sem dependencias novas).
 * O que depende de tela (numero vermelho, CRITICO!) e testado no navegador: tools/e2e-dano.mjs.
 */
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('./ts-register.cjs');
const dr = require('../src/game/battle/damageRoll.ts');
const { createFighter } = require('../src/game/battle/Fighter.ts');
const { RARITY_ORDER, RARITY_BONUS } = require('../src/game/items/rarity.ts');
const { computeGear, GEAR } = require('../src/game/items/gearDefs.ts');
const { ITEMS } = require('../src/game/items/itemDefs.ts');
const { itemBonusLines } = require('../src/game/items/itemBonusText.ts');
const fs = await import('node:fs');
const LANGS = ['pt', 'en', 'es', 'fr', 'ja'];
const KEYS = ['dogge', 'gadigago', 'orc', 'soldier', 'dogking', 'tank', 'ninja', 'mystic', 'ice_dragon', 'green_dragon', 'shadow_dragon', 'cara_tranquilo', 'troll_face'];

function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rarityOf = (id) => ITEMS[id]?.rarity ?? 'common';

describe('faixa de dano por golpe', () => {
  it('FLASH ±15%, FORTE e SUPER ±10%', () => {
    assert.deepEqual(dr.DAMAGE_SPREAD, { flash: 0.15, strong: 0.1, ultimate: 0.1 });
    const r = dr.damageRange(10, 'flash');
    assert.ok(Math.abs(r.min - 8.5) < 1e-9 && Math.abs(r.max - 11.5) < 1e-9);
    const s = dr.damageRange(20, 'strong');
    assert.ok(Math.abs(s.min - 18) < 1e-9 && Math.abs(s.max - 22) < 1e-9);
  });
  it('o sorteio fica SEMPRE dentro da faixa, usa a faixa toda e tem media 1 (nao muda o dano medio)', () => {
    for (const type of ['flash', 'strong', 'ultimate']) {
      const rnd = seeded(7);
      const s = dr.DAMAGE_SPREAD[type];
      let lo = Infinity, hi = -Infinity, sum = 0;
      const N = 50000;
      for (let i = 0; i < N; i++) {
        const m = dr.spreadMult(type, rnd);
        assert.ok(m >= 1 - s - 1e-12 && m <= 1 + s + 1e-12, `${type} ${m}`);
        lo = Math.min(lo, m); hi = Math.max(hi, m); sum += m;
      }
      assert.ok(lo < 1 - s + 0.005 && hi > 1 + s - 0.005, `${type}: faixa pouco usada ${lo}..${hi}`);
      assert.ok(Math.abs(sum / N - 1) < 0.003, `${type}: media ${sum / N}`);
    }
  });
  it('extremos do gerador: 0 -> minimo, quase 1 -> maximo', () => {
    assert.ok(Math.abs(dr.spreadMult('flash', () => 0) - 0.85) < 1e-12);
    assert.ok(Math.abs(dr.spreadMult('flash', () => 0.999999999) - 1.15) < 1e-6);
  });
});

describe('critico', () => {
  it('todo lutador comeca com 5% de chance e x1,75', () => {
    assert.equal(dr.BASE_CRIT_CHANCE, 0.05);
    assert.equal(dr.BASE_CRIT_MULT, 1.75);
    for (const k of KEYS) {
      const f = createFighter(k, 1);
      assert.equal(f.critChance, 0.05, k);
      assert.equal(f.critMult, 1.75, k);
    }
  });
  it('taxa de critico medida bate com a chance (5%, 20%, 90% e o limite)', () => {
    for (const [chance, expect] of [[0.05, 0.05], [0.2, 0.2], [0.9, 0.9], [2, 0.9], [0, 0]]) {
      const rnd = seeded(11);
      const N = 100000;
      let n = 0;
      for (let i = 0; i < N; i++) if (dr.rollHit({ base: 10, type: 'strong', critChance: chance, critMult: 1.75, rnd }).crit) n++;
      assert.ok(Math.abs(n / N - expect) < 0.006, `chance ${chance}: ${(n / N).toFixed(4)}`);
    }
  });
  it('critico multiplica exatamente por 1,75 sobre o mesmo sorteio da faixa', () => {
    // mesmo gerador, uma vez forcando critico e outra proibindo: a razao tem que ser 1,75
    const seq = [0.42, 0.001]; // 1o = faixa, 2o = critico (0,001 < chance)
    const mk = () => { let i = 0; return () => seq[i++ % 2]; };
    const a = dr.rollHit({ base: 10, type: 'flash', critChance: 0.05, critMult: 1.75, rnd: mk() });
    const b = dr.rollHit({ base: 10, type: 'flash', critChance: 0, critMult: 1.75, rnd: mk() });
    assert.equal(a.crit, true);
    assert.equal(b.crit, false);
    assert.ok(Math.abs(a.damage / b.damage - 1.75) < 1e-12);
  });
  it('o critico pode passar do maximo da faixa (e esse e o ponto)', () => {
    const seq = [0.9999, 0.0]; // faixa no maximo e critico garantido
    let i = 0;
    const r = dr.rollHit({ base: 10, type: 'flash', critChance: 1, critMult: 1.75, rnd: () => seq[i++ % 2] });
    assert.ok(r.crit && r.damage > dr.damageRange(10, 'flash').max);
  });
  it('balanceamento: o dano medio sobe so ~3,75% (5% x +75%) e a variancia nao muda a media', () => {
    const rnd = seeded(5);
    const N = 200000;
    let sum = 0;
    for (let i = 0; i < N; i++) sum += dr.rollHit({ base: 10, type: 'flash', critChance: 0.05, critMult: 1.75, rnd }).damage;
    assert.ok(Math.abs(sum / N / 10 - 1.0375) < 0.004, `media ${(sum / N / 10).toFixed(4)}`);
  });
});

describe('armas afiadas (habilidade especial de critico)', () => {
  it('tabela por raridade: 4% comum ... 12% lendaria, sempre crescendo', () => {
    const c = RARITY_ORDER.map((r) => RARITY_BONUS[r].critChance);
    assert.deepEqual(c, [0.04, 0.06, 0.08, 0.1, 0.12]);
  });
  it('so Adaga e Sabre sao afiados', () => {
    assert.deepEqual(Object.keys(GEAR).filter((k) => GEAR[k].crit).sort(), ['w_cutlass', 'w_dagger']);
  });
  it('computeGear soma a chance pela raridade da arma equipada', () => {
    assert.equal(computeGear(['w_dagger'], rarityOf).critChance, RARITY_BONUS[rarityOf('w_dagger')].critChance);
    assert.equal(computeGear(['w_cutlass'], rarityOf).critChance, RARITY_BONUS[rarityOf('w_cutlass')].critChance);
    for (const r of RARITY_ORDER) assert.equal(computeGear(['w_dagger'], () => r).critChance, RARITY_BONUS[r].critChance);
    assert.equal(computeGear(['w_sword'], rarityOf).critChance, 0);
    assert.equal(computeGear(['w_shield'], rarityOf).critChance, 0);
    assert.equal(computeGear([], rarityOf).critChance, 0);
  });
  it('so a PRIMEIRA arma conta (nao acumula) e o escudo nao tira o critico', () => {
    assert.equal(computeGear(['w_sword', 'w_dagger'], rarityOf).critChance, 0);
    const one = computeGear(['w_dagger', 'w_cutlass'], rarityOf).critChance;
    assert.equal(one, RARITY_BONUS[rarityOf('w_dagger')].critChance);
    assert.equal(computeGear(['w_dagger', 'w_shield'], rarityOf).critChance, one);
  });
  it('a descricao do item mostra o bonus de critico nos 5 idiomas (e so nas laminas afiadas)', () => {
    for (const l of LANGS) {
      const d = itemBonusLines('w_dagger', l).join(' | ');
      assert.match(d, /4/, `${l}: ${d}`);
      assert.ok(itemBonusLines('w_dagger', l).length >= 1);
      assert.equal(itemBonusLines('w_hammer', l).some((x) => /críti|critic|クリティカル/i.test(x)), false, l);
    }
    assert.match(itemBonusLines('w_dagger', 'pt')[0], /crítico/);
    assert.match(itemBonusLines('w_cutlass', 'ja')[0], /クリティカル/);
  });
  it('o texto das habilidades de critico diz +75% (o multiplicador base mudou de 1,5 para 1,75)', () => {
    const src = fs.readFileSync(new URL('../src/game/items/skillText.ts', import.meta.url), 'utf8');
    assert.ok(!/\(\+50\s?%\s?(de dano|damage|de daño|de dégâts)\)/.test(src.split('\n').filter((l) => l.includes('critChance:')).join('\n')));
    assert.match(src, /\+75%/);
  });
});

describe('ligacao no jogo', () => {
  it('VERSUS e MUNDO usam rollHit com o critico da arma', () => {
    const b = fs.readFileSync(new URL('../src/screens/BattleScreen.tsx', import.meta.url), 'utf8');
    const w = fs.readFileSync(new URL('../src/screens/WorldScreen.tsx', import.meta.url), 'utf8');
    assert.match(b, /rollHit\(\{ base: dmg, type: attacker\.currentAttack\.type, critChance: attacker\.critChance \+ gearCrit/);
    assert.match(b, /gear\.damageMult, gear\.critChance\)/);
    assert.ok(!/Math\.random\(\) < attacker\.critChance/.test(b), 'sorteio antigo de critico sobrou');
    assert.match(w, /rollHit\(\{ base: fighter\[def\.damageKey\] \* gear\.damageMult/);
  });
});
