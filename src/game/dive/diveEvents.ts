/**
 * EVENTOS ALEATÓRIOS do mergulho (lógica pura). Ao entrar num local, às vezes acontece algo: um baú à deriva, um cardume
 * dourado, um filhote perdido, um mergulhador em apuros, uma visita rara ou uma maré forte. Cada evento é temporário,
 * tem consequência real (moedas, XP, itens, contadores) e nunca se repete duas vezes seguidas. Nada é sorteado por quadro.
 */
import { TILE, isSolidChar, pathLength, type DiveSite, type Pt } from './diveSites';
import { seaChar } from './seaWorld';

export type EventKind = 'floating_chest' | 'golden_school' | 'lost_pup' | 'sos_diver' | 'rare_visit' | 'tide_surge';
export const EVENT_KINDS: EventKind[] = ['floating_chest', 'golden_school', 'lost_pup', 'sos_diver', 'rare_visit', 'tide_surge'];

export interface EventDef {
  id: EventKind;
  name: string;
  /** Aviso ao começar (humor, sem travessão). */
  line: string;
  weight: number;
  /** Duração do evento (ms). */
  durationMs: number;
}

export const EVENTS: Record<EventKind, EventDef> = {
  floating_chest: { id: 'floating_chest', name: 'Baú à Deriva', line: 'Um baú boia por aí. Alguém perdeu o dia.', weight: 30, durationMs: 80000 },
  golden_school: { id: 'golden_school', name: 'Cardume Dourado', line: 'Um cardume dourado passou brilhando. Cada peixe vale um troco.', weight: 25, durationMs: 45000 },
  lost_pup: { id: 'lost_pup', name: 'Filhote Perdido', line: 'Um filhotinho de peixe se perdeu da mãe e olha para você.', weight: 20, durationMs: 90000 },
  sos_diver: { id: 'sos_diver', name: 'Mergulhador em Apuros', line: 'Um mergulhador acena sem ar. Uma poção de fôlego resolveria.', weight: 18, durationMs: 90000 },
  rare_visit: { id: 'rare_visit', name: 'Visita Rara', line: 'Uma luz violeta sobe do fundo. Visita rara, e nada simpática.', weight: 7, durationMs: 70000 },
  tide_surge: { id: 'tide_surge', name: 'Maré Forte', line: 'A maré virou! Uma correnteza forte varre o local.', weight: 14, durationMs: 22000 },
};

export interface EventReward {
  coins?: number;
  xp?: number;
  items?: Record<string, number>;
}

export interface EventSpot {
  uid: string;
  kind: 'chest' | 'coin' | 'help' | 'sos';
  x: number;
  y: number;
  reward: EventReward;
  /** Itens aceitos (mergulhador em apuros): gasta o primeiro que o jogador tiver. */
  needs?: string[];
  taken: boolean;
}

export interface ActiveEvent {
  id: EventKind;
  msLeft: number;
  spots: EventSpot[];
  /** Correnteza do local inteiro enquanto o evento durar (px/s). */
  surge?: { dx: number; dy: number };
  /** Criatura extra que aparece (visita rara). */
  creature?: { id: string; x: number; y: number };
}

export interface EventHistory {
  last: EventKind | null;
  counts: Partial<Record<EventKind, number>>;
}

export interface RollOptions {
  rng?: () => number;
  /** Quantos locais/criaturas o jogador já conhece (visita rara só para quem já viu algumas). */
  creaturesKnown?: number;
  /** Probabilidade de acontecer algo ao entrar (padrão 0,45). */
  chance?: number;
  /** Força um evento específico (testes e eventos de história). */
  force?: EventKind;
}

/** Tiles abertos e alcançáveis a partir da saída/portão, longe do ponto de entrada. */
export function openSpots(site: DiveSite, grid: string[][], from: Pt, minDist = 5): Pt[] {
  const out: Pt[] = [];
  for (let y = 1; y < site.h - 1; y++) {
    for (let x = 1; x < site.w - 1; x++) {
      const c = grid[y][x];
      if (isSolidChar(c) || c === 'A' || c === 'U' || c === '~' || c === 'k') continue;
      const d = pathLength(grid, from, { x, y });
      if (d >= minDist) out.push({ x, y });
    }
  }
  return out;
}

