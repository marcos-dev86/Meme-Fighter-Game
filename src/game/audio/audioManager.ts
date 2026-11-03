import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AMBIENT, MUSIC, SFX, type AmbientKey, type MusicKey, type SfxKey } from './audioAssets';
import { ensureSettingsLoaded, getSettings, subscribeSettings } from '@/game/state/settingsState';

/**
 * Audio engine: one looping music player (cross-fades between tracks) and
 * a small pool of players per sound effect. Everything is best-effort -
 * a failure to play never reaches the game. Volumes come from the options
 * screen (settingsState): MÚSICAS and EFEITOS SONOROS.
 */

interface Track {
  key: MusicKey;
  player: AudioPlayer;
  /** 0..1 fade multiplier on top of the user's music volume. */
  fade: number;
}

let current: Track | null = null;
let wanted: MusicKey | null = null;
let inited = false;
let duck = 1; // temporary music lowering (e.g. during cutscenes), 0..1
const fading = new Set<Track>();
let fadeTimer: ReturnType<typeof setInterval> | null = null;

function musicLevel(tr: Track) {
  return Math.min(1, Math.max(0, getSettings().musicVolume * tr.fade * duck));
}

function applyVolume(tr: Track) {
  try {
    tr.player.volume = musicLevel(tr);
  } catch {
    // released
  }
}

function startFadeLoop() {
  if (fadeTimer) return;
  fadeTimer = setInterval(() => {
    const STEP = 0.06;
    if (current && current.fade < 1) {
      current.fade = Math.min(1, current.fade + STEP);
      applyVolume(current);
    }
    for (const tr of [...fading]) {
      tr.fade = Math.max(0, tr.fade - STEP * 1.6);
      applyVolume(tr);
      if (tr.fade <= 0) {
        fading.delete(tr);
        try {
          tr.player.pause();
          tr.player.remove();
        } catch {
          // already gone
        }
      }
    }
    if (fading.size === 0 && (!current || current.fade >= 1)) {
      if (fadeTimer) clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }, 50);
}

function tryPlay(player: AudioPlayer) {
  try {
    const r = (player as unknown as { play: () => unknown }).play() as unknown;
    if (r && typeof (r as Promise<unknown>).catch === 'function') (r as Promise<unknown>).catch(() => {});
  } catch {
    // autoplay blocked / released: retried on the next user gesture (web)
  }
}

function initOnce() {
  if (inited) return;
  inited = true;
  void ensureSettingsLoaded();
  void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {});
  subscribeSettings(() => {
    if (current) applyVolume(current);
    applyAmbient();
  });
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const resume = () => {
      if (audioPaused) return;
      if (current) tryPlay(current.player);
      for (const a of ambients.values()) if (a.level > 0.01) tryPlay(a.player);
    };
    // Na web, pausar um som que acabou de começar a tocar rejeita a promessa do play() do navegador
    // ("interrupted by a call to pause"). É inofensivo, então não deixa virar erro não tratado.
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (e) => {
        const msg = String((e.reason && (e.reason.message ?? e.reason)) ?? '');
        if (msg.includes('interrupted by a call to pause') || msg.includes('interrupted by a new load request') || e.reason?.name === 'AbortError') e.preventDefault();
      });
    }
    document.addEventListener('pointerdown', resume, { passive: true });
    document.addEventListener('keydown', resume, { passive: true });
  }
}

/** Starts (or switches to) a music track; `null` fades the music out. Same track = no-op. */
export function playMusic(key: MusicKey | null) {
  initOnce();
  wanted = key;
  if (current?.key === key) return;
  if (current) {
    fading.add(current);
    current = null;
  }
  if (key) {
    try {
      const player = createAudioPlayer(MUSIC[key]);
      player.loop = true;
      const tr: Track = { key, player, fade: 0 };
      current = tr;
      applyVolume(tr);
      tryPlay(player);
    } catch {
      current = null;
    }
  }
  startFadeLoop();
}

export function getPlayingMusic(): MusicKey | null {
  return wanted;
}

/** Lowers the music (0..1) without stopping it: cutscenes, dialogues. */
export function duckMusic(level: number) {
  duck = Math.min(1, Math.max(0, level));
  if (current) applyVolume(current);
}

// ---- sound effects ----
const POOL_SIZE = 3;
const pools = new Map<SfxKey, { players: AudioPlayer[]; next: number }>();
const lastPlayed = new Map<SfxKey, number>();

function poolFor(key: SfxKey) {
  let p = pools.get(key);
  if (!p) {
    p = { players: [], next: 0 };
    pools.set(key, p);
  }
  return p;
}

/**
 * Plays a sound effect once. `gain` (0..1) scales it on top of the user's
 * EFEITOS SONOROS volume; `minGapMs` drops a repeat of the same sound that
 * comes too soon (footsteps, hit spam).
 */
