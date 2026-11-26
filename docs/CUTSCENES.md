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

## Movimento, câmera e efeitos (como os vídeos antigos)
Cada quadro (`CodeBeat`) pode ter, além de cenário e fala:
- `actors[].path`: trajeto `{t, x, y}` (t em ms desde o início do quadro, x e y frações da tela). O movimento entre pontos é suave
  (smoothstep) e, enquanto o personagem se move, o player usa os quadros de caminhada (lutadores) ou a folha de caminhada (NPCs).
- `actors[].poses`: trocas de pose no tempo; `actors[].fades`: aparece e some aos poucos; `anim`: balanço parado (bob, jump, shake).
- `cam`: `{z0, z1, fx, fy, pan}` zoom e deslize da câmera (só o cenário se move; os personagens ficam no lugar).
- `effects`: golpes (`hit_flash`, `hit_strong`, `hit_ult`, `charge_up`) com `SpriteEffect` nos instantes certos.
- `sfx`: sons por quadro com atraso; `music` e `ambient` na cena; `textFor`: a fala some quando o personagem termina.
- `shot: true`: primeiro quadro de uma tomada nova (transição a partir do preto).
O relógio do quadro é um valor do Reanimated; tudo roda na thread de UI e as animações são canceladas ao sair (o teste de limpeza confere).

## Atores especiais
- `player: true`: personagem do jogador, desenhado com o corpo da skin e os `HatLayer`/`CapeLayer` vestidos (se a skin não tem a
  pose pedida, usa a parada, para chapéu e corpo nunca ficarem em desacordo).
- `char: '@player'`: o personagem de história do mundo atual (usado em cenas que valem para todos).
- `kind: 'npc'` usa os NPCs do pacote (c08...), com escala do sprite original; `kind: 'icon'` usa os ícones do jogo.

## Subir de nível
A cena `subiu_de_nivel` usa `levelUp: true`: `LevelUpBackdrop` desenha um gradiente com as cores do PERSONAGEM
(`levelUpScene.AURA_COLORS`, 16 paletas), aura que pulsa e raios que giram, e o chão do lugar (`groundFromTile`: grama, areia,
neve, pedra, lava, cinza, cais, água, ou fundo do mar quando mergulhado). `WorldScreen` chama `setLevelUpGround(...)` antes de
enfileirar `level:up`.

## Origem e perdas da conversão
As cenas do Dogge foram convertidas dos roteiros Python dos vídeos antigos (167 quadros; 41 atores com trajeto, 32 com troca de
pose, 8 efeitos de golpe), mais 17 escritas à mão (flashback e curtas). As 8 cenas do mar (14 a 21) perderam as camadas e os
sprites desenhados por programa (ondas, brilhos, barco, criaturas); as curtas são mais simples que os vídeos.
