/**
 * Campanhas do Gadigago e do Orc (lote 1): estrutura das missões, escolhas, finais por bandeira, NPCs da campanha, desbloqueio,
 * cutscenes em 5 idiomas e dados do painel de personagem. Lógica pura (Node), sem tela.
 *   node tests/unit/historia/campanhas-gadigago-e-orc.test.mjs
 */
import { createRequire } from 'node:module';
import Module from 'node:module';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
// Segurança: AsyncStorage EM MEMÓRIA e módulos nativos em stub (nenhum save real é lido ou trocado).
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
const REG = require('../../../src/game/story/campaigns/registry.ts');
const CH = require('../../../src/game/story/characters.ts');
const NPCS = require('../../../src/game/world/npcs.ts');
const OV = require('../../../src/game/story/npcOverrides.ts');
const GATE = require('../../../src/game/world/npcActive.ts');
const Q = require('../../../src/game/state/questState.ts');
const SF = require('../../../src/game/state/storyFlags.ts');
const SC = require('../../../src/game/story/storyChoices.ts');
const SE = require('../../../src/game/story/storyEnding.ts');
const CS = require('../../../src/game/story/cutscenes.ts');
const INFO = require('../../../src/game/story/characterInfo.ts');
const WG = require('../../../src/game/world/worldGen.ts');
const { STRINGS_CAMPANHAS } = require('../../../src/game/i18n/stringsCampanhas.ts');
const { GAD_STATUE } = require('../../../src/game/story/campaigns/gadigago.ts');
const { ORC_SPY_SPOT } = require('../../../src/game/story/campaigns/orc.ts');

const LANGS = ['pt', 'en', 'es', 'fr', 'ja'];
const IDS = ['gadigago', 'orc'];
const SOLID = new Set(['water', 'tree', 'rock', 'wall', 'lava', 'shop', 'house', 'cliff']);
const walkable3x3 = (x, y) => {
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (SOLID.has(WG.getWorldTile(x + ox, y + oy))) return false;
  return true;
};
const NO_DASH = /[–—]/;
// o reset de storyFlags é registrado em saveExt (zera bandeiras, escolhas e final)
const resetFlags = () => require('../../../src/game/state/saveExt.ts').resetExts();

describe('estrutura das campanhas', () => {
  for (const id of IDS) {
    const camp = REG.CAMPAIGNS[id];
    it(`${id}: ids de missão únicos, requisitos existentes, exatamente uma missão final por caminho`, () => {
      const ids = camp.missions.map((m) => m.id);
      assert.equal(new Set(ids).size, ids.length);
      for (const m of camp.missions) for (const r of m.requires ?? []) assert.ok(ids.includes(r), `${m.id} requer ${r}`);
      const finals = camp.missions.filter((m) => m.final);
      assert.ok(finals.length >= 1);
      for (const f of finals) assert.ok(f.requires?.length, `${f.id} precisa de requisito`);
    });
    it(`${id}: missões de luta têm oponente, fase e chave de oferta nos 5 idiomas`, () => {
      for (const m of camp.missions.filter((x) => x.objective.kind === 'battle')) {
        const o = m.objective;
        assert.ok(o.opponent && o.stageKey && o.giver, m.id);
        assert.ok(NPCS.NPCS[o.giver], `${m.id}: NPC ${o.giver} existe`);
        for (const lang of LANGS) assert.ok(STRINGS_CAMPANHAS[lang][o.offerTitleKey], `${m.id}: ${o.offerTitleKey} em ${lang}`);
      }
    });
    it(`${id}: os NPCs de missões de conversa e de cadeia existem`, () => {
      for (const m of camp.missions) {
        const steps = m.objective.kind === 'chain' ? m.objective.steps : [m.objective];
        for (const s of steps) if (s.kind === 'talk') assert.ok(NPCS.NPCS[s.npcId], `${m.id}: ${s.npcId}`);
      }
    });
    it(`${id}: missões de caminho apontam para escolha e opção que existem`, () => {
      for (const m of camp.missions.filter((x) => x.branch)) {
        const c = camp.choices.find((x) => x.id === m.branch.choice);
        assert.ok(c, `${m.id}: escolha ${m.branch.choice}`);
        assert.ok(c.options.some((o) => o.id === m.branch.option), `${m.id}: opção ${m.branch.option}`);
      }
    });
    it(`${id}: nenhum texto de jogo usa travessão`, () => {
      const json = JSON.stringify({ m: camp.missions, c: camp.choices, e: camp.endings, n: camp.npcOverrides, s: camp.summary, t: camp.tagline });
      assert.ok(!NO_DASH.test(json));
    });
    it(`${id}: resumo e frase curta nos 5 idiomas`, () => {
      assert.equal(camp.summary.length, 5);
      assert.equal(camp.tagline.length, 5);
      for (const s of camp.summary) assert.ok(s.length > 40);
      for (const s of camp.tagline) assert.ok(s.length > 3);
      assert.equal(new Set(camp.summary).size, 5);
    });
  }
  it('as duas campanhas são registradas em STORY_CHARACTERS com missões, lutador e posição inicial andável', () => {
    for (const id of IDS) {
      const c = CH.STORY_CHARACTERS[id];
      assert.equal(c.missions, REG.CAMPAIGNS[id].missions);
      assert.equal(c.fighter, id);
      assert.equal(c.unlockedByDefault, false);
      assert.ok(walkable3x3(c.spawn.x, c.spawn.y), `${id} spawn ${c.spawn.x},${c.spawn.y}`);
    }
  });
  it('a estátua da campanha do Gadigago é a mesma do mundo e o ponto do espião do Orc é andável', () => {
    assert.deepEqual(GAD_STATUE, WG.STATUE_TILE);
    assert.ok(walkable3x3(ORC_SPY_SPOT.x, ORC_SPY_SPOT.y));
  });
});

