import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrateLegacyIds } from '@/game/state/legacyIds';
import {
  addToSet, bump, buyAvatar as coreBuyAvatar, buyBackground as coreBuyBg, buyFrame as coreBuyFrame, cleanNick, emptyAccount, evaluateAchievements,
  grantDiamonds as coreGrantDiamonds, grantVersusWin, sanitizeAccount, setAvatar as coreSetAvatar, setBackground as coreSetBg, setFavorite as coreSetFavorite,
  setFrame as coreSetFrame, setMax, spendDiamonds as coreSpendDiamonds, towerFloorDiamonds, buyCoinPack as coreBuyCoinPack, type Account, type BuyResult,
} from './accountCore';
import type { SetName } from './achievementDefs';
import { DIAMOND_RATES } from './accountConfig';
import type { Difficulty } from '@/game/state/difficulty';

/**
 * A CONTA do jogador: perfil, Diamond Meme, conquistas, cosméticos já conseguidos. Fica numa chave PRÓPRIA do
 * AsyncStorage, fora dos 3 slots: apagar ou trocar de save nunca mexe aqui. Toda regra está em accountCore.ts (puro);
 * este arquivo só guarda, avisa as telas e enfileira os avisos de conquista.
 */
export const ACCOUNT_KEY = 'meme_fighter_account_v1';

let account: Account = emptyAccount();
let loaded = false;
let loading: Promise<void> | null = null;
let pending: ((a: Account) => Account)[] = [];
const listeners = new Set<() => void>();
const toastListeners = new Set<() => void>();
let toasts: string[] = [];

const notify = () => listeners.forEach((fn) => fn());

function persist() {
  AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(account)).catch(() => {});
}

function commit(next: Account) {
  const ev = evaluateAchievements(next);
  // Sempre um objeto NOVO: as telas (e o React Compiler) detectam mudança pela identidade da conta.
  account = { ...ev.account };
  if (ev.unlocked.length) {
    toasts = [...toasts, ...ev.unlocked];
    toastListeners.forEach((fn) => fn());
  }
  persist();
  notify();
}

/** Aplica uma mudança. Se a conta ainda estiver carregando, a mudança espera e é aplicada em cima da conta real. */
function update(fn: (a: Account) => Account) {
  if (!loaded) {
    pending.push(fn);
    void ensureAccountLoaded();
    return;
  }
  commit(fn(account));
}

export function ensureAccountLoaded(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const raw = await AsyncStorage.getItem(ACCOUNT_KEY);
      if (raw) account = sanitizeAccount(JSON.parse(migrateLegacyIds(raw)));
    } catch {
      // sem armazenamento / JSON ruim: segue com a conta nova
    }
    loaded = true;
    let cur = account;
    for (const fn of pending) cur = fn(cur);
    pending = [];
    commit(cur);
  })();
  return loading;
}
void ensureAccountLoaded();

export function isAccountLoaded(): boolean {
  return loaded;
}
export function getAccount(): Account {
  return account;
}
export function getDiamonds(): number {
  return account.diamonds;
}

