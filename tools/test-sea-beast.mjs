/**
 * SEA BEAST: sprites, chefe, estados, fases, memória e adaptação, regras de justiça, defesa, fôlego e recompensas.
 * Roda o motor real (Fighter, CpuController) no Node. `node tools/test-sea-beast.mjs`
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
const { createFighter } = require('../src/game/battle/Fighter.ts');
const { CpuController } = require('../src/game/battle/CpuController.ts');
const Brain = require('../src/game/battle/seaBeastBrain.ts');
const { CombatMemory } = require('../src/game/battle/combatMemory.ts');
const B = require('../src/game/dive/breath.ts');
const Sprites = require('../src/game/battle/sprites.ts');
const BossS = require('../src/game/state/bossState.ts');
const SF = require('../src/game/state/storyFlags.ts');
const { ITEMS } = require('../src/game/items/itemDefs.ts');
const { ARMORS } = require('../src/game/items/armorDefs.ts');
const BD = require('../src/game/account/battleDeath.ts');
const D = require('../src/game/account/deathCause.ts');
const { STAGE_KEYS } = require('../src/game/battle/stages.ts');
const { EXTRA_STRINGS } = require('../src/game/i18n/extraStrings.ts');
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const T = SEA_T();
function SEA_T() { return (lang) => Object.assign({}, ...EXTRA_STRINGS.map((m) => m[lang])); }

const T_ = Brain.SEA_TUNING;
function setup(mods = B.NO_BREATH_MODS) {
  const beast = createFighter('sea_beast', 1);
  const player = createFighter('dogge', 1);
  beast.x = 700; player.x = 400; beast.facing = -1;
  const cpu = new CpuController('medium');
  const brain = new Brain.SeaBeastBrain(beast, player, cpu, mods, () => 0.2);
  return { beast, player, cpu, brain };
}
const run = (ctx, ms, step = 50) => { for (let t = 0; t < ms; t += step) { ctx.brain.update(step); ctx.beast.update(step, 1); } };
const states = (ctx, ms, step = 50) => { const seq = []; for (let t = 0; t < ms; t += step) { ctx.brain.update(step); ctx.beast.update(step, 1); if (seq[seq.length - 1] !== ctx.brain.state) seq.push(ctx.brain.state); } return seq; };

describe('o Sea Beast existe como lutador e chefe de verdade', () => {
  it('tem sprites reais recortados das folhas, com os quadros de luta', () => {
    for (const pose of ['idle', 'walk1', 'walk2', 'walk3', 'flash', 'strong', 'ult', 'hurt', 'ko', 'guard', 'dash', 'charge', 'cast', 'blast', 'portrait']) {
      assert.ok(Sprites.hasPose('sea_beast', pose), pose);
      assert.ok(Sprites.SPRITE_ASPECTS.sea_beast[pose] > 0.5, pose);
      assert.ok(fs.existsSync(new URL(`../assets/sprites-v2/sea_beast/${pose}.png`, import.meta.url)), pose);
    }
    assert.equal(Sprites.walkFrames('sea_beast').length >= 3, true);
  });
  it('é um chefe enorme e pesado, com fases', () => {
    const f = createFighter('sea_beast', Sprites.getLayoutAspect('sea_beast'));
    assert.equal(f.name, 'Sea Beast');
    assert.ok(f.hasPhases && f.drawWidth >= 400 && f.maxHealth >= 200);
    assert.ok(f.getReferenceHeight() > 150, 'altura em tela');
  });
  it('é chefe do Abismo, com cenário próprio e recompensas Secret reais', () => {
    const b = BossS.BOSS_BY_ID.boss_sea_beast;
    assert.equal(b.character, 'sea_beast');
    assert.ok(STAGE_KEYS.includes(b.stageKey));
    for (const f of ['stage13.webp', 'stage13_dusk.webp', 'stage13_night.webp']) assert.ok(fs.existsSync(new URL(`../assets/legacy-art/stages/${f}`, import.meta.url)), f);
    assert.equal(ITEMS.leviathan_scale.rarity, 'secret');
    assert.equal(ARMORS[b.reward.armor].rarity, 'secret');
    for (const id of Object.keys(b.reward.items)) assert.ok(ITEMS[id], id);
  });
  it('vencer o chefe levanta a bandeira da missão final, uma vez só', () => {
    assert.equal(SF.hasFlag('beat_sea_beast'), false);
    assert.equal(BossS.markBossDefeated('boss_sea_beast'), true);
    assert.equal(SF.hasFlag('beat_sea_beast'), true);
    assert.equal(BossS.markBossDefeated('boss_sea_beast'), false);
  });
  it('os textos da luta existem nos 5 idiomas, sem travessão', () => {
    const keys = ['sea_enter', 'sea_phase2', 'sea_phase3', 'sea_area_warn', 'sea_vulnerable', 'sea_adapt_special', 'sea_adapt_heal', 'sea_adapt_buff', 'sea_adapt_bomb', 'sea_adapt_spam', 'sea_adapt_guard', 'sea_adapt_gear', 'sea_current_left', 'sea_current_right', 'sea_breath_low', 'sea_breath_empty', 'sea_defeated', 'dive_boss'];
    for (const lang of ['pt', 'en', 'es', 'fr', 'ja']) for (const k of keys) { const v = T(lang)[k]; assert.ok(v && !/[—–]/.test(v), `${lang} ${k}`); }
  });
});

describe('o Sea Beast é só um chefe: sem aura, sem energia, não jogável', () => {
  it('não tem energia: fica sempre cheia, o SUPER não gasta nem exige carga e não há ganho de energia', () => {
    const f = createFighter('sea_beast', 1);
    assert.equal(f.noEnergy, true);
    assert.equal(f.energy, f.maxEnergy);
    assert.equal(f.shieldCost, 0);
    assert.equal(f.startAttack('ultimate'), true, 'SUPER sem carga');
    assert.equal(f.energy, f.maxEnergy, 'não gastou');
    f.gainEnergy(50); f.energy = 10; f.gainEnergy(50);
    assert.equal(f.energy, 10, 'sem ganho de energia');
  });
  it('o CPU nunca farma aura com ele, mesmo na dificuldade que farma', () => {
    const f = createFighter('sea_beast', 1), p = createFighter('dogge', 1);
    f.x = 900; p.x = 100;
    const cpu = new CpuController('hardcore');
    let charged = 0;
    for (let i = 0; i < 400; i++) { cpu.tick(f, p, 50, 1); f.update(50, 1); if (f.isCharging) charged++; }
    assert.equal(charged, 0);
    assert.equal(f.energy, f.maxEnergy);
  });
  it('não aparece barra de energia dele na tela nem no elenco jogável', () => {
    assert.match(read('src/screens/BattleScreen.tsx'), /\{!fighter\.noEnergy && \(/);
    const R = require('../src/game/state/rosterState.ts');
    assert.ok(!R.ROSTER.some((r) => r.key === 'sea_beast'));
    assert.ok(!require('../src/game/versus/fighterLabels.ts').ALL_CHARACTERS.includes('sea_beast'));
    assert.ok(!/AuraEffect|startAura|farm/i.test(read('src/game/battle/seaBeastBrain.ts').replace(/sem aura[^\n]*/gi, '')));
  });
  it('o jogador continua com a energia e a aura dele normais nessa luta', () => {
    const p = createFighter('dogge', 1);
    assert.equal(p.noEnergy, false);
    p.gainEnergy(20);
    assert.equal(p.energy, 20);
  });
});

