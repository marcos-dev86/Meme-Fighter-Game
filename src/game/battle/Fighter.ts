import type { IconName } from '@/game/ui/iconRegistry';
/**
 * Faithful port of legacy/battle-web/src/fighters/fighter.js. Same
 * fields, same method names/signatures where TypeScript allows, same
 * exact numbers. Rendering (draw() in the original) lives in
 * BattleScreen.tsx instead, since RN has no canvas context: everything
 * else here is a direct translation, including things the first pass
 * missed: jump/gravity, canAct() excluding shield/dash, hitboxes computed
 * from the hurtbox edge, and ultimate using the dash pose.
 */

export type FighterState = 'idle' | 'walk' | 'dash' | 'flash' | 'strong' | 'shield' | 'charge' | 'hurt' | 'ko';
import { BASE_CRIT_CHANCE, BASE_CRIT_MULT } from './damageRoll';
export type AttackType = 'flash' | 'strong' | 'ultimate';
export type AttackPhase = 'startup' | 'active' | 'recovery';
export type CharacterKey = 'dogge' | 'gadigago' | 'orc' | 'soldier' | 'dogking' | 'tank' | 'ninja' | 'mystic' | 'ice_dragon' | 'green_dragon' | 'shadow_dragon' | 'cara_tranquilo' | 'troll_face' | 'tocao' | 'serafim' | 'capiroto';

/** Battle status effects (see Fighter.applyStatus). */
export type StatusKind = 'burn' | 'freeze' | 'poison' | 'stun';
export const STATUS_KINDS: StatusKind[] = ['burn', 'freeze', 'poison', 'stun'];
export const STATUS_ICON: Record<StatusKind, IconName> = { burn: 'fire', freeze: 'snow', poison: 'poison', stun: 'star' };
export const STATUS_COLOR: Record<StatusKind, string> = { burn: '255,120,30', freeze: '110,200,255', poison: '120,220,80', stun: '255,230,90' };
/** Damage per second of the damage-over-time statuses. */
const DOT_PER_SEC: Partial<Record<StatusKind, number>> = { burn: 4.5, poison: 2.4 };
/** Walk speed multiplier while frozen. */
const FREEZE_SPEED = 0.45;

/** A chance to inflict a status when an attack of one of these types lands. */
export interface StatusProc {
  kind: StatusKind;
  chance: number; // 0..1
  ms: number;
  on: AttackType[];
  /** De onde vem (ex.: 'gear' = arma equipada). Serve para não adicionar o mesmo proc duas vezes. */
  src?: string;
}

/** Duração do flash branco quando o lutador leva um golpe (ms). Só aparência. */
export const HIT_FLASH_MS = 130;
/** Duração do recuo/amassado visual de reação (ms). Só aparência. */
export const HIT_REACT_MS = 170;

export interface AttackDef {
  startup: number;
  active: number;
  recovery: number;
  range: number;
  damageKey: 'flashDamage' | 'strongDamage' | 'ultimateDamage';
  energyGain: number;
}

export interface CurrentAttack {
  type: AttackType;
  phase: AttackPhase;
  timer: number;
  hasHit: boolean;
}

export interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const GRAVITY = 0.8;

const ATTACK_DEFS: Record<AttackType, AttackDef> = {
  flash: { startup: 90, active: 110, recovery: 170, range: 75, damageKey: 'flashDamage', energyGain: 8 },
  strong: { startup: 210, active: 140, recovery: 380, range: 95, damageKey: 'strongDamage', energyGain: 14 },
  ultimate: { startup: 300, active: 180, recovery: 450, range: 130, damageKey: 'ultimateDamage', energyGain: 0 },
};

// state -> sprite pose keys, matching this.animations in the original
const ANIMATIONS: Record<FighterState, string[]> = {
  idle: ['idle'],
  walk: ['walk1', 'walk2', 'walk3'],
  dash: ['dash'],
  flash: ['flash'],
  strong: ['strong'],
  shield: ['idle'],
  hurt: ['idle'],
  ko: ['idle'],
  // No dedicated pose art for this (same as hurt/ko above) - the visual
  // is the AuraEffect glow layered on top in BattleScreen/WorldScreen,
  // not a sprite swap.
  charge: ['idle'],
};

const WALK4_FRAMES = ['walk1', 'walk2', 'walk3', 'walk4'];
const WALK4_FIGHTERS = new Set<CharacterKey>(['tocao', 'serafim', 'capiroto']);

