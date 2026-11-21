import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasFlag, setFlag } from '@/game/state/storyFlags';
import { cutsceneFlag, enqueueCutscene, enqueueCutscenes, CUTSCENE_BY_ID } from './cutscenes';

/**
 * Estado das cutscenes em vídeo.
 * - "Já vista" é por SAVE (bandeira `cs:<id>` em storyFlags): cada mundo mostra cada vídeo uma vez.
 * - A lista "REVER CUTSCENES" (Opções) é GLOBAL (AsyncStorage): o que você já viu em qualquer save.
 * - A fila é só em memória: abastecida pelas missões concluídas NESTA sessão, então saves antigos nunca recebem vídeos de repente.
 */
export const cutsceneSeen = (id: string): boolean => hasFlag(cutsceneFlag(id));

const GLOBAL_KEY = 'meme_fighter_cutscenes_seen_v1';
let globalSeen: string[] = [];
let globalLoaded = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

async function loadGlobal() {
  if (globalLoaded) return;
  globalLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(GLOBAL_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) globalSeen = Array.from(new Set([...globalSeen, ...arr.filter((x) => typeof x === 'string' && CUTSCENE_BY_ID[x])]));
    notify();
  } catch {
    // sem armazenamento: a lista só vale nesta sessão
  }
}

/** Marca como vista neste save e na lista global de "rever". */
export function markCutsceneSeen(id: string) {
  if (!CUTSCENE_BY_ID[id]) return;
  setFlag(cutsceneFlag(id));
  void loadGlobal().then(() => {
    if (globalSeen.includes(id)) return;
    globalSeen = [...globalSeen, id];
    notify();
    AsyncStorage.setItem(GLOBAL_KEY, JSON.stringify(globalSeen)).catch(() => {});
  });
}

export function getSeenCutscenes(): string[] {
  return globalSeen;
}

export function useSeenCutscenes(): string[] {
  'use no memo';
  const [, setTick] = useState(0);
  useEffect(() => {
    void loadGlobal();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return globalSeen;
}

let queue: string[] = [];
export function queueCutscene(id: string) {
  queue = enqueueCutscene(queue, id, cutsceneSeen);
}
/** Várias de uma vez (ex.: uma missão que fecha duas cenas), na ordem do registro. */
export function queueCutscenes(ids: readonly string[]) {
  queue = enqueueCutscenes(queue, ids, cutsceneSeen);
}
export function nextQueuedCutscene(): string | null {
  const id = queue[0] ?? null;
  if (id !== null) queue = queue.slice(1);
  return id;
}
export function peekQueuedCutscene(): string | null {
  return queue[0] ?? null;
}
export function clearCutsceneQueue() {
  queue = [];
}
