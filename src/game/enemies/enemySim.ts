import type { MapDef, Direction } from '@/types/game';
import type { SharedValue } from 'react-native-reanimated';
import { ENEMY_DEFS, type EnemyDef, type EnemyTypeId } from './enemyDefs';
import { ENEMY_SPAWNS } from './enemySpawns';
import { DIFFICULTY_PARAMS, type Difficulty } from '@/game/state/difficulty';

/**
 * Overworld enemies. Pure game logic (no React): WorldScreen's game loop
 * calls update() every frame and playerAttack() when a swing connects, and
 * EnemyLayer draws whatever occupies the render slots.
 *
 * Only enemies near the player are simulated (a pool of POOL slots); the
 * rest just sit at their spawn point, so ~300 spawn points cost almost
 * nothing per frame.
 */
export const POOL = 10;
const SIM_RADIUS = 780; // px: enemies farther than this aren't simulated or drawn
const LEASH = 520; // px from home: a chasing enemy gives up beyond this
const RESPAWN_MS = 70_000;
const CONTACT_COOLDOWN_MS = 950;
const DYING_MS = 320;

const SOLID = new Set(['water', 'tree', 'rock', 'wall', 'lava', 'shop', 'house', 'cliff']);
const FLY_OK = new Set(['water', 'lava']);

export interface EnemyInst {
  id: number;
  type: EnemyTypeId;
  def: EnemyDef;
  lv: number;
  variant: number;
  homeX: number;
  homeY: number;
  x: number; // centre, world px
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  mode: 'idle' | 'chase' | 'dying' | 'dead';
  faceX: 1 | -1;
  slot: number; // -1 = not rendered
  cd: number; // contact cooldown
  stun: number; // knockback time left
  kx: number;
  ky: number;
  flash: number;
  dyingT: number;
  respawnT: number;
  wanderT: number;
  wx: number;
  wy: number;
  phase: number; // animation / behaviour clock
}

/** What EnemyView binds so the sim can drive it without re-rendering React. */
export interface SlotHandle {
  x: SharedValue<number>;
  y: SharedValue<number>;
  hp: SharedValue<number>;
  flash: SharedValue<number>;
  face: SharedValue<number>;
  dying: SharedValue<number>;
}

export interface SlotInfo {
  type: EnemyTypeId;
  variant: number;
}

export interface ContactHit {
  damage: number;
  fromX: number;
  fromY: number;
  flying: boolean;
}

export interface KillInfo {
  type: EnemyTypeId;
  name: string;
  coins: number;
  xp: number;
  itemId: string | null;
}

export type PlayerAttackType = 'flash' | 'strong' | 'ultimate';

const ATTACK_SHAPES: Record<PlayerAttackType, { len: number; half: number; radius: number }> = {
  flash: { len: 88, half: 48, radius: 0 },
  strong: { len: 112, half: 58, radius: 0 },
  ultimate: { len: 0, half: 0, radius: 175 },
};

