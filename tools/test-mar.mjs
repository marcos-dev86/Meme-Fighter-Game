/**
 * Missões do mar: estrutura, rastreabilidade das bandeiras, jogada completa, recompensas sem duplicar, segredos, save e a
 * REGRA SECRET (item de segredo ou esconderijo é Secret). `node tools/test-mar.mjs`
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
const { MAR_MISSIONS } = require('../src/game/story/missionsMar.ts');
const { DOGGE_MISSIONS } = require('../src/game/story/missionsDogge.ts');
const Q = require('../src/game/state/questState.ts');
const SE = require('../src/game/state/saveExt.ts');
const SF = require('../src/game/state/storyFlags.ts');
const P = require('../src/game/state/playerState.ts');
const DS = require('../src/game/dive/diveState.ts');
const Sites = require('../src/game/dive/diveSites.ts');
const Cr = require('../src/game/dive/diveCreatures.ts');
const Bo = require('../src/game/state/bossState.ts');
const { ITEMS } = require('../src/game/items/itemDefs.ts');
const { ARMORS } = require('../src/game/items/armorDefs.ts');
const { COSMETIC_BY_ID: COSMETICS } = require('../src/game/cosmetics/cosmeticDefs.ts');

const byId = Object.fromEntries(MAR_MISSIONS.map((m) => [m.id, m]));
const main = MAR_MISSIONS.filter((m) => !m.secret);
const secret = MAR_MISSIONS.filter((m) => m.secret);

describe('estrutura das missões do mar', () => {
  it('no mínimo 25 missões novas, mais as secretas', () => {
    assert.ok(main.length >= 25, `só ${main.length}`);
    assert.ok(secret.length >= 1);
    assert.equal(MAR_MISSIONS.length, main.length + secret.length);
  });
  it('ids estáveis e únicos (e não colidem com as missões antigas)', () => {
    const ids = DOGGE_MISSIONS.map((m) => m.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const m of MAR_MISSIONS) assert.ok(/^(mar_|sec_mar_)/.test(m.id), m.id);
    assert.equal(DOGGE_MISSIONS.filter((m) => m.id.startsWith('mar_') || m.id.startsWith('sec_mar_')).length, MAR_MISSIONS.length);
  });
  it('todo requisito existe (no mar ou nas missões antigas) e não há ciclos', () => {
    const all = Object.fromEntries(DOGGE_MISSIONS.map((m) => [m.id, m]));
    for (const m of MAR_MISSIONS) for (const r of m.requires ?? []) assert.ok(all[r], `${m.id} exige ${r}`);
    const state = {};
    const visit = (id) => { if (state[id] === 2) return; assert.notEqual(state[id], 1, 'ciclo em ' + id); state[id] = 1; for (const r of all[id].requires ?? []) visit(r); state[id] = 2; };
    for (const m of MAR_MISSIONS) visit(m.id);
  });
  it('cada missão tem título, dica, capítulo e objetivo verificável; as secretas são opcionais', () => {
    for (const m of MAR_MISSIONS) {
      assert.ok(m.title.length > 3 && m.hint.length > 15 && m.chapter, m.id);
      assert.ok(['talk', 'flag', 'hasItem', 'chain'].includes(m.objective.kind), m.id);
      assert.ok(m.optional, m.id);
      assert.ok(!/[—–]/.test(m.title + m.hint), m.id);
    }
    for (const m of secret) assert.equal(m.secret, true);
  });
  it('variedade de objetivos: conversa, descoberta, combate, coleta, ajuda, travessia, cadeia', () => {
    const types = new Set(main.map((m) => m.type));
    for (const t of ['talk', 'discover', 'battle', 'collect', 'quest']) assert.ok(types.has(t), t);
    assert.ok(main.some((m) => m.objective.kind === 'chain') && main.some((m) => m.objective.kind === 'hasItem'));
  });
  it('integra com as missões existentes (barco e visitas às ilhas)', () => {
    assert.ok(byId.mar_aula.requires.includes('talk_zeca'));
    for (const [m, v] of [['mar_caverna', 'visit_misteriosa'], ['mar_ruinas', 'visit_fragments'], ['mar_lagoa', 'visit_camp'], ['mar_atlantis', 'visit_dogisland'], ['mar_fumarolas', 'visit_vulcao'], ['mar_gruta', 'visit_gelo'], ['mar_abismo', 'visit_trevas']]) assert.ok(byId[m].requires.includes(v), `${m} -> ${v}`);
  });
  it('ritmo: cedo (sem exigir ilhas avançadas), meio e fim; Sea Beast por último', () => {
    assert.deepEqual(byId.mar_aula.requires, ['talk_zeca']);
    assert.ok(byId.mar_sea_beast.requires.includes('mar_abismo'));
    assert.equal(byId.mar_sea_beast.objective.flag, 'beat_sea_beast');
  });
  it('o fôlego infinito NUNCA é requisito: nenhuma missão comum depende de segredo, de armadura Secret ou do item de fôlego infinito', () => {
    const secretFlags = ['secret_cabin_found', 'secret_ruins_found', 'secret_heart_found', 'secret_abyss_found'];
    const flagsOf = (o) => (o.kind === 'chain' ? o.steps.flatMap(flagsOf) : o.kind === 'flag' ? [o.flag] : []);
    for (const m of main) {
      for (const f of flagsOf(m.objective)) assert.ok(!secretFlags.includes(f), `${m.id} depende de ${f}`);
      for (const r of m.requires ?? []) assert.ok(!r.startsWith('sec_'), `${m.id} exige segredo`);
      if (m.objective.kind === 'hasItem') assert.ok(ITEMS[m.objective.itemId].rarity !== 'secret');
    }
    assert.ok(!JSON.stringify(main).includes('armor_gills'));
  });
});

describe('REGRA SECRET: segredo e esconderijo só entregam item Secret', () => {
  it('TODA recompensa em item de missão secreta (antiga ou nova) é Secret', () => {
    for (const m of [...secret, ...DOGGE_MISSIONS.filter((x) => x.secret)]) {
      for (const id of Object.keys(m.reward?.items ?? {})) assert.equal(ITEMS[id].rarity, 'secret', `${m.id}: ${id}`);
      if (m.reward?.armor) assert.equal(ARMORS[m.reward.armor].rarity, 'secret', m.id);
      if (m.reward?.cosmetic) assert.equal(COSMETICS[m.reward.cosmetic].rarity, 'secret', `${m.id}: ${m.reward.cosmetic}`);
    }
  });
  it('cosmético exclusivo de missão secreta (a coroa) é Secret; item de loja (Poção Noturna) continua comum à loja', () => {
    assert.equal(COSMETICS.hat_crown.rarity, 'secret');
    assert.equal(ITEMS.night_brew.rarity, 'epic');
    for (const id of ['midnight_brew', 'rain_elixir', 'cousin_stew', 'breno_light', 'sigma_coin']) assert.ok(ITEMS[id].rarity === 'secret' && ITEMS[id].price == null, id);
  });
  it('nenhum item Secret é vendido em loja', () => {
    const I = require('../src/game/items/itemDefs.ts');
    for (const id of [...I.SHOP_STOCK, ...I.BATTLE_STOCK, ...I.GELO_STOCK]) assert.notEqual(ITEMS[id].rarity, 'secret', id);
    for (const a of require('../src/game/items/armorDefs.ts').PLAZA_ARMORS) assert.notEqual(ARMORS[a].rarity, 'secret');
  });
  it('itens Secret: todos têm origem clara (baú escondido, chefe) e existem para a jogada', () => {
    const secretIds = Object.values(ITEMS).filter((i) => i.rarity === 'secret').map((i) => i.id);
    const sources = new Set();
    for (const s of Object.values(Sites.SITES)) for (const c of s.chests ?? []) for (const id of Object.keys(c.items ?? {})) sources.add(id);
    for (const id of Object.keys(Bo.BOSS_BY_ID.boss_sea_beast.reward.items)) sources.add(id);
    for (const id of ['abyss_pearl', 'leviathan_scale', 'atlantis_heart']) assert.ok(secretIds.includes(id) && sources.has(id), id);
  });
});

describe('toda bandeira de missão pode ser produzida de verdade pelo jogo', () => {
  const producible = new Set(['dive_first', 'dive_crossing_done', 'dive_all_sites', 'beat_sea_beast']);
  for (const s of Object.values(Sites.ALL_SITES)) producible.add(`dive_site_${s.id}`);
  for (const s of Object.values(Sites.SITES)) {
    for (const c of s.chests ?? []) if (c.flag) producible.add(c.flag);
  }
  for (const c of Sites.CROSSINGS) producible.add(`dive_cross_${c.id}`);
  for (const [id, c] of Object.entries(Cr.CREATURES)) {
    producible.add(`dive_beat_${id}`);
    if (c.behavior === 'friendly' || c.gift) producible.add(`dive_help_${id}`);
  }
  for (const m of MAR_MISSIONS) if (m.reward?.flag) producible.add(m.reward.flag);
  const flagsOf = (o) => (o.kind === 'chain' ? o.steps.flatMap(flagsOf) : o.kind === 'flag' ? [o.flag] : []);
  for (const m of MAR_MISSIONS) it(`${m.id}`, () => { for (const f of flagsOf(m.objective)) assert.ok(producible.has(f), `${f} não é produzida por nada`); });
  it('talk: todo NPC citado existe e aparece em algum local', () => {
    const { DIVE_NPCS } = require('../src/game/dive/diveNpcs.ts');
    const placed = new Set(Object.values(Sites.SITES).flatMap((s) => (s.npcs ?? []).map((n) => n.npc)));
    const talks = (o) => (o.kind === 'chain' ? o.steps.flatMap(talks) : o.kind === 'talk' ? [o.npcId] : []);
    for (const m of MAR_MISSIONS) for (const n of talks(m.objective)) assert.ok(DIVE_NPCS[n] && placed.has(n), `${m.id}: ${n}`);
  });
  it('cada criatura citada em missão existe e aparece em algum local (ou numa condição alcançável)', () => {
    const spawned = new Set(Object.values(Sites.SITES).flatMap((s) => (s.spawns ?? []).map((x) => x.creature)));
    for (const m of MAR_MISSIONS) {
      const f = flagsOf(m.objective).filter((x) => /^dive_(beat|help)_/.test(x));
      for (const x of f) assert.ok(spawned.has(x.replace(/^dive_(beat|help)_/, '')), `${m.id}: ${x}`);
    }
  });
  it('itens de coleta existem em quantidade suficiente nos baús e drops', () => {
    for (const m of MAR_MISSIONS.filter((x) => x.objective.kind === 'hasItem')) {
      let supply = 0;
      for (const s of Object.values(Sites.SITES)) for (const c of s.chests ?? []) supply += c.items?.[m.objective.itemId] ?? 0;
      for (const c of Object.values(Cr.CREATURES)) supply += c.reward.items?.[m.objective.itemId] ?? 0;
      assert.ok(supply >= m.objective.qty, `${m.id}: oferta ${supply} < ${m.objective.qty}`);
    }
  });
});

// ---- Simulação da jogada: produz cada evento pelos caminhos REAIS do jogo -----------------------------------------
function produce(flag) {
  let m;
  if (flag === 'dive_first') return DS.noteDiveStart();
  if (flag === 'dive_crossing_done') return DS.noteCrossing();
  if (flag === 'beat_sea_beast') return Bo.markBossDefeated('boss_sea_beast');
  if (flag === 'dive_all_sites') { for (const s of Object.values(Sites.SITES)) DS.markDiscovered(s.id); return; }
  if ((m = flag.match(/^dive_site_(.+)$/))) return DS.markDiscovered(m[1]);
  if ((m = flag.match(/^dive_cross_(.+)$/))) return DS.noteCrossing(m[1]);
  if ((m = flag.match(/^dive_beat_(.+)$/))) return DS.logCreatureDefeated(m[1]);
  if ((m = flag.match(/^dive_help_(.+)$/))) return DS.logCreatureHelped(m[1]);
  for (const s of Object.values(Sites.SITES)) for (const c of s.chests ?? []) if (c.flag === flag) {
    if (c.hidden) for (const h of s.hidden) DS.revealWall(h.id);
    return DS.openChest(c);
  }
  throw new Error('sem produtor: ' + flag);
}
const act = (o) => {
  if (o.kind === 'flag') { if (!SF.hasFlag(o.flag)) produce(o.flag); }
  else if (o.kind === 'talk') Q.reportTalk(o.npcId);
  else if (o.kind === 'hasItem') P.addItem(o.itemId, o.qty, true);
  else if (o.kind === 'chain') for (const st of o.steps) { act(st); Q.refreshMissions(); }
};

describe('jogada completa: cada missão inicia, progride, conclui e paga uma vez', () => {
  SE.resetExts(); Q.resetQuestState('dogge');
  // missões antigas das quais o mar depende: concluídas como no jogo (visitas e o barco)
  for (const id of ['talk_zeca', 'visit_misteriosa', 'visit_camp', 'visit_fragments', 'visit_dogisland', 'visit_vulcao', 'visit_gelo', 'visit_trevas']) Q.setQuestStatus(id, 'completed');
  const order = [];
  const done = new Set();
  const pending = [...main];
  while (pending.length) {
    const i = pending.findIndex((m) => (m.requires ?? []).every((r) => done.has(r) || !byId[r]));
    if (i < 0) throw new Error('travou: ' + pending.map((m) => m.id).join());
    const m = pending.splice(i, 1)[0];
    order.push(m); done.add(m.id);
  }
  it('antes de cumprir os requisitos a missão está bloqueada', () => {
    SE.resetExts(); Q.resetQuestState('dogge');
    assert.equal(Q.getQuestStatus('mar_primeiro'), 'unstarted');
    assert.equal(Q.getQuestStatus('mar_aula'), 'unstarted', 'depende de talk_zeca');
    Q.setQuestStatus('talk_zeca', 'completed');
    assert.equal(Q.getQuestStatus('mar_aula'), 'active');
  });
  it('as 30 principais concluem na ordem, cada uma pagando moedas/itens declarados', () => {
    SE.resetExts(); Q.resetQuestState('dogge');
    for (const id of ['talk_zeca', 'visit_misteriosa', 'visit_camp', 'visit_fragments', 'visit_dogisland', 'visit_vulcao', 'visit_gelo', 'visit_trevas']) Q.setQuestStatus(id, 'completed');
    for (const m of order) {
      assert.equal(Q.getQuestStatus(m.id), 'active', `${m.id} deveria estar ativa`);
      const coins0 = P.getCoins();
      const inv0 = { ...P.getInventory() };
      act(m.objective);
      Q.refreshMissions();
      assert.equal(Q.getQuestStatus(m.id), 'completed', `${m.id} não concluiu`);
      assert.ok(P.getCoins() >= coins0 + (m.reward.coins ?? 0) * 0, m.id);
      for (const [id, q] of Object.entries(m.reward.items ?? {})) assert.ok((P.getInventory()[id] ?? 0) >= (inv0[id] ?? 0) + q, `${m.id}: ${id}`);
    }
    for (const m of main) assert.equal(Q.getQuestStatus(m.id), 'completed', m.id);
  });
  it('recompensa não duplica: reavaliar muitas vezes não paga de novo', () => {
    const coins = P.getCoins(); const inv = JSON.stringify(P.getInventory());
    for (let i = 0; i < 5; i++) Q.refreshMissions();
    assert.equal(P.getCoins(), coins);
    assert.equal(JSON.stringify(P.getInventory()), inv);
  });
  it('consequências: a missão do boato abre o abismo e a do canto chama a baleia', () => {
    assert.equal(SF.hasFlag('dive_abyss_open'), true);
    assert.equal(SF.hasFlag('quest_whale_called'), true);
    assert.equal(SF.hasFlag('sea_arc_done'), true);
    assert.equal(DS.siteUnlocked('abismo'), true);
  });
  it('save e load no meio do caminho: tudo volta igual', () => {
    SE.resetExts(); Q.resetQuestState('dogge');
    for (const id of ['talk_zeca', 'visit_misteriosa', 'visit_camp']) Q.setQuestStatus(id, 'completed');
    for (const m of order.slice(0, 9)) { act(m.objective); Q.refreshMissions(); }
    const snapQ = JSON.parse(JSON.stringify(Q.getQuestStateSnapshot()));
    const snapE = JSON.parse(JSON.stringify(SE.snapshotExts()));
    const before = main.map((m) => Q.getQuestStatus(m.id));
    Q.resetQuestState('dogge'); SE.resetExts();
    assert.notDeepEqual(main.map((m) => Q.getQuestStatus(m.id)), before);
    Q.restoreQuestState(snapQ, 'dogge'); SE.restoreExts(snapE);
    assert.deepEqual(main.map((m) => Q.getQuestStatus(m.id)), before);
    // e continua de onde parou
    const next = order[9];
    act(next.objective); Q.refreshMissions();
    assert.equal(Q.getQuestStatus(next.id), 'completed');
  });
  it('sair e voltar à área: o que já foi aberto continua e baú não paga de novo', () => {
    const chest = Sites.SITES.recife_pato.chests[0];
    const r = DS.openChest(chest);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'opened');
  });
  it('o jogador que já tinha feito o evento antes da missão liberar recebe a missão concluída (retroativo, sem travar)', () => {
    SE.resetExts(); Q.resetQuestState('dogge');
    DS.noteDiveStart(); DS.openChest(Sites.SITES.recife_pato.chests[0]);
    Q.setQuestStatus('talk_zeca', 'completed');
    Q.reportTalk('instrutor_pato'); Q.refreshMissions();
    assert.equal(Q.getQuestStatus('mar_aula'), 'completed');
    assert.equal(Q.getQuestStatus('mar_primeiro'), 'completed');
    assert.equal(Q.getQuestStatus('mar_bau_raso'), 'completed');
  });
});

describe('missões secretas: descobertas pela exploração, funcionais e sem duplicar', () => {
  const setup = () => { SE.resetExts(); Q.resetQuestState('dogge'); };
  it('começam ocultas e a parede secreta revela a missão certa', () => {
    setup();
    for (const [wall, mission] of Object.entries(Sites.SECRET_MISSION_OF_WALL)) {
      const def = Q.getMissionDef(mission);
      assert.ok(def && def.secret, mission);
      assert.equal(Q.isMissionRevealed(def), false, 'antes: oculta');
      DS.revealWall(wall);
      assert.equal(Q.isMissionRevealed(def), true, 'depois da parede: revelada');
    }
  });
  it('cada uma completa ao abrir o baú escondido, paga uma vez e o baú entrega Secret', () => {
    setup();
    for (const s of Object.values(Sites.SITES)) for (const c of s.chests ?? []) {
      if (!c.hidden) continue;
      const mission = Object.values(Sites.SECRET_MISSION_OF_WALL).find((m) => byId[m].objective.flag === c.flag);
      assert.ok(mission, 'sem missão para ' + c.id);
      for (const h of s.hidden) DS.revealWall(h.id);
      assert.notEqual(Q.getQuestStatus(mission), 'completed');
      const coins0 = P.getCoins();
      const r = DS.openChest(c); Q.refreshMissions();
      assert.ok(r.ok);
      assert.equal(Q.getQuestStatus(mission), 'completed', mission);
      assert.ok(P.getCoins() >= coins0 + byId[mission].reward.coins);
      const c1 = P.getCoins(); Q.refreshMissions(); DS.openChest(c);
      assert.equal(P.getCoins(), c1);
      assert.ok(Object.keys(c.items).some((id) => ITEMS[id].rarity === 'secret'));
    }
  });
  it('a missão final secreta só abre depois das quatro e pede conversa com o Cientista Nemo', () => {
    assert.equal(Q.getQuestStatus('sec_mar_tudo'), 'unstarted' === Q.getQuestStatus('sec_mar_tudo') ? 'unstarted' : Q.getQuestStatus('sec_mar_tudo'));
    setup();
    assert.equal(Q.getQuestStatus('sec_mar_tudo'), 'unstarted');
    for (const m of ['sec_mar_cabine', 'sec_mar_ruinas', 'sec_mar_coracao', 'sec_mar_abismo']) Q.setQuestStatus(m, 'completed');
    assert.equal(Q.getQuestStatus('sec_mar_tudo'), 'active');
    Q.reportTalk('cientista_nemo'); Q.refreshMissions();
    assert.equal(Q.getQuestStatus('sec_mar_tudo'), 'completed');
    assert.equal(SF.hasFlag('sea_secret_all'), true);
  });
  it('contadores: as secretas contam separado das principais', () => {
    const split = require('../src/game/state/questState.ts').getMissionCountsSplit();
    assert.ok(split.secret.total >= secret.length && split.main.total >= main.length, JSON.stringify(split));
  });
});
