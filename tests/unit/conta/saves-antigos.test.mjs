/**
 * Auditoria de saves (Parte 5): saves antigos (formato v1, v2 sem campos novos, ids antigos, JSON quebrado) carregam sem erro e
 * ganham valores padrão; salvar de novo preserva o progresso. Roda o saveState REAL no Node, com AsyncStorage em memória e os
 * módulos nativos (react-native/expo) trocados por stubs vazios. `node tests/unit/conta/saves-antigos.test.mjs`
 */
import { createRequire } from 'node:module';
import Module from 'node:module';
import { describe, it, beforeEach } from 'node:test';
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
const S = require('../../../src/game/state/saveState.ts');
const { hasFlag } = require('../../../src/game/state/storyFlags.ts');
const { CUTSCENES } = require('../../../src/game/story/cutscenes.ts');
const { getPlayerStateSnapshot } = require('../../../src/game/state/playerState.ts');
const { getQuestStateSnapshot } = require('../../../src/game/state/questState.ts');
const R = require('../../../src/game/state/rivalState.ts');
const EL = require('../../../src/game/state/eliteState.ts');
const PG = require('../../../src/game/state/progressState.ts');
const ST = require('../../../src/game/state/settingsState.ts');

const K = (i) => `meme_fighter_slot_${i + 1}_v2`;
const baseQuest = () => ({ quests: {}, counts: {}, claimed: {} });
const oldV2 = (extra = {}) => ({
  version: 2, name: 'Mundo Velho', difficulty: 'hard', createdAt: 1, savedAt: 2, playTimeMs: 5000,
  player: { x: 320, y: 640, facing: 'left' },
  playerState: { coins: 777, inventory: { health_potion: 3 }, collected: ['chest_a'], upgrades: {} },
  quest: baseQuest(), lore: { fragA: true, fragB: false, fragC: false },
  ...extra,
});
beforeEach(() => store.clear());

describe('saves antigos', () => {
  it('v1 (slot único antigo) migra para o slot 1 com valores padrão e a chave antiga some', async () => {
    store.set('meme_fighter_save_v1', JSON.stringify({ version: 1, savedAt: 99, player: { x: 1, y: 2, facing: 'up' }, playerState: { coins: 42, inventory: {}, collected: [], upgrades: {} }, quest: baseQuest(), lore: { fragA: false, fragB: false, fragC: false } }));
    const slots = await S.listSlots();
    assert.equal(slots[0].version, 2);
    assert.equal(slots[0].name, 'Meu Mundo');
    assert.equal(slots[0].difficulty, 'medium');
    assert.equal(slots[0].playerState.coins, 42);
    assert.equal(slots[1], null);
    assert.equal(store.has('meme_fighter_save_v1'), false);
  });
  it('v1 não sobrescreve um slot 1 que já existe', async () => {
    store.set(K(0), JSON.stringify(oldV2({ name: 'Atual' })));
    store.set('meme_fighter_save_v1', JSON.stringify({ version: 1, playerState: {}, quest: {}, lore: {} }));
    assert.equal((await S.listSlots())[0].name, 'Atual');
  });
  it('v2 sem campos novos (sem ext, explored, characterId, xp, equipped) carrega e roda a sessão sem erro', async () => {
    store.set(K(1), JSON.stringify(oldV2()));
    const d = (await S.listSlots())[1];
    assert.equal(d.name, 'Mundo Velho');
    assert.doesNotThrow(() => S.startSession(1, d));
    assert.equal(getPlayerStateSnapshot().coins, 777);
    // nenhuma cutscene já vista nem enfileirada num save antigo
    for (const c of CUTSCENES) assert.equal(hasFlag(`cs:${c.id}`), false, c.id);
  });
  it('salvar de novo mantém o progresso e acrescenta ext/explored', async () => {
    store.set(K(2), JSON.stringify(oldV2()));
    S.startSession(2, (await S.listSlots())[2]);
    assert.equal(await S.saveGame({ x: 10, y: 20, facing: 'down' }), true);
    const again = JSON.parse(store.get(K(2)));
    assert.equal(again.version, 2);
    assert.equal(again.playerState.coins, 777);
    assert.deepEqual(again.player, { x: 10, y: 20, facing: 'down' });
    assert.equal(typeof again.ext, 'object');
    assert.equal(again.lore.fragA, true);
  });
  it('ids antigos (tocao/serafim/capiroto) são migrados ao carregar', async () => {
    store.set(K(0), JSON.stringify(oldV2({ quest: { quests: { tronco_tocao: 'completed' }, counts: {}, claimed: {} }, ext: { bosses: { defeated: ['boss_tocao'] } } })));
    const d = (await S.listSlots())[0];
    assert.equal(d.quest.quests.tronco_sahur, 'completed');
    assert.deepEqual(d.ext.bosses.defeated, ['boss_sahur']);
  });
  it('dificuldade inválida vira "medium"; ext com chaves desconhecidas é aceito', async () => {
    store.set(K(0), JSON.stringify(oldV2({ difficulty: 'impossivel', ext: { modulo_que_nao_existe_mais: { a: 1 } } })));
    const d = (await S.listSlots())[0];
    assert.equal(d.difficulty, 'medium');
    assert.doesNotThrow(() => S.startSession(0, d));
  });
});

