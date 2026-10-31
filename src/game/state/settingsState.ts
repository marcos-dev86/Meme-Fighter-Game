import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Device-wide game settings (not per save): AUTO SAVE on/off and its
 * interval. Saved on the device so it survives restarts.
 */
export const AUTOSAVE_INTERVALS = [15, 30] as const;
export type AutosaveInterval = (typeof AUTOSAVE_INTERVALS)[number];

export interface Settings {
  autoSave: boolean;
  autoSaveSeconds: AutosaveInterval;
  /** Background music volume, 0..1. */
  musicVolume: number;
  /** Sound-effects volume, 0..1. */
  sfxVolume: number;
  /** Ambient sounds (rain, wind, waves), 0..1. */
  ambientVolume: number;
  /** "RESPOSTA TÁTIL": vibration on hits, chests and level-ups. */
  haptics: boolean;
  /** Contextual tips on first occurrence ("DICAS"). */
  tips: boolean;
  /** MODO LEVE: reduz os efeitos (menos chuva/neve, menos faíscas nas lutas), sem tirar nenhum. Bom para celulares lentos. */
  lightMode: boolean;
}

const KEY = 'meme_fighter_settings_v1';
let settings: Settings = { autoSave: true, autoSaveSeconds: 30, musicVolume: 0.7, sfxVolume: 0.8, ambientVolume: 0.6, haptics: true, tips: true, lightMode: false };
let loaded = false;
const listeners = new Set<() => void>();

function clamp01(v: unknown, fallback: number): number {
  return typeof v === 'number' && isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

function notify() {
  listeners.forEach((fn) => fn());
}

async function loadOnce() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<Settings>;
      settings = {
        autoSave: d.autoSave !== false,
        autoSaveSeconds: d.autoSaveSeconds === 15 ? 15 : 30,
        musicVolume: clamp01(d.musicVolume, 0.7),
        sfxVolume: clamp01(d.sfxVolume, 0.8),
        ambientVolume: clamp01(d.ambientVolume, 0.6),
        haptics: d.haptics !== false,
        tips: d.tips !== false,
        // saves antigos: quem tinha desligado as partículas do clima passa a usar o modo leve
        lightMode: d.lightMode === true || (d.lightMode === undefined && (d as { weatherParticles?: boolean }).weatherParticles === false),
      };
      notify();
    }
  } catch {
    // keep defaults
  }
}

async function persist() {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // best-effort
  }
}

export function getSettings(): Settings {
  return settings;
}

export function setAutoSave(on: boolean) {
  settings = { ...settings, autoSave: on };
  notify();
  void persist();
}

export function setAutoSaveSeconds(s: AutosaveInterval) {
  settings = { ...settings, autoSaveSeconds: s };
  notify();
  void persist();
}

export function setMusicVolume(v: number) {
  settings = { ...settings, musicVolume: clamp01(v, 0.7) };
  notify();
  void persist();
}

export function setSfxVolume(v: number) {
  settings = { ...settings, sfxVolume: clamp01(v, 0.8) };
  notify();
  void persist();
}

export function setAmbientVolume(v: number) {
  settings = { ...settings, ambientVolume: clamp01(v, 0.6) };
  notify();
  void persist();
}

export function setHaptics(on: boolean) {
  settings = { ...settings, haptics: on };
  notify();
  void persist();
}

export function setLightMode(on: boolean) {
  settings = { ...settings, lightMode: on };
  notify();
  void persist();
}

export function setTips(on: boolean) {
  settings = { ...settings, tips: on };
  notify();
  void persist();
}

/** Subscribe to settings changes outside React (the audio engine uses it). */
export function subscribeSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Loads the saved settings once (call early, e.g. from the world screen). */
export function ensureSettingsLoaded() {
  return loadOnce();
}

export function useSettings(): Settings {
  'use no memo';
  const [, setTick] = useState(0);
  useEffect(() => {
    void loadOnce();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return settings;
}
