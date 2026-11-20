/**
 * O CÉREBRO DO SEA BEAST (Leviatã): estados, fases, ataque em área com sinal, vulnerabilidade, correntes, fôlego no fundo
 * e, acima de tudo, ADAPTAÇÃO ao que o jogador realmente faz na luta (CombatMemory).
 *
 * Não é um segundo motor de combate: roda POR CIMA do motor existente.
 *  - decide os parâmetros do CpuController (via `setDirector`): agressão, chance de especial e de escudo;
 *  - devolve multiplicadores para o dano que o chefe recebe (`incoming`) e para cura/bomba do jogador (`onItem`);
 *  - usa as mesmas regras do Fighter (escudo, energia, golpe SUPER, invulnerabilidade de fase).
 *
 * Regras de justiça (testadas em tools/test-sea-beast.mjs):
 *  - golpes básicos (FLASH, FORTE) NUNCA ficam inúteis: no pior caso causam 70% do dano; sem limite de usos;
 *  - o especial repetido perde força aos poucos, com piso de 60%; o outro golpe volta com força total;
 *  - itens e equipamentos têm resposta PARCIAL e limitada; o chefe só reage ao que já viu (memória começa vazia);
 *  - a memória vale a luta toda (entre as 3 fases), mas não é salva depois;
 *  - o chefe nunca fica preso: toda área termina em vulnerabilidade, e sempre há janela para respirar.
 */
import type { Fighter } from './Fighter';
import type { CpuController, CpuParams } from './CpuController';
import { CombatMemory, type AttackKind, type GearInfo, type ItemClass } from './combatMemory';
import { newBreath, stepBreath, type BreathEvent, type BreathMods, type BreathState } from '@/game/dive/breath';
import { ITEMS } from '@/game/items/itemDefs';

export type BeastState = 'waiting' | 'observe' | 'direct' | 'area' | 'recover' | 'react' | 'phase' | 'vulnerable' | 'defeated';
export type BeastPhase = 1 | 2 | 3;

export interface BeastEvent {
  /** Chave de tradução do aviso na tela. */
  key: string;
  sfx?: 'charge' | 'encounter' | 'debuff' | 'buff_atk';
}

/** Tudo que se pode ajustar do equilíbrio do chefe. */
export const SEA_TUNING = {
  waitMs: 1500,
  observeMs: 5000,
  phaseObserveMs: 2500,
  phaseMs: 1600,
  chargeMs: 900,
  vulnerableMs: 2600,
  recoverMs: 1800,
  reactMs: 1200,
  /** Fração de vida em que entra cada fase. */
  phaseHp: { 2: 0.66, 3: 0.33 } as Record<2 | 3, number>,
  /** Tempo entre ataques em área (Fase 1, 2, 3). */
  areaCdMs: { 1: 20000, 2: 13000, 3: 8500 } as Record<BeastPhase, number>,
  currentEveryMs: { 2: 9000, 3: 7000 } as Record<2 | 3, number>,
  currentMs: 2600,
  /** Empurrão da correnteza (px/s), igual para os dois lutadores. */
  currentPush: 90,
  vulnerableDmgMult: 1.3,
  /** Dano em 2 s (fração da vida) que faz o chefe se recompor. */
  recoverTrigger: 0.14,
  recoverCooldownMs: 6000,
  basicFloor: 0.7,
  specialFloor: 0.6,
  guardCostMult: 1.35,
  gearDamp: 0.92,
  gearAfterMs: 20000,
} as const;

/** Parâmetros de ataque do CPU por fase. */
const PHASE_PARAMS: Record<BeastPhase, { attackChance: number; ultChance: number; shieldChance: number; reactMin: number; reactMax: number }> = {
  1: { attackChance: 0.55, ultChance: 0.08, shieldChance: 0.18, reactMin: 500, reactMax: 900 },
  2: { attackChance: 0.62, ultChance: 0.15, shieldChance: 0.22, reactMin: 400, reactMax: 800 },
  3: { attackChance: 0.78, ultChance: 0.3, shieldChance: 0.3, reactMin: 300, reactMax: 600 },
};

