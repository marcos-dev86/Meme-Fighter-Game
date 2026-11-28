# Meme Fighter RPG

RPG de ação 2D em visão de cima com lutas de arena estilo "Mortal Kombat": explore o mapa, cumpra missões, derrote chefes,
desbloqueie lutadores e jogue Versus (contra a CPU ou em 2 jogadores). Feito com Expo (SDK 57), React Native 0.86, React 19,
expo-router e TypeScript. Roda no celular (Android/iOS via Expo Go ou APK) e no navegador.

## Rodando

```bash
npm install               # obrigatório depois de clonar (node_modules não vai para o GitHub)
npx expo start            # QR code para o Expo Go; pressione "w" para abrir no navegador
npx expo start --web
npx tsc --noEmit          # checagem de tipos (deve terminar sem erros)
node tools/check-i18n.mjs # textos de interface nos 5 idiomas (deve terminar com 0 problemas)
npm test                  # testes de lógica (Node, sem Expo)
```

Se o navegador mostrar `entry.bundle 404` e os botões não responderem, falta `node_modules` (rode `npm install`) ou há um Metro
antigo na porta 8081; use `npx expo start --web --clear`.

Orientação: sempre paisagem. Idiomas: português (BR), inglês, espanhol, francês e japonês (Opções).

## O que o jogo tem hoje

- **Modo história por personagem.** O Dogge tem a campanha completa (missões principais, de caminho e secretas, 10 escolhas e 3 finais). Os outros 15 lutadores
  jogáveis têm a lore e a história escritas, mas a campanha deles AINDA NÃO está no jogo (plano e modelo em `docs/CAMPANHAS.md`).
- **Habilidade exclusiva por personagem** (16), valendo em todos os modos: luta, mundo, loja, baús, cura e cassino
  (`docs/HABILIDADES.md`).
- **Cutscenes 100% por código** (sem vídeo): cenário, personagens animados com trajetos suaves, câmera, efeitos, sons e fala,
  nos 5 idiomas, com o apelido do jogador e a skin, o chapéu e a capa vestidos (`docs/CUTSCENES.md`).
- **13 cenários de fundo** com partículas procedurais nas telas de menu (`docs/FUNDOS_E_TELAS.md`).
- **Mundo com colisão completa:** uma direção por vez, NPCs/inimigos/chefes sólidos, pulo que atravessa pedras e troncos finos e
  passa por cima de inimigos e NPCs, todas as estruturas grandes com porta (`docs/MUNDO_E_MOVIMENTO.md`).
- Versus (CPU ou 2 jogadores), Torre dos Desafios, cassino, mergulho e mundo submerso, platina, conquistas, cosméticos.

## Testes

Os testes ficam em `tests/`, separados por categoria (detalhes em `docs/TESTES.md`). Os de lógica rodam no Node, sem Expo
(`tests/_support/ts-register.cjs` transpila o TypeScript na hora):

```bash
npm test                                  # todos os testes de lógica (tests/unit), com resumo por categoria
node tests/rodar-todos.mjs mar cassino    # só algumas categorias
python3 tests/assets/sprites-legados.test.py
```

| Pasta (tests/unit) | O que cobre |
| --- | --- |
| `combate` | dano e crítico, game feel e raridade, revanche, rival e elites, chefe Sea Beast |
| `habilidades` | as 16 habilidades exclusivas dos personagens (lutador, loja, baús, cura, cassino) |
| `historia` | interface e movimento, acampamento e ilhas, Sahur e vulcão, vida persistente e armaduras, cutscenes por código |
| `mundo` | uma direção por vez, corpos sólidos, pulo sobre obstáculos finos, casas com porta |
| `cassino` | Troll Face e Cara Tranquilo, cassino gigante |
| `mar` | missões, eventos e chefes, mundo submerso, mergulho, travessia, efeitos de água |
| `versus` | seleção e tela VS, elenco e compra de lutadores |
| `conta` | conta, perfil e conquistas, saves antigos, platina |
| `itens` | raridade Secret e avisos de morte |
| `sistema` | idiomas, pausa e timers, sons ambiente |

