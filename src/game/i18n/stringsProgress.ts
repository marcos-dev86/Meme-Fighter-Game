import type { Lang } from './translations';

/** Nomes das novas categorias da barra de platina (Parte 3.2). Mesclado em extraStrings.ts. */
export const STRINGS_PROGRESS: Record<Lang, Record<string, string>> = {
  pt: {
    progress_secret: 'Missões secretas',
    progress_bosses: 'Chefes derrotados',
    progress_tower: 'Torre dos Desafios',
    progress_skills: 'Árvore de habilidades',
  },
  en: {
    progress_secret: 'Secret missions',
    progress_bosses: 'Bosses defeated',
    progress_tower: 'Tower of Challenges',
    progress_skills: 'Skill tree',
  },
  es: {
    progress_secret: 'Misiones secretas',
    progress_bosses: 'Jefes derrotados',
    progress_tower: 'Torre de los Desafíos',
    progress_skills: 'Árbol de habilidades',
  },
  fr: {
    progress_secret: 'Missions secrètes',
    progress_bosses: 'Boss vaincus',
    progress_tower: 'Tour des Défis',
    progress_skills: 'Arbre de compétences',
  },
  ja: {
    progress_secret: 'シークレットミッション',
    progress_bosses: '倒したボス',
    progress_tower: '挑戦の塔',
    progress_skills: 'スキルツリー',
  },
};
