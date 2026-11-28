/**
 * Lote 1 das campanhas: árvores de habilidades INDIVIDUAIS (Gadigago e Orc), supremas exclusivas, as duas habilidades principais
 * (Versus x Exploração), ícones 2D e compatibilidade com saves antigos. Lógica pura (Node), sem tela.
 *   node tests/unit/habilidades/arvores-individuais-e-supremas.test.mjs
 */
import { createRequire } from 'node:module';
import Module from 'node:module';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const store = new Map();
const AS = { getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, v); }, removeItem: async (k) => { store.delete(k); } };
const stub = () => new Proxy(function () {}, { get: (t, p) => (p === '__esModule' ? true : p === 'default' ? stub() : p === Symbol.toPrimitive ? () => 0 : stub()), apply: () => stub() });
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (/^(react-native|expo|@expo|react-native-)/.test(req)) return stub();
  if (req === '@react-native-async-storage/async-storage') return { __esModule: true, default: AS };
  return origLoad.call(this, req, ...rest);
};
require('../../_support/ts-register.cjs');
const SKI = require('../../../src/game/items/skills.ts');
const CT = require('../../../src/game/items/skillTreesCampanhas.ts');
const SUP = require('../../../src/game/battle/supremes.ts');
const A = require('../../../src/game/story/abilities.ts');
const { createFighter } = require('../../../src/game/battle/Fighter.ts');
const SK = require('../../../src/game/state/skillState.ts');
const Q = require('../../../src/game/state/questState.ts');
const PS = require('../../../src/game/state/playerState.ts');
const BAG = require('../../../src/game/items/bagRuntime.ts');
const { ICON_SOURCES } = require('../../../src/game/ui/iconRegistry.ts');

const NO_DASH = /[–—]/;
const NEW = ['gadigago', 'orc'];
const fighter = (k) => createFighter(k, 1);
const readDir = (p) => fs.readdirSync(new URL(`../../../${p}`, import.meta.url));

