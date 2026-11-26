# Campanhas: o modo história de cada personagem

## Estado
- **Dogge:** campanha completa no jogo (`story/missionsDogge.ts`, `missionsMar.ts`, `missionsCassino.ts`, 10 escolhas em
  `storyChoices.ts`, 3 finais em `storyEnding.ts` e `screens/EndingScreen.tsx`).
- **Outros 15 personagens:** a lore e a história de cada um estão escritas (`meme-fighter-historias.zip`: lore do mundo e um
  arquivo por personagem com 3 atos e final), mas NENHUMA campanha foi ligada ao jogo ainda. Só a habilidade deles já funciona.
- O restante deste documento é o modelo e o plano para implementá-las, 2 personagens por entrega.

## Peças do jogo que as campanhas usam
- **Registro de personagens** (`story/characters.ts`): `STORY_CHARACTERS` por id. Hoje só o Dogge está nele. Cada entrada tem
  nome, lutador, `unlockedByDefault`, `unlocks`, `spawn`, `ability` e `missions`. `story/allMissions.ts` (`MISSIONS_ALL`) junta as
  missões de todos os registrados; o estado é por personagem (`questState.ts`, `characterId` no save).
- **Missões** (`story/missionTypes.ts`): `MissionDef` com id único, título, dica, capítulo, `requires`, recompensa (`reward.flag`
  aciona uma bandeira ao concluir) e UM objetivo: `talk`, `battle` (giver NPC + opponent + stageKey + offerTitleKey), `enter`
  (prédio), `visit` (ilha), `pickups`, `kills`, `reach`, `flag` ou `chain` (passos em ordem, com falas). `branch` cria missões de
  caminho que só existem depois de uma escolha. Uma missão com `final: true` conclui a campanha.
- **Escolhas** (`story/storyChoices.ts`): `ChoiceDef` ligada a um NPC; cada opção liga bandeiras; `makeChoice` grava a opção.
- **Ilhas por bandeira:** missão com `reward.flag: 'isl_open_<ilha>'` abre a ilha no barco (`islandState`). O barco só depende
  disso; Gelo, Vulcão e Trevas abrem por missões do Dogge, então outros personagens precisam da bandeira.
- **Final:** `EndingScreen` é do Dogge (union, glory, power). Para os outros: tocar a cutscene do final escolhido e marcar a
  bandeira `char_ending_seen`; `endingShouldPlay` (storyEnding.ts) passa a valer "final concluída e sem `char_ending_seen`" quando
  o personagem não é o Dogge. O tipo `Ending` não muda.
- **Cutscenes** (`docs/CUTSCENES.md`): roteiros em `campaigns/<personagem>.ts` + tabela de tradução; registrar em
  `campaigns/index.ts` e em `story/cutscenes.ts` (id, título e missão que libera). O teste de cutscenes deve ser atualizado.
- **Ofertas de duelo:** os textos `quest_*_offer` citam nomes do Dogge; as campanhas usam chaves novas e genéricas nos 5
  idiomas (ex.: `cmp_offer_duel`, em um `i18n/stringsCampanhas.ts` registrado em `extraStrings.ts`).

## Decisões fixas
1. No mundo do **Gadigago** o NPC `rival` da praça é o **Dogge** (nome, sprite e duelos). O **Maior Fã** usa o lutador **Ninja** e o
   NPC `mercador_noturno` (Mercador da Madrugada, encapuzado, vende ingressos), sempre ativo na campanha. O NPC Padrão não é usado.
2. As falas dos NPCs mudam conforme o personagem da campanha e o ponto da história (overrides por campanha).
3. As falas e cutscenes falam do jogador por `{player}` (apelido), nunca pelo nome do personagem.
4. Cada personagem terá a sua PRÓPRIA árvore de habilidades (pode repetir habilidades quando fizer sentido).
5. Habilidades valem em todos os modos (`docs/HABILIDADES.md`).
6. Nenhum travessão em texto do jogo; narrativa em português; cutscenes nos 5 idiomas.

## Desenho já validado (rascunho de código)
Um primeiro esboço foi escrito e depois guardado fora do projeto para não entregar código pela metade. A ideia é esta.

