/**
 * EFEITOS DE ÁGUA E EMOJIS DO MAR (pacote new-sea-assets): cada efeito é ligado a um EVENTO REAL do mergulho.
 *  1. arquivos: tiras PNG existem, têm o tamanho de quadros declarado em seaFx.ts e em assets/sea/fx/index.json; emojis 128x128;
 *  2. regras puras (seaFx.ts): golpe leve/pesado/morte, golpes do Sea Beast (cada um com o aviso certo), mergulho/emersão, fôlego,
 *     correnteza, pressão (mesma condição do stepBreath), MODO LEVE só mantém o essencial;
 *  3. a pressão do vignette coincide com o dano de pressão real do stepBreath em todos os equipamentos;
 *  4. ligação no código: DiveOverlay/SeaFxLayer/Emoji/DefeatOverlay usam tudo isso; todo `require` é literal; chaves i18n nas 5 línguas;
 *  5. nada de sorteio decorativo: nenhum efeito é gerado sem evento (a camada só recebe `spawnFx` a partir de eventos).
 * `node tools/test-sea-fx.mjs`
 */
import { createRequire } from 'node:module';
import Module from 'node:module';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const stub = () => new Proxy(function () {}, { get: (t, p) => (p === '__esModule' ? true : p === 'default' ? stub() : p === Symbol.toPrimitive ? () => 0 : stub()), apply: () => stub() });
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (/^(react-native|expo|@expo|react-native-)/.test(req)) return stub();
  return origLoad.call(this, req, ...rest);
};
require('./ts-register.cjs');
const F = require('../src/game/dive/seaFx.ts');
const B = require('../src/game/dive/breath.ts');
const { ARMORS } = require('../src/game/items/armorDefs.ts');
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const root = new URL('../', import.meta.url).pathname;

