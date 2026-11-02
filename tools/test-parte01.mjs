/**
 * Testes da Parte 1 (game feel de combate + raridade com efeito real).
 * Roda a lógica PURA do jogo no Node: `node tools/test-parte01.mjs`
 * (usa tools/ts-register.cjs; não precisa de dependências novas).
 * O que depende de tela/plataforma (flash visível, números na tela) é testado
 * no navegador: tools/e2e-parte01.mjs.
 */
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('./ts-register.cjs');

const rarity = require('../src/game/items/rarity.ts');
const { GEAR, computeGear } = require('../src/game/items/gearDefs.ts');
const { ITEMS, applyItemEffect } = require('../src/game/items/itemDefs.ts');
const { itemBonusLines } = require('../src/game/items/itemBonusText.ts');
const { setBagEffects, NEUTRAL_EFFECTS } = require('../src/game/items/bagRuntime.ts');
const fxm = require('../src/game/battle/combatFx.ts');
const { Fighter, createFighter, HIT_FLASH_MS, HIT_REACT_MS } = require('../src/game/battle/Fighter.ts');
const { STRINGS } = require('../src/game/i18n/translations.ts');

const rarityOf = (id) => ITEMS[id]?.rarity ?? 'common';
const LANGS = ['pt', 'en', 'es', 'fr', 'ja'];
const ALL_KEYS = ['dogge', 'gadigago', 'orc', 'soldier', 'dogking', 'tank', 'ninja', 'mystic', 'ice_dragon', 'green_dragon', 'shadow_dragon'];