/** Respostas aprendidas (derivadas só da memória, então são fáceis de testar e de explicar). */
export interface Adaptation {
  /** Multiplica o dano do SUPER do jogador (1 = sem resposta; piso 0,6). */
  specialResist: number;
  /** Multiplica o dano de FLASH/FORTE (piso 0,7: nunca inútil). */
  basicRead: Record<'flash' | 'strong', number>;
  /** Equipamento muito previsível: redução fixa e pequena. */
  gearDamp: number;
  /** Quem vive de buff: o chefe se prepara um pouco. */
  buffDamp: number;
  /** Fração da cura do jogador que ainda vale (piso 0,7). */
  healMult: number;
  /** Fração do dano de bomba que ainda vale (piso 0,7). */
  bombMult: number;
  /** O jogador bloqueia quase tudo: o chefe pressiona a guarda. */
  guardPressure: boolean;
  /** O jogador está para soltar o especial pela terceira vez ou mais: o chefe se prepara. */
  specialReady: boolean;
}

export function adaptationOf(m: CombatMemory, tuning = SEA_TUNING): Adaptation {
  const streak = (k: 'flash' | 'strong') => (m.streakKind === k ? m.streak : 0);
  const read = (k: 'flash' | 'strong') => Math.max(tuning.basicFloor, 1 - Math.min(0.3, 0.04 * Math.max(0, streak(k) - 3)) - (m.spamKind() === k ? 0.05 : 0));
  const uses = (c: ItemClass) => m.itemUses[c];
  return {
    specialResist: Math.max(tuning.specialFloor, 1 - Math.min(0.4, 0.12 * Math.max(0, m.specialUses() - 1))),
    basicRead: { flash: read('flash'), strong: read('strong') },
    gearDamp: m.gearReliant() && m.elapsed >= tuning.gearAfterMs ? tuning.gearDamp : 1,
    buffDamp: uses('buff') >= 4 ? 0.88 : uses('buff') >= 2 ? 0.93 : 1,
    healMult: Math.max(0.7, 1 - Math.min(0.3, 0.1 * Math.max(0, uses('heal') - 1))),
    bombMult: Math.max(0.7, 1 - Math.min(0.3, 0.15 * Math.max(0, uses('offense') - 1))),
    guardPressure: m.blockRate() >= 0.6,
    specialReady: m.specialUses() >= 3,
  };
}

/** Classe do item para a memória (cura, buff, ofensivo). */
export function itemClassOf(id: string): ItemClass {
  const fx = ITEMS[id]?.effects ?? [];
  if (fx.some((e) => e.kind === 'heal')) return 'heal';
  if (fx.some((e) => e.kind === 'bomb')) return 'offense';
  if (fx.some((e) => e.kind !== 'none' && e.kind !== 'energy' && e.kind !== 'breath' && e.kind !== 'breathBuff')) return 'buff';
  return 'other';
}

export interface ItemOutcome {
  /** Pontos de vida a tirar do jogador (cura reduzida). */
  playerRefund: number;
  /** Pontos de vida a devolver ao chefe (bomba reduzida). */
  beastRefund: number;
}

export class SeaBeastBrain {
  state: BeastState = 'waiting';
  phase: BeastPhase = 1;
  stateMs = 0;
  readonly memory = new CombatMemory();
  breath: BreathState;
  /** Debaixo d'água (fase 2 em diante): o fôlego do jogador gasta. */
  submerged = false;
  current: { dir: -1 | 1; msLeft: number } | null = null;

  private events: BeastEvent[] = [];
  private areaCd: number;
  private currentCd = 0;
  private observeLeft = 0;
  private fired = false;
  private firedAt = 0;
  private recoverCd = 0;
  private dmgWindow: { ms: number; dmg: number }[] = [];
  private levels: Record<string, number> = {};
  private pendingReact = false;
  private baseShieldCost: number;
  private pressured = false;
  private defeatedSaid = false;
  private lastBeastHealth: number;

  constructor(
    readonly beast: Fighter,
    readonly player: Fighter,
    private readonly cpu: CpuController,
    private readonly mods: BreathMods,
    private readonly rng: () => number = Math.random,
  ) {
    this.breath = newBreath(mods);
    this.areaCd = SEA_TUNING.areaCdMs[1];
    this.baseShieldCost = player.shieldCost;
    this.lastBeastHealth = beast.health;
    cpu.setDirector((f, o) => this.director(f, o));
    this.say('sea_enter', 'encounter');
  }

