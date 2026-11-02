import type { Lang } from './translations';

/** Textos novos do game feel de combate (Parte 1 do plano de execução), mesclados ao STRINGS em translations.ts. */
export const STRINGS_COMBATE: Record<Lang, Record<string, string>> = {
  pt: {
    battle_crit: 'CRÍTICO!',
  },
  en: {
    battle_crit: 'CRITICAL!',
  },
  es: {
    battle_crit: '¡CRÍTICO!',
  },
  fr: {
    battle_crit: 'CRITIQUE !',
  },
  ja: {
    battle_crit: 'クリティカル!',
  },
};