export class Fighter {
  name: string;
  characterKey: CharacterKey;

  state: FighterState = 'idle';
  frameIndex = 0;
  frameTimer = 0;
  frameDuration = 120;

  x = 0;
  y = 0;
  groundY = 0;
  vy = 0;
  isGrounded = true;
  facing: 1 | -1 = 1;

  drawWidth = 160;
  ultEffectWidth = this.drawWidth * 0.85;
  /** width/height of the idle sprite: used as the stable reference height (see getReferenceHeight). Set by createFighter(). */
  idleAspect = 1;

  health = 100;
  maxHealth = 100;
  energy = 0;
  maxEnergy = 100;
  roundsWon = 0;
  isKO = false;

  speed = 4;
  dashSpeed = 16;
  dashDuration = 180;
  dashCooldown = 260;
  jumpPower = 15;

  strongDamage = 15;
  flashDamage = 10;
  ultimateDamage = 30;

  /** Pre-battle item buffs apply here (see playerState.ts's pendingBuffs
   * + BattleScreen's fighter setup) - 1 = no change. Kept as plain
   * multiplier fields rather than a special "buffed" state so every other
   * system (damage calc, shield, takeHit) just works unmodified. */
  damageTakenMult = 1;

  isShielding = false;
  shieldCost = 20; // mutable: the shield_charm item buff reduces this per-fighter (see BattleScreen)
  readonly shieldReduction = 0.8;

  /** "Farmar aura": hold a button to charge energy fast, in exchange for
   * being unable to do anything else - same mutual-exclusion shape as
   * shield (see canAct()). Replaces the old always-on passive regen (see
   * update()) - see docs/AUDIT.md. */
  isCharging = false;
  chargeRate = 0.09; // energy/ms - a full bar in ~1.1s of holding. Mutable: the aura upgrade (upgrades.ts) scales this per-fighter.

  /** Status effects: milliseconds remaining per kind (see applyStatus). */
  status: Partial<Record<StatusKind, number>> = {};
  /** Statuses this fighter can never get (a frost dragon doesn't freeze). */
  immune: StatusKind[] = [];
  /** Shortens every status that lands on this fighter (bosses: 0.5). */
  statusDurationMult = 1;
  /** Statuses this fighter inflicts with its attacks. */
  onHitStatus: StatusProc[] = [];
  /** Boss phases: at 50% health the fighter changes pattern once (see enterPhase2). */
  hasPhases = false;
  phase = 1;
  /** Brief invulnerability (phase change). */
  invulnTimer = 0;
  /** Extra values set by the skill tree. */
  statusChanceMult = 1;
  energyGainMult = 1;
  regenPerSec = 0;
  /** Árvore de habilidades (Parte 36): crítico, roubo de vida, bônus contra alvo com status e energia inicial. */
  critChance = BASE_CRIT_CHANCE;
  critMult = BASE_CRIT_MULT;
  /** Fração do dano causado que volta como vida (0.05 = 5%). */
  lifesteal = 0;
  /** Multiplicador de dano contra alvos com algum status (queimar, congelar, envenenar, atordoar). */
  statusTargetDmgMult = 1;
  /** Energia com a qual cada round começa. */
  startEnergy = 0;

  /**
   * Feedback visual de golpe recebido. SÓ APARÊNCIA: nada disto altera posição,
   * hitbox, dano ou estados; o BattleScreen apenas lê para desenhar.
   * - hitFlashTimer/hitFlashPower: o flash branco do sprite (ms restantes / intensidade 0..1).
   * - reactTimer/reactDur/reactPower/reactDir: recuo e "amassado" do sprite, para longe de quem bateu.
   */
  hitFlashTimer = 0;
  hitFlashPower = 1;
  reactTimer = 0;
  reactDur = HIT_REACT_MS;
  reactPower = 0;
  reactDir: 1 | -1 = 1;

  currentAttack: CurrentAttack | null = null;
  hitstunTimer = 0;
  dashTimer = 0;
  dashCooldownTimer = 0;
  dashDir: 1 | -1 = 1;

  constructor(name: string, characterKey: CharacterKey) {
    this.name = name;
    this.characterKey = characterKey;
  }

  setState(next: FighterState) {
    if (this.state === next) return;
    this.state = next;
    this.frameIndex = 0;
    this.frameTimer = 0;
  }

