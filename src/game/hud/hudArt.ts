import type { ImageSourcePropType } from 'react-native';

/** Arte da interface do modo história (recortada do layout enviado, tools/ no commit de origem): barras, pausa, moeda, diamante e o direcional. */
export const HUD_ART: Record<string, ImageSourcePropType> = {
  bar_red: require('../../../assets/ui/hud/bar_red.png'),
  bar_blue: require('../../../assets/ui/hud/bar_blue.png'),
  pause: require('../../../assets/ui/hud/pause.png'),
  coin: require('../../../assets/ui/hud/coin.png'),
  gem: require('../../../assets/ui/hud/gem.png'),
  dpad_up: require('../../../assets/ui/hud/dpad_up.png'),
  dpad_left: require('../../../assets/ui/hud/dpad_left.png'),
  dpad_right: require('../../../assets/ui/hud/dpad_right.png'),
  dpad_down: require('../../../assets/ui/hud/dpad_down.png'),
};
