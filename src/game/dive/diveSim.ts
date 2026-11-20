/**
 * SIMULAÇÃO DO MERGULHO (pura): criaturas, golpes do jogador, adaptação, alimentar e recompensas.
 * Sem React: a cena só lê o resultado e desenha. Determinística com `rng` injetável (testes).
 */
import { CREATURES, attackMultVs, type BossPattern, type CreatureDef, type DiveAttack } from './diveCreatures';
import { TILE, buildGrid, isSolidChar, type DiveSite, type Pt } from './diveSites';
import { CHUNK, chunkSpawns, seaChar } from './seaWorld';

export type EntityState = 'idle' | 'hidden' | 'chase' | 'flee' | 'dead';

export interface DiveEntity {
  uid: string;
  def: CreatureDef;
  x: number;
  y: number;
  hp: number;
  state: EntityState;
  hitCdMs: number;
  /** Casca fechada agora? (só criaturas com casca) */
  shellClosed: boolean;
  shellMs: number;
  /** Para onde passeia (px) e quanto tempo falta para escolher outro destino. */
  wanderTo: Pt;
  wanderMs: number;
  /** Já alimentada ou ajudada (amigável). */
  helped: boolean;
  /** Quantas vezes sofreu cada tipo de golpe seguido (adaptação). */
  streak: { light: number; heavy: number };
  /** Esta criatura nota quem a atacou e passa a perseguir (neutras). */
  angry: boolean;
  /** Estado do mini-chefe: qual padrão vem agora e o aviso em andamento. */
  boss?: { patIdx: number; timerMs: number; telegraph: { kind: BossPattern; msLeft: number; totalMs: number; x: number; y: number; r: number } | null };
}

export interface DiveSim {
  site: DiveSite;
  grid: string[][];
  /** Caractere do tile (locais: a grade; mar aberto: o mundo submerso). */
  getTile: (tx: number, ty: number) => string | undefined;
  /** Mar aberto: chunks já povoados. */
  chunks?: Set<string>;
  entities: DiveEntity[];
  /** Tinta no ar (ms restantes): escurece a tela. */
  inkMs: number;
  /** Puxão em px/s que o chamador aplica ao jogador neste quadro (isca do Tamboril Rei). Zerado a cada passo. */
  pull: Pt;
  /** Criaturas que surgiram neste quadro (filhotes invocados): o chamador registra e desenha. */
  spawned: DiveEntity[];
  /** Contador de invocações (ids únicos). */
  summons: number;
}

export interface SimOptions {
  /** Condições do mundo para criaturas raras. */
  night?: boolean;
  /** O jogador está numa missão que chama a criatura rara. */
  questWhale?: boolean;
  revealed?: ReadonlySet<string>;
  rng?: () => number;
}

/** Cria as criaturas do local. Criatura rara só aparece se a condição dela valer. */
export function createSim(site: DiveSite, opt: SimOptions = {}): DiveSim {
  const rng = opt.rng ?? Math.random;
  const grid = buildGrid(site, opt.revealed);
  const entities: DiveEntity[] = [];
  (site.spawns ?? []).forEach((sp, i) => {
    const def = CREATURES[sp.creature];
    if (!def) return;
    if (def.rareWhen === 'abyss' && site.mood !== 'abyss') return;
    if (def.rareWhen === 'night' && !opt.night) return;
    if (def.rareWhen === 'quest' && !opt.questWhale) return;
    const x = sp.x * TILE + TILE / 2;
    const y = sp.y * TILE + TILE / 2;
    entities.push({
      uid: `${site.id}:${sp.creature}:${i}`, def, x, y, hp: def.hp, state: def.ambush ? 'hidden' : 'idle', hitCdMs: 0, shellClosed: false, shellMs: 1500 + rng() * 1500,
      wanderTo: { x, y }, wanderMs: 0, helped: false, streak: { light: 0, heavy: 0 }, angry: false,
      boss: def.boss ? { patIdx: 0, timerMs: def.boss.everyMs, telegraph: null } : undefined,
    });
  });
  return { site, grid, getTile: (tx, ty) => grid[ty]?.[tx], entities, inkMs: 0, pull: { x: 0, y: 0 }, spawned: [], summons: 0 };
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

function solidAt(sim: DiveSim, px: number, py: number): boolean {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  return isSolidChar(sim.getTile(tx, ty));
}

function moveToward(sim: DiveSim, e: DiveEntity, tx: number, ty: number, speed: number, dtMs: number) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return;
  const step = Math.min(d, (speed * dtMs) / 1000);
  const nx = e.x + (dx / d) * step;
  const ny = e.y + (dy / d) * step;
  // anda por eixo para deslizar nas paredes
  if (!solidAt(sim, nx, e.y)) e.x = nx;
  if (!solidAt(sim, e.x, ny)) e.y = ny;
}

