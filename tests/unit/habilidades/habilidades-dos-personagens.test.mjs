/**
 * Habilidade especial exclusiva de cada personagem (story/abilities.ts): uma por personagem, nenhuma repetida, textos nos 5
 * idiomas, efeito REAL no lutador (Fighter), na loja, nos baús, na cura e no cassino, sem duplicar ao reaplicar.
 *   node tests/unit/habilidades/habilidades-dos-personagens.test.mjs
 */
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('../../_support/ts-register.cjs');
const A = require('../../../src/game/story/abilities.ts');
const { createFighter } = require('../../../src/game/battle/Fighter.ts');
const M = require('../../../src/game/casino/casinoMath.ts');

const PLAYABLE = ['dogge', 'gadigago', 'orc', 'soldier', 'dogking', 'tank', 'ninja', 'mystic', 'green_dragon', 'ice_dragon', 'shadow_dragon', 'troll_face', 'cara_tranquilo', 'sahur', 'sahur_god', 'sahur_evil'];
const fighter = (k) => createFighter(k, 1);
const withChar = (id, fn) => { A.setAbilityCharacter(id); try { return fn(); } finally { A.setAbilityCharacter('dogge'); } };

describe('catálogo', () => {
  it('uma habilidade para cada um dos 16 personagens, ids únicos, nenhum personagem sobrando', () => {
    assert.deepEqual(Object.keys(A.ABILITIES).sort(), [...PLAYABLE].sort());
    const ids = Object.values(A.ABILITIES).map((a) => a.id);
    assert.equal(new Set(ids).size, 16);
    for (const [k, a] of Object.entries(A.ABILITIES)) assert.equal(a.characterId, k);
  });
  it('nome, efeito e uso nos 5 idiomas, sem vazio nem travessão', () => {
    for (const a of Object.values(A.ABILITIES)) {
      for (const f of ['name', 'effect', 'usage']) {
        assert.equal(a[f].length, 5, `${a.id}.${f}`);
        for (const t of a[f]) { assert.ok(t.trim().length > 1, `${a.id}.${f} vazio`); assert.ok(!/[—–]| - /.test(t), `${a.id}.${f}: travessão`); }
      }
    }
  });
});

describe('lutador', () => {
  it('Soco Certeiro: +18 pontos de crítico', () => {
    const f = fighter('gadigago'); const base = f.critChance;
    A.applyAbility(f, 'gadigago');
    assert.ok(Math.abs(f.critChance - (base + 0.18)) < 1e-9);
  });
  it('Casca Grossa: 15% menos dano recebido (dano real)', () => {
    const a = fighter('orc'), b = fighter('orc');
    A.applyAbility(a, 'orc');
    a.takeHit(40); b.takeHit(40);
    const lostA = a.maxHealth - a.health, lostB = b.maxHealth - b.health;
    assert.ok(Math.abs(lostA / lostB - 0.85) < 0.001, `${lostA} / ${lostB}`);
  });
  it('Disciplina de Ferro: começa com 35 de energia e o escudo custa 40% menos', () => {
    const f = fighter('soldier'); const cost = f.shieldCost;
    A.applyAbility(f, 'soldier');
    assert.ok(f.startEnergy >= 35 && f.energy >= 35);
    assert.ok(Math.abs(f.shieldCost - cost * 0.6) < 1e-9);
  });
  it('Uivo Real, Toque de Gelo e Brasa no Calor: procs reais de atordoar, congelar e queimar', () => {
    const k = fighter('dogking'); A.applyAbility(k, 'dogking');
    assert.ok(k.onHitStatus.some((p) => p.src === 'ability' && p.kind === 'stun' && p.chance === 0.15 && p.ms === 900));
    const i = fighter('ice_dragon'); A.applyAbility(i, 'ice_dragon');
    const fr = i.onHitStatus.filter((p) => p.kind === 'freeze' && p.src === 'ability');
    assert.equal(fr.length, 3);
    assert.deepEqual(fr.map((p) => p.chance).sort(), [0.08, 0.14, 0.3]);
    const e = fighter('sahur_evil'); A.applyAbility(e, 'sahur_evil');
    assert.ok(e.onHitStatus.some((p) => p.src === 'ability' && p.kind === 'burn' && p.on.includes('ultimate') && p.chance === 0.6));
    assert.equal(e.burnDotMult, 1.5);
    assert.ok(e.immune.includes('burn'));
  });
  it('Queimadura forte: quem recebe de um Sahur Evil perde 50% mais vida por segundo', () => {
    const t1 = fighter('orc'), t2 = fighter('orc');
    t1.applyStatus('burn', 3000); t2.applyStatus('burn', 3000);
    t2.burnTakenMult = 1.5;
    for (let i = 0; i < 60; i++) { t1.update(16); t2.update(16); }
    const l1 = t1.maxHealth - t1.health, l2 = t2.maxHealth - t2.health;
    assert.ok(l1 > 0 && Math.abs(l2 / l1 - 1.5) < 0.05, `${l1} ${l2}`);
  });
  it('Pele de Rocha: imune a queimadura e veneno (o efeito nem entra)', () => {
    const f = fighter('tank'); A.applyAbility(f, 'tank');
    assert.equal(f.applyStatus('burn', 2000), false);
    assert.equal(f.applyStatus('poison', 2000), false);
  });
  it('Sede de Sombra: 7% de roubo de vida', () => {
    const f = fighter('shadow_dragon'); const b = f.lifesteal;
    A.applyAbility(f, 'shadow_dragon');
    assert.ok(Math.abs(f.lifesteal - (b + 0.07)) < 1e-9);
  });
  it('Batida Contagiante: energia e carga 40% mais rápidas; Luz Restauradora: regeneração 40% maior', () => {
    const f = fighter('sahur'); const e = f.energyGainMult, c = f.chargeRate;
    A.applyAbility(f, 'sahur');
    assert.ok(Math.abs(f.energyGainMult - e * 1.4) < 1e-9 && Math.abs(f.chargeRate - c * 1.4) < 1e-9);
    const g = fighter('sahur_god'); g.regenPerSec = 2;
    A.applyAbility(g, 'sahur_god');
    assert.ok(Math.abs(g.regenPerSec - 2.8) < 1e-9);
  });
  it('reaplicar nunca duplica o bônus (idempotente), e outro personagem não recebe o de um terceiro', () => {
    const f = fighter('gadigago'); A.applyAbility(f, 'gadigago'); const c = f.critChance;
    assert.equal(A.applyAbility(f, 'gadigago'), false);
    assert.equal(f.critChance, c);
    const x = fighter('dogge'); const b = x.critChance;
    A.applyAbility(x, 'dogge');
    assert.equal(x.critChance, b);
  });
});