describe('árvores individuais', () => {
  for (const id of NEW) {
    const tree = SKI.SKILL_TREES[id];
    it(`${id}: ${tree.skills.length} habilidades em 4 ramos de 3 + 3 poderes especiais + suprema, 47 pontos, ids únicos e com prefixo próprio`, () => {
      assert.equal(tree.character, id);
      assert.equal(tree.branches, 4);
      assert.equal(new Set(tree.skills.map((s) => s.id)).size, tree.skills.length);
      assert.equal(tree.skills.reduce((a, s) => a + s.cost, 0), 47);
      assert.equal(tree.skills.filter((s) => s.branch < 4).length, 12);
      assert.equal(tree.skills.filter((s) => s.branch === 5 && !s.supreme).length, 3, 'três poderes especiais');
      assert.equal(tree.skills.filter((s) => s.supreme).length, 1, 'uma suprema');
    });
    it(`${id}: toda dependência existe, é de camada anterior e não há ciclo`, () => {
      const by = new Map(tree.skills.map((s) => [s.id, s]));
      for (const s of tree.skills) for (const r of s.requires) {
        assert.ok(by.has(r), `${s.id} exige ${r}`);
        assert.ok(by.get(r).tier < s.tier || by.get(r).branch < s.branch, `${s.id} exige habilidade de camada igual ou acima: ${r}`);
      }
    });
    it(`${id}: custos e níveis crescem por camada (1/2/3, poder 5, suprema 8 no nível 10)`, () => {
      for (const s of tree.skills.filter((x) => x.branch < 4)) {
        assert.equal(s.cost, CT.CUSTOM_BRANCH_COSTS[s.tier - 1], s.id);
        assert.equal(s.minLevel, CT.CUSTOM_BRANCH_LEVELS[s.tier - 1], s.id);
      }
      for (const s of tree.skills.filter((x) => x.branch === 5 && !x.supreme)) assert.deepEqual([s.cost, s.minLevel], [CT.CUSTOM_POWER_COST, CT.CUSTOM_POWER_LEVEL], s.id);
      const sup = tree.skills.find((s) => s.supreme);
      assert.deepEqual([sup.cost, sup.minLevel], [CT.CUSTOM_SUPREME_COST, CT.CUSTOM_SUPREME_LEVEL]);
      assert.equal(sup.requires.length, 3, 'a suprema exige os três poderes especiais');
    });
    it(`${id}: a suprema é exclusiva (uma só, existe em SUPREMES e pertence a este personagem)`, () => {
      const sup = tree.skills.filter((s) => s.supreme);
      assert.equal(sup.length, 1);
      const eff = sup[0].effects.find((e) => e.t === 'supreme');
      assert.ok(eff && SUP.SUPREMES[eff.id]);
      assert.equal(SUP.SUPREMES[eff.id].characterId, id);
      for (const other of Object.keys(SKI.SKILL_TREES).filter((x) => x !== id)) {
        assert.ok(!SKI.SKILL_TREES[other].skills.some((s) => s.effects.some((e) => e.t === 'supreme' && e.id === eff.id)), `${other} não pode ter ${eff.id}`);
      }
    });
    it(`${id}: cada habilidade tem ícone existente e efeito real`, () => {
      for (const s of tree.skills) {
        assert.ok(ICON_SOURCES[s.icon], `${s.id}: ícone ${s.icon}`);
        assert.ok(s.effects.length >= 1, s.id);
      }
    });
  }
  it('as árvores dos três personagens não repetem nenhum id e não reaproveitam a árvore do Dogge', () => {
    const all = Object.values(SKI.SKILL_TREES).flatMap((t) => t.skills.map((s) => s.id));
    assert.equal(new Set(all).size, all.length);
    assert.notDeepEqual(SKI.SKILL_TREES.gadigago.skills.map((s) => s.effects), SKI.SKILL_TREES.orc.skills.map((s) => s.effects));
  });
  it('a árvore do Dogge continua com 68 pontos e as de Gadigago e Orc têm efeitos de combate distintos entre si', () => {
    assert.equal(SKI.totalSkillCost('dogge'), 68);
    const sig = (id) => JSON.stringify(SKI.SKILL_TREES[id].skills.map((s) => s.effects.map((e) => e.t).sort()));
    assert.notEqual(sig('gadigago'), sig('orc'));
  });
  it('applySkills dá efeito real num lutador e é conferido por habilidade aprendida', () => {
    const g = fighter('gadigago');
    const base = g.critChance;
    SKI.applySkills(g, 'gadigago', ['gd_a1']);
    assert.ok(g.critChance > base);
    const o = fighter('orc');
    const hp = o.maxHealth;
    SKI.applySkills(o, 'orc', ['oc_c1']);
    assert.ok(o.maxHealth > hp);
  });
  it('saves antigos: ids g_* da árvore removida do Gadigago devolvem os pontos e os ids novos são ignorados pelo Dogge', () => {
    assert.equal(SKI.legacySkillCost('g_a3'), 2);
    assert.equal(SKI.legacySkillCost('g_f4'), 8);
    assert.equal(SKI.legacySkillCost('gd_a1'), 0);
  });
});

describe('aprender habilidades (nível, pontos, dependências)', () => {
  const setup = (character, level = 99, points = 200) => {
    SK.respec?.();
    Q.resetQuestState(character);
    require('../../../src/game/state/saveExt.ts').resetExts();
    PS.addStatPoints?.(points);
  };
  it('a árvore do Gadigago respeita nível mínimo e dependência', () => {
    Q.resetQuestState('gadigago');
    const tree = SKI.SKILL_TREES.gadigago;
    const second = tree.skills.find((s) => s.branch === 0 && s.tier === 2);
    assert.equal(SK.canLearn(second), 'locked');
    const sup = tree.skills.find((s) => s.supreme);
    assert.equal(SK.canLearn(sup), 'locked');
  });
  it('trocar de personagem do mundo muda a árvore usada (treeFor) e o Dogge segue usando a dele', () => {
    assert.equal(SKI.treeFor('gadigago').character, 'gadigago');
    assert.equal(SKI.treeFor('orc').character, 'orc');
    assert.equal(SKI.treeFor('dogge').character, 'dogge');
    assert.equal(SKI.treeFor('soldier').character, 'dogge', 'personagem sem árvore própria ainda cai na do Dogge');
  });
});

