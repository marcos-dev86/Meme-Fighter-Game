import { useEffect, useState } from 'react';
import { setAudioPaused } from '@/game/audio/audioManager';
import { setSessionPaused } from './session';
import { setWavesPaused } from '@/game/world/waveClock';

/**
 * Pausa GLOBAL do jogo (mundo e batalha). Quando ligada:
 *  - o relógio dia/noite, o clima, o trovão, a rotina dos NPCs, os inimigos e a luta param;
 *  - efeitos sonoros e ambientes (chuva, vento, ondas) ficam mudos (a música continua);
 *  - o tempo de jogo da partida não conta.
 * Quem tem laço próprio consulta isGamePaused() ou usa useGamePaused().
 */
let paused = false;
const listeners = new Set<() => void>();

export function isGamePaused(): boolean {
  return paused;
}

/** Uma batalha está aberta por cima do mundo: o mundo (relógio, clima, inimigos) fica congelado. */
let battleOpen = false;
export function setBattleOpen(open: boolean) {
  battleOpen = open;
}
export function isWorldFrozen(): boolean {
  return paused || battleOpen;
}

export function setGamePaused(next: boolean) {
  if (paused === next) return;
  paused = next;
  setAudioPaused(next);
  setSessionPaused(next);
  setWavesPaused(next);
  listeners.forEach((fn) => fn());
}

export function useGamePaused(): boolean {
  'use no memo';
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return paused;
}