describe('estados bem definidos e compatíveis com o motor', () => {
  it('espera, observa, depois ataca; sem atacar enquanto espera', () => {
    const c = setup();
    assert.equal(c.brain.state, 'waiting');
    const seq = states(c, 8000);
    assert.deepEqual(seq.slice(0, 3), ['waiting', 'observe', 'direct']);
  });
  it('o CPU obedece ao cérebro: esperando, o Sea Beast não ataca nem com o jogador colado', () => {
    const c = setup();
    c.player.x = c.beast.x - 100;
    let attacks = 0;
    for (let i = 0; i < 20; i++) { c.brain.update(50); c.cpu.tick(c.beast, c.player, 50, 1); c.beast.update(50, 1); if (c.beast.currentAttack) attacks++; }
    assert.equal(attacks, 0);
  });
  it('ataque em área: sinal (carga visível), golpe SUPER, depois fica vulnerável e volta a atacar (nunca trava)', () => {
    const c = setup();
    const seq = states(c, 60000);
    assert.ok(seq.includes('area') && seq.includes('vulnerable'));
    for (let i = 0; i < seq.length; i++) if (seq[i] === 'area') assert.equal(seq[i + 1], 'vulnerable', 'toda área termina em vulnerabilidade');
    assert.equal(seq[seq.length - 1] === 'waiting', false);
  });
  it('o aviso de área vem com sinal ANTES do golpe', () => {
    const c = setup();
    let warned = false, charged = false, fired = false;
    for (let t = 0; t < 40000; t += 50) {
      c.brain.update(50); c.beast.update(50, 1);
      for (const e of c.brain.drainEvents()) if (e.key === 'sea_area_warn') warned = true;
      if (c.brain.state === 'area' && c.beast.isCharging) charged = true;
      if (c.beast.currentAttack?.type === 'ultimate') { fired = true; assert.ok(warned && charged, 'golpe sem aviso'); break; }
    }
    assert.ok(fired);
  });
  it('vulnerável: o jogador causa mais dano; a defesa dele cai', () => {
    const c = setup();
    states(c, 60000);
    const c2 = setup();
    run(c2, 8000);
    const normal = c2.brain.incoming('flash');
    c2.brain.state = 'vulnerable';
    assert.ok(Math.abs(c2.brain.incoming('flash') - normal * T_.vulnerableDmgMult) < 1e-9);
  });
  it('derrota: o Sea Beast cai, o estado vira "defeated" e avisa uma vez', () => {
    const c = setup();
    run(c, 3000);
    c.beast.health = 0; c.beast.isKO = true;
    run(c, 200);
    assert.equal(c.brain.state, 'defeated');
    const evs = c.brain.drainEvents().filter((e) => e.key === 'sea_defeated');
    assert.equal(evs.length, 1);
    run(c, 500);
    assert.equal(c.brain.drainEvents().filter((e) => e.key === 'sea_defeated').length, 0);
  });
});

