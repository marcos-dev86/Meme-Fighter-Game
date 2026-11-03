// Central registry of the preserved menu background art (relative
// requires, see docs/AUDIT.md "Compatibilidade" for why not @/ aliases
// for asset requires).
export const SCREEN_ART = {
  inicio: require('../../../assets/legacy-art/screens/inicio.png'),
  jogar: require('../../../assets/legacy-art/screens/jogar.png'),
  versus: require('../../../assets/legacy-art/screens/versus.png'),
  opcoes: require('../../../assets/legacy-art/screens/opcoes.png'),
  sair: require('../../../assets/legacy-art/screens/sair.png'),
  historia: require('../../../assets/legacy-art/screens/historia.png'),
};

export const STAGE_ART: Record<string, number> = {
  stage_1: require('../../../assets/legacy-art/stages/stage1.webp'),
  stage_2: require('../../../assets/legacy-art/stages/stage2.webp'),
  stage_3: require('../../../assets/legacy-art/stages/stage3.webp'),
};

export const SHIELD_GIF = require('../../../assets/legacy-art/effects/escudo.gif');
