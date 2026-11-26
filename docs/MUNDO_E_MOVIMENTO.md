# Mundo, ilhas e movimento

## Mapa
`src/game/world/worldGen.ts`: o mapa principal vem de `mapa.webp` (decodificado) e as ilhas extras são retângulos de tiles numa
faixa abaixo dele. Tipos de bloco: grass, path, water, tree, rock, wall, sand, flower, stone, dock, lava, ash, snow, cliff, shop,
house, door. `BUILDING_RECTS`/`BUILDING_DOORS` registram os prédios (porta de 3 blocos, avental livre à frente);
`FERRY_DOCKS` os cais; `REGION_ANCHORS` o ponto de chegada de cada ilha.

## Ilhas pequenas (revisão de novembro de 2026)
- Acampamento: 71x71 blocos (era 121x121 e antes 281x161). Portão sul e cais fixos; os NPCs foram aproximados do salão
  (Grosh 376,1330; Capitão Ferro 400,1306; Tico 400,1348; Cara Tranquilo 424,1312; Gato 424,1336).
- Ilha dos Cães: 151x165 blocos (25 mil contra 77 mil). A borda norte (pier do cais) e a âncora (1225,1298) ficaram onde estavam.
- Ilha abre por missão ou por bandeira: `islandState.isIslandUnlocked` lê `isl_open_<ilha>` (campanhas de outros personagens usam
  `reward.flag`); Gelo, Vulcão e Trevas, no Dogge, abrem por missões dele.

## Colisão (só em `src/game/collision/collision.ts`)
- `isTileSolid`, `isAreaSolid`, `resolveMove`, `resolveMoveBoxes` (móveis dentro de prédios).
- `resolveMoveSolid(map, pos, size, delta, bodies, airborne)`: como `resolveMove` mais corpos sólidos. Quem já encosta no
  jogador é ignorado (nunca fica preso). No ar ignora corpos e obstáculos finos.
- `isThinObstacle`: pedra ou árvore com chão livre dos dois lados em algum eixo. Paredões, montanhas, florestas fechadas e água
  não são finos e continuam bloqueando.
- `landFromJump`: se o jogador pousa dentro de pedra/árvore, vai para o chão livre mais perto (olhando para a frente) ou volta
  ao último ponto seguro.
- `singleAxisInput`: UMA direção por vez; se duas de eixos diferentes estão apertadas, vale a última apertada.
- `bodyBox`: caixa de ~0,7 x 0,5 bloco para NPC, inimigo ou chefe.

## No WorldScreen
- Corpos sólidos: NPCs ativos (`isPlacementActive` + `npcPose`), inimigos vivos (`enemies.enemies`) e chefes não derrotados com
  `spot`, num raio de 12 blocos, atualizados a cada 120 ms.
- Pulo: `JUMP_MS` 420 e `PLAYER_SPEED` 190 dão ~80 px de alcance (um bloco de 32 px mais o corpo de 22). Durante o pulo o
  jogador passa por cima de corpos e de obstáculos finos; ao pousar `landFromJump` corrige. Inimigos já não causavam contato em pulo.
- Não existem puzzles de mapa que dependam do pulo (é trabalho futuro). Dentro de prédios os NPCs ainda não são sólidos.

## Estruturas
Toda estrutura de 4 blocos de largura ou mais tem porta e interior. As 8 que eram só desenho foram registradas:
`casa_vila_1..7` (vila ao redor da praça) e `casa_fragmentos` (retângulo exato do desenho; conteúdo em `buildingContent.ts`:
nome, modelo de interior e um baú). Só as 2 barracas de 2x2 e 3x2 ficam sem porta (pequenas demais para uma porta de 3 blocos).
Prédios principais: casa_dogge, casa_gadigago, casa_iracema, plaza_shop, caverna, salao_geral, guilda, casa_montanha, loja_gelo,
casa_pico, loja_misteriosa, loja_vulcao, descanso_vulcao, loja_abandonada, salao_camp.

## Escudo e aura
O escudo é o `escudo.gif` (`battle/ShieldGif.tsx`), centralizado no corpo, na luta e no mundo. A aura de carregar do mundo é
igual à da luta: com pose `charge` o sprite muda; sem ela, `AuraEffect` do tamanho do corpo.
