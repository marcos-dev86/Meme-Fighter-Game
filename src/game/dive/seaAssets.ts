import type { ImageSourcePropType } from 'react-native';

/** Imagens do mergulho: mapas (gerados por tools/render_dive_maps.py) e folhas das criaturas (pacote new sea assets). */
export const DIVE_MAP_IMG: Record<string, ImageSourcePropType> = {
  recife_pato: require('../../../assets/sea/maps/recife_pato.png'),
  naufragio: require('../../../assets/sea/maps/naufragio.png'),
  caverna: require('../../../assets/sea/maps/caverna.png'),
  ruinas: require('../../../assets/sea/maps/ruinas.png'),
  atlantis: require('../../../assets/sea/maps/atlantis.png'),
  lagoa: require('../../../assets/sea/maps/lagoa.png'),
  fumarolas: require('../../../assets/sea/maps/fumarolas.png'),
  gruta: require('../../../assets/sea/maps/gruta.png'),
  abismo: require('../../../assets/sea/maps/abismo.png'),
};

export const SEA_SHEET_IMG: Record<string, ImageSourcePropType> = {
  clownfish: require('../../../assets/sea/creatures/clownfish.png'),
  turtle: require('../../../assets/sea/creatures/turtle.png'),
  cleaner: require('../../../assets/sea/creatures/cleaner.png'),
  angel_fish: require('../../../assets/sea/creatures/angel_fish.png'),
  banc_anchois: require('../../../assets/sea/creatures/banc_anchois.png'),
  crabe: require('../../../assets/sea/creatures/crabe.png'),
  meduse_bleue: require('../../../assets/sea/creatures/meduse_bleue.png'),
  meduse_rose: require('../../../assets/sea/creatures/meduse_rose.png'),
  meduse_violette: require('../../../assets/sea/creatures/meduse_violette.png'),
  murene: require('../../../assets/sea/creatures/murene.png'),
  pieuvre: require('../../../assets/sea/creatures/pieuvre.png'),
  baudroief: require('../../../assets/sea/creatures/baudroief.png'),
  baleine: require('../../../assets/sea/creatures/baleine.png'),
};

export const FLOOR_REVEAL_IMG: ImageSourcePropType = require('../../../assets/sea/tiles/floor_reveal.png');