export interface Contact {
  entity: DiveEntity;
  damageFrac: number;
  dot?: { kind: 'poison' | 'burn'; ms: number; fracPerSec: number };
}

/** Distância (px) em que a criatura encosta no jogador. */
export const CONTACT_RANGE = 26;

/**
 * Avança as criaturas. Devolve os contatos que machucam o jogador neste passo
 * (o chamador aplica dano, registra a causa de morte e o veneno).
 */
export function stepSim(sim: DiveSim, dtMs: number, player: Pt, rng: () => number = Math.random): Contact[] {
  const contacts: Contact[] = [];
  sim.inkMs = Math.max(0, sim.inkMs - dtMs);
  sim.pull = { x: 0, y: 0 };
  sim.spawned = [];
  for (const e of [...sim.entities]) {
    if (e.state === 'dead') continue;
    const d = dist(e, player);
    e.hitCdMs = Math.max(0, e.hitCdMs - dtMs);
    if (e.def.shell) {
      e.shellMs -= dtMs;
      if (e.shellMs <= 0) {
        e.shellClosed = !e.shellClosed;
        e.shellMs = e.shellClosed ? 1400 : 2200;
      }
    }
    const hostileNow = e.def.behavior === 'hostile' || e.def.behavior === 'rare' ? e.def.damageFrac > 0 : e.angry;

    if (e.state === 'hidden') {
      if (d <= e.def.aggro) e.state = 'chase'; // emboscada
      continue;
    }
    if (hostileNow && d <= e.def.aggro * (e.state === 'chase' ? 1.6 : 1)) e.state = 'chase';
    else if (e.state === 'chase' && d > e.def.aggro * 1.6) e.state = 'idle';

    if (e.boss && e.state === 'chase') stepBoss(sim, e, dtMs, player, contacts);
    if (e.state === 'chase') {
      // durante o sinal do golpe em área o chefe fica parado (é a janela para sair do círculo)
      if (!(e.boss?.telegraph && e.boss.telegraph.kind !== 'lure')) moveToward(sim, e, player.x, player.y, e.def.speed, dtMs);
      if (d <= CONTACT_RANGE + e.def.size / 4 && e.hitCdMs <= 0 && e.def.damageFrac > 0) {
        e.hitCdMs = e.def.hitCooldownMs;
        contacts.push({ entity: e, damageFrac: e.def.damageFrac, dot: e.def.dot });
      }
    } else if (e.state === 'flee') {
      moveToward(sim, e, e.x + (e.x - player.x), e.y + (e.y - player.y), e.def.speed * 1.3, dtMs);
      if (d > 220) e.state = 'idle';
    } else {
      // passeia sem rumo; águas-vivas boiam parado e machucam quem encosta
      e.wanderMs -= dtMs;
      if (e.wanderMs <= 0) {
        e.wanderMs = 1800 + rng() * 2400;
        e.wanderTo = { x: e.x + (rng() - 0.5) * 140, y: e.y + (rng() - 0.5) * 100 };
      }
      moveToward(sim, e, e.wanderTo.x, e.wanderTo.y, e.def.speed * 0.5, dtMs);
      // neutras com dano de contato (água-viva): encostar machuca mesmo sem raiva
      if (e.def.behavior === 'neutral' && e.def.damageFrac > 0 && d <= CONTACT_RANGE + e.def.size / 4 && e.hitCdMs <= 0 && !e.def.shell) {
        e.hitCdMs = e.def.hitCooldownMs;
        contacts.push({ entity: e, damageFrac: e.def.damageFrac, dot: e.def.dot });
      }
    }
  }
  return contacts;
}

/** Duração do sinal de cada padrão (ms): o jogador sempre vê o aviso antes do golpe. */
export const BOSS_TELEGRAPH_MS: Record<BossPattern, number> = { sweep: 900, ink: 600, summon: 700, lure: 1600 };
const MAX_SUMMONS = 4;

