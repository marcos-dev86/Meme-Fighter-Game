/**
 * Every audio file of the game, bundled. To swap a sound, replace the mp3
 * with the same name in assets/audio/{music,sfx} - no code change needed.
 * Music credits are in the credits screen (Kevin MacLeod tracks are CC BY).
 */
export const MUSIC = {
  breaktime: require('../../../assets/audio/music/breaktime.mp3'),
  comic_hero: require('../../../assets/audio/music/comic_hero.mp3'),
  forest_day: require('../../../assets/audio/music/forest_day.mp3'),
  forest_night: require('../../../assets/audio/music/forest_night.mp3'),
  frozen_wastes: require('../../../assets/audio/music/frozen_wastes.mp3'),
  goblin_king: require('../../../assets/audio/music/goblin_king.mp3'),
  ice_cavern: require('../../../assets/audio/music/ice_cavern.mp3'),
  medieval_library: require('../../../assets/audio/music/medieval_library.mp3'),
  mountain_pass: require('../../../assets/audio/music/mountain_pass.mp3'),
  move_forward: require('../../../assets/audio/music/move_forward.mp3'),
  open_ocean: require('../../../assets/audio/music/open_ocean.mp3'),
  retrofuture: require('../../../assets/audio/music/retrofuture.mp3'),
  secret_garden: require('../../../assets/audio/music/secret_garden.mp3'),
  spy_glass: require('../../../assets/audio/music/spy_glass.mp3'),
  trapalhoes: require('../../../assets/audio/music/trapalhoes.mp3'),
  winter_woods: require('../../../assets/audio/music/winter_woods.mp3'),
} as const;

export const AMBIENT = {
  rain: require('../../../assets/audio/ambient/rain.mp3'),
  wind: require('../../../assets/audio/ambient/wind.mp3'),
  waves: require('../../../assets/audio/ambient/waves.mp3'),
} as const;

export const SFX = {
  absorb: require('../../../assets/audio/sfx/absorb.mp3'),
  bite: require('../../../assets/audio/sfx/bite.mp3'),
  block: require('../../../assets/audio/sfx/block.mp3'),
  buff_atk: require('../../../assets/audio/sfx/buff_atk.mp3'),
  buff_def: require('../../../assets/audio/sfx/buff_def.mp3'),
  charge: require('../../../assets/audio/sfx/charge.mp3'),
  claw: require('../../../assets/audio/sfx/claw.mp3'),
  climb: require('../../../assets/audio/sfx/climb.mp3'),
  coin: require('../../../assets/audio/sfx/coin.mp3'),
  debuff: require('../../../assets/audio/sfx/debuff.mp3'),
  dive: require('../../../assets/audio/sfx/dive.mp3'),
  dodge: require('../../../assets/audio/sfx/dodge.mp3'),
  earth: require('../../../assets/audio/sfx/earth.mp3'),
  encounter: require('../../../assets/audio/sfx/encounter.mp3'),
  enemy_death: require('../../../assets/audio/sfx/enemy_death.mp3'),
  equip: require('../../../assets/audio/sfx/equip.mp3'),
  fire: require('../../../assets/audio/sfx/fire.mp3'),
  flee: require('../../../assets/audio/sfx/flee.mp3'),
  heal: require('../../../assets/audio/sfx/heal.mp3'),
  hit_flesh: require('../../../assets/audio/sfx/hit_flesh.mp3'),
  hit_heavy: require('../../../assets/audio/sfx/hit_heavy.mp3'),
  ice: require('../../../assets/audio/sfx/ice.mp3'),
  jump: require('../../../assets/audio/sfx/jump.mp3'),
  landing: require('../../../assets/audio/sfx/landing.mp3'),
  levelup: require('../../../assets/audio/sfx/levelup.mp3'),
  pause: require('../../../assets/audio/sfx/pause.mp3'),
  player_hurt: require('../../../assets/audio/sfx/player_hurt.mp3'),
  poison: require('../../../assets/audio/sfx/poison.mp3'),
  slash: require('../../../assets/audio/sfx/slash.mp3'),
  sleep: require('../../../assets/audio/sfx/sleep.mp3'),
  speed_up: require('../../../assets/audio/sfx/speed_up.mp3'),
  step_grass: require('../../../assets/audio/sfx/step_grass.mp3'),
  step_rock: require('../../../assets/audio/sfx/step_rock.mp3'),
  step_water: require('../../../assets/audio/sfx/step_water.mp3'),
  step_wood: require('../../../assets/audio/sfx/step_wood.mp3'),
  swim: require('../../../assets/audio/sfx/swim.mp3'),
  swing: require('../../../assets/audio/sfx/swing.mp3'),
  teleport: require('../../../assets/audio/sfx/teleport.mp3'),
  thunder: require('../../../assets/audio/sfx/thunder.mp3'),
  ui_back: require('../../../assets/audio/sfx/ui_back.mp3'),
  ui_confirm: require('../../../assets/audio/sfx/ui_confirm.mp3'),
  ui_denied: require('../../../assets/audio/sfx/ui_denied.mp3'),
  ui_hover: require('../../../assets/audio/sfx/ui_hover.mp3'),
  unequip: require('../../../assets/audio/sfx/unequip.mp3'),
  unpause: require('../../../assets/audio/sfx/unpause.mp3'),
  use_item: require('../../../assets/audio/sfx/use_item.mp3'),
  water: require('../../../assets/audio/sfx/water.mp3'),
  wind: require('../../../assets/audio/sfx/wind.mp3'),
} as const;

export type MusicKey = keyof typeof MUSIC;
export type SfxKey = keyof typeof SFX;
export type AmbientKey = keyof typeof AMBIENT;