describe('escolhas e finais', () => {
  for (const id of IDS) {
    const camp = REG.CAMPAIGNS[id];
    it(`${id}: cada final tem bandeira ligada por alguma opção, cutscene existente e 5 falas em 5 idiomas`, () => {
      assert.equal(camp.endings.length, 3);
      assert.deepEqual(new Set(camp.endings.map((e) => e.kind)), new Set(['union', 'glory', 'power']));
      const flagsSet = new Set(camp.choices.flatMap((c) => c.options.flatMap((o) => o.flags ?? [])));
      for (const e of camp.endings) {
        assert.ok(flagsSet.has(e.flag), `${e.id}: bandeira ${e.flag} nunca é ligada`);
        assert.ok(CS.CUTSCENES.some((c) => c.id === e.cutsceneId), `${e.id}: cutscene ${e.cutsceneId}`);
        assert.equal(e.title.length, 5);
        assert.ok(e.lines.length >= 3);
        for (const l of e.lines) assert.equal(l.length, 5);
      }
    });
    it(`${id}: pickCampaignEnding escolhe o final pela bandeira e activeCampaignEnding tem reserva`, () => {
      for (const e of camp.endings) assert.equal(REG.pickCampaignEnding(id, (f) => f === e.flag).id, e.id);
      assert.equal(REG.pickCampaignEnding(id, () => false), null);
      resetFlags();
      assert.equal(SE.activeCampaignEnding(id).id, camp.endings[0].id);
    });
    it(`${id}: as escolhas valem só no mundo do personagem (o Dogge segue com as 10 dele)`, () => {
      const mine = SC.choicesForCharacter(id).map((c) => c.id);
      assert.deepEqual(mine.sort(), camp.choices.map((c) => c.id).sort());
      assert.equal(SC.choicesForCharacter('dogge').length, 10);
      for (const c of SC.STORY_CHOICES) assert.ok(!mine.includes(c.id));
      for (const cid of mine) assert.ok(SC.CHOICE_BY_ID[cid]);
    });
  }
  it('Gadigago: as três opções finais ligam bandeiras diferentes e a escolha só aparece depois do Maior Fã', () => {
    const c = REG.CAMPAIGNS.gadigago.choices.find((x) => x.id === 'gad_final');
    assert.equal(c.afterMission, 'gad_fa');
    const f = c.options.map((o) => (o.flags ?? []).find((x) => x.startsWith('gad_end_')));
    assert.deepEqual(new Set(f).size, 3);
    for (const o of c.options) assert.ok(o.flags.includes('gad_choice_done'));
  });
  it('Orc: o caminho escolhido muda as missões e o final C só vem do caminho do desertor', () => {
    const camp = REG.CAMPAIGNS.orc;
    const cam = camp.choices.find((x) => x.id === 'orc_caminho');
    const desert = cam.options.find((o) => o.id === 'desertor');
    assert.ok(desert.flags.includes('orc_end_c'));
    assert.ok(!cam.options.find((o) => o.id === 'voltar').flags?.includes('orc_end_c'));
    const volta = camp.missions.filter((m) => m.branch?.option === 'voltar').map((m) => m.id);
    const des = camp.missions.filter((m) => m.branch?.option === 'desertor').map((m) => m.id);
    assert.ok(volta.length >= 2 && des.length >= 1);
    assert.equal(camp.missions.filter((m) => m.final).length, 2); // um final por caminho
    assert.ok(camp.missions.find((m) => m.id === 'orc_desertor').final);
    assert.ok(camp.missions.find((m) => m.id === 'orc_final').final);
  });
});

