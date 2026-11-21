import type { Lang } from './translations';

/** Nomes das novas categorias da barra de platina (Parte 3.2). Mesclado em extraStrings.ts. */
export const STRINGS_PROGRESS: Record<Lang, Record<string, string>> = {
  pt: {
    upgrade_shop_title: "LOJA DE PODER",
    upgrade_shop_subtitle: "Gaste seus pontos de poder para melhorar seus atributos.",
    progress_secret: 'Missões secretas',
    progress_bosses: 'Chefes derrotados',
    progress_tower: 'Torre dos Desafios',
    progress_skills: 'Árvore de habilidades',
  },
  en: {
    upgrade_shop_title: "POWER SHOP",
    upgrade_shop_subtitle: "Spend your power points to improve your stats.",
    progress_secret: 'Secret missions',
    progress_bosses: 'Bosses defeated',
    progress_tower: 'Tower of Challenges',
    progress_skills: 'Skill tree',
  },
  es: {
    upgrade_shop_title: "TIENDA DE PODER",
    upgrade_shop_subtitle: "Gasta tus puntos de poder para mejorar tus atributos.",
    progress_secret: 'Misiones secretas',
    progress_bosses: 'Jefes derrotados',
    progress_tower: 'Torre de los Desafíos',
    progress_skills: 'Árbol de habilidades',
  },
  fr: {
    upgrade_shop_title: "BOUTIQUE DE PUISSANCE",
    upgrade_shop_subtitle: "Dépensez vos points de puissance pour améliorer vos attributs.",
    progress_secret: 'Missions secrètes',
    progress_bosses: 'Boss vaincus',
    progress_tower: 'Tour des Défis',
    progress_skills: 'Arbre de compétences',
  },
  ja: {
    upgrade_shop_title: "パワーショップ",
    upgrade_shop_subtitle: "パワーポイントを使ってステータスを強化しよう。",
    progress_secret: 'シークレットミッション',
    progress_bosses: '倒したボス',
    progress_tower: '挑戦の塔',
    progress_skills: 'スキルツリー',
  },
};