const pick = <T,>(arr: T[], rng: () => number): T => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
const center = (p: Pt): Pt => ({ x: p.x * TILE + TILE / 2, y: p.y * TILE + TILE / 2 });

/** Escolhe o tipo do evento: pesos, sem repetir o último, com condições por local. */
export function pickEventKind(site: DiveSite, hist: EventHistory, rng: () => number, opt: RollOptions): EventKind {
  const pool = EVENT_KINDS.filter((k) => {
    if (k === hist.last) return false; // nunca repete duas vezes seguidas
    if (k === 'rare_visit' && (opt.creaturesKnown ?? 0) < 3) return false;
    return true;
  });
  const total = pool.reduce((s, k) => s + EVENTS[k].weight, 0);
  let r = rng() * total;
  for (const k of pool) {
    r -= EVENTS[k].weight;
    if (r <= 0) return k;
  }
  return pool[pool.length - 1];
}

/** Sorteia um evento para o local, ou null (nada acontece). */
export function rollEvent(site: DiveSite, grid: string[][], hist: EventHistory, entry: Pt, opt: RollOptions = {}): ActiveEvent | null {
  const rng = opt.rng ?? Math.random;
  if (!opt.force && rng() >= (opt.chance ?? 0.45)) return null;
  const kind = opt.force ?? pickEventKind(site, hist, rng, opt);
  const spots = openSpots(site, grid, entry);
  if (spots.length < 6) return null;
  const def = EVENTS[kind];
  const ev: ActiveEvent = { id: kind, msLeft: def.durationMs, spots: [] };
  const mk = (n: number, kindS: EventSpot['kind'], reward: (i: number) => EventReward, needs?: string[]) => {
    const used = new Set<string>();
    for (let i = 0; i < n; i++) {
      let p = pick(spots, rng);
      for (let tries = 0; tries < 8 && used.has(`${p.x},${p.y}`); tries++) p = pick(spots, rng);
      used.add(`${p.x},${p.y}`);
      const c = center(p);
      ev.spots.push({ uid: `${kind}:${i}`, kind: kindS, x: c.x, y: c.y, reward: reward(i), needs, taken: false });
    }
  };
  switch (kind) {
    case 'floating_chest': {
      const items = pick<Record<string, number>>([{ bubble_potion: 2 }, { kelp_snack: 3 }, { coral_shard: 1 }, { air_flask: 1 }], rng);
      mk(1, 'chest', () => ({ coins: 40 + Math.floor(rng() * 80), xp: 30, items }));
      break;
    }
    case 'golden_school':
      mk(5, 'coin', () => ({ coins: 25, xp: 6 }));
      break;
    case 'lost_pup':
      mk(1, 'help', () => ({ xp: 60, items: { kelp_snack: 2 } }));
      break;
    case 'sos_diver':
      mk(1, 'sos', (): EventReward => ({ coins: 120, xp: 90, items: rng() < 0.35 ? { pearl: 1 } : { diver_badge: 1 } }), ['bubble_potion', 'kelp_snack', 'air_flask']);
      break;
    case 'rare_visit': {
      const c = center(pick(spots, rng));
      ev.creature = { id: 'jelly_violet', x: c.x, y: c.y };
      break;
    }
    case 'tide_surge':
      ev.surge = { dx: rng() < 0.5 ? -42 : 42, dy: 0 };
      break;
  }
  return ev;
}

/** Passa o tempo do evento; devolve false quando acabou. */
export function tickEvent(ev: ActiveEvent, dtMs: number): boolean {
  ev.msLeft -= dtMs;
  if (ev.msLeft <= 0) return false;
  if (ev.spots.length > 0 && ev.spots.every((s) => s.taken)) return false;
  return true;
}

export interface SpotOutcome {
  ok: boolean;
  reason?: 'taken' | 'need_item';
  reward?: EventReward;
  /** Item que o jogador gastou (mergulhador em apuros). */
  consumed?: string;
}