describe('três fases que mudam o COMBATE, não só a vida', () => {
  it('fase pela vida: 66% e 33%; a virada é invulnerável e avisa', () => {
    const c = setup();
    run(c, 1000);
    assert.equal(c.brain.phase, 1);
    c.beast.health = c.beast.maxHealth * 0.6;
    c.brain.update(50);
    assert.equal(c.brain.phase, 2);
    assert.equal(c.brain.state, 'phase');
    assert.ok(c.beast.invulnTimer > 0);
    assert.equal(c.brain.incoming('strong'), 0);
    assert.ok(c.brain.drainEvents().some((e) => e.key === 'sea_phase2'));
    c.beast.health = c.beast.maxHealth * 0.3;
    c.brain.update(50);
    assert.equal(c.brain.phase, 3);
    assert.ok(c.brain.drainEvents().some((e) => e.key === 'sea_phase3'));
  });
  it('um golpe enorme que pula uma fase não deixa nada para trás', () => {
    const c = setup();
    run(c, 1000);
    c.beast.health = c.beast.maxHealth * 0.2;
    c.brain.update(50);
    assert.equal(c.brain.phase, 3);
    assert.equal(c.beast.phase, 2, 'a virada do motor também aconteceu');
    assert.equal(c.brain.submerged, true);
  });
  it('estratégia diferente por fase: agressão, especial, intervalo da área e reação', () => {
    const ps = [1, 2, 3].map((ph) => { const c = setup(); c.brain.phase = ph; c.brain.state = 'direct'; return c.brain.director(c.beast, c.player); });
    // o diretor é privado: lê pelo CPU
    assert.ok(ps.every((p) => p));
    assert.ok(ps[0].attackChance < ps[1].attackChance && ps[1].attackChance < ps[2].attackChance);
    assert.ok(ps[0].ultChance < ps[1].ultChance && ps[1].ultChance < ps[2].ultChance);
    assert.ok(ps[0].reactMin > ps[1].reactMin && ps[1].reactMin > ps[2].reactMin);
    assert.ok(T_.areaCdMs[1] > T_.areaCdMs[2] && T_.areaCdMs[2] > T_.areaCdMs[3]);
  });
  it('fase 1 é na superfície (sem correnteza nem fôlego); da 2 em diante há pressão do ambiente', () => {
    const c = setup();
    run(c, 30000);
    assert.equal(c.brain.phase, 1);
    assert.equal(c.brain.submerged, false);
    assert.equal(c.brain.current, null);
    const r = c.brain.tickBreath(5000);
    assert.equal(r.damageFrac, 0);
    assert.equal(c.brain.breath.sec, B.breathMax(B.NO_BREATH_MODS));
  });
  it('correnteza: empurra os DOIS lutadores igualmente, avisa a direção e termina', () => {
    const c = setup();
    run(c, 1000);
    c.beast.health = c.beast.maxHealth * 0.6; c.brain.update(50);
    c.brain.drainEvents();
    let sawCurrent = false, d0 = Math.abs(c.beast.x - c.player.x);
    for (let t = 0; t < 30000; t += 50) {
      const bx = c.beast.x, px = c.player.x, had = !!c.brain.current;
      c.brain.update(50); c.beast.update(50, 1);
      if (had) {
        sawCurrent = true;
        const dBeast = c.beast.x - bx, dPlayer = c.player.x - px;
        assert.ok(Math.abs(dBeast - dPlayer) < 1e-6, 'a correnteza empurra os dois igual');
        assert.ok(Math.abs(Math.abs(dPlayer) - (T_.currentPush * 50) / 1000) < 1e-6, 'empurrão = velocidade x tempo');
      }
      if (sawCurrent && !c.brain.current) break;
    }
    assert.ok(sawCurrent);
    assert.equal(c.brain.current, null, 'a correnteza termina');
    assert.ok(c.brain.drainEvents().some((e) => e.key === 'sea_current_left' || e.key === 'sea_current_right'));
  });
});

