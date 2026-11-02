# Meme-Fighter RPG

Conversão do jogo de luta **Meme-Fighter** (HTML5 Canvas) para um RPG em
Expo/React Native/TypeScript, mantendo o sistema de batalha original como
destino de integração futura em vez de descartá-lo.

📄 Auditoria técnica completa, decisões de arquitetura e roadmap:
**[`docs/AUDIT.md`](./docs/AUDIT.md)**: leia esse arquivo primeiro se
você não acompanhou a conversa onde ele foi escrito.

---

## Status atual

**Novo nesta rodada:** a primeira missão de verdade: falar com o
Gadigago (rival, na praça) oferece um desafio real, aceitar leva pra uma
batalha de verdade contra ele, vencer dá 40 Memecoins e marca a missão
como completa (as falas dele mudam depois disso). Perder não trava nada,
dá pra tentar de novo. Ver `docs/AUDIT.md` pela arquitetura
(`questState.ts`).

**Rodada anterior:** mapa sem blocos de cor lisa (prédios em SVG de
verdade), NPCs sem visual de "card colecionável", 5 idiomas em Opções,
travessão removido do projeto inteiro. Não copiei o mapa do Pokémon
FireRed nem busquei arte da Nintendo (motivo em `docs/AUDIT.md`).

**Batalha:** fiel ao original (`fighter.js`/`battle-scene.js`), sem
alterações de mecânica nesta rodada.

**Mundo:** 720×480 tiles, estradas curvas, minimapa, vida/energia/ataques
na HUD, pause no topo-centro, moeda própria, loja funcionando, 7 NPCs
mais 1 rival com missão, interior próprio por prédio.

### Como testar

```bash
cd meme-fighter-rpg
npm install
npx expo start
```

Abra no **Expo Go** ou pressione `w` pro navegador. Fale com o Gadigago
(rival, na praça) pra testar a missão nova, com o Vovô Bento pra
diálogo comum, ou entre na loja da Marina (prédio perto do chafariz).

Validado antes de entregar: `tsc --noEmit` limpo, `expo export` (web e
android) sem erros, e o servidor de dev real rodando neste ambiente:
testei `/world` e `/battle` com os parâmetros exatos da missão
(`questId=rival_battle`), os dois HTTP 200 sem erro. O sandbox usado
pra isso ficou instável no meio da checagem desta vez (processo caiu
sem motivo aparente), tentei de novo até confirmar de verdade em vez de
assumir que tinha funcionado. Não consigo ver o jogo rodando com meus
próprios olhos por aqui: julgar a experiência de verdade depende do seu
teste.

---

## O que precisa de trabalho manual (não é código)

- **Sprites top-down do personagem.** O mapa hoje reaproveita
  `idle`/`walk1-3` do Dogge (arte de perfil, feita pra luta) só pra provar
  que o sistema funciona: funciona razoavelmente andando de lado, mas não
  existe sprite de costas/de frente de verdade. Arte nova (ou redesenhada)
  é necessária antes disso parecer um RPG de verdade.
- **Tiles reais.** O mapa usa cores lisas no lugar de tileset: funciona
  para testar colisão/câmera, mas não é arte final.
- **Correção do bug de asset no jogo original**: `opções.png` está salvo
  em disco como `op#U00e7#U00f5es.png` (ver `docs/AUDIT.md`, C.1): é só
  renomear o arquivo dentro de `legacy/battle-web/assets/background/screen/`,
  não mexi nisso porque a instrução foi não alterar o projeto atual sem
  necessidade.
- **Decidir o destino de `legacy/battle-web/Use Esses Arquivos no Jogo/`**: é uma pasta de origem Godot, não usada por nenhum código (ver
  `docs/AUDIT.md`, C.2). Preservei sem excluir; avise se quiser que eu
  remova ou aproveite algo de lá.

## O que foi propositalmente deixado de fora do template do Expo

O `create-expo-app` padrão vem com navegação em abas, uma tela de boas-
vindas e um ícone animado de demonstração: removi tudo isso
(`explore.tsx`, `app-tabs.*`, `animated-icon.*`, `hint-row.tsx`,
`web-badge.tsx`, `external-link.tsx`) porque não fazem sentido para um
jogo em tela cheia. Mantive `themed-text.tsx`, `themed-view.tsx` e os
hooks de tema: não são usados pelo código do jogo (que tem identidade
visual própria, dourado/escuro, em vez de se adaptar ao tema do sistema),
mas são genéricos o suficiente para servir numa tela de opções/menu mais
pra frente.

## Estrutura

```
src/
  app/                    rotas
  game/
    core/useGameLoop.ts     loop de jogo fora do React
    world/
      worldGen.ts            gerador procedural (regiões, rio, estradas curvas, portas, ids de prédio)
      overworld.ts             MapDef que expõe o gerador
      TileMapRenderer.tsx      renderiza só os chunks perto da câmera, terreno com textura
      BuildingSprite.tsx        prédio em SVG (telhado, parede, porta, janelas)
      CharacterMarker.tsx       silhueta de NPC em SVG
      Minimap.tsx               mapa de navegação
      InteriorOverlay.tsx       interior por prédio (template + NPC + baú)
      ShopOverlay.tsx           loja funcional
      npcs.ts                   NPCs (identidade + falas + onde ficam + questId)
      pickups.ts                itens escondidos no mapa
      buildingContent.ts        nome/morador/loot de cada um dos 6 prédios
    state/
      playerState.ts             moedas + inventário compartilhados entre telas
      questState.ts               progresso de missão compartilhado entre telas
    items/itemDefs.ts          catálogo de itens + nome da moeda (Memecoin)
    i18n/                      traduções (5 idiomas) + hook useI18n
    dialogue/
      DialogueOverlay.tsx        caixa de diálogo (retrato + nome + texto)
      QuestOfferPrompt.tsx        aceitar/recusar missão
    camera/Camera.ts
    collision/collision.ts   colisão AABB, getTile() sob demanda
    input/                    D-Pad (72px) + teclado (web)
    menu/                     ArtBackdrop, MenuButton, PauseMenu
    battle/                  Fighter.ts (usado por batalha E mundo), CpuController.ts
  screens/                 HomeScreen, PlayMenuScreen, VersusScreen, BattleScreen, WorldScreen, InventoryScreen...
  types/game.ts
assets/
  legacy-sprites/           sprites dos dois lutadores
  legacy-art/                 arenas de batalha + efeito de escudo
legacy/battle-web/          projeto original, intocado
docs/AUDIT.md                auditoria + arquitetura + roadmap + changelog
```

## Próximos passos

O modo de luta padrão (2D arcade) continua sendo o item pendente mais
antigo do roadmap: ainda não voltei nele porque cada rodada trouxe pedido
novo. Depois disso: mais missões usando os NPCs que já têm gancho de
diálogo pra isso (Iara e Iracema já insinuam coisas escondidas), NPCs
inimigos (a estrutura de `NpcKind` já está pronta), conectar os itens a
efeitos reais em batalha (a poção de vida não cura nada ainda), e
interiores com planta própria em vez dos 3 modelos atuais.
pra isso (Iara e Iracema já insinuam coisas escondidas).