export function playSfx(key: SfxKey, opts?: { gain?: number; minGapMs?: number }) {
  initOnce();
  // Jogo pausado: só os sons do próprio menu (ui_*, pause/unpause) tocam.
  if (audioPaused && !key.startsWith('ui_') && key !== 'pause' && key !== 'unpause') return;
  const vol = getSettings().sfxVolume * (opts?.gain ?? 1);
  if (vol <= 0.001) return;
  const now = Date.now();
  const gap = opts?.minGapMs ?? 40;
  const last = lastPlayed.get(key) ?? 0;
  if (now - last < gap) return;
  lastPlayed.set(key, now);
  try {
    const pool = poolFor(key);
    let player: AudioPlayer;
    if (pool.players.length < POOL_SIZE) {
      player = createAudioPlayer(SFX[key]);
      pool.players.push(player);
    } else {
      player = pool.players[pool.next % pool.players.length];
    }
    pool.next = (pool.next + 1) % POOL_SIZE;
    player.volume = Math.min(1, vol);
    try {
      void player.seekTo(0);
    } catch {
      // not loaded yet: it starts at 0 anyway
    }
    tryPlay(player);
  } catch {
    // never let sound break the game
  }
}

/** Creates the players for common sounds ahead of time so the first hit isn't late. */
export function warmSfx(keys: SfxKey[]) {
  initOnce();
  for (const k of keys) {
    try {
      const pool = poolFor(k);
      if (pool.players.length === 0) pool.players.push(createAudioPlayer(SFX[k]));
    } catch {
      // ignore
    }
  }
}

// ---- pausa de verdade: efeitos e ambientes ficam mudos até despausar ----
let audioPaused = false;
const pausedSfxPlayers: AudioPlayer[] = [];

/** Pausa/retoma efeitos sonoros e ambientes (chuva, vento, ondas). A música continua. */
export function setAudioPaused(paused: boolean) {
  if (audioPaused === paused) return;
  audioPaused = paused;
  if (paused) {
    for (const pool of pools.values()) {
      for (const pl of pool.players) {
        try {
          if (pl.playing) {
            pl.pause();
            pausedSfxPlayers.push(pl);
          }
        } catch {
          // released
        }
      }
    }
    for (const a of ambients.values()) {
      try {
        a.player.pause();
      } catch {
        // released
      }
    }
  } else {
    while (pausedSfxPlayers.length) tryPlay(pausedSfxPlayers.pop() as AudioPlayer);
    for (const a of ambients.values()) if (a.playing && a.level > 0.01) tryPlay(a.player);
  }
}

// ---- ambient loops (rain, wind, waves) ----
interface Ambient {
  player: AudioPlayer;
  level: number; // current 0..1 (eased)
  target: number;
  playing: boolean;
}
const ambients = new Map<AmbientKey, Ambient>();
let ambientTimer: ReturnType<typeof setInterval> | null = null;

function applyAmbient() {
  const vol = getSettings().ambientVolume;
  for (const a of ambients.values()) {
    try {
      a.player.volume = Math.min(1, Math.max(0, a.level * vol));
    } catch {
      // released
    }
  }
}

function ambientTick() {
  let busy = false;
  for (const a of ambients.values()) {
    if (Math.abs(a.target - a.level) > 0.005) {
      a.level += (a.target - a.level) * 0.12;
      busy = true;
    } else {
      a.level = a.target;
    }
    if (a.level <= 0.01 && a.playing) {
      a.playing = false;
      try {
        a.player.pause();
      } catch {
        // released
      }
    }
  }
  applyAmbient();
  if (!busy && ambientTimer) {
    clearInterval(ambientTimer);
    ambientTimer = null;
  }
}

/** Fades an ambient loop towards `level` (0..1); 0 stops it. Scaled by the AMBIENTE volume. */
export function setAmbient(key: AmbientKey, level: number) {
  initOnce();
  const target = Math.min(1, Math.max(0, level));
  let a = ambients.get(key);
  if (!a) {
    if (target <= 0) return;
    try {
      const player = createAudioPlayer(AMBIENT[key]);
      player.loop = true;
      a = { player, level: 0, target, playing: false };
      ambients.set(key, a);
    } catch {
      return;
    }
  }
  a.target = target;
  if (target > 0 && !a.playing) {
    a.playing = true;
    if (!audioPaused) tryPlay(a.player);
  }
  if (!ambientTimer) ambientTimer = setInterval(ambientTick, 100);
}

/** Silences every ambient loop (leaving the world, entering a building). */
export function stopAmbients() {
  for (const k of ambients.keys()) setAmbient(k, 0);
}
