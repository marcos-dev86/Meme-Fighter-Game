/**
 * Efeitos visuais de impacto da luta (game feel): partículas de contato, flash
 * de impacto, números de dano e tremor da arena.
 *
 * É um módulo PURO (sem React, sem estado do jogo): o BattleScreen guarda um
 * `FxState` numa ref, chama `spawnImpact` / `spawnDamageNumber` quando um golpe
 * acerta e `stepFx` uma vez por quadro do loop de jogo. Como o loop já pausa
 * sozinho, os efeitos congelam junto com a luta.
 *
 * Leveza (Android de entrada): tudo tem TETO (MAX_PARTICLES / MAX_NUMBERS), o
 * "modo leve" das opções corta as partículas e o tremor pela metade, e nada
 * aqui aloca objetos por quadro além dos efeitos recém-criados.
 *
 * Nada disto atrasa comandos, animações ou golpes: os efeitos só são CRIADOS
 * depois que o acerto já foi resolvido, e só desenham.
 */

export type HitKind = 'normal' | 'strong' | 'crit' | 'ult' | 'block';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // ms restantes
  maxLife: number;
  color: string; // 'r,g,b'
  /** Diâmetro inicial (px da arena). */
  size: number;
  /** Diâmetro final = size × grow (faíscas encolhem, o flash de impacto cresce). */
  grow: number;
  /** Aceleração vertical (px por quadro de 60 fps). */
  gravity: number;
}

export interface DamageNumber {
  id: number;
  x: number; // centro
  y: number; // base inicial
  text: string;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  kind: HitKind;
  /** Quem levou o golpe (usado para não empilhar números no mesmo ponto). */
  targetKey: string;
  /** Texto extra acima do número (ex.: CRÍTICO!), já traduzido por quem chama. */
  label?: string;
}

export interface FxState {
  particles: Particle[];
  numbers: DamageNumber[];
  shakeAmp: number;
  shakeLife: number;
  shakeMax: number;
  nextId: number;
}

export const MAX_PARTICLES = 56;
export const MAX_PARTICLES_LIGHT = 28;
export const MAX_NUMBERS = 8;
/** Quanto o número de dano sobe até sumir (px da arena). */
export const NUMBER_RISE_PX = 56;
export const SHAKE_MS = 140;

export interface KindStyle {
  sparks: number;
  sparkSpeed: number;
  sparkColor: string;
  flashColor: string;
  /** Diâmetro final do flash de impacto. */
  flashSize: number;
  flashMs: number;
  /** Amplitude do tremor da arena (px). 0 = sem tremor. */
  shake: number;
  /** Potência da reação visual (recuo/amassado) do atingido. */
  react: number;
  /** Multiplicador do tamanho do número de dano. */
  numScale: number;
  numColor: string;
  numLife: number;
}

/**
 * Intensidade crescente: golpe comum < FORTE < crítico < SUPER. O bloqueio é
 * discreto de propósito. As cores seguem as que a luta já usava.
 */
