# Cutscenes (todas por código)

Não há mais vídeos no projeto. Cada cutscene é uma lista de **quadros** (`CodeBeat`) tocada por `CodeCutscenePlayer`:
cenário (um dos 13 novos, as arenas `stage1..13` com entardecer/noite ou os mares gerados), partículas, personagens
animados com os sprites de luta, NPCs do pacote, ícones, efeitos (flash, tremor, escurecer, zoom), sons e fala com efeito de
digitação.

| Arquivo | Conteúdo |
| --- | --- |
| `src/game/story/codeCutscenes.ts` | tipos e funções puras (`CodeCutscene`, `CodeBeat`, `beatDuration`) |
| `src/game/story/CodeCutscenePlayer.tsx` | o player (RN + Reanimated) |
| `src/game/story/CutscenePlayer.tsx` | recebe `id`, acha o roteiro e toca; id sem roteiro chama `onDone` |
| `src/game/story/cutsceneText.ts` | tradução e apelido do jogador (`{player}`) |
| `src/game/story/campaigns/doggeCutscenes.ts` | 23 cenas da história do Dogge (convertidas dos antigos vídeos) |
| `src/game/story/campaigns/doggeExtraCutscenes.ts` | flashback do Vovô Bento e as 16 curtas (cassino, escalada, baú, nível) |
| `src/game/story/campaigns/doggeTexts.ts` | traduções en, es, fr, ja das falas e títulos |
| `src/game/story/campaigns/index.ts` | `CODE_CUTSCENES` (por id) e `CUTSCENE_TEXTS` (todas as traduções) |
| `src/game/story/cutscenes.ts` | registro: ids, títulos e gatilhos (missão, evento, final) |

## Regras
- **Apelido do jogador:** nas falas, escreva `{player}`; o player troca pelo apelido da conta (`getAccount().nick`).
  Nunca escreva o nome do personagem para falar com o jogador.
- **Skin, chapéu e capa:** o ator com `player: true` é desenhado como o jogo desenha (corpo com a skin, `HatLayer`,
  `CapeLayer`), exatamente como o jogador está equipado. Se a skin não tem a pose pedida, usa a parada.
- **Tradução:** texto em português é a chave de `CUTSCENE_TEXTS` (`[en, es, fr, ja]`); sem tradução o texto sai em português.
  O teste `tests/unit/historia/cutscenes.test.mjs` exige tradução de todo texto, os mesmos `{marcadores}` e nenhum travessão.
- **Sons:** `music`, `ambient` e `sfx` usam as chaves de `audio/audioAssets.ts` (o teste confere que existem).
- Toque: completa a fala e avança; PULAR sempre visível; a música de antes volta ao fim.

## Como criar uma cena nova
Acrescente um `CodeCutscene` na lista da campanha, as traduções na tabela dela e registre em `campaigns/index.ts`. Se for
disparada por missão ou evento, adicione a entrada em `cutscenes.ts`.