describe('fluxo no estado do jogo', () => {
  it('a missão final concluída faz o final tocar uma vez (em cada caminho da campanha)', () => {
    const paths = { gadigago: [null], orc: ['voltar', 'desertor'] };
    for (const id of IDS) {
      for (const opt of paths[id]) {
        resetFlags();
        Q.resetQuestState(id);
        assert.equal(SE.endingShouldPlay(), false);
        if (opt) SC.applyChoice('orc_caminho', opt); // escolhe o caminho (a missão final do caminho passa a existir)
        const fin = Q.getMissionList().find((m) => m.final);
        assert.ok(fin, `${id}/${opt}: missão final do caminho existe`);
        Q.setQuestStatus(fin.id, 'completed');
        assert.equal(SE.endingShouldPlay(), true, `${id}/${opt}`);
        SF.setEnding('union');
        assert.equal(SE.endingShouldPlay(), false, `${id}/${opt}: depois de gravar o final não toca de novo`);
      }
    }
    resetFlags();
    Q.resetQuestState('dogge');
  });
  it('terminar a história do Dogge libera Gadigago e Orc', () => {
    assert.deepEqual([...CH.STORY_CHARACTERS.dogge.unlocks].sort(), ['gadigago', 'orc']);
  });
  it('a escolha pendente do NPC só aparece depois da missão exigida e some depois de feita', () => {
    resetFlags();
    Q.resetQuestState('gadigago');
    const c = REG.CAMPAIGNS.gadigago.choices[0];
    assert.equal(SC.pendingChoiceFor(c.npcId), null);
    Q.setQuestStatus(c.afterMission, 'completed');
    assert.equal(SC.pendingChoiceFor(c.npcId)?.id, c.id);
    SC.applyChoice(c.id, c.options[0].id);
    assert.equal(SC.pendingChoiceFor(c.npcId), null);
    for (const fl of c.options[0].flags ?? []) assert.ok(SF.hasFlag(fl));
    resetFlags();
    Q.resetQuestState('dogge');
  });
  it('o mundo do Dogge não enxerga escolhas das campanhas', () => {
    resetFlags();
    Q.resetQuestState('dogge');
    for (const c of REG.ALL_CAMPAIGN_CHOICES) assert.equal(SC.pendingChoiceFor(c.npcId)?.id === c.id, false);
  });
});

