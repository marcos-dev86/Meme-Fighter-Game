/**
 * FÔLEGO E AFOGAMENTO (núcleo puro: sem React nem armazenamento, para testar no Node e para uma futura sincronização).
 *
 * O jogador tem um medidor de fôlego em SEGUNDOS de ar. Debaixo d'água ele gasta; em lugar respirável (superfície ou
 * bolsão de ar) ele recupera. Com o fôlego em zero começa o AFOGAMENTO: dano periódico (a cada `drownIntervalMs`, nunca por
 * quadro) até voltar a respirar ou morrer. Na zona profunda sem equipamento de pressão há dano de PRESSÃO, também periódico.
 * Tudo configurável em `BREATH_CONFIG`. Fôlego infinito (equipamento) nunca gasta e nunca afoga.
 */
export interface BreathConfig {
  /** Segundos de ar sem equipamento nenhum. */
  baseMaxSec: number;
  /** Segundos gastos por segundo submerso. */
  drainPerSec: number;
  /** Segundos recuperados por segundo em lugar respirável. */
  regenPerSec: number;
  /** Abaixo dessa fração do máximo vem o aviso de fôlego baixo. */
  lowFrac: number;
  /** Intervalo entre danos do afogamento. */
  drownIntervalMs: number;
  /** Dano de cada tique do afogamento, em fração da vida máxima. */
  drownDamageFrac: number;
  pressureIntervalMs: number;
  pressureDamageFrac: number;
}

export const BREATH_CONFIG: BreathConfig = {
  baseMaxSec: 24,
  drainPerSec: 1,
  regenPerSec: 9,
  lowFrac: 0.3,
  drownIntervalMs: 1500,
  drownDamageFrac: 0.06,
  pressureIntervalMs: 2000,
  pressureDamageFrac: 0.05,
};

/** Efeitos de equipamento e consumíveis sobre o fôlego. */
export interface BreathMods {
  /** Segundos de ar a mais. */
  capacitySec: number;
  /** Multiplica o gasto (0,8 = gasta 20% menos). */
  drainMult: number;
  /** Multiplica a recuperação. */
  regenMult: number;
  /** Fôlego infinito enquanto estiver ativo. */
  infinite: boolean;
  /** Protege da pressão das profundezas. */
  pressureSafe: boolean;
}

export const NO_BREATH_MODS: BreathMods = { capacitySec: 0, drainMult: 1, regenMult: 1, infinite: false, pressureSafe: false };

/** Junta duas fontes de efeito (equipamento + elixir): capacidade soma, multiplicadores multiplicam, flags valem se uma tiver. */
export function combineMods(a: Partial<BreathMods> | undefined, b: Partial<BreathMods> | undefined): BreathMods {
  const x = { ...NO_BREATH_MODS, ...a };
  const y = { ...NO_BREATH_MODS, ...b };
  return {
    capacitySec: x.capacitySec + y.capacitySec,
    drainMult: x.drainMult * y.drainMult,
    regenMult: x.regenMult * y.regenMult,
    infinite: x.infinite || y.infinite,
    pressureSafe: x.pressureSafe || y.pressureSafe,
  };
}

export function breathMax(mods: BreathMods, cfg: BreathConfig = BREATH_CONFIG): number {
  return cfg.baseMaxSec + Math.max(0, mods.capacitySec);
}

export interface BreathState {
  sec: number;
  /** Tempo acumulado até o próximo tique do afogamento. */
  drownMs: number;
  pressureMs: number;
  /** Já avisou "fôlego baixo" neste mergulho. */
  lowWarned: boolean;
  /** Fôlego zerado (afogando). */
  empty: boolean;
}

export function newBreath(mods: BreathMods = NO_BREATH_MODS, cfg: BreathConfig = BREATH_CONFIG): BreathState {
  return { sec: breathMax(mods, cfg), drownMs: 0, pressureMs: 0, lowWarned: false, empty: false };
}

export type BreathEvent = 'low' | 'empty' | 'drown' | 'pressure' | 'recovered';

export interface BreathContext {
  /** Está debaixo d'água. */
  submerged: boolean;
  /** Está num bolsão de ar ou na saída para a superfície (respirável). */
  breathable: boolean;
  /** Está na zona profunda (pressão). */
  deep: boolean;
  mods: BreathMods;
}