export const KIND_STYLE: Record<HitKind, KindStyle> = {
  normal: { sparks: 6, sparkSpeed: 3, sparkColor: '255,225,90', flashColor: '255,255,255', flashSize: 52, flashMs: 90, shake: 0, react: 0.7, numScale: 1, numColor: '#ff4545', numLife: 900 },
  strong: { sparks: 10, sparkSpeed: 4.2, sparkColor: '255,170,60', flashColor: '255,236,170', flashSize: 84, flashMs: 110, shake: 3, react: 1.1, numScale: 1.2, numColor: '#ff3030', numLife: 950 },
  crit: { sparks: 14, sparkSpeed: 5.2, sparkColor: '255,70,70', flashColor: '255,214,70', flashSize: 118, flashMs: 130, shake: 5, react: 1.4, numScale: 1.45, numColor: '#ff1f1f', numLife: 1150 },
  ult: { sparks: 16, sparkSpeed: 5.8, sparkColor: '255,140,30', flashColor: '255,190,90', flashSize: 150, flashMs: 150, shake: 7, react: 1.6, numScale: 1.35, numColor: '#ff2a2a', numLife: 1100 },
  block: { sparks: 5, sparkSpeed: 2.6, sparkColor: '90,205,255', flashColor: '150,225,255', flashSize: 60, flashMs: 90, shake: 0, react: 0.4, numScale: 0.8, numColor: '#c94c4c', numLife: 800 },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function createFx(): FxState {
  return { particles: [], numbers: [], shakeAmp: 0, shakeLife: 0, shakeMax: SHAKE_MS, nextId: 1 };
}

/** Zera tudo (começo de round / revanche), sem recriar o objeto. */
export function clearFx(fx: FxState) {
  fx.particles.length = 0;
  fx.numbers.length = 0;
  fx.shakeAmp = 0;
  fx.shakeLife = 0;
}

/** Qual é o tipo do golpe, para escolher a intensidade dos efeitos. */
export function hitKindOf(opts: { blocked: boolean; ultimate: boolean; crit: boolean; strong: boolean }): HitKind {
  if (opts.blocked) return 'block';
  if (opts.ultimate) return 'ult';
  if (opts.crit) return 'crit';
  if (opts.strong) return 'strong';
  return 'normal';
}

function pushParticle(fx: FxState, p: Particle, light: boolean) {
  const cap = light ? MAX_PARTICLES_LIGHT : MAX_PARTICLES;
  if (fx.particles.length >= cap) fx.particles.splice(0, fx.particles.length - cap + 1); // descarta as mais antigas
  fx.particles.push(p);
}

/**
 * Contato de um golpe: um flash de impacto + faíscas jogadas na direção do
 * golpe (`dir` = lado para onde o atacante bate: 1 = direita, -1 = esquerda).
 */
export function spawnImpact(fx: FxState, o: { x: number; y: number; dir: 1 | -1; kind: HitKind; light?: boolean; rng?: () => number }) {
  const rng = o.rng ?? Math.random;
  const light = !!o.light;
  const s = KIND_STYLE[o.kind];

  // Flash de impacto: disco que cresce e some bem rápido.
  pushParticle(fx, { x: o.x, y: o.y, vx: 0, vy: 0, life: s.flashMs, maxLife: s.flashMs, color: s.flashColor, size: s.flashSize * 0.4, grow: 2.5, gravity: 0 }, light);

  const count = light ? Math.max(3, Math.ceil(s.sparks / 2)) : s.sparks;
  const base = o.dir > 0 ? 0 : Math.PI;
  for (let i = 0; i < count; i++) {
    // 70% das faíscas saem num cone (±70°) na direção do golpe; o resto espirra para todo lado.
    const cone = rng() < 0.7;
    const a = cone ? base + (rng() * 2 - 1) * (Math.PI * 0.39) : rng() * Math.PI * 2;
    const sp = s.sparkSpeed * (0.6 + rng() * 0.8);
    const life = 260 + rng() * 120;
    pushParticle(fx, { x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6, life, maxLife: life, color: s.sparkColor, size: 6, grow: 0.4, gravity: 0.12 }, light);
  }

  const amp = s.shake * (light ? 0.5 : 1);
  if (amp > 0) {
    fx.shakeAmp = Math.max(fx.shakeAmp * (fx.shakeLife / fx.shakeMax), amp);
    fx.shakeLife = SHAKE_MS;
    fx.shakeMax = SHAKE_MS;
  }
}

/**
 * Anel de partículas (status aplicado, rugido de chefe na fase 2). Usa os mesmos
 * tetos das faíscas de contato, então nunca estoura o limite de partículas.
 */
export function spawnBurst(fx: FxState, o: { x: number; y: number; count: number; speed: number; life: number; color: string; vyBias?: number; light?: boolean }) {
  const light = !!o.light;
  const count = light ? Math.max(3, Math.ceil(o.count / 2)) : o.count;
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count;
    pushParticle(fx, { x: o.x, y: o.y, vx: Math.cos(a) * o.speed, vy: Math.sin(a) * o.speed + (o.vyBias ?? 0), life: o.life, maxLife: o.life, color: o.color, size: 8, grow: 0.5, gravity: 0 }, light);
  }
}

/** Tamanho do texto do número de dano: cresce com o dano e com a intensidade do golpe. */
export function damageNumberSize(damage: number, kind: HitKind): number {
  const base = 20 + Math.min(damage, 40) * 0.7;
  return clamp(base * KIND_STYLE[kind].numScale, 18, 60);
}

/**
 * Número de dano vermelho que sobe e some. Números seguidos no mesmo alvo não
 * ficam exatamente sobrepostos: cada um ainda "vivo" empurra o novo um pouco
 * para cima e alterna o lado.
 */
