import { useEffect, useRef } from 'react';

/**
 * Drives the real-time simulation (input -> physics -> collision -> camera)
 * on requestAnimationFrame, outside of React's render cycle: section 26 of
 * the design doc ("Não quero depender exclusivamente do ciclo de
 * renderização do React para lógica de jogo em tempo real").
 *
 * The callback receives delta time in milliseconds since the previous
 * frame, clamped so that resuming from a backgrounded app (or a slow
 * device hiccup) doesn't cause a huge simulation jump.
 */
export function useGameLoop(callback: (dtMs: number) => void, active: boolean = true): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!active) return;

    let frameId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - lastTime, 100);
      lastTime = now;
      callbackRef.current(dt);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [active]);
}