describe('as duas habilidades principais: Versus x Exploração', () => {
  it('Gadigago e Orc têm uma de cada categoria, em ids diferentes e com os 5 idiomas', () => {
    for (const id of NEW) {
      const m = A.mainAbilities(id);
      assert.ok(m.versus && m.exploration, id);
      assert.notEqual(m.versus.id, m.exploration.id);
      assert.equal(A.abilityKind(m.versus), 'versus');
      assert.equal(A.abilityKind(m.exploration), 'exploration');
      for (const ab of [m.versus, m.exploration]) {
        for (const f of ['name', 'effect', 'usage']) {
          assert.equal(ab[f].length, 5, `${ab.id}.${f}`);
          for (const t of ab[f]) { assert.ok(t.length > 2); assert.ok(!NO_DASH.test(t)); }
        }
        assert.ok(ICON_SOURCES[A.abilityIcon(ab)], `${ab.id}: ícone`);
      }
      assert.notEqual(A.abilityIcon(m.versus), A.abilityIcon(m.exploration));
    }
  });
  it('Versus mexe só no lutador: o Pé de Madrugada e as Costas Largas não alteram nenhum atributo de luta', () => {
    for (const id of NEW) {
      A.setAbilityCharacter(id);
      const a = fighter(id), b = fighter(id);
      A.applyAbility(b, id); // só a Versus
      // a de exploração nunca é aplicada no lutador
      assert.notEqual(A.mainAbilities(id).exploration.area, 'combat');
      assert.equal(b.speed, a.speed, `${id}: velocidade de luta intacta`);
    }
    A.setAbilityCharacter('dogge');
  });
  it('Exploração mexe só no mundo: Pé de Madrugada acelera 10% e Costas Largas reduz o peso em 30%, cada um no seu personagem', () => {
    A.setAbilityCharacter('dogge');
    assert.equal(A.worldSpeedMult(), 1);
    assert.equal(A.carryWeightMult(), 1);
    A.setAbilityCharacter('gadigago');
    assert.equal(A.worldSpeedMult(), A.DAWN_STRIDE_SPEED);
    assert.equal(A.DAWN_STRIDE_SPEED, 1.1);
    assert.equal(A.carryWeightMult(), 1);
    A.setAbilityCharacter('orc');
    assert.equal(A.carryWeightMult(), A.BROAD_BACK_WEIGHT);
    assert.equal(A.BROAD_BACK_WEIGHT, 0.7);
    assert.equal(A.worldSpeedMult(), 1);
    A.setAbilityCharacter('dogge');
  });
  it('applyAbility é idempotente: reaplicar não duplica o efeito', () => {
    const f = fighter('gadigago');
    const base = f.critChance;
    assert.equal(A.applyAbility(f, 'gadigago'), true);
    assert.equal(A.applyAbility(f, 'gadigago'), false);
    assert.ok(Math.abs(f.critChance - (base + 0.18)) < 1e-9);
    const o = fighter('orc');
    A.applyAbility(o, 'orc');
    A.applyAbility(o, 'orc');
    assert.ok(Math.abs(o.damageTakenMult - 0.85) < 1e-9);
  });
});

