import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export type DirectionKey = 'up' | 'down' | 'left' | 'right';

export interface DirectionalInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

// Same keys as KEYMAP_P1 in the old battle engine (input.js): WASD plus
// arrow keys: so testing with `npm run web` feels familiar.
const KEY_MAP: Record<string, DirectionKey> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

/**
 * Input is stored in a ref, not React state: the game loop polls it once
 * per frame. Routing every key/touch event through setState would re-render
 * the whole screen up to 60x/sec for no benefit (section 25 of the design
 * doc warns specifically about this).
 */
export function useDirectionalInput() {
  const stateRef = useRef<DirectionalInput>({ up: false, down: false, left: false, right: false });

  const setPressed = useCallback((key: DirectionKey, pressed: boolean) => {
    stateRef.current[key] = pressed;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.code];
      if (dir) stateRef.current[dir] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.code];
      if (dir) stateRef.current[dir] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return { stateRef, setPressed };
}
