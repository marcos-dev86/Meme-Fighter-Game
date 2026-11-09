/**
 * Cutscenes em VÍDEO (mp4 pré-renderizado, tocado nativamente; nada é animado por código em tempo real).
 * Este arquivo é PURO (sem React/RN) para os testes em Node. Os `require` dos mp4 ficam em cutsceneAssets.ts,
 * o estado (visto/fila) em cutsceneState.ts e o player em CutscenePlayer.tsx.
 */
export type EndingKind = 'union' | 'glory' | 'power';

export type CutsceneTrigger =
  /** Dispara quando a ÚLTIMA das missões listadas é concluída (todas precisam estar concluídas). */
  | { missions: string[] }
  /** Toca no início da tela de final correspondente. */
  | { ending: EndingKind };

export interface CutsceneDef {
  /** Também é o nome do arquivo: assets/cutscenes/<id>.mp4 */
  id: string;
  title: string;
  trigger: CutsceneTrigger;
  /** Cenas dos finais: bem mais longas que as demais. */
  final?: boolean;
}

export const CUTSCENES: CutsceneDef[] = [
  { id: '01_flashback_vovo', title: 'Flashback do Vovô Bento', trigger: { missions: ['talk_bento'] } },
  { id: '02_rival_gadigago', title: 'O Rival Gadigago', trigger: { missions: ['rival_battle'] } },
  { id: '03_cassino_troll', title: 'Troll Face na porta do cassino', trigger: { missions: ['visit_misteriosa'] } },
  { id: '04_legiao_ferro', title: 'A Legião Cinzenta', trigger: { missions: ['camp_showdown'] } },
  { id: '05_rei_dos_caes', title: 'O Rei dos Cães', trigger: { missions: ['island_boss'] } },
  { id: '06_tres_fragmentos', title: 'Os Três Fragmentos', trigger: { missions: ['lore_complete'] } },
  { id: '07_guardiao_vulcao', title: 'O Guardião do Vulcão', trigger: { missions: ['vulcao_boss'] } },
  { id: '08_ilha_trevas', title: 'A Ilha das Trevas', trigger: { missions: ['visit_trevas'] } },
  { id: '09_topo_do_mundo', title: 'O Topo do Mundo', trigger: { missions: ['mountain_summit'] } },
  { id: '10_cume_vulcao', title: 'O Cume do Vulcão', trigger: { missions: ['volcano_summit'] } },
  { id: '11_tres_troncos', title: 'Os Três Troncos', trigger: { missions: ['tronco_sahur', 'tronco_sahur_god', 'tronco_sahur_evil'] } },
  { id: '12_subsolo_cassino', title: 'O Segredo do Subsolo', trigger: { missions: ['cas_subsolo'] } },
  { id: '13_pedra_moai', title: 'A Pedra Moai', trigger: { missions: ['moai_stone'] } },
  { id: 'final_uniao', title: 'Final: A Ilha Inteira', trigger: { ending: 'union' }, final: true },
  { id: 'final_gloria', title: 'Final: O Verdadeiro Meme Fighter', trigger: { ending: 'glory' }, final: true },
  { id: 'final_poder', title: 'Final: O Rei das Sombras', trigger: { ending: 'power' }, final: true },
];

export const CUTSCENE_BY_ID: Record<string, CutsceneDef> = Object.fromEntries(CUTSCENES.map((c) => [c.id, c]));

/** Prefixo da bandeira (por save) que marca a cutscene como já exibida. */
export const CUTSCENE_FLAG_PREFIX = 'cs:';
export const cutsceneFlag = (id: string) => `${CUTSCENE_FLAG_PREFIX}${id}`;

export function getCutscene(id: string | null | undefined): CutsceneDef | null {
  return (id && CUTSCENE_BY_ID[id]) || null;
}

/**
 * A cutscene que a conclusão de `missionId` libera, ou null. Quando o gatilho lista várias missões, só libera se TODAS já
 * estiverem concluídas (`isCompleted`), ou seja, na última que fechar. `alreadySeen` evita repetir.
 */
export function cutsceneForMission(missionId: string, isCompleted: (missionId: string) => boolean, alreadySeen: (cutsceneId: string) => boolean = () => false): CutsceneDef | null {
  for (const c of CUTSCENES) {
    if (!('missions' in c.trigger) || !c.trigger.missions.includes(missionId)) continue;
    if (alreadySeen(c.id)) continue;
    if (c.trigger.missions.every((m) => m === missionId || isCompleted(m))) return c;
  }
  return null;
}

export function cutsceneForEnding(ending: EndingKind): CutsceneDef | null {
  return CUTSCENES.find((c) => 'ending' in c.trigger && c.trigger.ending === ending) ?? null;
}

/** Fila simples (pura): evita duplicar e respeita o que já foi visto. */
export function enqueueCutscene(queue: string[], id: string, alreadySeen: (cutsceneId: string) => boolean): string[] {
  if (!CUTSCENE_BY_ID[id] || alreadySeen(id) || queue.includes(id)) return queue;
  return [...queue, id];
}