  // ---- eventos para a interface ------------------------------------------------------------------------------
  private say(key: string, sfx?: BeastEvent['sfx']) {
    this.events.push({ key, sfx });
  }
  drainEvents(): BeastEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  private setState(s: BeastState) {
    this.state = s;
    this.stateMs = 0;
  }

  adaptation(): Adaptation {
    return adaptationOf(this.memory);
  }

  // ---- observação -------------------------------------------------------------------------------------------
  observeGear(g: GearInfo) {
    this.memory.observeGear(g);
  }

  /** Um golpe acertou (ou foi bloqueado). Chamar DEPOIS de calcular o dano, para a memória não adiantar a resposta. */
  onHit(h: { attacker: 'player' | 'beast'; type: AttackKind; blocked: boolean; dealt: number }) {
    if (h.attacker === 'player') {
      this.memory.recordAttack(h.type);
      if (h.dealt > 0) this.dmgWindow.push({ ms: 0, dmg: h.dealt });
    } else {
      this.memory.recordBeastHit(h.blocked);
    }
    this.announceAdaptations();
  }

  /** O jogador usou um item. Devolve o que corrigir (cura reduzida, bomba reduzida) e registra na memória. */
  onItem(id: string, delta: { playerHealed: number; beastDamaged: number }): ItemOutcome {
    const before = this.adaptation();
    const cls = itemClassOf(id);
    this.memory.recordItem(id, cls);
    const out: ItemOutcome = { playerRefund: 0, beastRefund: 0 };
    if (cls === 'heal' && delta.playerHealed > 0) out.playerRefund = delta.playerHealed * (1 - before.healMult);
    if (cls === 'offense' && delta.beastDamaged > 0) out.beastRefund = delta.beastDamaged * (1 - before.bombMult);
    this.announceAdaptations();
    return out;
  }

  /** Quando uma resposta nova passa a valer, avisa uma vez (e o chefe faz uma pose de reação). */
  private announceAdaptations() {
    const a = this.adaptation();
    const m = this.memory;
    const lv = (key: string, n: number, msg: string, sfx: BeastEvent['sfx']) => {
      if (n > (this.levels[key] ?? 0)) {
        this.levels[key] = n;
        this.say(msg, sfx);
        this.pendingReact = true;
      }
    };
    lv('special', m.specialUses() >= 5 ? 2 : m.specialUses() >= 3 ? 1 : 0, 'sea_adapt_special', 'debuff');
    lv('heal', m.itemUses.heal >= 3 ? 1 : 0, 'sea_adapt_heal', 'debuff');
    lv('buff', m.itemUses.buff >= 3 ? 1 : 0, 'sea_adapt_buff', 'debuff');
    lv('bomb', m.itemUses.offense >= 3 ? 1 : 0, 'sea_adapt_bomb', 'debuff');
    lv('spam', m.spamKind() ? 1 : 0, 'sea_adapt_spam', 'debuff');
    lv('guard', a.guardPressure ? 1 : 0, 'sea_adapt_guard', 'debuff');
    lv('gear', a.gearDamp < 1 ? 1 : 0, 'sea_adapt_gear', 'debuff');
  }

  // ---- dano que o chefe recebe -----------------------------------------------------------------------------
  /** Multiplicador do dano do jogador contra o chefe agora (adaptação + estado). Chamar ANTES de `onHit`. */
  incoming(type: AttackKind): number {
    if (this.state === 'phase' || this.state === 'defeated') return 0;
    const a = this.adaptation();
    let m = type === 'ultimate' ? a.specialResist : a.basicRead[type];
    m *= a.gearDamp * a.buffDamp;
    if (this.state === 'vulnerable') m *= SEA_TUNING.vulnerableDmgMult;
    return m;
  }

