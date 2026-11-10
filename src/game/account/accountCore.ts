/**
 * NÚCLEO PURO da CONTA do jogador (perfil global). Sem React e sem AsyncStorage: tudo aqui são funções que recebem a conta
 * e devolvem uma conta nova, para poder ser testado em Node (tools/test-conta.mjs) e para a store (accountState.ts) só
 * cuidar de guardar/avisar. A conta vive FORA dos slots: apagar um save nunca mexe nela.
 */
import { ACHIEVEMENTS, ACH_BY_ID, type Cond, type SetName } from './achievementDefs';
import { DIAMOND_RATES, NICK_MAX, COIN_PACKS } from './accountConfig';
import { BG_BY_ID, DEFAULT_AVATAR, DEFAULT_BG, DEFAULT_FRAME, FRAME_BY_ID, FREE_AVATARS, avatarNeedsUnlock, avatarPrice } from './profileDefs';
import { AVATAR_BY_ID } from './avatarList';
import { COSMETIC_BY_ID } from '@/game/cosmetics/cosmeticDefs';

export const ACCOUNT_VERSION = 1;

export interface Account {
  v: number;
  /** null = ainda não escolheu (a tela inicial pede no primeiro acesso) */
  nick: string | null;
  /** lutador favorito (só entre os liberados) */
  favorite: string | null;
  avatar: string;
  bg: string;
  frame: string;
  avatarsOwned: string[];
  bgOwned: string[];
  framesOwned: string[];
  /** cosméticos (chapéu/capa/skin) que a conta já conseguiu: valem em TODOS os saves */
  cosmetics: string[];
  diamonds: number;
  /** id da conquista -> quando saiu (ms) */
  achievements: Record<string, number>;
  stats: Record<string, number>;
  sets: Record<string, string[]>;
  /** teto diário do VERSUS: { day: 'AAAA-MM-DD', versus: diamantes ganhos no dia } */
  daily: { day: string; versus: number };
  createdAt: number;
}

export function emptyAccount(now = Date.now()): Account {
  return {
    v: ACCOUNT_VERSION, nick: null, favorite: null, avatar: DEFAULT_AVATAR, bg: DEFAULT_BG, frame: DEFAULT_FRAME,
    avatarsOwned: [...FREE_AVATARS], bgOwned: [], framesOwned: [DEFAULT_FRAME], cosmetics: [], diamonds: 0,
    achievements: {}, stats: {}, sets: {}, daily: { day: '', versus: 0 }, createdAt: now,
  };
}

const strArr = (v: unknown): string[] => (Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === 'string'))) : []);
const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

export function cleanNick(s: string): string {
  return s.replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, NICK_MAX);
}

/** Lê o JSON guardado com tolerância total: valores ruins viram o padrão, itens desconhecidos são descartados. */
export function sanitizeAccount(raw: unknown, now = Date.now()): Account {
  const base = emptyAccount(now);
  if (!raw || typeof raw !== 'object') return base;
  const d = raw as Record<string, unknown>;
  const a: Account = { ...base };
  a.nick = typeof d.nick === 'string' && cleanNick(d.nick) ? cleanNick(d.nick) : null;
  a.avatarsOwned = Array.from(new Set([...FREE_AVATARS, ...strArr(d.avatarsOwned).filter((id) => AVATAR_BY_ID[id])]));
  a.bgOwned = strArr(d.bgOwned).filter((id) => BG_BY_ID[id] && BG_BY_ID[id].kind !== 'solid');
  a.framesOwned = Array.from(new Set([DEFAULT_FRAME, ...strArr(d.framesOwned).filter((id) => FRAME_BY_ID[id])]));
  a.cosmetics = strArr(d.cosmetics).filter((id) => COSMETIC_BY_ID[id]);
  a.avatar = typeof d.avatar === 'string' && a.avatarsOwned.includes(d.avatar) ? d.avatar : DEFAULT_AVATAR;
  a.bg = typeof d.bg === 'string' && BG_BY_ID[d.bg] && (BG_BY_ID[d.bg].kind === 'solid' || a.bgOwned.includes(d.bg)) ? d.bg : DEFAULT_BG;
  a.frame = typeof d.frame === 'string' && a.framesOwned.includes(d.frame) ? d.frame : DEFAULT_FRAME;
  a.favorite = typeof d.favorite === 'string' ? d.favorite : null;
  a.diamonds = Math.floor(num(d.diamonds));
  const ach: Record<string, number> = {};
  if (d.achievements && typeof d.achievements === 'object') for (const [k, v] of Object.entries(d.achievements as Record<string, unknown>)) if (ACH_BY_ID[k]) ach[k] = num(v, now);
  a.achievements = ach;
  const stats: Record<string, number> = {};
  if (d.stats && typeof d.stats === 'object') for (const [k, v] of Object.entries(d.stats as Record<string, unknown>)) stats[k] = num(v);
  a.stats = stats;
  const sets: Record<string, string[]> = {};
  if (d.sets && typeof d.sets === 'object') for (const [k, v] of Object.entries(d.sets as Record<string, unknown>)) sets[k] = strArr(v);
  a.sets = sets;
  if (d.daily && typeof d.daily === 'object') {
    const dd = d.daily as Record<string, unknown>;
    a.daily = { day: typeof dd.day === 'string' ? dd.day : '', versus: Math.max(0, num(dd.versus)) };
  }
  a.createdAt = num(d.createdAt, now);
  return a;
}