/** Interage com um ponto do evento. `has(id)` diz se o jogador tem o item. Marca como pego só se der certo. */
export function useSpot(spot: EventSpot, has: (itemId: string) => boolean): SpotOutcome {
  if (spot.taken) return { ok: false, reason: 'taken' };
  let consumed: string | undefined;
  if (spot.needs) {
    consumed = spot.needs.find((id) => has(id));
    if (!consumed) return { ok: false, reason: 'need_item' };
  }
  spot.taken = true;
  return { ok: true, reward: spot.reward, consumed };
}

/** Registra o evento no histórico (anti-repetição e contagem). */
export function recordEvent(hist: EventHistory, kind: EventKind): EventHistory {
  return { last: kind, counts: { ...hist.counts, [kind]: (hist.counts[kind] ?? 0) + 1 } };
}

/**
 * Evento do MAR ABERTO: acontece ao redor do jogador (entre 7 e 18 tiles dele), em água aberta e afastada de rochas.
 * Mesmos tipos, mesma regra de não repetir. `rng` injetável.
 */
export function rollWorldEvent(center: Pt, hist: EventHistory, opt: RollOptions = {}): ActiveEvent | null {
  const rng = opt.rng ?? Math.random;
  if (!opt.force && rng() >= (opt.chance ?? 0.35)) return null;
  const spots: Pt[] = [];
  for (let i = 0; i < 80 && spots.length < 24; i++) {
    const ang = rng() * Math.PI * 2;
    const r = 7 + rng() * 11;
    const x = Math.round(center.x + Math.cos(ang) * r);
    const y = Math.round(center.y + Math.sin(ang) * r);
    const c = seaChar(x, y);
    if (c !== '.' && c !== ':') continue;
    let clear = true;
    for (let dy = -1; dy <= 1 && clear; dy++) for (let dx = -1; dx <= 1; dx++) if (isSolidChar(seaChar(x + dx, y + dy))) clear = false;
    if (clear) spots.push({ x, y });
  }
  if (spots.length < 6) return null;
  const kind = opt.force ?? pickEventKind({ kind: 'hub' } as DiveSite, hist, rng, opt);
  const def = EVENTS[kind];
  const ev: ActiveEvent = { id: kind, msLeft: def.durationMs, spots: [] };
  const mk = (n: number, kindS: EventSpot['kind'], reward: (i: number) => EventReward, needs?: string[]) => {
    for (let i = 0; i < n; i++) {
      const p = spots[Math.min(spots.length - 1, Math.floor(rng() * spots.length))];
      const c = { x: p.x * TILE + TILE / 2, y: p.y * TILE + TILE / 2 };
      ev.spots.push({ uid: `${kind}:${i}`, kind: kindS, x: c.x, y: c.y, reward: reward(i), needs, taken: false });
    }
  };
  switch (kind) {
    case 'floating_chest': {
      const items = [{ bubble_potion: 2 }, { kelp_snack: 3 }, { coral_shard: 1 }, { air_flask: 1 }][Math.floor(rng() * 4)] as Record<string, number>;
      mk(1, 'chest', () => ({ coins: 40 + Math.floor(rng() * 80), xp: 30, items }));
      break;
    }
    case 'golden_school':
      mk(5, 'coin', () => ({ coins: 25, xp: 6 }));
      break;
    case 'lost_pup':
      mk(1, 'help', () => ({ xp: 60, items: { kelp_snack: 2 } }));
      break;
    case 'sos_diver':
      mk(1, 'sos', (): EventReward => ({ coins: 120, xp: 90, items: rng() < 0.35 ? { pearl: 1 } : { diver_badge: 1 } }), ['bubble_potion', 'kelp_snack', 'air_flask']);
      break;
    case 'rare_visit': {
      const p = spots[Math.floor(rng() * spots.length)];
      ev.creature = { id: 'jelly_violet', x: p.x * TILE + TILE / 2, y: p.y * TILE + TILE / 2 };
      break;
    }
    case 'tide_surge':
      ev.surge = { dx: rng() < 0.5 ? -42 : 42, dy: 0 };
      break;
  }
  return ev;
}
