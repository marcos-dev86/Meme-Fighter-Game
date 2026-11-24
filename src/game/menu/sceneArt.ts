/**
 * Catálogo dos 13 cenários de fundo (assets/scenes, WebP 16:9). Cada cenário tem a sua arte, as partículas que combinam
 * com ele e a cor da sombra que protege os botões na área livre à esquerda.
 *
 * Um cenário por tela (nenhum repete). Este arquivo é PURO (sem React) para os testes em Node; o `require` das imagens
 * fica em sceneImages.ts.
 */
export type SceneKey =
  | 'lava' | 'ice' | 'shadow' | 'tree' | 'sunset' | 'trio' | 'battle' | 'city' | 'casino' | 'cave' | 'forest' | 'duel' | 'sea';

export const SCENE_KEYS: SceneKey[] = ['lava', 'ice', 'shadow', 'tree', 'sunset', 'trio', 'battle', 'city', 'casino', 'cave', 'forest', 'duel', 'sea'];

export type ParticleShape = 'dot' | 'square' | 'ring';
export type ParticleMotion = 'up' | 'down' | 'float';

export interface ParticlePreset {
  count: number;
  colors: string[];
  size: [number, number];
  /** Duração de um ciclo em ms. */
  dur: [number, number];
  motion: ParticleMotion;
  shape: ParticleShape;
  /** Balanço lateral em pixels. */
  sway: number;
  /** Opacidade máxima (0..1). */
  alpha: number;
  /** Pisca (float) em vez de só aparecer e sumir. */
  twinkle?: boolean;
  /** Faixa vertical onde nascem, em fração da altura (padrão: tela toda). */
  band?: [number, number];
}

export interface SceneDef {
  key: SceneKey;
  /** Sombra à esquerda, atrás dos botões (r,g,b). */
  scrim: string;
  particles: ParticlePreset;
}

export const SCENES: Record<SceneKey, SceneDef> = {
  lava: { key: 'lava', scrim: '20,4,2', particles: { count: 26, colors: ['#ff8a2a', '#ffb347', '#ff5a1f'], size: [2, 5], dur: [4500, 8500], motion: 'up', shape: 'square', sway: 18, alpha: 0.9 } },
  ice: { key: 'ice', scrim: '4,8,26', particles: { count: 34, colors: ['#ffffff', '#cfe8ff', '#9fd0ff'], size: [2, 4], dur: [6500, 11500], motion: 'down', shape: 'dot', sway: 26, alpha: 0.85 } },
  shadow: { key: 'shadow', scrim: '8,2,16', particles: { count: 18, colors: ['#b06bff', '#7a3fd1', '#d9b0ff'], size: [3, 7], dur: [6000, 10500], motion: 'up', shape: 'dot', sway: 22, alpha: 0.55 } },
  tree: { key: 'tree', scrim: '22,10,6', particles: { count: 16, colors: ['#e08a3c', '#b9602a', '#f0b060'], size: [4, 7], dur: [7000, 12000], motion: 'down', shape: 'square', sway: 44, alpha: 0.8 } },
  sunset: { key: 'sunset', scrim: '8,6,30', particles: { count: 22, colors: ['#fff3b0', '#ffd27a', '#ffffff'], size: [2, 4], dur: [2200, 4200], motion: 'float', shape: 'dot', sway: 6, alpha: 0.9, twinkle: true, band: [0.55, 0.95] } },
  trio: { key: 'trio', scrim: '24,2,2', particles: { count: 24, colors: ['#ff4a3a', '#ff9a5a', '#ffffff'], size: [2, 5], dur: [4500, 8000], motion: 'up', shape: 'square', sway: 16, alpha: 0.85 } },
  battle: { key: 'battle', scrim: '4,14,30', particles: { count: 22, colors: ['#9be7ff', '#c8ff7a', '#ffffff'], size: [2, 4], dur: [1800, 3600], motion: 'up', shape: 'square', sway: 20, alpha: 0.9, band: [0.35, 1] } },
  city: { key: 'city', scrim: '3,3,14', particles: { count: 16, colors: ['#ffd98a', '#fff0c2'], size: [2, 3], dur: [3000, 6000], motion: 'float', shape: 'dot', sway: 10, alpha: 0.8, twinkle: true, band: [0.3, 0.95] } },
  casino: { key: 'casino', scrim: '8,4,20', particles: { count: 24, colors: ['#ffe27a', '#fff6c8', '#ffc24a'], size: [2, 5], dur: [1800, 3800], motion: 'float', shape: 'square', sway: 6, alpha: 0.95, twinkle: true } },
  cave: { key: 'cave', scrim: '4,2,12', particles: { count: 20, colors: ['#d8a8ff', '#9b6bff', '#ffffff'], size: [2, 4], dur: [2600, 5200], motion: 'float', shape: 'dot', sway: 8, alpha: 0.85, twinkle: true } },
  forest: { key: 'forest', scrim: '6,3,18', particles: { count: 22, colors: ['#d9a8ff', '#ffe9a0', '#9ee6ff'], size: [3, 5], dur: [3500, 7000], motion: 'float', shape: 'dot', sway: 24, alpha: 0.85, twinkle: true } },
  duel: { key: 'duel', scrim: '10,20,34', particles: { count: 24, colors: ['#ffd24a', '#ff8a2a', '#ffffff'], size: [2, 4], dur: [1500, 3400], motion: 'up', shape: 'square', sway: 22, alpha: 0.9, band: [0.4, 1] } },
  sea: { key: 'sea', scrim: '2,16,34', particles: { count: 26, colors: ['#ffffff', '#cfefff'], size: [3, 9], dur: [5000, 10000], motion: 'up', shape: 'ring', sway: 14, alpha: 0.7 } },
};

/**
 * Cenário de cada tela: os 13 aparecem e, como há mais telas que imagens, alguns se repetem.
 *  - rail: o conteúdo é um bloco compacto e fica na área livre à esquerda, sem cobrir o personagem da arte (à direita);
 *  - dim: o conteúdo ocupa a tela toda (listas, grades, árvores): a arte fica atrás, escurecida, para a leitura.
 */
export const SCREEN_SCENE = {
  home: 'sunset',
  play: 'battle',
  options: 'ice',
  credits: 'forest',
  status: 'cave',
  progress: 'sea',
  versus: 'duel',
  slots: 'tree',
  missions: 'city',
  skills: 'lava',
  tower: 'trio',
  casino: 'casino',
  inventory: 'shadow',
  profile: 'trio',
  tutorial: 'battle',
  controls: 'ice',
} as const satisfies Record<string, SceneKey>;

export const RAIL_SCREENS: ReadonlyArray<keyof typeof SCREEN_SCENE> = ['home', 'play', 'options', 'credits', 'status', 'progress'];
export const DIM_SCREENS: ReadonlyArray<keyof typeof SCREEN_SCENE> = ['versus', 'slots', 'missions', 'skills', 'tower', 'casino', 'inventory', 'profile', 'tutorial', 'controls'];
