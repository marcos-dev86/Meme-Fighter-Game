/**
 * NPC art from the user's character pack (personagens1/2/3.png): the
 * front-facing standing frame of each of the 24 characters, trimmed and
 * upscaled 4x (nearest-neighbour) in assets/npcs. `w`/`h` are the original
 * pixel size, so figures keep their relative proportions (the chibi
 * sheet-1 characters are shorter than the sheet-2/3 ones).
 */
export interface NpcSheetChar {
  src: number;
  w: number;
  h: number;
}

export const NPC_SHEET: Record<string, NpcSheetChar> = {
  c00: { src: require('../../../assets/npcs/c00.png'), w: 29, h: 32 },
  c01: { src: require('../../../assets/npcs/c01.png'), w: 29, h: 32 },
  c02: { src: require('../../../assets/npcs/c02.png'), w: 27, h: 32 },
  c03: { src: require('../../../assets/npcs/c03.png'), w: 32, h: 32 },
  c04: { src: require('../../../assets/npcs/c04.png'), w: 32, h: 32 },
  c05: { src: require('../../../assets/npcs/c05.png'), w: 27, h: 32 },
  c06: { src: require('../../../assets/npcs/c06.png'), w: 27, h: 32 },
  c07: { src: require('../../../assets/npcs/c07.png'), w: 32, h: 32 },
  c08: { src: require('../../../assets/npcs/c08.png'), w: 29, h: 48 },
  c09: { src: require('../../../assets/npcs/c09.png'), w: 31, h: 43 },
  c10: { src: require('../../../assets/npcs/c10.png'), w: 29, h: 47 },
  c11: { src: require('../../../assets/npcs/c11.png'), w: 29, h: 45 },
  c12: { src: require('../../../assets/npcs/c12.png'), w: 28, h: 48 },
  c13: { src: require('../../../assets/npcs/c13.png'), w: 26, h: 44 },
  c14: { src: require('../../../assets/npcs/c14.png'), w: 25, h: 39 },
  c15: { src: require('../../../assets/npcs/c15.png'), w: 27, h: 39 },
  c16: { src: require('../../../assets/npcs/c16.png'), w: 31, h: 45 },
  c17: { src: require('../../../assets/npcs/c17.png'), w: 29, h: 44 },
  c18: { src: require('../../../assets/npcs/c18.png'), w: 32, h: 45 },
  c19: { src: require('../../../assets/npcs/c19.png'), w: 29, h: 46 },
  c20: { src: require('../../../assets/npcs/c20.png'), w: 31, h: 45 },
  c21: { src: require('../../../assets/npcs/c21.png'), w: 30, h: 44 },
  c22: { src: require('../../../assets/npcs/c22.png'), w: 32, h: 46 },
  c23: { src: require('../../../assets/npcs/c23.png'), w: 32, h: 48 },
};
