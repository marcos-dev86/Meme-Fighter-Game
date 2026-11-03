import type { MusicKey } from './audioAssets';

/** Which track plays where. Swap the mp3 in assets/audio/music to change a track, or edit this table. */
export const ISLAND_MUSIC: Record<string, MusicKey> = {
  main: 'forest_day',
  gelo: 'winter_woods',
  misteriosa: 'spy_glass',
  fragments: 'secret_garden',
  vulcao: 'mountain_pass',
  trevas: 'goblin_king',
  camp: 'medieval_library',
  dogisland: 'trapalhoes',
};

const INTERIOR_MUSIC: Record<string, MusicKey> = {
  caverna: 'ice_cavern',
  loja_misteriosa: 'retrofuture',
  guilda: 'medieval_library',
  salao_geral: 'medieval_library',
  salao_camp: 'medieval_library',
};

/** Islands with a different track after dark. */
const NIGHT_MUSIC: Record<string, MusicKey> = {
  main: 'forest_night',
  gelo: 'frozen_wastes',
};

export function worldMusic(opts: { island: string | null; interior: string | null; sailing: boolean; night?: boolean }): MusicKey {
  if (opts.sailing) return 'open_ocean';
  if (opts.interior) return INTERIOR_MUSIC[opts.interior] ?? 'breaktime';
  if (opts.night && opts.island && NIGHT_MUSIC[opts.island]) return NIGHT_MUSIC[opts.island];
  return (opts.island && ISLAND_MUSIC[opts.island]) || 'forest_day';
}

export const MENU_MUSIC: MusicKey = 'comic_hero';
export const BATTLE_MUSIC: MusicKey = 'move_forward';
export const BOSS_MUSIC: MusicKey = 'goblin_king';
export const TOWER_MUSIC: MusicKey = 'retrofuture';