describe('sobrevivência na luta', () => {
  it('Segundo Fôlego: cura 25% da vida máxima UMA vez quando a vida cai a 20% ou menos', () => {
    const f = fighter('dogge'); A.applyAbility(f, 'dogge');
    f.health = f.maxHealth * 0.3;
    f.takeHit(f.maxHealth * 0.15); // fica em 15%
    assert.ok(Math.abs(f.health / f.maxHealth - 0.4) < 0.02, String(f.health / f.maxHealth)); // 15% + 25%
    assert.equal(f.secondWindUsed, true);
    f.health = f.maxHealth * 0.1;
    f.takeHit(1);
    assert.ok(f.health / f.maxHealth < 0.12, 'a segunda vez não cura');
  });
  it('Mente Aberta: ao zerar a vida volta com 1 de vida, 1 s de imunidade, uma vez por luta', () => {
    const f = fighter('mystic'); A.applyAbility(f, 'mystic');
    f.takeHit(f.maxHealth * 3);
    assert.equal(f.isKO, false);
    assert.equal(f.health, 1);
    assert.ok(f.invulnTimer >= 900);
    f.takeHit(50);
    assert.equal(f.health, 1, 'imune durante o 1 s');
    f.invulnTimer = 0;
    f.takeHit(50);
    assert.equal(f.isKO, true, 'a segunda queda é nocaute');
  });
  it('sem a habilidade, o nocaute é normal', () => {
    const f = fighter('mystic'); f.takeHit(f.maxHealth * 3);
    assert.equal(f.isKO, true);
  });
});

describe('sistemas fora da luta', () => {
  it('Preço Camarada: 20% de desconto, mínimo 1 moeda, null continua null, só para o Cara Tranquilo', () => {
    assert.equal(A.shopPrice(100), 100);
    withChar('cara_tranquilo', () => {
      assert.equal(A.shopPrice(100), 80);
      assert.equal(A.shopPrice(1), 1);
      assert.equal(A.shopPrice(3), 2);
      assert.equal(A.shopPrice(null), null);
      assert.equal(A.shopPrice(0), 0);
    });
  });
  it('Mão Leve: +35% de moedas e chance de item raro extra (só Ninja), com sorteio controlado', () => {
    assert.equal(A.lootCoins(100), 100);
    assert.equal(A.lootBonusItem(() => 0), null);
    withChar('ninja', () => {
      assert.equal(A.lootCoins(100), 135);
      assert.equal(A.lootCoins(0), 0);
      assert.equal(A.lootBonusItem(() => 0.99), null);
      assert.ok(A.LOOT_BONUS_POOL.includes(A.lootBonusItem(() => 0.1)));
    });
    for (const id of A.LOOT_BONUS_POOL) assert.ok(require('../../../src/game/items/itemDefs.ts').ITEMS[id], `item ${id} existe`);
  });
  it('Luz Restauradora: cura +40% (e só dela)', () => {
    assert.equal(A.healMult(), 1);
    withChar('sahur_god', () => assert.equal(A.healMult(), 1.4));
    withChar('sahur', () => assert.equal(A.healMult(), 1));
  });
  it('Seiva Viva: regeneração no mundo só para o Dragão Verde', () => {
    assert.equal(A.worldRegenPerSec(), 0);
    withChar('green_dragon', () => assert.equal(A.worldRegenPerSec(), 0.004));
  });
});