export function subscribeAccount(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useAccount(): Account {
  'use no memo'; // store de módulo: o compilador do React não pode guardar em cache o que lemos aqui
  const [, setTick] = useState(0);
  useEffect(() => {
    void ensureAccountLoaded();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    fn(); // a conta pode ter terminado de carregar entre o render e este efeito
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return account;
}

/* ───────────── avisos de conquista ───────────── */

export function takeAchievementToast(): string | null {
  return toasts.shift() ?? null;
}
export function pendingToastCount(): number {
  return toasts.length;
}
export function subscribeAchievementToasts(fn: () => void): () => void {
  toastListeners.add(fn);
  return () => {
    toastListeners.delete(fn);
  };
}

/* ───────────── perfil ───────────── */

/** Define/troca o apelido. false = vazio depois de limpar. */
export function setNickname(raw: string): boolean {
  const nick = cleanNick(raw);
  if (!nick) return false;
  update((a) => bump({ ...a, nick }, 'nick_set', a.nick === null ? 1 : 0));
  return true;
}
export function setFavoriteFighter(fighter: string | null, unlocked: string[]) {
  update((a) => coreSetFavorite(a, fighter, unlocked));
}
export function chooseAvatar(fighter: string) {
  update((a) => coreSetAvatar(a, fighter));
}
export function chooseBackground(id: string) {
  update((a) => coreSetBg(a, id));
}
export function chooseFrame(id: string) {
  update((a) => coreSetFrame(a, id));
}

function buy(fn: (a: Account) => BuyResult): BuyResult {
  const r = fn(account);
  if (r.ok) update(() => r.account); // `account` não mudou entre a leitura e aqui (tudo é síncrono)
  return r;
}
export function buyAvatar(fighter: string, unlockedFighters: string[]): BuyResult {
  return buy((a) => coreBuyAvatar(a, fighter, unlockedFighters));
}
export function buyBackground(id: string): BuyResult {
  return buy((a) => coreBuyBg(a, id));
}
export function buyFrame(id: string): BuyResult {
  return buy((a) => coreBuyFrame(a, id));
}

/* ───────────── Diamond Meme ───────────── */

export function grantDiamonds(n: number) {
  update((a) => coreGrantDiamonds(a, n));
}
/** Gasta diamantes. false = saldo insuficiente (nada muda). */
export function spendDiamonds(n: number): boolean {
  const r = coreSpendDiamonds(account, n);
  if (!r) return false;
  update((a) => coreSpendDiamonds(a, n) ?? a);
  return true;
}
/** Troca diamantes por um pacote de moedas; devolve quantas moedas entregar (0 = saldo insuficiente). A entrega fica em exchange.ts. */
export function takeCoinPack(packId: string): number {
  const r = coreBuyCoinPack(account, packId);
  if (!r) return 0;
  update((a) => coreBuyCoinPack(a, packId)?.account ?? a);
  return r.coins;
}

/* ───────────── eventos do jogo ───────────── */

export function noteWorldCreated() {
  update((a) => bump(a, 'worlds_created'));
}
export function noteFightWon() {
  update((a) => bump(a, 'fights_won'));
}
export function noteFightLost() {
  update((a) => bump(a, 'fights_lost'));
}
/** Vitória no VERSUS contra a CPU. Devolve os diamantes que renderam (considerando o teto diário). */
export function noteVersusCpuWin(difficulty: Difficulty): number {
  const probe = grantVersusWin(account, difficulty);
  update((a) => {
    let n = grantVersusWin(a, difficulty).account;
    n = bump(n, 'fights_won');
    n = bump(n, 'versus_wins');
    if (difficulty === 'hard' || difficulty === 'hardcore') n = bump(n, 'versus_hard_wins');
    if (difficulty === 'hardcore') n = bump(n, 'versus_hardcore_wins');
    return n;
  });
  return probe.gained;
}
/** Chefe derrotado. Devolve os diamantes da 1ª vitória (0 em revanche). */
export function noteBossDefeated(bossId: string, first: boolean, flawless: boolean): number {
  const gain = first ? DIAMOND_RATES.bossFirst : 0;
  update((a) => {
    let n = addToSet(a, 'bosses', bossId);
    if (flawless) n = bump(n, 'flawless_bosses');
    return coreGrantDiamonds(bump(n, 'fights_won'), gain);
  });
  return gain;
}
export function noteIslandVisit(islandId: string) {
  update((a) => addToSet(a, 'islands', islandId));
}
/** Andar da Torre vencido. Devolve os diamantes (só andares novos). */
export function noteTowerFloor(floor: number): number {
  const gain = towerFloorDiamonds(account.stats.tower_best ?? 0, floor);
  update((a) => coreGrantDiamonds(setMax(bump(a, 'fights_won'), 'tower_best', floor), towerFloorDiamonds(a.stats.tower_best ?? 0, floor)));
  return gain;
}
/** Missão da história concluída; `final` = a missão final (história zerada com `characterId`). */
export function noteMissionDone(final: boolean, characterId: string): number {
  const gain = final ? DIAMOND_RATES.finalMission : DIAMOND_RATES.mission;
  update((a) => {
    let n = bump(a, 'missions_done');
    if (final) n = addToSet(n, 'clears', characterId);
    return coreGrantDiamonds(n, gain);
  });
  return gain;
}
export function noteLevel(level: number) {
  update((a) => setMax(a, 'level_max', level));
}
export function noteDeath(inDebt: boolean) {
  update((a) => (inDebt ? bump(bump(a, 'deaths'), 'debt_events') : bump(a, 'deaths')));
}
export function noteRevive() {
  update((a) => bump(a, 'revives'));
}
export function noteFighterUnlocked(key: string) {
  update((a) => addToSet(a, 'fighters', key));
}
/** Garante que o conjunto de lutadores da conta reflita o elenco já liberado (saves/contas antigas). */
export function syncFighters(keys: string[]) {
  update((a) => keys.reduce((acc, k) => addToSet(acc, 'fighters', k), a));
}
export function ownCosmetic(id: string) {
  update((a) => addToSet(a, 'cosmetics', id));
}
export function ownCosmetics(ids: string[]) {
  if (!ids.length) return;
  update((a) => ids.reduce((acc, id) => addToSet(acc, 'cosmetics', id), a));
}
/** Só para testes de navegador / depuração: contador genérico. */
export function noteSet(set: SetName, id: string) {
  update((a) => addToSet(a, set, id));
}