describe('MEMÓRIA: o chefe só sabe o que viu', () => {
  it('começa sem saber nada: nenhuma resposta antes de observar', () => {
    const c = setup();
    const a = c.brain.adaptation();
    assert.equal(a.specialResist, 1);
    assert.deepEqual(a.basicRead, { flash: 1, strong: 1 });
    assert.deepEqual([a.gearDamp, a.buffDamp, a.healMult, a.bombMult, a.guardPressure, a.specialReady], [1, 1, 1, 1, false, false]);
    assert.equal(c.brain.incoming('ultimate'), 1);
  });
  it('especial repetido: perde força aos poucos, com piso de 60% (e a 1ª e 2ª vez ainda valem cheio)', () => {
    const c = setup();
    run(c, 7000);
    const seq = [];
    for (let i = 0; i < 8; i++) { seq.push(c.brain.incoming('ultimate')); c.brain.onHit({ attacker: 'player', type: 'ultimate', blocked: false, dealt: 5 }); }
    assert.equal(seq[0], 1); assert.equal(seq[1], 1);
    assert.ok(seq[2] < 1 && seq[3] < seq[2] && seq[4] < seq[3], seq.join());
    assert.ok(Math.abs(seq[7] - T_.specialFloor) < 1e-9, 'piso ' + seq[7]);
    assert.ok(seq.every((x) => x >= T_.specialFloor - 1e-9));
  });
  it('avisa a adaptação ao especial UMA vez por nível', () => {
    const c = setup();
    run(c, 7000); c.brain.drainEvents();
    for (let i = 0; i < 7; i++) c.brain.onHit({ attacker: 'player', type: 'ultimate', blocked: false, dealt: 5 });
    const n = c.brain.drainEvents().filter((e) => e.key === 'sea_adapt_special').length;
    assert.equal(n, 2, 'níveis 3 e 5');
  });
  it('ataques básicos NUNCA ficam inúteis: pisos de 70% mesmo com 200 repetições, sem limite de usos', () => {
    const c = setup();
    run(c, 7000);
    let minFlash = 1;
    for (let i = 0; i < 200; i++) { minFlash = Math.min(minFlash, c.brain.incoming('flash')); c.brain.onHit({ attacker: 'player', type: 'flash', blocked: false, dealt: 3 }); }
    assert.ok(minFlash >= T_.basicFloor - 1e-9 && minFlash > 0, String(minFlash));
    assert.ok(c.brain.incoming('flash') >= 0.7 - 1e-9);
    for (let i = 0; i < 200; i++) c.brain.onHit({ attacker: 'player', type: 'strong', blocked: false, dealt: 3 });
    assert.ok(c.brain.incoming('strong') >= 0.7 - 1e-9);
  });
  it('variar os golpes desfaz a leitura: golpe diferente volta com força total', () => {
    const c = setup();
    run(c, 7000);
    for (let i = 0; i < 12; i++) c.brain.onHit({ attacker: 'player', type: 'flash', blocked: false, dealt: 3 });
    assert.ok(c.brain.incoming('flash') < 1);
    c.brain.onHit({ attacker: 'player', type: 'strong', blocked: false, dealt: 3 });
    assert.equal(c.brain.incoming('strong'), 1, 'FORTE não foi lido');
    c.brain.onHit({ attacker: 'player', type: 'flash', blocked: false, dealt: 3 });
    assert.ok(c.brain.incoming('flash') > 0.9, 'a sequência recomeçou');
  });
  it('dependência de um golpe só: o chefe passa a se proteger mais (sem virar muro)', () => {
    const c = setup();
    run(c, 7000);
    const base = c.brain.director(c.beast, c.player).shieldChance;
    for (let i = 0; i < 12; i++) c.brain.onHit({ attacker: 'player', type: 'flash', blocked: false, dealt: 3 });
    const after = c.brain.director(c.beast, c.player).shieldChance;
    assert.ok(after > base && after <= 0.6, `${base} -> ${after}`);
    assert.ok(c.brain.drainEvents().some((e) => e.key === 'sea_adapt_spam'));
  });
  it('especial previsível: com o SUPER quase pronto, o chefe se prepara (escudo sobe)', () => {
    const c = setup();
    run(c, 7000);
    for (let i = 0; i < 3; i++) c.brain.onHit({ attacker: 'player', type: 'ultimate', blocked: false, dealt: 5 });
    c.player.energy = c.player.maxEnergy;
    const ready = c.brain.director(c.beast, c.player).shieldChance;
    c.player.energy = 0;
    const idle = c.brain.director(c.beast, c.player).shieldChance;
    assert.ok(ready > idle);
  });
  it('cura em excesso: a cura do jogador vale menos, com piso de 70%, e a 1ª e 2ª valem cheio', () => {
    const c = setup();
    const refunds = [];
    for (let i = 0; i < 8; i++) refunds.push(c.brain.onItem('potion_hp_l', { playerHealed: 100, beastDamaged: 0 }).playerRefund);
    assert.equal(refunds[0], 0); assert.equal(refunds[1], 0);
    assert.ok(refunds[2] > 0 && refunds[3] > refunds[2]);
    assert.ok(Math.max(...refunds) <= 30 + 1e-9, 'no máximo 30% da cura');
    assert.ok(c.brain.drainEvents().some((e) => e.key === 'sea_adapt_heal'));
  });
  it('bomba em excesso: o chefe devolve parte do dano (limite de 30%)', () => {
    const c = setup();
    const r = [];
    for (let i = 0; i < 8; i++) r.push(c.brain.onItem('w_bomb', { playerHealed: 0, beastDamaged: 100 }).beastRefund);
    assert.equal(r[0], 0); assert.ok(r[3] > 0 && Math.max(...r) <= 30 + 1e-9);
  });
  it('buffs repetidos: resposta pequena e limitada', () => {
    const c = setup();
    for (let i = 0; i < 5; i++) c.brain.onItem('power_brew', { playerHealed: 0, beastDamaged: 0 });
    const a = c.brain.adaptation();
    assert.ok(a.buffDamp < 1 && a.buffDamp >= 0.88);
  });
  it('item usado uma única vez não provoca resposta', () => {
    const c = setup();
    c.brain.onItem('potion_hp_l', { playerHealed: 80, beastDamaged: 0 });
    assert.equal(c.brain.adaptation().healMult, 1);
  });
  it('equipamento: só depois de observar por 20 s e só uma redução fixa pequena (nunca anula)', () => {
    const c = setup();
    c.brain.observeGear({ critChance: 0.2, weaponMult: 1.3, lifesteal: 0, divingGear: false });
    assert.equal(c.brain.adaptation().gearDamp, 1, 'ainda não observou');
    run(c, 21000);
    assert.equal(c.brain.adaptation().gearDamp, T_.gearDamp);
    assert.ok(T_.gearDamp >= 0.9);
    const plain = setup(); plain.brain.observeGear({ critChance: 0.05, weaponMult: 1, lifesteal: 0, divingGear: false });
    run(plain, 25000);
    assert.equal(plain.brain.adaptation().gearDamp, 1, 'sem equipamento forte não há resposta');
  });
  it('quem bloqueia quase tudo sofre pressão na guarda; ao variar, a guarda volta ao normal', () => {
    const c = setup();
    const base = c.player.shieldCost;
    for (let i = 0; i < 6; i++) c.brain.onHit({ attacker: 'beast', type: 'flash', blocked: true, dealt: 1 });
    c.brain.update(50);
    assert.ok(c.brain.adaptation().guardPressure);
    assert.ok(Math.abs(c.player.shieldCost - base * T_.guardCostMult) < 1e-9);
    assert.ok(c.player.shieldCost > base);
    for (let i = 0; i < 12; i++) c.brain.onHit({ attacker: 'beast', type: 'flash', blocked: false, dealt: 8 });
    c.brain.update(50);
    assert.equal(c.player.shieldCost, base);
  });
  it('a memória vale a luta toda: sobrevive à troca de fase e começa vazia numa luta nova', () => {
    const c = setup();
    run(c, 7000);
    for (let i = 0; i < 4; i++) c.brain.onHit({ attacker: 'player', type: 'ultimate', blocked: false, dealt: 5 });
    c.beast.health = c.beast.maxHealth * 0.5; c.brain.update(50);
    assert.equal(c.brain.memory.specialUses(), 4);
    assert.ok(c.brain.incoming('ultimate') < 1 || c.brain.state === 'phase');
    const fresh = setup();
    assert.equal(fresh.brain.memory.specialUses(), 0);
  });
  it('a memória não é salva: nada de brain/memória em persistência', () => {
    for (const f of ['src/game/battle/seaBeastBrain.ts', 'src/game/battle/combatMemory.ts']) assert.ok(!/AsyncStorage|registerSaveExt/.test(read(f)), f);
  });
});

