/**
 * Testes das cutscenes (todas feitas por código, sem vídeo): registro, gatilhos (lógica pura), roteiros (cenários, sons,
 * personagens, ícones, traduções, apelido do jogador) e ligação no código.
 *   node tests/unit/historia/cutscenes.test.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('../../_support/ts-register.cjs');
const CS = require('../../../src/game/story/cutscenes.ts');
const CLIMB = require('../../../src/game/world/climbEvents.ts');
const read = (p) => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
const exists = (p) => fs.existsSync(new URL(`../../../${p}`, import.meta.url));
const CODE = require('../../../src/game/story/campaigns/index.ts');
const TXT = require('../../../src/game/story/cutsceneText.ts');

const missionSrc = ['missionsDogge', 'missionsCassino', 'missionsStory', 'missionsMar'].map((f) => read(`src/game/story/${f}.ts`)).join('\n');
const missionIds = new Set([...missionSrc.matchAll(/\bid: '([a-z0-9_]+)'/g)].map((m) => m[1]));
const STORY = CS.CUTSCENES.filter((c) => !c.short);
const SHORT = CS.CUTSCENES.filter((c) => c.short);

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
  it('cada cutscene do registro tem o roteiro em código, e não sobrou nenhum vídeo no projeto', () => {
    for (const c of CS.CUTSCENES) assert.ok(CODE.CODE_CUTSCENES[c.id], `${c.id} sem roteiro em código`);
    assert.ok(!exists('src/game/story/cutsceneAssets.ts'), 'cutsceneAssets.ts não deve mais existir');
    assert.ok(!/\.mp4/.test(read('src/game/story/CutscenePlayer.tsx') + read('src/game/story/CodeCutscenePlayer.tsx')));
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
  it('player: tradução, apelido do jogador, skin/chapéu/capa, PULAR, cena ausente chama onDone', () => {
    const w = read('src/game/story/CutscenePlayer.tsx');
    assert.ok(/CODE_CUTSCENES\[id\]/.test(w) && /onDone\(\)/.test(w));
    const p = read('src/game/story/CodeCutscenePlayer.tsx');
    assert.ok(/testID="cutscene-skip"/.test(p) && /resolveCutsceneText/.test(p) && /playerName\(\)/.test(p));
    assert.ok(/getAccount\(\)\.nick/.test(p), 'o nome falado é o apelido do jogador');
    assert.ok(/HatLayer/.test(p) && /CapeLayer/.test(p) && /getEquipped\(\)/.test(p) && /getBodySprite/.test(p), 'skin, chapéu e capa equipados');
    assert.ok(/a\.player/.test(p) && /canWearCosmetics/.test(p));
    assert.ok(/useI18n\(\)/.test(p));
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
  it('final: toca a cutscene antes dos slides e segue se falhar', () => {
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

describe('roteiros em código', () => {
  const audioSrc = read('src/game/audio/audioAssets.ts');
  const keysOf = (block) => {
    const m = audioSrc.match(new RegExp(`export const ${block}[^{]*\\{([\\s\\S]*?)\\n\\} as const|export const ${block}[^{]*\\{([\\s\\S]*?)\\n\\};`));
    const body = (m?.[1] ?? m?.[2]) || '';
    return new Set([...body.matchAll(/^\s+['"]?([A-Za-z0-9_]+)['"]?:\s*require/gm)].map((x) => x[1]));
  };
  const MUSIC = keysOf('MUSIC');
  const SFX = keysOf('SFX');
  const AMBIENT = keysOf('AMBIENT');
  const ICONS = new Set([...read('src/game/ui/iconRegistry.ts').matchAll(/^\s+([a-z_0-9]+):\s*require/gm)].map((x) => x[1]));
  const SCENES = new Set(['lava', 'ice', 'shadow', 'tree', 'sunset', 'trio', 'battle', 'city', 'casino', 'cave', 'forest', 'duel', 'sea']);
  const SEA = new Set(['sea_abyss', 'sea_atlantis', 'sea_open', 'sea_reef', 'sea_ruins', 'sea_warm', 'sea_wreck']);
  const validBg = (bg) => SCENES.has(bg) || SEA.has(bg) || bg === 'black' || /^stage([1-9]|1[0-3])(_dusk|_night)?$/.test(bg);
  const scripts = Object.values(CODE.CODE_CUTSCENES);
  const strings = (b) => [b.title, b.subtitle, b.speaker, b.text].filter((x) => typeof x === 'string' && x.trim() !== '');

  it('os conjuntos de som foram lidos (guarda contra regex quebrada)', () => {
    assert.ok(MUSIC.size > 10 && SFX.size > 20 && AMBIENT.size >= 3 && ICONS.size > 50, `${MUSIC.size}/${SFX.size}/${AMBIENT.size}/${ICONS.size}`);
  });
  it('todo roteiro tem quadros e cada quadro usa um cenário que existe', () => {
    for (const c of scripts) {
      assert.ok(c.beats.length > 0, c.id);
      for (const [i, b] of c.beats.entries()) assert.ok(validBg(b.bg), `${c.id}#${i}: cenário ${b.bg}`);
    }
  });
  it('música, ambiente e sons de cada roteiro existem nos arquivos de áudio', () => {
    for (const c of scripts) {
      if (c.music) assert.ok(MUSIC.has(c.music), `${c.id}: música ${c.music}`);
      if (c.ambient) assert.ok(AMBIENT.has(c.ambient), `${c.id}: ambiente ${c.ambient}`);
      for (const b of c.beats) for (const s of b.sfx ?? []) assert.ok(SFX.has(s.key), `${c.id}: som ${s.key}`);
    }
  });
  it('personagens, NPCs e ícones existem; posições dentro da tela', () => {
    for (const c of scripts) {
      for (const [i, b] of c.beats.entries()) {
        for (const a of b.actors ?? []) {
          const k = a.kind ?? 'fig';
          if (k === 'fig') assert.ok(exists(`assets/sprites-v2/${a.char}/idle.png`), `${c.id}#${i}: lutador ${a.char}`);
          else if (k === 'npc') assert.ok(exists(`assets/npcs/${a.char}.png`), `${c.id}#${i}: npc ${a.char}`);
          else assert.ok(ICONS.has(a.char), `${c.id}#${i}: ícone ${a.char}`);
          assert.ok(a.x >= -0.05 && a.x <= 1.05 && a.y >= 0 && a.y <= 1.2, `${c.id}#${i}: posição ${a.x},${a.y}`);
          assert.ok(a.h > 0, `${c.id}#${i}: tamanho`);
        }
        for (const ic of b.icons ?? []) assert.ok(ICONS.has(ic.name), `${c.id}#${i}: ícone ${ic.name}`);
      }
    }
  });
  it('as cenas do Dogge mostram o personagem do jogador (skin, chapéu e capa) onde o Dogge aparece', () => {
    for (const c of scripts.filter((x) => x.characterId === 'dogge')) {
      for (const [i, b] of c.beats.entries()) for (const a of b.actors ?? []) if (a.char === 'dogge') assert.equal(a.player, true, `${c.id}#${i}: Dogge sem player`);
    }
  });
  it('nenhuma fala chama o jogador de "Dogge": todas usam {player}', () => {
    for (const c of scripts.filter((x) => x.characterId === 'dogge')) {
      for (const b of c.beats) for (const s of strings(b)) assert.ok(!/\bDogge\b/.test(s), `${c.id}: "${s}"`);
    }
  });
  it('todo texto tem tradução (en, es, fr, ja) com os mesmos {marcadores}, sem travessão', () => {
    const seen = new Set();
    for (const c of scripts) for (const b of c.beats) for (const s of strings(b)) {
      if (seen.has(s)) continue;
      seen.add(s);
      assert.ok(!/[—–]| - /.test(s), `travessão em "${s}"`);
      const tr = CODE.CUTSCENE_TEXTS[s];
      assert.ok(tr, `sem tradução: "${s}"`);
      assert.equal(tr.length, 4, s);
      const marks = (x) => (x.match(/\{[a-z]+\}/g) ?? []).sort().join(',');
      for (const t of tr) {
        assert.ok(t.trim() !== '', `tradução vazia: "${s}"`);
        assert.ok(!/[—–]| - /.test(t), `travessão na tradução de "${s}"`);
        assert.equal(marks(t), marks(s), `marcadores diferentes em "${s}"`);
      }
    }
    assert.ok(seen.size > 150, `textos lidos: ${seen.size}`);
  });
  it('resolveCutsceneText: língua, apelido do jogador e fallback para o português', () => {
    const T = CODE.CUTSCENE_TEXTS;
    assert.equal(TXT.resolveCutsceneText('Olá {player}', 'pt', 'user6742', T), 'Olá user6742');
    assert.equal(TXT.resolveCutsceneText('{player}', 'en', 'user6742', T), 'user6742');
    assert.equal(TXT.resolveCutsceneText('Eu só quero a verdade sobre o poder perdido.', 'en', 'x', T), 'I only want the truth about the lost power.');
    assert.equal(TXT.resolveCutsceneText('Texto sem tradução', 'ja', 'x', T), 'Texto sem tradução');
    assert.equal(TXT.resolveCutsceneText(['a', 'b', 'c', 'd', 'e'], 'fr', 'x', T), 'd');
    assert.equal(TXT.resolveCutsceneText(undefined, 'pt', 'x', T), '');
    assert.equal(TXT.resolveCutsceneText('Hoje a ilha dorme inteira, {player}. E é por sua causa.', 'es', 'user6742', T), 'Hoy la isla duerme entera, user6742. Y es por ti.');
  });
  it('duração: quadros com tempo, finais longos e curtas entre 3 e 10 s', () => {
    const secs = (c) => c.beats.reduce((s, b) => s + (b.ms ?? 3000), 0) / 1000;
    for (const c of scripts) for (const b of c.beats) if (b.ms !== undefined) assert.ok(b.ms >= 1500 && b.ms <= 30000, `${c.id}: ms ${b.ms}`);
    for (const c of CS.CUTSCENES.filter((x) => x.short)) assert.ok(secs(CODE.CODE_CUTSCENES[c.id]) >= 3 && secs(CODE.CODE_CUTSCENES[c.id]) <= 10, c.id);
    for (const c of CS.CUTSCENES.filter((x) => x.final)) assert.ok(secs(CODE.CODE_CUTSCENES[c.id]) >= 30, `${c.id} final curto`);
  });
});