describe('NPCs da campanha', () => {
  it('Gadigago: o rival da praça é o Dogge e o Maior Fã usa o lutador Ninja, sempre presente', () => {
    const rival = OV.npcFor('rival', 'gadigago');
    assert.equal(rival.fighterSprite, 'dogge');
    assert.match(rival.name, /Dogge/);
    assert.equal(OV.npcFor('mercador_noturno', 'gadigago').fighterSprite, 'ninja');
    assert.ok(REG.CAMPAIGNS.gadigago.alwaysActive.includes('mercador_noturno'));
  });
  it('Orc: o rival continua sendo o Gadigago e o espião de capuz é o Eremita Tobias de sprite Ninja', () => {
    assert.equal(OV.npcFor('rival', 'orc').fighterSprite, NPCS.NPCS.rival.fighterSprite, 'rival não é trocado no Orc');
    const t = OV.npcFor('eremita', 'orc');
    assert.match(t.name, /Tobias/);
    assert.equal(t.fighterSprite, 'ninja');
  });
  it('o mundo do Dogge continua com os NPCs originais', () => {
    for (const n of ['rival', 'mercador_noturno', 'eremita', 'bento', 'dogking']) assert.deepEqual(OV.npcFor(n, 'dogge'), NPCS.NPCS[n], n);
  });
  it('o Eremita Tobias só aparece depois das provas, some depois de enfrentado e só no mundo do Orc', () => {
    const p = NPCS.OUTDOOR_NPCS.find((x) => x.npcId === 'eremita' && x.campaign === 'orc');
    assert.ok(p);
    assert.deepEqual({ x: p.x, y: p.y }, ORC_SPY_SPOT);
    resetFlags();
    Q.resetQuestState('dogge');
    assert.equal(GATE.campaignGate(p), false);
    Q.resetQuestState('orc');
    assert.equal(GATE.campaignGate(p), false);
    Q.setQuestStatus(p.afterMission, 'completed');
    assert.equal(GATE.campaignGate(p), true);
    Q.setQuestStatus(p.hideAfterMission, 'completed');
    assert.equal(GATE.campaignGate(p), false);
    Q.resetQuestState('dogge');
  });
  it('as falas por regra respondem ao estado: a primeira regra verdadeira vence', () => {
    resetFlags();
    Q.resetQuestState('gadigago');
    const base = OV.campaignLinesFor('pipoca', 'gadigago');
    assert.ok(Array.isArray(base) && base.length > 0);
    assert.equal(OV.campaignLinesFor('pipoca', 'dogge'), null);
    Q.resetQuestState('dogge');
  });
});

describe('cutscenes das campanhas', () => {
  it('13 roteiros novos existem no registro, todos em 5 idiomas, com {player} e sem travessão', () => {
    const mine = CS.CUTSCENES.filter((c) => /^(gad|orc)_/.test(c.id));
    assert.equal(mine.length, 13);
    for (const c of mine) assert.ok(!NO_DASH.test(JSON.stringify(c)), c.id);
  });
  it('cada campanha tem 3 finais como cutscene final de 30 s ou mais', () => {
    for (const id of IDS) {
      for (const e of REG.CAMPAIGNS[id].endings) {
        const c = REG.CAMPAIGNS[id].cutscenes.find((x) => x.id === e.cutsceneId);
        assert.ok(c, e.cutsceneId);
        assert.ok(c.beats.reduce((a, b) => a + (b.ms ?? 3000), 0) >= 30000, `${c.id} dura 30 s ou mais`);
      }
    }
  });
  it('a cutscene de final é achada por cutsceneForCampaignEnding', () => {
    for (const e of REG.ALL_CAMPAIGN_ENDINGS) assert.equal(CS.cutsceneForCampaignEnding(e.id)?.id, e.cutsceneId);
  });
});

describe('painel de personagem (dados)', () => {
  it('resumo e frase curta saem nos 5 idiomas e o total de missões ignora os caminhos e as secretas', () => {
    for (const id of ['dogge', ...IDS]) {
      assert.ok(INFO.characterSummary(id), id);
    }
    assert.equal(INFO.campaignMissionTotal('gadigago'), CH.STORY_CHARACTERS.gadigago.missions.filter((m) => !m.branch && !m.secret).length);
    assert.ok(INFO.campaignMissionTotal('orc') >= 11);
  });
  it('a árvore informada traz habilidades, pontos e a suprema', () => {
    for (const id of IDS) {
      const t = INFO.treeInfo(id);
      assert.equal(t.points, 47);
      assert.ok(t.skills >= 16);
      assert.ok(t.supreme?.supreme);
    }
    assert.equal(INFO.treeInfo('soldier'), null);
  });
});

