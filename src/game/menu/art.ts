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
  stage_4: require('../../../assets/legacy-art/stages/stage4.webp'),
  stage_5: require('../../../assets/legacy-art/stages/stage5.webp'),
  stage_6: require('../../../assets/legacy-art/stages/stage6.webp'),
  stage_7: require('../../../assets/legacy-art/stages/stage7.webp'),
  stage_8: require('../../../assets/legacy-art/stages/stage8.webp'),
  stage_9: require('../../../assets/legacy-art/stages/stage9.webp'),
  stage_10: require('../../../assets/legacy-art/stages/stage10.webp'),
  stage_11: require('../../../assets/legacy-art/stages/stage11.webp'),
  stage_12: require('../../../assets/legacy-art/stages/stage12.webp'),
};

export const SHIELD_GIF = require('../../../assets/legacy-art/effects/escudo.gif');

/** Versões entardecer/noite de cada cenário ao ar livre (o dia é STAGE_ART). Caverna e cassino não têm. */
export const STAGE_ART_VARIANT: Record<string, { dusk: number; night: number }> = {
  stage_1: { dusk: require('../../../assets/legacy-art/stages/stage1_dusk.webp'), night: require('../../../assets/legacy-art/stages/stage1_night.webp') },
  stage_2: { dusk: require('../../../assets/legacy-art/stages/stage2_dusk.webp'), night: require('../../../assets/legacy-art/stages/stage2_night.webp') },
  stage_3: { dusk: require('../../../assets/legacy-art/stages/stage3_dusk.webp'), night: require('../../../assets/legacy-art/stages/stage3_night.webp') },
  stage_4: { dusk: require('../../../assets/legacy-art/stages/stage4_dusk.webp'), night: require('../../../assets/legacy-art/stages/stage4_night.webp') },
  stage_5: { dusk: require('../../../assets/legacy-art/stages/stage5_dusk.webp'), night: require('../../../assets/legacy-art/stages/stage5_night.webp') },
  stage_6: { dusk: require('../../../assets/legacy-art/stages/stage6_dusk.webp'), night: require('../../../assets/legacy-art/stages/stage6_night.webp') },
  stage_7: { dusk: require('../../../assets/legacy-art/stages/stage7_dusk.webp'), night: require('../../../assets/legacy-art/stages/stage7_night.webp') },
  stage_9: { dusk: require('../../../assets/legacy-art/stages/stage9_dusk.webp'), night: require('../../../assets/legacy-art/stages/stage9_night.webp') },
  stage_10: { dusk: require('../../../assets/legacy-art/stages/stage10_dusk.webp'), night: require('../../../assets/legacy-art/stages/stage10_night.webp') },
  stage_11: { dusk: require('../../../assets/legacy-art/stages/stage11_dusk.webp'), night: require('../../../assets/legacy-art/stages/stage11_night.webp') },
};

export function stageArt(key: string, variant: 'day' | 'dusk' | 'night' = 'day'): number {
  if (variant !== 'day') {
    const v = STAGE_ART_VARIANT[key];
    if (v) return v[variant];
  }
  return STAGE_ART[key];
}
