import type { Lang } from './translations';

/** Textos do menu "REVER CUTSCENES" (Opções). Mesclado em extraStrings.ts. Títulos dos vídeos ficam em pt, como os chefes. */
export const STRINGS_CUTSCENES: Record<Lang, Record<string, string>> = {
  pt: {
    opt_cat_cutscenes: 'REVER CUTSCENES',
    cutscenes_none: 'Nenhuma cutscene vista ainda. Elas aparecem aqui depois que passarem na história.',
    cutscenes_note: 'Toque numa cutscene para assistir de novo.',
  },
  en: {
    opt_cat_cutscenes: 'REPLAY CUTSCENES',
    cutscenes_none: 'No cutscenes seen yet. They show up here after they play in the story.',
    cutscenes_note: 'Tap a cutscene to watch it again.',
  },
  es: {
    opt_cat_cutscenes: 'REVER CINEMÁTICAS',
    cutscenes_none: 'Aún no has visto ninguna cinemática. Aparecerán aquí cuando salgan en la historia.',
    cutscenes_note: 'Toca una cinemática para verla otra vez.',
  },
  fr: {
    opt_cat_cutscenes: 'REVOIR LES CINÉMATIQUES',
    cutscenes_none: 'Aucune cinématique vue pour l’instant. Elles apparaîtront ici après leur diffusion dans l’histoire.',
    cutscenes_note: 'Touchez une cinématique pour la revoir.',
  },
  ja: {
    opt_cat_cutscenes: 'ムービーを見る',
    cutscenes_none: 'まだ見たムービーはありません。ストーリーで再生されるとここに表示されます。',
    cutscenes_note: 'ムービーをタップすると、もう一度見られます。',
  },
};