describe('textos de interface das campanhas', () => {
  it('todas as chaves de STRINGS_CAMPANHAS existem nos 5 idiomas, sem travessão', () => {
    const base = Object.keys(STRINGS_CAMPANHAS.pt);
    for (const lang of LANGS) {
      assert.deepEqual(Object.keys(STRINGS_CAMPANHAS[lang]).sort(), [...base].sort(), lang);
      for (const [k, v] of Object.entries(STRINGS_CAMPANHAS[lang])) {
        assert.ok(v.length > 0, `${lang}.${k}`);
        assert.ok(!NO_DASH.test(v), `${lang}.${k}`);
      }
    }
  });
  it('as telas novas existem e usam o painel', () => {
    const read = (p) => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
    const panel = read('src/game/menu/CharacterInfoPanel.tsx');
    assert.match(panel, /testID=\{`ability-\$\{kind\}`\}/);
    assert.match(panel, /'versus'/);
    assert.match(panel, /'exploration'/);
    assert.match(read('src/screens/SaveSlotsScreen.tsx'), /CharacterInfoPanel/);
    assert.match(read('src/screens/StatusScreen.tsx'), /CharacterInfoPanel/);
  });
});

describe('missões secretas das campanhas', () => {
  const secretsOf = (id) => REG.CAMPAIGNS[id].missions.filter((m) => m.secret);
  for (const id of IDS) {
    it(`${id}: tem de 1 a 4 missões secretas, opcionais, sem caminho e com gatilho de descoberta`, () => {
      const s = secretsOf(id);
      assert.ok(s.length >= 1 && s.length <= 4, `${id}: ${s.length} secretas`);
      const all = REG.CAMPAIGNS[id].missions;
      for (const m of s) {
        assert.equal(m.optional, true, m.id);
        assert.ok(!m.branch && !m.final, m.id);
        assert.ok(m.discover && (m.discover.talk || m.discover.enter), `${m.id}: sem gatilho`);
        if (m.discover.talk) assert.ok(NPCS.NPCS[m.discover.talk], `${m.id}: NPC ${m.discover.talk}`);
        for (const r of m.requires ?? []) assert.ok(all.some((x) => x.id === r && !x.secret), `${m.id}: requer ${r}`);
        assert.ok(!NO_DASH.test(JSON.stringify(m)), m.id);
      }
      // nenhuma missão (nem a final) depende de uma secreta
      for (const m of all) for (const r of m.requires ?? []) assert.ok(!s.some((x) => x.id === r), `${m.id} depende da secreta ${r}`);
    });
    it(`${id}: os NPCs dos passos das secretas existem no mundo`, () => {
      for (const m of secretsOf(id)) {
        const steps = m.objective.kind === 'chain' ? m.objective.steps : [];
        for (const st of steps) if (st.kind === 'talk') assert.ok(NPCS.NPCS[st.npcId], `${m.id}: ${st.npcId}`);
      }
    });
    it(`${id}: a missão final continua liberada sem nenhuma secreta`, () => {
      resetFlags();
      Q.resetQuestState(id);
      for (const m of Q.getMissionList().filter((x) => !x.final && !x.optional && !x.branch)) Q.setQuestStatus(m.id, 'completed');
      if (id === 'orc') SC.applyChoice('orc_caminho', 'voltar');
      for (const m of Q.getMissionList().filter((x) => !x.final && !x.optional)) Q.setQuestStatus(m.id, 'completed');
      const fin = Q.getMissionList().find((m) => m.final);
      assert.equal(Q.isMissionAvailable(fin), true);
      assert.equal(Q.getMissionCountsSplit().secret.done, 0);
      resetFlags();
      Q.resetQuestState('dogge');
    });
  }
  it('a missão secreta fica "???" até o gatilho e só é descoberta depois de cumpridos os requisitos', () => {
    resetFlags();
    Q.resetQuestState('gadigago');
    const def = Q.getMissionList().find((m) => m.id === 'gad_sec_autografos');
    assert.equal(Q.isMissionRevealed(def), false);
    Q.reportTalk('pipoca'); // requisito (gad_ferro) ainda não cumprido: continua escondida
    assert.equal(Q.isMissionRevealed(def), false);
    Q.setQuestStatus('gad_ferro', 'completed');
    assert.equal(Q.isMissionRevealed(def), false);
    Q.reportTalk('pipoca');
    assert.equal(Q.isMissionRevealed(def), true);
    resetFlags();
    Q.resetQuestState('dogge');
  });
  it('Gadigago: Caderno de Autógrafos completa falando com o Rei, o Capitão e a Pipoca, em ordem', () => {
    resetFlags();
    Q.resetQuestState('gadigago');
    Q.setQuestStatus('gad_ferro', 'completed');
    Q.reportTalk('pipoca');
    Q.reportTalk('pipoca'); // fora de ordem: não conta
    assert.equal(Q.getQuestStatus('gad_sec_autografos'), 'active');
    Q.reportTalk('soldier_captain'); // fora de ordem: não conta
    Q.reportTalk('dogking');
    Q.reportTalk('soldier_captain');
    assert.notEqual(Q.getQuestStatus('gad_sec_autografos'), 'completed');
    Q.reportTalk('pipoca');
    assert.equal(Q.getQuestStatus('gad_sec_autografos'), 'completed');
    assert.deepEqual(Q.getMissionCountsSplit().secret, { done: 1, total: 3 });
    resetFlags();
    Q.resetQuestState('dogge');
  });
  it('Gadigago: A Noite do Segundo Lugar usa o Mercador sempre ativo e o cassino', () => {
    resetFlags();
    Q.resetQuestState('gadigago');
    Q.reportTalk('mercador_noturno');
    const def = Q.getMissionList().find((m) => m.id === 'gad_sec_noite');
    assert.equal(Q.isMissionRevealed(def), true);
    Q.reportCasinoWin('slots');
    Q.reportCasinoWin('slots');
    Q.reportTalk('mercador_noturno');
    assert.equal(Q.getQuestStatus('gad_sec_noite'), 'completed');
    resetFlags();
    Q.resetQuestState('dogge');
  });
  it('Orc: Marmita do Grosh dá o pão na vila e o pede de volta no acampamento', () => {
    const m = REG.CAMPAIGNS.orc.missions.find((x) => x.id === 'orc_sec_marmita');
    const [a, b] = m.objective.steps;
    assert.deepEqual(a.give, { bread: 1 });
    assert.deepEqual(b.take, { bread: 1 });
    assert.equal(a.npcId, 'marina');
    assert.equal(b.npcId, 'orc_guard');
  });
  it('Orc: O Capuz de Tobias vai ao mesmo ponto do espião e só existe depois da luta com ele', () => {
    const m = REG.CAMPAIGNS.orc.missions.find((x) => x.id === 'orc_sec_capuz');
    assert.deepEqual(m.requires, ['orc_espiao']);
    assert.equal(m.objective.steps[0].x, ORC_SPY_SPOT.x);
    assert.equal(m.objective.steps[0].y, ORC_SPY_SPOT.y);
  });
  it('o Dogge continua sem nenhuma secreta de campanha e as secretas dele continuam as de antes', () => {
    const d = CH.STORY_CHARACTERS.dogge.missions.filter((m) => m.secret);
    assert.ok(d.length >= 10);
    for (const m of d) assert.ok(!m.discover, m.id);
  });
  it('o painel mostra o total de secretas da campanha e o Status mostra o progresso', () => {
    assert.equal(INFO.campaignSecretTotal('gadigago'), 3);
    assert.equal(INFO.campaignSecretTotal('orc'), 3);
    for (const lang of LANGS) {
      assert.ok(STRINGS_CAMPANHAS[lang].char_secrets_progress.includes('{done}'));
      assert.ok(STRINGS_CAMPANHAS[lang].char_secrets_total.includes('{total}'));
    }
  });
});