function pngSize(p) {
  const b = fs.readFileSync(root + p);
  assert.equal(b.toString('latin1', 1, 4), 'PNG', p);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

describe('arquivos dos efeitos e emojis', () => {
  const index = JSON.parse(read('assets/sea/fx/index.json'));
  it('seaFx.ts e index.json concordam (frames, w, h) e cada tira tem exatamente frames*w x h pixels', () => {
    assert.deepEqual(Object.keys(F.SEA_FX_META).sort(), Object.keys(index).sort());
    for (const [name, m] of Object.entries(F.SEA_FX_META)) {
      const i = index[name];
      assert.equal(m.frames, i.frames, name);
      assert.equal(m.w, i.w, name);
      assert.equal(m.h, i.h, name);
      const sz = pngSize(`assets/sea/fx/${name}.png`);
      assert.deepEqual(sz, { w: i.frames * i.w, h: i.h }, name);
      assert.ok(m.frameMs >= 30 && m.frameMs <= 200, `${name} frameMs`);
      if (m.loopFrom !== undefined) assert.ok(m.loopFrom > 0 && m.loopFrom < m.frames, `${name} loopFrom`);
    }
  });
  it('emojis: 4 arquivos 128x128 e todos os nomes de seaFx existem', () => {
    assert.deepEqual([...F.SEA_EMOJI_NAMES].sort(), ['scream', 'shocked', 'skull', 'stop']);
    for (const n of F.SEA_EMOJI_NAMES) assert.deepEqual(pngSize(`assets/sea/emoji/${n}.png`), { w: 128, h: 128 });
  });
  it('nenhuma tira está vazia (cada quadro tem pixels visíveis)', () => {
    const py = `
import sys, json
from PIL import Image
idx = json.load(open('assets/sea/fx/index.json'))
bad = []
for n, m in idx.items():
    im = Image.open(f'assets/sea/fx/{n}.png').convert('RGBA'); a = im.getchannel('A')
    for i in range(m['frames']):
        c = a.crop((i*m['w'], 0, (i+1)*m['w'], m['h']))
        if c.getbbox() is None: bad.append(f'{n}#{i}')
print(json.dumps(bad))`;
    const out = JSON.parse(execFileSync('python3', ['-c', py], { cwd: root }).toString());
    assert.deepEqual(out, []);
  });
});

describe('regras puras: cada efeito vem de um evento real', () => {
  const at = { x: 100, y: 200 };
  it('golpe LEVE que acerta = impacto da bola d\'água; PESADO = coluna d\'água; morte soma respingo', () => {
    assert.deepEqual(F.fxForStrike('light', at, false).map((f) => f.name), ['ball_impact']);
    assert.deepEqual(F.fxForStrike('heavy', at, false).map((f) => f.name), ['spike']);
    assert.deepEqual(F.fxForStrike('light', at, true).map((f) => f.name), ['ball_impact', 'splash']);
    for (const f of F.fxForStrike('heavy', at, true)) assert.ok(!f.essential && f.cause);
  });
  it('Sea Beast: onda (sweep) cai com respingo na posição do aviso; isca (lure) tem redemoinho durante o aviso e estouro no fim; tinta não tem efeito de água', () => {
    const rel = (k) => F.fxForBossRelease(k, at, 120);
    assert.deepEqual(rel('sweep').map((f) => f.name), ['splash', 'ball_impact']);
    assert.ok(rel('sweep').every((f) => f.essential && f.x === 100 && f.y === 200));
    assert.deepEqual(rel('lure').map((f) => f.name), ['blast_end']);
    assert.deepEqual(rel('ink'), []);
    assert.deepEqual(F.fxForBossRelease('summon', at, 120).map((f) => f.name), ['splash']);
    const tg = F.fxForBossTelegraph('lure', at, 120, 1600);
    assert.equal(tg.length, 1);
    assert.equal(tg[0].name, 'vortex');
    assert.equal(tg[0].untilMs, 1600);
    for (const k of ['sweep', 'ink', 'summon']) assert.deepEqual(F.fxForBossTelegraph(k, at, 120, 900), []);
    // o efeito do aviso (redemoinho) precisa ter loop para durar os 1600 ms
    assert.ok(F.SEA_FX_META.vortex.loopFrom !== undefined);
    assert.ok(F.SEA_FX_META.vortex.frames * F.SEA_FX_META.vortex.frameMs < 1600);
  });
  it('mergulho e emersão: respingo no jogador, causa registrada', () => {
    assert.equal(F.fxForWaterTransition('dive', at)[0].cause, 'dive_enter');
    assert.equal(F.fxForWaterTransition('surface', at)[0].cause, 'dive_exit');
  });
  it('fôlego: bolhas só em low/empty/recovered (empty = mais bolhas); drown/pressure não soltam bolhas', () => {
    assert.equal(F.fxForBreathEvent('low', at).length, 2);
    assert.equal(F.fxForBreathEvent('empty', at).length, 4);
    assert.equal(F.fxForBreathEvent('recovered', at).length, 2);
    assert.deepEqual(F.fxForBreathEvent('pressure', at), []);
    assert.deepEqual(F.fxForBreathEvent('drown', at), []);
    for (const ev of ['low', 'empty', 'recovered']) for (const f of F.fxForBreathEvent(ev, at)) assert.equal(f.name, 'bubble');
  });
  it('correnteza: sem empurrão não há bolha; com empurrão as bolhas ficam ATRÁS do jogador (contra a corrente)', () => {
    assert.deepEqual(F.fxForCurrent({ x: 0, y: 0 }, at, () => 0.5), []);
    const [b] = F.fxForCurrent({ x: 60, y: 0 }, at, () => 0.5);
    assert.ok(b.x < at.x, 'atrás = contra o sentido da corrente');
    const [c] = F.fxForCurrent({ x: 0, y: -60 }, at, () => 0.5);
    assert.ok(c.y > at.y);
  });
  it('MODO LEVE: só o aviso do chefe (essencial) sobrevive; enfeite de acerto, bolha e respingo saem', () => {
    const all = [
      ...F.fxForStrike('heavy', at, true), ...F.fxForBreathEvent('empty', at), ...F.fxForWaterTransition('dive', at),
      ...F.fxForBossRelease('sweep', at, 100), ...F.fxForBossTelegraph('lure', at, 100, 1600),
    ];
    const kept = all.filter(F.allowedInLightMode);
    assert.ok(kept.length > 0 && kept.length < all.length);
    assert.ok(kept.every((f) => f.cause.startsWith('boss_')));
  });
  it('emojis por evento: low=😳 shocked, empty=😱 scream, pressure=✋ stop; sem emoji para recuperar/afogar', () => {
    assert.equal(F.emojiForBreathEvent('low'), 'shocked');
    assert.equal(F.emojiForBreathEvent('empty'), 'scream');
    assert.equal(F.emojiForBreathEvent('pressure'), 'stop');
    assert.equal(F.emojiForBreathEvent('recovered'), undefined);
    assert.equal(F.emojiForBossPattern('sweep'), 'scream');
    assert.equal(F.emojiForBossPattern('ink'), undefined);
    assert.equal(F.EMOJI_DEATH, 'skull');
  });
});

describe('pressão: o aperto visual coincide com o dano real do stepBreath', () => {
  const gear = {
    nada: undefined,
    snorkel: ARMORS.armor_snorkel.breath,
    traje: ARMORS.armor_wetsuit.breath,
    coral: ARMORS.armor_coral.breath,
    leviata: ARMORS.armor_leviathan.breath,
    brânquias: ARMORS.armor_gills.breath, // fôlego infinito NÃO protege da pressão
  };
  for (const [name, b] of Object.entries(gear)) {
    it(`equipamento "${name}"`, () => {
      const mods = B.combineMods(b, undefined);
      for (const breathable of [false, true]) {
        for (const deep of [false, true]) {
          const st = B.newBreath(mods);
          const r = B.stepBreath(st, 2100, { submerged: true, breathable, deep, mods });
          const hurts = r.events.includes('pressure');
          assert.equal(F.pressureSqueezing({ deep, breathable, mods }), hurts, `${name} deep=${deep} air=${breathable}`);
        }
      }
    });
  }
});

describe('ligação no código', () => {
  const overlay = read('src/game/dive/DiveOverlay.tsx');
  const layer = read('src/game/dive/SeaFxLayer.tsx');
  const emoji = read('src/game/ui/Emoji.tsx');
  it('SeaFxLayer: um require literal para cada efeito de seaFx.ts; Emoji: um para cada emoji', () => {
    for (const n of Object.keys(F.SEA_FX_META)) assert.ok(layer.includes(`require('../../../assets/sea/fx/${n}.png')`), n);
    for (const n of F.SEA_EMOJI_NAMES) assert.ok(emoji.includes(`require('../../../assets/sea/emoji/${n}.png')`), n);
    assert.ok(!/require\([^'"]/.test(layer + emoji), 'require dinâmico quebra o Metro');
  });
  it('DiveOverlay dispara cada efeito no evento certo', () => {
    for (const re of [
      /spawnFx\(fxForWaterTransition\('dive'/, /spawnFx\(fxForWaterTransition\('surface'/,
      /spawnFx\(fxForBreathEvent\(ev,/, /spawnFx\(fxForStrike\(attack,/, /spawnFx\(fxForBossTelegraph\(/, /spawnFx\(fxForBossRelease\(/,
      /spawnFx\(fxForCurrent\(/, /pressureSqueezing\(\{ deep, breathable, mods \}\)/, /testID="dive-pressure-squeeze"/, /<SeaFxLayer items=\{fxItems\}/,
      /emojiForBreathEvent\(ev\)/, /EMOJI_BLOCKED/,
    ]) assert.ok(re.test(overlay), String(re));
    // o filtro do MODO LEVE está no único ponto de entrada
    assert.ok(/getSettings\(\)\.lightMode[\s\S]{0,120}allowedInLightMode/.test(overlay));
    // limite de efeitos simultâneos
    assert.ok(/\.slice\(-28\)/.test(overlay));
  });
  it('nenhum efeito é gerado por sorteio solto: Math.random só entra como espalhamento de uma bolha da correnteza', () => {
    assert.equal((overlay.match(/Math\.random/g) ?? []).length, 1);
    assert.ok(/fxForCurrent\(\{ x: pushX, y: pushY \}, feetC, Math\.random\)/.test(overlay));
  });
  it('tela de derrota mostra a caveira só quando a causa da morte é conhecida', () => {
    const d = read('src/game/account/DefeatOverlay.tsx');
    assert.ok(/cause \? <Emoji name=\{EMOJI_DEATH\}/.test(d));
  });
  it('textos novos (aviso do golpe do chefe) existem nas 5 línguas', () => {
    const s = read('src/game/i18n/stringsMergulho.ts');
    for (const k of ['dive_boss_sweep', 'dive_boss_lure']) assert.equal((s.match(new RegExp(`${k}:`, 'g')) ?? []).length, 5, k);
  });
  it('créditos citam o pacote de efeitos e emojis', () => {
    const c = read('assets/sea/CREDITS.md');
    assert.ok(/Water Effect/i.test(c) && /Viral Emojis/i.test(c));
  });
});