describe('supremas', () => {
  it('catálogo: duas supremas, ícones existentes, textos em 5 idiomas sem travessão, mecânica e uso descritos', () => {
    assert.deepEqual(Object.keys(SUP.SUPREMES).sort(), ['ordem_recusada', 'trofeu_revanche']);
    for (const s of Object.values(SUP.SUPREMES)) {
      assert.ok(ICON_SOURCES[s.icon], s.id);
      for (const f of ['name', 'desc', 'usage']) {
        assert.equal(s[f].length, 5);
        for (const t of s[f]) { assert.ok(t.length > 5); assert.ok(!NO_DASH.test(t), `${s.id}.${f}`); }
      }
    }
    assert.notEqual(SUP.SUPREMES.trofeu_revanche.icon, SUP.SUPREMES.ordem_recusada.icon);
  });
  it('attachSupreme é idempotente e não liga suprema inexistente', () => {
    const f = fighter('gadigago');
    assert.equal(SUP.attachSupreme(f, 'trofeu_revanche'), true);
    f.supreme.stacks = 3;
    assert.equal(SUP.attachSupreme(f, 'trofeu_revanche'), false);
    assert.equal(f.supreme.stacks, 3, 'não reinicia');
    assert.equal(SUP.attachSupreme(fighter('orc'), 'nao_existe'), false);
  });
  it('Troféu da Revanche: 5 acertos limpos enchem o combo, o golpe seguinte é crítico garantido e devolve 10 de energia', () => {
    const g = fighter('gadigago'), d = fighter('dogge');
    SUP.attachSupreme(g, 'trofeu_revanche');
    for (let i = 0; i < SUP.TROFEU_MAX_STACKS; i++) {
      assert.equal(SUP.supremeBeforeHit(g, d).forceCrit, false);
      SUP.supremeAfterHit(g, { dealt: 10, blocked: false, forced: false });
    }
    assert.equal(g.supreme.stacks, 5);
    const pre = SUP.supremeBeforeHit(g, d);
    assert.equal(pre.forceCrit, true);
    assert.equal(pre.critMultBonus, SUP.TROFEU_CRIT_MULT_BONUS);
    g.energy = 20;
    SUP.supremeAfterHit(g, { dealt: 30, blocked: false, forced: true });
    assert.equal(g.supreme.stacks, 0);
    assert.ok(g.energy >= 20 + SUP.TROFEU_ENERGY_REFUND - 1e-9);
  });
  it('Troféu da Revanche: golpe bloqueado não conta, dano recebido e 2,5 s parado zeram o combo', () => {
    const g = fighter('gadigago');
    SUP.attachSupreme(g, 'trofeu_revanche');
    SUP.supremeAfterHit(g, { dealt: 10, blocked: true, forced: false });
    assert.equal(g.supreme.stacks, 0);
    SUP.supremeAfterHit(g, { dealt: 10, blocked: false, forced: false });
    SUP.supremeAfterHit(g, { dealt: 10, blocked: false, forced: false });
    assert.equal(g.supreme.stacks, 2);
    SUP.supremeAfterDamaged(g, { dealt: 5, blocked: true });
    assert.equal(g.supreme.stacks, 2, 'bloquear não zera');
    SUP.supremeAfterDamaged(g, { dealt: 5, blocked: false });
    assert.equal(g.supreme.stacks, 0);
    SUP.supremeAfterHit(g, { dealt: 10, blocked: false, forced: false });
    SUP.tickSupreme(g, SUP.TROFEU_WINDOW_MS);
    assert.equal(g.supreme.stacks, 0);
  });
  it('Troféu da Revanche: com menos vida que o oponente soma +8 pontos de crítico', () => {
    const g = fighter('gadigago'), d = fighter('dogge');
    SUP.attachSupreme(g, 'trofeu_revanche');
    assert.equal(SUP.supremeBeforeHit(g, d).critBonus, 0);
    g.health = g.maxHealth * 0.3;
    assert.equal(SUP.supremeBeforeHit(g, d).critBonus, SUP.TROFEU_COMEBACK_CRIT);
  });
  it('Ordem Recusada: dispara a 35% ou menos uma só vez por luta, reduz dano em 35%, soma 20% e protege de atordoar e congelar', () => {
    const o = fighter('orc');
    SUP.attachSupreme(o, 'ordem_recusada');
    o.health = o.maxHealth * 0.5;
    assert.deepEqual(SUP.supremeAfterDamaged(o, { dealt: 5, blocked: false }), [], 'acima de 35% nada acontece');
    o.health = o.maxHealth * 0.3;
    const ev = SUP.supremeAfterDamaged(o, { dealt: 5, blocked: false });
    assert.equal(ev.length, 1);
    assert.equal(ev[0].key, 'sup_ordem_on');
    assert.equal(o.tempTakenMult, SUP.ORDEM_TAKEN_MULT);
    assert.equal(o.tempDamageMult, SUP.ORDEM_DAMAGE_MULT);
    assert.equal(o.applyStatus('stun', 1000), false);
    assert.equal(o.applyStatus('freeze', 1000), false);
    // dano real 35% menor
    const a = fighter('orc'), b = fighter('orc');
    a.tempTakenMult = SUP.ORDEM_TAKEN_MULT;
    a.takeHit(40); b.takeHit(40);
    assert.ok(Math.abs((a.maxHealth - a.health) / (b.maxHealth - b.health) - 0.65) < 0.001);
    // acaba depois de 6 s
    SUP.tickSupreme(o, SUP.ORDEM_DURATION_MS);
    assert.equal(o.tempTakenMult, 1);
    assert.equal(o.tempDamageMult, 1);
    assert.equal(o.statusGuardMs, 0);
    assert.equal(o.applyStatus('stun', 500), true, 'volta a poder ser atordoado');
    // não dispara de novo, nem num novo round
    SUP.resetSupremeForRound(o);
    o.health = o.maxHealth * 0.2;
    assert.deepEqual(SUP.supremeAfterDamaged(o, { dealt: 5, blocked: false }), []);
    assert.equal(o.supreme.used, true);
  });
  it('a suprema de um personagem não funciona em outro lutador (Troféu não afeta o Orc e a Ordem não afeta o Gadigago)', () => {
    const o = fighter('orc'), g = fighter('gadigago');
    SUP.attachSupreme(o, 'ordem_recusada');
    assert.equal(SUP.supremeBeforeHit(o, g).forceCrit, false);
    SUP.supremeAfterHit(o, { dealt: 10, blocked: false, forced: false });
    assert.equal(o.supreme.stacks, 0);
    SUP.attachSupreme(g, 'trofeu_revanche');
    g.health = g.maxHealth * 0.1;
    assert.deepEqual(SUP.supremeAfterDamaged(g, { dealt: 5, blocked: false }), []);
  });
  it('o HUD de combo só existe para o Troféu da Revanche', () => {
    const g = fighter('gadigago'), o = fighter('orc');
    SUP.attachSupreme(g, 'trofeu_revanche');
    SUP.attachSupreme(o, 'ordem_recusada');
    assert.deepEqual(SUP.supremeHudStacks(g), { current: 0, max: SUP.TROFEU_MAX_STACKS });
    assert.equal(SUP.supremeHudStacks(o), null);
  });
  it('a suprema só entra na luta se estiver aprendida na árvore (efeito t:"supreme" em applySkills)', () => {
    const g = fighter('gadigago');
    SKI.applySkills(g, 'gadigago', []);
    assert.equal(g.supremeId, null);
    SKI.applySkills(g, 'gadigago', ['gd_f4']);
    assert.equal(g.supremeId, 'trofeu_revanche');
    const stacks = g.supreme;
    SKI.applySkills(g, 'gadigago', ['gd_f4']);
    assert.equal(g.supreme, stacks, 'reaplicar não recria o estado');
  });
});

