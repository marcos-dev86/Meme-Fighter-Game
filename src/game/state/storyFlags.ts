import { useEffect, useState } from 'react';
import { registerSaveExt } from './saveExt';

/**
 * Estado da história (Parte 38): bandeiras, escolhas importantes, jogos de cassino vencidos e o final alcançado.
 * Fica em ext 'story'. Módulo sem dependências do resto do jogo, para a lista de missões poder consultá-lo
 * sem ciclos de import.
 */
export type Ending = 'union' | 'glory' | 'power';

let flags = new Set<string>();
let choices: Record<string, string> = {};
let choiceOrder: string[] = [];
let casinoGames = new Set<string>();
let ending: Ending | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export function hasFlag(f: string): boolean {
  return flags.has(f);
}
export function setFlag(f: string) {
  if (flags.has(f)) return;
  flags = new Set(flags).add(f);
  notify();
}

export function getChoice(id: string): string | null {
  return choices[id] ?? null;
}
export function makeChoice(id: string, option: string) {
  if (choices[id]) return;
  choices = { ...choices, [id]: option };
  choiceOrder = [...choiceOrder, id];
  setFlag(`choice:${id}:${option}`);
  notify();
}
export function getChoices(): Record<string, string> {
  return choices;
}
/** Ids das escolhas na ordem em que foram feitas (a última desempata o final). */
export function getChoiceOrder(): string[] {
  return choiceOrder;
}

export function noteCasinoGame(game: string) {
  if (casinoGames.has(game)) return;
  casinoGames = new Set(casinoGames).add(game);
  notify();
}
export function getCasinoGamesWon(): string[] {
  return [...casinoGames];
}

export function getEnding(): Ending | null {
  return ending;
}
export function setEnding(e: Ending) {
  ending = e;
  notify();
}

export function subscribeStory(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function useStory() {
  'use no memo'; // store de módulo
  const [, setTick] = useState(0);
  useEffect(() => subscribeStory(() => setTick((n) => n + 1)), []);
  return { flags, choices, ending };
}

registerSaveExt({
  key: 'story',
  snapshot: () => ({ flags: [...flags], choices, choiceOrder, casinoGames: [...casinoGames], ending }),
  restore: (d) => {
    const data = d as { flags?: unknown; choices?: Record<string, unknown>; choiceOrder?: unknown; casinoGames?: unknown; ending?: unknown } | undefined;
    flags = new Set(Array.isArray(data?.flags) ? (data.flags as unknown[]).filter((x): x is string => typeof x === 'string') : []);
    choices = {};
    if (data?.choices && typeof data.choices === 'object') for (const [k, v] of Object.entries(data.choices)) if (typeof v === 'string') choices[k] = v;
    choiceOrder = Array.isArray(data?.choiceOrder) ? (data.choiceOrder as unknown[]).filter((x): x is string => typeof x === 'string' && !!choices[x]) : Object.keys(choices);
    casinoGames = new Set(Array.isArray(data?.casinoGames) ? (data.casinoGames as unknown[]).filter((x): x is string => typeof x === 'string') : []);
    ending = data?.ending === 'union' || data?.ending === 'glory' || data?.ending === 'power' ? data.ending : null;
    notify();
  },
  reset: () => {
    flags = new Set();
    choices = {};
    choiceOrder = [];
    casinoGames = new Set();
    ending = null;
    notify();
  },
});
