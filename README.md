# Meme Fighter RPG

RPG de ação 2D em visão de cima com lutas de arena estilo "Mortal Kombat": explore o mapa, cumpra missões, derrote chefes,
desbloqueie lutadores e jogue Versus (contra a CPU ou em 2 jogadores). Feito com Expo (SDK 57), React Native 0.86, React 19,
expo-router e TypeScript. Roda no celular (Android/iOS via Expo Go ou APK) e no navegador.

## Rodando

```bash
npm install
npx expo start            # QR code para o Expo Go; pressione "w" para abrir no navegador
npx expo start --web
npx tsc --noEmit          # checagem de tipos (deve terminar sem erros)
```

Orientação: sempre paisagem. Idiomas: português (BR), inglês, espanhol, francês e japonês (Opções).

## Testes

Os testes ficam em `tests/`, separados por categoria. Os de lógica rodam no Node, sem Expo (`tests/_support/ts-register.cjs`
transpila o TypeScript na hora):

```bash
npm test                                  # todos os testes de lógica (tests/unit), com resumo por categoria
node tests/rodar-todos.mjs mar cassino    # só algumas categorias
python3 tests/assets/sprites-legados.test.py
```

| Pasta (tests/unit) | O que cobre |
| --- | --- |
| `combate` | dano e crítico, game feel e raridade, revanche, rival e elites, chefe Sea Beast |
| `habilidades` | as 16 habilidades exclusivas dos personagens (lutador, loja, baús, cura, cassino) |
| `historia` | interface e movimento, acampamento, Sahur e vulcão, vida persistente e armaduras, cutscenes por código |
| `cassino` | Troll Face e Cara Tranquilo, cassino gigante |
| `mar` | missões, eventos e chefes, mundo submerso, mergulho, travessia, efeitos de água |
| `versus` | seleção e tela VS, elenco e compra de lutadores |
| `conta` | conta, perfil e conquistas, saves antigos, platina |
| `itens` | raridade Secret e avisos de morte |
| `sistema` | idiomas, pausa e timers, sons ambiente |

Os de navegador ficam em `tests/e2e` (mesmas categorias): precisam de `npx expo export --platform web --output-dir dist` e do
Playwright; o cabeçalho de cada arquivo diz como rodar.

## Estrutura

```
src/app/            rotas (expo-router): mapa, luta, versus, cutscene, opções ...
src/screens/        telas (WorldScreen, BattleScreen, VersusScreen, EndingScreen ...)
src/game/battle/    motor de luta, sprites (sprites.ts, spritesV2.ts gerado), IA, âncoras de mão
src/game/world/     mapa, NPCs, baús, cassino, escalada, eventos
src/game/state/     estado persistente (saves em 3 slots, missões, chefes, elenco, progresso/platina)
src/game/story/     personagens, missões, cutscenes em vídeo (cutscenes.ts, CutscenePlayer, ShortCutsceneHost)
src/game/versus/    Versus estilo Mortal Kombat: registro de lutadores, FighterSelect (dois toques), VersusSplash, versusLogic
src/game/audio/     audioManager (música, sfx, ambientes com cross-fade), ambientMix (qual ambiente toca onde)
src/game/enemies/   inimigos do mundo e elites (eliteDefs)
src/game/i18n/      textos nos 5 idiomas (translations.ts + stringsXxx.ts mesclados por extraStrings.ts)
assets/             sprites-v2 (lutadores), npc-walk, npc-portraits, avatars, legacy-art (cenários/menus),
                    audio (música, sfx, ambiente), cutscenes (MP4), icons, furniture ...
tools/              geradores de assets (Python), testes (Node) e e2e (Playwright), tools/cutscenes (renderizador dos vídeos)
docs/               AUDIT.md (diário técnico), CUTSCENES.md, HISTORIA.md, SPRITES_V2.md, MEMES.md, PODE_APAGAR.md, APK_CHECKLIST.md
```

## Sistemas principais

- **Estado e saves**: cada sistema guarda seu pedaço em `registerSaveExt` (`src/game/state/saveExt.ts`); `saveState.ts` grava 3 slots (v2) e migra saves antigos. Opções (volumes, gráficos) ficam à parte em `settingsState.ts`; a conta (perfil, conquistas, cosméticos) é global em `src/game/account/`.
- **Progresso e platina**: `progressState.ts` calcula 18 categorias (soma 100); a platina libera com todas completas (pesos e justificativa em `docs/AUDIT.md`).
- **Rival e elites**: `rivalState.ts` + `battle/battleModes.ts` (5 aparições) e `enemies/eliteDefs.ts` (6 elites sobre spawns existentes).
- **Áudio**: `audioManager.ts` (pausa global em `state/pauseState.ts`), ambientes em `assets/audio/ambient` (os novos saem de `python3 tools/make_ambient.py`).
- **Opções gráficas** (Opções > Geral): MODO LEVE, partículas do clima, ondas animadas e escurecer à noite.

## Regenerando assets (opcional; o repositório já traz os arquivos prontos)

Os scripts em `tools/` precisam de Python 3 com Pillow e numpy (e `ffmpeg` para as cutscenes).

- Sons ambiente por região: `python3 tools/make_ambient.py` (síntese determinística; precisa de numpy e ffmpeg).
- Lutadores: `python3 tools/import_sheets.py` recorta as folhas de `tools/art_src/sheets/` para `assets/sprites-v2` e gera `spritesV2.ts`.
- Avatares: `python3 tools/make_avatars.py` (ícones feitos à mão em `tools/art_src/avatars_fixed/` têm prioridade).
- Cosméticos/armaduras sobre os sprites: `python3 tools/make_wear_v2.py`.
- Cutscenes: `python3 tools/cutscenes/run.py <ids>` (usa só imagens e áudios que já existem no jogo).

## Regras do projeto

- Nada de sprites, animações, áudios ou dados inventados: o jogo só usa arte e som que existem em `assets/`.
- Saves ficam só no aparelho (AsyncStorage). Formato e migrações: `src/game/state/saveState.ts`.
- Limpezas e decisões antigas: `docs/AUDIT.md` e `docs/PODE_APAGAR.md`.

## Gerar o APK

Veja `docs/APK_CHECKLIST.md`.


## Expansão marítima (mergulho)

- `src/game/dive/`: fôlego (`breath.ts`), MUNDO SUBMERSO (`seaWorld.ts`: espelha o mar da superfície, mergulha-se de qualquer costa), locais com entrada no mar (`diveSites.ts`), criaturas (`diveCreatures.ts`, `diveSim.ts`), eventos (`diveEvents.ts`), estado salvo (`diveState.ts`), NPCs, cena (`DiveOverlay.tsx`).
- `src/game/battle/seaBeastBrain.ts` + `combatMemory.ts`: o Sea Beast, rodando por cima do motor de luta existente.
- Mapas de mergulho: `node tools/dump-dive-grids.mjs > /tmp/g.json && python3 tools/render_dive_maps.py /tmp/g.json`.
- Sprites do chefe: `python3 tools/import_sea_beast.py <pasta com as folhas>`.
- Créditos e licenças: `assets/sea/CREDITS.md`.
