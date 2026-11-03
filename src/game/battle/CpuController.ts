import type { Fighter } from './Fighter';
import { DIFFICULTY_PARAMS, type Difficulty } from '@/game/state/difficulty';

/**
 * Faithful port of CpuController in battle-scene.js. The first pass at
 * this made a fresh reactive decision every frame, which reads as
 * twitchy/erratic: the original commits to a decision (move one way,
 * throw a specific attack) and holds it for 300-600ms via a persistent
 * timer, which is what actually gives it fight-game "read and react"
 * pacing. That persistent state has to live outside the Fighter (it's
 * per-controller, not per-character), hence this small class.
 */
export class CpuController {
  private decisionTimer = 0;
  private moveDir: -1 | 0 | 1 = 0;
  private d;

  /** `difficulty` scales reaction time, shielding and aggression (see
   * state/difficulty.ts); 'medium' is the original behaviour. */
  constructor(difficulty: Difficulty = 'medium') {
    this.d = { ...DIFFICULTY_PARAMS[difficulty] };
  }

  /** Boss phase 2: decides faster, attacks more, shields and uses the ultimate more often. */
  enrage() {
    const d = this.d;
    this.d = { ...d, reactMin: d.reactMin * 0.7, reactMax: d.reactMax * 0.7, attackChance: Math.min(0.92, d.attackChance + 0.2), ultChance: Math.min(1, d.ultChance + 0.3), shieldChance: Math.min(0.8, d.shieldChance + 0.1) };
  }

  tick(fighter: Fighter, opponent: Fighter, dt: number, frameScale: number) {
    const f = fighter;
    if (f.isKO) return;

    const dist = Math.abs(f.x - opponent.x);

    const opponentAttacking = !!opponent.currentAttack && opponent.currentAttack.phase !== 'recovery' && dist < 200;
    if (opponentAttacking && f.canAct() && Math.random() < this.d.shieldChance) {
      f.startShield();
    } else if (f.isShielding && !opponentAttacking) {
      f.stopShield();
    }

    if (f.isShielding) return;

    // Harder CPUs farm aura while the player is far away, and stop the
    // moment they get close (charging leaves them open).
    if (this.d.farmsAura) {
      if (f.isCharging && (dist < 260 || f.energy >= f.maxEnergy)) f.stopCharge();
      else if (!f.isCharging && dist > 420 && f.energy < f.maxEnergy * 0.6 && f.canAct() && Math.random() < 0.02) f.startCharge();
      if (f.isCharging) return;
    }

    this.decisionTimer -= dt;

    if (this.decisionTimer <= 0) {
      this.decisionTimer = this.d.reactMin + Math.random() * (this.d.reactMax - this.d.reactMin);
      this.moveDir = 0;

      if (f.energy >= f.maxEnergy && dist < 200 && f.canAct() && Math.random() < this.d.ultChance) {
        f.startAttack('ultimate');
      } else if (dist < 150 && f.canAct()) {
        const roll = Math.random();
        const atk = this.d.attackChance;
        if (roll < atk * 0.64) f.startAttack('flash');
        else if (roll < atk) f.startAttack('strong');
        else if (roll < atk + (1 - atk) * 0.5) this.moveDir = f.facing === 1 ? -1 : 1;
      } else if (dist > 260 && f.canDash()) {
        f.startDash(f.facing);
      } else if (dist >= 150) {
        this.moveDir = opponent.x > f.x ? 1 : -1;
      }
    }

    if (f.canAct() && this.moveDir !== 0) {
      f.walk(this.moveDir, frameScale);
    } else if (f.canAct() && f.state === 'walk') {
      f.setState('idle');
    }
  }
}
