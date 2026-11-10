/**
 * Lógica pura (sem React) do VERSUS estilo "Mortal Kombat": cursor da grade de lutadores, quem pode ser escolhido,
 * linha do tempo da tela "VS" e do letreiro ROUND/FIGHT da abertura de cada round. Testada em tools/test-versus.mjs.
 */

/** Colunas padrão da grade (16 lutadores = 4 x 4). A grade real é calculada por gridLayout() conforme a tela e a quantidade. */
export const GRID_COLS = 4;
/** Lado mínimo (px) de uma célula: área de toque confortável no celular. */
export const MIN_TILE = 48;
export const MAX_TILE = 84;

export interface GridLayout {
  cols: number;
  rows: number;
  tile: number;
  /** true quando nem o menor tamanho cabe na altura: a grade rola na vertical. */
  scroll: boolean;
}

/**
 * Escolhe colunas e tamanho das células para QUALQUER quantidade de lutadores e de tela: maximiza o tamanho da célula
 * (até MAX_TILE) sem sair da largura/altura; nunca fica menor que MIN_TILE (se não couber na altura, rola). Nunca sobrepõe.
 */
export function gridLayout(total: number, availW: number, availH: number, gap: number = 6): GridLayout {
  const n = Math.max(1, Math.floor(total));
  const w = Math.max(MIN_TILE + gap, availW);
  const h = Math.max(MIN_TILE + gap, availH);
  let best: GridLayout | null = null;
  const maxCols = Math.max(1, Math.min(n, Math.floor(w / (MIN_TILE + gap))));
  for (let cols = 1; cols <= maxCols; cols++) {
    const rows = Math.ceil(n / cols);
    const tile = Math.min(Math.floor(w / cols) - gap, Math.floor(h / rows) - gap, MAX_TILE);
    if (tile < MIN_TILE) continue;
    if (!best || tile > best.tile || (tile === best.tile && Math.abs(cols - 4) < Math.abs(best.cols - 4))) best = { cols, rows, tile, scroll: false };
  }
  if (best) return best;
  const cols = maxCols;
  return { cols, rows: Math.ceil(n / cols), tile: Math.min(MIN_TILE, Math.floor(w / cols) - gap), scroll: true };
}

export type Dir = 'left' | 'right' | 'up' | 'down';

/**
 * Move o cursor na grade com volta nas bordas (sai pela direita, entra pela esquerda; sai por cima, entra por baixo).
 * Na última linha incompleta, subir/descer cai na célula existente mais próxima da mesma coluna.
 */
export function moveCursor(index: number, dir: Dir, total: number, cols: number = GRID_COLS): number {
  if (total <= 0) return 0;
  const i = Math.min(Math.max(index, 0), total - 1);
  const rows = Math.ceil(total / cols);
  const row = Math.floor(i / cols);
  const col = i % cols;
  const rowLen = (r: number) => Math.min(cols, total - r * cols);
  if (dir === 'left') return row * cols + ((col - 1 + rowLen(row)) % rowLen(row));
  if (dir === 'right') return row * cols + ((col + 1) % rowLen(row));
  const nr = (row + (dir === 'down' ? 1 : -1) + rows) % rows;
  return nr * cols + Math.min(col, rowLen(nr) - 1);
}

/** Um lutador só pode ser confirmado se estiver no conjunto permitido para aquele lado. */
export function canPick(key: string, pool: readonly string[]): boolean {
  return pool.includes(key);
}

/** Primeiro índice da grade que o lado pode escolher (cursor inicial); 0 se nenhum. */
export function firstPickable(order: readonly string[], pool: readonly string[]): number {
  const i = order.findIndex((k) => pool.includes(k));
  return i < 0 ? 0 : i;
}

// ---------------------------------------------------------------- tela "VS"
export const SPLASH_MS = 2600;
/** Marcos da animação (ms): entrada dos lutadores, batida do "VS", nomes, saída. */
export const SPLASH_T = { slideEnd: 650, vsHit: 800, namesIn: 1100, holdEnd: 2200 } as const;

export interface SplashFrame {
  /** 0 = fora da tela, 1 = no lugar (os dois lutadores deslizam dos lados). */
  slide: number;
  /** Escala do "VS" (0 antes da batida; passa de 1 e assenta em 1). */
  vsScale: number;
  /** Clarão branco da batida (1 -> 0). */
  flash: number;
  /** Opacidade dos nomes e da arena. */
  names: number;
  /** Escurecimento final (0 -> 1) antes de abrir a luta. */
  fadeOut: number;
  done: boolean;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);

export function splashFrame(tMs: number): SplashFrame {
  const t = Math.max(0, tMs);
  const slide = easeOutCubic(t / SPLASH_T.slideEnd);
  const since = t - SPLASH_T.vsHit;
  let vsScale = 0;
  if (since >= 0) {
    const k = clamp01(since / 320);
    vsScale = k < 0.6 ? (k / 0.6) * 1.35 : 1.35 - ((k - 0.6) / 0.4) * 0.35; // estoura e assenta
  }
  const flash = since >= 0 ? clamp01(1 - since / 260) : 0;
  const names = clamp01((t - SPLASH_T.namesIn) / 300);
  const fadeOut = clamp01((t - SPLASH_T.holdEnd) / (SPLASH_MS - SPLASH_T.holdEnd));
  return { slide, vsScale, flash, names, fadeOut, done: t >= SPLASH_MS };
}

// ---------------------------------------------------------------- abertura do round
/** Nos últimos FIGHT_MS ms da abertura o letreiro vira "FIGHT!". */
export const FIGHT_MS = 520;

export type IntroLabel = 'round' | 'fight';

export function introLabel(remainingMs: number): IntroLabel {
  return remainingMs <= FIGHT_MS ? 'fight' : 'round';
}
