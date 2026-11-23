/**
 * Parte 5.3 / 5.4: revisão automática de pausa, timers e vazamentos. Varre o código-fonte:
 *  - todo setInterval tem clearInterval no mesmo arquivo (nenhum timer fica vivo depois de sair da tela);
 *  - todo requestAnimationFrame tem cancelAnimationFrame;
 *  - toda animação infinita (withRepeat) tem cancelAnimation no mesmo arquivo;
 *  - o que roda DENTRO do jogo (mundo/luta) consulta a pausa;
 *  - o ciclo de pausa/retomada do áudio e das ondas e o congelamento do mundo durante a luta.
 * `node tests/unit/sistema/pausa-e-timers.test.mjs`
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const root = new URL('../../..', import.meta.url).pathname;
function walk(d, out = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}
const files = walk(path.join(root, 'src')).map((p) => ({ p: path.relative(root, p), s: fs.readFileSync(p, 'utf8') }));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

/** Telas de menu e abas fora do jogo (não têm "pausa"): só precisam limpar o que criam. */
const MENU_ONLY = new Set(['src/game/menu/ArtBackdrop.tsx', 'src/game/versus/VersusSplash.tsx']);

describe('timers e animações não vazam', () => {
  it('todo setInterval tem clearInterval no mesmo arquivo', () => {
    for (const f of files) if (/\bsetInterval\(/.test(f.s)) assert.ok(/\bclearInterval\(/.test(f.s), `${f.p} sem clearInterval`);
  });
  it('todo requestAnimationFrame tem cancelAnimationFrame', () => {
    for (const f of files) if (/\brequestAnimationFrame\(/.test(f.s)) assert.ok(/\bcancelAnimationFrame\(/.test(f.s), `${f.p}`);
  });
  it('toda animação infinita (withRepeat) é cancelada (cancelAnimation) no mesmo arquivo', () => {
    for (const f of files) if (/\bwithRepeat\(/.test(f.s)) assert.ok(/\bcancelAnimation\(/.test(f.s), `${f.p} sem cancelAnimation`);
  });
  it('setInterval dentro de useEffect devolve a limpeza (return () => clearInterval)', () => {
    for (const f of files) {
      if (f.p.endsWith('audioManager.ts') || !/\bsetInterval\(/.test(f.s)) continue;
      assert.ok(/return \(\) => (\{[^}]*)?clearInterval\(/.test(f.s.replace(/\n/g, ' ')) || /forEach\(clearInterval\)/.test(f.s), `${f.p} sem return de limpeza`);
    }
  });
});

describe('pausa de verdade nas partes do jogo', () => {
  const inGame = ['src/game/world/OutdoorNpcs.tsx', 'src/game/world/FerryBoats.tsx', 'src/game/world/WeatherLayer.tsx', 'src/game/battle/AuraEffect.tsx', 'src/game/battle/SpriteEffect.tsx', 'src/game/enemies/EnemyLayer.tsx', 'src/game/world/waveClock.ts'];
  it('laços e animações do mundo e da luta consultam a pausa', () => {
    for (const p of inGame) assert.ok(/isGamePaused|useGamePaused|paused|Paused/.test(read(p)), p);
  });
  it('mundo: relógio, clima, trovão e ambientes só andam sem pausa e sem luta aberta', () => {
    const w = read('src/screens/WorldScreen.tsx');
    assert.ok(/if \(pausedRef\.current\) return;/.test(w));
    assert.ok(/if \(isWorldFrozen\(\)\) \{\s*[^}]*stopAmbients\(\);\s*return;/.test(w.replace(/\n/g, ' ').replace(/\s+/g, ' ')) || /isWorldFrozen\(\)\) \{[\s\S]{0,260}stopAmbients\(\);[\s\S]{0,30}return;/.test(w));
  });
  it('pause global liga: áudio, tempo de jogo e ondas', () => {
    const ps = read('src/game/state/pauseState.ts');
    assert.ok(/setAudioPaused\(next\)/.test(ps) && /setSessionPaused\(next\)/.test(ps) && /setWavesPaused\(next\)/.test(ps));
  });
  it('áudio: pausar para sfx e ambientes; retomar só o que estava tocando; timer de fade se desliga quando ocioso', () => {
    const a = read('src/game/audio/audioManager.ts');
    assert.ok(/export function setAudioPaused/.test(a));
    assert.ok(/for \(const a of ambients\.values\(\)\) \{\s*try \{\s*a\.player\.pause\(\)/.test(a));
    assert.ok(/if \(a\.playing && a\.level > 0\.01\) tryPlay/.test(a));
    assert.ok(/if \(!busy && ambientTimer\) \{\s*clearInterval\(ambientTimer\)/.test(a));
  });
  it('ondas: pausa cancela o relógio, retoma termina o ciclo e volta ao laço; ONDAS ANIMADAS desligado para o relógio de vez', () => {
    const w = read('src/game/world/waveClock.ts');
    assert.ok(/cancelAnimation\(waveT\)/.test(w) && /export function stopWaves/.test(w));
    assert.ok(/waveAnimation/.test(read('src/game/world/TileMapRenderer.tsx')));
  });
  it('luta aberta congela o mundo (setBattleOpen) e limpa ao sair', () => {
    const b = read('src/screens/BattleScreen.tsx');
    assert.ok(/setBattleOpen\(true\)/.test(b) && /setBattleOpen\(false\)/.test(b));
  });
  it('cutscene: o player encerra a música, o ambiente, os sons e as animações ao sair (limpeza)', () => {
    const c = read('src/game/story/CodeCutscenePlayer.tsx');
    assert.ok(/return \(\) =>/.test(c) && /stopAmbients\(\)/.test(c) && /clearTimeout/.test(c) && /cancelAnimation/.test(c));
  });
});

describe('5.4 opções gráficas (celular fraco)', () => {
  it('3 opções novas existem, valem por padrão ligadas e saves antigos recebem o padrão seguro', () => {
    const s = read('src/game/state/settingsState.ts');
    assert.ok(/weatherParticles: true, waveAnimation: true, nightDarkening: true/.test(s));
    assert.ok(/weatherParticles: d\.weatherParticles !== false/.test(s) && /waveAnimation: d\.waveAnimation !== false/.test(s) && /nightDarkening: d\.nightDarkening !== false/.test(s));
  });
  it('cada opção realmente desliga o efeito (mundo e luta)', () => {
    const w = read('src/screens/WorldScreen.tsx');
    assert.ok(/settings\.weatherParticles && <WeatherLayer/.test(w) && /settings\.nightDarkening && <NightLayer/.test(w));
    assert.ok(/settings\.weatherParticles/.test(read('src/screens/BattleScreen.tsx')));
    assert.ok(/getSettings\(\)\.waveAnimation/.test(read('src/game/world/TileMapRenderer.tsx')));
  });
  it('estão na tela de Opções com textos nos 5 idiomas', () => {
    const o = read('src/screens/OptionsScreen.tsx');
    for (const k of ['opt_weather_particles', 'opt_wave_anim', 'opt_night_dark']) assert.ok(o.includes(`'${k}'`) && o.includes(`'${k}_note'`), k);
  });
});
