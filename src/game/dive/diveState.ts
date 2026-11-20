import { registerSaveExt } from '@/game/state/saveExt';
import { noteStat } from '@/game/account/accountState';
import { addCoins, addItem, addXp, getEquippedArmorId, getInventory, giveArmor, removeItem } from '@/game/state/playerState';
import { hasFlag, setFlag } from '@/game/state/storyFlags';
import { ITEMS } from '@/game/items/itemDefs';
import { ARMORS, armorBreathOf } from '@/game/items/armorDefs';
import { NO_BREATH_MODS, combineMods, type BreathMods } from './breath';
import { ALL_SITES, CROSSINGS, SECRET_MISSION_OF_WALL, type DiveChest } from './diveSites';
import { EVENT_KINDS, recordEvent, type EventHistory, type EventKind } from './diveEvents';

/**
 * ESTADO PERSISTENTE DO MERGULHO (vai no save, em `ext.dive`): locais descobertos, baús abertos, paredes secretas reveladas,
 * registro de criaturas, elixir ativo e estatísticas. Tudo por IDs estáveis (locais, baús, criaturas, paredes).
 * Operações previsíveis e sem depender de componentes visuais, para facilitar uma sincronização futura.
 */
export interface CreatureRecord {
  seen: number;
  defeated: number;
  helped: boolean;
}

interface DiveData {
  discovered: string[];
  chests: string[];
  walls: string[];
  creatures: Record<string, CreatureRecord>;
  /** Elixir do Mergulhador ativo: multiplicador de gasto e tempo de mergulho restante. */
  buff: { drainMult: number; msLeft: number } | null;
  stats: { dives: number; swimSec: number; deepSec: number; infiniteSec: number; crossings: number; lowest: number };
  /** Travessias já concluídas (ids). */
  crossed: string[];
  /** Eventos aleatórios: o último e quantos de cada tipo já aconteceram (anti-repetição). */
  events: EventHistory;
  /** Cenas curtas já vistas. */
  scenes: string[];
}

const fresh = (): DiveData => ({ discovered: [], chests: [], walls: [], creatures: {}, buff: null, stats: { dives: 0, swimSec: 0, deepSec: 0, infiniteSec: 0, crossings: 0, lowest: 99 }, crossed: [], events: { last: null, counts: {} }, scenes: [] });
let data: DiveData = fresh();

function sanitize(raw: unknown): DiveData {
  const d = fresh();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<DiveData>;
  const strs = (a: unknown) => (Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : []);
  d.discovered = strs(r.discovered).filter((id) => !!ALL_SITES[id]);
  d.chests = strs(r.chests);
  d.walls = strs(r.walls);
  d.scenes = strs(r.scenes);
  d.crossed = strs(r.crossed).filter((id) => CROSSINGS.some((c) => c.id === id));
  if (r.events && typeof r.events === 'object') {
    const last = (r.events as EventHistory).last;
    d.events.last = EVENT_KINDS.includes(last as EventKind) ? (last as EventKind) : null;
    for (const k of EVENT_KINDS) {
      const n = Number((r.events as EventHistory).counts?.[k]);
      if (n > 0) d.events.counts[k] = n;
    }
  }
  if (r.creatures && typeof r.creatures === 'object') {
    for (const [k, v] of Object.entries(r.creatures)) {
      if (v && typeof v === 'object') d.creatures[k] = { seen: Number(v.seen) || 0, defeated: Number(v.defeated) || 0, helped: !!v.helped };
    }
  }
  if (r.buff && typeof r.buff === 'object' && Number(r.buff.msLeft) > 0) d.buff = { drainMult: Number(r.buff.drainMult) || 1, msLeft: Number(r.buff.msLeft) };
  if (r.stats && typeof r.stats === 'object') d.stats = { ...d.stats, ...r.stats };
  return d;
}

registerSaveExt({
  key: 'dive',
  snapshot: () => data,
  restore: (raw) => {
    data = sanitize(raw);
  },
  reset: () => {
    data = fresh();
  },
});

export function getDiveData(): Readonly<DiveData> {
  return data;
}