describe('cassino: Sorte Absurda não quebra a banca', () => {
  function mul(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const N = 250000;
  const rtp = (bets, play, on, seed) => { const rng = mul(seed); let w = 0, r = 0; for (let i = 0; i < N; i++) { const b = bets[Math.floor(rng() * bets.length)]; w += b; r += play(b, on, rng); } return r / w; };
  const games = {
    'caça-níquel': (b, on, rng) => { const f = A.luckyRoll(() => [M.rollSlotSymbol(rng), M.rollSlotSymbol(rng), M.rollSlotSymbol(rng)], (x) => b * M.slotMultiplier(x), b, rng, on); return A.luckyPayout(b * M.slotMultiplier(f), b, on); },
    'cara ou coroa': (b, on, rng) => { const f = A.luckyRoll(() => rng() < 0.5, (x) => M.flipPayout(b, x), b, rng, on); return A.luckyPayout(M.flipPayout(b, f), b, on); },
  };
  const BETS = { 'caça-níquel': M.SLOT_BETS, 'cara ou coroa': M.FLIP_BETS };
  for (const [name, play] of Object.entries(games)) {
    it(`${name}: com a habilidade o retorno sobe um pouco mas fica abaixo de 100%`, () => {
      const off = rtp(BETS[name], play, false, 11), on = rtp(BETS[name], play, true, 11);
      assert.ok(on > off, `${on} <= ${off}`);
      assert.ok(on < 1, `${name}: retorno ${on} >= 100% (moedas infinitas)`);
    });
  }
  it('luckyRoll: sem a habilidade nunca repete; com ela só repete resultado perdedor', () => {
    let calls = 0;
    const roll = () => { calls++; return calls === 1 ? 'perdeu' : 'ganhou'; };
    assert.equal(A.luckyRoll(roll, (r) => (r === 'ganhou' ? 20 : 0), 10, () => 0, false), 'perdeu');
    calls = 0;
    assert.equal(A.luckyRoll(roll, (r) => (r === 'ganhou' ? 20 : 0), 10, () => 0, true), 'ganhou');
    calls = 0;
    assert.equal(A.luckyRoll(() => { calls++; return 'ganhou'; }, () => 20, 10, () => 0, true), 'ganhou');
    assert.equal(calls, 1, 'resultado vencedor não é sorteado de novo');
    assert.equal(A.luckyPayout(20, 10, true), 20, 'sem bônus de prêmio: a banca continua com vantagem');
  });
});

describe('ligação no jogo (código-fonte)', () => {
  const fs = require('node:fs');
  const read = (p) => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
  it('luta (p1 sempre; p2 no Versus), mundo, loja, baús, cura e cassino chamam a habilidade', () => {
    const b = read('src/screens/BattleScreen.tsx');
    assert.ok(/applyAbility\(p1, p1Key\)/.test(b) && /applyAbility\(p2, p2Key\)/.test(b) && /burnTakenMult/.test(b));
    const w = read('src/screens/WorldScreen.tsx');
    assert.ok(/applyAbility\(fighter, getStoryCharacterId\(\)\)/.test(w) && /lootCoins\(/.test(w) && /lootBonusItem\(/.test(w) && /worldRegenPerSec\(\)/.test(w));
    assert.ok(/shopPrice\(/.test(read('src/game/world/ShopOverlay.tsx')));
    assert.ok(/healMult\(\)/.test(read('src/game/items/rarity.ts')));
    const c = read('src/game/world/CasinoOverlay.tsx');
    assert.equal([...c.matchAll(/luckyRoll(?:<[^(]*>)?\(/g)].length, 5, '5 jogos do cassino');
    assert.ok(/setAbilityCharacter\(/.test(read('src/game/state/questState.ts')));
  });
});
