import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORY_CHARACTERS } from '@/game/story/characters';

/**
 * Device-wide profile: which story characters the player has unlocked.
 * Finishing a character's final mission unlocks the characters listed in
 * its `unlocks` (see story/characters.ts); a character you unlock always
 * starts a NEW save (pick it when creating a world).
 */
const KEY = 'meme_fighter_profile_v1';
let unlocked: string[] = Object.values(STORY_CHARACTERS).filter((c) => c.unlockedByDefault).map((c) => c.id);
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export async function ensureProfileLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as { unlocked?: string[] };
      const ids = (d.unlocked ?? []).filter((id) => STORY_CHARACTERS[id]);
      unlocked = Array.from(new Set([...unlocked, ...ids]));
      notify();
    }
  } catch {
    // keep defaults
  }
}

export function getUnlockedCharacters(): string[] {
  return unlocked;
}

export function unlockCharacters(ids: string[] | undefined) {
  if (!ids?.length) return;
  const next = Array.from(new Set([...unlocked, ...ids.filter((id) => STORY_CHARACTERS[id])]));
  if (next.length === unlocked.length) return;
  unlocked = next;
  notify();
  AsyncStorage.setItem(KEY, JSON.stringify({ unlocked })).catch(() => {});
}

export function useUnlockedCharacters(): string[] {
  'use no memo';
  const [, setTick] = useState(0);
  useEffect(() => {
    void ensureProfileLoaded();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return [...unlocked];
}