/* ───────────── contadores e conjuntos ───────────── */

export function bump(a: Account, stat: string, n = 1): Account {
  return { ...a, stats: { ...a.stats, [stat]: (a.stats[stat] ?? 0) + n } };
}
export function setMax(a: Account, stat: string, v: number): Account {
  return (a.stats[stat] ?? 0) >= v ? a : { ...a, stats: { ...a.stats, [stat]: v } };
}
export function addToSet(a: Account, set: SetName, id: string): Account {
  const cur = getSet(a, set);
  if (cur.includes(id)) return a;
  if (set === 'cosmetics') return a.cosmetics.includes(id) ? a : { ...a, cosmetics: [...a.cosmetics, id] };
  return { ...a, sets: { ...a.sets, [set]: [...cur, id] } };
}
export function getSet(a: Account, set: SetName): string[] {
  if (set === 'cosmetics') return a.cosmetics;
  if (set === 'avatars') return a.avatarsOwned;
  if (set === 'backgrounds') return a.bgOwned;
  if (set === 'frames') return a.framesOwned;
  return a.sets[set] ?? [];
}

/* ───────────── conquistas ───────────── */

export function condMet(a: Account, c: Cond): boolean {
  if ('stat' in c) return (a.stats[c.stat] ?? 0) >= c.gte;
  if ('has' in c) return getSet(a, c.in).includes(c.has);
  if ('count' in c) return getSet(a, c.count).length >= c.gte;
  const have = new Set(getSet(a, c.in));
  return c.all.length > 0 && c.all.every((x) => have.has(x));
}

/** Progresso (atual/meta) para mostrar barrinha nas conquistas de contador. null = conquista de "sim ou não". */
export function condProgress(a: Account, c: Cond): { cur: number; max: number } | null {
  if ('stat' in c) return { cur: Math.min(a.stats[c.stat] ?? 0, c.gte), max: c.gte };
  if ('count' in c) return { cur: Math.min(getSet(a, c.count).length, c.gte), max: c.gte };
  if ('all' in c) {
    const have = new Set(getSet(a, c.in));
    return { cur: c.all.filter((x) => have.has(x)).length, max: c.all.length };
  }
  return null;
}

/** Libera as conquistas cuja condição já vale. Cada uma rende diamantes pela raridade. Devolve a conta nova + as novas. */
export function evaluateAchievements(a: Account, now = Date.now()): { account: Account; unlocked: string[] } {
  const unlocked: string[] = [];
  let cur = a;
  // repete porque o prêmio em diamantes pode completar outra conquista (ex.: "ganhe 100 diamantes")
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const def of ACHIEVEMENTS) {
      if (cur.achievements[def.id] !== undefined || !condMet(cur, def.cond)) continue;
      const prize = DIAMOND_RATES.achievement[def.rarity] ?? 0;
      cur = { ...cur, achievements: { ...cur.achievements, [def.id]: now }, diamonds: cur.diamonds + prize };
      cur = bump(cur, 'diamonds_earned', prize);
      unlocked.push(def.id);
      changed = true;
    }
    if (!changed) break;
  }
  return { account: cur, unlocked };
}

/* ───────────── Diamond Meme ───────────── */

export function grantDiamonds(a: Account, n: number): Account {
  const g = Math.max(0, Math.floor(n));
  if (!g) return a;
  return bump({ ...a, diamonds: a.diamonds + g }, 'diamonds_earned', g);
}

export function spendDiamonds(a: Account, n: number): Account | null {
  if (n < 0 || a.diamonds < n) return null;
  return { ...a, diamonds: a.diamonds - n };
}

const dayKey = (now: number) => new Date(now).toISOString().slice(0, 10);

