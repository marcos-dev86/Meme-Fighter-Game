/**
 * Testes da Parte 3.1: sons ambiente por região (mistura pura em audio/ambientMix.ts + arquivos + integração).
 * `node tests/unit/sistema/sons-ambiente.test.mjs`. A parte de áudio real (som saindo do aparelho) só se confirma no celular.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
require('../../_support/ts-register.cjs');
const M = require('../../../src/game/audio/ambientMix.ts');
const read = (p) => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
const exists = (p) => fs.existsSync(new URL(`../../../${p}`, import.meta.url));

const base = { island: 'main', interior: null, sailing: false, night: false, weather: 'clear', water: 0 };
const mix = (o) => M.ambientMix({ ...base, ...o });
const active = (m) => Object.entries(m).filter(([, v]) => v > 0).map(([k]) => k);

describe('arquivos e registro', () => {
  it('cada ambiente existe como mp3 e está no AMBIENT', () => {
    const assets = read('src/game/audio/audioAssets.ts');
    for (const k of M.ALL_AMBIENTS) {
      assert.ok(exists(`assets/audio/ambient/${k}.mp3`), `falta ${k}.mp3`);
      assert.ok(new RegExp(`${k}: require\\('../../../assets/audio/ambient/${k}.mp3'\\)`).test(assets), `${k} não registrado`);
    }
  });
  it('script de síntese documenta que nada é amostra externa', () => {
    assert.ok(/make_ambient\.py/.test(read('docs/AUDIT.md')) || exists('tools/make_ambient.py'));
  });
});

describe('floresta: dia e noite', () => {
  it('de dia toca pássaros; de noite, grilos', () => {
    assert.deepEqual(active(mix({})), ['birds']);
    assert.deepEqual(active(mix({ night: true })), ['crickets']);
  });
  it('chuva cala os bichos e deixa só a chuva', () => {
    assert.deepEqual(active(mix({ weather: 'rain' })), ['rain']);
    assert.deepEqual(active(mix({ weather: 'storm', night: true })).sort(), ['rain']);
  });
});

describe('outras regiões', () => {
  it('vulcão ronca', () => assert.ok(mix({ island: 'vulcao' }).volcano > 0.5));
  it('gelo: vento, sem pássaros nem grilos', () => {
    const m = mix({ island: 'gelo' });
    assert.ok(m.wind > 0 && m.birds === 0 && m.crickets === 0);
    assert.ok(mix({ island: 'gelo', night: true }).wind > 0);
  });
  it('caverna e subsolo: pingos, sem clima mesmo com tempestade', () => {
    const m = mix({ interior: 'cave', weather: 'storm', island: 'gelo' });
    assert.deepEqual(active(m), ['cave']);
  });
  it('cassino tem ambiente próprio e não ouve chuva', () => {
    assert.deepEqual(active(mix({ interior: 'casino', weather: 'rain' })), ['casino']);
  });
  it('lojas e casas têm camas diferentes; chuva chega abafada', () => {
    assert.deepEqual(active(mix({ interior: 'shop' })), ['shop']);
    assert.deepEqual(active(mix({ interior: 'home' })), ['home']);
    const m = mix({ interior: 'home', weather: 'rain' });
    assert.ok(m.rain > 0 && m.rain < 0.3 && m.home > 0.5 && m.wind === 0 && m.waves === 0);
  });
  it('navegando: só ondas', () => assert.deepEqual(active(mix({ sailing: true, water: 0 })), ['waves']));
  it('praia: ondas somadas à cama regional', () => {
    const m = mix({ water: 0.4 });
    assert.deepEqual(active(m).sort(), ['birds', 'waves']);
  });
});

describe('exclusividade: nunca mais de 2 loops', () => {
  it('varre todas as combinações', () => {
    const islands = ['main', 'main_west', 'misteriosa', 'fragments', 'camp', 'dogisland', 'gelo', 'vulcao', 'trevas', null];
    const ints = [null, 'shop', 'home', 'cave', 'casino'];
    const weathers = ['clear', 'rain', 'storm', 'fog', 'snow', 'blizzard', 'ash'];
    let n = 0;
    for (const island of islands) for (const interior of ints) for (const weather of weathers) for (const night of [false, true]) for (const sailing of [false, true]) for (const water of [0, 0.3, 0.7]) {
      const m = M.ambientMix({ island, interior, sailing, night, weather, water });
      const a = active(m);
      const beds = a.filter((k) => M.BED_KEYS.includes(k));
      const layers = a.filter((k) => M.LAYER_KEYS.includes(k));
      assert.ok(beds.length <= 1 && layers.length <= 1 && a.length <= 2, JSON.stringify({ island, interior, weather, night, sailing, water, a }));
      for (const v of Object.values(m)) assert.ok(v >= 0 && v <= 1);
      n++;
    }
    assert.ok(n > 4000);
  });
  it('camada forte abafa a cama ao ar livre', () => {
    const calm = mix({ island: 'vulcao' });
    const m = mix({ island: 'vulcao', weather: 'storm' });
    assert.ok(m.rain === 1 && m.volcano > 0 && m.volcano < calm.volcano);
    assert.ok(mix({ weather: 'fog' }).birds < 0.7);
  });
});

describe('interiorKindOf', () => {
  const k = M.interiorKindOf;
  it('mapeia prédios', () => {
    assert.equal(k(null, 'shop', 'loja_misteriosa'), null);
    assert.equal(k('loja_misteriosa', 'casino', 'loja_misteriosa'), 'casino');
    assert.equal(k('caverna', undefined, 'x'), 'cave');
    assert.equal(k('a', 'basement', 'x'), 'cave');
    assert.equal(k('a', 'cozyHome', 'x'), 'home');
    assert.equal(k('a', 'loft', 'x'), 'home');
    assert.equal(k('a', 'shop', 'x'), 'shop');
    assert.equal(k('guilda', undefined, 'x'), 'shop');
  });
  it('todo prédio real mapeia para uma cama que existe', () => {
    const ids = [...read('src/game/world/buildingContent.ts').matchAll(/^  ([a-z_0-9]+): \{$/gm)].map((m) => m[1]);
    assert.ok(ids.length > 5);
    for (const id of ids) assert.ok(['shop', 'home', 'cave', 'casino'].includes(k(id, undefined, 'loja_misteriosa')), id);
  });
});

describe('integração com o mundo e o áudio', () => {
  const world = read('src/screens/WorldScreen.tsx');
  const am = read('src/game/audio/audioManager.ts');
  it('WorldScreen usa a mistura, respeita pausa e limpa ao sair', () => {
    assert.ok(/ambientMix\(\{/.test(world) && /for \(const k of ALL_AMBIENTS\) setAmbient\(k, mix\[k\]\)/.test(world));
    assert.ok(/if \(pausedRef\.current\) return;/.test(world), 'pausa: não mexe nos ambientes (o audioManager pausa e retoma)');
    assert.ok(/isWorldFrozen\(\)\) \{[\s\S]{0,260}stopAmbients\(\);[\s\S]{0,30}return;/.test(world), 'luta aberta: ambientes do mundo silenciam e voltam depois');
    assert.ok(/stopAmbients\(\);/.test(world));
    assert.ok(/isNight\(\)/.test(world));
  });
  it('audioManager: volume AMBIENTE, pausa e retomada dos ambientes', () => {
    assert.ok(/a\.level \* vol/.test(am));
    assert.ok(/for \(const a of ambients\.values\(\)\) \{\s*try \{\s*a\.player\.pause\(\)/.test(am));
    assert.ok(/if \(a\.playing && a\.level > 0\.01\) tryPlay/.test(am));
  });
  it('ambientes não mexem na música nem nos efeitos (players separados)', () => {
    assert.ok(/createAudioPlayer\(AMBIENT\[key\]\)/.test(am));
  });
});