describe('defesa funciona; não há esquiva; contra-ataque existe', () => {
  it('escudo do jogador continua bloqueando golpes do Sea Beast (com custo de energia)', () => {
    const c = setup();
    c.player.energy = 100;
    c.player.startShield();
    const hp = c.player.health;
    c.player.takeHit(20);
    assert.ok(c.player.health > hp - 20, 'bloqueou parte');
    assert.ok(c.player.energy < 100);
  });
  it('mesmo com a guarda pressionada o escudo funciona enquanto houver energia', () => {
    const c = setup();
    c.player.shieldCost = c.player.shieldCost * T_.guardCostMult;
    c.player.energy = c.player.shieldCost + 1;
    c.player.startShield();
    const hp = c.player.health;
    c.player.takeHit(30);
    assert.ok(hp - c.player.health < 30);
  });
  it('NÃO foi criada mecânica de esquiva', () => {
    for (const f of ['src/game/battle/seaBeastBrain.ts', 'src/game/battle/combatMemory.ts', 'src/game/dive/DiveOverlay.tsx', 'src/game/dive/diveSim.ts', 'src/game/dive/breath.ts']) {
      assert.ok(!/dodge|esquiv|evade/i.test(read(f)), f);
    }
  });
  it('depois do golpe de área o chefe fica exposto: é a janela de contra-ataque', () => {
    const c = setup();
    const seq = states(c, 60000);
    assert.ok(seq.includes('vulnerable'));
  });
});