function rnd(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export class EnemyManager {
  readonly enemies: EnemyInst[] = [];
  private slots: (EnemyInst | null)[] = Array.from({ length: POOL }, () => null);
  private handles: (SlotHandle | null)[] = Array.from({ length: POOL }, () => null);
  private listener: ((info: (SlotInfo | null)[]) => void) | null = null;
  private lastInfoKey = '';
  private time = 0;
  private hpMult: number;
  private dmgMult: number;

  constructor(private map: MapDef, difficulty: Difficulty) {
    const dp = DIFFICULTY_PARAMS[difficulty];
    this.hpMult = dp.cpuHealth;
    this.dmgMult = dp.cpuDamage;
    const ts = map.tileSize;
    ENEMY_SPAWNS.forEach(([type, tx, ty, lv], i) => {
      const def = ENEMY_DEFS[type];
      const maxHp = Math.round(def.hp * (1 + 0.35 * (lv - 1)) * this.hpMult);
      const x = tx * ts + ts / 2;
      const y = ty * ts + ts / 2;
      this.enemies.push({
        id: i, type, def, lv, variant: i, homeX: x, homeY: y, x, y, hp: maxHp, maxHp,
        damage: def.damage * (1 + 0.25 * (lv - 1)) * this.dmgMult,
        mode: 'idle', faceX: 1, slot: -1, cd: 0, stun: 0, kx: 0, ky: 0, flash: 0, dyingT: 0, respawnT: 0,
        wanderT: rnd(0, 1500), wx: 0, wy: 0, phase: rnd(0, 6),
      });
    });
  }

  // ---------- rendering plumbing ----------
  onSlots(fn: ((info: (SlotInfo | null)[]) => void) | null) {
    this.listener = fn;
    this.lastInfoKey = '';
    this.emitSlots();
  }

  bindSlot(i: number, h: SlotHandle | null) {
    this.handles[i] = h;
  }

  private emitSlots() {
    const info = this.slots.map((e) => (e ? { type: e.type, variant: e.variant } : null));
    const key = info.map((x) => (x ? `${x.type}${x.variant}` : '-')).join(',');
    if (key === this.lastInfoKey) return;
    this.lastInfoKey = key;
    this.listener?.(info);
  }

  private pushHandles() {
    for (let i = 0; i < POOL; i++) {
      const e = this.slots[i];
      const h = this.handles[i];
      if (!e || !h) continue;
      h.x.value = e.x;
      h.y.value = e.y;
      h.hp.value = e.maxHp > 0 ? Math.max(0, e.hp / e.maxHp) : 0;
      h.flash.value = Math.min(1, e.flash / 160);
      h.face.value = e.faceX;
      h.dying.value = e.mode === 'dying' ? 1 - e.dyingT / DYING_MS : 0;
    }
  }

  // ---------- collision ----------
  private blocked(cx: number, cy: number, def: EnemyDef): boolean {
    const ts = this.map.tileSize;
    const left = Math.floor((cx - def.w / 2) / ts);
    const right = Math.floor((cx + def.w / 2 - 0.01) / ts);
    const top = Math.floor((cy - def.h / 2) / ts);
    const bottom = Math.floor((cy + def.h / 2 - 0.01) / ts);
    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return true;
        const t = this.map.getTile(tx, ty);
        if (!t || (SOLID.has(t) && !(def.fly && FLY_OK.has(t)))) return true;
      }
    }
    return false;
  }

  private move(e: EnemyInst, dx: number, dy: number) {
    if (dx !== 0 && !this.blocked(e.x + dx, e.y, e.def)) e.x += dx;
    if (dy !== 0 && !this.blocked(e.x, e.y + dy, e.def)) e.y += dy;
  }

  // ---------- per-frame update ----------
  /** `player` is the player's centre in world px. Returns the contact hits to apply to the player. */
  update(dtMs: number, player: { x: number; y: number }, playerAirborne: boolean): ContactHit[] {
    this.time += dtMs;
    const dt = dtMs / 1000;
    const hits: ContactHit[] = [];
    let slotsChanged = false;

    for (const e of this.enemies) {
      const ddx = player.x - e.x;
      const ddy = player.y - e.y;
      const dist2 = ddx * ddx + ddy * ddy;

      if (e.mode === 'dead') {
        e.respawnT -= dtMs;
        if (e.respawnT <= 0 && dist2 > 560 * 560) {
          e.mode = 'idle';
          e.hp = e.maxHp;
          e.x = e.homeX;
          e.y = e.homeY;
          e.flash = 0;
        }
        continue;
      }

      const near = dist2 < SIM_RADIUS * SIM_RADIUS;
      if (e.slot === -1) {
        if (!near) continue;
        const free = this.slots.indexOf(null);
        if (free === -1) continue;
        this.slots[free] = e;
        e.slot = free;
        slotsChanged = true;
      } else if (dist2 > SIM_RADIUS * 1.15 * SIM_RADIUS * 1.15) {
        // Far away again: back to its spot, free the slot.
        this.slots[e.slot] = null;
        e.slot = -1;
        e.x = e.homeX;
        e.y = e.homeY;
        e.mode = 'idle';
        slotsChanged = true;
        continue;
      }

      e.phase += dt;
      e.cd = Math.max(0, e.cd - dtMs);
      e.flash = Math.max(0, e.flash - dtMs);

      if (e.mode === 'dying') {
        e.dyingT -= dtMs;
        if (e.dyingT <= 0) {
          e.mode = 'dead';
          e.respawnT = RESPAWN_MS;
          if (e.slot !== -1) {
            this.slots[e.slot] = null;
            e.slot = -1;
            slotsChanged = true;
          }
        }
        continue;
      }

      // Knockback eats the whole step.
      if (e.stun > 0) {
        e.stun -= dtMs;
        this.move(e, e.kx * dt, e.ky * dt);
        continue;
      }

      const dist = Math.sqrt(dist2);
      const homeDist = Math.hypot(e.x - e.homeX, e.y - e.homeY);
      if (e.mode === 'idle' && dist < e.def.aggro) e.mode = 'chase';
      else if (e.mode === 'chase' && (dist > e.def.aggro * 2.2 || homeDist > LEASH)) e.mode = 'idle';

      let vx = 0;
      let vy = 0;
      const sp = e.def.speed;
      if (e.mode === 'chase') {
        const nx = ddx / (dist || 1);
        const ny = ddy / (dist || 1);
        switch (e.type) {
          case 'bat': {
            // Weaving flight: toward the player plus a sideways sine.
            const w = Math.sin(e.phase * 6) * 0.9;
            vx = (nx - ny * w) * sp;
            vy = (ny + nx * w) * sp;
            break;
          }
          case 'slime': {
            // Hops: moves in a burst, then rests.
            const cyc = (e.phase * 1000) % 950;
            const k = cyc < 380 ? 2.4 : 0;
            vx = nx * sp * k;
            vy = ny * sp * k;
            break;
          }
          case 'spider': {
            // Scuttles in runs with short pauses.
            const cyc = (e.phase * 1000) % 1000;
            const k = cyc < 620 ? 1.6 : 0.1;
            vx = nx * sp * k;
            vy = ny * sp * k;
            break;
          }
          default: {
            // Shadow: steady stalker that lunges when close.
            const cyc = (e.phase * 1000) % 2200;
            const lunge = dist < 150 && cyc < 260 ? 2.2 : 1;
            vx = nx * sp * lunge;
            vy = ny * sp * lunge;
          }
        }
        if (Math.abs(vx) > 4) e.faceX = vx > 0 ? 1 : -1;
      } else {
        // Idle: slow wandering around home.
        e.wanderT -= dtMs;
        if (e.wanderT <= 0) {
          e.wanderT = rnd(1200, 3000);
          if (Math.random() < 0.35 || homeDist > 160) {
            const a = homeDist > 160 ? Math.atan2(e.homeY - e.y, e.homeX - e.x) : Math.random() * Math.PI * 2;
            e.wx = Math.cos(a);
            e.wy = Math.sin(a);
          } else {
            e.wx = 0;
            e.wy = 0;
          }
        }
        vx = e.wx * sp * 0.3;
        vy = e.wy * sp * 0.3;
        if (Math.abs(vx) > 4) e.faceX = vx > 0 ? 1 : -1;
      }
      this.move(e, vx * dt, vy * dt);

      // Contact with the player.
      if (e.cd <= 0 && Math.abs(ddx) < e.def.w / 2 + 15 && Math.abs(ddy) < e.def.h / 2 + 21) {
        if (!(playerAirborne && !e.def.fly)) {
          hits.push({ damage: e.damage, fromX: e.x, fromY: e.y, flying: e.def.fly });
          e.cd = CONTACT_COOLDOWN_MS;
          // Recoil a little so it doesn't glue itself to the player.
          const nx = -ddx / (dist || 1);
          const ny = -ddy / (dist || 1);
          e.stun = 160;
          e.kx = nx * 160;
          e.ky = ny * 160;
        }
      }
    }

    if (slotsChanged) this.emitSlots();
    this.pushHandles();
    return hits;
  }

  /**
   * A swing from the player's centre. Returns what was hit/killed so the
   * screen can pay out drops. `damage` is already the final per-hit damage.
   */
  playerAttack(cx: number, cy: number, facing: Direction, type: PlayerAttackType, damage: number): { hits: number; kills: KillInfo[] } {
    const shape = ATTACK_SHAPES[type];
    const kills: KillInfo[] = [];
    let hits = 0;
    for (const e of this.enemies) {
      if (e.slot === -1 || e.mode === 'dying' || e.mode === 'dead') continue;
      const dx = e.x - cx;
      const dy = e.y - cy;
      let inside = false;
      if (shape.radius > 0) {
        inside = dx * dx + dy * dy <= (shape.radius + e.def.w / 2) ** 2;
      } else {
        const rx = e.def.w / 2;
        const ry = e.def.h / 2;
        switch (facing) {
          case 'right':
            inside = dx > -10 && dx < shape.len + rx && Math.abs(dy) < shape.half + ry;
            break;
          case 'left':
            inside = dx < 10 && dx > -(shape.len + rx) && Math.abs(dy) < shape.half + ry;
            break;
          case 'up':
            inside = dy < 10 && dy > -(shape.len + ry) && Math.abs(dx) < shape.half + rx;
            break;
          default:
            inside = dy > -10 && dy < shape.len + ry && Math.abs(dx) < shape.half + rx;
        }
      }
      if (!inside) continue;
      hits++;
      e.hp -= damage;
      e.flash = 160;
      if (e.mode === 'idle') e.mode = 'chase';
      const dist = Math.hypot(dx, dy) || 1;
      const kb = type === 'flash' ? 150 : type === 'strong' ? 260 : 340;
      e.stun = 140;
      e.kx = (dx / dist) * kb;
      e.ky = (dy / dist) * kb;
      if (e.hp <= 0) {
        e.mode = 'dying';
        e.dyingT = DYING_MS;
        const [lo, hi] = e.def.coins;
        const coins = Math.max(1, Math.round(rnd(lo, hi + 1) * e.lv));
        let itemId: string | null = null;
        for (const d of e.def.drops) {
          if (Math.random() < d.chance * (1 + 0.15 * (e.lv - 1))) {
            itemId = d.id;
            break;
          }
        }
        const xp = Math.max(1, Math.round(e.def.xp * (1 + 0.5 * (e.lv - 1))));
        kills.push({ type: e.type, name: e.def.name, coins, xp, itemId });
      }
    }
    return { hits, kills };
  }

  /** Back to calm (after the player faints and is sent home). */
  calmDown() {
    for (const e of this.enemies) {
      if (e.mode === 'chase') e.mode = 'idle';
      e.cd = 1200;
    }
  }
}
