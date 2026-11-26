# Fundos e telas

## Os 13 cenários
`assets/scenes/scene_<nome>.webp` (WebP 16:9) mais 7 mares gerados `bg_sea_*.webp`. Catálogo em `src/game/menu/sceneArt.ts`
(`SCENES`, cor da sombra e partículas de cada um), imagens em `sceneImages.ts`.
Os de número 3 e 4 (sombra e árvore) vieram com só 508 px e proporção 3:2: foram cortados para 16:9 e ampliados 2x sem suavizar.

| Cenário | Imagem |
| --- | --- |
| lava | vulcão com lava |
| ice | dragão do gelo dormindo |
| shadow | dragão sombrio |
| tree | cachorro sentado sob a árvore |
| sunset | por do sol no mar com dois ursos |
| trio | diabinho, anjo e Sahur |
| battle | luta de orcs e cavaleiro |
| city | prédios à noite |
| casino | fachada do cassino |
| cave | caverna com moai |
| forest | floresta mágica com bichinhos |
| duel | dois lutadores em duelo |
| sea | fundo do mar |

## Telas com fundo
`SCREEN_SCENE` (sceneArt.ts). Cenários podem repetir porque há mais telas que imagens.

| Estilo | Telas (cenário) |
| --- | --- |
| RAIL (conteúdo compacto à esquerda, arte à direita) | Início (sunset), Jogar (battle), Opções (ice), Créditos (forest), Status (cave), Progresso (sea) |
| DIM (conteúdo na tela toda, arte escurecida) | Versus (duel), Mundos (tree), Missões (city), Habilidades (lava), Torre (trio), Cassino (casino), Inventário (shadow), Perfil (trio), Tutorial (battle), Controles (ice) |

`ArtBackdrop` recebe `scene` e `rail` ou `dim`. No RAIL o conteúdo fica na área livre à esquerda (`paddingRight: 48%`, espaço
para o VOLTAR embaixo); no DIM uma camada escura cobre a arte inteira. Sem `scene`, vale o fundo animado antigo (brasas).
As Opções têm um painel escuro rolável nas páginas de ajustes (Sons, Jogo, Controles, Idioma, Cutscenes).
O botão e a tela de Sair não existem mais.

## Partículas
`SceneParticles.tsx`: procedurais (lava solta brasas, gelo neva, mar solta bolhas, cassino brilha...), só `transform` e `opacity`,
nunca recebem toque, respeitam "reduzir movimento" do aparelho e usam metade no MODO LEVE. Presets em `sceneArt.ts`.

## Cena de subir de nível
Não usa estes cenários: `LevelUpBackdrop.tsx` desenha um gradiente com as cores do personagem (`levelUpScene.ts`, 16 paletas),
aura pulsando, raios girando e o chão do lugar. Ver `docs/CUTSCENES.md`.

## Como conferir
`npx expo export --platform web --output-dir /tmp/dist`, servir a pasta com reescrita de rotas e abrir cada rota (`/options`,
`/versus`...) no Chromium em 900x420 (paisagem de celular).