describe('fôlego na luta submarina', () => {
  const toPhase2 = (c) => { run(c, 1000); c.beast.health = c.beast.maxHealth * 0.6; c.brain.update(50); };
  it('fase 2: gasta fôlego; zerou, o afogamento machuca em intervalos (nunca por quadro)', () => {
    const c = setup();
    toPhase2(c);
    let ticks = 0, dmg = 0;
    for (let t = 0; t < 40000; t += 50) { const r = c.brain.tickBreath(50); if (r.damageFrac > 0) { ticks++; dmg += r.damageFrac; } }
    assert.ok(ticks >= 8 && ticks <= 13, `tiques em 40 s: ${ticks}`);
    assert.ok(c.brain.drainEvents().some((e) => e.key === 'sea_breath_empty'));
  });
  it('quando o chefe fica vulnerável (sobe), o jogador respira de novo', () => {
    const c = setup();
    toPhase2(c);
    for (let t = 0; t < 30000; t += 50) c.brain.tickBreath(50);
    assert.ok(c.brain.breath.empty);
    c.brain.state = 'vulnerable';
    for (let t = 0; t < 3000; t += 50) c.brain.tickBreath(50);
    assert.equal(c.brain.breath.empty, false);
    assert.ok(c.brain.breath.sec > 10);
  });
  it('equipamento de mergulho vale na luta: capacidade extra e fôlego infinito', () => {
    const wet = B.combineMods(ARMORS.armor_wetsuit.breath, undefined);
    const c = setup(wet); toPhase2(c);
    assert.equal(c.brain.breath.sec, 42);
    const inf = setup(B.combineMods(ARMORS.armor_gills.breath, undefined)); toPhase2(inf);
    let dmg = 0; for (let t = 0; t < 60000; t += 50) dmg += inf.brain.tickBreath(50).damageFrac;
    assert.equal(dmg, 0);
  });
  it('fase 3 tem pressão; a armadura de coral protege', () => {
    const c = setup();
    run(c, 1000); c.beast.health = c.beast.maxHealth * 0.2; c.brain.update(50);
    c.brain.state = 'direct';
    let pressure = 0; for (let t = 0; t < 6000; t += 50) if (c.brain.tickBreath(50).events.includes('pressure')) pressure++;
    assert.ok(pressure >= 2);
    const coral = setup(B.combineMods(ARMORS.armor_coral.breath, undefined));
    run(coral, 1000); coral.beast.health = coral.beast.maxHealth * 0.2; coral.brain.update(50);
    let p2 = 0; for (let t = 0; t < 6000; t += 50) if (coral.brain.tickBreath(50).events.includes('pressure')) p2++;
    assert.equal(p2, 0);
  });
  it('dano ambiental ignora o escudo e usa o mesmo nocaute; a morte cita o afogamento e a região', () => {
    const p = createFighter('dogge', 1);
    p.energy = 100; p.startShield();
    p.takeEnvironmentalDamage(p.maxHealth * 0.5);
    assert.ok(Math.abs(p.health - p.maxHealth * 0.5) < 1e-9, 'escudo não protege de afogamento');
    p.takeEnvironmentalDamage(p.maxHealth, 'drowning');
    assert.ok(p.isKO && p.health === 0 && p.lastHurtBy === 'drowning');
    const msg = (k) => T('pt')[k];
    const cause = BD.battleDeathCause({ kind: 'boss', opponentName: 'Sea Beast', bossName: 'Sea Beast', lastHurtBy: p.lastHurtBy, region: 'Abismo Sombrio' });
    assert.equal(D.describeDeath(cause, msg), 'Você morreu durante a exploração de Abismo Sombrio, devido a afogamento.');
    const hit = BD.battleDeathCause({ kind: 'boss', opponentName: 'Sea Beast', bossName: 'Sea Beast', lastHurtBy: 'hit', region: 'Abismo Sombrio' });
    assert.equal(D.describeDeath(hit, msg), 'Você perdeu para o Boss Sea Beast.');
  });
  it('sem a luta do Sea Beast, o fôlego não existe (outras lutas intactas)', () => {
    const src = read('src/screens/BattleScreen.tsx');
    assert.match(src, /p2Key === 'sea_beast' && p2IsCpu/);
    assert.match(src, /p2Key !== 'sea_beast' && p2.phase === 1/);
  });
});