// ---- Locais, paredes, cenas --------------------------------------------------------------------------------
export function isDiscovered(siteId: string): boolean {
  return data.discovered.includes(siteId);
}
/** Marca o local como descoberto e levanta a bandeira `dive_site_<id>` (alimenta missões). Devolve true na 1ª vez. */
export function markDiscovered(siteId: string): boolean {
  if (!ALL_SITES[siteId] || data.discovered.includes(siteId)) return false;
  data.discovered = [...data.discovered, siteId];
  setFlag(`dive_site_${siteId}`);
  // "todos os locais" = os 9 destinos dos cais (as travessias não contam)
  const hubs = data.discovered.filter((d) => ALL_SITES[d]?.kind === 'hub').length;
  noteStat('dive_sites', hubs, 'max'); // conquista "Cartógrafo do Mar"
  if (hubs >= 9) setFlag('dive_all_sites');
  return true;
}
export function revealedWalls(): ReadonlySet<string> {
  return new Set(data.walls);
}
export function revealWall(id: string): boolean {
  if (data.walls.includes(id)) return false;
  data.walls = [...data.walls, id];
  setFlag(`dive_wall_${id}`);
  // Achar a parede secreta revela a missão secreta correspondente na lista.
  const m = SECRET_MISSION_OF_WALL[id];
  if (m) setFlag(`found:${m}`);
  noteStat('dive_secrets');
  return true;
}
export function sceneSeen(id: string): boolean {
  return data.scenes.includes(id);
}
export function markSceneSeen(id: string) {
  if (!data.scenes.includes(id)) data.scenes = [...data.scenes, id];
}
/** O local pode ser visitado? (algumas áreas pedem uma bandeira da história.) */
export function siteUnlocked(siteId: string): boolean {
  const need = ALL_SITES[siteId]?.requiresFlag;
  return !need || hasFlag(need);
}

// ---- Baús -------------------------------------------------------------------------------------------------
export function isChestOpen(id: string): boolean {
  return data.chests.includes(id);
}

export interface ChestResult {
  ok: boolean;
  reason?: 'opened';
  coins: number;
  xp: number;
  items: Record<string, number>;
  armor?: string;
}

/**
 * Abre um baú uma única vez. Entrega SEMPRE (como as recompensas de missão): bolsa cheia nunca trava um baú que levanta uma
 * bandeira da história. O jogador só precisa liberar espaço depois, se quiser carregar tudo.
 */
export function openChest(chest: DiveChest): ChestResult {
  const none: ChestResult = { ok: false, coins: 0, xp: 0, items: {} };
  if (data.chests.includes(chest.id)) return { ...none, reason: 'opened' };
  const items = chest.items ?? {};
  data.chests = [...data.chests, chest.id];
  const given: Record<string, number> = {};
  for (const [id, qty] of Object.entries(items)) {
    if (!ITEMS[id]) continue;
    const n = addItem(id, qty, true);
    if (n > 0) given[id] = n;
  }
  if (chest.coins) addCoins(chest.coins);
  if (chest.xp) addXp(chest.xp);
  if (chest.armor) giveArmor(chest.armor);
  if (chest.flag) setFlag(chest.flag);
  noteStat('dive_chests');
  const secretGot = Object.keys(given).filter((id) => ITEMS[id]?.rarity === 'secret').length + (chest.armor && ARMORS[chest.armor]?.rarity === 'secret' ? 1 : 0);
  if (secretGot > 0) noteStat('dive_secret_items', secretGot);
  return { ok: true, coins: chest.coins ?? 0, xp: chest.xp ?? 0, items: given, armor: chest.armor };
}

// ---- Criaturas (registro) ----------------------------------------------------------------------------------
function rec(id: string): CreatureRecord {
  return (data.creatures[id] ??= { seen: 0, defeated: 0, helped: false });
}
export function logCreatureSeen(id: string) {
  rec(id).seen += 1;
  noteStat('dive_known', creaturesKnown(), 'max'); // conquista "Enciclopédia do Mar"
}
export function logCreatureDefeated(id: string) {
  rec(id).defeated += 1;
  setFlag(`dive_beat_${id}`);
  noteStat('dive_kills');
  noteStat('dive_known', creaturesKnown(), 'max');
}
export function logCreatureHelped(id: string) {
  const r = rec(id);
  if (!r.helped) {
    noteStat('dive_helps');
    if (id === 'whale') noteStat('dive_help_whale');
  }
  r.helped = true;
  setFlag(`dive_help_${id}`);
  noteStat('dive_known', creaturesKnown(), 'max');
}
export function getCreatureRecord(id: string): CreatureRecord | undefined {
  return data.creatures[id];
}
export function creaturesKnown(): number {
  return Object.values(data.creatures).filter((c) => c.seen > 0 || c.defeated > 0 || c.helped).length;
}

