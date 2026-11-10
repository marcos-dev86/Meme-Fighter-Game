import { useEffect, useState } from 'react';
import { getSettings } from '@/game/state/settingsState';
import { isGamePaused, setGamePaused } from '@/game/state/pauseState';
import { cutsceneForEvent } from './cutscenes';

/**
 * Cutscenes CURTAS por ação (escalar, cassino, baú, nível), tocadas NO LUGAR: o ShortCutsceneHost (em app/_layout) mostra o
 * CutscenePlayer por cima da tela atual, sem trocar de rota (assim o mundo e o cassino não desmontam).
 * Enquanto toca, o jogo fica pausado (relógio, inimigos, barcos) e PULAR vale. Se já há uma tocando, o novo evento é ignorado.
 * Com "CUTSCENES CURTAS" desligado em Opções, nada toca. Toda vez que a ação acontece, toca de novo (não fica "vista").
 */
let current: string | null = null;
let resumeFromPause = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export function isShortCutscenePlaying(): boolean {
  return current !== null;
}
export function getShortCutscene(): string | null {
  return current;
}

/** Toca a cutscene curta do evento. Devolve true se começou. */
export function playShortCutscene(event: string): boolean {
  if (current || !getSettings().shortCutscenes) return false;
  const def = cutsceneForEvent(event);
  if (!def) return false;
  current = def.id;
  resumeFromPause = !isGamePaused();
  if (resumeFromPause) setGamePaused(true);
  notify();
  return true;
}

export function endShortCutscene() {
  if (!current) return;
  current = null;
  if (resumeFromPause) setGamePaused(false);
  resumeFromPause = false;
  notify();
}

export function useShortCutscene(): string | null {
  'use no memo';
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return current;
}

/** Eventos que não podem tocar agora (ex.: subiu de nível numa batalha): esperam o mundo ficar livre. Fila pequena, sem duplicados. */
let pending: string[] = [];
export function queueShortEvent(event: string) {
  if (!getSettings().shortCutscenes || !cutsceneForEvent(event) || pending.includes(event) || pending.length >= 2) return;
  pending = [...pending, event];
}
export function takeQueuedShortEvent(): string | null {
  const ev = pending[0] ?? null;
  if (ev !== null) pending = pending.slice(1);
  return ev;
}
export function clearShortQueue() {
  pending = [];
}