/** Diamantes de uma vitória contra a CPU, respeitando o teto diário. Devolve a conta nova e quanto de fato rendeu. */
export function grantVersusWin(a: Account, difficulty: keyof typeof DIAMOND_RATES.versusWin, now = Date.now()): { account: Account; gained: number } {
  const day = dayKey(now);
  const used = a.daily.day === day ? a.daily.versus : 0;
  const gain = Math.max(0, Math.min(DIAMOND_RATES.versusWin[difficulty] ?? 0, DIAMOND_RATES.versusDailyCap - used));
  let acc: Account = { ...a, daily: { day, versus: used + gain } };
  if (gain > 0) acc = grantDiamonds(acc, gain);
  return { account: acc, gained: gain };
}

/** Diamantes de um andar da Torre: só rende em andar NOVO (acima do melhor já alcançado). */
export function towerFloorDiamonds(prevBest: number, floor: number): number {
  if (floor <= prevBest) return 0;
  if (floor % 10 === 0) return DIAMOND_RATES.towerFloorBoss;
  if (floor % 5 === 0) return DIAMOND_RATES.towerFloor5;
  return DIAMOND_RATES.towerFloor;
}

/* ───────────── loja do perfil ───────────── */

export type BuyResult = { ok: true; account: Account } | { ok: false; reason: 'owned' | 'unknown' | 'locked' | 'poor' };

/**
 * Compra um ícone de perfil. Personagem JOGÁVEL só vende depois de liberado (`unlockedFighters`); amigos e memes NÃO jogáveis
 * (NPCs, memes do cassino, parentes...) vendem direto, mesmo sem nunca terem sido encontrados no mapa.
 */
export function buyAvatar(a: Account, fighter: string, unlockedFighters: string[]): BuyResult {
  if (!AVATAR_BY_ID[fighter]) return { ok: false, reason: 'unknown' };
  if (a.avatarsOwned.includes(fighter)) return { ok: false, reason: 'owned' };
  if (avatarNeedsUnlock(fighter) && !unlockedFighters.includes(fighter)) return { ok: false, reason: 'locked' };
  const paid = spendDiamonds(a, avatarPrice(fighter));
  if (!paid) return { ok: false, reason: 'poor' };
  return { ok: true, account: bump({ ...paid, avatarsOwned: [...paid.avatarsOwned, fighter] }, 'bought_avatars') };
}
export function buyBackground(a: Account, id: string): BuyResult {
  const def = BG_BY_ID[id];
  if (!def) return { ok: false, reason: 'unknown' };
  if (def.kind === 'solid' || a.bgOwned.includes(id)) return { ok: false, reason: 'owned' };
  const paid = spendDiamonds(a, def.price);
  if (!paid) return { ok: false, reason: 'poor' };
  return { ok: true, account: bump({ ...paid, bgOwned: [...paid.bgOwned, id] }, 'bought_backgrounds') };
}
export function buyFrame(a: Account, id: string): BuyResult {
  const def = FRAME_BY_ID[id];
  if (!def) return { ok: false, reason: 'unknown' };
  if (a.framesOwned.includes(id)) return { ok: false, reason: 'owned' };
  const paid = spendDiamonds(a, def.price);
  if (!paid) return { ok: false, reason: 'poor' };
  return { ok: true, account: bump({ ...paid, framesOwned: [...paid.framesOwned, id] }, 'bought_frames') };
}

export function setAvatar(a: Account, fighter: string): Account {
  return a.avatarsOwned.includes(fighter) ? { ...a, avatar: fighter } : a;
}
export function setBackground(a: Account, id: string): Account {
  const d = BG_BY_ID[id];
  return d && (d.kind === 'solid' || a.bgOwned.includes(id)) ? { ...a, bg: id } : a;
}
export function setFrame(a: Account, id: string): Account {
  return a.framesOwned.includes(id) ? { ...a, frame: id } : a;
}
export function setFavorite(a: Account, fighter: string | null, unlockedFighters: string[]): Account {
  if (fighter !== null && !unlockedFighters.includes(fighter)) return a;
  return { ...a, favorite: fighter };
}

/** Compra um pacote de Meme Coins; devolve a conta com os diamantes gastos e quantas moedas entregar. */
export function buyCoinPack(a: Account, packId: string): { account: Account; coins: number } | null {
  const pack = COIN_PACKS.find((p) => p.id === packId);
  if (!pack) return null;
  const paid = spendDiamonds(a, pack.diamonds);
  return paid ? { account: bump(paid, 'exchanges'), coins: pack.coins } : null;
}