describe('mochila, pesos e velocidade no mundo usam a Exploração', () => {
  it('o código do mundo lê worldSpeedMult e carryWeightMult', () => {
    const world = fs.readFileSync(new URL('../../../src/screens/WorldScreen.tsx', import.meta.url), 'utf8');
    assert.match(world, /worldSpeedMult/);
    const bag = fs.readFileSync(new URL('../../../src/game/items/bagRuntime.ts', import.meta.url), 'utf8');
    assert.match(bag, /carryWeightMult|weightMult/);
  });
});

describe('ícones 2D novos', () => {
  const names = ['ab_boot_march', 'ab_casca_grossa', 'ab_club', 'ab_combo', 'ab_costas_largas', 'ab_crosshair', 'ab_fury', 'ab_notebook', 'ab_pe_madrugada', 'ab_pot', 'ab_soco_certeiro', 'ab_soup', 'ab_sup_ordem_recusada', 'ab_sup_trofeu_revanche'];
  it('14 arquivos ab_*.png existem, estão registrados e nenhum caminho é duplicado ou inexistente', () => {
    const files = readDir('assets/icons').filter((f) => f.startsWith('ab_'));
    assert.deepEqual(files.sort(), names.map((n) => `${n}.png`).sort());
    for (const n of names) assert.ok(ICON_SOURCES[n], n);
    const reg = fs.readFileSync(new URL('../../../src/game/ui/iconRegistry.ts', import.meta.url), 'utf8');
    const paths = [...reg.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1]);
    assert.equal(new Set(paths).size, paths.length, 'caminhos duplicados');
    for (const p of paths) assert.ok(fs.existsSync(new URL(`../../../src/game/ui/${p}`, import.meta.url)), `inexistente: ${p}`);
  });
  it('são PNGs de verdade (assinatura), quadrados e com transparência', () => {
    for (const n of names) {
      const buf = fs.readFileSync(new URL(`../../../assets/icons/${n}.png`, import.meta.url));
      assert.equal(buf.subarray(1, 4).toString(), 'PNG', n);
      const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
      assert.equal(w, h, `${n} quadrado`);
      assert.ok(w >= 64, `${n} resolução`);
      assert.ok([4, 6].includes(buf[25]), `${n} canal alfa (tipo de cor ${buf[25]})`);
    }
  });
});