Os de navegador ficam em `tests/e2e` (mesmas categorias): precisam de `npx expo export --platform web --output-dir dist` e do
Playwright; o cabeçalho de cada arquivo diz como rodar.

Falhas que já existiam antes da última revisão (não são regressão): `combate/revanche` (2), `conta/conta-perfil-e-conquistas` (1),
`historia/sahur-vulcao-e-sprites-novos` (1), `historia/vida-persistente-armaduras-e-npcs` (1) e o teste Python de sprites legados.

## Estrutura

```
src/app/            rotas (expo-router): mapa, luta, versus, cutscene, opções ... (arquivos finos que reexportam as telas)
src/screens/        telas (WorldScreen, BattleScreen, VersusScreen, EndingScreen, OptionsScreen ...)
src/game/battle/    motor de luta (Fighter.ts), sprites, IA, efeitos (AuraEffect, ShieldGif, SpriteEffect)
src/game/collision/ colisão do mundo (collision.ts): tiles sólidos, caixas, corpos sólidos, pulo, uma direção por vez
src/game/world/     mapa (worldGen.ts), NPCs, prédios e interiores, baús, cassino, escalada, eventos
src/game/state/     estado persistente (saves em 3 slots, missões por personagem, chefes, elenco, progresso/platina)
src/game/story/     personagens, missões, escolhas, finais, habilidades (abilities.ts), cutscenes por código (codeCutscenes.ts,
                    CodeCutscenePlayer.tsx, cutsceneText.ts, levelUpScene.ts) e campaigns/ (dados das cutscenes e das campanhas)
src/game/menu/      ArtBackdrop (fundo das telas), sceneArt.ts (13 cenários), SceneParticles, MenuButton
src/game/versus/    Versus estilo Mortal Kombat: registro de lutadores, seleção, tela VS, versusLogic
src/game/audio/     audioManager (música, sfx, ambientes com cross-fade), ambientMix (qual ambiente toca onde)
src/game/enemies/   inimigos do mundo e elites
src/game/cosmetics/ skins, chapéus e capas (CosmeticLayers, âncoras)
src/game/i18n/      textos nos 5 idiomas (translations.ts + stringsXxx.ts mesclados por extraStrings.ts)
assets/             sprites-v2 (lutadores), skins-v2, npc-walk, npcs, avatars, legacy-art, scenes (13 fundos + 7 mares),
                    audio (música, sfx, ambiente), icons, furniture ... (46 MB no total, sem vídeos)
tests/              unit, e2e, assets, _support e rodar-todos.mjs
tools/              geradores de assets (Python), check-i18n, simulador do cassino (casino-sim.mjs), ts-register para os scripts Node
docs/               documentação (índice abaixo)
```

## Documentação (docs/)

| Arquivo | Assunto |
| --- | --- |
| `HISTORIA.md` | narrativa do Dogge: premissa, chefes, 10 escolhas, 3 finais, missões; e o modo história dos outros personagens |
| `CAMPANHAS.md` | como transformar uma história de personagem em campanha jogável; plano, decisões e estado |
| `HABILIDADES.md` | as 16 habilidades: números, onde cada uma age, como foi calibrado o cassino |
| `CUTSCENES.md` | o sistema de cutscenes por código: tipos, player, tradução, apelido, skin, nível |
| `FUNDOS_E_TELAS.md` | os 13 cenários, partículas, estilos rail e dim, qual cenário fica em qual tela |
| `MUNDO_E_MOVIMENTO.md` | ilhas, colisão, corpos sólidos, pulo, estruturas e interiores |
| `TESTES.md` | organização dos testes e como escrever novos |
| `APK_CHECKLIST.md` | checklist de build e lançamento |
| `AUDIT.md` | diário técnico, parte por parte (a última seção resume a revisão de novembro de 2026) |
| `MEMES.md`, `SPRITES_V2.md` | referência dos memes e do formato dos sprites |