  /** Stable height used for hurtbox/ground/camera: based on the idle sprite's own proportions, not whatever frame is currently showing. */
  getReferenceHeight(): number {
    return this.drawWidth / this.idleAspect;
  }

  canAct(): boolean {
    return !this.isKO && !this.isShielding && !this.isCharging && this.hitstunTimer <= 0 && !this.currentAttack && this.dashTimer <= 0 && !this.hasStatus('stun');
  }

  canDash(): boolean {
    return this.canAct() && this.isGrounded && this.dashCooldownTimer <= 0 && !this.hasStatus('freeze');
  }

  walk(dir: number, frameScale: number) {
    if (!this.canAct() || dir === 0) return;
    this.x += dir * this.speed * (this.hasStatus('freeze') ? FREEZE_SPEED : 1) * frameScale;
    this.facing = dir > 0 ? 1 : -1;
    this.setState('walk');
  }

  jump(): boolean {
    if (!this.canAct() || !this.isGrounded) return false;
    this.vy = -this.jumpPower;
    this.isGrounded = false;
    return true;
  }

  startDash(direction: 1 | -1): boolean {
    if (!this.canDash()) return false;
    this.dashTimer = this.dashDuration;
    this.dashCooldownTimer = this.dashCooldown;
    this.dashDir = direction;
    this.setState('dash');
    return true;
  }

  startAttack(type: AttackType): boolean {
    if (!this.canAct()) return false;
    const def = ATTACK_DEFS[type];
    if (!def) return false;

    if (type === 'ultimate') {
      if (this.energy < this.maxEnergy) return false;
      this.energy = 0;
    }

    this.currentAttack = { type, phase: 'startup', timer: 0, hasHit: false };
    // Ultimate reuses the DASH pose (character stands still): the ult
    // effect sprite is drawn on top separately, it isn't the character's
    // own animation.
    this.setState(type === 'ultimate' ? 'dash' : type);
    return true;
  }

  gainEnergy(amount: number) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  startShield() {
    if (this.isShielding) return;
    if (!this.canAct()) return;
    this.isShielding = true;
    this.setState('shield');
  }

  stopShield() {
    if (!this.isShielding) return;
    this.isShielding = false;
    if (!this.isKO && this.hitstunTimer <= 0) this.setState('idle');
  }

  startCharge() {
    if (this.isCharging) return;
    if (!this.canAct()) return;
    this.isCharging = true;
    this.setState('charge');
  }

  stopCharge() {
    if (!this.isCharging) return;
    this.isCharging = false;
    if (!this.isKO && this.hitstunTimer <= 0) this.setState('idle');
  }

  takeHit(damage: number) {
    if (this.isKO || this.invulnTimer > 0) return;

    const blocked = this.isShielding && this.energy >= this.shieldCost;
    let finalDamage = damage;

    // Flash branco do sprite (mais fraco quando o golpe foi bloqueado). Só visual.
    this.hitFlashTimer = HIT_FLASH_MS;
    this.hitFlashPower = blocked ? 0.45 : 1;

    if (blocked) {
      finalDamage = damage * (1 - this.shieldReduction);
      this.energy -= this.shieldCost;
      this.hitstunTimer = 120;
    } else {
      this.currentAttack = null;
      this.dashTimer = 0;
      this.isCharging = false;
      this.hitstunTimer = 220 + damage * 12;
      this.setState('hurt');
    }

    this.health = Math.max(0, this.health - finalDamage * this.damageTakenMult);
    if (this.health <= 0) {
      this.isKO = true;
      this.setState('ko');
    }
  }

  /** Faz andar só os timers de aparência (flash branco e recuo). Não mexe em nenhuma regra de luta: pode rodar mesmo com a simulação parada. */
  tickVisuals(dt: number) {
    if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    if (this.reactTimer > 0) this.reactTimer = Math.max(0, this.reactTimer - dt);
  }

  /** Liga o recuo/amassado visual (power ~0.4..1.6) empurrando o sprite na direção `dir` (para longe de quem bateu). */
  triggerReaction(power: number, dir: 1 | -1) {
    this.reactPower = power;
    this.reactDir = dir;
    this.reactDur = HIT_REACT_MS;
    this.reactTimer = HIT_REACT_MS;
  }

  hasStatus(kind: StatusKind): boolean {
    return (this.status[kind] ?? 0) > 0;
  }