/** Ciclo de padrões de um mini-chefe: espera, sinaliza, golpeia. */
function stepBoss(sim: DiveSim, e: DiveEntity, dtMs: number, player: Pt, contacts: Contact[]) {
  const b = e.boss!;
  const cfg = e.def.boss!;
  if (!b.telegraph) {
    b.timerMs -= dtMs;
    if (b.timerMs <= 0) {
      const kind = cfg.patterns[b.patIdx % cfg.patterns.length];
      b.patIdx += 1;
      b.telegraph = { kind, msLeft: BOSS_TELEGRAPH_MS[kind], totalMs: BOSS_TELEGRAPH_MS[kind], x: e.x, y: e.y, r: cfg.radius };
      b.timerMs = cfg.everyMs;
    }
    return;
  }
  const tg = b.telegraph;
  tg.msLeft -= dtMs;
  if (tg.kind === 'lure') {
    // isca: a luz puxa o jogador para perto do chefe
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > 28) sim.pull = { x: (dx / d) * 70, y: (dy / d) * 70 };
  }
  if (tg.msLeft > 0) return;
  b.telegraph = null;
  const dd = dist(e, player);
  if (tg.kind === 'sweep' && dist(tg, player) <= tg.r) contacts.push({ entity: e, damageFrac: e.def.damageFrac * 1.6 });
  else if (tg.kind === 'lure' && dd <= CONTACT_RANGE + e.def.size / 2) contacts.push({ entity: e, damageFrac: e.def.damageFrac * 1.4 });
  else if (tg.kind === 'ink') sim.inkMs = 3000;
  else if (tg.kind === 'summon') {
    const alive = sim.entities.filter((x) => x.def.id === 'octopus_baby' && x.state !== 'dead').length;
    for (let i = 0; i < 2 && alive + i < MAX_SUMMONS; i++) {
      const def = CREATURES.octopus_baby;
      sim.summons += 1;
      const ang = (sim.summons * 2.4) % (Math.PI * 2);
      const px = e.x + Math.cos(ang) * 70;
      const py = e.y + Math.sin(ang) * 70;
      const x = solidAt(sim, px, py) ? e.x : px;
      const y = solidAt(sim, px, py) ? e.y : py;
      const baby: DiveEntity = {
        uid: `${e.uid}:s${sim.summons}`, def, x, y, hp: def.hp, state: 'chase', hitCdMs: 600, shellClosed: false, shellMs: 2000,
        wanderTo: { x, y }, wanderMs: 0, helped: false, streak: { light: 0, heavy: 0 }, angry: true,
      };
      sim.entities.push(baby);
      sim.spawned.push(baby);
    }
  }
}

export interface StrikeResult {
  hits: { entity: DiveEntity; damage: number; mult: number; killed: boolean }[];
  kills: DiveEntity[];
}

/** Alcance do golpe do jogador (px) e a largura do cone (cos do ângulo). */
export const STRIKE_RANGE = 64;

/**
 * Golpe do jogador. `baseDamage` já vem com arma, nível e crítico (o chamador usa o sistema de dano do jogo).
 * Vulnerabilidades, resistências, casca e ADAPTAÇÃO entram aqui:
 * criatura que aprende (polvo) resiste cada vez mais ao golpe repetido, até 40% (e o outro golpe a "desacostuma").
 */
export function playerStrike(sim: DiveSim, player: Pt, facing: Pt, attack: DiveAttack, baseDamage: number): StrikeResult {
  const res: StrikeResult = { hits: [], kills: [] };
  const fl = Math.hypot(facing.x, facing.y) || 1;
  const fx = facing.x / fl;
  const fy = facing.y / fl;
  const range = attack === 'heavy' ? STRIKE_RANGE + 12 : STRIKE_RANGE;
  for (const e of sim.entities) {
    if (e.state === 'dead') continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d > range + e.def.size / 3) continue;
    // cone à frente (colado ao corpo sempre acerta)
    if (d > 20 && (dx * fx + dy * fy) / d < 0.25) continue;
    let mult = attackMultVs(e.def, attack, e.shellClosed);
    if (e.def.learns) {
      const same = e.streak[attack];
      mult *= Math.max(0.6, 1 - same * 0.08);
      e.streak[attack] += 1;
      e.streak[attack === 'light' ? 'heavy' : 'light'] = Math.floor(e.streak[attack === 'light' ? 'heavy' : 'light'] / 2);
    }
    const damage = Math.max(1, Math.round(baseDamage * mult));
    e.hp -= damage;
    if (e.def.ink) sim.inkMs = 2500;
    // neutra atacada fica brava; amigável atacada foge
    if (e.def.behavior === 'neutral') e.angry = true;
    if (e.def.behavior === 'friendly') e.state = 'flee';
    if (e.state === 'hidden' || e.state === 'idle') e.state = e.def.behavior === 'friendly' ? 'flee' : 'chase';
    const killed = e.hp <= 0;
    if (killed) {
      e.state = 'dead';
      res.kills.push(e);
    }
    res.hits.push({ entity: e, damage, mult, killed });
  }
  return res;
}

export interface FeedResult {
  ok: boolean;
  reason?: 'not_friendly' | 'already' | 'far';
  gift?: { itemId: string; qty: number };
}