export interface BreathStep {
  state: BreathState;
  events: BreathEvent[];
  /** Dano total deste passo, em fração da vida máxima (0 quando não há). */
  damageFrac: number;
  /** Fonte do dano deste passo, para o aviso de morte. */
  hazard: 'drowning' | 'pressure' | null;
}

/** Avança o fôlego `dtMs`. Função pura: devolve um estado novo. */
export function stepBreath(prev: BreathState, dtMs: number, ctx: BreathContext, cfg: BreathConfig = BREATH_CONFIG): BreathStep {
  const events: BreathEvent[] = [];
  const max = breathMax(ctx.mods, cfg);
  const s: BreathState = { ...prev, sec: Math.min(prev.sec, max) };
  let damageFrac = 0;
  let hazard: BreathStep['hazard'] = null;
  const dt = Math.max(0, dtMs);

  // Pressão: só no fundo, submerso e sem proteção.
  if (ctx.submerged && !ctx.breathable && ctx.deep && !ctx.mods.pressureSafe) {
    s.pressureMs += dt;
    while (s.pressureMs >= cfg.pressureIntervalMs) {
      s.pressureMs -= cfg.pressureIntervalMs;
      events.push('pressure');
      damageFrac += cfg.pressureDamageFrac;
      hazard = 'pressure';
    }
  } else s.pressureMs = 0;

  if (ctx.mods.infinite) {
    // Fôlego infinito: sempre cheio, nunca afoga (outros perigos continuam valendo).
    if (s.empty) events.push('recovered');
    return { state: { ...s, sec: max, drownMs: 0, empty: false, lowWarned: false }, events, damageFrac, hazard };
  }

  if (!ctx.submerged || ctx.breathable) {
    const wasBad = s.empty;
    s.sec = Math.min(max, s.sec + (cfg.regenPerSec * ctx.mods.regenMult * dt) / 1000);
    s.drownMs = 0;
    if (wasBad) {
      s.empty = false;
      events.push('recovered');
    }
    // Rearma o aviso só depois de recuperar bem (evita aviso piscando na borda do limiar).
    if (s.sec > max * Math.min(0.9, cfg.lowFrac * 2)) s.lowWarned = false;
    return { state: s, events, damageFrac, hazard };
  }

  s.sec = Math.max(0, s.sec - (cfg.drainPerSec * ctx.mods.drainMult * dt) / 1000);
  if (!s.lowWarned && s.sec > 0 && s.sec <= max * cfg.lowFrac) {
    s.lowWarned = true;
    events.push('low');
  }
  if (s.sec <= 0) {
    if (!s.empty) {
      s.empty = true;
      s.drownMs = 0; // aviso "sem fôlego" antes do primeiro dano: um tique inteiro de tolerância
      events.push('empty');
    } else {
      s.drownMs += dt;
      while (s.drownMs >= cfg.drownIntervalMs) {
        s.drownMs -= cfg.drownIntervalMs;
        events.push('drown');
        damageFrac += cfg.drownDamageFrac;
        hazard = 'drowning';
      }
    }
  }
  return { state: s, events, damageFrac, hazard };
}

/** Aplica um dano em fração da vida máxima. Devolve a vida nova e se zerou. Nunca passa de 0. */
export function applyDamageFrac(health: number, maxHealth: number, frac: number): { health: number; ko: boolean } {
  const h = Math.max(0, health - maxHealth * frac);
  return { health: h, ko: h <= 0 };
}

/** Aviso de interface para o estado do fôlego. */
export type BreathLevel = 'ok' | 'low' | 'empty' | 'infinite';
export function breathLevel(s: BreathState, mods: BreathMods, cfg: BreathConfig = BREATH_CONFIG): BreathLevel {
  if (mods.infinite) return 'infinite';
  if (s.empty) return 'empty';
  return s.sec <= breathMax(mods, cfg) * cfg.lowFrac ? 'low' : 'ok';
}

/** Segundos de ar necessários para nadar `seconds` sem respirar, com esse equipamento (para planejar travessias). */
export function airNeeded(seconds: number, mods: BreathMods, cfg: BreathConfig = BREATH_CONFIG): number {
  return mods.infinite ? 0 : seconds * cfg.drainPerSec * mods.drainMult;
}