## Sistemas principais

- **Estado e saves**: cada sistema guarda seu pedaço em `registerSaveExt` (`src/game/state/saveExt.ts`); `saveState.ts` grava 3 slots (v2) e migra saves antigos. O progresso de missões é por mundo E por personagem (`questState.ts`, `characterId` no save). Opções (volumes, gráficos) ficam à parte em `settingsState.ts`; a conta (perfil, apelido, conquistas, cosméticos) é global em `src/game/account/`.
- **Progresso e platina**: `progressState.ts` calcula 18 categorias (soma 100); a platina libera com todas completas (pesos e justificativa em `docs/AUDIT.md`).
- **Rival e elites**: `rivalState.ts` + `battle/battleModes.ts` (5 aparições) e `enemies/eliteDefs.ts` (6 elites sobre spawns existentes).
- **Áudio**: `audioManager.ts` (pausa global em `state/pauseState.ts`), ambientes em `assets/audio/ambient` (os novos saem de `python3 tools/make_ambient.py`).
- **Opções gráficas** (Opções > Jogo): MODO LEVE, partículas do clima, ondas animadas e escurecer à noite.
- **Habilidades**: `story/abilities.ts` é uma folha sem estado do jogo; `questState` avisa qual personagem é o do mundo.
- **Colisão**: só `collision/collision.ts` decide o que bloqueia (a tela do mundo apenas monta a lista de corpos).

## Regenerando assets (opcional; o repositório já traz os arquivos prontos)

Os scripts em `tools/` precisam de Python 3 com Pillow e numpy.

- Sons ambiente por região: `python3 tools/make_ambient.py` (síntese determinística; precisa de numpy e ffmpeg).
- Lutadores: `python3 tools/import_sheets.py` recorta as folhas de `tools/art_src/sheets/` para `assets/sprites-v2` e gera `spritesV2.ts`.
- Avatares: `python3 tools/make_avatars.py` (ícones feitos à mão em `tools/art_src/avatars_fixed/` têm prioridade).
- Cosméticos/armaduras sobre os sprites: `python3 tools/make_wear_v2.py`.
- Cutscenes: não há mais o que gerar; edite os roteiros em `src/game/story/campaigns/*.ts` (as cutscenes antigas em vídeo e os
  scripts que as renderizavam foram removidos).

## Regras do projeto

- Nada de sprites, animações, áudios ou dados inventados: o jogo só usa arte e som que existem em `assets/`.
- Nenhum travessão ("-" como pausa, "—" ou "–") em textos do jogo; hífen só dentro de palavras. Os testes conferem nas cutscenes
  e nas habilidades.
- Narrativa de missões e diálogos de NPC em português; interface e cutscenes nos 5 idiomas.
- Saves ficam só no aparelho (AsyncStorage). Formato e migrações: `src/game/state/saveState.ts`.
- Limpezas e decisões antigas: `docs/AUDIT.md`.

## Gerar o APK

Veja `docs/APK_CHECKLIST.md`.

## Expansão marítima (mergulho)

- `src/game/dive/`: fôlego (`breath.ts`), MUNDO SUBMERSO (`seaWorld.ts`: espelha o mar da superfície, mergulha-se de qualquer costa), locais com entrada no mar (`diveSites.ts`), criaturas (`diveCreatures.ts`, `diveSim.ts`), eventos (`diveEvents.ts`), estado salvo (`diveState.ts`), NPCs, cena (`DiveOverlay.tsx`).
- `src/game/battle/seaBeastBrain.ts` + `combatMemory.ts`: o Sea Beast, rodando por cima do motor de luta existente.
- Mapas de mergulho: `node tools/dump-dive-grids.mjs > /tmp/g.json && python3 tools/render_dive_maps.py /tmp/g.json`.
- Sprites do chefe: `python3 tools/import_sea_beast.py <pasta com as folhas>`.
- Créditos e licenças: `assets/sea/CREDITS.md`.