  /** Inflicts a status for `ms` (keeps the longer one). Returns false if immune or already KO. */
  applyStatus(kind: StatusKind, ms: number): boolean {
    if (this.isKO || this.immune.includes(kind)) return false;
    const dur = ms * this.statusDurationMult;
    this.status[kind] = Math.max(this.status[kind] ?? 0, dur);
    if (kind === 'stun') {
      // A stun interrupts whatever the fighter was doing.
      this.currentAttack = null;
      this.dashTimer = 0;
      this.isCharging = false;
      this.isShielding = false;
      this.setState('idle');
    }
    return true;
  }

  clearStatus() {
    this.status = {};
  }

  /** Tem algum status ativo (queimar, congelar, envenenar ou atordoar)? */
  hasAnyStatus(): boolean {
    return (Object.values(this.status) as (number | undefined)[]).some((v) => (v ?? 0) > 0);
  }

  /** Procs this fighter's attack of `type` should roll against a target that was actually hit. */
  rollStatusProcs(type: AttackType): StatusProc[] {
    const out: StatusProc[] = [];
    for (const p of this.onHitStatus) if (p.on.includes(type) && Math.random() < Math.min(1, p.chance * this.statusChanceMult)) out.push(p);
    return out;
  }

  /** Boss phase 2: faster, harder, more status, full energy for an immediate ultimate. */
  private phase1Stats: { strong: number; flash: number; ult: number; speed: number; dash: number; procs: StatusProc[] } | null = null;

  enterPhase2() {
    if (this.phase >= 2) return;
    this.phase = 2;
    this.phase1Stats = { strong: this.strongDamage, flash: this.flashDamage, ult: this.ultimateDamage, speed: this.speed, dash: this.dashSpeed, procs: this.onHitStatus };
    this.strongDamage *= 1.25;
    this.flashDamage *= 1.25;
    this.ultimateDamage *= 1.2;
    this.speed *= 1.2;
    this.dashSpeed *= 1.1;
    this.onHitStatus = this.onHitStatus.map((p) => ({ ...p, chance: Math.min(1, p.chance * 1.6) }));
    this.energy = this.maxEnergy;
    this.currentAttack = null;
    this.hitstunTimer = 0;
    this.dashTimer = 0;
    this.invulnTimer = 1100;
    this.setState('idle');
  }

  /** Back to the phase-1 numbers (a new round of the same fight). */
  private leavePhase2() {
    const b = this.phase1Stats;
    if (this.phase < 2 || !b) return;
    this.phase = 1;
    this.strongDamage = b.strong;
    this.flashDamage = b.flash;
    this.ultimateDamage = b.ult;
    this.speed = b.speed;
    this.dashSpeed = b.dash;
    this.onHitStatus = b.procs;
    this.phase1Stats = null;
  }

  resetForRound(x: number, y: number, facing: 1 | -1) {
    this.leavePhase2();
    this.health = this.maxHealth;
    this.energy = Math.min(this.maxEnergy, this.startEnergy);
    this.x = x;
    this.y = y;
    this.groundY = y;
    this.vy = 0;
    this.isGrounded = true;
    this.facing = facing;
    this.isKO = false;
    this.isShielding = false;
    this.isCharging = false;
    this.currentAttack = null;
    this.status = {};
    this.invulnTimer = 0;
    this.hitstunTimer = 0;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.hitFlashTimer = 0;
    this.reactTimer = 0;
    this.reactPower = 0;
    this.setState('idle');
  }

  getHurtbox(): Box {
    const refH = this.getReferenceHeight();
    const hbWidth = this.drawWidth * 0.625;
    const offsetX = this.drawWidth * 0.1875;
    return {
      x1: this.x + offsetX,
      y1: this.y,
      x2: this.x + offsetX + hbWidth,
      y2: this.y + refH,
    };
  }

  getActiveHitbox(): Box | null {
    if (!this.currentAttack || this.currentAttack.phase !== 'active') return null;
    const def = ATTACK_DEFS[this.currentAttack.type];
    const hb = this.getHurtbox();
    if (this.facing === 1) {
      return { x1: hb.x2, y1: hb.y1, x2: hb.x2 + def.range, y2: hb.y2 };
    }
    return { x1: hb.x1 - def.range, y1: hb.y1, x2: hb.x1, y2: hb.y2 };
  }