### Tipos puros de uma campanha (`story/campaigns/types.ts`)
```ts
/**
 * Modelo de uma campanha (ver MODELO_DE_CAMPANHA.txt). Tudo aqui é dado puro (sem React nem estado), para os testes em Node.
 * A campanha é ligada ao jogo por: characters.ts (registro), cutscenes.ts (gatilhos), storyChoices.ts (escolha final),
 * EndingScreen (final), questState (NPCs trocados) e campaigns/index.ts (tudo junto).
 */

/** Mudanças de um NPC enquanto ESTA campanha é a do mundo (o mundo é o mesmo para todos os personagens). */
export interface NpcOverride {
  name?: string;
  role?: string;
  /** Passa a usar o sprite de um lutador (e pode ser desafiado como ele). */
  fighterSprite?: CharacterKey;
  sheetChar?: string;
  /** Falas livres (quando não há uma missão falando por ele). */
  dialogue?: string[];
  /** Sempre aparece (ignora `only: night/rain`). */
  alwaysActive?: boolean;
}

/** Cutscene da campanha: o roteiro + os metadados do registro (título e a missão que a libera). */
export interface CampaignCutscene extends CodeCutscene {
  title: string;
  /** Missões cuja conclusão libera a cena, ou null nas cenas de final (tocadas pela tela de final). */
  after: string[] | null;
}

export interface CampaignChoiceOption {
  id: string;
  label: string;
  lines: string[];
  coins?: number;
  items?: Record<string, number>;
  xp?: number;
  /** Bandeiras extras. A bandeira `<escolha>_done` é acrescentada automaticamente. */
  flags?: string[];
}

export interface CampaignChoice {
  id: string;
  npcId: string;
  /** Missão que precisa estar concluída para a escolha aparecer. */
  after: string;
  intro: string[];
  options: CampaignChoiceOption[];
}

export interface CampaignEnding {
  /** Opção da escolha final que leva a este final. */
  option: string;
  /** Id da cutscene de final (em `cutscenes`, com after: null). */
  cutscene: string;
  title: string;
}

export interface Campaign {
  characterId: string;
  name: string;
  fighter: CharacterKey;
  /** Onde um mundo NOVO deste personagem começa (blocos). */
  spawn: { x: number; y: number };
  unlockedByDefault: boolean;
  missions: MissionDef[];
  cutscenes: CampaignCutscene[];
  texts: CutsceneTexts;
  /** Escolhas finais ou de caminho, na ordem. A ÚLTIMA é a que decide o final da campanha. */
  choices: CampaignChoice[];
  endings: CampaignEnding[];
  npcOverrides: Record<string, NpcOverride>;
}

/** Bandeira que conclui a missão final (acionada por qualquer opção da escolha final). */
export const choiceDoneFlag = (choiceId: string) => `${choiceId}_done`;
```