describe('saves quebrados não derrubam o jogo', () => {
  it('JSON inválido, versão desconhecida e valor vazio = slot vazio', async () => {
    store.set(K(0), '{nao e json');
    store.set(K(1), JSON.stringify({ ...oldV2(), version: 99 }));
    store.set(K(2), '');
    assert.deepEqual(await S.listSlots(), [null, null, null]);
  });
  it('apagar um slot só limpa aquele', async () => {
    store.set(K(0), JSON.stringify(oldV2({ name: 'A' })));
    store.set(K(1), JSON.stringify(oldV2({ name: 'B' })));
    await S.deleteSlot(0);
    const s = await S.listSlots();
    assert.equal(s[0], null);
    assert.equal(s[1].name, 'B');
  });
});

describe('mundo novo', () => {
  it('createWorld grava e listSlots devolve; nome é cortado em 18 letras', async () => {
    const d = await S.createWorld(0, '  Nome muito muito comprido demais  ', 'easy');
    assert.ok(d);
    assert.equal(d.version, 2);
    assert.ok(d.name.length <= 18);
    const back = (await S.listSlots())[0];
    assert.equal(back.difficulty, 'easy');
    assert.equal(typeof back.ext, 'object');
    assert.equal(getQuestStateSnapshot().quests !== undefined, true);
  });
});

describe('compatibilidade dos campos novos (rival, elites, platina, opções)', () => {
  it('os 3 slots antigos carregam, cada um com os campos novos no padrão seguro', async () => {
    for (let i = 0; i < 3; i++) store.set(K(i), JSON.stringify(oldV2({ name: `Velho ${i}`, ext: i === 1 ? { rival: { wins: 3 } } : undefined })));
    const slots = await S.listSlots();
    assert.deepEqual(slots.map((x) => x.name), ['Velho 0', 'Velho 1', 'Velho 2']);
    for (let i = 0; i < 3; i++) {
      assert.doesNotThrow(() => S.startSession(i, slots[i]));
      assert.equal(R.rivalEncountersDefeated(), 0, `slot ${i}: nenhuma aparição do rival vencida`);
      assert.equal(R.getRivalWins(), i === 1 ? 3 : 0, `slot ${i}: vitórias do rival preservadas`);
      assert.equal(EL.eliteDefeatedCount(), 0, `slot ${i}: nenhum elite derrotado`);
      const p = PG.computeProgress();
      assert.equal(p.platinum, false);
      assert.ok(p.percent >= 0 && p.percent < 100);
      assert.equal(p.categories.length, 18);
    }
  });
  it('salvar grava as chaves novas e recarregar devolve os mesmos dados', async () => {
    store.set(K(0), JSON.stringify(oldV2()));
    S.startSession(0, (await S.listSlots())[0]);
    R.markRivalEncounterDefeated(2);
    EL.markEliteDefeated('elite_bat');
    assert.equal(await S.saveGame({ x: 1, y: 2, facing: 'down' }), true);
    const raw = JSON.parse(store.get(K(0)));
    assert.deepEqual(raw.ext.rival.encounters, [2]);
    assert.deepEqual(raw.ext.elites.defeated, ['elite_bat']);
    S.startSession(1, oldV2()); // outro mundo no meio
    assert.equal(R.rivalEncountersDefeated(), 0);
    S.startSession(0, (await S.listSlots())[0]);
    assert.ok(R.isRivalEncounterDefeated(2) && EL.isEliteDefeated('elite_bat'));
  });
  it('opções (áudio, gráficos) de versões antigas carregam com padrão seguro e sem perder volumes', async () => {
    store.set('meme_fighter_settings_v1', JSON.stringify({ autoSave: false, autoSaveSeconds: 15, musicVolume: 0.2, sfxVolume: 0.3, ambientVolume: 0.1, haptics: false }));
    await ST.ensureSettingsLoaded();
    const s = ST.getSettings();
    assert.deepEqual([s.musicVolume, s.sfxVolume, s.ambientVolume, s.autoSave, s.haptics], [0.2, 0.3, 0.1, false, false]);
    assert.deepEqual([s.weatherParticles, s.waveAnimation, s.nightDarkening, s.lightMode, s.tips, s.shortCutscenes], [true, true, true, false, true, true]);
  });
});