export function spawnDamageNumber(fx: FxState, o: { x: number; y: number; damage: number; kind: HitKind; targetKey: string; label?: string; rng?: () => number }) {
  const rng = o.rng ?? Math.random;
  const s = KIND_STYLE[o.kind];
  const recent = fx.numbers.filter((n) => n.targetKey === o.targetKey && n.maxLife - n.life < 350).length;
  const side = recent % 2 === 0 ? -1 : 1;
  const dx = side * (10 + rng() * 14) + (rng() - 0.5) * 8;
  const dy = -Math.min(recent, 3) * 22;
  if (fx.numbers.length >= MAX_NUMBERS) fx.numbers.splice(0, fx.numbers.length - MAX_NUMBERS + 1);
  fx.numbers.push({
    id: fx.nextId++,
    x: o.x + dx,
    y: o.y + dy,
    text: String(Math.max(1, Math.round(o.damage))),
    size: damageNumberSize(o.damage, o.kind),
    color: s.numColor,
    life: s.numLife,
    maxLife: s.numLife,
    kind: o.kind,
    targetKey: o.targetKey,
    label: o.label,
  });
}

/** Avança partículas, números e tremor. `dt` em ms; `frameScale` = dt / (1000/60). */
export function stepFx(fx: FxState, dt: number, frameScale: number) {
  const ps = fx.particles;
  if (ps.length > 0) {
    let w = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.x += p.vx * frameScale;
      p.y += p.vy * frameScale;
      p.vy += p.gravity * frameScale;
      p.life -= dt;
      if (p.life > 0) ps[w++] = p;
    }
    ps.length = w;
  }
  const ns = fx.numbers;
  if (ns.length > 0) {
    let w = 0;
    for (let i = 0; i < ns.length; i++) {
      const n = ns[i];
      n.life -= dt;
      if (n.life > 0) ns[w++] = n;
    }
    ns.length = w;
  }
  if (fx.shakeLife > 0) {
    fx.shakeLife -= dt;
    if (fx.shakeLife <= 0) {
      fx.shakeLife = 0;
      fx.shakeAmp = 0;
    }
  }
}

/** Aparência de um número de dano no instante atual: sobe com desaceleração, "estoura" no começo e some no fim. */
export function numberVisual(n: DamageNumber): { dy: number; opacity: number; scale: number } {
  const p = clamp(1 - n.life / n.maxLife, 0, 1);
  const dy = -(1 - (1 - p) * (1 - p)) * NUMBER_RISE_PX;
  const opacity = p < 0.55 ? 1 : clamp(1 - (p - 0.55) / 0.45, 0, 1);
  const scale = p < 0.12 ? 0.55 + (p / 0.12) * 0.75 : p < 0.25 ? 1.3 - ((p - 0.12) / 0.13) * 0.3 : 1;
  return { dy, opacity, scale };
}

/** Diâmetro e opacidade de uma partícula agora. */
export function particleVisual(p: Particle): { size: number; alpha: number } {
  const t = clamp(1 - p.life / p.maxLife, 0, 1);
  return { size: p.size * (1 + (p.grow - 1) * t), alpha: clamp(p.life / p.maxLife, 0, 1) };
}

/** Deslocamento do tremor da arena neste quadro (0,0 quando não há tremor). */
export function shakeOffset(fx: FxState, rng: () => number = Math.random): { x: number; y: number } {
  if (fx.shakeLife <= 0 || fx.shakeAmp <= 0) return { x: 0, y: 0 };
  const k = (fx.shakeLife / fx.shakeMax) * fx.shakeAmp;
  return { x: (rng() * 2 - 1) * k, y: (rng() * 2 - 1) * k };
}

/** Recuo (px, com sinal) e amassado (escala X/Y) do sprite atingido, a partir do quanto da reação ainda resta. */
export function reactionVisual(power: number, timer: number, dur: number, dir: 1 | -1): { shiftX: number; scaleX: number; scaleY: number } {
  if (timer <= 0 || power <= 0 || dur <= 0) return { shiftX: 0, scaleX: 1, scaleY: 1 };
  const r = clamp(timer / dur, 0, 1);
  return { shiftX: dir * power * 14 * r, scaleX: 1 + 0.04 * power * r, scaleY: 1 - 0.055 * power * r };
}