/** Alimentar/conversar com uma criatura amigável: dá o presente dela uma vez. */
export function feedCreature(sim: DiveSim, uid: string, player: Pt): FeedResult {
  const e = sim.entities.find((x) => x.uid === uid);
  if (!e || e.def.behavior === 'hostile') return { ok: false, reason: 'not_friendly' };
  if (e.def.behavior === 'neutral' || (e.def.behavior === 'rare' && !e.def.gift)) return { ok: false, reason: 'not_friendly' };
  if (dist(e, player) > 70 + e.def.size / 2) return { ok: false, reason: 'far' };
  if (e.helped) return { ok: false, reason: 'already' };
  e.helped = true;
  return { ok: true, gift: e.def.gift };
}

/** Criatura amigável mais próxima do jogador dentro do alcance de conversa. */
export function nearestFriend(sim: DiveSim, player: Pt): DiveEntity | null {
  let best: DiveEntity | null = null;
  let bd = 1e9;
  for (const e of sim.entities) {
    if (e.state === 'dead' || e.def.behavior === 'hostile' || e.def.behavior === 'neutral') continue;
    if (e.def.behavior === 'rare' && !e.def.gift) continue;
    const d = dist(e, player);
    if (d < 70 + e.def.size / 2 && d < bd) {
      best = e;
      bd = d;
    }
  }
  return best;
}

// ---- MAR ABERTO: criaturas por área (chunks) ---------------------------------------------------------------------
export const WORLD_SITE: DiveSite = { id: 'mar_aberto', name: 'Mar Aberto', kind: 'hub', mood: 'reef', w: 1, h: 1, rooms: [], exit: { x: -1, y: -1 }, air: [] };

/** Simulação vazia do mar aberto: as criaturas nascem por área à medida que o jogador se move (`syncWorldChunks`). */
export function createWorldSim(): DiveSim {
  return { site: WORLD_SITE, grid: [], getTile: (tx, ty) => seaChar(tx, ty), entities: [], inkMs: 0, pull: { x: 0, y: 0 }, spawned: [], summons: 0, chunks: new Set() };
}

/** Raio (em chunks) povoado ao redor do jogador e a partir de qual distância uma área é descarregada. */
export const LOAD_RADIUS = 2;
export const UNLOAD_RADIUS = 3;

const chunkKey = (cx: number, cy: number) => `${cx},${cy}`;

/**
 * Povoa as áreas perto do jogador (determinístico) e descarrega as distantes. Criatura morta não volta enquanto a área
 * continua carregada; ao voltar depois de se afastar, a área é povoada de novo. Devolve as criaturas novas (para o diário).
 */
export function syncWorldChunks(sim: DiveSim, playerTileX: number, playerTileY: number, opt: { questWhale?: boolean } = {}): DiveEntity[] {
  const chunks = (sim.chunks ??= new Set());
  const pcx = Math.floor(playerTileX / CHUNK);
  const pcy = Math.floor(playerTileY / CHUNK);
  const added: DiveEntity[] = [];
  for (let cy = pcy - LOAD_RADIUS; cy <= pcy + LOAD_RADIUS; cy++) {
    for (let cx = pcx - LOAD_RADIUS; cx <= pcx + LOAD_RADIUS; cx++) {
      const key = chunkKey(cx, cy);
      if (chunks.has(key)) continue;
      chunks.add(key);
      chunkSpawns(cx, cy, opt).forEach((sp, i) => {
        const def = CREATURES[sp.creature];
        if (!def) return;
        // nunca nasce em cima do jogador
        if (Math.hypot(sp.x - playerTileX, sp.y - playerTileY) < 9) return;
        const x = sp.x * TILE + TILE / 2;
        const y = sp.y * TILE + TILE / 2;
        const e: DiveEntity = {
          uid: `w:${key}:${i}`, def, x, y, hp: def.hp, state: def.ambush ? 'hidden' : 'idle', hitCdMs: 0, shellClosed: false, shellMs: 2000,
          wanderTo: { x, y }, wanderMs: 0, helped: false, streak: { light: 0, heavy: 0 }, angry: false,
        };
        sim.entities.push(e);
        added.push(e);
      });
    }
  }
  // descarrega as áreas distantes
  for (const key of [...chunks]) {
    const [cx, cy] = key.split(',').map(Number);
    if (Math.max(Math.abs(cx - pcx), Math.abs(cy - pcy)) > UNLOAD_RADIUS) {
      chunks.delete(key);
      sim.entities = sim.entities.filter((e) => !e.uid.startsWith(`w:${key}:`) && !e.uid.startsWith(`${'w:' + key}`));
    }
  }
  return added;
}
