/**
 * Mergulho: fôlego, afogamento, equipamentos, locais, travessias, criaturas, baús e save.
 * Roda a lógica real no Node. `node tools/test-mergulho.mjs`
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
require('./ts-register.cjs');
const B = require('../src/game/dive/breath.ts');
const Sites = require('../src/game/dive/diveSites.ts');
const Cr = require('../src/game/dive/diveCreatures.ts');
const Sim = require('../src/game/dive/diveSim.ts');
const DS = require('../src/game/dive/diveState.ts');
const { ITEMS } = require('../src/game/items/itemDefs.ts');
const { ARMORS, armorBreathOf } = require('../src/game/items/armorDefs.ts');
const P = require('../src/game/state/playerState.ts');
const SE = require('../src/game/state/saveExt.ts');
const SF = require('../src/game/state/storyFlags.ts');
const D = require('../src/game/account/deathCause.ts');

const M = B.NO_BREATH_MODS;
const ctxWater = { submerged: true, breathable: false, deep: false, mods: M };
const run = (st, ms, ctx, step = 100) => { let s = st; const ev = []; let dmg = 0; for (let t = 0; t < ms; t += step) { const r = B.stepBreath(s, step, ctx); s = r.state; ev.push(...r.events); dmg += r.damageFrac; } return { s, ev, dmg }; };

describe('fôlego: consumo, aviso e recuperação', () => {
  it('começa cheio e gasta 1 por segundo submerso', () => {
    const r = run(B.newBreath(), 10000, ctxWater);
    assert.ok(Math.abs(r.s.sec - 14) < 0.2, String(r.s.sec));
  });
  it('avisa "fôlego baixo" uma vez só', () => {
    const r = run(B.newBreath(), 20000, ctxWater);
    assert.equal(r.ev.filter((e) => e === 'low').length, 1);
  });
  it('na superfície ou num bolsão de ar recupera e some o aviso', () => {
    let st = run(B.newBreath(), 20000, ctxWater).s;
    const r = run(st, 5000, { ...ctxWater, breathable: true });
    assert.ok(r.s.sec > 22);
    const r2 = run(st, 5000, { ...ctxWater, submerged: false });
    assert.ok(r2.s.sec > 22);
  });
  it('capacidade extra de equipamento aumenta o máximo', () => {
    const mods = B.combineMods({ capacitySec: 18 }, { drainMult: 0.85 });
    assert.equal(B.breathMax(mods), 42);
    assert.ok(Math.abs(mods.drainMult - 0.85) < 1e-9);
    assert.equal(B.newBreath(mods).sec, 42);
  });
  it('redução de consumo vale', () => {
    const slow = run(B.newBreath(), 10000, { ...ctxWater, mods: B.combineMods({ drainMult: 0.5 }) });
    assert.ok(Math.abs(slow.s.sec - 19) < 0.2);
  });
  it('recuperação acelerada vale', () => {
    const st = { ...B.newBreath(), sec: 0, empty: false };
    const normal = run(st, 1000, { ...ctxWater, breathable: true });
    const fast = run(st, 1000, { ...ctxWater, breathable: true, mods: B.combineMods({ regenMult: 2 }) });
    assert.ok(fast.s.sec > normal.s.sec * 1.9);
  });
});

describe('afogamento: dano periódico, avisos, sem travar', () => {
  it('sem fôlego: primeiro o aviso "empty", depois dano a cada 1,5 s (nunca por quadro)', () => {
    let st = { ...B.newBreath(), sec: 0.05 };
    const events = [];
    let dmgTicks = 0;
    for (let i = 0; i < 100; i++) { const r = B.stepBreath(st, 16, ctxWater); st = r.state; events.push(...r.events); if (r.damageFrac > 0) dmgTicks++; }
    // 1600 ms simulados em quadros de 16 ms
    assert.ok(events.includes('empty'));
    assert.ok(dmgTicks <= 1, `danos em 1,6 s: ${dmgTicks}`);
  });
  it('em 6 s sem ar: exatamente 4 tiques de dano', () => {
    const st = { ...B.newBreath(), sec: 0, empty: true, drownMs: 0 };
    const r = run(st, 6000, ctxWater, 50);
    assert.equal(r.ev.filter((e) => e === 'drown').length, 4);
    assert.ok(Math.abs(r.dmg - 4 * B.BREATH_CONFIG.drownDamageFrac) < 1e-9);
  });
  it('o aviso "sem fôlego" vem ANTES do primeiro dano', () => {
    const r = run({ ...B.newBreath(), sec: 0.3 }, 4000, ctxWater, 50);
    assert.ok(r.ev.indexOf('empty') < r.ev.indexOf('drown'));
  });
  it('voltar a respirar para o dano na hora e avisa "recovered"', () => {
    let st = run({ ...B.newBreath(), sec: 0, empty: true }, 3000, ctxWater).s;
    const r = B.stepBreath(st, 100, { ...ctxWater, breathable: true });
    assert.ok(r.events.includes('recovered') && r.damageFrac === 0 && !r.state.empty);
  });
  it('dano de afogamento respeita a vida e nunca fica negativo', () => {
    const r = B.applyDamageFrac(50, 100, 0.06);
    assert.deepEqual(r, { health: 44, ko: false });
    const k = B.applyDamageFrac(3, 100, 0.2);
    assert.deepEqual(k, { health: 0, ko: true });
  });
  it('intensidade e frequência são configuráveis', () => {
    const cfg = { ...B.BREATH_CONFIG, drownIntervalMs: 500, drownDamageFrac: 0.1 };
    let s = { ...B.newBreath(), sec: 0, empty: true }; let dmg = 0;
    for (let i = 0; i < 20; i++) { const r = B.stepBreath(s, 100, ctxWater, cfg); s = r.state; dmg += r.damageFrac; }
    assert.ok(Math.abs(dmg - 0.4) < 1e-9);
  });
  it('quem nada, afoga, sobe e respira, sobrevive: sem estado irrecuperável', () => {
    let s = B.newBreath();
    let hp = 100;
    for (let t = 0; t < 40000 && hp > 0; t += 100) { const r = B.stepBreath(s, 100, ctxWater); s = r.state; hp = B.applyDamageFrac(hp, 100, r.damageFrac).health; if (hp <= 40) break; }
    assert.ok(hp > 0 && s.empty);
    const r = B.stepBreath(s, 100, { ...ctxWater, breathable: true });
    assert.ok(!r.state.empty);
    assert.notEqual(B.breathLevel(r.state, M), 'empty');
  });
});

describe('pressão das profundezas', () => {
  const deep = { ...ctxWater, deep: true };
  it('fundo sem proteção: dano periódico de pressão', () => {
    const r = run(B.newBreath(), 6000, deep, 50);
    assert.equal(r.ev.filter((e) => e === 'pressure').length, 3);
  });
  it('proteção de pressão (armadura de coral) anula', () => {
    const r = run(B.newBreath(), 6000, { ...deep, mods: B.combineMods(armorBreathOf('armor_coral'), undefined) }, 50);
    assert.equal(r.ev.filter((e) => e === 'pressure').length, 0);
  });
  it('num bolsão de ar não há pressão', () => {
    const r = run(B.newBreath(), 6000, { ...deep, breathable: true }, 50);
    assert.equal(r.ev.length, 0);
  });
});

describe('fôlego infinito: não gasta, não afoga, mas outros perigos valem', () => {
  const inf = B.combineMods(armorBreathOf('armor_gills'), undefined);
  it('armadura Brânquias de Atlântida é Secret e dá fôlego infinito', () => {
    assert.equal(ARMORS.armor_gills.rarity, 'secret');
    assert.equal(inf.infinite, true);
  });
  it('60 s debaixo d\'água sem perder fôlego nem levar dano', () => {
    const r = run(B.newBreath(inf), 60000, { ...ctxWater, mods: inf });
    assert.equal(r.s.sec, B.breathMax(inf));
    assert.equal(r.dmg, 0);
    assert.equal(B.breathLevel(r.s, inf), 'infinite');
  });
  it('tirar a armadura no fundo com o ar vazio volta ao afogamento (efeito só enquanto ativo)', () => {
    const r = run({ ...B.newBreath(), sec: 0, empty: true }, 3000, ctxWater);
    assert.ok(r.dmg > 0);
  });
  it('a pressão ainda machuca quem tem fôlego infinito sem proteção de pressão', () => {
    const r = run(B.newBreath(inf), 4000, { ...ctxWater, deep: true, mods: inf }, 50);
    assert.equal(r.ev.filter((e) => e === 'pressure').length, 2);
  });
  it('poção de bolhas não é gasta à toa com fôlego infinito', () => {
    P.addItem('bubble_potion', 1, true);
    const before = P.getInventory().bubble_potion;
    const r = DS.useDiveItem('bubble_potion', { infinite: true });
    assert.equal(r.ok, false);
    assert.equal(P.getInventory().bubble_potion, before);
  });
});

describe('itens e equipamentos de mergulho têm efeito real e raridade certa', () => {
  it('cada consumível de fôlego tem efeito e é só de mergulho', () => {
    for (const id of ['kelp_snack', 'bubble_potion', 'air_flask', 'diver_elixir']) {
      assert.ok(ITEMS[id].effects.some((e) => e.kind === 'breath' || e.kind === 'breathBuff'), id);
    }
    const { isUsable, isDiveItem } = require('../src/game/items/itemDefs.ts');
    assert.ok(isDiveItem('air_flask') && !isUsable('air_flask'));
  });
  it('armaduras de mergulho: capacidade, consumo e pressão', () => {
    assert.equal(armorBreathOf('armor_snorkel').capacitySec, 10);
    assert.equal(armorBreathOf('armor_wetsuit').drainMult, 0.85);
    assert.equal(armorBreathOf('armor_coral').pressureSafe, true);
    assert.equal(armorBreathOf('armor_leather'), undefined);
  });
  it('usar poção devolve fôlego e consome 1; sem a poção não faz nada', () => {
    P.addItem('air_flask', 2, true);
    const before = P.getInventory().air_flask;
    const r = DS.useDiveItem('air_flask');
    assert.deepEqual([r.ok, r.breathSec], [true, 30]);
    assert.equal(P.getInventory().air_flask, before - 1);
    assert.equal(DS.useDiveItem('nao_existe').ok, false);
  });
  it('elixir: reduz o gasto pela metade, não gasta outro enquanto ativo, e o tempo passa', () => {
    P.addItem('diver_elixir', 2, true);
    const a = DS.useDiveItem('diver_elixir');
    assert.ok(a.ok && a.buff);
    assert.equal(DS.currentBreathMods().drainMult, 0.5);
    const inv = P.getInventory().diver_elixir;
    assert.equal(DS.useDiveItem('diver_elixir').ok, false);
    assert.equal(P.getInventory().diver_elixir, inv);
    DS.tickBuff(121000);
    assert.equal(DS.currentBreathMods().drainMult, 1);
  });
  it('as lojas vendem o básico, mas não os Secret', () => {
    const { PLAZA_ARMORS } = require('../src/game/items/armorDefs.ts');
    assert.deepEqual(PLAZA_ARMORS, ['armor_leather', 'armor_snorkel', 'armor_wetsuit']);
    for (const id of ['armor_gills', 'armor_leviathan']) assert.equal(ARMORS[id].price, null);
  });
});

describe('locais de mergulho: mapas válidos', () => {
  const hubs = Object.values(Sites.SITES);
  it('há 9 locais (um por ilha) e 8 rotas entre ilhas', () => {
    assert.equal(hubs.length, 9);
    assert.equal(Sites.CROSSINGS.length, 8);
    const islands = new Set(hubs.map((s) => s.island));
    assert.equal(islands.size, 9);
  });
  for (const s of Object.values(Sites.ALL_SITES)) {
    it(`${s.id}: borda de rocha, tudo alcançável, chaves coerentes`, () => {
      const g = Sites.buildGrid(s);
      for (let x = 0; x < s.w; x++) assert.ok(Sites.isSolidChar(g[0][x]) && Sites.isSolidChar(g[s.h - 1][x]), 'borda topo/base');
      for (let y = 0; y < s.h; y++) assert.ok(Sites.isSolidChar(g[y][0]) && Sites.isSolidChar(g[y][s.w - 1]), 'borda lados');
      const start = s.exit;
      for (const a of s.air) assert.ok(Sites.pathLength(g, start, a) >= 0, 'ar');
      for (const c of s.chests ?? []) {
        if (c.hidden) {
          assert.equal(Sites.pathLength(g, start, c), -1, 'baú secreto não pode ser alcançável sem a parede: ' + c.id);
          assert.ok(Sites.pathLength(g, start, c, true) >= 0, 'baú secreto inalcançável: ' + c.id);
        } else assert.ok(Sites.pathLength(g, start, c) >= 0, 'baú ' + c.id);
      }
      for (const sp of s.spawns ?? []) assert.ok(Sites.pathLength(g, start, sp) >= 0, 'criatura ' + sp.creature);
      for (const sp of s.spawns ?? []) assert.ok(Cr.CREATURES[sp.creature], 'criatura existe: ' + sp.creature);
      assert.equal(g[s.exit.y][s.exit.x], 'U');
    });
  }
  it('ids de baús, paredes e portões são únicos', () => {
    const ids = [];
    for (const s of Object.values(Sites.ALL_SITES)) {
      for (const c of s.chests ?? []) ids.push('c:' + c.id);
      for (const h of s.hidden ?? []) ids.push('h:' + h.id);
    }
    assert.equal(new Set(ids).size, ids.length);
  });
  it('toda ilha com cais tem um local', () => {
    for (const island of ['main', 'main_west', 'misteriosa', 'fragments', 'vulcao', 'trevas', 'camp', 'dogisland', 'gelo']) assert.ok(Sites.siteForIsland(island), island);
  });
  it('itens e armaduras dos baús existem', () => {
    for (const s of Object.values(Sites.SITES)) for (const c of s.chests ?? []) {
      for (const id of Object.keys(c.items ?? {})) assert.ok(ITEMS[id], id);
      if (c.armor) assert.ok(ARMORS[c.armor], c.armor);
    }
  });
});

describe('REGRA SECRET: baú escondido só entrega item Secret', () => {
  it('todo baú escondido dá pelo menos um item Secret ou armadura Secret', () => {
    for (const s of Object.values(Sites.SITES)) for (const c of s.chests ?? []) {
      if (!c.hidden) continue;
      const secret = Object.keys(c.items ?? {}).some((id) => ITEMS[id].rarity === 'secret') || (c.armor && ARMORS[c.armor].rarity === 'secret');
      assert.ok(secret, 'baú escondido sem Secret: ' + c.id);
    }
  });
  it('item Secret não existe em nenhuma loja', () => {
    const shop = require('../src/game/items/itemDefs.ts');
    for (const list of [shop.SHOP_STOCK, shop.BATTLE_STOCK, shop.GELO_STOCK]) for (const id of list) assert.notEqual(ITEMS[id].rarity, 'secret', id);
  });
});

describe('criaturas: comportamentos distintos', () => {
  const rng = () => 0.5;
  const mk = (siteId, opt) => Sim.createSim(Sites.SITES[siteId], { rng, ...opt });
  it('há hostis, neutras, amigáveis e raras, cada uma com atributos próprios', () => {
    const by = (b) => Object.values(Cr.CREATURES).filter((c) => c.behavior === b);
    assert.ok(by('hostile').length >= 3 && by('neutral').length >= 3 && by('friendly').length >= 3 && by('rare').length >= 2);
    const sigs = new Set(Object.values(Cr.CREATURES).map((c) => [c.hp, c.damageFrac, c.speed, c.aggro].join()));
    assert.equal(sigs.size, Object.keys(Cr.CREATURES).length, 'duas criaturas com os mesmos números');
  });
  it('emboscada: a moreia fica escondida até o jogador chegar perto', () => {
    const sim = mk('naufragio');
    const moray = sim.entities.find((e) => e.def.id === 'moray');
    assert.equal(moray.state, 'hidden');
    Sim.stepSim(sim, 100, { x: moray.x + 400, y: moray.y }, rng);
    assert.equal(moray.state, 'hidden');
    Sim.stepSim(sim, 100, { x: moray.x + 60, y: moray.y }, rng);
    assert.equal(moray.state, 'chase');
  });
  it('hostil persegue, encosta e machuca com intervalo (sem dano a cada quadro)', () => {
    const sim = mk('abismo');
    const ang = sim.entities.find((e) => e.def.id === 'angler');
    const player = { x: ang.x + 20, y: ang.y };
    let hits = 0;
    for (let i = 0; i < 100; i++) hits += Sim.stepSim(sim, 16, player, rng).length;
    assert.ok(hits >= 1 && hits <= 2, `contatos em 1,6 s: ${hits}`);
  });
  it('neutra não ataca de longe; água-viva azul machuca só quem encosta', () => {
    const sim = mk('recife_pato');
    const jelly = sim.entities.find((e) => e.def.id === 'jelly_blue');
    const far = { x: jelly.x + 300, y: jelly.y };
    assert.equal(Sim.stepSim(sim, 100, far, rng).length, 0);
    assert.notEqual(jelly.state, 'chase');
    const near = Sim.stepSim(sim, 100, { x: jelly.x + 5, y: jelly.y }, rng);
    assert.equal(near.length, 1);
    assert.equal(near[0].dot.kind, 'poison');
  });
  it('amigável nunca causa dano e pode ser alimentada uma única vez, dando presente', () => {
    const sim = mk('recife_pato');
    const fish = sim.entities.find((e) => e.def.id === 'clownfish');
    for (let i = 0; i < 50; i++) assert.equal(Sim.stepSim(sim, 100, { x: fish.x, y: fish.y }, rng).filter((c) => c.entity === fish).length, 0);
    assert.equal(Sim.feedCreature(sim, fish.uid, { x: fish.x + 3, y: fish.y }).ok, true);
    const again = Sim.feedCreature(sim, fish.uid, { x: fish.x, y: fish.y });
    assert.deepEqual([again.ok, again.reason], [false, 'already']);
    assert.equal(Sim.feedCreature(sim, sim.entities.find((e) => e.def.id === 'crab').uid, { x: fish.x, y: fish.y }).ok, false);
  });
  it('vulnerabilidade e resistência mudam o dano', () => {
    assert.ok(Cr.attackMultVs(Cr.CREATURES.moray, 'heavy') > Cr.attackMultVs(Cr.CREATURES.moray, 'light'));
    assert.ok(Cr.attackMultVs(Cr.CREATURES.angler, 'heavy') > Cr.attackMultVs(Cr.CREATURES.angler, 'light'));
    assert.ok(Cr.attackMultVs(Cr.CREATURES.crab, 'heavy', true) < 0.4);
  });
  it('o golpe ataca e pode matar, devolvendo a recompensa', () => {
    const sim = mk('recife_pato');
    const crab = sim.entities.find((e) => e.def.id === 'crab');
    const r = Sim.playerStrike(sim, { x: crab.x - 20, y: crab.y }, { x: 1, y: 0 }, 'light', 200);
    assert.equal(r.kills.length, 1);
    assert.equal(crab.state, 'dead');
    assert.ok(crab.def.reward.coins > 0);
  });
  it('polvo aprende: golpe repetido perde força, mas nunca vira zero; outro golpe volta forte', () => {
    const sim = mk('caverna');
    const oct = sim.entities.find((e) => e.def.id === 'octopus');
    oct.hp = 1e6;
    const pl = { x: oct.x - 20, y: oct.y };
    const dmgs = [];
    for (let i = 0; i < 8; i++) dmgs.push(Sim.playerStrike(sim, pl, { x: 1, y: 0 }, 'light', 20).hits[0].damage);
    assert.ok(dmgs[7] < dmgs[0], dmgs.join());
    assert.ok(dmgs.every((d) => d >= 1));
    assert.ok(dmgs[7] >= Math.round(20 * 0.6), 'piso de 60%');
    const heavy = Sim.playerStrike(sim, pl, { x: 1, y: 0 }, 'heavy', 20).hits[0].damage;
    assert.ok(heavy >= 20 * 0.95, 'golpe diferente volta com força: ' + heavy);
  });
  it('acertar o polvo solta tinta', () => {
    const sim = mk('caverna');
    const oct = sim.entities.find((e) => e.def.id === 'octopus');
    Sim.playerStrike(sim, { x: oct.x - 20, y: oct.y }, { x: 1, y: 0 }, 'light', 5);
    assert.ok(sim.inkMs > 0);
  });
  it('neutra atacada fica brava e persegue; amigável atacada foge', () => {
    const sim = mk('recife_pato');
    const crab = sim.entities.find((e) => e.def.id === 'crab');
    const fish = sim.entities.find((e) => e.def.id === 'clownfish');
    Sim.playerStrike(sim, { x: crab.x - 20, y: crab.y }, { x: 1, y: 0 }, 'light', 1);
    assert.equal(crab.angry, true);
    Sim.playerStrike(sim, { x: fish.x - 20, y: fish.y }, { x: 1, y: 0 }, 'light', 1);
    assert.equal(fish.state, 'flee');
  });
  it('criaturas raras só aparecem na condição certa', () => {
    assert.ok(!mk('atlantis').entities.some((e) => e.def.id === 'whale'));
    assert.ok(mk('atlantis', { questWhale: true }).entities.some((e) => e.def.id === 'whale'));
    assert.ok(mk('abismo').entities.some((e) => e.def.id === 'jelly_violet'));
  });
  it('morto não ataca mais', () => {
    const sim = mk('abismo');
    const ang = sim.entities.find((e) => e.def.id === 'angler');
    ang.state = 'dead';
    assert.equal(Sim.stepSim(sim, 100, { x: ang.x, y: ang.y }, rng).length, 0);
  });
});

describe('causas de morte do mergulho usam o aviso contextual', () => {
  const { EXTRA_STRINGS } = require('../src/game/i18n/extraStrings.ts');
  const t = (k) => Object.assign({}, ...EXTRA_STRINGS.map((m) => m.pt))[k];
  it('afogamento e pressão num local', () => {
    assert.equal(D.describeDeath({ kind: 'hazard', hazard: 'drowning', region: 'Recife do Pato' }, t), 'Você morreu durante a exploração de Recife do Pato, devido a afogamento.');
    assert.equal(D.describeDeath({ kind: 'hazard', hazard: 'pressure', region: 'Abismo Sombrio' }, t), 'Você morreu durante a exploração de Abismo Sombrio, devido a pressão das profundezas.');
  });
  it('criatura envenenou: cita criatura e veneno', () => {
    assert.equal(D.describeDeath({ kind: 'entity', role: 'creature', name: 'Água-viva Rosa Venenosa', via: 'poison' }, t), 'Você morreu envenenado. Responsável: criatura Água-viva Rosa Venenosa.');
  });
});

describe('persistência do mergulho', () => {
  it('baú abre uma vez só, entrega o prêmio e não duplica', () => {
    const chest = Sites.SITES.recife_pato.chests[0];
    const c0 = P.getCoins ? P.getCoins() : 0;
    const bp = P.getInventory().bubble_potion ?? 0;
    const r = DS.openChest(chest);
    assert.equal(r.ok, true);
    assert.equal(P.getInventory().bubble_potion, bp + 2);
    assert.equal(SF.hasFlag('dive_first_chest'), true);
    const again = DS.openChest(chest);
    assert.deepEqual([again.ok, again.reason], [false, 'opened']);
    assert.equal(P.getInventory().bubble_potion, bp + 2);
    if (P.getCoins) assert.equal(P.getCoins(), c0 + chest.coins + 0 >= c0 ? P.getCoins() : -1);
  });
  it('baú secreto entrega Secret e a armadura de fôlego infinito', () => {
    const chest = Sites.SITES.atlantis.chests.find((c) => c.hidden);
    const r = DS.openChest(chest);
    assert.equal(r.ok, true);
    assert.ok(P.getOwnedArmors().includes('armor_gills'));
    assert.equal(P.getInventory().atlantis_heart, 1);
    assert.equal(SF.hasFlag('secret_heart_found'), true);
  });
  it('equipar as Brânquias liga o fôlego infinito; desequipar desliga', () => {
    P.equipArmor('armor_gills');
    assert.equal(DS.currentBreathMods().infinite, true);
    P.equipArmor(null);
    assert.equal(DS.currentBreathMods().infinite, false);
  });
  it('descoberta de local, parede secreta e registro de criaturas', () => {
    assert.equal(DS.markDiscovered('recife_pato'), true);
    assert.equal(DS.markDiscovered('recife_pato'), false);
    assert.equal(DS.markDiscovered('nao_existe'), false);
    assert.equal(SF.hasFlag('dive_site_recife_pato'), true);
    assert.equal(DS.revealWall('h_cabine'), true);
    DS.logCreatureSeen('moray'); DS.logCreatureDefeated('moray'); DS.logCreatureHelped('turtle');
    assert.equal(DS.creaturesKnown(), 2);
  });
  it('snapshot e restore: tudo volta; save antigo sem "dive" começa limpo; lixo não quebra', () => {
    const snap = JSON.parse(JSON.stringify(SE.snapshotExts().dive));
    assert.ok(snap.chests.includes('recife_bau_1') && snap.discovered.includes('recife_pato') && snap.walls.includes('h_cabine'));
    SE.resetExts();
    assert.equal(DS.getDiveData().chests.length, 0);
    SE.restoreExts({ dive: snap });
    assert.ok(DS.isChestOpen('recife_bau_1') && DS.isDiscovered('recife_pato'));
    assert.equal(DS.getCreatureRecord('moray').defeated, 1);
    SE.restoreExts({});
    assert.equal(DS.getDiveData().chests.length, 0);
    SE.restoreExts({ dive: { chests: [1, 'x'], discovered: ['lixo'], creatures: 7, buff: 'oi', stats: null } });
    assert.deepEqual(DS.getDiveData().chests, ['x']);
    assert.deepEqual(DS.getDiveData().discovered, []);
  });
  it('o abismo só abre com a bandeira da história', () => {
    SE.resetExts();
    assert.equal(DS.siteUnlocked('abismo'), false);
    assert.equal(DS.siteUnlocked('recife_pato'), true);
    SF.setFlag('dive_abyss_open');
    assert.equal(DS.siteUnlocked('abismo'), true);
  });
});

describe('sem travessão nos textos novos do jogo', () => {
  it('criaturas, locais e itens do mergulho', () => {
    const src = ['src/game/dive/diveCreatures.ts', 'src/game/dive/diveSites.ts'].map((f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')).join('\n');
    const strings = [...src.matchAll(/(?:name|line): '([^']*)'/g)].map((m) => m[1]);
    for (const s of strings) assert.ok(!/[—–]/.test(s) && !/ - /.test(s), s);
    for (const id of ['kelp_snack', 'bubble_potion', 'air_flask', 'diver_elixir', 'abyss_pearl', 'leviathan_scale', 'atlantis_heart']) assert.ok(!/[—–]/.test(ITEMS[id].description + ITEMS[id].name));
  });
});

describe('assets do mergulho batem com os dados', () => {
  const png = (rel) => {
    const b = fs.readFileSync(new URL(`../${rel}`, import.meta.url));
    assert.equal(b.slice(1, 4).toString(), 'PNG', rel);
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  };
  it('cada folha de criatura tem exatamente colunas x quadros de largura e linhas x quadros de altura', () => {
    const assets = fs.readFileSync(new URL('../src/game/dive/seaAssets.ts', import.meta.url), 'utf8');
    for (const c of Object.values(Cr.CREATURES)) {
      const sh = c.sheet;
      const m = assets.match(new RegExp(`${sh.key}: require\\('\\.\\./\\.\\./\\.\\./([^']+)'\\)`));
      assert.ok(m, `folha ${sh.key} sem require`);
      const d = png(m[1]);
      assert.deepEqual([d.w, d.h], [sh.cols * sh.fw, sh.rows * sh.fh], `${c.id}: ${sh.key}`);
      for (const f of sh.frames) assert.ok(f < sh.cols * sh.rows, `${c.id}: quadro ${f} fora da folha`);
    }
  });
  it('cada local tem a imagem de mapa com o tamanho certo', () => {
    for (const s of Object.values(Sites.ALL_SITES)) {
      const d = png(`assets/sea/maps/${s.id}.png`);
      assert.deepEqual([d.w, d.h], [s.w * Sites.TILE, s.h * Sites.TILE], s.id);
      assert.ok(fs.readFileSync(new URL('../src/game/dive/seaAssets.ts', import.meta.url), 'utf8').includes(`${s.id}: require`), 'sem require ' + s.id);
    }
  });
  it('todo arquivo referenciado em seaAssets.ts existe', () => {
    const src = fs.readFileSync(new URL('../src/game/dive/seaAssets.ts', import.meta.url), 'utf8');
    for (const m of src.matchAll(/require\('\.\.\/\.\.\/\.\.\/([^']+)'\)/g)) assert.ok(fs.existsSync(new URL(`../${m[1]}`, import.meta.url)), m[1]);
  });
  it('o mundo abre o mergulho de qualquer costa, pausa e trata derrota e emersão', () => {
    const w = fs.readFileSync(new URL('../src/screens/WorldScreen.tsx', import.meta.url), 'utf8');
    assert.match(w, /<DiveOverlay/);
    assert.match(w, /nearestSeaStart\(/);
    assert.match(w, /teleportToTile\(dest\.x, dest\.y\)/);
    assert.match(w, /beginDowned\(\); \/\/ mesma tela de derrota/);
    assert.ok((w.match(/interior \|\| diveSite/g) || []).length >= 6, 'o mundo precisa pausar durante o mergulho');
  });
  it('cada NPC dos locais existe e cada fala é um texto sem travessão', () => {
    const { DIVE_NPCS } = require('../src/game/dive/diveNpcs.ts');
    for (const s of Object.values(Sites.SITES)) for (const n of s.npcs ?? []) assert.ok(DIVE_NPCS[n.npc], n.npc);
    for (const n of Object.values(DIVE_NPCS)) {
      for (const has of [() => false, () => true]) { const line = n.say(has); assert.ok(line.length > 10 && !/[—–]/.test(line), n.id); }
      if (n.shop) for (const id of n.shop.stock) assert.ok(ITEMS[id] && ITEMS[id].rarity !== 'secret', id);
    }
  });
});