### NPCs trocados por campanha (`story/campaigns/npcOverrides.ts`)
O mundo é um só. Quando o personagem do mundo muda (`questState.restoreQuestState` e `resetQuestState`), `applyNpcOverrides(id)`
restaura os NPCs originais e aplica os da campanha mexendo nas próprias entradas de `NPCS` (todo o jogo já lê dali).
Ligações necessárias: `world/npcActive.ts` (`isNpcAlwaysActive` ignora `only: night/rain`) e `world/npcs.ts`
(`getNpcDialogue` só usa as conversas especiais do Dogge de `rival`, `soldier_captain`, `dogking` e `tank_vulcao` quando o personagem
é o Dogge; nas outras campanhas valem as falas da missão ou `npc.dialogue`). `questId` dos NPCs é zerado nas campanhas, porque
aponta para missões do Dogge.
```ts
import { NPCS, type NpcDef } from '@/game/world/npcs';
import { CAMPAIGNS } from './index';

/**
 * NPCs trocados por campanha. O mundo é um só: quando o personagem do mundo muda (novo mundo, carregar save), os NPCs ganham as
 * mudanças da campanha dele (nome, sprite, falas, aparecer sempre) e voltam ao normal para os outros personagens. Funciona
 * mexendo nas próprias entradas de NPCS (todo o jogo já lê dali), guardando o original para restaurar.
 */
const ORIGINAL = new Map<string, NpcDef>();
let activeId = 'dogge';
let alwaysActive = new Set<string>();

export function applyNpcOverrides(characterId: string) {
  activeId = characterId;
  // 1) volta tudo ao original
  for (const [id, def] of ORIGINAL) NPCS[id] = { ...def };
  alwaysActive = new Set();
  // 2) aplica a campanha, se houver
  const camp = CAMPAIGNS[characterId];
  if (!camp) return;
  for (const [id, o] of Object.entries(camp.npcOverrides)) {
    const cur = NPCS[id];
    if (!cur) continue;
    if (!ORIGINAL.has(id)) ORIGINAL.set(id, { ...cur });
    const next: NpcDef = { ...cur };
    if (o.name !== undefined) next.name = o.name;
    if (o.role !== undefined) next.role = o.role;
    if (o.dialogue !== undefined) next.dialogue = o.dialogue;
    if (o.fighterSprite !== undefined) next.fighterSprite = o.fighterSprite;
    if (o.sheetChar !== undefined) next.sheetChar = o.sheetChar;
    next.questId = undefined; // as missões "de NPC" do Dogge (rival_battle, camp_showdown...) não valem em outras campanhas
    NPCS[id] = next;
    if (o.alwaysActive) alwaysActive.add(id);
  }
}

/** O NPC aparece sempre (ignora noite/chuva) na campanha atual? */
export function isNpcAlwaysActive(npcId: string): boolean {
  return alwaysActive.has(npcId);
}
export function getOverrideCharacter(): string {
  return activeId;
}
```

## Plano de entrega (2 personagens por zip)
| Lote | Personagens |
| --- | --- |
| 1 | gadigago + orc |
| 2 | soldier + dogking |
| 3 | tank + ninja |
| 4 | mystic + green_dragon |
| 5 | ice_dragon + shadow_dragon |
| 6 | troll_face + cara_tranquilo |
| 7 | sahur + sahur_god |
| 8 | sahur_evil (e revisão do Dogge) |

Cada lote entrega: missões com objetivos funcionais, diálogos de NPC próprios, cutscenes por código (início, virada, clímax e um
final por opção), escolha final com 2 a 4 finais, recompensas, desbloqueios, árvore de habilidades própria, testes e documentação.

## Plano do lote 1 (detalhe em `MODELO_DE_CAMPANHA.txt` do zip das histórias)
**Gadigago** (começa na porta de `casa_gadigago`, 879,934): convite na estátua e Pipoca; mestres Rei dos Cães (stage_11), Capitão
Ferro (stage_10, abre Gelo), Helga e Rocha (stage_5, abre Vulcão), Guardião do Vulcão (stage_4); espelho com o Bento; duelo com o
Dogge (o `rival`); volta à praça (Iracema, Bento, Pipoca); Maior Fã (ninja); escolha final com o Bento: encerrar o espetáculo,
recusar o fim da rivalidade ou aceitar a proposta do Maior Fã.
**Orc** (começa no acampamento, ~400,1340): ordem do Capitão e bênção do Tico; treino com Grosh; confisco com Marina e Toinho;
duelo com o Gadigago (`rival`); deserção na Ilha dos Cães (Footman, Barqueiro, Corvão, Tank); devolver o confiscado e morar com
Dona Iracema; provas na caverna com o espião (ninja); volta ao acampamento; duelo de dispensa com o Capitão; escolha final:
perdoar e entregar as provas, convencer a tropa, ou (escolha anterior) nunca voltar (final "O Desertor").

## Critérios de pronto de um lote
`npx tsc --noEmit` e `node tools/check-i18n.mjs` limpos; `npm test` sem falhas novas; testes novos da campanha (ids únicos,
NPCs/prédios/ilhas/lutadores existem, grafo de `requires` sem ciclos e com a final alcançável, bandeiras de abertura de ilha antes
do uso, cutscenes com tradução completa); capturas das telas alteradas; zip com só os arquivos novos ou alterados e a lista do que apagar.