  resolveAttackDamage(): number | null {
    if (!this.currentAttack || this.currentAttack.hasHit) return null;
    const def = ATTACK_DEFS[this.currentAttack.type];
    this.currentAttack.hasHit = true;
    this.gainEnergy(def.energyGain * this.energyGainMult);
    return this[def.damageKey];
  }

  attackDefFor(type: AttackType): AttackDef {
    return ATTACK_DEFS[type];
  }

  /** dt in ms (real time, drives timers); frameScale = dt/(1000/60) (drives movement/physics, matching the original's frame-rate-independent scaling). */
  update(dt: number, frameScale: number) {
    // Energy used to trickle in on its own (0.017/ms, always). Now it only
    // comes from landing hits (gainEnergy() calls elsewhere) or actively
    // holding the aura-farm button - see startCharge()/stopCharge().
    if (this.isCharging) this.gainEnergy(this.chargeRate * dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.tickVisuals(dt);
    if (this.regenPerSec > 0 && !this.isKO) this.health = Math.min(this.maxHealth, this.health + (this.regenPerSec * dt) / 1000);
    this.tickStatus(dt);

    if (this.hitstunTimer > 0) {
      this.hitstunTimer -= dt;
      if (this.hitstunTimer <= 0) {
        this.hitstunTimer = 0;
        if (!this.isKO && !this.isShielding) this.setState('idle');
      }
    }

    // Gravity/jump: independent of KO so a KO'd fighter still falls.
    if (!this.isGrounded || this.vy !== 0) {
      this.vy += GRAVITY * frameScale;
      this.y += this.vy * frameScale;
      if (this.y >= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
        this.isGrounded = true;
      }
    }

    if (this.isKO) {
      this.advanceAnimation(dt);
      return;
    }

    if (this.dashTimer > 0) {
      this.x += this.dashDir * this.dashSpeed * frameScale;
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.dashTimer = 0;
        if (this.hitstunTimer <= 0 && !this.isShielding && !this.currentAttack) this.setState('idle');
      }
    }
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= dt;
      if (this.dashCooldownTimer < 0) this.dashCooldownTimer = 0;
    }

    if (this.currentAttack) {
      const def = ATTACK_DEFS[this.currentAttack.type];
      this.currentAttack.timer += dt;
      if (this.currentAttack.phase === 'startup' && this.currentAttack.timer >= def.startup) {
        this.currentAttack.phase = 'active';
        this.currentAttack.timer = 0;
      } else if (this.currentAttack.phase === 'active' && this.currentAttack.timer >= def.active) {
        this.currentAttack.phase = 'recovery';
        this.currentAttack.timer = 0;
      } else if (this.currentAttack.phase === 'recovery' && this.currentAttack.timer >= def.recovery) {
        this.currentAttack = null;
        this.setState('idle');
      }
    }

    this.advanceAnimation(dt);
  }

  private tickStatus(dt: number) {
    if (this.isKO) return;
    let dps = 0;
    for (const k of STATUS_KINDS) {
      const left = this.status[k] ?? 0;
      if (left <= 0) continue;
      dps += DOT_PER_SEC[k] ?? 0;
      const rest = left - dt;
      if (rest <= 0) delete this.status[k];
      else this.status[k] = rest;
    }
    if (dps > 0 && this.invulnTimer <= 0) {
      this.health = Math.max(0, this.health - (dps * dt) / 1000);
      if (this.health <= 0) {
        this.isKO = true;
        this.setState('ko');
      }
    }
  }

  /** Quadros da animação do estado atual. Tocão, Serafim e Capiroto têm 4 passos de andar (folha de poses deles). */
  private framesFor(): string[] {
    if (this.state === 'walk' && WALK4_FIGHTERS.has(this.characterKey)) return WALK4_FRAMES;
    return ANIMATIONS[this.state];
  }

  get currentSpriteKey(): string {
    const frames = this.framesFor();
    return frames[this.frameIndex % frames.length];
  }

  private advanceAnimation(dt: number) {
    const frames = this.framesFor();
    if (frames.length <= 1) return;
    this.frameTimer += dt;
    if (this.frameTimer >= this.frameDuration) {
      this.frameTimer = 0;
      this.frameIndex = (this.frameIndex + 1) % frames.length;
    }
  }
}