describe('luta simulada completa: o chefe é vencível e as regras de justiça valem do começo ao fim', () => {
  it('jogador usando só golpes básicos repetidos ainda derrota o Sea Beast', () => {
    const c = setup();
    run(c, 7000);
    let dealt = 0;
    for (let i = 0; i < 4000 && c.beast.health > 0; i++) {
      const mult = c.brain.incoming('flash');
      const dmg = 6 * mult;
      c.beast.health = Math.max(0, c.beast.health - dmg);
      dealt += dmg;
      c.brain.onHit({ attacker: 'player', type: 'flash', blocked: false, dealt: dmg });
      c.brain.update(20);
    }
    assert.ok(c.beast.health <= 0, 'ficou impossível');
    assert.ok(dealt > 0);
  });
  it('em nenhum momento a vida do chefe fica presa (invulnerável) por mais de 2 s', () => {
    const c = setup();
    let inv = 0, worst = 0;
    for (let t = 0; t < 120000; t += 50) {
      if (t === 20000) c.beast.health = c.beast.maxHealth * 0.6;
      if (t === 60000) c.beast.health = c.beast.maxHealth * 0.3;
      c.brain.update(50); c.beast.update(50, 1);
      inv = c.beast.invulnTimer > 0 ? inv + 50 : 0;
      worst = Math.max(worst, inv);
    }
    assert.ok(worst <= 2000, String(worst));
  });
  it('o jogo não ficou preso: não há estado sem saída', () => {
    const c = setup();
    const seen = new Set();
    for (let t = 0; t < 200000; t += 50) { c.brain.update(50); c.beast.update(50, 1); seen.add(c.brain.state); if (t === 50000) c.beast.health = c.beast.maxHealth * 0.5; if (t === 90000) c.beast.health = c.beast.maxHealth * 0.2; }
    for (const s of ['observe', 'direct', 'area', 'vulnerable', 'phase']) assert.ok(seen.has(s), s);
  });
});