/** Gerador pseudo-aleatório determinístico, para os testes não variarem. */
function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('raridade: tabela de bônus', () => {
  it('comum é neutro (nada do que já existia muda)', () => {
    const b = rarity.RARITY_BONUS.common;
    assert.deepEqual(b, { weaponDamage: 1, guard: 1, heal: 1, energy: 1, procChance: 0 });
  });

  it('os bônus só crescem (ou o dano recebido só cai) a cada degrau de raridade', () => {
    const order = rarity.RARITY_ORDER;
    for (let i = 1; i < order.length; i++) {
      const a = rarity.RARITY_BONUS[order[i - 1]];
      const b = rarity.RARITY_BONUS[order[i]];
      assert.ok(b.weaponDamage >= a.weaponDamage, `dano ${order[i]}`);
      assert.ok(b.guard <= a.guard, `guarda ${order[i]}`);
      assert.ok(b.heal >= a.heal, `cura ${order[i]}`);
      assert.ok(b.energy >= a.energy, `energia ${order[i]}`);
      assert.ok(b.procChance >= a.procChance, `status ${order[i]}`);
    }
  });

  it('chance de status só existe de rara para cima', () => {
    assert.equal(rarity.RARITY_BONUS.common.procChance, 0);
    assert.equal(rarity.RARITY_BONUS.uncommon.procChance, 0);
    for (const r of ['rare', 'epic', 'legendary']) assert.ok(rarity.RARITY_BONUS[r].procChance > 0, r);
  });

  it('raridade desconhecida cai em comum (dado antigo não quebra)', () => {
    assert.equal(rarity.rarityBonus(undefined), rarity.RARITY_BONUS.common);
    assert.equal(rarity.rarityBonus('mitico'), rarity.RARITY_BONUS.common);
  });

  it('a cor de cada raridade continua definida', () => {
    for (const r of rarity.RARITY_ORDER) assert.match(rarity.RARITY_COLOR[r], /^#[0-9A-F]{6}$/i);
  });
});

describe('raridade: arredondamento de cura e energia', () => {
  it('item comum cura exatamente o que curava antes', () => {
    assert.equal(rarity.scaledHeal(20, 'common', 1), 20);
    assert.equal(rarity.scaledHeal(18, 'common', 1), 18);
  });
  it('item raro/épico cura mais', () => {
    assert.equal(rarity.scaledHeal(80, 'rare', 1), 88);
    assert.equal(rarity.scaledHeal(70, 'epic', 1), 81);
  });
  it('bônus da mochila e da raridade se multiplicam uma vez cada', () => {
    // 45 × 1,15 (mochila arcana) × 1,05 (incomum) = 54,34 -> 54
    assert.equal(rarity.scaledHeal(45, 'uncommon', 1.15), 54);
  });
  it('energia escala só pela raridade', () => {
    assert.equal(rarity.scaledEnergy(60, 'uncommon'), 63);
    assert.equal(rarity.scaledEnergy(30, 'common'), 30);
  });
});

describe('gear: dano, guarda e status por raridade', () => {
  it('arma comum mantém o multiplicador antigo (Adaga +10%)', () => {
    const g = computeGear(['w_dagger', null], rarityOf);
    assert.equal(ITEMS.w_dagger.rarity, 'common');
    assert.ok(Math.abs(g.damageMult - 1.1) < 1e-9);
    assert.deepEqual(g.procs, []);
  });

  it('o dano final é o da arma × o da raridade, sem contar duas vezes', () => {
    const expected = { w_dagger: 1.1, w_cutlass: 1.18 * 1.03, w_club: 1.22 * 1.03, w_sword: 1.25 * 1.06, w_hammer: 1.3 * 1.06, w_axe: 1.35 * 1.1 };
    for (const [id, mult] of Object.entries(expected)) {
      const g = computeGear([id, null], rarityOf);
      assert.ok(Math.abs(g.damageMult - mult) < 1e-9, `${id}: ${g.damageMult} != ${mult}`);
    }
  });

  it('armas melhores dão mais dano que as piores (diferenciação entre equipamentos)', () => {
    const order = ['w_dagger', 'w_cutlass', 'w_club', 'w_sword', 'w_hammer', 'w_axe'];
    const dmg = order.map((id) => computeGear([id], rarityOf).damageMult);
    for (let i = 1; i < dmg.length; i++) assert.ok(dmg[i] > dmg[i - 1], `${order[i]} deveria bater mais que ${order[i - 1]}`);
  });

  it('escudo incomum reduz um pouco mais o dano recebido', () => {
    const g = computeGear([null, 'w_shield'], rarityOf);
    assert.ok(Math.abs(g.guardMult - 0.7 * 0.97) < 1e-9);
    assert.ok(g.guardMult < 0.7);
  });

  it('só a primeira arma e o primeiro escudo contam (nada acumula)', () => {
    const one = computeGear(['w_axe'], rarityOf);
    const two = computeGear(['w_axe', 'w_hammer'], rarityOf);
    assert.equal(two.weapon.id, 'w_axe');
    assert.equal(two.damageMult, one.damageMult);
    assert.equal(two.procs.length, 1);
  });

  it('arma + escudo: dano vem só da arma e guarda só do escudo', () => {
    const g = computeGear(['w_sword', 'w_shield'], rarityOf);
    assert.ok(Math.abs(g.damageMult - 1.25 * 1.06) < 1e-9);
    assert.ok(Math.abs(g.guardMult - 0.7 * 0.97) < 1e-9);
  });

  it('sem equipamento tudo é neutro', () => {
    const g = computeGear([null, null], rarityOf);
    assert.deepEqual({ d: g.damageMult, g: g.guardMult, p: g.procs.length }, { d: 1, g: 1, p: 0 });
  });

  it('só armas raras ou melhores aplicam status, cada uma o seu', () => {
    const sword = computeGear(['w_sword'], rarityOf).procs;
    const hammer = computeGear(['w_hammer'], rarityOf).procs;
    const axe = computeGear(['w_axe'], rarityOf).procs;
    assert.deepEqual(sword.map((p) => [p.kind, p.chance]), [['freeze', 0.08]]);
    assert.deepEqual(hammer.map((p) => [p.kind, p.chance]), [['stun', 0.08]]);
    assert.deepEqual(axe.map((p) => [p.kind, p.chance]), [['burn', 0.12]]);
    for (const id of ['w_dagger', 'w_cutlass', 'w_club']) assert.deepEqual(computeGear([id], rarityOf).procs, [], id);
  });

  it('os procs carregam a marca "gear" (para não duplicar) e têm cópia própria dos golpes', () => {
    const [p] = computeGear(['w_axe'], rarityOf).procs;
    assert.equal(p.src, 'gear');
    p.on.push('ultimate');
    assert.deepEqual(GEAR.w_axe.proc.on, ['flash', 'strong'], 'mexer no proc não pode alterar a tabela de armas');
  });

  it('uma arma lendária (se existir um dia) ganharia a maior chance de status', () => {
    const g = computeGear(['w_axe'], () => 'legendary');
    assert.equal(g.procs[0].chance, 0.18);
    assert.ok(Math.abs(g.damageMult - 1.35 * 1.15) < 1e-9);
  });
});

describe('itens: cura e energia com raridade (applyItemEffect)', () => {
  const fresh = () => {
    const f = new Fighter('T', 'dogge');
    f.maxHealth = 300;
    f.health = 10;
    f.energy = 0;
    return f;
  };
  it('poção comum: cura igual a antes', () => {
    setBagEffects(NEUTRAL_EFFECTS);
    const f = fresh();
    applyItemEffect(f, 'potion_hp_s');
    assert.equal(f.health, 10 + 20);
  });
  it('poção rara cura 10% a mais', () => {
    setBagEffects(NEUTRAL_EFFECTS);
    const f = fresh();
    applyItemEffect(f, 'potion_hp_l');
    assert.equal(f.health, 10 + 88);
  });
  it('mochila arcana + item raro: os dois bônus valem, uma vez cada', () => {
    setBagEffects({ ...NEUTRAL_EFFECTS, healMult: 1.15 });
    const f = fresh();
    applyItemEffect(f, 'potion_hp_l'); // 80 × 1,15 × 1,10 = 101,2
    assert.equal(f.health, 10 + 101);
    setBagEffects(NEUTRAL_EFFECTS);
  });
  it('a cura continua limitada pela vida máxima', () => {
    setBagEffects(NEUTRAL_EFFECTS);
    const f = fresh();
    f.maxHealth = 50;
    f.health = 40;
    applyItemEffect(f, 'potion_hp_l');
    assert.equal(f.health, 50);
  });
  it('energia: incomum +5%, comum igual', () => {
    const a = fresh();
    applyItemEffect(a, 'energy_shard'); // incomum, 60
    assert.equal(a.energy, 63);
    const b = fresh();
    applyItemEffect(b, 'potion_en_s'); // comum, 30
    assert.equal(b.energy, 30);
  });
  it('buff de dano continua valendo uma vez só por item (sem regressão)', () => {
    const f = fresh();
    const base = f.strongDamage;
    applyItemEffect(f, 'chili');
    applyItemEffect(f, 'chili');
    assert.ok(Math.abs(f.strongDamage - base * 1.15) < 1e-9);
  });
});

describe('descrições de bônus de raridade (5 idiomas)', () => {
  it('item comum não tem linhas de bônus', () => {
    for (const lang of LANGS) assert.deepEqual(itemBonusLines('w_dagger', lang), [], lang);
    for (const lang of LANGS) assert.deepEqual(itemBonusLines('potion_hp_s', lang), [], lang);
  });
  it('item desconhecido não quebra', () => {
    assert.deepEqual(itemBonusLines('nao_existe', 'pt'), []);
  });
  it('machado épico: dano e status, em todos os idiomas, sem {placeholders} sobrando', () => {
    for (const lang of LANGS) {
      const lines = itemBonusLines('w_axe', lang);
      assert.equal(lines.length, 2, `${lang}: esperava 2 linhas`);
      for (const l of lines) {
        assert.ok(l.length > 5, `${lang}: linha vazia`);
        assert.ok(!/[{}]/.test(l), `${lang}: placeholder sem preencher em "${l}"`);
      }
      assert.ok(lines[0].includes('10'), `${lang}: o dano épico (+10%) deveria aparecer em "${lines[0]}"`);
      assert.ok(lines[1].includes('12'), `${lang}: a chance (12%) deveria aparecer em "${lines[1]}"`);
    }
  });
  it('os textos são diferentes em cada idioma (nada ficou só em português)', () => {
    const texts = LANGS.map((l) => itemBonusLines('w_axe', l)[0]);
    assert.equal(new Set(texts).size, 5);
  });
  it('os números do texto são os mesmos que o combate usa', () => {
    // espada rara: +6% dano e 8% de chance
    const [dmg, proc] = itemBonusLines('w_sword', 'pt');
    assert.ok(dmg.includes('+6%'), dmg);
    assert.ok(proc.includes('8%'), proc);
    // escudo incomum: 3% menos dano
    assert.ok(itemBonusLines('w_shield', 'pt')[0].includes('3%'));
    // poção grande rara: 80 -> 88
    const heal = itemBonusLines('potion_hp_l', 'pt')[0];
    assert.ok(heal.includes('80') && heal.includes('88') && heal.includes('10%'), heal);
  });
  it('cada item de cura/energia incomum ou melhor mostra o resultado certo', () => {
    for (const [id, d] of Object.entries(ITEMS)) {
      if (d.rarity === 'common') continue;
      for (const e of d.effects) {
        if (e.kind !== 'heal' && e.kind !== 'energy') continue;
        const final = e.kind === 'heal' ? rarity.scaledHeal(e.amount, d.rarity) : rarity.scaledEnergy(e.amount, d.rarity);
        const text = itemBonusLines(id, 'en').join(' ');
        assert.ok(text.includes(String(final)), `${id}: texto "${text}" deveria citar ${final}`);
      }
    }
  });
  it('a chave battle_crit existe nos 5 idiomas', () => {
    for (const lang of LANGS) assert.ok(STRINGS[lang].battle_crit && STRINGS[lang].battle_crit.length > 2, lang);
  });
});

describe('combatFx: impacto', () => {
  it('o golpe fica mais intenso: comum < FORTE < crítico < SUPER', () => {
    const k = fxm.KIND_STYLE;
    for (const field of ['sparks', 'flashSize', 'shake', 'react', 'numScale']) {
      assert.ok(k.normal[field] < k.strong[field] || field === 'shake', `${field}: normal < forte`);
      assert.ok(k.strong[field] < k.crit[field], `${field}: forte < crítico`);
      assert.ok(k.crit[field] <= k.ult[field] || field === 'numScale', `${field}: crítico <= super`);
    }
    assert.equal(k.normal.shake, 0, 'golpe comum não balança a tela');
    assert.equal(k.block.shake, 0, 'bloqueio não balança a tela');
  });

  it('hitKindOf escolhe o tipo certo, com bloqueio e SUPER acima do resto', () => {
    const o = { blocked: false, ultimate: false, crit: false, strong: false };
    assert.equal(fxm.hitKindOf(o), 'normal');
    assert.equal(fxm.hitKindOf({ ...o, strong: true }), 'strong');
    assert.equal(fxm.hitKindOf({ ...o, strong: true, crit: true }), 'crit');
    assert.equal(fxm.hitKindOf({ ...o, ultimate: true, crit: true }), 'ult');
    assert.equal(fxm.hitKindOf({ ...o, blocked: true, ultimate: true }), 'block');
  });

  it('spawnImpact cria o flash de impacto + as faíscas do tipo', () => {
    for (const kind of ['normal', 'strong', 'crit', 'ult', 'block']) {
      const fx = fxm.createFx();
      fxm.spawnImpact(fx, { x: 100, y: 100, dir: 1, kind, rng: seeded(3) });
      assert.equal(fx.particles.length, 1 + fxm.KIND_STYLE[kind].sparks, kind);
      assert.equal(fx.particles[0].vx, 0, 'a primeira partícula é o flash parado');
    }
  });

  it('as faíscas saem majoritariamente na direção do golpe', () => {
    for (const dir of [1, -1]) {
      const fx = fxm.createFx();
      for (let i = 0; i < 6; i++) fxm.spawnImpact(fx, { x: 0, y: 0, dir, kind: 'ult', rng: seeded(10 + i) });
      const sparks = fx.particles.filter((p) => p.vx !== 0 || p.vy !== 0);
      const forward = sparks.filter((p) => Math.sign(p.vx) === dir).length;
      assert.ok(forward / sparks.length > 0.6, `dir ${dir}: só ${forward}/${sparks.length} para frente`);
    }
  });

  it('modo leve corta as partículas pela metade e o tremor também', () => {
    const normal = fxm.createFx();
    const light = fxm.createFx();
    fxm.spawnImpact(normal, { x: 0, y: 0, dir: 1, kind: 'crit', rng: seeded(1) });
    fxm.spawnImpact(light, { x: 0, y: 0, dir: 1, kind: 'crit', light: true, rng: seeded(1) });
    assert.ok(light.particles.length <= Math.ceil(normal.particles.length / 2) + 1, `${light.particles.length} vs ${normal.particles.length}`);
    assert.ok(light.particles.length >= 4);
    assert.equal(light.shakeAmp, fxm.KIND_STYLE.crit.shake * 0.5);
    assert.equal(normal.shakeAmp, fxm.KIND_STYLE.crit.shake);
  });

  it('o teto de partículas nunca é ultrapassado, mesmo com golpes em sequência', () => {
    const fx = fxm.createFx();
    for (let i = 0; i < 200; i++) fxm.spawnImpact(fx, { x: 0, y: 0, dir: 1, kind: 'ult', rng: seeded(i) });
    assert.ok(fx.particles.length <= fxm.MAX_PARTICLES, `${fx.particles.length} > ${fxm.MAX_PARTICLES}`);
    const lt = fxm.createFx();
    for (let i = 0; i < 200; i++) fxm.spawnImpact(lt, { x: 0, y: 0, dir: 1, kind: 'ult', light: true, rng: seeded(i) });
    assert.ok(lt.particles.length <= fxm.MAX_PARTICLES_LIGHT);
    const b = fxm.createFx();
    for (let i = 0; i < 100; i++) fxm.spawnBurst(b, { x: 0, y: 0, count: 24, speed: 6, life: 700, color: '255,0,0' });
    assert.ok(b.particles.length <= fxm.MAX_PARTICLES);
  });

  it('stepFx move, aplica gravidade e remove as partículas vencidas', () => {
    const fx = fxm.createFx();
    fxm.spawnImpact(fx, { x: 0, y: 0, dir: 1, kind: 'normal', rng: seeded(2) });
    const before = fx.particles.map((p) => ({ x: p.x, vy: p.vy }));
    fxm.stepFx(fx, 16, 1);
    const spark = fx.particles[1];
    assert.notEqual(spark.x, before[1].x);
    assert.ok(spark.vy > before[1].vy, 'gravidade puxa para baixo');
    for (let i = 0; i < 60; i++) fxm.stepFx(fx, 16, 1);
    assert.equal(fx.particles.length, 0, 'tudo some em ~1 s');
  });

  it('o flash de impacto cresce e some; as faíscas encolhem', () => {
    const fx = fxm.createFx();
    fxm.spawnImpact(fx, { x: 0, y: 0, dir: 1, kind: 'strong', rng: seeded(4) });
    const flash = fx.particles[0];
    const spark = fx.particles[1];
    const f0 = fxm.particleVisual(flash);
    const s0 = fxm.particleVisual(spark);
    fxm.stepFx(fx, 60, 3.6);
    const f1 = fxm.particleVisual(flash);
    const s1 = fxm.particleVisual(spark);
    assert.ok(f1.size > f0.size && f1.alpha < f0.alpha, 'flash: cresce e some');
    assert.ok(s1.size < s0.size, 'faísca: encolhe');
    assert.equal(f0.alpha, 1);
  });

  it('o tremor decai até zero e depois fica parado', () => {
    const fx = fxm.createFx();
    fxm.spawnImpact(fx, { x: 0, y: 0, dir: 1, kind: 'ult', rng: seeded(5) });
    const o1 = fxm.shakeOffset(fx, () => 1);
    assert.ok(o1.x > 0);
    fxm.stepFx(fx, 70, 4);
    const mid = fxm.shakeOffset(fx, () => 1);
    assert.ok(mid.x < o1.x && mid.x > 0, 'metade do caminho');
    fxm.stepFx(fx, 200, 12);
    assert.deepEqual(fxm.shakeOffset(fx, () => 1), { x: 0, y: 0 });
  });

  it('clearFx limpa tudo sem recriar o objeto', () => {
    const fx = fxm.createFx();
    fxm.spawnImpact(fx, { x: 0, y: 0, dir: 1, kind: 'ult', rng: seeded(6) });
    fxm.spawnDamageNumber(fx, { x: 0, y: 0, damage: 20, kind: 'normal', targetKey: 'p2' });
    const same = fx;
    fxm.clearFx(fx);
    assert.equal(same, fx);
    assert.deepEqual([fx.particles.length, fx.numbers.length, fx.shakeAmp], [0, 0, 0]);
  });
});

describe('combatFx: números de dano', () => {
  it('mostra o dano arredondado, no mínimo 1', () => {
    const fx = fxm.createFx();
    fxm.spawnDamageNumber(fx, { x: 0, y: 0, damage: 12.6, kind: 'normal', targetKey: 'p2' });
    fxm.spawnDamageNumber(fx, { x: 0, y: 0, damage: 0.2, kind: 'normal', targetKey: 'p1' });
    assert.deepEqual(fx.numbers.map((n) => n.text), ['13', '1']);
  });

  it('é vermelho em todos os tipos de golpe', () => {
    for (const kind of Object.keys(fxm.KIND_STYLE)) {
      const c = fxm.KIND_STYLE[kind].numColor;
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
      assert.ok(r > 180 && g < 100 && b < 100, `${kind}: ${c} não é vermelho`);
    }
  });

  it('o tamanho cresce com o dano e com a intensidade do golpe', () => {
    const s = fxm.damageNumberSize;
    assert.ok(s(30, 'normal') > s(5, 'normal'));
    assert.ok(s(15, 'strong') > s(15, 'normal'));
    assert.ok(s(15, 'crit') > s(15, 'strong'));
    assert.ok(s(15, 'block') < s(15, 'normal'));
    for (const d of [1, 10, 40, 999]) for (const k of Object.keys(fxm.KIND_STYLE)) {
      const v = s(d, k);
      assert.ok(v >= 18 && v <= 60, `${k}/${d}: ${v}`);
    }
  });

  it('sobe suavemente, aparece cheio e some no fim', () => {
    const fx = fxm.createFx();
    fxm.spawnDamageNumber(fx, { x: 0, y: 0, damage: 10, kind: 'normal', targetKey: 'p2' });
    const n = fx.numbers[0];
    let lastDy = 1;
    let lastOpacity = 2;
    const samples = [];
    for (let i = 0; i < 90 && fx.numbers.length > 0; i++) {
      const v = fxm.numberVisual(n);
      samples.push(v);
      assert.ok(v.dy <= lastDy + 1e-9, 'só sobe (dy nunca aumenta)');
      lastDy = v.dy;
      if (v.opacity < 1) assert.ok(v.opacity <= lastOpacity + 1e-9, 'depois de começar a sumir, não volta');
      lastOpacity = Math.min(lastOpacity, v.opacity);
      fxm.stepFx(fx, 16, 1);
    }
    assert.equal(samples[0].opacity, 1);
    assert.ok(samples[0].scale < 1, 'começa pequeno e "estoura"');
    assert.ok(Math.max(...samples.map((s) => s.scale)) > 1.2, 'passa de 1,2x no estouro');
    assert.ok(samples.at(-1).opacity < 0.2, 'quase invisível no fim');
    assert.ok(samples.at(-1).dy < -fxm.NUMBER_RISE_PX * 0.9, 'subiu quase tudo');
    assert.equal(fx.numbers.length, 0, 'removido ao terminar');
  });

  it('números seguidos no mesmo alvo NÃO ficam exatamente sobrepostos', () => {
    const fx = fxm.createFx();
    for (let i = 0; i < 4; i++) fxm.spawnDamageNumber(fx, { x: 300, y: 200, damage: 10, kind: 'normal', targetKey: 'p2', rng: seeded(20 + i) });
    const spots = new Set(fx.numbers.map((n) => `${Math.round(n.x)},${Math.round(n.y)}`));
    assert.equal(spots.size, 4, 'quatro posições diferentes');
    const ys = fx.numbers.map((n) => n.y);
    assert.ok(ys[1] < ys[0] && ys[2] < ys[1], 'cada novo número sobe um degrau');
    const xs = fx.numbers.map((n) => n.x);
    assert.ok(xs[0] < 300 && xs[1] > 300, 'alterna o lado');
  });

  it('alvos diferentes não se empurram entre si', () => {
    const fx = fxm.createFx();
    fxm.spawnDamageNumber(fx, { x: 300, y: 200, damage: 10, kind: 'normal', targetKey: 'p2', rng: seeded(1) });
    fxm.spawnDamageNumber(fx, { x: 300, y: 200, damage: 10, kind: 'normal', targetKey: 'p1', rng: seeded(1) });
    assert.equal(fx.numbers[0].y, fx.numbers[1].y);
  });

  it('depois que o número antigo já passou, o novo volta para o ponto normal', () => {
    const fx = fxm.createFx();
    fxm.spawnDamageNumber(fx, { x: 300, y: 200, damage: 10, kind: 'normal', targetKey: 'p2', rng: seeded(1) });
    fxm.stepFx(fx, 400, 24);
    fxm.spawnDamageNumber(fx, { x: 300, y: 200, damage: 10, kind: 'normal', targetKey: 'p2', rng: seeded(2) });
    assert.equal(fx.numbers[1].y, 200);
  });

  it('o limite de números na tela nunca é ultrapassado', () => {
    const fx = fxm.createFx();
    for (let i = 0; i < 50; i++) fxm.spawnDamageNumber(fx, { x: 0, y: 0, damage: 5, kind: 'normal', targetKey: 'p2' });
    assert.ok(fx.numbers.length <= fxm.MAX_NUMBERS);
    const ids = fx.numbers.map((n) => n.id);
    assert.equal(new Set(ids).size, ids.length, 'ids únicos');
  });

  it('o crítico leva o texto de destaque e o golpe comum não', () => {
    const fx = fxm.createFx();
    fxm.spawnDamageNumber(fx, { x: 0, y: 0, damage: 30, kind: 'crit', targetKey: 'p2', label: 'CRÍTICO!' });
    fxm.spawnDamageNumber(fx, { x: 0, y: 0, damage: 10, kind: 'normal', targetKey: 'p1' });
    assert.equal(fx.numbers[0].label, 'CRÍTICO!');
    assert.equal(fx.numbers[1].label, undefined);
    assert.ok(fx.numbers[0].life > fx.numbers[1].life, 'crítico fica mais tempo na tela');
  });
});

describe('Fighter: flash branco e reação (só aparência)', () => {
  it('levar um golpe liga o flash branco por 130 ms e ele some sozinho', () => {
    const f = createFighter('dogge', 0.9);
    assert.equal(f.hitFlashTimer, 0);
    f.takeHit(10);
    assert.equal(f.hitFlashTimer, HIT_FLASH_MS);
    assert.equal(f.hitFlashPower, 1);
    f.update(60, 3.6);
    assert.ok(f.hitFlashTimer > 0 && f.hitFlashTimer < HIT_FLASH_MS);
    f.update(100, 6);
    assert.equal(f.hitFlashTimer, 0, 'volta à aparência normal');
  });

  it('golpe bloqueado pisca mais fraco', () => {
    const f = createFighter('dogge', 0.9);
    f.energy = 100;
    f.isShielding = true;
    f.takeHit(10);
    assert.equal(f.hitFlashPower, 0.45);
    assert.ok(f.hitFlashTimer > 0);
  });

  it('quem está invulnerável não pisca (o golpe nem entrou)', () => {
    const f = createFighter('dogge', 0.9);
    f.invulnTimer = 500;
    f.takeHit(10);
    assert.equal(f.hitFlashTimer, 0);
  });

  it('funciona com TODOS os lutadores, dragões inclusive', () => {
    for (const key of ALL_KEYS) {
      const f = createFighter(key, 1.3);
      f.resetForRound(100, 100, 1);
      const hp = f.health;
      f.takeHit(10);
      assert.equal(f.hitFlashTimer, HIT_FLASH_MS, key);
      assert.ok(f.health < hp, `${key}: o dano continua sendo aplicado`);
      f.triggerReaction(1, -1);
      assert.equal(f.reactTimer, HIT_REACT_MS, key);
    }
  });

  it('a reação NÃO mexe em posição, hitbox, estado nem dano', () => {
    for (const key of ALL_KEYS) {
      const f = createFighter(key, 1.3);
      f.resetForRound(300, 200, 1);
      const box = JSON.stringify(f.getHurtbox());
      const pos = [f.x, f.y];
      f.triggerReaction(1.6, 1);
      f.tickVisuals(80);
      assert.equal(JSON.stringify(f.getHurtbox()), box, `${key}: hurtbox`);
      assert.deepEqual([f.x, f.y], pos, `${key}: posição`);
      assert.equal(f.state, 'idle');
    }
  });

  it('o dano e o hitstun são exatamente os de antes (sem regressão de combate)', () => {
    const f = createFighter('dogge', 0.9);
    f.takeHit(10);
    assert.equal(f.health, f.maxHealth - 10);
    assert.equal(f.hitstunTimer, 220 + 10 * 12);
    assert.equal(f.state, 'hurt');
  });

  it('tickVisuals só mexe nos timers de aparência', () => {
    const f = createFighter('dogge', 0.9);
    f.takeHit(10);
    f.triggerReaction(1, 1);
    const snap = { hp: f.health, st: f.state, hs: f.hitstunTimer, inv: f.invulnTimer, e: f.energy };
    f.tickVisuals(1000);
    assert.deepEqual({ hp: f.health, st: f.state, hs: f.hitstunTimer, inv: f.invulnTimer, e: f.energy }, snap);
    assert.equal(f.hitFlashTimer, 0);
    assert.equal(f.reactTimer, 0);
  });

  it('novo round zera o flash e a reação', () => {
    const f = createFighter('dogge', 0.9);
    f.takeHit(10);
    f.triggerReaction(1.2, 1);
    f.resetForRound(100, 100, 1);
    assert.deepEqual([f.hitFlashTimer, f.reactTimer, f.reactPower], [0, 0, 0]);
  });

  it('reactionVisual: neutro sem reação, recua para longe e volta ao normal', () => {
    assert.deepEqual(fxm.reactionVisual(0, 100, 170, 1), { shiftX: 0, scaleX: 1, scaleY: 1 });
    assert.deepEqual(fxm.reactionVisual(1, 0, 170, 1), { shiftX: 0, scaleX: 1, scaleY: 1 });
    const right = fxm.reactionVisual(1, 170, 170, 1);
    const left = fxm.reactionVisual(1, 170, 170, -1);
    assert.ok(right.shiftX > 0 && left.shiftX < 0 && right.shiftX === -left.shiftX);
    assert.ok(right.scaleY < 1 && right.scaleX > 1, 'amassa');
    const strong = fxm.reactionVisual(1.6, 170, 170, 1);
    assert.ok(strong.shiftX > right.shiftX, 'golpe forte recua mais');
    assert.ok(Math.abs(strong.shiftX) < 30 && strong.scaleY > 0.9, 'sutil, sem deformar o sprite');
    const half = fxm.reactionVisual(1, 85, 170, 1);
    assert.ok(half.shiftX < right.shiftX, 'decai com o tempo');
  });
});

describe('procs de status do equipamento no Fighter', () => {
  it('a arma épica aplica queimadura com ~12% de chance nos golpes FLASH e FORTE', () => {
    const f = createFighter('dogge', 0.9);
    const [proc] = computeGear(['w_axe'], rarityOf).procs;
    f.onHitStatus.push(proc);
    let flash = 0;
    let strong = 0;
    let ultimate = 0;
    const N = 20000;
    const realRandom = Math.random;
    Math.random = seeded(99);
    try {
      for (let i = 0; i < N; i++) {
        flash += f.rollStatusProcs('flash').length;
        strong += f.rollStatusProcs('strong').length;
        ultimate += f.rollStatusProcs('ultimate').length;
      }
    } finally {
      Math.random = realRandom;
    }
    assert.ok(Math.abs(flash / N - 0.12) < 0.012, `flash ${flash / N}`);
    assert.ok(Math.abs(strong / N - 0.12) < 0.012, `forte ${strong / N}`);
    assert.equal(ultimate, 0, 'a arma não aplica status no SUPER');
  });

  it('o multiplicador de chance da árvore de habilidades continua valendo por cima', () => {
    const f = createFighter('dogge', 0.9);
    f.onHitStatus.push(computeGear(['w_axe'], rarityOf).procs[0]);
    f.statusChanceMult = 2;
    let hits = 0;
    const realRandom = Math.random;
    Math.random = seeded(5);
    try {
      for (let i = 0; i < 20000; i++) hits += f.rollStatusProcs('strong').length;
    } finally {
      Math.random = realRandom;
    }
    assert.ok(Math.abs(hits / 20000 - 0.24) < 0.015, `${hits / 20000}`);
  });

  it('chefe imune ao status não é afetado pela arma', () => {
    const boss = createFighter('shadow_dragon', 2);
    assert.ok(boss.immune.includes('burn'));
    assert.equal(boss.applyStatus('burn', 3500), false);
    const ice = createFighter('ice_dragon', 1);
    assert.equal(ice.applyStatus('freeze', 1800), false);
    assert.equal(ice.applyStatus('burn', 3500), true);
  });

  it('o status tem a duração do proc e o chefe encurta pela resistência dele', () => {
    const t = createFighter('ninja', 0.7); // statusDurationMult 0.6
    t.applyStatus('burn', 3500);
    assert.ok(Math.abs(t.status.burn - 3500 * 0.6) < 1e-9);
  });

  it('duplicar o setup não duplica o proc (deduplicação por src)', () => {
    const f = createFighter('dogge', 0.9);
    const setup = () => {
      for (const pr of computeGear(['w_axe'], rarityOf).procs) {
        if (!f.onHitStatus.some((x) => x.src === pr.src && x.kind === pr.kind)) f.onHitStatus.push(pr);
      }
    };
    setup();
    setup();
    assert.equal(f.onHitStatus.filter((p) => p.src === 'gear').length, 1);
  });
});
