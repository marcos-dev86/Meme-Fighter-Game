/**
 * Testes das cutscenes em vídeo: registro, gatilhos (lógica pura), arquivos e ligação no código.
 *   node tools/test-cutscenes.mjs            (arquivos .mp4 ausentes viram "skip" avisando quais faltam)
 *   CUTSCENES_STRICT=1 node tools/test-cutscenes.mjs   (exige os 16 mp4 e confere codec/tamanho/duração com ffprobe)
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('./ts-register.cjs');
const CS = require('../src/game/story/cutscenes.ts');
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const exists = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));
const STRICT = process.env.CUTSCENES_STRICT === '1';

const missionSrc = ['missionsDogge', 'missionsCassino', 'missionsStory'].map((f) => read(`src/game/story/${f}.ts`)).join('\n');
const missionIds = new Set([...missionSrc.matchAll(/\bid: '([a-z0-9_]+)'/g)].map((m) => m[1]));
const assetsSrc = read('src/game/story/cutsceneAssets.ts');
const missingFiles = CS.CUTSCENES.filter((c) => !exists(`assets/cutscenes/${c.id}.mp4`)).map((c) => c.id);

describe('registro das cutscenes', () => {
  it('tem 16 itens: 13 de história + 3 finais, ids únicos', () => {
    assert.equal(CS.CUTSCENES.length, 16);
    assert.equal(new Set(CS.CUTSCENES.map((c) => c.id)).size, 16);
    assert.equal(CS.CUTSCENES.filter((c) => c.final).length, 3);
    for (const c of CS.CUTSCENES) assert.ok(c.title.length > 3, c.id);
  });
  it('todas as missões usadas como gatilho existem', () => {
    for (const c of CS.CUTSCENES) {
      if (!('missions' in c.trigger)) continue;
      assert.ok(c.trigger.missions.length > 0, c.id);
      for (const m of c.trigger.missions) assert.ok(missionIds.has(m), `${c.id}: missão inexistente ${m}`);
    }
  });
  it('os 3 finais cobrem union, glory e power; a missão final NÃO tem vídeo próprio', () => {
    for (const e of ['union', 'glory', 'power']) assert.equal(CS.cutsceneForEnding(e)?.final, true, e);
    const finalId = read('src/game/story/missionsDogge.ts').match(/id: '([a-z0-9_]+)'[\s\S]{0,900}?final: true/)?.[1];
    assert.ok(finalId, 'missão final encontrada');
    for (const c of CS.CUTSCENES) if ('missions' in c.trigger) assert.ok(!c.trigger.missions.includes(finalId), `${c.id} usa a missão final`);
  });
  it('cada cutscene tem a entrada em cutsceneAssets.ts apontando para assets/cutscenes/<id>.mp4', () => {
    for (const c of CS.CUTSCENES) assert.ok(assetsSrc.includes(`assets/cutscenes/${c.id}.mp4'`), c.id);
    assert.equal([...assetsSrc.matchAll(/require\(/g)].length, 16);
  });
  it('arquivos .mp4 existem', { skip: !STRICT && missingFiles.length ? `ainda faltam ${missingFiles.length}: ${missingFiles.join(', ')}` : false }, () => {
    assert.deepEqual(missingFiles, []);
  });
});

describe('gatilhos (lógica pura)', () => {
  const done = (set) => (m) => set.has(m);
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
    assert.ok(/cutsceneForMission\(def\.id/.test(w) && /!bootingRef\.current/.test(w));
    assert.ok(/nextQueuedCutscene\(\)/.test(w) && /\/cutscene\?id=/.test(w));
    const gate = w.match(/cutsceneGateRef\.current = ([^;]+);/)?.[1] ?? '';
    for (const k of ['worldFocused', '!paused', '!interior', '!dialogueNpc', '!choiceNpc', '!questOffer', '!bossOffer', '!downed', '!sail']) assert.ok(gate.includes(k), k);
    // o final tem prioridade e a cutscene só roda se o final não vai tocar
    assert.ok(/endingShouldPlay\(\)[\s\S]{0,200}else if \(!endingPushedRef\.current && cutsceneGateRef\.current\)/.test(w));
  });
  it('final: toca o vídeo antes dos slides e segue se falhar', () => {
    const e = read('src/screens/EndingScreen.tsx');
    assert.ok(/cutsceneForEnding\(ending\)/.test(e) && /<CutscenePlayer id=\{finalCutscene\.id\} onDone=\{\(\) => setVideoDone\(true\)\}/.test(e));
  });
  it('Opções: lista REVER CUTSCENES com texto nos 5 idiomas', () => {
    assert.ok(/page === 'cutscenes'/.test(read('src/screens/OptionsScreen.tsx')));
    const s = read('src/game/i18n/stringsCutscenes.ts');
    for (const k of ['opt_cat_cutscenes', 'cutscenes_none', 'cutscenes_note']) assert.equal([...s.matchAll(new RegExp(`${k}:`, 'g'))].length, 5, k);
    assert.ok(/STRINGS_CUTSCENES/.test(read('src/game/i18n/extraStrings.ts')));
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
});