// Dogge/Gadigago numbers, straight from dogge.js / gadigago.js.
export function createFighter(characterKey: CharacterKey, idleAspect: number): Fighter {
  if (characterKey === 'dogge') {
    const f = new Fighter('Dogge', 'dogge');
    f.drawWidth = 200;
    f.speed = 4;
    f.dashSpeed = 15;
    f.strongDamage = 18;
    f.flashDamage = 10;
    f.ultimateDamage = 34;
    f.idleAspect = idleAspect;
    f.ultEffectWidth = f.drawWidth * 0.85;
    return f;
  }
  if (characterKey === 'gadigago') {
    const f = new Fighter('Gadigago', 'gadigago');
    f.drawWidth = 150;
    f.speed = 5;
    f.dashSpeed = 19;
    f.strongDamage = 15;
    f.flashDamage = 12;
    f.ultimateDamage = 30;
    f.idleAspect = idleAspect;
    f.ultEffectWidth = f.drawWidth * 0.85;
    return f;
  }
  if (characterKey === 'orc') {
    // Standard-tier grunt (a rank-and-file camp guard, not the leader) -
    // kept clearly under the protagonists/named-villains tier on purpose.
    const f = new Fighter('Orc', 'orc');
    f.drawWidth = 170;
    f.speed = 3.2;
    f.dashSpeed = 11;
    f.strongDamage = 13;
    f.flashDamage = 7;
    f.ultimateDamage = 24;
    f.maxHealth = 85;
    f.health = 85;
    f.idleAspect = idleAspect;
    f.ultEffectWidth = f.drawWidth * 0.85;
    return f;
  }
  if (characterKey === 'soldier') {
    // Camp CAPTAIN (the faction's named leader): protagonist tier, same
    // rough power as Dogge/Gadigago, clearly above the standard grunt.
    const f = new Fighter('Soldier', 'soldier');
    f.drawWidth = 165;
    f.speed = 4.6;
    f.dashSpeed = 17;
    f.strongDamage = 19;
    f.flashDamage = 12;
    f.ultimateDamage = 33;
    f.maxHealth = 105;
    f.health = 105;
    f.hasPhases = true;
    f.statusDurationMult = 0.7;
    f.onHitStatus = [{ kind: 'stun', chance: 0.15, ms: 800, on: ['strong'] }];
    f.idleAspect = idleAspect;
    f.ultEffectWidth = f.drawWidth * 0.85;
    return f;
  }
  if (characterKey === 'dogking') {
    // Island boss, the dog family's leader. Bigger, hits harder, more
    // health - a real boss fight, not just a reskinned grunt.
    const f = new Fighter('Rei dos Cães', 'dogking');
    f.drawWidth = 230;
    f.speed = 3.8;
    f.dashSpeed = 14;
    f.strongDamage = 24;
    f.flashDamage = 13;
    f.ultimateDamage = 40;
    f.maxHealth = 130;
    f.health = 130;
    f.hasPhases = true;
    f.statusDurationMult = 0.6;
    f.onHitStatus = [{ kind: 'burn', chance: 0.3, ms: 4000, on: ['strong', 'ultimate'] }];
    f.idleAspect = idleAspect;
    f.ultEffectWidth = f.drawWidth * 0.85;
    return f;
  }
  if (characterKey === 'ninja') {
    const f = new Fighter('Sombra Ladra-Memes', 'ninja');
    f.drawWidth = 150; f.speed = 5.4; f.dashSpeed = 20; f.strongDamage = 17; f.flashDamage = 11; f.ultimateDamage = 30;
    f.maxHealth = 120; f.health = 120; f.idleAspect = idleAspect; f.ultEffectWidth = f.drawWidth * 1.1;
    f.hasPhases = true; f.statusDurationMult = 0.6;
    f.onHitStatus = [{ kind: 'poison', chance: 0.3, ms: 6000, on: ['flash'] }, { kind: 'stun', chance: 0.15, ms: 900, on: ['strong'] }];
    return f;
  }
  if (characterKey === 'mystic') {
    const f = new Fighter('Encapuzado Misterioso', 'mystic');
    f.drawWidth = 130; f.speed = 3.6; f.dashSpeed = 14; f.strongDamage = 20; f.flashDamage = 12; f.ultimateDamage = 38;
    f.maxHealth = 135; f.health = 135; f.idleAspect = idleAspect; f.ultEffectWidth = f.drawWidth * 1.3;
    f.hasPhases = true; f.statusDurationMult = 0.6;
    f.onHitStatus = [{ kind: 'freeze', chance: 0.25, ms: 2500, on: ['flash'] }, { kind: 'stun', chance: 0.25, ms: 1000, on: ['strong'] }, { kind: 'burn', chance: 1, ms: 4000, on: ['ultimate'] }];
    return f;
  }
  if (characterKey === 'ice_dragon') {
    const f = new Fighter('Dragão do Gelo', 'ice_dragon');
    f.drawWidth = 250; f.speed = 4; f.dashSpeed = 14; f.strongDamage = 24; f.flashDamage = 13; f.ultimateDamage = 40;
    f.maxHealth = 160; f.health = 160; f.idleAspect = idleAspect; f.ultEffectWidth = f.drawWidth * 0.9;
    f.hasPhases = true; f.statusDurationMult = 0.5; f.immune = ['freeze'];
    f.onHitStatus = [{ kind: 'freeze', chance: 0.35, ms: 2800, on: ['strong'] }, { kind: 'freeze', chance: 1, ms: 3200, on: ['ultimate'] }];
    return f;
  }
  if (characterKey === 'green_dragon') {
    const f = new Fighter('Dragão da Floresta', 'green_dragon');
    f.drawWidth = 240; f.speed = 4.4; f.dashSpeed = 15; f.strongDamage = 22; f.flashDamage = 12; f.ultimateDamage = 38;
    f.maxHealth = 150; f.health = 150; f.idleAspect = idleAspect; f.ultEffectWidth = f.drawWidth * 0.9;
    f.hasPhases = true; f.statusDurationMult = 0.5; f.immune = ['poison'];
    f.onHitStatus = [{ kind: 'poison', chance: 0.35, ms: 7000, on: ['flash', 'strong'] }, { kind: 'poison', chance: 1, ms: 9000, on: ['ultimate'] }];
    return f;
  }
  if (characterKey === 'shadow_dragon') {
    const f = new Fighter('Dragão Sombrio', 'shadow_dragon');
    // 440 -> 400: o sprite original (537x260, bem largo) se perdeu e foi redesenhado do zero (144x104, mais alto). Com 400 de largura
    // o dragão fica com ~289 px de altura (os outros dois: ~272 e ~284) e o hitbox acompanha o desenho visível.
    f.drawWidth = 400; f.speed = 3.8; f.dashSpeed = 13; f.strongDamage = 27; f.flashDamage = 15; f.ultimateDamage = 46;
    f.maxHealth = 190; f.health = 190; f.idleAspect = idleAspect; f.ultEffectWidth = f.drawWidth * 0.5;
    f.hasPhases = true; f.statusDurationMult = 0.4; f.immune = ['burn'];
    f.onHitStatus = [{ kind: 'burn', chance: 0.3, ms: 4500, on: ['flash'] }, { kind: 'stun', chance: 0.22, ms: 1000, on: ['strong'] }, { kind: 'burn', chance: 1, ms: 6000, on: ['ultimate'] }];
    return f;
  }
  if (characterKey === 'troll_face') {
    // Trapaceiro, dono do cassino da Ilha Misteriosa: rapido e fragil, ataca de surpresa e atordoa.
    // drawWidth 108 -> altura ~214 px (idle 170x337), do tamanho dos outros lutadores humanoides.
    const f = new Fighter('Troll Face', 'troll_face');
    f.drawWidth = 108; f.speed = 5.6; f.dashSpeed = 21; f.strongDamage = 16; f.flashDamage = 10; f.ultimateDamage = 32;
    f.maxHealth = 100; f.health = 100; f.idleAspect = idleAspect; f.ultEffectWidth = f.drawWidth * 1.5;
    f.hasPhases = true; f.statusDurationMult = 0.6;
    f.onHitStatus = [{ kind: 'stun', chance: 0.2, ms: 700, on: ['flash'] }, { kind: 'stun', chance: 0.25, ms: 1000, on: ['strong'] }];
    return f;
  }
  if (characterKey === 'cara_tranquilo') {
    // Calmo e resistente: nada o abala (imune a atordoamento), bate devagar mas aguenta muito.
    // drawWidth 118 -> altura ~207 px (idle 134x235).
    const f = new Fighter('Cara Tranquilo', 'cara_tranquilo');
    f.drawWidth = 118; f.speed = 3.4; f.dashSpeed = 12; f.strongDamage = 18; f.flashDamage = 9; f.ultimateDamage = 30;
    f.maxHealth = 130; f.health = 130; f.idleAspect = idleAspect; f.ultEffectWidth = f.drawWidth * 1.5;
    f.hasPhases = true; f.statusDurationMult = 0.5; f.immune = ['stun'];
    f.onHitStatus = [{ kind: 'freeze', chance: 0.2, ms: 1800, on: ['strong'] }];
    return f;
  }
  if (characterKey === 'tocao') {
    // Tronco laranja, firme e teimoso: aguenta muito, bate devagar e e imune a veneno. Os golpes fortes atordoam.
    // drawWidth 106 -> altura ~215 px (idle 92x186 da folha de poses; o quadro e todo corpo, sem folga).
    const f = new Fighter('Tocão', 'tocao');
    f.drawWidth = 106; f.speed = 3.9; f.dashSpeed = 14; f.strongDamage = 19; f.flashDamage = 10; f.ultimateDamage = 31;
    f.maxHealth = 150; f.health = 150; f.idleAspect = idleAspect; f.ultEffectWidth = f.drawWidth * 2.2;
    f.hasPhases = true; f.statusDurationMult = 0.5; f.immune = ['poison'];
    f.onHitStatus = [{ kind: 'stun', chance: 0.3, ms: 900, on: ['strong'] }, { kind: 'stun', chance: 1, ms: 1100, on: ['ultimate'] }];
    return f;
  }
  if (characterKey === 'serafim') {
    // Tronco anjo: leve e rapido, a luz sagrada queima. Imune a congelamento. drawWidth 177 -> altura ~225 px (idle 170x216 da folha, com a auréola).
    const f = new Fighter('Serafim', 'serafim');
    f.drawWidth = 177; f.speed = 5.0; f.dashSpeed = 17; f.strongDamage = 15; f.flashDamage = 11; f.ultimateDamage = 36;
    f.maxHealth = 110; f.health = 110; f.idleAspect = idleAspect; f.ultEffectWidth = f.drawWidth * 1.3;
    f.hasPhases = true; f.statusDurationMult = 0.6; f.immune = ['freeze'];
    f.onHitStatus = [{ kind: 'burn', chance: 0.25, ms: 4000, on: ['flash'] }, { kind: 'stun', chance: 0.15, ms: 800, on: ['strong'] }, { kind: 'burn', chance: 1, ms: 5000, on: ['ultimate'] }];
    return f;
  }
  if (characterKey === 'capiroto') {
    // Tronco diabo: canhao de vidro, bate forte e envenena/queima. Imune a fogo. drawWidth 161 -> altura ~225 px (idle 160x224 da folha).
    const f = new Fighter('Capiroto', 'capiroto');
    f.drawWidth = 161; f.speed = 5.2; f.dashSpeed = 19; f.strongDamage = 22; f.flashDamage = 12; f.ultimateDamage = 40;
    f.maxHealth = 105; f.health = 105; f.idleAspect = idleAspect; f.ultEffectWidth = f.drawWidth * 1.4;
    f.hasPhases = true; f.statusDurationMult = 0.6; f.immune = ['burn'];
    f.onHitStatus = [{ kind: 'poison', chance: 0.3, ms: 6000, on: ['flash'] }, { kind: 'burn', chance: 0.3, ms: 4000, on: ['strong'] }, { kind: 'burn', chance: 1, ms: 6000, on: ['ultimate'] }];
    return f;
  }
  // tank: guards the approach to Ilha das Trevas on Vulcao - the family
  // boss the brief asked for there, a notch below the King himself.
  const f = new Fighter('Tank', 'tank');
  f.drawWidth = 200;
  f.speed = 3.5;
  f.dashSpeed = 13;
  f.strongDamage = 21;
  f.flashDamage = 12;
  f.ultimateDamage = 36;
  f.maxHealth = 115;
  f.health = 115;
  f.hasPhases = true;
  f.statusDurationMult = 0.6;
  f.onHitStatus = [{ kind: 'stun', chance: 0.25, ms: 900, on: ['strong'] }, { kind: 'stun', chance: 1, ms: 1200, on: ['ultimate'] }];
  f.idleAspect = idleAspect;
  f.ultEffectWidth = f.drawWidth * 0.85;
  return f;
}
export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}
