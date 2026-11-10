import type { Lang } from './translations';

/** Textos das aparições especiais do rival e dos inimigos de elite (Parte 2). Mesclado em extraStrings.ts. */
export const STRINGS_RIVAL_ELITE: Record<Lang, Record<string, string>> = {
  pt: {
    rival_challenge: 'DESAFIO DO RIVAL {n}/5',
    rival_appeared: 'O rival quer te desafiar de novo! Procure-o na praça.',
    elite_appeared: 'Um inimigo de elite surgiu pelas ilhas!',
    elite_defeated: 'ELITE DERROTADO!',
  },
  en: {
    rival_challenge: 'RIVAL CHALLENGE {n}/5',
    rival_appeared: 'Your rival wants another duel! Find him in the plaza.',
    elite_appeared: 'An elite enemy has appeared across the islands!',
    elite_defeated: 'ELITE DEFEATED!',
  },
  es: {
    rival_challenge: 'DESAFÍO DEL RIVAL {n}/5',
    rival_appeared: '¡El rival quiere desafiarte otra vez! Búscalo en la plaza.',
    elite_appeared: '¡Ha aparecido un enemigo de élite por las islas!',
    elite_defeated: '¡ÉLITE DERROTADO!',
  },
  fr: {
    rival_challenge: 'DÉFI DU RIVAL {n}/5',
    rival_appeared: 'Ton rival veut te défier à nouveau ! Retrouve-le sur la place.',
    elite_appeared: 'Un ennemi d’élite est apparu sur les îles !',
    elite_defeated: 'ÉLITE VAINCU !',
  },
  ja: {
    rival_challenge: 'ライバルの挑戦 {n}/5',
    rival_appeared: 'ライバルがまた勝負を挑んでくる！広場で探そう。',
    elite_appeared: '島々にエリート敵が現れた！',
    elite_defeated: 'エリート撃破！',
  },
};