  // ---- parâmetros do CPU -----------------------------------------------------------------------------------
  private director(f: Fighter, o: Fighter): Partial<CpuParams> {
    const base = PHASE_PARAMS[this.phase];
    const a = this.adaptation();
    let attackChance = base.attackChance;
    let ultChance = base.ultChance;
    let shieldChance = base.shieldChance;
    // Aprendeu a leitura do jogador: protege-se quando ele está para soltar o especial, e pressiona quem só bloqueia.
    if (a.specialReady && o.energy >= o.maxEnergy * 0.9) shieldChance = Math.min(0.6, shieldChance + 0.25);
    if (this.memory.spamKind()) shieldChance = Math.min(0.6, shieldChance + 0.15);
    if (a.guardPressure) {
      attackChance = Math.min(0.9, attackChance + 0.1);
      ultChance = Math.min(0.6, ultChance + 0.1);
    }
    switch (this.state) {
      case 'waiting':
      case 'phase':
      case 'defeated':
        return { attackChance: 0, ultChance: 0, shieldChance: 0, reactMin: base.reactMin, reactMax: base.reactMax };
      case 'observe':
        return { attackChance: attackChance * 0.6, ultChance: 0, shieldChance, reactMin: base.reactMin * 1.2, reactMax: base.reactMax * 1.2 };
      case 'area':
        return { attackChance: 0, ultChance: 0, shieldChance: 0, reactMin: 200, reactMax: 300 };
      case 'vulnerable':
        return { attackChance: 0.3, ultChance: 0, shieldChance: 0, reactMin: base.reactMin * 1.4, reactMax: base.reactMax * 1.4 };
      case 'recover':
        return { attackChance: 0.2, ultChance: 0, shieldChance: 0.85, reactMin: base.reactMin, reactMax: base.reactMax };
      case 'react':
        return { attackChance: 0.25, ultChance: 0, shieldChance: 0.7, reactMin: base.reactMin, reactMax: base.reactMax };
      default:
        return { attackChance, ultChance, shieldChance, reactMin: base.reactMin, reactMax: base.reactMax };
    }
  }

  // ---- fases ---------------------------------------------------------------------------------------------------
  private enterPhase(to: BeastPhase) {
    while (this.phase < to) {
      this.phase = (this.phase + 1) as BeastPhase;
      this.areaCd = SEA_TUNING.areaCdMs[this.phase];
      this.fired = false;
      if (this.phase === 2) {
        this.beast.enterPhase2(); // o motor já sabe fazer a virada de fase (mais forte, rápido, com rugido)
        this.submerged = true;
        this.breath = newBreath(this.mods);
        this.currentCd = SEA_TUNING.currentEveryMs[2];
        this.say('sea_phase2', 'charge');
      } else {
        this.cpu.enrage();
        this.currentCd = SEA_TUNING.currentEveryMs[3];
        this.say('sea_phase3', 'encounter');
      }
    }
    this.beast.invulnTimer = Math.max(this.beast.invulnTimer, SEA_TUNING.phaseMs);
    this.beast.stopCharge();
    this.setState('phase');
    this.observeLeft = SEA_TUNING.phaseObserveMs;
  }

