import type { Lang } from './translations';

/** Textos do menu "REVER CUTSCENES" (Opções). Mesclado em extraStrings.ts. Títulos dos vídeos ficam em pt, como os chefes. */
export const STRINGS_CUTSCENES: Record<Lang, Record<string, string>> = {
  pt: {
    opt_cat_cutscenes: 'REVER CUTSCENES',
    opt_short_cutscenes: 'CUTSCENES CURTAS',
    opt_short_cutscenes_note: 'Vídeos curtos ao escalar, ganhar no cassino, abrir baús e subir de nível. As cutscenes da história não são afetadas.',
    cutscenes_none: 'Nenhuma cutscene vista ainda. Elas aparecem aqui depois que passarem na história.',
    cutscenes_note: 'Toque numa cutscene para assistir de novo.',
  },
  en: {
    opt_cat_cutscenes: 'REPLAY CUTSCENES',
    opt_short_cutscenes: 'SHORT CUTSCENES',
    opt_short_cutscenes_note: 'Short videos when climbing, winning at the casino, opening chests and leveling up. Story cutscenes are not affected.',
    cutscenes_none: 'No cutscenes seen yet. They show up here after they play in the story.',
    cutscenes_note: 'Tap a cutscene to watch it again.',
  },
  es: {
    opt_cat_cutscenes: 'REVER CINEMÁTICAS',
    opt_short_cutscenes: 'CINEMÁTICAS CORTAS',
    opt_short_cutscenes_note: 'Vídeos cortos al escalar, ganar en el casino, abrir cofres y subir de nivel. Las cinemáticas de la historia no cambian.',
    cutscenes_none: 'Aún no has visto ninguna cinemática. Aparecerán aquí cuando salgan en la historia.',
    cutscenes_note: 'Toca una cinemática para verla otra vez.',
  },
  fr: {
    opt_cat_cutscenes: 'REVOIR LES CINÉMATIQUES',
    opt_short_cutscenes: 'CINÉMATIQUES COURTES',
    opt_short_cutscenes_note: 'Courtes vidéos en escaladant, en gagnant au casino, en ouvrant des coffres et en montant de niveau. Les cinématiques de l’histoire ne changent pas.',
    cutscenes_none: 'Aucune cinématique vue pour l’instant. Elles apparaîtront ici après leur diffusion dans l’histoire.',
    cutscenes_note: 'Touchez une cinématique pour la revoir.',
  },
  ja: {
    opt_cat_cutscenes: 'ムービーを見る',
    opt_short_cutscenes: 'ショートムービー',
    opt_short_cutscenes_note: '登山・カジノの勝利・宝箱・レベルアップ時の短いムービー。ストーリーのムービーは変わりません。',
    cutscenes_none: 'まだ見たムービーはありません。ストーリーで再生されるとここに表示されます。',
    cutscenes_note: 'ムービーをタップすると、もう一度見られます。',
  },
};