// ---- Estatísticas ------------------------------------------------------------------------------------------
export function noteDiveStart() {
  data.stats.dives += 1;
  noteStat('dive_dives');
  setFlag('dive_first');
}
/** Tempo nadando. Só sincroniza com a conta quando vira o segundo (nada de gravar a cada quadro). */
export function noteSwim(sec: number, deep: boolean, infinite = false) {
  data.stats.swimSec += sec;
  if (deep) {
    const before = Math.floor(data.stats.deepSec);
    data.stats.deepSec += sec;
    if (Math.floor(data.stats.deepSec) > before) noteStat('dive_deep_sec', Math.floor(data.stats.deepSec), 'max');
  }
  if (infinite) {
    const before = Math.floor(data.stats.infiniteSec);
    data.stats.infiniteSec += sec;
    if (Math.floor(data.stats.infiniteSec) > before) noteStat('dive_infinite_sec', Math.floor(data.stats.infiniteSec), 'max');
  }
}
/** Terminou uma travessia: mergulhou numa ilha e emergiu em outra (`crossingId` é a rota, se for uma das 8). */
export function noteCrossing(crossingId?: string) {
  data.stats.crossings += 1;
  noteStat('dive_crossings');
  setFlag('dive_crossing_done');
  if (crossingId) {
    setFlag(`dive_cross_${crossingId}`);
    if (!data.crossed.includes(crossingId)) data.crossed = [...data.crossed, crossingId];
    noteStat('dive_cross_unique', data.crossed.length, 'max'); // conquista "Atravessa-Mares"
  }
}

// ---- Fôlego: equipamento + elixir + consumíveis ---------------------------------------------------------------
/** Efeitos de fôlego de agora: armadura equipada + elixir ativo. */
export function currentBreathMods(): BreathMods {
  const buff = data.buff && data.buff.msLeft > 0 ? { drainMult: data.buff.drainMult } : undefined;
  return combineMods(armorBreathOf(getEquippedArmorId()), buff) ?? NO_BREATH_MODS;
}
/** O tempo do elixir só passa dentro do mergulho. */
export function tickBuff(dtMs: number) {
  if (!data.buff) return;
  data.buff.msLeft -= dtMs;
  if (data.buff.msLeft <= 0) data.buff = null;
}
export function buffMsLeft(): number {
  return data.buff?.msLeft ?? 0;
}

/** Consumíveis de mergulho que o jogador tem (para os botões da cena). */
export function diveConsumables(): { id: string; qty: number }[] {
  const inv = getInventory();
  return Object.keys(ITEMS)
    .filter((id) => (inv[id] ?? 0) > 0 && ITEMS[id].effects.some((e) => e.kind === 'breath' || e.kind === 'breathBuff'))
    .map((id) => ({ id, qty: inv[id] }));
}

export interface UseResult {
  ok: boolean;
  /** Segundos de fôlego devolvidos agora. */
  breathSec: number;
  buff: boolean;
}

/**
 * Usa um consumível de mergulho. Gasta 1 do inventário só se o efeito valer:
 * um elixir já ativo não é gasto de novo, e fôlego infinito não gasta poção à toa.
 */
export function useDiveItem(itemId: string, opts: { infinite?: boolean } = {}): UseResult {
  const def = ITEMS[itemId];
  const none: UseResult = { ok: false, breathSec: 0, buff: false };
  if (!def || (getInventory()[itemId] ?? 0) <= 0) return none;
  let breathSec = 0;
  let buff = false;
  for (const e of def.effects) {
    if (e.kind === 'breath' && !opts.infinite) breathSec += e.seconds;
    if (e.kind === 'breathBuff' && !data.buff && !opts.infinite) {
      data.buff = { drainMult: e.drainMult, msLeft: e.ms };
      buff = true;
    }
  }
  if (breathSec <= 0 && !buff) return none;
  removeItem(itemId, 1);
  return { ok: true, breathSec, buff };
}

// ---- Eventos aleatórios ------------------------------------------------------------------------------------
export function getEventHistory(): EventHistory {
  return data.events;
}
/** Um evento começou: vira o "último" (nunca repete em seguida) e conta. */
export function noteEventStarted(kind: EventKind) {
  data.events = recordEvent(data.events, kind);
}
/** O jogador concluiu o evento (pegou o prêmio, ajudou...). */
export function noteEventDone(_kind: EventKind) {
  noteStat('dive_events');
}