  // ---- ciclo -------------------------------------------------------------------------------------------------
  update(dtMs: number) {
    this.memory.tick(dtMs);
    this.stateMs += dtMs;
    for (const w of this.dmgWindow) w.ms += dtMs;
    this.dmgWindow = this.dmgWindow.filter((w) => w.ms <= 2000);
    this.recoverCd = Math.max(0, this.recoverCd - dtMs);

    // Pressão na guarda: o escudo do jogador custa mais enquanto ele só bloqueia (volta ao normal depois).
    const a = this.adaptation();
    if (a.guardPressure && !this.pressured) {
      this.pressured = true;
      this.player.shieldCost = this.baseShieldCost * SEA_TUNING.guardCostMult;
    } else if (!a.guardPressure && this.pressured && this.memory.blockRate() < 0.45) {
      this.pressured = false;
      this.player.shieldCost = this.baseShieldCost;
    }

    if (this.beast.isKO) {
      if (!this.defeatedSaid) {
        this.defeatedSaid = true;
        this.setState('defeated');
        this.player.shieldCost = this.baseShieldCost;
        this.say('sea_defeated', 'encounter');
      }
      return;
    }
    if (this.player.isKO) return;

    // fase pela vida
    const frac = this.beast.health / this.beast.maxHealth;
    const want: BeastPhase = frac <= SEA_TUNING.phaseHp[3] ? 3 : frac <= SEA_TUNING.phaseHp[2] ? 2 : 1;
    if (want > this.phase) this.enterPhase(want);

    this.lastBeastHealth = this.beast.health;
    this.hazards(dtMs);

    switch (this.state) {
      case 'waiting':
        if (this.stateMs >= SEA_TUNING.waitMs) {
          this.observeLeft = SEA_TUNING.observeMs;
          this.setState('observe');
        }
        break;
      case 'phase':
        if (this.stateMs >= SEA_TUNING.phaseMs) this.setState('observe');
        break;
      case 'observe':
        this.observeLeft -= dtMs;
        if (this.observeLeft <= 0) this.setState('direct');
        break;
      case 'direct':
        this.areaCd -= dtMs;
        if (this.dmgWindow.reduce((s, w) => s + w.dmg, 0) >= this.beast.maxHealth * SEA_TUNING.recoverTrigger && this.recoverCd <= 0) {
          this.recoverCd = SEA_TUNING.recoverCooldownMs;
          this.setState('recover');
        } else if (this.areaCd <= 0) {
          this.fired = false;
          this.firedAt = 0;
          this.say('sea_area_warn', 'charge');
          this.setState('area');
        } else if (this.pendingReact) {
          this.pendingReact = false;
          this.setState('react');
        }
        break;
      case 'area':
        this.areaStep();
        break;
      case 'vulnerable':
        if (this.stateMs >= SEA_TUNING.vulnerableMs) {
          this.areaCd = SEA_TUNING.areaCdMs[this.phase];
          this.setState('direct');
        }
        break;
      case 'recover':
        if (this.stateMs >= SEA_TUNING.recoverMs) this.setState('direct');
        break;
      case 'react':
        if (this.stateMs >= SEA_TUNING.reactMs) this.setState('direct');
        break;
      default:
        break;
    }
  }

  /** Ataque em área: sinal (carga visível), golpe SUPER e depois o chefe fica exposto. Nunca trava. */
  private areaStep() {
    const b = this.beast;
    const t = this.stateMs;
    if (t < SEA_TUNING.chargeMs) {
      if (b.canAct() && !b.isCharging) b.startCharge();
    } else if (!this.fired) {
      b.stopCharge();
      b.startAttack('ultimate'); // sem energia: o golpe em área é controlado só por este ciclo
      this.fired = true;
      this.firedAt = t;
    } else if ((!b.currentAttack && t - this.firedAt > 500) || t > 5000) {
      this.say('sea_vulnerable', 'buff_atk');
      this.setState('vulnerable');
    }
  }

  // ---- ambiente: correnteza e fôlego ----------------------------------------------------------------------------
  private hazards(dtMs: number) {
    if (this.phase < 2) return;
    if (this.current) {
      const push = (this.current.dir * SEA_TUNING.currentPush * dtMs) / 1000;
      this.player.x += push;
      this.beast.x += push;
      this.current.msLeft -= dtMs;
      if (this.current.msLeft <= 0) this.current = null;
    } else {
      this.currentCd -= dtMs;
      if (this.currentCd <= 0) {
        const dir: -1 | 1 = this.rng() < 0.5 ? -1 : 1;
        this.current = { dir, msLeft: SEA_TUNING.currentMs };
        this.currentCd = SEA_TUNING.currentEveryMs[this.phase === 3 ? 3 : 2];
        this.say(dir < 0 ? 'sea_current_left' : 'sea_current_right');
      }
    }
  }

  /**
   * Fôlego do jogador na luta: gasta debaixo d'água (fase 2 em diante) e volta quando o chefe sobe (vulnerável).
   * Devolve o dano (em fração da vida máxima) e a fonte, para quem chamou aplicar e registrar a causa da morte.
   */
  tickBreath(dtMs: number, mods: BreathMods = this.mods): { damageFrac: number; hazard: 'drowning' | 'pressure' | null; events: BreathEvent[] } {
    if (!this.submerged || this.beast.isKO || this.player.isKO) return { damageFrac: 0, hazard: null, events: [] };
    const step = stepBreath(this.breath, dtMs, { submerged: true, breathable: this.state === 'vulnerable', deep: this.phase === 3, mods });
    this.breath = step.state;
    for (const e of step.events) {
      if (e === 'low') this.say('sea_breath_low');
      else if (e === 'empty') this.say('sea_breath_empty');
    }
    return { damageFrac: step.damageFrac, hazard: step.hazard, events: step.events };
  }
}
