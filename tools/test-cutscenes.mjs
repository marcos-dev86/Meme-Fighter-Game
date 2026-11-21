/**
 * Testes das cutscenes em vídeo: registro, gatilhos (lógica pura), arquivos e ligação no código.
 *   node tools/test-cutscenes.mjs            (arquivos .mp4 ausentes viram "skip" avisando quais faltam)
 *   CUTSCENES_STRICT=1 node tools/test-cutscenes.mjs   (exige os 40 mp4 e confere codec/tamanho/duração com ffprobe)
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('./ts-register.cjs');
const CS = require('../src/game/story/cutscenes.ts');
const CLIMB = require('../src/game/world/climbEvents.ts');
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const exists = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));
const STRICT = process.env.CUTSCENES_STRICT === '1';

const missionSrc = ['missionsDogge', 'missionsCassino', 'missionsStory', 'missionsMar'].map((f) => read(`src/game/story/${f}.ts`)).join('\n');
const missionIds = new Set([...missionSrc.matchAll(/\bid: '([a-z0-9_]+)'/g)].map((m) => m[1]));
const assetsSrc = read('src/game/story/cutsceneAssets.ts');
const STORY = CS.CUTSCENES.filter((c) => !c.short);
const SHORT = CS.CUTSCENES.filter((c) => c.short);
const missingFiles = CS.CUTSCENES.filter((c) => !exists(`assets/cutscenes/${c.id}.mp4`)).map((c) => c.id);

describe('registro das cutscenes', () => {
  it('tem 40 itens: 24 de história (13 + 8 do mar + 3 finais) + 16 curtas por ação, ids únicos', () => {
    assert.equal(CS.CUTSCENES.length, 40);
    assert.equal(STORY.length, 24);
    assert.equal(SHORT.length, 16);
    assert.equal(new Set(CS.CUTSCENES.map((c) => c.id)).size, 40);
    assert.equal(CS.CUTSCENES.filter((c) => c.final).length, 3);
    for (const c of CS.CUTSCENES) assert.ok(c.title.length > 3, c.id);
  });
  it('todas as missões usadas como gatilho existem', () => {
    for (const c of STORY) {
      if (!('missions' in c.trigger)) continue;
      assert.ok(c.trigger.missions.length > 0, c.id);
      for (const m of c.trigger.missions) assert.ok(missionIds.has(m), `${c.id}: missão inexistente ${m}`);
    }
  });
  it('os 3 finais cobrem union, glory e power; a missão final NÃO tem vídeo próprio', () => {
    for (const e of ['union', 'glory', 'power']) assert.equal(CS.cutsceneForEnding(e)?.final, true, e);
    const finalId = read('src/game/story/missionsDogge.ts').match(/id: '([a-z0-9_]+)'[\s\S]{0,900}?final: true/)?.[1];
    assert.ok(finalId, 'missão final encontrada');
    for (const c of STORY) if ('missions' in c.trigger) assert.ok(!c.trigger.missions.includes(finalId), `${c.id} usa a missão final`);
  });
  it('cada cutscene tem a entrada em cutsceneAssets.ts apontando para assets/cutscenes/<id>.mp4', () => {
    for (const c of CS.CUTSCENES) assert.ok(assetsSrc.includes(`assets/cutscenes/${c.id}.mp4'`), c.id);
    assert.equal([...assetsSrc.matchAll(/require\(/g)].length, 40);
  });
  it('arquivos .mp4 existem', { skip: !STRICT && missingFiles.length ? `ainda faltam ${missingFiles.length}: ${missingFiles.join(', ')}` : false }, () => {
    assert.deepEqual(missingFiles, []);
  });
});

describe('cutscenes curtas por ação', () => {
  const EXPECTED = {
    'climb:montanha:sobe': 'climb_montanha_sobe', 'climb:montanha:desce': 'climb_montanha_desce',
    'climb:vulcao:sobe': 'climb_vulcao_sobe', 'climb:vulcao:desce': 'climb_vulcao_desce',
    'casino:slot:dog': 'cassino_slot_dog', 'casino:slot:banana': 'cassino_slot_banana', 'casino:slot:moai': 'cassino_slot_moai',
    'casino:slot:joker': 'cassino_slot_joker', 'casino:slot:gem': 'cassino_slot_gem', 'casino:slot:seven': 'cassino_slot_777',
    'casino:flip': 'cassino_cara_coroa', 'casino:dice': 'cassino_dados', 'casino:roulette': 'cassino_roleta', 'casino:cards': 'cassino_cartas',
    'chest:open': 'bau_tesouro', 'level:up': 'subiu_de_nivel',
  };
  it('todas têm event + repeat + short, nenhuma é final, e cada evento tem uma cutscene', () => {
    for (const c of SHORT) {
      assert.ok('event' in c.trigger && c.trigger.event, c.id);
      assert.equal(c.repeat, true, c.id);
      assert.equal(c.short, true, c.id);
      assert.ok(!c.final, c.id);
    }
    assert.deepEqual(new Set(SHORT.map((c) => c.trigger.event)), new Set(Object.keys(EXPECTED)));
    assert.deepEqual([...CS.SHORT_EVENTS].sort(), Object.keys(EXPECTED).sort());
  });
  it('cutsceneForEvent devolve a cutscene certa (e null para desconhecido)', () => {
    for (const [ev, id] of Object.entries(EXPECTED)) assert.equal(CS.cutsceneForEvent(ev)?.id, id, ev);
    assert.equal(CS.cutsceneForEvent('nao:existe'), null);
  });
  it('as de história não são afetadas: missão/final nunca devolvem uma curta', () => {
    for (const c of SHORT) {
      assert.equal(CS.cutsceneForMission('talk_bento', () => true, () => false)?.short, undefined);
      assert.ok(!('missions' in c.trigger) && !('ending' in c.trigger), c.id);
    }
  });
  it('slotWinEvent: só 3 símbolos iguais (seven vira jackpot)', () => {
    assert.equal(CS.slotWinEvent(['dog', 'dog', 'dog']), 'casino:slot:dog');
    assert.equal(CS.slotWinEvent(['seven', 'seven', 'seven']), 'casino:slot:seven');
    assert.equal(CS.cutsceneForEvent(CS.slotWinEvent(['seven', 'seven', 'seven']))?.id, 'cassino_slot_777');
    assert.equal(CS.slotWinEvent(['dog', 'dog', 'banana']), null);
    assert.equal(CS.slotWinEvent(['dog', 'banana', 'dog']), null);
  });
  it('os símbolos do caça-níquel têm todos uma cutscene (ids de SLOT_SYMBOLS)', () => {
    const ids = [...read('src/game/casino/casinoMath.ts').matchAll(/\{ id: '([a-z]+)', icon: '[a-z]+', weight: \d+, pay: \d+ \}/g)].map((m) => m[1]);
    assert.equal(ids.length, 6);
    for (const id of ids) assert.ok(CS.cutsceneForEvent(`casino:slot:${id}`), id);
  });
  it('escalada: entrar pela base = sobe, pelo topo = desce; vulcão vs montanha pelo tx', () => {
    // paredão vertical de 10 tiles (ty 100..109) na coluna tx
    const wall = (tx0) => (x, y) => (x === tx0 && y >= 100 && y <= 109 ? 'cliff' : 'snow');
    assert.deepEqual(CLIMB.cliffSpan(wall(50), 50, 105), { top: 100, bottom: 109 });
    assert.equal(CLIMB.climbEventOnEntry(wall(50), 50, 109), 'climb:montanha:sobe');
    assert.equal(CLIMB.climbEventOnEntry(wall(50), 50, 100), 'climb:montanha:desce');
    assert.equal(CLIMB.climbEventOnEntry(wall(1800), 1800, 109), 'climb:vulcao:sobe');
    assert.equal(CLIMB.climbEventOnEntry(wall(1800), 1800, 100), 'climb:vulcao:desce');
    assert.equal(CLIMB.climbEventOnEntry(wall(1700), 1700, 109), 'climb:montanha:sobe', 'tx 1700 ainda é a montanha (vulcão é tx > 1700)');
    assert.equal(CLIMB.climbEventOnEntry(() => 'cliff', 10, 5).startsWith('climb:montanha:'), true, 'não trava em paredão sem fim');
    assert.equal(CLIMB.CLIMB_COOLDOWN_MS, 15000);
  });
  it('o vulcão usa o mesmo limite do renderizador (tx > 1700)', () => {
    assert.ok(/tx > 1700/.test(read('src/game/world/TileMapRenderer.tsx')));
    assert.equal(CLIMB.VOLCANO_MIN_TX, 1700);
  });
  it('baús do mundo marcados (chest) em pickups.ts', () => {
    const p = read('src/game/world/pickups.ts');
    for (const id of ['bau_igreja', 'volcano_cache', 'frag_b_treasure']) assert.ok(new RegExp(`id: '${id}'[^\\n]*chest: true`).test(p), id);
  });
});

describe('gatilhos (lógica pura)', () => {
  const done = (set) => (m) => set.has(m);
  it('MAR: cada missão do arco libera a sua cena, uma só vez (persistência pelo "já vista")', () => {
    const MAP = { mar_ruinas: '14_mar_antigos', mar_naufragio: '15_mar_fantasma', mar_chave: '16_mar_atlantida', mar_marlene: '17_mar_marlene', mar_mapa: '18_mar_mapa', sec_mar_tudo: '20_mar_segredos' };
    for (const [m, id] of Object.entries(MAP)) {
      assert.equal(CS.cutscenesForMission(m, done(new Set([m])))[0]?.id, id, m);
      assert.deepEqual(CS.cutscenesForMission(m, done(new Set([m])), (x) => x === id).map((c) => c.id).filter((x) => x === id), [], `${m}: já vista não repete`);
    }
  });
  it('MAR: derrotar o Sea Beast fecha "A Queda do Leviatã" e, com mapa+Marlene feitos, TAMBÉM "O Mar em Paz" (na ordem do registro)', () => {
    const all = new Set(['mar_sea_beast', 'mar_mapa', 'mar_marlene']);
    assert.deepEqual(CS.cutscenesForMission('mar_sea_beast', done(all)).map((c) => c.id), ['19_mar_leviata', '21_mar_paz']);
    // sem o resto, só a queda do Leviatã
    assert.deepEqual(CS.cutscenesForMission('mar_sea_beast', done(new Set(['mar_sea_beast']))).map((c) => c.id), ['19_mar_leviata']);
    // a ÚLTIMA das três fecha a paz, qualquer que seja
    for (const last of ['mar_sea_beast', 'mar_mapa', 'mar_marlene']) {
      const s = new Set(['mar_sea_beast', 'mar_mapa', 'mar_marlene']);
      const ids = CS.cutscenesForMission(last, done(s), (id) => id === '19_mar_leviata').map((c) => c.id);
      assert.ok(ids.includes('21_mar_paz'), last);
    }
    for (const first of ['mar_mapa', 'mar_marlene']) assert.ok(!CS.cutscenesForMission(first, done(new Set([first]))).some((c) => c.id === '21_mar_paz'), `${first} sozinha não fecha a paz`);
  });
  it('MAR: compatibilidade — cutsceneForMission (singular) devolve a primeira; fila enfileira todas sem duplicar e sem as já vistas', () => {
    const all = new Set(['mar_sea_beast', 'mar_mapa', 'mar_marlene']);
    assert.equal(CS.cutsceneForMission('mar_sea_beast', done(all))?.id, '19_mar_leviata');
    let q = CS.enqueueCutscenes([], ['19_mar_leviata', '21_mar_paz', '19_mar_leviata', 'nao_existe'], () => false);
    assert.deepEqual(q, ['19_mar_leviata', '21_mar_paz']);
    q = CS.enqueueCutscenes([], ['19_mar_leviata', '21_mar_paz'], (id) => id === '19_mar_leviata');
    assert.deepEqual(q, ['21_mar_paz']);
  });
  it('MAR: gatilhos reais — as 8 cenas do mar usam só missões existentes e nenhuma usa a missão final da história', () => {
    const mar = CS.CUTSCENES.filter((c) => /^(1[4-9]|2[01])_mar_/.test(c.id));
    assert.equal(mar.length, 8);
    for (const c of mar) { assert.ok(!c.final && !c.short); for (const m of c.trigger.missions) assert.ok(missionIds.has(m), `${c.id}: ${m}`); }
  });
  it('missão simples libera a cutscene dela, uma só vez', () => {
    assert.equal(CS.cutsceneForMission('talk_bento', done(new Set(['talk_bento'])))?.id, '01_flashback_vovo');
    assert.equal(CS.cutsceneForMission('talk_bento', done(new Set(['talk_bento'])), (id) => id === '01_flashback_vovo'), null);
    assert.equal(CS.cutsceneForMission('first_buy', done(new Set())), null);
  });
  it('os 3 troncos: só na ÚLTIMA missão que fechar, em qualquer ordem', () => {
    const T = ['tronco_sahur', 'tronco_sahur_god', 'tronco_sahur_evil'];
    for (const last of T) {
      const s = new Set();
      for (const m of T.filter((x) => x !== last)) {
        s.add(m);
        assert.equal(CS.cutsceneForMission(m, done(s)), null, `${m} sozinho não dispara`);
      }
      s.add(last);
      assert.equal(CS.cutsceneForMission(last, done(s))?.id, '11_tres_troncos', `último = ${last}`);
    }
  });
  it('fila: ignora duplicadas, desconhecidas e já vistas', () => {
    let q = [];
    q = CS.enqueueCutscene(q, '02_rival_gadigago', () => false);
    q = CS.enqueueCutscene(q, '02_rival_gadigago', () => false);
    q = CS.enqueueCutscene(q, 'nao_existe', () => false);
    q = CS.enqueueCutscene(q, '03_cassino_troll', (id) => id === '03_cassino_troll');
    assert.deepEqual(q, ['02_rival_gadigago']);
  });
  it('bandeira por save usa o prefixo cs:', () => {
    assert.equal(CS.cutsceneFlag('x'), 'cs:x');
  });
});

describe('ligação no jogo (código-fonte)', () => {
  it('rota, layout e música própria', () => {
    assert.ok(exists('src/app/cutscene.tsx'));
    const layout = read('src/app/_layout.tsx');
    assert.ok(/name="cutscene"/.test(layout));
    assert.ok(/OWN_MUSIC = \[[^\]]*'\/cutscene'/.test(layout));
  });
  it('player: expo-video, sem controles nativos, PULAR, erro/ausência chamam onDone, nada de timer de animação', () => {
    const p = read('src/game/story/CutscenePlayer.tsx');
    assert.ok(/from 'expo-video'/.test(p) && /nativeControls=\{false\}/.test(p) && /contentFit="contain"/.test(p));
    assert.ok(/status === 'error'/.test(p) && /playToEnd/.test(p) && /LOAD_TIMEOUT_MS/.test(p) && /AppState/.test(p));
    assert.ok(/testID="cutscene-skip"/.test(p));
    assert.ok(/getSettings\(\)/.test(p), 'respeita volume das Opções');
    assert.ok(/expo-video/.test(read('package.json')));
  });
  it('mundo: só enfileira fora do carregamento e só abre com o mundo livre', () => {
    const w = read('src/screens/WorldScreen.tsx');
    assert.ok(/cutscenesForMission\(def\.id/.test(w) && /queueCutscenes\(/.test(w) && /!bootingRef\.current/.test(w));
    assert.ok(/nextQueuedCutscene\(\)/.test(w) && /\/cutscene\?id=/.test(w));
    const gate = w.match(/cutsceneGateRef\.current = ([^;]+);/)?.[1] ?? '';
    for (const k of ['worldFocused', '!paused', '!interior', '!dialogueNpc', '!choiceNpc', '!questOffer', '!bossOffer', '!downed', '!sail']) assert.ok(gate.includes(k), k);
    // o final tem prioridade e a cutscene só roda se o final não vai tocar
    assert.ok(/endingShouldPlay\(\)[\s\S]{0,200}else if \(!endingPushedRef\.current && cutsceneGateRef\.current && !isShortCutscenePlaying\(\)\)/.test(w));
  });
  it('final: toca o vídeo antes dos slides e segue se falhar', () => {
    const e = read('src/screens/EndingScreen.tsx');
    assert.ok(/cutsceneForEnding\(ending\)/.test(e) && /<CutscenePlayer id=\{finalCutscene\.id\} onDone=\{\(\) => setVideoDone\(true\)\}/.test(e));
  });
  it('Opções: lista REVER CUTSCENES com texto nos 5 idiomas', () => {
    assert.ok(/page === 'cutscenes'/.test(read('src/screens/OptionsScreen.tsx')));
    const s = read('src/game/i18n/stringsCutscenes.ts');
    for (const k of ['opt_cat_cutscenes', 'cutscenes_none', 'cutscenes_note']) assert.equal([...s.matchAll(new RegExp(`(?<![a-z_])${k}:`, 'g'))].length, 5, k);
    assert.ok(/STRINGS_CUTSCENES/.test(read('src/game/i18n/extraStrings.ts')));
  });
});

describe('ligação das curtas no jogo (código-fonte)', () => {
  it('host global em app/_layout, tocando no lugar (sem rota) e pausando o jogo', () => {
    assert.ok(/<ShortCutsceneHost \/>/.test(read('src/app/_layout.tsx')));
    const h = read('src/game/story/ShortCutsceneHost.tsx');
    assert.ok(/<CutscenePlayer key=\{id\} id=\{id\} onDone=\{endShortCutscene\}/.test(h));
    const st = read('src/game/story/shortCutsceneState.ts');
    assert.ok(/setGamePaused\(true\)/.test(st) && /setGamePaused\(false\)/.test(st), 'pausa o jogo enquanto toca');
    assert.ok(/if \(current \|\| !getSettings\(\)\.shortCutscenes\) return false/.test(st), 'ignora se já toca ou se o interruptor está desligado');
    assert.ok(/pending\.length >= 2/.test(st) && /pending\.includes\(event\)/.test(st), 'fila pequena sem duplicados');
  });
  it('mundo: escalada com cooldown, baú, nível e congelamento', () => {
    const w = read('src/screens/WorldScreen.tsx');
    assert.ok(/climbEventOnEntry\(/.test(w) && /CLIMB_COOLDOWN_MS/.test(w) && /nowOnCliff && !onCliffRef\.current/.test(w));
    assert.ok(/if \(pickup\.chest\) playShortCutscene\('chest:open'\)/.test(w));
    assert.ok(/queueShortEvent\('level:up'\)/.test(w) && /takeQueuedShortEvent\(\)/.test(w));
    assert.ok(/isShortCutscenePlaying\(\)\) return;\s*\n\s*applyArmorRegen/.test(w), 'o laço do mundo para enquanto toca');
    assert.ok(/cutsceneGateRef\.current && !isShortCutscenePlaying\(\)/.test(w), 'a cutscene de história espera a curta');
  });
  it('cassino: vitória dispara o evento (slot só com 3 iguais), depois do resultado', () => {
    const c = read('src/game/world/CasinoOverlay.tsx');
    assert.ok(/settle\(bet, payout, slotWinEvent\(final\.map/.test(c));
    assert.ok(/game === 'slots' \? slotEvent : `casino:\$\{game\}`/.test(c) && /net > 0 && winEvent\) later\(\(\) => playShortCutscene\(winEvent\)/.test(c));
    // a lógica antiga de prêmio/conquista/missão continua
    assert.ok(/reportCasinoWin\(game\)/.test(c) && /setFlag\('found:sec_777'\)/.test(c) && /setFlag\('secret_777'\)/.test(c));
    assert.equal([...c.matchAll(/settle\(bet, payout/g)].length, 5);
  });
  it('Opções: interruptor CUTSCENES CURTAS (padrão SIM) com texto nos 5 idiomas; as curtas não entram no REVER', () => {
    const st = read('src/game/state/settingsState.ts');
    assert.ok(/shortCutscenes: true \}/.test(st) && /d\.shortCutscenes !== false/.test(st) && /export function setShortCutscenes/.test(st));
    const o = read('src/screens/OptionsScreen.tsx');
    assert.ok(/setShortCutscenes\(!settings\.shortCutscenes\)/.test(o) && /!c\.short && seenCutscenes\.includes/.test(o));
    const s = read('src/game/i18n/stringsCutscenes.ts');
    for (const k of ['opt_short_cutscenes', 'opt_short_cutscenes_note']) assert.equal([...s.matchAll(new RegExp(`${k}:`, 'g'))].length, 5, k);
  });
});

describe('arquivos de vídeo (ffprobe)', { skip: !STRICT && missingFiles.length ? 'só roda com todos os mp4 (ou CUTSCENES_STRICT=1)' : false }, () => {
  const probe = (id) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', new URL(`../assets/cutscenes/${id}.mp4`, import.meta.url).pathname]).toString());
  const info = Object.fromEntries(CS.CUTSCENES.map((c) => [c.id, probe(c.id)]));
  it('H.264 + AAC, 1280x720', () => {
    for (const [id, p] of Object.entries(info)) {
      const v = p.streams.find((s) => s.codec_type === 'video');
      const a = p.streams.find((s) => s.codec_type === 'audio');
      assert.equal(v.codec_name, 'h264', id);
      assert.equal(`${v.width}x${v.height}`, '1280x720', id);
      assert.equal(a?.codec_name, 'aac', id);
    }
  });
  it('os finais são mais longos que todas as outras cutscenes', () => {
    const dur = (id) => parseFloat(info[id].format.duration);
    const maxOther = Math.max(...CS.CUTSCENES.filter((c) => !c.final).map((c) => dur(c.id)));
    for (const c of CS.CUTSCENES.filter((c) => c.final)) assert.ok(dur(c.id) > maxOther, `${c.id} ${dur(c.id)}s <= ${maxOther}s`);
  });
  it('as curtas (4–9 s) são mais curtas que todas as de história', () => {
    const dur = (id) => parseFloat(info[id].format.duration);
    const minStory = Math.min(...STORY.map((c) => dur(c.id)));
    for (const c of SHORT) {
      assert.ok(dur(c.id) >= 3 && dur(c.id) <= 10, `${c.id} ${dur(c.id)}s fora de 3–10 s`);
      assert.ok(dur(c.id) < minStory, `${c.id} ${dur(c.id)}s >= menor de história ${minStory}s`);
    }
  });
});
